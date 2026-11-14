import {
  InquiryInputSchema,
  ListingInputSchema,
  reportRoute,
  ReportInputSchema,
  ROUTES,
  SearchQuerySchema,
  SetListingStatusSchema,
} from "@flatme/shared";
import { z } from "zod";
import { withAuth } from "../http/handler";
import { parseBody, parseQuery, routeParam } from "../http/request";
import { created, noContent, ok } from "../http/responses";
import { registerHttp } from "../http/register";
import { nearOf } from "../services/listingService";

const NearQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const feed = withAuth(async ({ req, services }) => ok(await services.listings.feed(parseQuery(req, SearchQuerySchema))));

export const searchListings = withAuth(async ({ req, services }) =>
  ok(await services.listings.search(parseQuery(req, SearchQuerySchema))),
);

export const createListing = withAuth(async ({ req, user, services }) =>
  created(await services.listings.create(user, await parseBody(req, ListingInputSchema))),
);

export const getListing = withAuth(async ({ req, user, services }) =>
  ok(await services.listings.getDetail(routeParam(req, "id"), user, nearOf(parseQuery(req, NearQuerySchema)))),
);

export const updateListing = withAuth(async ({ req, user, services }) =>
  ok(await services.listings.update(user, routeParam(req, "id"), await parseBody(req, ListingInputSchema))),
);

export const deleteListing = withAuth(async ({ req, user, services }) => {
  await services.listings.delete(user, routeParam(req, "id"));
  return noContent();
});

export const setListingStatus = withAuth(async ({ req, user, services }) => {
  const { status } = await parseBody(req, SetListingStatusSchema);
  return ok(await services.listings.setStatus(user, routeParam(req, "id"), status));
});

export const createInquiry = withAuth(async ({ req, user, services }) => {
  const { message } = await parseBody(req, InquiryInputSchema);
  return created(await services.inquiries.create(user, routeParam(req, "id"), message));
});

export const createReport = withAuth(async ({ req, user, services }) =>
  created(await services.reports.create(user, routeParam(req, "id"), await parseBody(req, ReportInputSchema))),
);

const byId = ROUTES.listing("{id}");
registerHttp("feed", { route: ROUTES.feed, methods: ["GET"], handler: feed });
registerHttp("searchListings", { route: ROUTES.listings, methods: ["GET"], handler: searchListings });
registerHttp("createListing", { route: ROUTES.listings, methods: ["POST"], handler: createListing });
registerHttp("getListing", { route: byId, methods: ["GET"], handler: getListing });
registerHttp("updateListing", { route: byId, methods: ["PUT"], handler: updateListing });
registerHttp("deleteListing", { route: byId, methods: ["DELETE"], handler: deleteListing });
registerHttp("setListingStatus", {
  route: ROUTES.listingStatus("{id}"),
  methods: ["PATCH"],
  handler: setListingStatus,
});
registerHttp("createInquiry", {
  route: ROUTES.listingInquiries("{id}"),
  methods: ["POST"],
  handler: createInquiry,
});
registerHttp("createReport", { route: reportRoute("{id}"), methods: ["POST"], handler: createReport });
