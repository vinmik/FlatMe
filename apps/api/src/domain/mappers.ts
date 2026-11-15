import type { AdminListing, AdminUser, ListingDetail, ListingSummary, PublicListing, User } from "@flatme/shared";
import type { ListingEntity, UserEntity } from "./entities";

export function toUserDto(u: UserEntity): User {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    company: u.company,
    designation: u.designation,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    verified: u.verified,
    profileComplete: u.profileComplete,
    role: u.role,
    notifications: { ...u.notifications },
    privacy: { ...u.privacy },
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function roundKm(km: number | null): number | null {
  return km == null ? null : Math.round(km * 100) / 100;
}

export function toListingSummary(l: ListingEntity, distanceKm: number | null = null): ListingSummary {
  return {
    id: l.id,
    area: l.area,
    locality: l.locality,
    location: { lat: l.location.lat, lng: l.location.lng },
    rent: l.rent,
    roomType: l.roomType,
    furnishing: l.furnishing,
    genderPreference: l.genderPreference,
    availableFrom: l.availableFrom,
    flexible: l.flexible,
    flatmates: l.flatmates,
    coverPhoto: l.photos[0] ?? null,
    owner: { firstName: l.owner.firstName, company: l.owner.company, verified: l.owner.verified },
    distanceKm: roundKm(distanceKm),
    status: l.status,
    createdAt: l.createdAt,
  };
}

/** Rounds to 3 decimals (about 110 m) so anonymous visitors can't pinpoint a home. */
const blur = (n: number) => Math.round(n * 1000) / 1000;

/** Summary for anonymous visitors: same card data, approximate location. */
export function toPublicSummary(l: ListingEntity, distanceKm: number | null = null): ListingSummary {
  return { ...toListingSummary(l, distanceKm), location: { lat: blur(l.location.lat), lng: blur(l.location.lng) } };
}

/** Detail for anonymous visitors: no contact, no owner id, no stats. */
export function toPublicListing(l: ListingEntity): PublicListing {
  return {
    ...toPublicSummary(l),
    deposit: l.deposit,
    description: l.description,
    amenities: [...l.amenities],
    photos: [...l.photos],
    updatedAt: l.updatedAt,
  };
}

export interface DetailViewer {
  userId: string;
  isFavorite: boolean;
  distanceKm?: number | null;
}

export function toListingDetail(l: ListingEntity, viewer: DetailViewer): ListingDetail {
  const isOwner = viewer.userId === l.ownerId;
  return {
    ...toListingSummary(l, viewer.distanceKm ?? null),
    deposit: l.deposit,
    description: l.description,
    amenities: [...l.amenities],
    photos: [...l.photos],
    owner: { ...l.owner },
    contact: {
      name: l.contact.fullName,
      company: l.owner.company,
      email: l.contact.email,
      phone: (l.contact.showPhone || isOwner) && l.contact.phone ? l.contact.phone : null,
    },
    isOwner,
    isFavorite: viewer.isFavorite,
    stats: { views: l.stats.views, inquiries: l.stats.inquiries },
    moderationReason: isOwner ? l.moderationReason : null,
    updatedAt: l.updatedAt,
  };
}

export function toAdminUser(u: UserEntity, listingCount: number): AdminUser {
  return {
    ...toUserDto(u),
    role: u.role,
    status: u.status,
    suspendedReason: u.suspendedReason,
    listingCount,
    lastLoginAt: u.lastLoginAt,
  };
}

/** Admin view: full detail including private contact (phone regardless of privacy) and moderation state. */
export function toAdminListing(l: ListingEntity, openReports: number): AdminListing {
  const { isOwner: _o, isFavorite: _f, ...detail } = toListingDetail(l, { userId: l.ownerId, isFavorite: false });
  return { ...detail, moderationReason: l.moderationReason, openReports, seed: l.seed === true };
}