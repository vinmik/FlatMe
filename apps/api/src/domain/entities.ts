import type {
  AccountStatus,
  AreaName,
  AuditEntry,
  GeoPoint,
  ListingDetail,
  ListingStatus,
  NotificationPrefs,
  OwnerSnapshot,
  Report,
  Role,
  User,
} from "@flatme/shared";

/**
 * Internal persisted shapes. These are what the repositories store; they are never
 * returned to clients directly — see ./mappers.ts for the DTO projections.
 */

export interface UserEntity {
  id: string;
  type: "user";
  email: string;
  fullName: string;
  company: string;
  designation: string;
  phone: string;
  avatarUrl: string | null;
  verified: boolean;
  profileComplete: boolean;
  role: Role;
  status: AccountStatus;
  suspendedReason: string | null;
  lastLoginAt: string | null;
  notifications: NotificationPrefs;
  privacy: User["privacy"];
  /** Favorited listing ids, oldest first. */
  favorites: string[];
  createdAt: string;
  updatedAt: string;
  seed?: boolean;
}

export interface GeoJsonPoint {
  type: "Point";
  /** GeoJSON order: [lng, lat]. */
  coordinates: [number, number];
}

/** Private contact details copied from the owner; only exposed on the detail view. */
export interface ListingContact {
  fullName: string;
  email: string;
  phone: string;
  showPhone: boolean;
}

export interface ListingEntity {
  id: string;
  type: "listing";
  ownerId: string;
  owner: OwnerSnapshot;
  contact: ListingContact;
  area: AreaName;
  locality: string;
  location: GeoPoint;
  geo: GeoJsonPoint;
  rent: number;
  deposit: number;
  roomType: ListingDetail["roomType"];
  furnishing: ListingDetail["furnishing"];
  genderPreference: ListingDetail["genderPreference"];
  availableFrom: string;
  flexible: boolean;
  flatmates: number;
  amenities: ListingDetail["amenities"];
  description: string;
  photos: string[];
  status: ListingStatus;
  /** Set when an admin took the listing down (status "removed"). */
  moderationReason: string | null;
  stats: { views: number; inquiries: number };
  createdAt: string;
  updatedAt: string;
  seed?: boolean;
}

/** One document per email (partition key /email). Only an HMAC of the code is stored. */
export interface OtpEntity {
  id: string;
  email: string;
  codeHash: string | null;
  attempts: number;
  expiresAt: string;
  lastSentAt: string;
  windowStart: string;
  requestsInWindow: number;
  /** Cosmos per-item TTL in seconds. */
  ttl: number;
}

export interface InquiryEntity {
  id: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  createdAt: string;
}

/** Reports are stored in the `reports` container (partition key /listingId) in their DTO shape. */
export type ReportEntity = Report;

/** Audit entries are stored in the `audit` container (partition key /id) in their DTO shape. */
export type AuditEntity = AuditEntry & { ttl?: number };

export function toGeoJson(p: GeoPoint): GeoJsonPoint {
  return { type: "Point", coordinates: [p.lng, p.lat] };
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function ownerSnapshotOf(user: UserEntity): OwnerSnapshot {
  return {
    id: user.id,
    firstName: firstName(user.fullName),
    company: user.company,
    designation: user.designation,
    verified: user.verified,
    avatarUrl: user.avatarUrl,
  };
}

export function contactOf(user: UserEntity): ListingContact {
  return { fullName: user.fullName, email: user.email, phone: user.phone, showPhone: user.privacy.showPhone };
}
