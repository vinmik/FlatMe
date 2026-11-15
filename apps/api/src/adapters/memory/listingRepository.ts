import { haversineKm, matchesFilters } from "@flatme/shared";
import type { ListingEntity } from "../../domain/entities";
import type {
  AdminListingCriteria,
  ListingHit,
  ListingRepository,
  ListingSearchCriteria,
  ListingSearchResult,
  ListingStatsRow,
  Paged,
} from "../../ports";
import { clone, containsText, mapCollection, newestFirst, paginate, type MemoryCollection } from "./util";

/** Reference implementation of the search semantics documented on {@link ListingRepository}. */
export class MemoryListingRepository implements ListingRepository {
  private readonly docs = new Map<string, ListingEntity>();

  constructor(seed: readonly ListingEntity[] = []) {
    for (const l of seed) this.docs.set(l.id, clone(l));
  }

  collection(): MemoryCollection {
    return mapCollection(this.docs);
  }

  async get(id: string): Promise<ListingEntity | null> {
    const l = this.docs.get(id);
    return l ? clone(l) : null;
  }

  async getMany(ids: readonly string[]): Promise<ListingEntity[]> {
    return ids.flatMap((id) => {
      const l = this.docs.get(id);
      return l ? [clone(l)] : [];
    });
  }

  async listByOwner(ownerId: string): Promise<ListingEntity[]> {
    return [...this.docs.values()].filter((l) => l.ownerId === ownerId).sort(newestFirst).map(clone);
  }

  async upsert(listing: ListingEntity): Promise<void> {
    this.docs.set(listing.id, clone(listing));
  }

  async delete(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async search(c: ListingSearchCriteria): Promise<ListingSearchResult> {
    const { near } = c;
    const hits: ListingHit[] = [...this.docs.values()]
      .filter((l) => l.status === "active" && matchesFilters(l, c.filters, c.now))
      .map((l) => ({ listing: l, distanceKm: near ? haversineKm(near, l.location) : null }));
    const sort = c.sort === "distance" && !near ? "newest" : c.sort;
    hits.sort((a, b) => {
      const primary =
        sort === "distance"
          ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
          : sort === "rent-asc"
            ? a.listing.rent - b.listing.rent
            : sort === "rent-desc"
              ? b.listing.rent - a.listing.rent
              : 0;
      return primary !== 0 ? primary : newestFirst(a.listing, b.listing);
    });
    return {
      hits: hits.slice(c.offset, c.offset + c.limit).map((h) => ({ ...h, listing: clone(h.listing) })),
      total: hits.length,
    };
  }

  async incrementStat(id: string, stat: "views" | "inquiries"): Promise<void> {
    const l = this.docs.get(id);
    if (l) l.stats[stat] += 1;
  }

  async countActive(): Promise<number> {
    return [...this.docs.values()].filter((l) => l.status === "active").length;
  }

  async adminQuery(q: AdminListingCriteria): Promise<Paged<ListingEntity>> {
    const ids = q.ids ? new Set(q.ids) : null;
    const items = [...this.docs.values()]
      .filter(
        (l) =>
          (!q.status || l.status === q.status) &&
          (!q.area || l.area === q.area) &&
          (!q.ownerId || l.ownerId === q.ownerId) &&
          (!ids || ids.has(l.id)) &&
          containsText([l.id, l.locality, l.area, l.owner.firstName, l.owner.company], q.text),
      )
      .sort(newestFirst);
    return paginate(items, q);
  }

  async statsRows(): Promise<ListingStatsRow[]> {
    return [...this.docs.values()].map((l) => ({
      ownerId: l.ownerId,
      area: l.area,
      rent: l.rent,
      status: l.status,
      createdAt: l.createdAt,
    }));
  }
}
