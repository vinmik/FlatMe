import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { authStore } from "@/lib/auth/store";
import { MOCK_ADMIN_EMAIL, MOCK_OTP } from "@/lib/mock/seed";
import { renderApp, SLOW, stubLayoutApis } from "@/test/renderApp";

beforeAll(stubLayoutApis);

describe("admin portal (mock mode, auth enabled)", () => {
  it("redirects to login, signs in with OTP and visits every page", { timeout: 90_000 }, async () => {
    const user = userEvent.setup();
    const router = renderApp("/");

    const email = await screen.findByLabelText("Work email");
    await user.clear(email);
    await user.type(email, MOCK_ADMIN_EMAIL);
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText("Check your inbox", undefined, SLOW)).toBeInTheDocument();
    expect(await screen.findByText(MOCK_OTP, undefined, SLOW)).toBeInTheDocument();
    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.keyboard(MOCK_OTP);

    expect(await screen.findByRole("heading", { level: 1, name: /dashboard|good (morning|afternoon|evening)/i }, SLOW)).toBeInTheDocument();
    expect(authStore.getState().user?.email).toBe(MOCK_ADMIN_EMAIL);
    expect(screen.getAllByRole("button", { name: "Sign out" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Admin (auth disabled)")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");

    for (const [path, heading] of [
      ["/users", "Users"],
      ["/listings", "Listings"],
      ["/reports", "Reports"],
      ["/audit", "Audit log"],
    ] as const) {
      await router.navigate(path);
      const h1 = await screen.findByRole("heading", { level: 1, name: heading }, SLOW);
      expect(h1).toBeInTheDocument();
      // Data rendered (not just the skeleton): pagination summary appears once the page loads.
      expect(await screen.findByText(/of [\d,]+/i, undefined, SLOW)).toBeInTheDocument();
    }

    await router.navigate("/nope");
    expect(await screen.findByText(/not found|lost/i, undefined, SLOW)).toBeInTheDocument();
  });

  it("shows Not authorized for a non-admin and keeps no token", { timeout: 20_000 }, async () => {
    authStore.signOut("manual");
    const user = userEvent.setup();
    renderApp("/login");
    const email = await screen.findByLabelText("Work email");
    await user.clear(email);
    await user.type(email, "neha.sharma@infosys.com");
    await user.click(screen.getByRole("button", { name: /send code/i }));
    const hint = await screen.findByText(MOCK_OTP, undefined, SLOW);
    await user.click(within(hint.closest("div")!).getByRole("button", { name: /use it/i }));
    expect(await screen.findByText(/not authorized/i, undefined, SLOW)).toBeInTheDocument();
    expect(authStore.getToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
