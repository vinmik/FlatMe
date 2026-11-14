import { ROUTES, UploadUrlRequestSchema } from "@flatme/shared";
import { withAuth } from "../http/handler";
import { parseBody } from "../http/request";
import { registerHttp } from "../http/register";
import { ok } from "../http/responses";

export const uploadUrl = withAuth(async ({ req, user, services }) =>
  ok(await services.media.createUploadUrl(user.id, await parseBody(req, UploadUrlRequestSchema))),
);

registerHttp("uploadUrl", { route: ROUTES.uploadUrl, methods: ["POST"], handler: uploadUrl });
