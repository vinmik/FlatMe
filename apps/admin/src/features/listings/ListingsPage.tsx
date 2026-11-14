import { AREA_NAMES, type AdminListing, type AdminListingQuery } from "@flatme/shared";
import { Flag, LayoutGrid, List, MessageSquare, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/app/layout/PageHeader";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  rowClass,
  SearchInput,
  Segmented,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, formatRupees, furnishingLabel } from "@/lib/format";
import { useCursorPagination, useDebounced, useUrlFilters } from "@/lib/hooks";
import { useListings } from "./hooks";
import { ListingDrawer } from "./ListingDrawer";
import { ListingPhoto, ListingStatusBadge, Locality, ReportsBadge, SeedBadge } from "./ListingBits";

const PAGE_SIZE = 12;
const FILTER_KEYS = ["q", "status", "area", "reported", "ownerId", "view", "listing"] as const;
const STATUSES = ["active", "paused", "removed"] as const;

function ListingCard({ listing: l, index, onOpen }: { listing: AdminListing; index: number; onOpen: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group block h-full w-full overflow-hidden rounded-brand border border-line bg-surface text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ListingPhoto
            src={l.coverPhoto}
            alt={`${l.roomType} in ${l.locality}`}
            className={cn("size-full transition duration-500 group-hover:scale-105", l.status === "removed" && "grayscale")}
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <ListingStatusBadge status={l.status} />
            <ReportsBadge count={l.openReports} />
          </div>
          <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-sm font-semibold text-white backdrop-blur tabular">
            {formatRupees(l.rent)}
          </span>
        </div>
        <div className="space-y-1.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-fg">
              {l.roomType} · {furnishingLabel(l.furnishing)}
            </p>
            {l.seed && <SeedBadge />}
          </div>
          <p className="text-sm">
            <Locality listing={l} />
          </p>
          <div className="flex items-center justify-between pt-1 text-xs text-muted">
            <span className="truncate">
              {l.contact.name} · {l.owner.company}
            </span>
            <span className="inline-flex items-center gap-1 tabular">
              <MessageSquare className="size-3.5" /> {l.stats.inquiries}
            </span>
          </div>
        </div>
      </button>
    </motion.li>
  );
}

function CardsSkeleton() {
  return (
    <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading listings">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-brand border border-line">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ListingsPage() {
  const [f, setFilters] = useUrlFilters(FILTER_KEYS);
  const [search, setSearch] = useState(f.q);
  const debounced = useDebounced(search.trim());
  useEffect(() => setFilters({ q: debounced }), [debounced, setFilters]);

  const view = f.view === "table" ? "table" : "cards";
  const status = (STATUSES as readonly string[]).includes(f.status) ? (f.status as AdminListing["status"]) : undefined;
  const area = (AREA_NAMES as readonly string[]).includes(f.area) ? f.area : undefined;
  const reported = f.reported === "1";
  const pager = useCursorPagination(JSON.stringify([f.q, status, area, reported, f.ownerId]));
  const query: AdminListingQuery = {
    limit: PAGE_SIZE,
    q: f.q || undefined,
    status,
    area,
    reported: reported || undefined,
    ownerId: f.ownerId || undefined,
    cursor: pager.cursor,
  };
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useListings(query);
  const open = (id: string) => setFilters({ listing: id });
  const clear = () => {
    setSearch("");
    setFilters({ q: null, status: null, area: null, reported: null, ownerId: null });
  };

  return (
    <>
      <PageHeader
        title="Listings"
        description={data ? `${formatNumber(data.total)} listings match your filters` : "Moderate rooms posted across Hyderabad"}
        actions={
          <Segmented
            label="View"
            value={view}
            onChange={(v) => setFilters({ view: v === "cards" ? null : v })}
            options={[
              { value: "cards", label: <><LayoutGrid className="size-4" /> Cards</> },
              { value: "table", label: <><List className="size-4" /> Table</> },
            ]}
          />
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <div className="xl:w-72">
            <SearchInput aria-label="Search listings" placeholder="Search locality, owner, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
            <Segmented
              label="Filter by status"
              value={status ?? "all"}
              onChange={(v) => setFilters({ status: v === "all" ? null : v })}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "removed", label: "Removed" },
              ]}
            />
            <div className="w-44">
              <Select aria-label="Filter by area" value={area ?? ""} onChange={(e) => setFilters({ area: e.target.value || null })}>
                <option value="">All areas</option>
                {AREA_NAMES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              aria-pressed={reported}
              onClick={() => setFilters({ reported: reported ? null : "1" })}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-[10px] border px-3 text-sm font-medium transition",
                reported
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-line bg-surface text-muted hover:text-fg",
              )}
            >
              <Flag className="size-4" /> Has open reports
            </button>
          </div>
        </div>

        {f.ownerId && (
          <div className="flex items-center gap-2 border-b border-line bg-accent/40 px-4 py-2 text-sm">
            <span className="text-accent-fg">Showing listings by owner</span>
            <Badge tone="brand">{f.ownerId}</Badge>
            <button type="button" className="ml-1 rounded p-0.5 text-muted hover:text-fg" onClick={() => setFilters({ ownerId: null })} aria-label="Clear owner filter">
              <X className="size-4" />
            </button>
          </div>
        )}

        {error && !data ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <CardsSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            illustration={reported ? "shield" : "search"}
            title={reported ? "No reported listings" : "No listings found"}
            description={reported ? "Nothing needs your attention right now." : "Try a different search or clear the filters."}
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isFetching}>
            {view === "cards" ? (
              <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i} onOpen={() => open(l.id)} />
                ))}
              </ul>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>Listing</Th>
                    <Th className="text-right">Rent</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Inquiries</Th>
                    <Th>Listed</Th>
                  </tr>
                </THead>
                <TBody>
                  {data.items.map((l, i) => (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                      className={rowClass}
                      tabIndex={0}
                      aria-label={`Open ${l.roomType} in ${l.locality}`}
                      onClick={() => open(l.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(l.id);
                        }
                      }}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <ListingPhoto src={l.coverPhoto} alt="" className="h-12 w-16 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <p className="font-medium text-fg">
                              {l.roomType} · {furnishingLabel(l.furnishing)}
                            </p>
                            <p className="text-xs">
                              <Locality listing={l} />
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-right font-medium tabular">{formatRupees(l.rent)}</Td>
                      <Td>
                        <p className="text-fg">{l.contact.name}</p>
                        <p className="text-xs text-muted">{l.owner.company}</p>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          <ListingStatusBadge status={l.status} />
                          <ReportsBadge count={l.openReports} />
                        </div>
                      </Td>
                      <Td className="text-right tabular">{l.stats.inquiries}</Td>
                      <Td className="whitespace-nowrap text-muted">{formatDate(l.createdAt)}</Td>
                    </motion.tr>
                  ))}
                </TBody>
              </Table>
            )}
            <Pagination
              page={pager.page}
              pageSize={PAGE_SIZE}
              total={data.total}
              hasPrev={pager.hasPrev}
              hasNext={!!data.nextCursor}
              onPrev={pager.prev}
              onNext={() => pager.next(data.nextCursor)}
              loading={isFetching}
            />
          </div>
        )}
      </Card>

      <ListingDrawer listingId={f.listing || null} onClose={() => setFilters({ listing: null })} />
    </>
  );
}
