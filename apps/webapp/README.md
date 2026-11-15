# @flatme/webapp

The FlatMe web app. It has two halves in one Next.js app:

| Part | Who sees it | Pages |
| --- | --- | --- |
| Public, rendered on the server | Anyone, including search engines | `/`, `/flats`, `/flats/<area>`, `/listing/<id>` |
| Signed-in, rendered in the browser | Members | `/signin`, `/welcome`, `/post`, `/listing/<id>/edit`, `/my-listings`, `/saved`, `/profile` |

Public pages read the API's anonymous endpoints (`public/highlights`, `public/listings`, `public/listings/{id}`), which never return contact details and round locations to about 110 m. Everything else uses the same authenticated API and the same account as the mobile app.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query, zustand, Leaflet with OpenStreetMap tiles. Contracts come from `@flatme/shared`.

## Run it

From the repo root, after `npm install`:

```bash
npm run api:start            # API on http://localhost:7071/api (in-memory data, 20 sample listings)
npm run storage -w apps/api  # local photo storage on http://127.0.0.1:10000 (needed to upload photos)
npm run dev -w apps/webapp       # web app on http://localhost:5173
```

The port matters: `http://localhost:5173` is one of the browser origins the API accepts. With the local API, the sign-in screen shows the one-time code, so no email is needed.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173 |
| `npm run build` / `npm run start` | Production build, then serve it |
| `npm run typecheck` | `tsc` with unused-code checks |
| `npm test` | Vitest (address-bar ↔ filter state) |

Stop the dev server before `npm run build`. Both write to `.next`, and a build made underneath a running dev server sends it into a reload loop (`rm -rf .next` clears it).

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API root including `/api`. Empty uses `http://localhost:7071/api`. |
| `NEXT_PUBLIC_SITE_URL` | This site's public address, used for canonical links and the sitemap. |

## How it is put together

- `src/app/` holds routes only. Public pages are server components that fetch through `lib/public-api.ts` and cache each answer for 60 seconds.
- `lib/refresh.ts` is a server action that drops those cached answers when someone posts, edits, pauses or deletes a listing, so owners see their change at once.
- `lib/api.ts` is the browser client for the authenticated API; `lib/hooks.ts` wraps it in TanStack Query.
- `lib/session.ts` keeps the sign-in token in `localStorage`; `lib/place.ts` keeps "where I work" (an office area or the device location) on the device.
- `lib/search-params.ts` makes the address bar the single source of filter state, so every search is a shareable link.
- `components/RequireAuth.tsx` guards member pages and sends people to sign in or to finish their profile, then back.

## Search engines

- Every public page has its own title, description and canonical link. Listing pages add `Apartment` structured data.
- `/sitemap.xml` lists the home page, the ten area pages and every active listing; `/robots.txt` keeps member pages out.
- Filter combinations on `/flats` are `noindex` and point to `/flats` as canonical, except a single-area filter, which points to its area page.
- A paused, removed or missing listing returns a real 404.

## Going live

`apps/web` (the static placeholder landing page) is what is live today; this web app is meant to replace it once hosted. Nothing deploys this app yet.

The site needs a host that runs Node. On Azure that is App Service, or Static Web Apps in its hybrid Next.js mode (in preview, and untested with this app). Before pointing it at the production API:

1. Deploy the API version that includes the `public/listings` endpoints (Actions → Deploy, tick API).
2. Add the site's address to the Function App's allowed origins.
3. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` at build time.
4. Map tiles come straight from openstreetmap.org, which is fine for light use; switch to a paid tile provider before real traffic.
