import {
  ADMIN_ROUTES,
  AdminAuditQuerySchema,
  AdminListingQuerySchema,
  AdminReportQuerySchema,
  AdminUserQuerySchema,
  ModerateListingSchema,
  ResolveReportSchema,
  SetUserRoleSchema,
  SetUserStatusSchema,
} from "@flatme/shared";
import { withAdmin } from "../http/handler";
import { parseBody, parseQuery, routeParam } from "../http/request";
import { registerHttp } from "../http/register";
import { noContent, ok } from "../http/responses";

export const adminStats = withAdmin(async ({ services }) => ok(await services.admin.stats()));

export const adminListUsers = withAdmin(async ({ req, services }) =>
  ok(await services.admin.listUsers(parseQuery(req, AdminUserQuerySchema))),
);

export const adminGetUser = withAdmin(async ({ req, services }) => ok(await services.admin.getUser(routeParam(req, "id"))));

export const adminDeleteUser = withAdmin(async ({ req, user, services }) => {
  await services.admin.deleteUser(user, routeParam(req, "id"));
  return noContent();
});

export const adminSetUserStatus = withAdmin(async ({ req, user, services }) =>
  ok(await services.admin.setUserStatus(user, routeParam(req, "id"), await parseBody(req, SetUserStatusSchema))),
);

export const adminSetUserRole = withAdmin(async ({ req, user, services }) => {
  const { role } = await parseBody(req, SetUserRoleSchema);
  return ok(await services.admin.setUserRole(user, routeParam(req, "id"), role));
});

export const adminListListings = withAdmin(async ({ req, services }) =>
  ok(await services.admin.listListings(parseQuery(req, AdminListingQuerySchema))),
);

export const adminGetListing = withAdmin(async ({ req, services }) =>
  ok(await services.admin.getListing(routeParam(req, "id"))),
);

export const adminDeleteListing = withAdmin(async ({ req, user, services }) => {
  await services.admin.deleteListing(user, routeParam(req, "id"));
  return noContent();
});

export const adminModerateListing = withAdmin(async ({ req, user, services }) =>
  ok(await services.admin.moderateListing(user, routeParam(req, "id"), await parseBody(req, ModerateListingSchema))),
);

export const adminListReports = withAdmin(async ({ req, services }) =>
  ok(await services.admin.listReports(parseQuery(req, AdminReportQuerySchema))),
);

export const adminResolveReport = withAdmin(async ({ req, user, services }) =>
  ok(await services.admin.resolveReport(user, routeParam(req, "id"), await parseBody(req, ResolveReportSchema))),
);

export const adminListAudit = withAdmin(async ({ req, services }) =>
  ok(await services.admin.listAudit(parseQuery(req, AdminAuditQuerySchema))),
);

const r = ADMIN_ROUTES;
registerHttp("adminStats", { route: r.stats, methods: ["GET"], handler: adminStats });
registerHttp("adminListUsers", { route: r.users, methods: ["GET"], handler: adminListUsers });
registerHttp("adminGetUser", { route: r.user("{id}"), methods: ["GET"], handler: adminGetUser });
registerHttp("adminDeleteUser", { route: r.user("{id}"), methods: ["DELETE"], handler: adminDeleteUser });
registerHttp("adminSetUserStatus", {
  route: r.userStatus("{id}"),
  methods: ["PATCH", "PUT"],
  handler: adminSetUserStatus,
});
registerHttp("adminSetUserRole", { route: r.userRole("{id}"), methods: ["PATCH", "PUT"], handler: adminSetUserRole });
registerHttp("adminListListings", { route: r.listings, methods: ["GET"], handler: adminListListings });
registerHttp("adminGetListing", { route: r.listing("{id}"), methods: ["GET"], handler: adminGetListing });
registerHttp("adminDeleteListing", {
  route: r.listing("{id}"),
  methods: ["DELETE"],
  handler: adminDeleteListing,
});
registerHttp("adminModerateListing", {
  route: r.listingModeration("{id}"),
  methods: ["PATCH", "PUT"],
  handler: adminModerateListing,
});
registerHttp("adminListReports", { route: r.reports, methods: ["GET"], handler: adminListReports });
registerHttp("adminResolveReport", {
  route: r.report("{id}"),
  methods: ["PATCH", "PUT"],
  handler: adminResolveReport,
});
registerHttp("adminListAudit", { route: r.audit, methods: ["GET"], handler: adminListAudit });
