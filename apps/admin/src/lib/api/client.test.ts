import { AdminStatsSchema } from "@flatme/shared";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, createApiClient } from "./client";

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const Thing = z.object({ id: z.string(), n: z.number() });

function setup(res: Response | (() => Promise<Response>), token: string | null = "tok") {
  const fetch = vi.fn<typeof globalThis.fetch>(typeof res === "function" ? res : async () => res);
  const onAuthFailure = vi.fn();
  const client = createApiClient({ baseUrl: "https://api.test/api/", fetch, getToken: () => token, onAuthFailure });
  return { client, fetch, onAuthFailure };
}

describe("buildUrl", () => {
  it("joins base and path and skips empty query values", () => {
    expect(buildUrl("https://x/api/", "/admin/users", { q: "ravi kumar", status: undefined, role: "", limit: 20, reported: true })).toBe(
      "https://x/api/admin/users?q=ravi+kumar&limit=20&reported=true",
    );
    expect(buildUrl("https://x/api", "admin/stats")).toBe("https://x/api/admin/stats");
  });
});

describe("createApiClient", () => {
  it("sends bearer auth + JSON body and returns the parsed response", async () => {
    const { client, fetch } = setup(json(200, { id: "a", n: 1, extra: true }));
    const out = await client.request(Thing, "things", { method: "POST", body: { x: 1 } });
    expect(out).toEqual({ id: "a", n: 1 });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.test/api/things");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"x":1}');
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("omits the token for unauthenticated requests", async () => {
    const { client, fetch } = setup(json(200, { id: "a", n: 1 }));
    await client.request(Thing, "auth/otp/request", { auth: false });
    expect((fetch.mock.calls[0]![1]?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("rejects responses that don't match the schema", async () => {
    const { client } = setup(json(200, { users: "lots" }));
    await expect(client.request(AdminStatsSchema, "admin/stats")).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });

  it("maps ApiErrorSchema bodies onto ApiError", async () => {
    const { client, onAuthFailure } = setup(
      json(422, { error: { code: "validation_failed", message: "Check the form", fields: { reason: "Give a reason" } } }),
    );
    const err = await client.request(Thing, "x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: "validation_failed", message: "Check the form", fields: { reason: "Give a reason" } });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("carries retryAfterSec for rate limits", async () => {
    const { client } = setup(json(429, { error: { code: "rate_limited", message: "Slow down", retryAfterSec: 42 } }));
    await expect(client.request(Thing, "x")).rejects.toMatchObject({ code: "rate_limited", retryAfterSec: 42 });
  });

  it("falls back to a status-based code when the error body is not an ApiError", async () => {
    const { client } = setup(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(client.request(Thing, "x")).rejects.toMatchObject({ status: 502, code: "internal" });
    const { client: c2 } = setup(new Response("", { status: 404 }));
    await expect(c2.request(Thing, "x")).rejects.toMatchObject({ code: "not_found" });
  });

  it("reports network failures", async () => {
    const { client } = setup(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(client.request(Thing, "x")).rejects.toMatchObject({ status: 0, code: "network" });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
  ])("signs out on %i %s", async (status, code) => {
    const { client, onAuthFailure } = setup(json(status, { error: { code, message: "nope" } }));
    await expect(client.request(Thing, "x")).rejects.toBeInstanceOf(ApiError);
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });

  it("does not sign out for failures on unauthenticated calls (e.g. a wrong OTP)", async () => {
    const { client, onAuthFailure } = setup(json(401, { error: { code: "otp_invalid", message: "Wrong code" } }));
    await expect(client.request(Thing, "auth/otp/verify", { auth: false })).rejects.toMatchObject({ code: "otp_invalid" });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("requestVoid accepts 204 No Content", async () => {
    const { client } = setup(new Response(null, { status: 204 }));
    await expect(client.requestVoid("admin/users/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
