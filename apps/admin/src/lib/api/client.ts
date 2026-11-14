import { ApiErrorSchema, type ErrorCode } from "@flatme/shared";
import { ZodError, type z } from "zod";

export type ClientErrorCode = ErrorCode | "network" | "invalid_response";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly fields?: Record<string, string>;
  readonly retryAfterSec?: number;

  constructor(init: {
    status: number;
    code: ClientErrorCode;
    message: string;
    fields?: Record<string, string>;
    retryAfterSec?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    if (init.fields) this.fields = init.fields;
    if (init.retryAfterSec !== undefined) this.retryAfterSec = init.retryAfterSec;
  }

  /** True when the session is no longer usable and the operator must sign in again. */
  get isAuthFailure(): boolean {
    return (
      this.status === 401 ||
      (this.status === 403 && this.code === "forbidden")
    );
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function errorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Invalid input";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  getToken?: () => string | null;
  /** Called for 401s and 403 forbidden/suspended responses on authenticated requests. */
  onAuthFailure?: (error: ApiError) => void;
}

const FALLBACK_CODES: Record<number, ErrorCode> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_failed",
  429: "rate_limited",
};

export function buildUrl(baseUrl: string, path: string, query?: Query): string {
  const url = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  async function send(path: string, o: RequestOptions): Promise<Response> {
    const auth = o.auth ?? true;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (o.body !== undefined) headers["Content-Type"] = "application/json";
    const token = auth ? opts.getToken?.() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await doFetch(buildUrl(opts.baseUrl, path, o.query), {
        method: o.method ?? "GET",
        headers,
        body: o.body === undefined ? null : JSON.stringify(o.body),
        signal: o.signal ?? null,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError({ status: 0, code: "network", message: "Can't reach the FlatMe API. Check your connection." });
    }

    if (!res.ok) {
      const body = ApiErrorSchema.safeParse(await readJson(res));
      const error = body.success
        ? new ApiError({ status: res.status, ...body.data.error })
        : new ApiError({
            status: res.status,
            code: FALLBACK_CODES[res.status] ?? "internal",
            message: res.status >= 500 ? "The server ran into a problem. Please try again." : `Request failed (${res.status})`,
          });
      if (auth && error.isAuthFailure) opts.onAuthFailure?.(error);
      throw error;
    }
    return res;
  }

  /** Performs a request and validates the JSON response against `schema`. */
  async function request<S extends z.ZodType>(schema: S, path: string, o: RequestOptions = {}): Promise<z.output<S>> {
    const res = await send(path, o);
    const json = await readJson(res);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError({
        status: res.status,
        code: "invalid_response",
        message: `Unexpected response from ${path}: ${parsed.error.issues[0]?.message ?? "invalid shape"}`,
      });
    }
    return parsed.data;
  }

  /** Performs a request whose response body is ignored (e.g. 204 No Content). */
  async function requestVoid(path: string, o: RequestOptions = {}): Promise<void> {
    await send(path, o);
  }

  return { request, requestVoid };
}

export type ApiClient = ReturnType<typeof createApiClient>;
