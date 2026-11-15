import { CITY, countActiveFilters } from "@flatme/shared";
import type { Metadata } from "next";
import { SearchView } from "@/components/SearchView";
import { areaHref } from "@/lib/areas";
import { publicApi } from "@/lib/public-api";
import { PAGE_SIZE, parseSearch } from "@/lib/search-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function readState(searchParams: Props["searchParams"]) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  return parseSearch(params);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filters, sort } = await readState(searchParams);
  const filtered = countActiveFilters(filters) > 0 || sort !== null;
  const onlyArea = countActiveFilters(filters) === 1 && filters.areas.length === 1 && sort === null ? filters.areas[0] : undefined;
  return {
    title: `Flats and rooms for rent in ${CITY.name}`,
    description: `Browse rooms in shared flats across ${CITY.name}, posted by verified working professionals. Filter by area, rent, furnishing and move-in date.`,
    // One address per result set: a single-area filter belongs to its area page, other filter mixes aren't indexed.
    alternates: { canonical: onlyArea ? areaHref(onlyArea) : "/flats" },
    robots: filtered && !onlyArea ? { index: false, follow: true } : undefined,
  };
}

export default async function FlatsPage({ searchParams }: Props) {
  const state = await readState(searchParams);
  const initial = await publicApi.search({ ...state.filters, sort: state.sort === "distance" || !state.sort ? "newest" : state.sort, limit: PAGE_SIZE });
  return (
    <SearchView
      state={state}
      initial={initial}
      heading={
        <>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Flats and rooms in {CITY.name}</h1>
          <p className="mt-1 text-muted">Shared flats posted by verified working professionals.</p>
        </>
      }
    />
  );
}
