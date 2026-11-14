import type { UpdatePrefsSchema, UpdateProfileSchema, User } from "@flatme/shared";
import type { z } from "zod";
import type { UserEntity } from "../domain/entities";
import { toUserDto } from "../domain/mappers";
import type { Clock, OtpRepository, UserRepository } from "../ports";
import type { ListingService } from "./listingService";
import type { PhotoUrlPolicy } from "./photoUrlPolicy";

export type ProfileUpdate = z.output<typeof UpdateProfileSchema>;
export type PrefsUpdate = z.output<typeof UpdatePrefsSchema>;

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly listings: ListingService,
    private readonly photos: PhotoUrlPolicy,
    private readonly clock: Clock,
  ) {}

  get(user: UserEntity): User {
    return toUserDto(user);
  }

  async updateProfile(user: UserEntity, input: ProfileUpdate): Promise<User> {
    if (input.avatarUrl) {
      this.photos.assertAllowed([input.avatarUrl], "avatarUrl", user.avatarUrl ? [user.avatarUrl] : []);
    }
    const updated: UserEntity = {
      ...user,
      fullName: input.fullName,
      company: input.company,
      designation: input.designation,
      phone: input.phone,
      avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl,
      profileComplete: true,
      updatedAt: this.clock.now().toISOString(),
    };
    await this.users.upsert(updated);
    await this.listings.syncOwner(updated);
    return toUserDto(updated);
  }

  async updatePrefs(user: UserEntity, input: PrefsUpdate): Promise<User> {
    const updated: UserEntity = {
      ...user,
      notifications: { ...user.notifications, ...stripUndefined(input.notifications) },
      privacy: { ...user.privacy, ...stripUndefined(input.privacy) },
      updatedAt: this.clock.now().toISOString(),
    };
    await this.users.upsert(updated);
    if (updated.privacy.showPhone !== user.privacy.showPhone) await this.listings.syncOwner(updated);
    return toUserDto(updated);
  }

  /** Hard delete: listings (with their inquiries/reports), OTP state, then the user. */
  async deleteAccount(user: UserEntity): Promise<{ listingsDeleted: number }> {
    const listingsDeleted = await this.listings.purgeAllOf(user.id);
    await this.otps.delete(user.email);
    await this.users.delete(user.id);
    return { listingsDeleted };
  }
}

function stripUndefined<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
