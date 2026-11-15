# FlatMe Architecture

FlatMe is an npm-workspaces monorepo:

| Path | Package | What |
| --- | --- | --- |
| `packages/shared` | `@flatme/shared` | Contracts. These are the Zod schemas, route tables, domain helpers and limits shared by every client and the API. |
| `apps/api` | `@flatme/api` | HTTP API on Azure Functions (v4 Node programming model, Node 22, Flex Consumption). |
| `apps/mobile` | `@flatme/mobile` | Expo mobile app. |
| `apps/admin` | — | Admin portal (Static Web App). |
| `infra/` | — | Bicep for all Azure resources. |

## Backend

### Layering

```
functions/   thin HTTP handlers: validate (Zod) → call service → map result     (registerHttp → app.http)
http/        pipeline: withHandler (correlation id, timing log, error → ApiError JSON),
             withAuth (Bearer JWT → load user doc; 401 / 403 suspended), withAdmin (DB role re-check),
             JSON body guard (64 KB, 413), query/param parsing, security headers
services/    business rules — Auth, User, Listing, Favorite, Inquiry, Report, Media, Public, Admin, Audit
ports/       interfaces — User/Listing/Otp/Inquiry/Report/Audit repositories, EmailSender,
             BlobUploadUrlSigner, Clock, TokenService, Logger
adapters/    cosmos/ (prod) · memory/ (tests + local dev) · email/ (ACS + console) ·
             blob/ (user-delegation SAS + local fake) · system/ (clock, jose JWT)
domain/      errors (DomainError → status/code), persisted entities, entity → DTO mappers
config.ts    zod-validated environment → typed AppConfig
composition.ts  composition root: picks adapters from config, lazily builds a per-process singleton
```

Dependencies point inward. Services depend only on `ports` and `domain`. `composition.ts` is the only module that knows about concrete adapters. Tests call `buildServices()` with in-memory repositories, a `FixedClock` and a recording email sender.

### Request flow

1. `withHandler` takes the correlation id from `x-correlation-id` (if it is safe) or uses the invocation id.
2. The handler validates the body or query with the shared schema. A `ZodError` becomes `400 validation_failed` with a `fields` map.
3. `withAuth` verifies the HS256 JWT (`jose`, issuer `flatme-api`, audience `flatme-app`) and **reloads the user document**. A deleted account gets `401 unauthorized`. A suspended account gets `403 forbidden`.
4. The service runs and its result is serialized as JSON with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and `x-correlation-id`.
5. A `DomainError` is mapped to its status and code: 400/401/403/404/409, or 429 with `Retry-After`. Anything else becomes `500 internal` with a generic message; details are logged only.

OTP codes are never logged (except in `OTP_DEV_MODE`), and neither are tokens.

### Routing note

The Functions host reserves the `admin` route segment. `host.json` therefore sets `routePrefix: ""`, and `registerHttp` registers every route as `api/<route>`. Public URLs are unchanged (`/api/...`), and the shared `ROUTES` / `ADMIN_ROUTES` tables are used verbatim.

### Endpoints (all under `/api`)

| Method | Route | Auth | Response |
| --- | --- | --- | --- |
| GET | `health` | – | `{status:"ok",version}` |
| GET | `public/highlights` | – | `PublicHighlights` (cached 60 s, no contact info) |
| POST | `auth/otp/request` | – | `OtpRequestResponse` (`devCode` only in dev mode) |
| POST | `auth/otp/verify` | – | `OtpVerifyResponse` |
| GET / PATCH (PUT alias) / DELETE | `me` | ✔ | `User` / `User` / 204 |
| PATCH | `me/preferences` | ✔ | `User` |
| GET | `me/listings` | ✔ | `{items: ListingDetail[]}` (incl. paused/removed + `moderationReason`) |
| GET | `me/favorites` | ✔ | `{items: ListingSummary[]}` |
| PUT / DELETE | `me/favorites/{id}` | ✔ | 204 (idempotent) |
| GET | `feed?lat&lng&<filters>` | ✔ | `Feed` |
| GET | `listings?<SearchQuery>` | ✔ | `ListingPage` |
| POST | `listings` | ✔ | 201 `ListingDetail` |
| GET / PUT / DELETE | `listings/{id}` | ✔ | `ListingDetail` / `ListingDetail` / 204 |
| PATCH | `listings/{id}/status` | ✔ owner | `ListingDetail` |
| POST | `listings/{id}/inquiries` | ✔ | 201 `Inquiry` |
| POST | `listings/{id}/reports` | ✔ | 201 `Report` |
| POST | `media/upload-url` | ✔ | `UploadUrlResponse` |
| * | `admin/*` | admin | see [Admin](#admin) |

### Behaviour highlights

**OTP**
- Codes are 6 digits from `crypto.randomInt`. Only `HMAC-SHA256(pepper, email:code)` is stored, and it is compared with `timingSafeEqual`.
- Limits:
  - Max `LIMITS.otpMaxAttempts` attempts, after which the code is burned.
  - A resend cooldown, returning 429 with `retryAfterSec`.
  - `LIMITS.otpMaxRequestsPerHour` requests per hour per email.
- Personal mailboxes are rejected with `400 personal_email`.
- The OTP document TTL is `max(otpTtlSeconds, 3600)` so the hourly cap survives. Code expiry is enforced separately via `expiresAt`.
- A fixed review account is available via `DEMO_EMAIL` + `DEMO_OTP`; no email is sent for it.

**Users**
- On verify, the user is upserted (looked up by email) and `lastLoginAt` is stamped.
- Emails in `ADMIN_EMAILS` are promoted to `role: "admin"`.

**Listings**
- Creating a listing requires a complete profile (403) and at most `LIMITS.listingsPerUser` active + paused listings (409).
- Each listing stores an owner snapshot and owner contact, refreshed best-effort when the profile changes.
- Location is stored as `{lat,lng}` plus GeoJSON `geo` for `ST_DISTANCE`.
- Photos must live under `<STORAGE_ACCOUNT_URL>/<PHOTOS_CONTAINER>/`. Seed photos are exempt.
- The phone number is exposed only if the owner's `privacy.showPhone` is set.

**Search**
- Only `status = active` listings are returned. Filters are parameterized Cosmos SQL with the same semantics as the shared `matchesFilters`; the memory adapter uses `matchesFilters` + `haversineKm` directly.
- `sort=distance` ranks `ST_DISTANCE` over a lightweight projection and then loads the page.
- **Pagination:** `nextCursor` is an opaque base64url offset (`{"o":n}`). The same scheme is used for admin lists.

**Feed**
- Rails, in order: `closest` (only with lat/lng), `budget` (≤ ₹10,000, rent asc), `furnished`, `immediate`, `newest`.
- Each rail holds up to 10 items. Empty rails are dropped. Active filters apply to every rail.

**Listing detail and views**
- Removed and paused listings return 404 to everyone except the owner.
- Views are incremented best-effort, and not for the owner.

**Favorites**
- Stored as an id array on the user document, capped at `LIMITS.favoritesPerUser`. Deleted or hidden listings are skipped.

**Inquiries**
- 10 per hour per user. You cannot inquire about your own listing (400).
- Each inquiry increments `stats.inquiries`.
- The owner is emailed through ACS if their `notifications.messages` setting is on.

**Uploads**
- User-delegation SAS (create + write, HTTPS only, 10 min). The blob name is `${purpose}/${userId}/${uuid}.${ext}`.
- The client PUTs the bytes with `x-ms-blob-type: BlockBlob` and `Content-Type`.

**Account deletion**
- Deletes the user, their listings and their OTP document.

### Configuration (app settings / `local.settings.json`)

| Variable | Default | Notes |
| --- | --- | --- |
| `COSMOS_ENDPOINT` | – | Unset → in-memory repositories (seeded when `SEED_MEMORY` ≠ false) |
| `COSMOS_DATABASE` | `flatme` | |
| `STORAGE_ACCOUNT_URL` | – | Blob endpoint. Unset → fake local upload URLs |
| `PHOTOS_CONTAINER` | `listing-photos` | |
| `ACS_ENDPOINT` / `ACS_CONNECTION_STRING` | – | Managed identity via endpoint (preferred). The connection string wins if set. Neither set → console sender |
| `EMAIL_SENDER` | – | `DoNotReply@<domain>.azurecomm.net` |
| `JWT_SECRET` | **required** | ≥ 32 chars (Key Vault reference in Azure) |
| `JWT_TTL_DAYS` | `30` | |
| `OTP_PEPPER` | `JWT_SECRET` | Key Vault reference in Azure |
| `OTP_DEV_MODE` | `false` | `true` returns and logs `devCode`. Never enable in prod |
| `DEMO_EMAIL`, `DEMO_OTP` | – | Store-review account |
| `ADMIN_EMAILS` | – | Comma-separated allowlist |
| `ADMIN_AUTH_DISABLED` | `false` | `true` disables auth on all admin routes (see Admin) – dangerous |
| `SEED_MEMORY` | `true` | Local only |

Cloud SDKs authenticate with `DefaultAzureCredential`: managed identity in Azure, `az login` locally.

### Build, test, run

```powershell
npm run typecheck -w apps/api
npm test -w apps/api           # vitest: services against memory adapters + handler-level error mapping
npm run build -w apps/api      # esbuild → dist/main.js (single CJS bundle; only @azure/functions external)
cp apps/api/local.settings.example.json apps/api/local.settings.json
npm run start -w apps/api      # build + func start → http://localhost:7071/api (memory repos, 20 seed listings)
npm run smoke -w apps/api      # end-to-end check, all responses parsed with the shared schemas
npm run package -w apps/api    # → apps/api/.deploy ready for zip deploy / func publish
```

## Admin

The admin portal (`apps/admin`, Static Web App) talks to the same Function App through `ADMIN_ROUTES` from `packages/shared/src/admin.ts`.

**Roles**
- `role` is `user` or `admin` and lives on the user document.
- `ADMIN_EMAILS` promotes matching accounts at OTP verify. Allowlisted admins may sign in with a personal mailbox (e.g. gmail); the corporate-email rule still applies to everyone else.
- **`ADMIN_AUTH_DISABLED=true` (currently on in `infra/main.parameters.json`).** Every `ADMIN_ROUTES` handler skips JWT and role checks and runs as the synthetic actor `{ id: "system-admin", email: "admin@flatme.local", role: "admin" }`, which is what audit entries record. A warning is logged at worker start. **Security risk: admin APIs become publicly readable and writable (user PII, suspensions, deletions, role changes). Turn it off before real users.** Non-admin routes are unaffected.
- Admins can promote or demote other users. **Self-demotion, self-suspension and self-deletion return 409.**
- The JWT carries a `role` claim for the client's convenience only. `withAdmin` **re-reads the role from Cosmos on every request** and returns `403 forbidden` otherwise.

**Suspension**
- `status` is `active` or `suspended`.
- A suspended user gets `403 forbidden` at OTP verify and on every authenticated endpoint, effective immediately even with a valid token.
- Their listings are left as they are; admins can moderate them separately.

**Moderation**
- Listing status is `active`, `paused` or `removed`. Owners may only toggle `active` and `paused`; un-removing returns 409.
- Removed listings disappear from feed, search, highlights, favorites and detail for everyone except the owner, who sees `moderationReason` in `me/listings` and detail.

**Reports**
- Filed via `POST listings/{id}/reports` and stored in Cosmos `reports` (/listingId).
- One open report per (reporter, listing), otherwise 409. Max 10 per day per user. Reporting your own listing returns 400.
- Open counts are computed by query.
- Resolving a report can also remove the listing (`removeListing: true`).

**Audit**
- Every admin mutation writes an `AuditEntry` to Cosmos `audit` (/id). Each entry has a per-item TTL of 365 days.
- Audited actions: user suspend/reinstate/role/delete, listing moderate/delete, report resolve/dismiss, Data Explorer document edit/delete (`data.update` / `data.delete`, target type `document`, target id `<container>/<id>`).

**Data Explorer** (`services/dataExplorerService.ts`, port `DataExplorerRepository`, Cosmos + memory adapters)
- Raw document access for operators: browse with a filter, run read-only SQL, view, replace and delete. Same `withAdmin` guard as every other admin route.
- **Allowlist.** Only the containers in `DATA_CONTAINERS` (`packages/shared/src/dataExplorer.ts`) are reachable: `users`, `listings`, `otps`, `inquiries`, `reports` and `audit`. Any other name returns 404 and is never passed to Cosmos. `audit` is read-only, so writes to it return 400.
- **Browse filter.** The `field` must match `DATA_FIELD_PATH_RE` (for example `status` or `contact.email`). It is emitted as a bracketed property path and the value is always a query parameter. `eq` matches the string form, or the number/boolean/null when the value parses as one. `contains` is case-insensitive. Results are newest first (`_ts DESC`).
- **Read-only SQL.** The query must start with `SELECT` after comments are stripped, may not contain `;`, and is capped at 4,000 characters. Cross-partition queries are allowed. Paging defaults to 25 items, up to 100, using the Cosmos continuation token. Responses report the request charge in RU. Cosmos syntax errors return 400 `Query failed: …`.
- **Replace.** The body must be a JSON object whose `id` and partition-key value match the URL. System properties (`_rid`, `_self`, `_etag`, `_attachments`, `_ts`) are stripped before writing. Optimistic concurrency uses `If-Match` or the body's `_etag`; a stale etag returns 409 `conflict`.
- The memory adapter (tests, `SEED_MEMORY`) only understands `SELECT * FROM c [WHERE c.f = literal [AND …]]`. Other queries return 400 with an explanation.
- **With `ADMIN_AUTH_DISABLED=true` these endpoints let anyone read and rewrite raw production data, including OTP hashes and user PII.**

| Method | Route | Response |
| --- | --- | --- |
| GET | `admin/stats` | `AdminStats` (totals, byArea, byCompany, 14-day timeline) |
| GET | `admin/users?q&status&role&cursor&limit` | `AdminUserPage` |
| GET / DELETE | `admin/users/{id}` | `AdminUser` / 204 (full account-deletion cascade) |
| PATCH (PUT) | `admin/users/{id}/status` | `AdminUser` |
| PATCH (PUT) | `admin/users/{id}/role` | `AdminUser` |
| GET | `admin/listings?q&status&area&ownerId&reported&cursor&limit` | `AdminListingPage` |
| GET / DELETE | `admin/listings/{id}` | `AdminListing` / 204 |
| PATCH (PUT) | `admin/listings/{id}/moderation` | `AdminListing` |
| GET | `admin/reports?status&q&cursor&limit` | `ReportPage` |
| PATCH (PUT) | `admin/reports/{id}` | `Report` |
| GET | `admin/audit?targetId&q&cursor&limit` | `AuditPage` |
| GET | `admin/data/containers` | `DataContainerList` |
| GET | `admin/data/{container}/items?field&op=eq\|contains&value&pageSize&continuation` | `DataPage` |
| POST | `admin/data/{container}/query` `{ query, pageSize?, continuation? }` | `DataPage` (`items`, `continuation`, `requestCharge`, `count`) |
| GET / PUT / DELETE | `admin/data/{container}/items/{id}?pk=` | raw document / replaced document / 204 |

CORS: the Function App allows the admin SWA origin, `http://localhost:5173` (admin dev) and `http://localhost:8081` (Expo web). Native mobile clients don't need CORS.

## Infrastructure

All resources live in one resource group and are defined in `infra/main.bicep` + `infra/modules/*`. Deployment commands are in [`infra/README.md`](../infra/README.md).

```
              ┌───────────── Static Web App (admin, eastasia, Free) ─────────────┐
              │                                                                  │ HTTPS + CORS
 Mobile app ──┼──► Function App (Flex Consumption FC1, Node 22, system MI) ◄─────┘
              │        │ MI: Cosmos SQL RBAC     │ MI: Blob Owner (+ delegation SAS)
              │        ▼                         ▼
              │   Cosmos DB serverless      Storage (listing-photos public-read, deployments)
              │   users·listings·otps·            ▲
              │   inquiries·reports·audit         │ PUT via 10-min user-delegation SAS
              └───────────────────────────────────┘
                       │ MI: KV Secrets User     │ MI: Contributor
                       ▼                         ▼
                  Key Vault (JWT-SECRET,     ACS Email (Azure-managed domain, India)
                  OTP-PEPPER)
                       App Insights ◄── Log Analytics
```

**Region and plan**
- `centralindia` for everything regional. ACS is `global` with `dataLocation: India`. The SWA is in `eastasia`.
- Function App: Flex Consumption with `maximumInstanceCount` 40 and 2048 MB instances.
- Deployment packages go to the `deployments` blob container through managed identity. `AzureWebJobsStorage` is identity-based (`AzureWebJobsStorage__accountName`).

**Secrets**
- `JWT_SECRET` and `OTP_PEPPER` are Key Vault references.
- Cosmos runs with `disableLocalAuth`, and storage with `allowSharedKeyAccess: false`.
- ACS uses Entra ID auth, so no keys exist anywhere in config.

**Optional `deployerPrincipalId`**
- Grants a human or CI principal Cosmos data and blob access so `npm run seed` can run from a dev machine.

**CI**
- `.github/workflows/ci.yml` has three jobs:
  - **backend**: typechecks and tests shared + api, builds and packages the API, and compiles the Bicep.
  - **mobile**: typecheck, `expo lint` (React Compiler rules), and a web export bundle smoke test.
  - **admin**: typecheck, tests, and `vite build`.

## Mobile app

Expo SDK 58 (React Native 0.88, React 19, React Compiler on), Expo Router with typed routes, Reanimated 4 for all motion.

### Layout (`apps/mobile/src`)

| Folder | Responsibility |
| --- | --- |
| `app/` | Routes only (file-based). Screens compose features and hooks; they hold no data-access logic. |
| `features/` | Feature modules: `splash`, `listings` (card, map, filters, post/edit wizard, photo picker), `listing-detail` (gallery, contact/report sheets), `profile` (profile form, step progress). |
| `api/` | `types.ts` (the `FlatMeApi` interface), with two implementations: `http.ts` (fetch + shared Zod parsing + typed errors in `errors.ts`) and `mock.ts` (in-memory, seeded from `mock-data.ts`). `index.ts` picks one; `hooks.ts` has the TanStack Query hooks and the query-key factory. |
| `store/` | Zustand: `session.ts` (token, user and onboarding flag persisted via `lib/storage` secure storage; `useJourney()` derives the route group) and `preferences.ts` (location, filters). Server state lives only in TanStack Query. |
| `ui/` | Design system: tokens (`theme/`), Text, Button, PressableScale (spring + haptics), Sheet, Toast, Skeleton, OtpInput, Segmented, RangeSlider, etc. |

### Journey

Splash (animated logo) → Welcome → work email → OTP (auto-submit) → profile (step 1/2) → location (step 2/2) → tabs: **Explore** (rails), **Map** (pins + synced card carousel), **Post** (3-step wizard → confetti), **Saved**, **Profile** (my listings, settings, edit profile). Listing detail has a parallax gallery, contact sheet (call/WhatsApp/email/in-app inquiry), report, share, and owner controls (pause/resume/edit/delete).

Navigation guarding uses `Stack.Protected` in `app/_layout.tsx`, driven by the session and onboarding stores, so there are no imperative redirects.

### Configuration

| Var | Meaning |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | API base, e.g. `https://<func>.azurewebsites.net/api`. When unset, the app runs on the **mock API** (any corporate email; OTP `123456`). |

### Conventions

- Every response is parsed with `@flatme/shared` schemas; forms validate with the same schemas the API uses.
- Lint follows the React Compiler rules: `sharedValue.set()` instead of `.value =`, no ref access during render, and derive-during-render instead of setState in effects.
- Run: `npm run start -w apps/mobile`. Check: `npm run typecheck -w apps/mobile && npm run lint -w apps/mobile`.
