import { ROUTES } from "@flatme/shared";
import { withHandler } from "../http/handler";
import { registerHttp } from "../http/register";
import { ok } from "../http/responses";

export const health = withHandler(async ({ services }) => ok({ status: "ok", version: services.version }));

export const publicHighlights = withHandler(async ({ services }) => ok(await services.public.highlights()));

registerHttp("health", { route: ROUTES.health, methods: ["GET"], handler: health });
registerHttp("publicHighlights", {
  route: ROUTES.publicHighlights,
  methods: ["GET"],
  handler: publicHighlights,
});
