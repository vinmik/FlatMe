import { randomUUID } from "node:crypto";
import {
  availabilityToDate,
  haversineKm,
  LIMITS,
  type Feed,
  type GeoPoint,
  type ListingDetail,
  type ListingFilters,
  type ListingInputParsed,
  type ListingPage,
  type ListingSummary,
  type SearchQuerySchema,
} from "@flatme/shared";
import type { z } from "zod";
import { contactOf, ownerSnapshotOf, toGeoJson, type ListingEntity, type UserEntity } from "../domain/entities";
import { ConflictError, ForbiddenError, NotFoundError } from "../domain/errors";
import { toListingDetail, toListingSummary } from "../domain/mappers";
import type { Clock, InquiryRepository, ListingRepository, ListingSort, Logger, ReportRepository } from "../ports";
import { decodeCursor, nextCursor } from "./cursor";
import type { PhotoUrlPolicy } from "./photoUrlPolicy";

export type SearchParams = z.output<typeof SearchQuerySchema>;

const RAIL_SIZE = 10;
const BUDGET_RAIL_MAX_RENT = 10_000;

export function filtersOf(p: SearchParams): ListingFilters {
  return {
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    gender: p.gender,
    furnishing: p.furnishing,
    moveIn: p.moveIn,
    areas: p.areas,
  };
}

export function nearOf(p: { lat?: number; lng?: number }): GeoPoint | undefined {
  return p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : undefined;
}

export function listingTitle(l: Pick<ListingEntity, "roomType" | "locality" | "area">): string {
  return `${l.roomType} in ${l.locality}, ${l.area}`;
}

export class ListingService {
  constructor(
    private readonly listings: ListingRepository,
    private readonly inquiries: InquiryRepository,
    private readonly reports: ReportRepository,
    private readonly photos: PhotoUrlPolicy,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async search(p: SearchParams): Promise<ListingPage> {
    const offset = decodeCursor(p.cursor);
    const { hits, total } = await this.listings.search({
      filters: filtersOf(p),
      near: nearOf(p),
      sort: p.sort,
      offset,
      limit: p.limit,
      now: this.clock.now(),
    });
    return {
      items: hits.map((h) => toListingSummary(h.listing, h.distanceKm)),
      total,
      nextCursor: nextCursor(offset, hits.length, total),
    };
  }

  async feed(p: SearchParams): Promise<Feed> {
    const base = filtersOf(p);
    const near = nearOf(p);
    const rails: Array<{ key: Feed["rails"][number]["key"]; title: string; filters: ListingFilters | null; sort: ListingSort }> = [
      { key: "closest", title: "Closest to you", filters: near ? base : null, sort: "distance" },
      {
        key: "budget",
        title: "Budget friendly",
        filters:
          base.budgetMin <= BUDGET_RAIL_MAX_RENT
            ? { ...base, budgetMax: Math.min(base.budgetMax, BUDGET_RAIL_MAX_RENT) }
            : null,
        sort: "rent-asc",
      },
      {
        key: "furnished",
        title: "Fully furnished",
        filters: base.furnishing === "any" || base.furnishing === "furnished" ? { ...base, furnishing: "furnished" } : null,
        sort: near ? "distance" : "newest",
      },
      // "immediate" is the strictest move-in cutoff, so it intersects any active move-in filter.
      { key: "immediate", title: "Available immediately", filters: { ...base, moveIn: "immediate" }, sort: "newest" },
      { key: "newest", title: "Just listed", filters: base, sort: "newest" },
    ];
    const now = this.clock.now();
    const results = await Promise.all(
      rails.map(async (r) => {
        if (!r.filters) return { key: r.key, title: r.title, items: [] as ListingSummary[] };
        const { hits } = await this.listings.search({ filters: r.filters, near, sort: r.sort, offset: 0, limit: RAIL_SIZE, now });
        return { key: r.key, title: r.title, items: hits.map((h) => toListingSummary(h.listing, h.distanceKm)) };
      }),
    );
    return { rails: results.filter((r) => r.items.length > 0) };
  }

  /** Non-active listings are only visible to their owner (admins use the admin API). */
  async getDetail(id: string, viewer: UserEntity, near?: GeoPoint): Promise<ListingDetail> {
    const listing = await this.listings.get(id);
    const isOwner = listing?.ownerId === viewer.id;
    if (!listing || (listing.status !== "active" && !isOwner)) throw new NotFoundError("This listing is no longer available");
    if (!isOwner) {
      try {
        await this.listings.incrementStat(id, "views");
        listing.stats.views += 1;
      } catch (err) {
        this.logger.warn(`views increment failed for ${id}: ${String(err)}`);
      }
    }
    return this.detail(listing, viewer, near);
  }

  async create(owner: UserEntity, input: ListingInputParsed): Promise<ListingDetail> {
    if (!owner.profileComplete) throw new ForbiddenError("Complete your profile before posting a room");
    const mine = await this.listings.listByOwner(owner.id);
    if (mine.filter((l) => l.status !== "removed").length >= LIMITS.listingsPerUser) {
      throw new ConflictError(`You can have at most ${LIMITS.listingsPerUser} listings. Delete or edit an existing one.`);
    }
    this.photos.assertAllowed(input.photos, "photos");
    const nowIso = this.clock.now().toISOString();
    const listing: ListingEntity = {
      id: randomUUID(),
      type: "listing",
      ownerId: owner.id,
      owner: ownerSnapshotOf(owner),
      contact: contactOf(owner),
      ...this.fieldsFrom(input),
      status: "active",
      moderationReason: null,
      stats: { views: 0, inquiries: 0 },
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await this.listings.upsert(listing);
    return this.detail(listing, owner);
  }

  async update(user: UserEntity, id: string, input: ListingInputParsed): Promise<ListingDetail> {
    const listing = await this.requireOwned(user, id);
    this.photos.assertAllowed(input.photos, "photos", listing.photos);
    const updated: ListingEntity = {
      ...listing,
      ...this.fieldsFrom(input),
      owner: ownerSnapshotOf(user),
      contact: contactOf(user),
      updatedAt: this.clock.now().toISOString(),
    };
    await this.listings.upsert(updated);
    return this.detail(updated, user);
  }

  async setStatus(user: UserEntity, id: string, status: "active" | "paused"): Promise<ListingDetail> {
    const listing = await this.requireOwned(user, id);
    if (listing.status === "removed") {
      throw new ConflictError("This listing was removed by moderation and can't be re-activated");
    }
    if (listing.status !== status) {
      listing.status = status;
      listing.updatedAt = this.clock.now().toISOString();
      await this.listings.upsert(listing);
    }
    return this.detail(listing, user);
  }

  async delete(user: UserEntity, id: string): Promise<void> {
    await this.requireOwned(user, id);
    await this.purge(id);
  }

  async myListings(user: UserEntity): Promise<ListingDetail[]> {
    const mine = await this.listings.listByOwner(user.id);
    return mine.map((l) => this.detail(l, user));
  }

  /** Removes a listing and everything hanging off it (inquiries, reports). */
  async purge(id: string): Promise<void> {
    await this.inquiries.deleteByListing(id);
    await this.reports.deleteByListing(id);
    await this.listings.delete(id);
  }

  async purgeAllOf(ownerId: string): Promise<number> {
    const mine = await this.listings.listByOwner(ownerId);
    for (const l of mine) await this.purge(l.id);
    return mine.length;
  }

  /** Best-effort refresh of the denormalized owner snapshot/contact after a profile change. */
  async syncOwner(user: UserEntity): Promise<void> {
    try {
      const mine = await this.listings.listByOwner(user.id);
      await Promise.all(
        mine.map((l) => this.listings.upsert({ ...l, owner: ownerSnapshotOf(user), contact: contactOf(user) })),
      );
    } catch (err) {
      this.logger.warn(`owner snapshot sync failed for ${user.id}: ${String(err)}`);
    }
  }

  private detail(l: ListingEntity, viewer: UserEntity, near?: GeoPoint): ListingDetail {
    return toListingDetail(l, {
      userId: viewer.id,
      isFavorite: viewer.favorites.includes(l.id),
      distanceKm: near ? haversineKm(near, l.location) : null,
    });
  }

  private async requireOwned(user: UserEntity, id: string): Promise<ListingEntity> {
    const listing = await this.listings.get(id);
    if (!listing) throw new NotFoundError("Listing not found");
    if (listing.ownerId !== user.id) throw new ForbiddenError("Only the owner can change this listing");
    return listing;
  }

  private fieldsFrom(input: ListingInputParsed) {
    const { availableFrom, flexible } = availabilityToDate(input.availability, this.clock.now());
    return {
      area: input.area,
      locality: input.locality,
      location: { lat: input.location.lat, lng: input.location.lng },
      geo: toGeoJson(input.location),
      rent: input.rent,
      deposit: input.deposit,
      roomType: input.roomType,
      furnishing: input.furnishing,
      genderPreference: input.genderPreference,
      availableFrom,
      flexible,
      flatmates: input.flatmates,
      amenities: [...new Set(input.amenities)],
      description: input.description,
      photos: input.photos,
    };
  }
}
