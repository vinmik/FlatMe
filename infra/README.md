# FlatMe infrastructure (Bicep)

`main.bicep` (resource-group scope) provisions the entire backend in **one resource group**:

| Module | Resources | Notes |
| --- | --- | --- |
| `monitoring` | Log Analytics workspace + workspace-based Application Insights | 30-day retention |
| `storage` | StorageV2 / Standard_LRS, containers `listing-photos` (public **Blob** read) and `deployments` (private) | TLS 1.2, shared-key auth **disabled**, blob CORS `*` for GET/PUT/HEAD/OPTIONS |
| `cosmos` | Cosmos DB for NoSQL, **serverless**, Session consistency, `disableLocalAuth: true` | DB `flatme`; containers `users` (/id), `listings` (/id, spatial index `/geo/?` + rent composite indexes), `otps` (/email, TTL on), `inquiries` (/listingId), `reports` (/listingId), `audit` (/id, default TTL 365 d) |
| `keyvault` | Key Vault (RBAC) with secrets `JWT-SECRET`, `OTP-PEPPER` | Function reads them via Key Vault references |
| `communication` | ACS Email service (dataLocation India) + Azure-managed domain + Communication Service | Sender `DoNotReply@<guid>.azurecomm.net` |
| `staticwebapp` | Static Web App (Free) for the admin portal | `eastasia` by default (SWA isn't offered in centralindia) |
| `functionapp` | Flex Consumption plan (FC1, Linux) + Function App (Node 22, 2048 MB, max 40 instances) | System-assigned identity, HTTPS only, TLS 1.2, CORS = admin SWA origin + `http://localhost:5173` + `http://localhost:8081` |
| `roles` | RBAC for the Function identity (+ optional deployer) | see below |

### Identity & RBAC

The Function App uses its **system-assigned managed identity** for every dependency. No keys or connection strings are stored anywhere.

| Scope | Role | Why |
| --- | --- | --- |
| Storage account | Storage Blob Data Owner | `AzureWebJobsStorage__accountName`, the Flex deployment container, and `getUserDelegationKey` for upload SAS |
| Storage account | Storage Queue Data Contributor, Storage Table Data Contributor | Functions host internals |
| Cosmos account | Cosmos DB Built-in Data Contributor (`…0002`, SQL RBAC) | App data |
| Key Vault | Key Vault Secrets User | Key Vault references |
| Communication Service | Contributor | Entra ID auth for ACS Email (`ACS_ENDPOINT` + `DefaultAzureCredential`) |
| *(optional)* `deployerPrincipalId` | Cosmos Built-in Data Contributor + Storage Blob Data Contributor | Run `npm run seed` from your machine with `az login` |

**Decision: ACS Email uses managed identity rather than a connection string.** The `@azure/communication-email` SDK supports `TokenCredential`, which keeps every secret out of config. The API still honours `ACS_CONNECTION_STRING` if it is set; it takes precedence over `ACS_ENDPOINT`. If Entra auth ever misbehaves, put `listKeys()` output into Key Vault and reference it as `ACS_CONNECTION_STRING`. No code change is needed.

### Trade-offs

- **SECURITY RISK: admin auth is currently OFF.** `main.parameters.json` sets `adminAuthDisabled: true` (app setting `ADMIN_AUTH_DISABLED=true`), as the project owner requested. Every `/api/admin/*` route then skips JWT and role checks and runs as the synthetic actor `system-admin` / `admin@flatme.local`. Anyone who knows the URL can list users (including emails and phones), suspend or delete accounts, change roles and moderate listings. **Set it to `false` and redeploy before real users sign up.** Quick toggle: `az functionapp config appsettings set -g $rg -n <app> --settings ADMIN_AUTH_DISABLED=false`.
- **Admin personal mailboxes.** Emails in `adminEmails` may sign in with a personal mailbox (e.g. gmail). Everyone else stays corporate-only.

- **Public photo container.** `listing-photos` allows anonymous *read of individual blobs only*: no listing, and names are random GUIDs. Listing photos are shown to every signed-in user anyway, and public URLs keep the mobile image cache/CDN simple. Uploads still require a 10-minute, create+write-only user-delegation SAS. If photos ever become sensitive, flip the container to private and issue read SAS in the mappers.
- **Shared-key access disabled.** This means no account-key SAS and no Storage Explorer "key" mode. Use Entra ID (`--auth-mode login`).
- **Key Vault references + system-assigned identity.** The role assignment is created right after the site. On the very first deployment the app may briefly show `JWT_SECRET` as an unresolved reference. Restart once (`az functionapp restart`) if the first request fails.
- **Cosmos serverless, single region, continuous 7-day backup.** This is the cheapest option at MVP scale. Move to provisioned/autoscale throughput when sustained RU/s justifies it.

## Prerequisites

- Azure CLI ≥ 2.60 with Bicep (`az bicep upgrade`), logged in with `az login`. You need Owner or User Access Administrator on the resource group, because the template creates role assignments.
- Flex Consumption must be available in your region. Check with `az functionapp list-flexconsumption-locations -o table` (centralindia is supported).
- Node 22 locally for packaging the API.

## 1. Deploy infrastructure

PowerShell:

```powershell
$rg = "rg-flatme-prod"
az group create -n $rg -l centralindia

# Strong random secrets (64 hex chars each). Keep them out of source control.
function New-Secret { -join ((1..32) | ForEach-Object { '{0:x2}' -f [System.Security.Cryptography.RandomNumberGenerator]::GetInt32(256) }) }
$jwt = New-Secret; $pepper = New-Secret

# Optional: let your own account seed Cosmos / upload blobs.
$me = az ad signed-in-user show --query id -o tsv

az deployment group create -g $rg -n flatme-infra `
  -f infra/main.bicep -p infra/main.parameters.json `
  -p jwtSecret=$jwt otpPepper=$pepper `
     adminEmails="you@yourcompany.com" `
     deployerPrincipalId=$me `
     demoEmail="review@yourcompany.com" demoOtp="246810"

# Outputs
az deployment group show -g $rg -n flatme-infra --query properties.outputs -o json
```

bash:

```bash
rg=rg-flatme-prod
az group create -n $rg -l centralindia
jwt=$(openssl rand -hex 32); pepper=$(openssl rand -hex 32)
me=$(az ad signed-in-user show --query id -o tsv)
az deployment group create -g $rg -n flatme-infra -f infra/main.bicep -p infra/main.parameters.json \
  -p jwtSecret=$jwt otpPepper=$pepper adminEmails="you@yourcompany.com" deployerPrincipalId=$me
```

Re-running the deployment is idempotent. **Re-use the same `jwtSecret`** on later runs, or every session is invalidated. To rotate a secret without redeploying, use `az keyvault secret set --vault-name <kv> -n JWT-SECRET --value ...`.

### Outputs

| Output | Example |
| --- | --- |
| `functionAppName` | `func-flatme-prod-abc123…` |
| `functionAppHostname` / `apiBaseUrl` | `https://func-….azurewebsites.net/api` |
| `cosmosEndpoint`, `cosmosAccountName` | `https://cosmos-flatme-prod-….documents.azure.com:443/` |
| `storageAccountName`, `storageBlobEndpoint`, `photosContainerUrl` | `https://stflatmeprod….blob.core.windows.net/` |
| `emailSender` | `DoNotReply@<guid>.azurecomm.net` |
| `keyVaultName` | `kv-flatmeprod-…` |
| `adminPortalName`, `adminPortalHostname`, `adminPortalUrl` | `https://<name>.azurestaticapps.net` |
| `resourceGroup` | `rg-flatme-prod` |

## 2. Publish the API (Flex Consumption)

```powershell
$app = az deployment group show -g $rg -n flatme-infra --query properties.outputs.functionAppName.value -o tsv

npm ci
npm run package -w apps/api          # → apps/api/.deploy (host.json, package.json, dist/, node_modules/@azure/functions)

# Option A — zip deploy (recommended). Use tar: Windows PowerShell 5's Compress-Archive writes
# backslash paths, which the Linux host can't resolve.
Push-Location apps/api/.deploy; tar -a -cf ../api.zip *; Pop-Location
az functionapp deployment source config-zip -g $rg -n $app --src apps/api/api.zip

# Option B — Core Tools (installed at the repo root as a devDependency of apps/api)
Push-Location apps/api/.deploy; ../../../node_modules/.bin/func azure functionapp publish $app --javascript; Pop-Location

# Smoke test (uses the demo account because OTP_DEV_MODE is false in Azure)
$env:API_BASE_URL = "https://$(az functionapp show -g $rg -n $app --query defaultHostName -o tsv)/api"
$env:SMOKE_EMAIL = "review@yourcompany.com"; $env:SMOKE_OTP = "246810"
npm run smoke -w apps/api
```

## 3. Seed demo data into Cosmos

This requires `deployerPrincipalId` to have been set to your object ID during the infra deployment.

```powershell
$env:COSMOS_ENDPOINT = az deployment group show -g $rg -n flatme-infra --query properties.outputs.cosmosEndpoint.value -o tsv
npm run seed -w apps/api                 # idempotent upsert: 8 users, 20 listings, 2 reports (all seed: true)
npm run seed -w apps/api -- --purge      # remove the seed documents again
```

## 4. Admin portal (Static Web App)

```powershell
$swa = az deployment group show -g $rg -n flatme-infra --query properties.outputs.adminPortalName.value -o tsv
$token = az staticwebapp secrets list -n $swa --query properties.apiKey -o tsv
$env:VITE_API_BASE_URL = az deployment group show -g $rg -n flatme-infra --query properties.outputs.apiBaseUrl.value -o tsv
$env:VITE_USE_MOCKS = "false"; $env:VITE_ADMIN_AUTH_DISABLED = "true"
npm run build -w apps/admin
npx @azure/static-web-apps-cli@2 deploy apps/admin/dist --deployment-token $token --env production
```

The portal's origin is already in the Function App CORS list. If you add a custom domain, append it via the `extraCorsOrigins` parameter.

## Validate locally

```powershell
az bicep build --file infra/main.bicep --stdout > $null   # no deployment, compile + lint only
```
