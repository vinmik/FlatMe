import { app, type HttpFunctionOptions } from "@azure/functions";

/**
 * Public URL prefix. host.json sets `routePrefix: ""` and every route is registered as `api/<route>`
 * because the Functions host rejects function routes beginning with its reserved `admin` segment
 * (ADMIN_ROUTES are `admin/...`). The externally visible URLs are unchanged: /api/<route>.
 */
export const API_PREFIX = "api";

export type RouteOptions = Omit<HttpFunctionOptions, "route" | "authLevel"> & { route: string };

/** Registers an anonymous-auth HTTP function under `/api/<route>` (auth is enforced in-app via JWT). */
export function registerHttp(name: string, options: RouteOptions): void {
  app.http(name, { ...options, authLevel: "anonymous", route: `${API_PREFIX}/${options.route}` });
}
