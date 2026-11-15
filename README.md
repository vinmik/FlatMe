# FlatMe

Verified flat sharing for working professionals in Hyderabad. Sign in with your work email, browse flats from colleagues at companies you trust, and post a room in under a minute.

| | |
| --- | --- |
| **Mobile app** | Expo / React Native (`apps/mobile`) |
| **API** | Azure Functions, Node 22 (`apps/api`) → https://func-flatme-prod-5izkj3qnoyskq.azurewebsites.net/api |
| **Admin portal** | React + Vite on Static Web Apps (`apps/admin`) → https://orange-forest-097ef9700.6.azurestaticapps.net |
| **Web app** | Next.js: public pages for search engines plus the full signed-in product (`apps/webapp`). Trial hosting via the "Deploy web app (trial)" workflow |
| **Landing page** | Placeholder landing page on Static Web Apps (`apps/web`) → https://salmon-island-0083ad500.3.azurestaticapps.net |
| **Contracts** | Zod schemas shared by every app (`packages/shared`) |
| **Infra** | Bicep: Cosmos DB, Blob Storage, Communication Services email, Key Vault, App Insights (`infra/`) |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and [infra/README.md](infra/README.md) for deployment.

## Quick start

Requires Node 22+.

```powershell
npm install

# Mobile app — runs on the built-in mock API unless apps/mobile/.env sets EXPO_PUBLIC_API_URL
npm run mobile:start          # then press a (Android), i (iOS) or w (web)

# Admin portal — mock backend by default (see apps/admin/.env.example)
npm run dev -w apps/admin

# API locally (in-memory data, no Azure needed)
Copy-Item apps/api/local.settings.example.json apps/api/local.settings.json
npm run api:start

# Web app — needs the local API above; opens on http://localhost:5173
npm run storage -w apps/api   # local photo storage, so uploads work without Azure
npm run dev -w apps/webapp
```

In mock mode any corporate email works and the OTP is `123456`.

## Checks

```powershell
npm run typecheck             # all workspaces
npm test                      # shared, api, admin, webapp
npm run lint -w apps/mobile
```

CI (`.github/workflows/ci.yml`) runs the backend, mobile, admin, web (landing page) and webapp jobs on every push and PR.

## Deploying

Production deploys are manual: **Actions → Deploy → Run workflow** on `main` (`.github/workflows/deploy.yml`). Tick which of API, admin portal and web (the placeholder landing page) to ship; the workflow typechecks and tests first, then deploys.

- Azure login uses GitHub OIDC with the Entra app `gh-flatme-deploy` (Contributor on `rg-flatme-prod`), so no Azure keys are stored in GitHub.
- Secrets and variables live in the `production` environment, which only `main` may deploy from. Secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `SWA_ADMIN_TOKEN`, `SWA_WEB_TOKEN`. Variables: `RESOURCE_GROUP`, `FUNCTION_APP_NAME`, `API_BASE_URL`, `ADMIN_AUTH_DISABLED`.
- Infrastructure (Bicep) is still deployed by hand; see [infra/README.md](infra/README.md).

```powershell
gh workflow run deploy.yml --ref main -f api=true -f admin=true -f web=true
```

## Mobile builds

`apps/mobile/eas.json` defines `development` (mock API), `preview` (internal APK, production API) and `production` profiles:

```powershell
cd apps/mobile; npx eas-cli build --profile preview --platform android
```

## ⚠️ Admin portal has no sign-in (temporary)

For the MVP the admin portal and admin API run with authentication **disabled** (`ADMIN_AUTH_DISABLED=true` on the Function App, `VITE_ADMIN_AUTH_DISABLED=true` in the portal build). Anyone with the URL can moderate users and listings. Before real users sign up, set both to `false` and redeploy. OTP sign-in for `ADMIN_EMAILS` is already implemented.
