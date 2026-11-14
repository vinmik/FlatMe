import { screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { authStore } from "@/lib/auth/store";
import { renderApp, SLOW, stubLayoutApis } from "@/test/renderApp";

vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return { ...actual, config: { ...actual.config, authDisabled: true } };
});

const fetchSpy = vi.hoisted(() => ({ calls: [] as { url: string; auth: string | null }[], failNext: null as null | RegExp }));

vi.mock("@/lib/mock/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mock/server")>();
  return {
    ...actual,
    mockFetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchSpy.calls.push({ url, auth: new Headers(init?.headers).get("Authorization") });
      if (fetchSpy.failNext?.test(url)) {
        fetchSpy.failNext = null;
        return new Response(JSON.stringify({ error: { code: "forbidden", message: "Admin access required." } }), { status: 403 });
      }
      return actual.mockFetch(input, init);
    },
  };
});

beforeAll(stubLayoutApis);

describe("admin portal with VITE_ADMIN_AUTH_DISABLED=true", () => {
  it("opens straight to the dashboard without a login or token", { timeout: 60_000 }, async () => {
    const router = renderApp("/");
    expect(await screen.findByRole("heading", { level: 1, name: /good (morning|afternoon|evening)/i }, SLOW)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByLabelText("Work email")).not.toBeInTheDocument();

    expect(screen.getAllByText("Admin (auth disabled)").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchSpy.calls.some((c) => c.url.includes("admin/stats"))).toBe(true));
    expect(fetchSpy.calls.every((c) => c.auth === null)).toBe(true);
    expect(authStore.getToken()).toBeNull();

    // /login is not reachable while auth is disabled.
    await router.navigate("/login");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("shows an error instead of signing out on 403", { timeout: 60_000 }, async () => {
    fetchSpy.failNext = /admin\/users/;
    const router = renderApp("/users");
    expect(await screen.findByText("Admin access required.", undefined, SLOW)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/users");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
