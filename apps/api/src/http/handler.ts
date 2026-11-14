import type { HttpHandler, HttpRequest, InvocationContext } from "@azure/functions";
import type { UserEntity } from "../domain/entities";
import { AccountSuspendedError, ForbiddenError, UnauthorizedError } from "../domain/errors";
import { getServices, type Services } from "../composition";
import { newUserEntity } from "../services/authService";
import type { Logger } from "../ports";
import { mapError } from "./errors";
import { toHttpResponse, type ApiResult } from "./responses";

export interface RequestContext {
  req: HttpRequest;
  invocation: InvocationContext;
  log: Logger;
  correlationId: string;
  services: Services;
}

export interface AuthedContext extends RequestContext {
  user: UserEntity;
  userId: string;
}

const CORRELATION_RE = /^[A-Za-z0-9._-]{1,64}$/;

function invocationLogger(ctx: InvocationContext): Logger {
  return {
    info: (m, ...a) => ctx.log(m, ...a),
    warn: (m, ...a) => ctx.warn(m, ...a),
    error: (m, ...a) => ctx.error(m, ...a),
  };
}

/** Wraps a handler with correlation ids, timing logs and uniform error mapping. */
export function withHandler(fn: (ctx: RequestContext) => Promise<ApiResult>): HttpHandler {
  return async (req, invocation) => {
    const incoming = req.headers.get("x-correlation-id");
    const correlationId = incoming && CORRELATION_RE.test(incoming) ? incoming : invocation.invocationId;
    const log = invocationLogger(invocation);
    const started = Date.now();
    let result: ApiResult;
    try {
      result = await fn({ req, invocation, log, correlationId, services: getServices() });
    } catch (err) {
      result = mapError(err, log, correlationId);
    }
    log.info(`[${correlationId}] ${req.method} ${new URL(req.url).pathname} → ${result.status} (${Date.now() - started}ms)`);
    return toHttpResponse(result, { correlationId });
  };
}

/**
 * Verifies `Authorization: Bearer <jwt>` and loads the user document on every request, so
 * deleted accounts get 401 and suspended accounts get 403 immediately (not at token expiry).
 */
export async function authenticate(ctx: RequestContext): Promise<UserEntity> {
  const header = ctx.req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]+)$/i.exec(header.trim());
  if (!match?.[1]) throw new UnauthorizedError();
  const claims = await ctx.services.tokens.verify(match[1]);
  const user = await ctx.services.repos.users.get(claims.userId);
  if (!user) throw new UnauthorizedError("Your account no longer exists. Please sign in again.");
  if (user.status === "suspended") throw new AccountSuspendedError();
  return user;
}

export function withAuth(fn: (ctx: AuthedContext) => Promise<ApiResult>): HttpHandler {
  return withHandler(async (ctx) => {
    const user = await authenticate(ctx);
    return fn({ ...ctx, user, userId: user.id });
  });
}

/** Synthetic actor used for admin routes (and audit entries) while ADMIN_AUTH_DISABLED=true. */
export const SYSTEM_ADMIN: UserEntity = Object.freeze({
  ...newUserEntity("admin@flatme.local", "1970-01-01T00:00:00.000Z", "system-admin"),
  fullName: "System Admin",
  company: "FlatMe",
  designation: "Administrator",
  profileComplete: true,
  role: "admin" as const,
});

/**
 * Admin guard: role is re-checked from the stored user document — the JWT role claim is not trusted.
 * When ADMIN_AUTH_DISABLED is on, authentication is skipped and requests act as SYSTEM_ADMIN.
 */
export function withAdmin(fn: (ctx: AuthedContext) => Promise<ApiResult>): HttpHandler {
  return withHandler(async (ctx) => {
    if (ctx.services.adminAuthDisabled) {
      return fn({ ...ctx, user: SYSTEM_ADMIN, userId: SYSTEM_ADMIN.id });
    }
    const user = await authenticate(ctx);
    if (user.role !== "admin") throw new ForbiddenError("Admin access required");
    return fn({ ...ctx, user, userId: user.id });
  });
}
