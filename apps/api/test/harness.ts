import { AREAS, type ListingInput, ListingInputSchema } from "@flatme/shared";
import { LocalUploadUrlSigner, LOCAL_STORAGE_URL } from "../src/adapters/blob/localUploadUrlSigner";
import { RecordingEmailSender } from "../src/adapters/email/consoleEmailSender";
import { createMemoryRepositories } from "../src/adapters/memory";
import { FixedClock } from "../src/adapters/system/clock";
import { JoseTokenService } from "../src/adapters/system/joseTokenService";
import { buildServices, type Services } from "../src/composition";
import type { UserEntity } from "../src/domain/entities";
import type { Logger } from "../src/ports";

export const START = new Date("2025-06-02T06:00:00.000Z");
export const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };

export interface Harness {
  services: Services;
  clock: FixedClock;
  email: RecordingEmailSender;
  signIn(email: string, opts?: { complete?: boolean }): Promise<{ user: UserEntity; token: string }>;
  reload(user: UserEntity): Promise<UserEntity>;
}

export function createHarness(opts: { adminEmails?: string[]; demo?: { email: string; code: string }; devMode?: boolean; adminAuthDisabled?: boolean } = {}): Harness {
  const clock = new FixedClock(START);
  const email = new RecordingEmailSender();
  const services = buildServices({
    repos: createMemoryRepositories(),
    email,
    signer: new LocalUploadUrlSigner(LOCAL_STORAGE_URL, "listing-photos"),
    tokens: new JoseTokenService("test-secret-test-secret-test-secret-0123", 30, clock),
    clock,
    logger: silentLogger,
    adminAuthDisabled: opts.adminAuthDisabled,
    auth: {
      devMode: opts.devMode ?? true,
      pepper: "pepper",
      demo: opts.demo ?? null,
      adminEmails: new Set(opts.adminEmails ?? []),
    },
  });

  const reload = async (u: UserEntity) => (await services.repos.users.get(u.id))!;

  return {
    services,
    clock,
    email,
    reload,
    async signIn(addr, { complete = true } = {}) {
      const { devCode } = await services.auth.requestOtp(addr);
      const res = await services.auth.verifyOtp(addr, devCode!);
      let user = (await services.repos.users.get(res.user.id))!;
      if (complete && !user.profileComplete) {
        await services.users.updateProfile(user, {
          fullName: `Test ${addr.split("@")[0]}`,
          company: "Microsoft",
          designation: "Engineer",
          phone: "9876543210",
          avatarUrl: null,
        });
        user = await reload(user);
      }
      clock.advance(61_000);
      return { user, token: res.token };
    },
  };
}

export function listingInput(overrides: Partial<ListingInput> = {}) {
  const area = AREAS[0]!;
  return ListingInputSchema.parse({
    area: area.name,
    locality: "Near Cyber Towers",
    location: { lat: area.lat, lng: area.lng },
    rent: 12000,
    deposit: 24000,
    roomType: "2BHK",
    furnishing: "furnished",
    availability: "immediate",
    genderPreference: "any",
    flatmates: 1,
    amenities: ["WiFi"],
    description: "Bright room in a quiet society",
    photos: [],
    ...overrides,
  });
}
