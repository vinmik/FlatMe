import { HttpRequest, InvocationContext, type HttpHandler } from "@azure/functions";
import { SearchQuerySchema, ApiErrorSchema, ListingDetailSchema, UserSchema, FeedSchema } from "@flatme/shared";
import { afterEach, describe, expect, it } from "vitest";
import { setServices } from "../src/composition";
import { AccountSuspendedError, ConflictError, NotFoundError } from "../src/domain/errors";
import { adminListAudit, adminListUsers, adminSetUserRole, adminSetUserStatus } from "../src/functions/admin";
import { otpRequest, otpVerify } from "../src/functions/auth";
import { createListing, feed, getListing } from "../src/functions/listings";
import { getMe, updateMe } from "../src/functions/me";
import { createHarness, listingInput } from "./harness";

function call(
  handler: HttpHandler,
  opts: { method?: string; path?: string; token?: string; body?: unknown; params?: Record<string, string> } = {},
) {
  const req = new HttpRequest({
    method: opts.method ?? "GET",
    url: `http://localhost:7071/api/${opts.path ?? "x"}`,
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    params: opts.params ?? {},
    body: opts.body === undefined ? undefined : { string: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body) },
  });
  const ctx = new InvocationContext({ invocationId: "test-invocation", logHandler: () => {} });
  return Promise.resolve(handler(req, ctx)) as Promise<{ status: number; jsonBody?: unknown; body?: unknown; headers: Record<string, string> }>;
}

const bodyOf = (res: { jsonBody?: unknown; body?: unknown }) =>
  res.jsonBody ?? (typeof res.body === "string" ? JSON.parse(res.body) : res.body);

afterEach(() => setServices(null));

describe("HTTP pipeline", () => {
  it("returns 401 unauthorized without a valid token", async () => {
    setServices(createHarness().services);
    for (const token of [undefined, "not-a-jwt"]) {
      const res = await call(getMe, { path: "me", token });
      expect(res.status).toBe(401);
      expect(ApiErrorSchema.parse(bodyOf(res)).error.code).toBe("unauthorized");
    }
  });

  it("maps Zod failures to 400 validation_failed with a field map", async () => {
    const h = createHarness();
    setServices(h.services);
    const { token } = await h.signIn("a@tcs.com");
    const res = await call(updateMe, { method: "PATCH", path: "me", token, body: { fullName: "A", company: "", phone: "12" } });
    expect(res.status).toBe(400);
    const err = ApiErrorSchema.parse(bodyOf(res)).error;
    expect(err.code).toBe("validation_failed");
    expect(Object.keys(err.fields ?? {})).toEqual(expect.arrayContaining(["fullName", "company", "phone", "designation"]));
  });

  it("serves contract-conformant responses end-to-end", async () => {
    const h = createHarness();
    setServices(h.services);
    const { token } = await h.signIn("a@tcs.com");
    expect(UserSchema.parse(bodyOf(await call(getMe, { token }))).profileComplete).toBe(true);
    const created = await call(createListing, { method: "POST", token, body: listingInput() });
    expect(created.status).toBe(201);
    const detail = ListingDetailSchema.parse(bodyOf(created));
    const got = await call(getListing, { token, params: { id: detail.id } });
    expect(ListingDetailSchema.parse(bodyOf(got)).isOwner).toBe(true);
    expect(FeedSchema.parse(bodyOf(await call(feed, { token }))).rails.length).toBeGreaterThan(0);
  });
});

describe("admin & moderation", () => {
  it("rejects non-admins from admin endpoints with 403 forbidden (role re-checked from DB)", async () => {
    const h = createHarness({ adminEmails: ["boss@flatme.app"] });
    setServices(h.services);
    const { token: userToken } = await h.signIn("a@tcs.com");
    const res = await call(adminListUsers, { token: userToken });
    expect(res.status).toBe(403);
    expect(ApiErrorSchema.parse(bodyOf(res)).error.code).toBe("forbidden");

    const { user: boss, token: bossToken } = await h.signIn("boss@flatme.app");
    expect((await call(adminListUsers, { token: bossToken })).status).toBe(200);

    // Demoted in the DB: the still-valid admin JWT no longer works.
    await h.services.repos.users.upsert({ ...boss, role: "user" });
    expect((await call(adminListUsers, { token: bossToken })).status).toBe(403);
  });

  it("blocks admins from demoting themselves", async () => {
    const h = createHarness({ adminEmails: ["boss@flatme.app"] });
    setServices(h.services);
    const { user: boss, token } = await h.signIn("boss@flatme.app");
    await expect(h.services.admin.setUserRole(boss, boss.id, "user")).rejects.toBeInstanceOf(ConflictError);
    const res = await call(adminSetUserRole, { method: "PATCH", token, params: { id: boss.id }, body: { role: "user" } });
    expect(res.status).toBe(409);
    expect((await h.reload(boss)).role).toBe("admin");
  });

  it("blocks suspended users at sign-in and on authenticated endpoints", async () => {
    const h = createHarness({ adminEmails: ["boss@flatme.app"] });
    setServices(h.services);
    const { user: boss } = await h.signIn("boss@flatme.app");
    const { user, token } = await h.signIn("a@tcs.com");
    await h.services.admin.setUserStatus(boss, user.id, { status: "suspended", reason: "Spam listings" });

    const res = await call(getMe, { token });
    expect(res.status).toBe(403);
    expect(ApiErrorSchema.parse(bodyOf(res)).error.code).toBe("forbidden");

    const { devCode } = await h.services.auth.requestOtp("a@tcs.com");
    await expect(h.services.auth.verifyOtp("a@tcs.com", devCode!)).rejects.toBeInstanceOf(AccountSuspendedError);

    const audit = await h.services.admin.listAudit({ limit: 20 } as never);
    expect(audit.items.map((a) => a.action)).toContain("user.suspend");
  });

  it("hides removed listings from everyone but the owner, who sees the reason", async () => {
    const h = createHarness({ adminEmails: ["boss@flatme.app"] });
    const { user: boss } = await h.signIn("boss@flatme.app");
    const { user: owner } = await h.signIn("owner@tcs.com");
    const { user: viewer } = await h.signIn("viewer@infosys.com");
    const l = await h.services.listings.create(owner, listingInput());

    await h.services.admin.moderateListing(boss, l.id, { status: "removed", reason: "Duplicate listing" });

    await expect(h.services.listings.getDetail(l.id, viewer)).rejects.toBeInstanceOf(NotFoundError);
    const feedRes = await h.services.listings.feed(SearchQuerySchema.parse({}));
    expect(feedRes.rails.flatMap((r) => r.items).map((i) => i.id)).not.toContain(l.id);
    expect((await h.services.public.highlights()).featured.map((i) => i.id)).not.toContain(l.id);

    const ownerView = await h.services.listings.getDetail(l.id, owner);
    expect(ownerView).toMatchObject({ status: "removed", moderationReason: "Duplicate listing" });
    await expect(h.services.listings.setStatus(owner, l.id, "active")).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("ADMIN_AUTH_DISABLED flag", () => {
  it("lets admin routes run without a token as the synthetic system admin, audited as such", async () => {
    const h = createHarness({ adminAuthDisabled: true });
    setServices(h.services);
    const { user } = await h.signIn("a@tcs.com");

    expect((await call(adminListUsers, {})).status).toBe(200);
    const res = await call(adminSetUserStatus, {
      method: "PATCH",
      params: { id: user.id },
      body: { status: "suspended", reason: "Testing the flag" },
    });
    expect(res.status).toBe(200);
    expect((bodyOf(res) as { status: string }).status).toBe("suspended");

    const audit = bodyOf(await call(adminListAudit, {})) as { items: { actorId: string; actorEmail: string }[] };
    expect(audit.items[0]).toMatchObject({ actorId: "system-admin", actorEmail: "admin@flatme.local" });

    // Non-admin routes still require a token.
    expect((await call(getMe, {})).status).toBe(401);
  });

  it("requires a token on admin routes when the flag is off", async () => {
    setServices(createHarness().services);
    const res = await call(adminListUsers, {});
    expect(res.status).toBe(401);
    expect(ApiErrorSchema.parse(bodyOf(res)).error.code).toBe("unauthorized");
  });
});

describe("personal mailbox sign-in", () => {
  it("allows allowlisted admins with a personal mailbox but keeps regular users corporate-only", async () => {
    const h = createHarness({ adminEmails: ["vineetraj9@gmail.com"] });
    setServices(h.services);

    const req = await call(otpRequest, { method: "POST", body: { email: " VineetRaj9@Gmail.com " } });
    expect(req.status).toBe(200);
    const { devCode } = bodyOf(req) as { devCode: string };
    const verify = await call(otpVerify, { method: "POST", body: { email: "vineetraj9@gmail.com", code: devCode } });
    expect(verify.status).toBe(200);
    expect((bodyOf(verify) as { user: { role: string; email: string } }).user).toMatchObject({
      role: "admin",
      email: "vineetraj9@gmail.com",
    });

    const other = await call(otpRequest, { method: "POST", body: { email: "someone.else@gmail.com" } });
    expect(other.status).toBe(400);
    expect(ApiErrorSchema.parse(bodyOf(other)).error.code).toBe("personal_email");
  });
});