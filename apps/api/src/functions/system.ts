import { ROUTES, SearchQuerySchema } from "@flatme/shared";
import { withHandler } from "../http/handler";
import { registerHttp } from "../http/register";
import { parseQuery, routeParam } from "../http/request";
import { ok } from "../http/responses";

export const health = withHandler(async ({ services }) => ok({ status: "ok", version: services.version }));

export const publicHighlights = withHandler(async ({ services }) => ok(await services.public.highlights()));

export const publicListings = withHandler(async ({ req, services }) =>
  ok(await services.public.search(parseQuery(req, SearchQuerySchema))),
);

export const publicListing = withHandler(async ({ req, services }) => ok(await services.public.listing(routeParam(req, "id"))));

registerHttp("health", { route: ROUTES.health, methods: ["GET"], handler: health });
registerHttp("publicHighlights", {
  route: ROUTES.publicHighlights,
  methods: ["GET"],
  handler: publicHighlights,
});
registerHttp("publicListings", { route: ROUTES.publicListings, methods: ["GET"], handler: publicListings });
registerHttp("publicListing", { route: ROUTES.publicListing("{id}"), methods: ["GET"], handler: publicListing });
