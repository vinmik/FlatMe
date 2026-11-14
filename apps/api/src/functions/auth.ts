import type { HttpRequest } from "@azure/functions";
import { isCorporateEmail, isValidEmail, OtpRequestSchema, OtpVerifySchema, ROUTES } from "@flatme/shared";
import { z } from "zod";
import { PersonalEmailError } from "../domain/errors";
import { withHandler } from "../http/handler";
import { readJson, validate } from "../http/request";
import { registerHttp } from "../http/register";
import { ok } from "../http/responses";
import type { Services } from "../composition";

/** Same shape as the shared schemas but accepting any valid mailbox — used only for allowlisted admins. */
const AnyEmailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
const AdminOtpRequestSchema = OtpRequestSchema.extend({ email: AnyEmailSchema });
const AdminOtpVerifySchema = OtpVerifySchema.extend({ email: AnyEmailSchema });

/**
 * Reads the auth body and reports whether it belongs to an allowlisted admin. For everyone else,
 * CorporateEmailSchema's generic refine failure is surfaced as the dedicated `personal_email` code.
 */
async function readAuthBody(req: HttpRequest, services: Services): Promise<{ body: unknown; admin: boolean }> {
  const body = await readJson(req);
  const raw = (body as { email?: unknown } | null)?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : null;
  const admin = email !== null && services.auth.isAllowlistedAdmin(email);
  if (!admin && email && isValidEmail(email) && !isCorporateEmail(email)) throw new PersonalEmailError();
  return { body, admin };
}

export const otpRequest = withHandler(async ({ req, services }) => {
  const { body, admin } = await readAuthBody(req, services);
  const { email } = validate(admin ? AdminOtpRequestSchema : OtpRequestSchema, body);
  return ok(await services.auth.requestOtp(email));
});

export const otpVerify = withHandler(async ({ req, services }) => {
  const { body, admin } = await readAuthBody(req, services);
  const { email, code } = validate(admin ? AdminOtpVerifySchema : OtpVerifySchema, body);
  return ok(await services.auth.verifyOtp(email, code));
});

registerHttp("otpRequest", { route: ROUTES.otpRequest, methods: ["POST"], handler: otpRequest });
registerHttp("otpVerify", { route: ROUTES.otpVerify, methods: ["POST"], handler: otpVerify });
