# FlatMe

Verified flat sharing for working professionals in Hyderabad. Sign in with your work email, browse flats from colleagues at companies you trust, and post a room in under a minute.

| | |
| --- | --- |
| **Mobile app** | Expo / React Native (`apps/mobile`) |
| **API** | Azure Functions, Node 22 (`apps/api`) → https://func-flatme-prod-5izkj3qnoyskq.azurewebsites.net/api |
| **Admin portal** | React + Vite on Static Web Apps (`apps/admin`) → https://orange-forest-097ef9700.6.azurestaticapps.net |
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
```

In mock mode any corporate email works and the OTP is `123456`.

## Checks

```powershell
npm run typecheck             # all workspaces
npm test                      # shared, api, admin
npm run lint -w apps/mobile
```

CI (`.github/workflows/ci.yml`) runs the backend, mobile and admin jobs on every push and PR.

## Mobile builds

`apps/mobile/eas.json` defines `development` (mock API), `preview` (internal APK, production API) and `production` profiles:

```powershell
cd apps/mobile; npx eas-cli build --profile preview --platform android
```

## ⚠️ Admin portal has no sign-in (temporary)

For the MVP the admin portal and admin API run with authentication **disabled** (`ADMIN_AUTH_DISABLED=true` on the Function App, `VITE_ADMIN_AUTH_DISABLED=true` in the portal build). Anyone with the URL can moderate users and listings. Before real users sign up, set both to `false` and redeploy. OTP sign-in for `ADMIN_EMAILS` is already implemented.
