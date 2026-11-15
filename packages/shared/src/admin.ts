import { z } from "zod";
import { ListingDetailSchema, ListingStatusSchema, PageSchema, UserSchema } from "./schemas";

/* ───────────────────────────── Roles & account status ───────────────────────────── */

export const RoleSchema = z.enum(["user", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const AccountStatusSchema = z.enum(["active", "suspended"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

/* ───────────────────────────── Reports (trust & safety) ───────────────────────────── */

export const REPORT_REASONS = ["scam", "misleading", "already-taken", "inappropriate", "duplicate", "other"] as const;
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  scam: "Looks like a scam",
  misleading: "Misleading photos or details",
  "already-taken": "Already rented out",
  inappropriate: "Inappropriate content",
  duplicate: "Duplicate listing",
  other: "Something else",
};
export const ReportReasonSchema = z.enum(REPORT_REASONS);
export const ReportStatusSchema = z.enum(["open", "resolved", "dismissed"]);

/** Submitted from the mobile app: POST listings/{id}/reports. */
export const ReportInputSchema = z.object({
  reason: ReportReasonSchema,
  details: z.string().trim().max(1000).default(""),
});
export type ReportInput = z.input<typeof ReportInputSchema>;

export const ReportSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingArea: z.string(),
  listingOwnerId: z.string(),
  reporterId: z.string(),
  reporterEmail: z.string(),
  reason: ReportReasonSchema,
  details: z.string(),
  status: ReportStatusSchema,
  resolution: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type Report = z.infer<typeof ReportSchema>;

/* ───────────────────────────── Admin views ───────────────────────────── */

export const AdminUserSchema = UserSchema.extend({
  role: RoleSchema,
  status: AccountStatusSchema,
  suspendedReason: z.string().nullable(),
  listingCount: z.number(),
  lastLoginAt: z.string().nullable(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

/** Admin listing status is the full lifecycle, including the "removed" moderation takedown. */
export const AdminListingStatusSchema = ListingStatusSchema;
export type AdminListingStatus = z.infer<typeof AdminListingStatusSchema>;

export const AdminListingSchema = ListingDetailSchema.omit({ isOwner: true, isFavorite: true }).extend({
  openReports: z.number(),
  seed: z.boolean(),
});
export type AdminListing = z.infer<typeof AdminListingSchema>;

export const AdminStatsSchema = z.object({
  users: z.object({ total: z.number(), active: z.number(), suspended: z.number(), newLast7d: z.number() }),
  listings: z.object({ total: z.number(), active: z.number(), paused: z.number(), removed: z.number(), newLast7d: z.number() }),
  inquiries: z.object({ total: z.number(), last7d: z.number() }),
  reports: z.object({ open: z.number() }),
  byArea: z.array(z.object({ area: z.string(), listings: z.number(), avgRent: z.number() })),
  byCompany: z.array(z.object({ company: z.string(), users: z.number() })),
  /** Daily counts for the last 14 days, oldest first. */
  timeline: z.array(z.object({ date: z.string(), signups: z.number(), listings: z.number(), inquiries: z.number() })),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const AuditEntrySchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  action: z.enum([
    "user.suspend",
    "user.reinstate",
    "user.delete",
    "user.role",
    "listing.status",
    "listing.delete",
    "report.resolve",
    "report.dismiss",
    "data.update",
    "data.delete",
  ]),
  /** "document" targets are Data Explorer writes; targetId is `<container>/<id>`. */
  targetType: z.enum(["user", "listing", "report", "document"]),
  targetId: z.string(),
  details: z.string(),
  createdAt: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/* ───────────────────────────── Admin queries & commands ───────────────────────────── */

const pageQuery = {
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
};

export const AdminUserQuerySchema = z.object({
  ...pageQuery,
  status: AccountStatusSchema.optional(),
  role: RoleSchema.optional(),
});
export type AdminUserQuery = z.input<typeof AdminUserQuerySchema>;

export const AdminListingQuerySchema = z.object({
  ...pageQuery,
  status: AdminListingStatusSchema.optional(),
  area: z.string().optional(),
  ownerId: z.string().optional(),
  // Query strings carry "true"/"false"; z.coerce.boolean() would treat "false" as true.
  reported: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
});
export type AdminListingQuery = z.input<typeof AdminListingQuerySchema>;

export const AdminReportQuerySchema = z.object({ ...pageQuery, status: ReportStatusSchema.optional() });
export type AdminReportQuery = z.input<typeof AdminReportQuerySchema>;

export const AdminAuditQuerySchema = z.object({ ...pageQuery, targetId: z.string().optional() });

export const SetUserStatusSchema = z.object({
  status: AccountStatusSchema,
  reason: z.string().trim().min(3, "Give a reason").max(500).optional(),
});
export type SetUserStatus = z.input<typeof SetUserStatusSchema>;

export const SetUserRoleSchema = z.object({ role: RoleSchema });

export const ModerateListingSchema = z.object({
  status: AdminListingStatusSchema,
  reason: z.string().trim().max(500).optional(),
});
export type ModerateListing = z.input<typeof ModerateListingSchema>;

export const ResolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolution: z.string().trim().min(3).max(500),
  /** Optionally take the listing down in the same action. */
  removeListing: z.boolean().default(false),
});
export type ResolveReport = z.input<typeof ResolveReportSchema>;

export const AdminUserPageSchema = PageSchema(AdminUserSchema);
export const AdminListingPageSchema = PageSchema(AdminListingSchema);
export const ReportPageSchema = PageSchema(ReportSchema);
export const AuditPageSchema = PageSchema(AuditEntrySchema);

/* ───────────────────────────── Data Explorer ───────────────────────────── */

export const DATA_PAGE_SIZE_DEFAULT = 25;
export const DATA_PAGE_SIZE_MAX = 100;
export const DATA_QUERY_MAX_LENGTH = 4000;
/** Dotted top-level/nested property path, e.g. `status` or `contact.email` (never interpolated raw). */
export const DATA_FIELD_PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

export const DataContainerSchema = z.object({
  name: z.string(),
  /** Cosmos partition key path, e.g. "/id" or "/listingId". */
  partitionKeyPath: z.string(),
  /** False for containers the explorer must never modify (the audit log). */
  writable: z.boolean(),
});
export type DataContainer = z.infer<typeof DataContainerSchema>;
export const DataContainerListSchema = z.object({ items: z.array(DataContainerSchema) });

/** A raw stored document, including Cosmos system properties (`_etag`, `_ts`, …) when present. */
export const DataDocumentSchema = z.looseObject({ id: z.string() });
export type DataDocument = z.infer<typeof DataDocumentSchema>;

const dataPage = {
  pageSize: z.coerce.number().int().min(1).max(DATA_PAGE_SIZE_MAX).default(DATA_PAGE_SIZE_DEFAULT),
  continuation: z.string().max(16_384).optional(),
};

export const DataBrowseQuerySchema = z
  .object({
    field: z.string().trim().max(200).regex(DATA_FIELD_PATH_RE, "Use a field path like status or contact.email").optional(),
    op: z.enum(["eq", "contains"]).default("eq"),
    value: z.string().max(500).optional(),
    ...dataPage,
  })
  .refine((v) => v.value === undefined || v.field !== undefined, { message: "Pick a field to filter on", path: ["field"] });
export type DataBrowseQuery = z.input<typeof DataBrowseQuerySchema>;

export const DataQueryInputSchema = z.object({
  query: z.string().trim().min(1, "Enter a query").max(DATA_QUERY_MAX_LENGTH),
  ...dataPage,
});
export type DataQueryInput = z.input<typeof DataQueryInputSchema>;

/** Query results may be projections or scalars, so items are not assumed to be documents. */
export const DataPageSchema = z.object({
  items: z.array(z.unknown()),
  continuation: z.string().nullable(),
  /** Request units consumed (0 for the in-memory store). */
  requestCharge: z.number(),
  count: z.number(),
});
export type DataPage = z.infer<typeof DataPageSchema>;

/** `?pk=` — the document's partition key value (single-path string keys). */
export const DataItemKeySchema = z.object({ pk: z.string().min(1, "Partition key is required").max(1024) });

export const ADMIN_ROUTES = {
  stats: "admin/stats",
  users: "admin/users",
  user: (id: string) => `admin/users/${id}`,
  userStatus: (id: string) => `admin/users/${id}/status`,
  userRole: (id: string) => `admin/users/${id}/role`,
  listings: "admin/listings",
  listing: (id: string) => `admin/listings/${id}`,
  listingModeration: (id: string) => `admin/listings/${id}/moderation`,
  reports: "admin/reports",
  report: (id: string) => `admin/reports/${id}`,
  audit: "admin/audit",
  dataContainers: "admin/data/containers",
  dataItems: (container: string) => `admin/data/${container}/items`,
  dataQuery: (container: string) => `admin/data/${container}/query`,
  dataItem: (container: string, id: string) => `admin/data/${container}/items/${id}`,
} as const;

/** User-facing route for filing a report (mobile app). */
export const reportRoute = (listingId: string) => `listings/${listingId}/reports`;
