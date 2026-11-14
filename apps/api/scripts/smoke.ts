/**
 * End-to-end smoke test against a running API; every response is parsed with the shared Zod contracts.
 *
 *   npx tsx scripts/smoke.ts                       # local `func start` with OTP_DEV_MODE=true
 *   $env:API_BASE_URL="https://<app>.azurewebsites.net/api"; $env:SMOKE_EMAIL="<DEMO_EMAIL>"; $env:SMOKE_OTP="<DEMO_OTP>"; npx tsx scripts/smoke.ts
 */
import {
  ApiErrorSchema,
  FeedSchema,
  ListingPageSchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  PublicHighlightsSchema,
  ROUTES,
  UserSchema,
  ListingDetailSchema,
} from "@flatme/shared";
import { z } from "zod";

const base = (process.env.API_BASE_URL ?? "http://localhost:7071/api").replace(/\/+$/, "");
const email = process.env.SMOKE_EMAIL ?? `smoke.${Date.now()}@contoso.com`;

async function call<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  init: { method?: string; body?: unknown; token?: string; expect?: number } = {},
): Promise<z.output<S>> {
  const res = await fetch(`${base}/${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : undefined;
  const expected = init.expect ?? 200;
  if (res.status !== expected) throw new Error(`${init.method ?? "GET"} /${path} → ${res.status}: ${text}`);
  const parsed = schema.parse(json);
  console.log(`✓ ${init.method ?? "GET"} /${path} → ${res.status}`);
  return parsed;
}

async function main(): Promise<void> {
  const health = await call(z.object({ status: z.literal("ok"), version: z.string() }), ROUTES.health);
  console.log("  ", health);
  const highlights = await call(PublicHighlightsSchema, ROUTES.publicHighlights);
  console.log(`   stats=${JSON.stringify(highlights.stats)} featured=${highlights.featured.length}`);

  const unauth = await call(ApiErrorSchema, ROUTES.me, { expect: 401 });
  console.log(`   ${unauth.error.code}`);

  const otp = await call(OtpRequestResponseSchema, ROUTES.otpRequest, { method: "POST", body: { email } });
  const code = process.env.SMOKE_OTP ?? otp.devCode;
  if (!code) throw new Error("No devCode returned — set SMOKE_OTP (demo account) for non-dev environments");
  const session = await call(OtpVerifyResponseSchema, ROUTES.otpVerify, { method: "POST", body: { email, code } });
  const token = session.token;
  console.log(`   user=${session.user.id} new=${session.isNewUser} role=${session.user.role}`);

  await call(UserSchema, ROUTES.me, { token });
  const feed = await call(FeedSchema, `${ROUTES.feed}?lat=17.4485&lng=78.3908`, { token });
  console.log(`   rails=${feed.rails.map((r) => `${r.key}:${r.items.length}`).join(", ")}`);
  const page = await call(ListingPageSchema, `${ROUTES.listings}?sort=distance&lat=17.44&lng=78.35&limit=5`, { token });
  console.log(`   search total=${page.total} first=${page.items[0]?.distanceKm ?? "-"}km next=${page.nextCursor ?? "null"}`);
  if (page.items[0]) await call(ListingDetailSchema, ROUTES.listing(page.items[0].id), { token });
  console.log("Smoke OK");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
