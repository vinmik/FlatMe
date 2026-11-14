import type { HttpResponseInit } from "@azure/functions";
import type { ApiErrorBody } from "@flatme/shared";

export interface ResponseMeta {
  correlationId: string;
}

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/** Handler result: the wrapper adds security/correlation headers. */
export interface ApiResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export const ok = (body: unknown, status = 200): ApiResult => ({ status, body });
export const created = (body: unknown): ApiResult => ({ status: 201, body });
export const noContent = (): ApiResult => ({ status: 204 });

export function toHttpResponse(result: ApiResult, meta: ResponseMeta): HttpResponseInit {
  const headers: Record<string, string> = { ...BASE_HEADERS, "x-correlation-id": meta.correlationId, ...result.headers };
  if (result.body === undefined) {
    delete headers["Content-Type"];
    return { status: result.status, headers };
  }
  return { status: result.status, headers, body: JSON.stringify(result.body) };
}

export function errorResult(body: ApiErrorBody, status: number): ApiResult {
  const retry = body.error.retryAfterSec;
  return { status, body, headers: retry !== undefined ? { "Retry-After": String(retry) } : undefined };
}
