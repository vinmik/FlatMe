import { DEFAULT_FILTERS, filtersToQuery, ListingFiltersSchema, SortSchema, type ListingFilters } from "@flatme/shared";
import type { z } from "zod";

export type Sort = z.infer<typeof SortSchema>;

/** Listings per page on browse pages. */
export const PAGE_SIZE = 24;

export interface SearchState {
  filters: ListingFilters;
  /** Null means "pick for me": nearest first when a place is known, newest otherwise. */
  sort: Sort | null;
}

/** Reads the search page's state from the address bar; anything invalid falls back to defaults. */
export function parseSearch(params: URLSearchParams): SearchState {
  const raw: Record<string, string> = {};
  for (const k of ["budgetMin", "budgetMax", "gender", "furnishing", "moveIn", "areas"]) {
    const v = params.get(k);
    if (v) raw[k] = v;
  }
  const filters = ListingFiltersSchema.safeParse(raw);
  const sort = SortSchema.safeParse(params.get("sort"));
  return {
    filters: filters.success ? filters.data : DEFAULT_FILTERS,
    sort: sort.success ? sort.data : null,
  };
}

/** Inverse of {@link parseSearch}; defaults are left out so links stay short. */
export function toSearchParams(s: SearchState): URLSearchParams {
  const out = new URLSearchParams(filtersToQuery(s.filters));
  if (s.sort) out.set("sort", s.sort);
  return out;
}

export function searchHref(s: { filters?: Partial<ListingFilters>; sort?: Sort | null }): string {
  const qs = toSearchParams({ filters: { ...DEFAULT_FILTERS, ...s.filters }, sort: s.sort ?? null }).toString();
  return qs ? `/flats?${qs}` : "/flats";
}

/** Where "See all" on a home-page row leads. */
export function railHref(key: "budget" | "furnished" | "immediate" | "newest"): string {
  switch (key) {
    case "budget":
      return searchHref({ filters: { budgetMax: 10_000 }, sort: "rent-asc" });
    case "furnished":
      return searchHref({ filters: { furnishing: "furnished" } });
    case "immediate":
      return searchHref({ filters: { moveIn: "immediate" } });
    case "newest":
      return searchHref({ sort: "newest" });
  }
}
