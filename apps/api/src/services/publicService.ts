import { DEFAULT_FILTERS, type ListingPage, type PublicHighlights, type PublicListing } from "@flatme/shared";
import { NotFoundError } from "../domain/errors";
import { toListingSummary, toPublicListing, toPublicSummary } from "../domain/mappers";
import type { Clock, ListingRepository, UserRepository } from "../ports";
import { decodeCursor, nextCursor } from "./cursor";
import { filtersOf, nearOf, type SearchParams } from "./listingService";

const CACHE_MS = 60_000;
const FEATURED_COUNT = 6;

/** Everything an anonymous visitor may read. Never contact details, never exact locations. */
export class PublicService {
  private cache: { at: number; value: PublicHighlights } | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
    private readonly clock: Clock,
  ) {}

  async highlights(): Promise<PublicHighlights> {
    const now = this.clock.now();
    if (this.cache && now.getTime() - this.cache.at < CACHE_MS) return this.cache.value;
    const [activeListings, professionals, companies, featured] = await Promise.all([
      this.listings.countActive(),
      this.users.count(),
      this.users.countDistinctCompanies(),
      this.listings.search({
        filters: { ...DEFAULT_FILTERS, budgetMin: 0, budgetMax: Number.MAX_SAFE_INTEGER },
        sort: "newest",
        offset: 0,
        limit: FEATURED_COUNT,
        now,
      }),
    ]);
    const value: PublicHighlights = {
      stats: { activeListings, professionals, companies },
      featured: featured.hits.map((h) => toListingSummary(h.listing, null)),
    };
    this.cache = { at: now.getTime(), value };
    return value;
  }

  /** Same filters and paging as the signed-in search, for active listings only. */
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
      items: hits.map((h) => toPublicSummary(h.listing, h.distanceKm)),
      total,
      nextCursor: nextCursor(offset, hits.length, total),
    };
  }

  /** Paused and removed listings don't exist for anonymous visitors. Views aren't counted (crawlers). */
  async listing(id: string): Promise<PublicListing> {
    const listing = await this.listings.get(id);
    if (!listing || listing.status !== "active") throw new NotFoundError("This listing is no longer available");
    return toPublicListing(listing);
  }
}
