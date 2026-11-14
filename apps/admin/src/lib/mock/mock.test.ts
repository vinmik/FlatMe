import {
  AdminListingSchema,
  AdminStatsSchema,
  AdminUserSchema,
  AuditEntrySchema,
  ReportSchema,
} from "@flatme/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "../api/client";
import { createEndpoints } from "../api/endpoints";
import { MOCK_BASE_URL } from "../config";
import { createMockBackend } from "./backend";
import { createSeed, MOCK_ADMIN_EMAIL, MOCK_OTP, type MockDb } from "./seed";
import { createMockFetch } from "./server";

const NOW = new Date("2026-03-01T10:00:00.000Z");

describe("mock seed data", () => {
  const db = createSeed(NOW);

  it("validates against the shared admin schemas", () => {
    expect(() => z.array(AdminUserSchema).parse(db.users)).not.toThrow();
    expect(() => z.array(AdminListingSchema).parse(db.listings)).not.toThrow();
    expect(() => z.array(ReportSchema).parse(db.reports)).not.toThrow();
    expect(() => z.array(AuditEntrySchema).parse(db.audit)).not.toThrow();
  });

  it("is realistic and internally consistent", () => {
    expect(db.users.length).toBeGreaterThan(50);
    expect(db.listings.length).toBeGreaterThan(30);
    expect(db.users.some((u) => u.email === MOCK_ADMIN_EMAIL && u.role === "admin")).toBe(true);
    const userIds = new Set(db.users.map((u) => u.id));
    const listingIds = new Set(db.listings.map((l) => l.id));
    for (const l of db.listings) {
      expect(userIds.has(l.owner.id)).toBe(true);
      expect(l.rent).toBeGreaterThan(0);
    }
    for (const r of db.reports) expect(listingIds.has(r.listingId)).toBe(true);
    for (const l of db.listings) {
      expect(l.openReports).toBe(db.reports.filter((r) => r.listingId === l.id && r.status === "open").length);
    }
  });

  it("is deterministic", () => {
    expect(createSeed(NOW).users.map((u) => u.email)).toEqual(db.users.map((u) => u.email));
  });
});

describe("mock backend through the real API layer", () => {
  let db: MockDb;
  let token: string | null;
  let onAuthFailure: ReturnType<typeof vi.fn>;
  let api: ReturnType<typeof createEndpoints>;

  beforeEach(() => {
    db = createSeed(NOW);
    token = null;
    onAuthFailure = vi.fn();
    const fetch = createMockFetch(createMockBackend(db, () => NOW), () => 0);
    api = createEndpoints(createApiClient({ baseUrl: MOCK_BASE_URL, fetch, getToken: () => token, onAuthFailure }));
  });

  async function signInAdmin() {
    const otp = await api.auth.requestOtp(MOCK_ADMIN_EMAIL);
    expect(otp.devCode).toBe(MOCK_OTP);
    const session = await api.auth.verifyOtp(MOCK_ADMIN_EMAIL, otp.devCode!);
    token = session.token;
    return session;
  }

  it("signs in an admin and serves schema-valid stats", async () => {
    const session = await signInAdmin();
    expect(session.user.email).toBe(MOCK_ADMIN_EMAIL);
    const stats = await api.stats();
    expect(AdminStatsSchema.safeParse(stats).success).toBe(true);
    expect(stats.timeline).toHaveLength(14);
    expect(stats.users.total).toBe(db.users.length);
    expect(stats.reports.open).toBe(db.reports.filter((r) => r.status === "open").length);
  });

  it("rejects a wrong OTP without triggering sign-out", async () => {
    await expect(api.auth.verifyOtp(MOCK_ADMIN_EMAIL, "000000")).rejects.toMatchObject({ code: "otp_invalid" });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("forbids non-admins from admin routes", async () => {
    const session = await api.auth.verifyOtp("neha.sharma@infosys.com", MOCK_OTP);
    expect(session.user.role).toBe("user");
    token = session.token;
    await expect(api.stats()).rejects.toMatchObject({ status: 403, code: "forbidden" });
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });

  it("accepts tokenless admin calls when auth is disabled, attributing them to the operator", async () => {
    const fetch = createMockFetch(createMockBackend(db, () => NOW, { authDisabled: true }), () => 0);
    const open = createEndpoints(createApiClient({ baseUrl: MOCK_BASE_URL, fetch }));
    const target = db.users.find((u) => u.role === "user" && u.status === "active")!;
    await open.users.setStatus(target.id, { status: "suspended", reason: "Spam listings" });
    const audit = await open.audit.list({ targetId: target.id });
    expect(audit.items[0]).toMatchObject({ action: "user.suspend", actorEmail: MOCK_ADMIN_EMAIL });
  });

  it("requires a session", async () => {
    await expect(api.users.list()).rejects.toMatchObject({ status: 401 });
  });

  it("paginates with opaque cursors and filters", async () => {
    await signInAdmin();
    const p1 = await api.users.list({ limit: 10 });
    expect(p1.items).toHaveLength(10);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await api.users.list({ limit: 10, cursor: p1.nextCursor! });
    expect(p2.items[0]!.id).not.toBe(p1.items[0]!.id);
    expect(p2.total).toBe(p1.total);

    const admins = await api.users.list({ role: "admin", limit: 100 });
    expect(admins.items.every((u) => u.role === "admin")).toBe(true);
    const reported = await api.listings.list({ reported: true, limit: 100 });
    expect(reported.items.every((l) => l.openReports > 0)).toBe(true);
    const clean = await api.listings.list({ reported: false, limit: 100 });
    expect(clean.items.length).toBeGreaterThan(0);
    expect(clean.items.every((l) => l.openReports === 0)).toBe(true);
    expect(clean.total + reported.total).toBe(db.listings.length);
  });

  it("suspends a user and records it in the audit log", async () => {
    await signInAdmin();
    const target = db.users.find((u) => u.role === "user" && u.status === "active")!;
    await expect(api.users.setStatus(target.id, { status: "suspended" })).rejects.toMatchObject({ status: 400 });
    const updated = await api.users.setStatus(target.id, { status: "suspended", reason: "Posting fake listings" });
    expect(updated).toMatchObject({ status: "suspended", suspendedReason: "Posting fake listings" });
    const audit = await api.audit.list({ targetId: target.id });
    expect(audit.items[0]).toMatchObject({ action: "user.suspend", actorEmail: MOCK_ADMIN_EMAIL });
  });

  it("won't let an admin suspend themselves", async () => {
    const { user } = await signInAdmin();
    await expect(api.users.setStatus(user.id, { status: "suspended", reason: "testing" })).rejects.toMatchObject({ status: 400 });
  });

  it("resolves a report and removes the listing in one step", async () => {
    await signInAdmin();
    const report = db.reports.find((r) => r.status === "open")!;
    const resolved = await api.reports.resolve(report.id, { status: "resolved", resolution: "Confirmed scam", removeListing: true });
    expect(resolved).toMatchObject({ status: "resolved", resolution: "Confirmed scam" });
    const listing = await api.listings.get(report.listingId);
    expect(listing.status).toBe("removed");
    await expect(api.reports.resolve(report.id, { status: "dismissed", resolution: "again" })).rejects.toMatchObject({ status: 409 });
  });

  it("deletes a user (204)", async () => {
    await signInAdmin();
    const target = db.users.find((u) => u.role === "user")!;
    await api.users.remove(target.id);
    await expect(api.users.get(target.id)).rejects.toMatchObject({ status: 404 });
  });
});
