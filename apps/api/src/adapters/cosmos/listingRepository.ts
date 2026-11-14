import type { Container } from "@azure/cosmos";
import { haversineKm, moveInCutoff } from "@flatme/shared";
import type { ListingEntity } from "../../domain/entities";
import type {
  AdminListingCriteria,
  ListingRepository,
  ListingSearchCriteria,
  ListingSearchResult,
  ListingStatsRow,
  Paged,
} from "../../ports";
import { deleteItem, queryAll, queryCount, queryValues, readItem, Where } from "./util";

/** Upper bound of candidates ranked in-process for the "distance" sort. */
const MAX_DISTANCE_CANDIDATES = 2000;

const ORDER_BY: Record<"newest" | "rent-asc" | "rent-desc", string> = {
  newest: "ORDER BY c.createdAt DESC",
  // Requires the composite indexes declared in infra/modules/cosmos.bicep.
  "rent-asc": "ORDER BY c.rent ASC, c.createdAt DESC",
  "rent-desc": "ORDER BY c.rent DESC, c.createdAt DESC",
};

/**
 * `listings` container, partition key /id, spatial index on /geo.
 * Cosmos can't ORDER BY a computed ST_DISTANCE, so the distance sort ranks a projection
 * (id, distance, createdAt) in-process and then fetches the page's documents by id.
 */
export class CosmosListingRepository implements ListingRepository {
  constructor(private readonly c: Container) {}

  get(id: string): Promise<ListingEntity | null> {
    return readItem<ListingEntity>(this.c, id, id);
  }

  async getMany(ids: readonly string[]): Promise<ListingEntity[]> {
    if (ids.length === 0) return [];
    return queryAll<ListingEntity>(this.c, {
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.id)",
      parameters: [{ name: "@ids", value: [...ids] }],
    });
  }

  listByOwner(ownerId: string): Promise<ListingEntity[]> {
    return queryAll<ListingEntity>(this.c, {
      query: "SELECT * FROM c WHERE c.ownerId = @o ORDER BY c.createdAt DESC",
      parameters: [{ name: "@o", value: ownerId }],
    });
  }

  async upsert(listing: ListingEntity): Promise<void> {
    await this.c.items.upsert(listing);
  }

  delete(id: string): Promise<void> {
    return deleteItem(this.c, id, id);
  }

  async search(q: ListingSearchCriteria): Promise<ListingSearchResult> {
    const w = searchWhere(q);
    const near = q.near;

    if (q.sort === "distance" && near) {
      const point = { type: "Point", coordinates: [near.lng, near.lat] };
      const ranked = await queryValues<{ id: string; d: number; createdAt: string }>(this.c, {
        query: `SELECT TOP ${MAX_DISTANCE_CANDIDATES} c.id, ST_DISTANCE(c.geo, @point) AS d, c.createdAt FROM c${w}`,
        parameters: [...w.parameters, { name: "@point", value: point }],
      });
      ranked.sort((a, b) => a.d - b.d || (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      const page = ranked.slice(q.offset, q.offset + q.limit);
      const docs = new Map((await this.getMany(page.map((r) => r.id))).map((l) => [l.id, l]));
      return {
        hits: page.flatMap((r) => {
          const listing = docs.get(r.id);
          return listing ? [{ listing, distanceKm: r.d / 1000 }] : [];
        }),
        total: ranked.length,
      };
    }

    const sort = q.sort === "distance" ? "newest" : q.sort;
    const [docs, total] = await Promise.all([
      queryAll<ListingEntity>(this.c, {
        query: `SELECT * FROM c${w} ${ORDER_BY[sort]} OFFSET @offset LIMIT @limit`,
        parameters: [...w.parameters, { name: "@offset", value: q.offset }, { name: "@limit", value: q.limit }],
      }),
      queryCount(this.c, w.toString(), w.parameters),
    ]);
    return {
      hits: docs.map((listing) => ({ listing, distanceKm: near ? haversineKm(near, listing.location) : null })),
      total,
    };
  }

  async incrementStat(id: string, stat: "views" | "inquiries"): Promise<void> {
    await this.c.item(id, id).patch([{ op: "incr", path: `/stats/${stat}`, value: 1 }]);
  }

  countActive(): Promise<number> {
    return queryCount(this.c, " WHERE c.status = 'active'", []);
  }

  async adminQuery(q: AdminListingCriteria): Promise<Paged<ListingEntity>> {
    if (q.ids && q.ids.length === 0) return { items: [], total: 0 };
    const w = new Where();
    if (q.status) w.add("c.status = @status", { "@status": q.status });
    if (q.area) w.add("c.area = @area", { "@area": q.area });
    if (q.ownerId) w.add("c.ownerId = @owner", { "@owner": q.ownerId });
    if (q.ids) w.add("ARRAY_CONTAINS(@ids, c.id)", { "@ids": [...q.ids] });
    if (q.text) {
      w.add(
        "(c.id = @t OR CONTAINS(c.locality, @t, true) OR CONTAINS(c.area, @t, true) OR CONTAINS(c.owner.firstName, @t, true) OR CONTAINS(c.owner.company, @t, true))",
        { "@t": q.text },
      );
    }
    const [items, total] = await Promise.all([
      queryAll<ListingEntity>(this.c, {
        query: `SELECT * FROM c${w} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`,
        parameters: [...w.parameters, { name: "@offset", value: q.offset }, { name: "@limit", value: q.limit }],
      }),
      queryCount(this.c, w.toString(), w.parameters),
    ]);
    return { items, total };
  }

  statsRows(): Promise<ListingStatsRow[]> {
    return queryValues<ListingStatsRow>(this.c, {
      query: "SELECT c.ownerId, c.area, c.rent, c.status, c.createdAt FROM c",
    });
  }
}

/** Mirrors shared `matchesFilters` (the memory adapter's reference semantics) in Cosmos SQL. */
function searchWhere(q: ListingSearchCriteria): Where {
  const f = q.filters;
  const w = new Where()
    .add("c.status = 'active'")
    .add("c.rent >= @min AND c.rent <= @max", { "@min": f.budgetMin, "@max": f.budgetMax });
  if (f.gender !== "any") w.add("(c.genderPreference = 'any' OR c.genderPreference = @g)", { "@g": f.gender });
  if (f.furnishing !== "any") w.add("c.furnishing = @f", { "@f": f.furnishing });
  if (f.areas.length > 0) w.add("ARRAY_CONTAINS(@areas, c.area)", { "@areas": [...f.areas] });
  const cutoff = moveInCutoff(f.moveIn, q.now);
  if (cutoff) w.add("(c.flexible = true OR c.availableFrom <= @cutoff)", { "@cutoff": cutoff });
  return w;
}
