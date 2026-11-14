import { DefaultAzureCredential } from "@azure/identity";
import { LocalUploadUrlSigner, LOCAL_STORAGE_URL } from "./adapters/blob/localUploadUrlSigner";
import { UserDelegationSasSigner } from "./adapters/blob/userDelegationSasSigner";
import { createCosmosRepositories } from "./adapters/cosmos";
import { AcsEmailSender } from "./adapters/email/acsEmailSender";
import { ConsoleEmailSender } from "./adapters/email/consoleEmailSender";
import { createMemoryRepositories } from "./adapters/memory";
import { systemClock } from "./adapters/system/clock";
import { JoseTokenService } from "./adapters/system/joseTokenService";
import { loadConfig, type AppConfig } from "./config";
import type {
  AuditRepository,
  BlobUploadUrlSigner,
  Clock,
  EmailSender,
  InquiryRepository,
  ListingRepository,
  Logger,
  OtpRepository,
  ReportRepository,
  TokenService,
  UserRepository,
} from "./ports";
import { buildSeed } from "./seed/seedData";
import { AdminService } from "./services/adminService";
import { AuditService } from "./services/auditService";
import { AuthService, type AuthOptions } from "./services/authService";
import { FavoriteService } from "./services/favoriteService";
import { InquiryService } from "./services/inquiryService";
import { ListingService } from "./services/listingService";
import { MediaService } from "./services/mediaService";
import { PhotoUrlPolicy } from "./services/photoUrlPolicy";
import { PublicService } from "./services/publicService";
import { ReportService } from "./services/reportService";
import { UserService } from "./services/userService";

declare const __APP_VERSION__: string | undefined;
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

export interface Repositories {
  users: UserRepository;
  listings: ListingRepository;
  otps: OtpRepository;
  inquiries: InquiryRepository;
  reports: ReportRepository;
  audit: AuditRepository;
}

export interface Dependencies {
  repos: Repositories;
  email: EmailSender;
  signer: BlobUploadUrlSigner;
  tokens: TokenService;
  clock: Clock;
  logger: Logger;
  auth: AuthOptions;
  /** DANGER: admin routes run unauthenticated as SYSTEM_ADMIN. */
  adminAuthDisabled?: boolean;
}

export interface Services {
  version: string;
  adminAuthDisabled: boolean;
  repos: Repositories;
  tokens: TokenService;
  auth: AuthService;
  users: UserService;
  listings: ListingService;
  favorites: FavoriteService;
  inquiries: InquiryService;
  reports: ReportService;
  media: MediaService;
  public: PublicService;
  admin: AdminService;
}

/** Pure wiring — used by the runtime composition below and directly by tests. */
export function buildServices(d: Dependencies): Services {
  const { repos, clock, logger } = d;
  const photos = new PhotoUrlPolicy(d.signer.containerUrl);
  const listings = new ListingService(repos.listings, repos.inquiries, repos.reports, photos, clock, logger);
  const users = new UserService(repos.users, repos.otps, listings, photos, clock);
  const audit = new AuditService(repos.audit, clock);
  return {
    version: APP_VERSION,
    adminAuthDisabled: d.adminAuthDisabled ?? false,
    repos,
    tokens: d.tokens,
    auth: new AuthService(repos.users, repos.otps, d.email, d.tokens, clock, logger, d.auth),
    users,
    listings,
    favorites: new FavoriteService(repos.users, repos.listings, clock),
    inquiries: new InquiryService(repos.inquiries, repos.listings, repos.users, d.email, clock, logger),
    reports: new ReportService(repos.reports, repos.listings, clock),
    media: new MediaService(d.signer, clock),
    public: new PublicService(repos.users, repos.listings, clock),
    admin: new AdminService(
      repos.users,
      repos.listings,
      repos.inquiries,
      repos.reports,
      users,
      listings,
      audit,
      repos.audit,
      clock,
    ),
  };
}

const consoleLogger: Logger = {
  info: (m, ...a) => console.info(m, ...a),
  warn: (m, ...a) => console.warn(m, ...a),
  error: (m, ...a) => console.error(m, ...a),
};

/** Chooses adapters from configuration: Azure services when configured, local fallbacks otherwise. */
export function servicesFromConfig(config: AppConfig, logger: Logger = consoleLogger): Services {
  const clock = systemClock;
  const needsCredential = Boolean(config.cosmos || config.storage.accountUrl || config.email.kind === "acs-identity");
  const credential = needsCredential ? new DefaultAzureCredential() : null;

  let repos: Repositories;
  if (config.cosmos && credential) {
    repos = createCosmosRepositories(config.cosmos.endpoint, config.cosmos.database, credential);
  } else {
    const seed = config.seedMemory ? buildSeed(clock.now()) : undefined;
    repos = createMemoryRepositories(seed);
    logger.warn(
      `COSMOS_ENDPOINT not set — using in-memory repositories${seed ? ` seeded with ${seed.listings.length} listings` : ""}. Data is lost on restart.`,
    );
  }

  const email: EmailSender =
    config.email.kind === "acs-connection-string"
      ? new AcsEmailSender({ connectionString: config.email.connectionString }, config.email.sender, logger)
      : config.email.kind === "acs-identity" && credential
        ? new AcsEmailSender({ endpoint: config.email.endpoint, credential }, config.email.sender, logger)
        : new ConsoleEmailSender(logger);

  const signer: BlobUploadUrlSigner =
    config.storage.accountUrl && credential
      ? new UserDelegationSasSigner(config.storage.accountUrl, config.storage.photosContainer, credential, clock)
      : new LocalUploadUrlSigner(LOCAL_STORAGE_URL, config.storage.photosContainer);

  if (config.adminAuthDisabled) {
    logger.warn(
      'SECURITY WARNING: ADMIN_AUTH_DISABLED=true — all /api/admin/* endpoints are publicly readable and writable. Disable before real users.',
    );
  }

  return buildServices({
    repos,
    adminAuthDisabled: config.adminAuthDisabled,
    email,
    signer,
    tokens: new JoseTokenService(config.jwt.secret, config.jwt.ttlDays, clock),
    clock,
    logger,
    auth: { devMode: config.otp.devMode, pepper: config.otp.pepper, demo: config.demo, adminEmails: config.adminEmails },
  });
}

let instance: Services | null = null;

/** Process-wide singleton, created lazily on first request. */
export function getServices(): Services {
  instance ??= servicesFromConfig(loadConfig());
  return instance;
}

/** Test hook: inject a pre-built service graph (or reset with null). */
export function setServices(services: Services | null): void {
  instance = services;
}
