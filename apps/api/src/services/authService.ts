import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { companyFromEmail, LIMITS, type OtpRequestResponse, type OtpVerifyResponse } from "@flatme/shared";
import type { OtpEntity, UserEntity } from "../domain/entities";
import { AccountSuspendedError, OtpExpiredError, OtpInvalidError, RateLimitedError } from "../domain/errors";
import { toUserDto } from "../domain/mappers";
import { otpEmail } from "../adapters/email/templates";
import type { Clock, EmailSender, Logger, OtpRepository, TokenService, UserRepository } from "../ports";

const HOUR_MS = 60 * 60 * 1000;
/** OTP docs live long enough to enforce the hourly request cap; code validity is enforced via expiresAt. */
const OTP_DOC_TTL_SEC = Math.max(LIMITS.otpTtlSeconds, 3600);

export interface AuthOptions {
  devMode: boolean;
  pepper: string;
  demo: { email: string; code: string } | null;
  adminEmails: ReadonlySet<string>;
}

export function newUserEntity(email: string, nowIso: string, id: string = randomUUID()): UserEntity {
  return {
    id,
    type: "user",
    email,
    fullName: "",
    company: companyFromEmail(email) ?? "",
    designation: "",
    phone: "",
    avatarUrl: null,
    verified: true,
    profileComplete: false,
    role: "user",
    status: "active",
    suspendedReason: null,
    lastLoginAt: null,
    notifications: { newListings: true, messages: true, priceDrops: false },
    privacy: { showPhone: true },
    favorites: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly email: EmailSender,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
    private readonly logger: Logger,
    private readonly options: AuthOptions,
  ) {}

  /** `email` must already be normalized and validated (corporate, or an allowlisted admin). */
  async requestOtp(email: string): Promise<OtpRequestResponse> {
    const base = { expiresInSec: LIMITS.otpTtlSeconds, resendInSec: LIMITS.otpResendSeconds };
    if (this.isDemo(email)) return base;

    const now = this.clock.now();
    const nowMs = now.getTime();
    const existing = await this.otps.get(email);

    if (existing) {
      const cooldownEnds = Date.parse(existing.lastSentAt) + LIMITS.otpResendSeconds * 1000;
      if (cooldownEnds > nowMs) {
        throw new RateLimitedError("Please wait before requesting another code", secondsUntil(cooldownEnds, nowMs));
      }
    }

    const windowActive = existing !== null && Date.parse(existing.windowStart) + HOUR_MS > nowMs;
    const requestsInWindow = windowActive ? existing.requestsInWindow : 0;
    if (windowActive && requestsInWindow >= LIMITS.otpMaxRequestsPerHour) {
      throw new RateLimitedError(
        "Too many codes requested. Please try again later.",
        secondsUntil(Date.parse(existing.windowStart) + HOUR_MS, nowMs),
      );
    }

    const code = randomInt(0, 10 ** LIMITS.otpLength).toString().padStart(LIMITS.otpLength, "0");
    const doc: OtpEntity = {
      id: email,
      email,
      codeHash: this.hash(email, code),
      attempts: 0,
      expiresAt: new Date(nowMs + LIMITS.otpTtlSeconds * 1000).toISOString(),
      lastSentAt: now.toISOString(),
      windowStart: windowActive ? existing.windowStart : now.toISOString(),
      requestsInWindow: requestsInWindow + 1,
      ttl: OTP_DOC_TTL_SEC,
    };
    await this.otps.upsert(doc);

    if (this.options.devMode) {
      this.logger.warn(`[OTP_DEV_MODE] code for ${email}: ${code}`);
      return { ...base, devCode: code };
    }
    await this.email.send(otpEmail(email, code, Math.round(LIMITS.otpTtlSeconds / 60)));
    return base;
  }

  async verifyOtp(email: string, code: string): Promise<OtpVerifyResponse> {
    if (this.isDemo(email)) {
      if (!safeEqual(code, this.options.demo!.code)) throw new OtpInvalidError("That code isn't right.");
      return this.signIn(email);
    }

    const now = this.clock.now();
    const doc = await this.otps.get(email);
    if (!doc?.codeHash || Date.parse(doc.expiresAt) <= now.getTime() || doc.attempts >= LIMITS.otpMaxAttempts) {
      throw new OtpExpiredError();
    }

    if (!safeEqual(this.hash(email, code), doc.codeHash)) {
      const attempts = doc.attempts + 1;
      const remaining = LIMITS.otpMaxAttempts - attempts;
      await this.otps.upsert({ ...doc, attempts, codeHash: remaining > 0 ? doc.codeHash : null });
      if (remaining <= 0) throw new OtpExpiredError("Too many incorrect attempts. Please request a new code.");
      throw new OtpInvalidError(`That code isn't right. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
    }

    // Single use: burn the code but keep the rate-limit window.
    await this.otps.upsert({ ...doc, codeHash: null });
    return this.signIn(email);
  }

  private async signIn(email: string): Promise<OtpVerifyResponse> {
    const nowIso = this.clock.now().toISOString();
    const user = (await this.users.findByEmail(email)) ?? newUserEntity(email, nowIso);
    if (user.status === "suspended") throw new AccountSuspendedError();

    if (this.options.adminEmails.has(email)) user.role = "admin";
    user.verified = true;
    user.lastLoginAt = nowIso;
    user.updatedAt = nowIso;
    await this.users.upsert(user);

    const { token, expiresAt } = await this.tokens.issue({ userId: user.id, email: user.email, role: user.role });
    const suggestedCompany = companyFromEmail(email);
    return {
      token,
      expiresAt,
      isNewUser: !user.profileComplete,
      user: toUserDto(user),
      ...(suggestedCompany ? { suggestedCompany } : {}),
    };
  }

  /** Allowlisted admins may sign in with any mailbox (incl. personal ones); `email` must be normalized. */
  isAllowlistedAdmin(email: string): boolean {
    return this.options.adminEmails.has(email);
  }

  private isDemo(email: string): boolean {
    return this.options.demo !== null && email === this.options.demo.email;
  }

  private hash(email: string, code: string): string {
    return createHmac("sha256", this.options.pepper).update(`${email}:${code}`).digest("hex");
  }
}

function secondsUntil(targetMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((targetMs - nowMs) / 1000));
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
