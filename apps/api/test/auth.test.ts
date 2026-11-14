import { LIMITS } from "@flatme/shared";
import { describe, expect, it } from "vitest";
import { OtpExpiredError, OtpInvalidError, RateLimitedError } from "../src/domain/errors";
import { createHarness } from "./harness";

describe("AuthService OTP", () => {
  it("issues a code by email, verifies it and creates a new user", async () => {
    const h = createHarness({ devMode: false });
    const req = await h.services.auth.requestOtp("asha.k@microsoft.com");
    expect(req.devCode).toBeUndefined();
    expect(h.email.sent).toHaveLength(1);
    expect(h.email.sent[0]!.to).toBe("asha.k@microsoft.com");
    const code = /\b(\d{6})\b/.exec(h.email.sent[0]!.text)![1]!;
    expect(h.email.sent[0]!.html).toContain(code);

    const res = await h.services.auth.verifyOtp("asha.k@microsoft.com", code);
    expect(res.isNewUser).toBe(true);
    expect(res.user).toMatchObject({ email: "asha.k@microsoft.com", verified: true, profileComplete: false, role: "user" });
    expect(res.suggestedCompany).toBe("Microsoft");
    const claims = await h.services.tokens.verify(res.token);
    expect(claims.userId).toBe(res.user.id);

    // Codes are single-use.
    await expect(h.services.auth.verifyOtp("asha.k@microsoft.com", code)).rejects.toBeInstanceOf(OtpExpiredError);

    // A second sign-in reuses the same account.
    h.clock.advance(LIMITS.otpResendSeconds * 1000);
    const again = await h.services.auth.requestOtp("asha.k@microsoft.com");
    const code2 = /\b(\d{6})\b/.exec(h.email.sent[1]!.text)![1]!;
    expect(again.devCode).toBeUndefined();
    const res2 = await h.services.auth.verifyOtp("asha.k@microsoft.com", code2);
    expect(res2.user.id).toBe(res.user.id);
  });

  it("invalidates the code after too many wrong attempts", async () => {
    const h = createHarness();
    const { devCode } = await h.services.auth.requestOtp("ravi@tcs.com");
    const wrong = devCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < LIMITS.otpMaxAttempts - 1; i++) {
      await expect(h.services.auth.verifyOtp("ravi@tcs.com", wrong)).rejects.toBeInstanceOf(OtpInvalidError);
    }
    await expect(h.services.auth.verifyOtp("ravi@tcs.com", wrong)).rejects.toBeInstanceOf(OtpExpiredError);
    await expect(h.services.auth.verifyOtp("ravi@tcs.com", devCode!)).rejects.toBeInstanceOf(OtpExpiredError);
  });

  it("rejects expired codes", async () => {
    const h = createHarness();
    const { devCode } = await h.services.auth.requestOtp("ravi@tcs.com");
    h.clock.advance(LIMITS.otpTtlSeconds * 1000 + 1);
    await expect(h.services.auth.verifyOtp("ravi@tcs.com", devCode!)).rejects.toBeInstanceOf(OtpExpiredError);
  });

  it("enforces the resend cooldown with retryAfterSec", async () => {
    const h = createHarness();
    await h.services.auth.requestOtp("ravi@tcs.com");
    h.clock.advance(10_000);
    const err = await h.services.auth.requestOtp("ravi@tcs.com").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect((err as RateLimitedError).status).toBe(429);
    expect((err as RateLimitedError).retryAfterSec).toBe(LIMITS.otpResendSeconds - 10);
    h.clock.advance(LIMITS.otpResendSeconds * 1000);
    await expect(h.services.auth.requestOtp("ravi@tcs.com")).resolves.toBeDefined();
  });

  it("caps OTP requests per hour", async () => {
    const h = createHarness();
    for (let i = 0; i < LIMITS.otpMaxRequestsPerHour; i++) {
      await h.services.auth.requestOtp("ravi@tcs.com");
      h.clock.advance(LIMITS.otpResendSeconds * 1000);
    }
    await expect(h.services.auth.requestOtp("ravi@tcs.com")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("accepts the fixed demo code without sending email", async () => {
    const h = createHarness({ demo: { email: "review@flatme.app", code: "246810" } });
    const req = await h.services.auth.requestOtp("review@flatme.app");
    expect(req.devCode).toBeUndefined();
    expect(h.email.sent).toHaveLength(0);
    await expect(h.services.auth.verifyOtp("review@flatme.app", "111111")).rejects.toBeInstanceOf(OtpInvalidError);
    const res = await h.services.auth.verifyOtp("review@flatme.app", "246810");
    expect(res.user.email).toBe("review@flatme.app");
  });

  it("grants admin role from the allowlist and puts it in the token", async () => {
    const h = createHarness({ adminEmails: ["boss@flatme.app"] });
    const { devCode } = await h.services.auth.requestOtp("boss@flatme.app");
    const res = await h.services.auth.verifyOtp("boss@flatme.app", devCode!);
    expect(res.user.role).toBe("admin");
    expect((await h.services.tokens.verify(res.token)).role).toBe("admin");
  });
});
