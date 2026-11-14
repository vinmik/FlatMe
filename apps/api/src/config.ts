import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v?.trim().toLowerCase() === "true");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const emailList = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );

const EnvSchema = z.object({
  COSMOS_ENDPOINT: optionalString,
  COSMOS_DATABASE: z.string().default("flatme"),
  STORAGE_ACCOUNT_URL: optionalString,
  PHOTOS_CONTAINER: z.string().default("listing-photos"),
  ACS_ENDPOINT: optionalString,
  ACS_CONNECTION_STRING: optionalString,
  EMAIL_SENDER: optionalString,
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_TTL_DAYS: z.coerce.number().positive().max(365).default(30),
  OTP_DEV_MODE: bool,
  OTP_PEPPER: optionalString,
  DEMO_EMAIL: optionalString.transform((v) => v?.toLowerCase()),
  DEMO_OTP: optionalString.pipe(z.string().regex(/^\d{6}$/, "DEMO_OTP must be 6 digits").optional()),
  ADMIN_EMAILS: emailList,
  /** DANGER: when true, ADMIN_ROUTES skip authentication entirely (see docs/ARCHITECTURE.md). */
  ADMIN_AUTH_DISABLED: bool,
  /** Local only: seed the in-memory store with demo data (default true). */
  SEED_MEMORY: z
    .string()
    .optional()
    .transform((v) => v?.trim().toLowerCase() !== "false"),
});

export type Env = z.output<typeof EnvSchema>;

export interface AppConfig {
  cosmos: { endpoint: string; database: string } | null;
  storage: { accountUrl: string | null; photosContainer: string };
  email:
    | { kind: "acs-identity"; endpoint: string; sender: string }
    | { kind: "acs-connection-string"; connectionString: string; sender: string }
    | { kind: "console" };
  jwt: { secret: string; ttlDays: number };
  otp: { devMode: boolean; pepper: string };
  demo: { email: string; code: string } | null;
  adminEmails: ReadonlySet<string>;
  adminAuthDisabled: boolean;
  seedMemory: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration — ${problems}`);
  }
  const e = parsed.data;
  const sender = e.EMAIL_SENDER;
  return {
    cosmos: e.COSMOS_ENDPOINT ? { endpoint: e.COSMOS_ENDPOINT, database: e.COSMOS_DATABASE } : null,
    storage: { accountUrl: e.STORAGE_ACCOUNT_URL ?? null, photosContainer: e.PHOTOS_CONTAINER },
    email:
      sender && e.ACS_CONNECTION_STRING
        ? { kind: "acs-connection-string", connectionString: e.ACS_CONNECTION_STRING, sender }
        : sender && e.ACS_ENDPOINT
          ? { kind: "acs-identity", endpoint: e.ACS_ENDPOINT, sender }
          : { kind: "console" },
    jwt: { secret: e.JWT_SECRET, ttlDays: e.JWT_TTL_DAYS },
    otp: { devMode: e.OTP_DEV_MODE, pepper: e.OTP_PEPPER ?? e.JWT_SECRET },
    demo: e.DEMO_EMAIL && e.DEMO_OTP ? { email: e.DEMO_EMAIL, code: e.DEMO_OTP } : null,
    adminEmails: new Set(e.ADMIN_EMAILS),
    adminAuthDisabled: e.ADMIN_AUTH_DISABLED,
    seedMemory: e.SEED_MEMORY,
  };
}
