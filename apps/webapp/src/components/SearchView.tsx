"use client";

import { AREAS, BUDGET, countActiveFilters, DEFAULT_FILTERS, formatRupees, type ListingFilters, type ListingPage } from "@flatme/shared";
import { List, Map as MapIcon, SearchX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSearch } from "@/lib/hooks";
import { useCoords } from "@/lib/place";
import { PAGE_SIZE, searchHref, type SearchState, type Sort } from "@/lib/search-params";
import { Button, Chip, EmptyState, ErrorState, Skeleton } from "@/ui";
import { errorMessage } from "@/lib/api";
import { ListingCard } from "./ListingCard";
import { ListingsMap } from "./Map";
import { PlacePicker } from "./PlacePicker";

const BUDGET_STEPS = Array.from({ length: (BUDGET.max - BUDGET.min) / 2500 + 1 }, (_, i) => BUDGET.min + i * 2500);

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: ReadonlyArray<readonly [T, string]> }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SearchViewProps {
  state: SearchState;
  /** First page, already rendered by the server. Null if the API couldn't answer. */
  initial: ListingPage | null;
  heading: ReactNode;
}

export function SearchView({ state, initial, heading }: SearchViewProps) {
  const router = useRouter();
  const coords = useCoords();
  const [view, setView] = useState<"list" | "map">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { filters } = state;
  const sort: Sort = state.sort ?? (coords ? "distance" : "newest");

  const query = useMemo(
    () => ({ ...filters, sort: sort === "distance" && !coords ? "newest" : sort, limit: PAGE_SIZE, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) }),
    [filters, sort, coords],
  );
  const search = useSearch(query, initial ?? undefined);
  const items = useMemo(() => search.data?.pages.flatMap((p) => p.items) ?? [], [search.data]);
  const total = search.data?.pages[0]?.total ?? 0;
  const active = items.find((l) => l.id === activeId) ?? null;

  const go = (next: Partial<ListingFilters>, nextSort: Sort | null = state.sort) =>
    router.push(searchHref({ filters: { ...filters, ...next }, sort: nextSort }), { scroll: false });
  const toggleArea = (name: ListingFilters["areas"][number]) => go({ areas: filters.areas.includes(name) ? filters.areas.filter((a) => a !== name) : [...filters.areas, name] });
  const activeCount = countActiveFilters(filters);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-6 pb-4">
        <div className="min-w-0">{heading}</div>
        <PlacePicker />
      </div>

      <section aria-label="Filters" className="rounded-brand border border-line bg-surface p-4 shadow-card">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {AREAS.map((a) => (
            <Chip key={a.name} selected={filters.areas.includes(a.name)} onClick={() => toggleArea(a.name)}>
              {a.name}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Select
            label="Min rent"
            value={String(filters.budgetMin)}
            onChange={(v) => go({ budgetMin: Number(v), budgetMax: Math.max(filters.budgetMax, Number(v)) })}
            options={BUDGET_STEPS.map((n) => [String(n), n === BUDGET.min ? "No minimum" : formatRupees(n)] as const)}
          />
          <Select
            label="Max rent"
            value={String(filters.budgetMax)}
            onChange={(v) => go({ budgetMax: Number(v), budgetMin: Math.min(filters.budgetMin, Number(v)) })}
            options={BUDGET_STEPS.map((n) => [String(n), n === BUDGET.max ? "No maximum" : formatRupees(n)] as const)}
          />
          <Select
            label="Furnishing"
            value={filters.furnishing}
            onChange={(v) => go({ furnishing: v })}
            options={[["any", "Any"], ["furnished", "Furnished"], ["semi-furnished", "Semi-furnished"], ["unfurnished", "Unfurnished"]] as const}
          />
          <Select
            label="Move in"
            value={filters.moveIn}
            onChange={(v) => go({ moveIn: v })}
            options={[["any", "Any time"], ["immediate", "Right away"], ["within-week", "Within a week"], ["within-month", "Within a month"]] as const}
          />
          <Select
            label="Open to"
            value={filters.gender}
            onChange={(v) => go({ gender: v })}
            options={[["any", "Anyone"], ["male", "Men"], ["female", "Women"]] as const}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(v) => go({}, v)}
            options={[["newest", "Newest first"], ["rent-asc", "Rent: low to high"], ["rent-desc", "Rent: high to low"], ...(coords ? ([["distance", "Nearest first"]] as const) : [])] as ReadonlyArray<readonly [Sort, string]>}
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 py-4">
        <p className="text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-fg tabular">{total}</span> {total === 1 ? "flat" : "flats"} found
          {activeCount > 0 && (
            <button type="button" onClick={() => router.push(searchHref({ sort: state.sort }), { scroll: false })} className="ml-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <X className="size-3.5" aria-hidden />
              Clear {activeCount} {activeCount === 1 ? "filter" : "filters"}
            </button>
          )}
        </p>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 lg:hidden" role="group" aria-label="View">
          {([["list", "List", List], ["map", "Map", MapIcon]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium", view === v ? "bg-primary text-white" : "text-muted")}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className={cn(view === "map" && "hidden lg:block")}>
          {search.isError && !items.length ? (
            <ErrorState message={errorMessage(search.error)} onRetry={() => void search.refetch()} />
          ) : search.isPending && !items.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-brand" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-7" aria-hidden />}
              title="No flats match these filters"
              body="Try a wider budget or more areas. New rooms are posted every day."
              action={
                activeCount > 0 && (
                  <Button variant="secondary" onClick={() => router.push(searchHref({ filters: DEFAULT_FILTERS, sort: state.sort }), { scroll: false })}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <ul className={cn("grid gap-5 sm:grid-cols-2", search.isPlaceholderData && "opacity-70 transition-opacity")}>
                {items.map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} active={l.id === activeId} onHover={setActiveId} className="h-full" />
                  </li>
                ))}
              </ul>
              {search.hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button variant="secondary" loading={search.isFetchingNextPage} onClick={() => void search.fetchNextPage()}>
                    Show more flats
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className={cn("lg:block", view === "list" && "hidden")} aria-label="Map">
          <div className="relative h-[70vh] overflow-hidden rounded-brand border border-line shadow-card lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <ListingsMap listings={items} activeId={activeId} onSelect={setActiveId} />
            {active && (
              <div className="absolute inset-x-3 bottom-3 z-[1000] mx-auto max-w-sm lg:hidden">
                <ListingCard listing={active} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
