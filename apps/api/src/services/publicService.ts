import { DEFAULT_FILTERS, type PublicHighlights } from "@flatme/shared";
import { toListingSummary } from "../domain/mappers";
import type { Clock, ListingRepository, UserRepository } from "../ports";

const CACHE_MS = 60_000;
const FEATURED_COUNT = 6;

/** Anonymous landing-page data. Summaries only — never contact details. */
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
}
