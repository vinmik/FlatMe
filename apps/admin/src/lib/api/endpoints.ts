import {
  ADMIN_ROUTES,
  AdminAuditQuerySchema,
  AdminListingPageSchema,
  AdminListingQuerySchema,
  AdminListingSchema,
  AdminReportQuerySchema,
  AdminStatsSchema,
  AdminUserPageSchema,
  AdminUserQuerySchema,
  AdminUserSchema,
  AuditPageSchema,
  DataBrowseQuerySchema,
  DataContainerListSchema,
  DataDocumentSchema,
  DataPageSchema,
  DataQueryInputSchema,
  ModerateListingSchema,
  OtpRequestResponseSchema,
  OtpRequestSchema,
  OtpVerifyResponseSchema,
  OtpVerifySchema,
  ReportPageSchema,
  ReportSchema,
  ResolveReportSchema,
  ROUTES,
  SetUserRoleSchema,
  SetUserStatusSchema,
  UserSchema,
  type AdminListingQuery,
  type AdminReportQuery,
  type AdminUserQuery,
  type DataBrowseQuery,
  type DataDocument,
  type DataQueryInput,
  type ModerateListing,
  type ResolveReport,
  type Role,
  type SetUserStatus,
} from "@flatme/shared";
import type { z } from "zod";
import type { ApiClient } from "./client";

export type AdminAuditQuery = z.input<typeof AdminAuditQuerySchema>;

/**
 * One function per endpoint. Request bodies are validated with the shared zod schemas
 * before they leave the browser, and every response is parsed with its schema.
 */
export function createEndpoints(c: ApiClient) {
  return {
    auth: {
      requestOtp: (email: string) =>
        c.request(OtpRequestResponseSchema, ROUTES.otpRequest, {
          method: "POST",
          auth: false,
          body: OtpRequestSchema.parse({ email }),
        }),
      verifyOtp: (email: string, code: string) =>
        c.request(OtpVerifyResponseSchema, ROUTES.otpVerify, {
          method: "POST",
          auth: false,
          body: OtpVerifySchema.parse({ email, code }),
        }),
      me: () => c.request(UserSchema, ROUTES.me),
    },

    stats: () => c.request(AdminStatsSchema, ADMIN_ROUTES.stats),

    users: {
      list: (q: AdminUserQuery = {}) =>
        c.request(AdminUserPageSchema, ADMIN_ROUTES.users, { query: AdminUserQuerySchema.parse(q) }),
      get: (id: string) => c.request(AdminUserSchema, ADMIN_ROUTES.user(id)),
      setStatus: (id: string, body: SetUserStatus) =>
        c.request(AdminUserSchema, ADMIN_ROUTES.userStatus(id), {
          method: "PATCH",
          body: SetUserStatusSchema.parse(body),
        }),
      setRole: (id: string, role: Role) =>
        c.request(AdminUserSchema, ADMIN_ROUTES.userRole(id), {
          method: "PATCH",
          body: SetUserRoleSchema.parse({ role }),
        }),
      remove: (id: string) => c.requestVoid(ADMIN_ROUTES.user(id), { method: "DELETE" }),
    },

    listings: {
      list: (q: AdminListingQuery = {}) =>
        c.request(AdminListingPageSchema, ADMIN_ROUTES.listings, { query: AdminListingQuerySchema.parse(q) }),
      get: (id: string) => c.request(AdminListingSchema, ADMIN_ROUTES.listing(id)),
      moderate: (id: string, body: ModerateListing) =>
        c.request(AdminListingSchema, ADMIN_ROUTES.listingModeration(id), {
          method: "PATCH",
          body: ModerateListingSchema.parse(body),
        }),
    },

    reports: {
      list: (q: AdminReportQuery = {}) =>
        c.request(ReportPageSchema, ADMIN_ROUTES.reports, { query: AdminReportQuerySchema.parse(q) }),
      resolve: (id: string, body: ResolveReport) =>
        c.request(ReportSchema, ADMIN_ROUTES.report(id), {
          method: "PATCH",
          body: ResolveReportSchema.parse(body),
        }),
    },

    audit: {
      list: (q: AdminAuditQuery = {}) =>
        c.request(AuditPageSchema, ADMIN_ROUTES.audit, { query: AdminAuditQuerySchema.parse(q) }),
    },

    /** Raw container access (Data Explorer). Document ids are URL-encoded: Cosmos ids may contain `@`, spaces, etc. */
    data: {
      containers: () => c.request(DataContainerListSchema, ADMIN_ROUTES.dataContainers),
      browse: (container: string, q: DataBrowseQuery = {}) =>
        c.request(DataPageSchema, ADMIN_ROUTES.dataItems(container), { query: DataBrowseQuerySchema.parse(q) }),
      query: (container: string, body: DataQueryInput) =>
        c.request(DataPageSchema, ADMIN_ROUTES.dataQuery(container), { method: "POST", body: DataQueryInputSchema.parse(body) }),
      get: (container: string, id: string, pk: string) =>
        c.request(DataDocumentSchema, ADMIN_ROUTES.dataItem(container, encodeURIComponent(id)), { query: { pk } }),
      /** Full replace; the document's `_etag` makes the server reject the write if it changed meanwhile. */
      replace: (container: string, id: string, pk: string, doc: DataDocument) =>
        c.request(DataDocumentSchema, ADMIN_ROUTES.dataItem(container, encodeURIComponent(id)), { method: "PUT", query: { pk }, body: doc }),
      remove: (container: string, id: string, pk: string) =>
        c.requestVoid(ADMIN_ROUTES.dataItem(container, encodeURIComponent(id)), { method: "DELETE", query: { pk } }),
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
