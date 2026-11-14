import { config, MOCK_BASE_URL } from "../config";
import { createMockBackend, type MockBackend } from "./backend";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Builds a `fetch`-compatible adapter over an in-memory backend. */
export function createMockFetch(backend: MockBackend, latency: () => number = () => 220 + Math.random() * 380) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const prefix = new URL(MOCK_BASE_URL).pathname.replace(/\/+$/, "") + "/";
    const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname.replace(/^\/+/, "");
    const headers = new Headers(init?.headers);
    const auth = headers.get("Authorization");
    const rawBody = typeof init?.body === "string" ? init.body : null;

    const delay = latency();
    if (delay > 0) await sleep(delay);
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const res = backend.handle({
      method: (init?.method ?? "GET").toUpperCase(),
      path: decodeURIComponent(path),
      query: url.searchParams,
      body: rawBody ? (JSON.parse(rawBody) as unknown) : undefined,
      token: auth?.startsWith("Bearer ") ? auth.slice(7) : null,
    });
    if (res.status === 204 || res.body === undefined) return new Response(null, { status: res.status });
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { "Content-Type": "application/json" } });
  };
}

let shared: ReturnType<typeof createMockFetch> | null = null;

/** Lazily-created singleton used by the app in mock mode (adds realistic latency). */
export function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  shared ??= createMockFetch(createMockBackend(undefined, undefined, { authDisabled: config.authDisabled }));
  return shared(input, init);
}