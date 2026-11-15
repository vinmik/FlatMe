# @flatme/admin

Operator portal for FlatMe: dashboard, user management, listing moderation, the reports queue and the audit log.

Stack: Vite 7, React 19, TypeScript (strict), Tailwind CSS v4, react-router, TanStack Query, recharts, motion, lucide-react. All API traffic goes through `src/lib/api`, which builds paths from `ADMIN_ROUTES`/`ROUTES` and parses every response with the zod schemas in `@flatme/shared`.

## Scripts

Run these from `apps/admin` after installing from the repo root with `npm install`:

| Script              | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Dev server on http://localhost:5174                    |
| `npm run build`     | Type-checks, then builds into `dist/`                  |
| `npm run preview`   | Serves `dist/` on http://localhost:4174                |
| `npm run typecheck` | `tsc --noEmit`                                         |
| `npm test`          | Vitest (jsdom): API client, mock data and OTP input    |

## Environment

Copy `.env.example` to `.env.local`.

| Variable            | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | API root including `/api`, e.g. `https://flatme-api.azurewebsites.net/api`.    |
| `VITE_USE_MOCKS`    | `true` uses the in-memory mock backend. Mocks are also used when the URL is unset. |
| `VITE_ADMIN_AUTH_DISABLED` | **Temporary.** `true` turns off sign-in (see below). Production builds default to `true` when unset. |

## Mock mode

The mock backend (`src/lib/mock`) is seeded with deterministic data for Hyderabad: about 128 users, 84 listings, 34 reports and an audit trail. It enforces the same rules as the real API (admin-only access, required reasons, no self-suspend, and so on).

To sign in, use **admin@flatme.in** with code **123456**. The code also appears as a dev hint on the login screen. Any other work email signs in as a regular user and gets the "Not authorized" screen.

Mock data lives in memory, so reloading the page resets it.

## Data Explorer

The **Data Explorer** page (`/data`, `src/features/data`) gives raw access to the Cosmos containers:

- Browse any container with a field `equals` / `contains` filter, 25 items per page and "Load more".
- Run read-only SQL (`SELECT` only, no `;`). The editor shows the request charge in RU, and Ctrl/⌘+Enter runs the query.
- View a document's JSON in a drawer, edit it as a full replace, or delete it after typing its id to confirm.
- Export the loaded results as JSON or CSV. CSV flattens top-level fields, JSON-encodes nested values and guards against formula injection.

Endpoints:

| Method | Route |
| --- | --- |
| GET | `admin/data/containers` |
| GET | `admin/data/{container}/items?field&op&value&pageSize&continuation` |
| POST | `admin/data/{container}/query` |
| GET / PUT / DELETE | `admin/data/{container}/items/{id}?pk=` |

The server enforces these guarantees, and the mock backend mirrors them:

- Only allowlisted containers (`DATA_CONTAINERS`) are reachable, and `audit` is read-only.
- Filter field names are validated against a strict identifier path, and filter values are always sent as query parameters.
- Queries must be a single `SELECT`.
- On edit, the `id` and partition key can't change and system properties are stripped.
- Saves send the loaded `_etag`, so a concurrent change returns 409 instead of being overwritten.
- Edits and deletes appear in the Audit log as `data.update` / `data.delete`.

In mock mode, SQL is limited to `SELECT * FROM c [WHERE c.field = 'value' [AND …]]`.

> **Warning:** while the API runs with `ADMIN_AUTH_DISABLED=true`, these endpoints are **publicly readable and writable**. Anyone who knows the URL can read or rewrite any document. Re-enable admin auth before relying on this in production.

## Auth

> **Auth is currently disabled.** `VITE_ADMIN_AUTH_DISABLED=true` is the default in `.env.example` and in production builds (`vite.config.ts`). It pairs with the API running `ADMIN_AUTH_DISABLED=true`.
>
> - The portal opens straight to the dashboard, with no login screen.
> - No bearer token is sent.
> - A 401 or 403 shows an error instead of signing out.
> - The sidebar shows "Admin (auth disabled)".
>
> The mock backend also accepts tokenless admin calls and attributes them to `admin@flatme.in`. Set the flag to `false` and rebuild to restore OTP sign-in. Everything below then applies.

The portal uses the same OTP endpoints as the mobile app.

- The bearer token is kept in `sessionStorage`.
- Non-admin users are rejected and their token is never stored.
- Any `401`, or a `403 forbidden` on an authenticated call, signs the operator out.

## Deploying (Azure Static Web Apps)

- App location: `apps/admin`
- Output location: `dist`
- Set `VITE_API_BASE_URL` at build time.

`public/staticwebapp.config.json` provides:

- The SPA navigation fallback, excluding `/assets/*`.
- Security headers: CSP, `X-Frame-Options: DENY`, HSTS and others.

The CSP's `connect-src` allows `https://*.azurewebsites.net`. If the API moves to a custom domain, update it there.
