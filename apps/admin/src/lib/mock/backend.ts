import {
  ADMIN_ROUTES,
  AdminAuditQuerySchema,
  AdminListingQuerySchema,
  AdminReportQuerySchema,
  AdminUserQuerySchema,
  DATA_CONTAINERS,
  DataBrowseQuerySchema,
  DataItemKeySchema,
  DataQueryInputSchema,
  isPlainObject,
  matchesBrowseFilter,
  matchesSimpleSelect,
  ModerateListingSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  ResolveReportSchema,
  ROUTES,
  SetUserRoleSchema,
  SetUserStatusSchema,
  parseSimpleSelect,
  readPath,
  stripSystemProps,
  toIsoDate,
  validateReadOnlyQuery,
  UserSchema,
  type AdminStats,
  type AdminUser,
  type AuditEntry,
  type DataContainer,
  type ErrorCode,
  type User,
} from "@flatme/shared";
import type { z } from "zod";
import { createSeed, MOCK_ADMIN_EMAIL, MOCK_OTP, type MockDb } from "./seed";

const DAY = 24 * 60 * 60 * 1000;

export interface MockRequest {
  method: string;
  /** Route path relative to the API base, e.g. "admin/users/123". */
  path: string;
  query: URLSearchParams;
  body: unknown;
  token: string | null;
}

export interface MockResponse {
  status: number;
  body?: unknown;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
  throw new HttpError(400, "validation_failed", r.error.issues[0]?.message ?? "Invalid request", fields);
}

const encodeCursor = (o: number) => btoa(JSON.stringify({ o })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function decodeCursor(c: string | undefined): number {
  if (!c) return 0;
  try {
    const o = (JSON.parse(atob(c.replace(/-/g, "+").replace(/_/g, "/"))) as { o?: unknown }).o;
    if (typeof o === "number" && Number.isInteger(o) && o >= 0) return o;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "bad_request", "Invalid cursor");
}

function paginate<T>(items: T[], limit: number, cursor?: string) {
  const offset = decodeCursor(cursor);
  return {
    items: structuredClone(items.slice(offset, offset + limit)),
    total: items.length,
    nextCursor: offset + limit < items.length ? encodeCursor(offset + limit) : null,
  };
}

/** Turns `ADMIN_ROUTES.user` into a matcher for "admin/users/:id". */
function matcher(route: (id: string) => string) {
  const pattern = route("\u0000").split("\u0000").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("([^/]+)");
  const re = new RegExp(`^${pattern}$`);
  return (path: string) => re.exec(path)?.[1];
}

/** Like `matcher`, for routes with several path params (e.g. "admin/data/:container/items/:id"). */
function multiMatcher(route: (...ids: string[]) => string, arity: number) {
  const pattern = route(...Array<string>(arity).fill("\u0000"))
    .split("\u0000")
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("([^/]+)");
  const re = new RegExp(`^${pattern}$`);
  return (path: string) => re.exec(path)?.slice(1) as string[] | undefined;
}

const dataMatch = {
  items: multiMatcher(ADMIN_ROUTES.dataItems, 1),
  query: multiMatcher(ADMIN_ROUTES.dataQuery, 1),
  item: multiMatcher(ADMIN_ROUTES.dataItem, 2),
};

type Doc = Record<string, unknown>;

/** Stand-in for Cosmos `_etag` (content hash) and `_ts` (last write, from updatedAt/createdAt). */
function withSystemProps(doc: Doc): Doc {
  const clean = stripSystemProps(doc);
  const json = JSON.stringify(clean);
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  const stamp = typeof clean.updatedAt === "string" ? clean.updatedAt : typeof clean.createdAt === "string" ? clean.createdAt : null;
  const ts = stamp ? Math.floor(Date.parse(stamp) / 1000) : 0;
  return { ...structuredClone(clean), _etag: `"mock-${(h >>> 0).toString(16)}"`, _ts: ts };
}

function dataPage(docs: Doc[], pageSize: number, continuation?: string) {
  const offset = continuation ? Number(continuation) : 0;
  if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, "bad_request", "Invalid continuation token");
  const items = docs.slice(offset, offset + pageSize).map(withSystemProps);
  const next = offset + pageSize < docs.length ? String(offset + pageSize) : null;
  return { items, continuation: next, requestCharge: Math.round((2.3 + items.length * 0.4) * 100) / 100, count: items.length };
}

const match = {
  user: matcher(ADMIN_ROUTES.user),
  userStatus: matcher(ADMIN_ROUTES.userStatus),
  userRole: matcher(ADMIN_ROUTES.userRole),
  listing: matcher(ADMIN_ROUTES.listing),
  listingModeration: matcher(ADMIN_ROUTES.listingModeration),
  report: matcher(ADMIN_ROUTES.report),
};

const contains = (haystack: (string | null | undefined)[], q: string | undefined) =>
  !q || haystack.some((h) => h?.toLowerCase().includes(q.toLowerCase()));

const toUser = (u: AdminUser): User => UserSchema.parse(u);

/** In-memory implementation of the FlatMe auth + admin API, mirroring its routes and error shapes. */
export interface MockBackendOptions {
  /** Mirrors the API's ADMIN_AUTH_DISABLED: tokenless admin calls act as the seeded operator. */
  authDisabled?: boolean;
}

export function createMockBackend(db: MockDb = createSeed(), now: () => Date = () => new Date(), opts: MockBackendOptions = {}) {
  const sessions = new Map<string, string>();
  let seq = 0;

  function audit(actor: AdminUser, action: AuditEntry["action"], targetType: AuditEntry["targetType"], targetId: string, details: string) {
    db.audit.unshift({
      id: `aud_${Date.now().toString(36)}_${seq++}`,
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      targetType,
      targetId,
      details,
      createdAt: now().toISOString(),
    });
  }

  function currentUser(token: string | null): AdminUser {
    const id = token ? sessions.get(token) : undefined;
    const user = id ? db.users.find((u) => u.id === id) : undefined;
    if (!user) throw new HttpError(401, "unauthorized", "Your session has expired. Please sign in again.");
    if (user.status === "suspended") throw new HttpError(403, "forbidden", "This account has been suspended.");
    return user;
  }

  function requireAdmin(token: string | null): AdminUser {
    if (!token && opts.authDisabled) {
      const admins = db.users.filter((u) => u.role === "admin" && u.status === "active");
      const operator = admins.find((u) => u.email === MOCK_ADMIN_EMAIL) ?? admins[0];
      if (operator) return operator;
    }
    const user = currentUser(token);
    if (user.role !== "admin") throw new HttpError(403, "forbidden", "Admin access required.");
    return user;
  }

  const findUser = (id: string) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new HttpError(404, "not_found", "User not found");
    return u;
  };
  const findListing = (id: string) => {
    const l = db.listings.find((x) => x.id === id);
    if (!l) throw new HttpError(404, "not_found", "Listing not found");
    return l;
  };
  const recountReports = () => {
    for (const l of db.listings) l.openReports = db.reports.filter((r) => r.listingId === l.id && r.status === "open").length;
  };

  // OTP documents are short-lived and never seeded; the container exists so the list mirrors Cosmos.
  const otps: Doc[] = [];
  const dataCollections: Record<string, () => Doc[]> = {
    users: () => db.users as unknown as Doc[],
    listings: () => db.listings as unknown as Doc[],
    otps: () => otps,
    inquiries: () => db.inquiries as unknown as Doc[],
    reports: () => db.reports as unknown as Doc[],
    audit: () => db.audit as unknown as Doc[],
  };
  const dataContainer = (name: string): DataContainer => {
    const c = DATA_CONTAINERS.find((x) => x.name === name);
    if (!c) throw new HttpError(404, "not_found", `Unknown container "${name}"`);
    return c;
  };
  const newestFirst = (docs: Doc[]) => [...docs].sort((a, b) => Number(withSystemProps(b)._ts) - Number(withSystemProps(a)._ts));

  function dataRoute(method: string, path: string, q: Record<string, string>, body: unknown, actor: AdminUser): MockResponse | null {
    if (method === "GET" && path === ADMIN_ROUTES.dataContainers) return { status: 200, body: { items: DATA_CONTAINERS } };
    let m: string[] | undefined;
    if ((m = dataMatch.items(path)) && method === "GET") {
      const c = dataContainer(m[0]!);
      const f = parse(DataBrowseQuerySchema, q);
      const filter = f.field && f.value !== undefined ? { field: f.field, op: f.op, value: f.value } : null;
      const docs = dataCollections[c.name]!().filter((d) => !filter || matchesBrowseFilter(d, filter));
      return { status: 200, body: dataPage(newestFirst(docs), f.pageSize, f.continuation) };
    }
    if ((m = dataMatch.query(path)) && method === "POST") {
      const c = dataContainer(m[0]!);
      const b = parse(DataQueryInputSchema, body);
      const problem = validateReadOnlyQuery(b.query);
      if (problem) throw new HttpError(400, "bad_request", problem);
      const select = parseSimpleSelect(b.query);
      if (!select) throw new HttpError(400, "bad_request", "Demo mode supports SELECT * FROM c [WHERE c.field = 'value' [AND …]] only.");
      const docs = dataCollections[c.name]!().filter((d) => matchesSimpleSelect(d, select));
      return { status: 200, body: dataPage(docs, b.pageSize, b.continuation) };
    }
    if ((m = dataMatch.item(path))) {
      const c = dataContainer(m[0]!);
      const id = m[1]!;
      const { pk } = parse(DataItemKeySchema, q);
      const docs = dataCollections[c.name]!();
      const index = docs.findIndex((d) => d.id === id && String(readPath(d, c.partitionKeyPath)) === pk);
      if (index < 0) throw new HttpError(404, "not_found", "Document not found");
      const current = docs[index]!;
      if (method === "GET") return { status: 200, body: withSystemProps(current) };
      if (method !== "PUT" && method !== "DELETE") return null;
      if (!c.writable) throw new HttpError(400, "bad_request", `The ${c.name} container is read-only in the Data Explorer`);
      const target = `${c.name}/${id}`;
      if (method === "DELETE") {
        docs.splice(index, 1);
        audit(actor, "data.delete", "document", target, `Deleted ${target} (partition key "${pk}") via Data Explorer`);
        return { status: 204 };
      }
      if (!isPlainObject(body)) throw new HttpError(400, "bad_request", "The document must be a JSON object");
      if (body.id !== id) throw new HttpError(400, "bad_request", `The document id can't be changed (expected "${id}")`);
      if (readPath(body, c.partitionKeyPath) !== pk) {
        throw new HttpError(400, "bad_request", `The partition key (${c.partitionKeyPath}) can't be changed (expected "${pk}")`);
      }
      if (typeof body._etag === "string" && body._etag !== withSystemProps(current)._etag) {
        throw new HttpError(409, "conflict", "This document was changed by someone else. Reload it and try again.");
      }
      const next = stripSystemProps(body);
      const changed = [...new Set([...Object.keys(stripSystemProps(current)), ...Object.keys(next)])]
        .filter((k) => JSON.stringify(current[k]) !== JSON.stringify(next[k]))
        .sort();
      docs[index] = structuredClone(next);
      audit(actor, "data.update", "document", target, `Edited ${target} via Data Explorer: ${changed.length ? `changed ${changed.join(", ")}` : "no field changes"}`);
      return { status: 200, body: withSystemProps(next) };
    }
    return null;
  }

  function stats(): AdminStats {    const t = now().getTime();
    const since7 = new Date(t - 7 * DAY).toISOString();
    const days = Array.from({ length: 14 }, (_, i) => toIsoDate(new Date(t - (13 - i) * DAY)));
    const bucket = (iso: string) => iso.slice(0, 10);
    const timeline = days.map((date) => ({
      date,
      signups: db.users.filter((u) => bucket(u.createdAt) === date).length,
      listings: db.listings.filter((l) => bucket(l.createdAt) === date).length,
      inquiries: db.inquiries.filter((q) => bucket(q.createdAt) === date).length,
    }));
    const areas = new Map<string, { listings: number; rent: number }>();
    for (const l of db.listings.filter((x) => x.status !== "removed")) {
      const a = areas.get(l.area) ?? { listings: 0, rent: 0 };
      areas.set(l.area, { listings: a.listings + 1, rent: a.rent + l.rent });
    }
    const companies = new Map<string, number>();
    for (const u of db.users.filter((x) => x.role === "user")) companies.set(u.company, (companies.get(u.company) ?? 0) + 1);
    return {
      users: {
        total: db.users.length,
        active: db.users.filter((u) => u.status === "active").length,
        suspended: db.users.filter((u) => u.status === "suspended").length,
        newLast7d: db.users.filter((u) => u.createdAt >= since7).length,
      },
      listings: {
        total: db.listings.length,
        active: db.listings.filter((l) => l.status === "active").length,
        paused: db.listings.filter((l) => l.status === "paused").length,
        removed: db.listings.filter((l) => l.status === "removed").length,
        newLast7d: db.listings.filter((l) => l.createdAt >= since7).length,
      },
      inquiries: { total: db.inquiries.length, last7d: db.inquiries.filter((q) => q.createdAt >= since7).length },
      reports: { open: db.reports.filter((r) => r.status === "open").length },
      byArea: [...areas].map(([area, v]) => ({ area, listings: v.listings, avgRent: Math.round(v.rent / v.listings) })).sort((a, b) => b.listings - a.listings),
      byCompany: [...companies].map(([company, users]) => ({ company, users })).sort((a, b) => b.users - a.users),
      timeline,
    };
  }

  function route(req: MockRequest): MockResponse {
    const { method, path, body, token } = req;
    const q = Object.fromEntries(req.query);
    let id: string | undefined;

    if (method === "POST" && path === ROUTES.otpRequest) {
      try {
        parse(OtpRequestSchema, body);
      } catch (e) {
        if (e instanceof HttpError && e.fields?.email?.includes("work email")) throw new HttpError(400, "personal_email", e.fields.email, e.fields);
        throw e;
      }
      return { status: 200, body: { expiresInSec: 600, resendInSec: 30, devCode: MOCK_OTP } };
    }
    if (method === "POST" && path === ROUTES.otpVerify) {
      const { email, code } = parse(OtpVerifySchema, body);
      if (code !== MOCK_OTP) throw new HttpError(400, "otp_invalid", "That code isn't right. Check your email and try again.");
      let user = db.users.find((u) => u.email === email);
      const isNewUser = !user;
      if (!user) {
        const ts = now().toISOString();
        user = {
          id: `usr_${Date.now().toString(36)}`,
          email,
          fullName: email.split("@")[0] ?? email,
          company: "Other",
          designation: "",
          phone: "",
          avatarUrl: null,
          verified: true,
          profileComplete: false,
          role: "user",
          notifications: { newListings: true, messages: true, priceDrops: false },
          privacy: { showPhone: true },
          createdAt: ts,
          updatedAt: ts,
          status: "active",
          suspendedReason: null,
          listingCount: 0,
          lastLoginAt: null,
        };
        db.users.unshift(user);
      }
      if (user.status === "suspended") throw new HttpError(403, "forbidden", "This account has been suspended.");
      user.lastLoginAt = now().toISOString();
      const t = `mock.${crypto.randomUUID()}`;
      sessions.set(t, user.id);
      return {
        status: 200,
        body: { token: t, expiresAt: new Date(now().getTime() + 12 * 3600_000).toISOString(), isNewUser, user: toUser(user) },
      };
    }
    if (method === "GET" && path === ROUTES.me) return { status: 200, body: toUser(currentUser(token)) };

    if (!path.startsWith("admin/")) throw new HttpError(404, "not_found", `No route for ${method} /${path}`);
    const actor = requireAdmin(token);

    if (method === "GET" && path === ADMIN_ROUTES.stats) return { status: 200, body: stats() };

    if (method === "GET" && path === ADMIN_ROUTES.users) {
      const f = parse(AdminUserQuerySchema, q);
      const rows = db.users.filter(
        (u) => contains([u.email, u.fullName, u.company, u.id], f.q) && (!f.status || u.status === f.status) && (!f.role || u.role === f.role),
      );
      return { status: 200, body: paginate(rows, f.limit, f.cursor) };
    }
    if ((id = match.userStatus(path)) && method === "PATCH") {
      const b = parse(SetUserStatusSchema, body);
      const u = findUser(id);
      if (u.id === actor.id) throw new HttpError(400, "bad_request", "You can't change your own account status.");
      if (b.status === "suspended" && !b.reason) throw new HttpError(400, "validation_failed", "Give a reason", { reason: "Give a reason" });
      u.status = b.status;
      u.suspendedReason = b.status === "suspended" ? (b.reason ?? null) : null;
      u.updatedAt = now().toISOString();
      for (const [t, uid] of sessions) if (uid === u.id && b.status === "suspended") sessions.delete(t);
      audit(actor, b.status === "suspended" ? "user.suspend" : "user.reinstate", "user", u.id,
        b.status === "suspended" ? `Suspended ${u.email}: ${b.reason}` : `Reinstated ${u.email}${b.reason ? `: ${b.reason}` : ""}`);
      return { status: 200, body: structuredClone(u) };
    }
    if ((id = match.userRole(path)) && method === "PATCH") {
      const { role } = parse(SetUserRoleSchema, body);
      const u = findUser(id);
      if (u.id === actor.id) throw new HttpError(400, "bad_request", "You can't change your own role.");
      u.role = role;
      u.updatedAt = now().toISOString();
      audit(actor, "user.role", "user", u.id, `${role === "admin" ? "Promoted" : "Demoted"} ${u.email} to ${role}`);
      return { status: 200, body: structuredClone(u) };
    }
    if ((id = match.user(path))) {
      const u = findUser(id);
      if (method === "GET") return { status: 200, body: structuredClone(u) };
      if (method === "DELETE") {
        if (u.id === actor.id) throw new HttpError(400, "bad_request", "You can't delete your own account.");
        const owned = new Set(db.listings.filter((l) => l.owner.id === u.id).map((l) => l.id));
        db.users = db.users.filter((x) => x.id !== u.id);
        db.listings = db.listings.filter((l) => !owned.has(l.id));
        db.reports = db.reports.filter((r) => !owned.has(r.listingId));
        db.inquiries = db.inquiries.filter((i) => !owned.has(i.listingId));
        for (const [t, uid] of sessions) if (uid === u.id) sessions.delete(t);
        audit(actor, "user.delete", "user", u.id, `Deleted ${u.email} and ${owned.size} listing(s)`);
        return { status: 204 };
      }
    }

    if (method === "GET" && path === ADMIN_ROUTES.listings) {
      const f = parse(AdminListingQuerySchema, q);
      const rows = db.listings.filter(
        (l) =>
          contains([l.locality, l.area, l.id, l.contact.name, l.contact.email, l.owner.company], f.q) &&
          (!f.status || l.status === f.status) &&
          (!f.area || l.area === f.area) &&
          (!f.ownerId || l.owner.id === f.ownerId) &&
          (f.reported === undefined || (l.openReports > 0) === f.reported),
      );
      return { status: 200, body: paginate(rows, f.limit, f.cursor) };
    }
    if ((id = match.listingModeration(path)) && method === "PATCH") {
      const b = parse(ModerateListingSchema, body);
      const l = findListing(id);
      if (b.status === "removed" && !b.reason) throw new HttpError(400, "validation_failed", "Give a reason", { reason: "A reason is required to remove a listing" });
      const from = l.status;
      l.status = b.status;
      l.moderationReason = b.status === "removed" ? (b.reason ?? null) : null;
      l.updatedAt = now().toISOString();
      audit(actor, "listing.status", "listing", l.id, `Status ${from} → ${b.status}${b.reason ? `: ${b.reason}` : ""}`);
      return { status: 200, body: structuredClone(l) };
    }
    if ((id = match.listing(path)) && method === "GET") return { status: 200, body: structuredClone(findListing(id)) };

    if (method === "GET" && path === ADMIN_ROUTES.reports) {
      const f = parse(AdminReportQuerySchema, q);
      const rows = db.reports.filter(
        (r) => contains([r.listingId, r.reporterEmail, r.details, r.listingArea, r.reason], f.q) && (!f.status || r.status === f.status),
      );
      return { status: 200, body: paginate(rows, f.limit, f.cursor) };
    }
    if ((id = match.report(path)) && method === "PATCH") {
      const b = parse(ResolveReportSchema, body);
      const r = db.reports.find((x) => x.id === id);
      if (!r) throw new HttpError(404, "not_found", "Report not found");
      if (r.status !== "open") throw new HttpError(409, "conflict", "This report has already been handled.");
      r.status = b.status;
      r.resolution = b.resolution;
      r.resolvedBy = actor.id;
      r.resolvedAt = now().toISOString();
      if (b.removeListing) {
        const l = db.listings.find((x) => x.id === r.listingId);
        if (l && l.status !== "removed") {
          const from = l.status;
          l.status = "removed";
          l.moderationReason = b.resolution;
          l.updatedAt = r.resolvedAt;
          audit(actor, "listing.status", "listing", l.id, `Status ${from} → removed: ${b.resolution}`);
        }
      }
      recountReports();
      audit(actor, b.status === "resolved" ? "report.resolve" : "report.dismiss", "report", r.id,
        `${b.status === "resolved" ? "Resolved" : "Dismissed"} ${r.reason} report: ${b.resolution}`);
      return { status: 200, body: structuredClone(r) };
    }

    if (method === "GET" && path === ADMIN_ROUTES.audit) {
      const f = parse(AdminAuditQuerySchema, q);
      const rows = db.audit.filter((a) => contains([a.actorEmail, a.details, a.targetId, a.action], f.q) && (!f.targetId || a.targetId === f.targetId));
      return { status: 200, body: paginate(rows, f.limit, f.cursor) };
    }

    const data = dataRoute(method, path, q, body, actor);
    if (data) return data;

    throw new HttpError(404, "not_found", `No route for ${method} /${path}`);
  }

  return {
    db,
    handle(req: MockRequest): MockResponse {
      try {
        return route(req);
      } catch (e) {
        if (e instanceof HttpError) {
          return { status: e.status, body: { error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } } };
        }
        return { status: 500, body: { error: { code: "internal", message: e instanceof Error ? e.message : "Mock server error" } } };
      }
    },
  };
}

export type MockBackend = ReturnType<typeof createMockBackend>;
