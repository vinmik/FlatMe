import { REPORT_REASON_LABELS, type Report } from "@flatme/shared";
import { CheckCircle2, Clock, ExternalLink, Flag, Mail, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/app/layout/PageHeader";
import { Badge, Button, Card, EmptyState, ErrorState, Pagination, SearchInput, Segmented, Skeleton } from "@/components/ui";
import { ListingDrawer } from "@/features/listings/ListingDrawer";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber, formatRelative, shortId } from "@/lib/format";
import { useCursorPagination, useDebounced, useUrlFilters } from "@/lib/hooks";
import { useReports } from "./hooks";
import { REASON_TONE, REPORT_STATUS } from "./reasons";
import { ResolveModal, type ResolveIntent } from "./ResolveModal";

const PAGE_SIZE = 10;
const FILTER_KEYS = ["q", "status", "listing"] as const;
type StatusFilter = Report["status"] | "all";
const STATUS_FILTERS: StatusFilter[] = ["open", "resolved", "dismissed", "all"];

function ReportCard({ report: r, index, onView, onResolve }: { report: Report; index: number; onView: () => void; onResolve: (remove: boolean) => void }) {
  const status = REPORT_STATUS[r.status];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.28, ease: "easeOut" }}
      className={cn(
        "relative rounded-brand border border-line bg-surface p-4 shadow-card sm:p-5",
        r.status === "open" && (r.reason === "scam" || r.reason === "inappropriate") && "border-l-4 border-l-rose-500",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={REASON_TONE[r.reason]} icon={<Flag className="size-3" />}>
              {REPORT_REASON_LABELS[r.reason]}
            </Badge>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted" title={formatDateTime(r.createdAt)}>
              <Clock className="size-3.5" /> {formatRelative(r.createdAt)}
            </span>
          </div>
          {r.details ? <p className="text-sm leading-relaxed text-fg">“{r.details}”</p> : <p className="text-sm text-muted italic">No details provided.</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
            <button type="button" onClick={onView} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <ExternalLink className="size-3.5" /> {r.listingArea} listing · {shortId(r.listingId)}
            </button>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" /> {r.reporterEmail}
            </span>
            <Link to={`/users?user=${encodeURIComponent(r.listingOwnerId)}`} className="hover:text-fg hover:underline">
              View owner
            </Link>
          </div>
          {r.status !== "open" && r.resolution && (
            <div className="rounded-[10px] bg-surface-2 px-3 py-2 text-sm">
              <span className="font-medium text-fg">Resolution:</span> <span className="text-muted">{r.resolution}</span>
              {r.resolvedAt && <span className="ml-1 text-xs text-muted">· {formatRelative(r.resolvedAt)}</span>}
            </div>
          )}
        </div>
        {r.status === "open" && (
          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => onResolve(false)}>
              Resolve
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => onResolve(true)}>
              Remove listing
            </Button>
          </div>
        )}
      </div>
    </motion.li>
  );
}

function ReportsSkeleton() {
  return (
    <ul className="space-y-3" role="status" aria-label="Loading reports">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="space-y-3 rounded-brand border border-line bg-surface p-5">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage() {
  const [f, setFilters] = useUrlFilters(FILTER_KEYS);
  const [search, setSearch] = useState(f.q);
  const debounced = useDebounced(search.trim());
  useEffect(() => setFilters({ q: debounced }), [debounced, setFilters]);
  const [intent, setIntent] = useState<ResolveIntent>(null);

  const statusFilter: StatusFilter = (STATUS_FILTERS as string[]).includes(f.status) ? (f.status as StatusFilter) : "open";
  const status = statusFilter === "all" ? undefined : statusFilter;
  const pager = useCursorPagination(JSON.stringify([f.q, status]));
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useReports({
    limit: PAGE_SIZE,
    q: f.q || undefined,
    status,
    cursor: pager.cursor,
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          data
            ? `${formatNumber(data.total)} ${statusFilter === "all" ? "" : `${REPORT_STATUS[statusFilter].label.toLowerCase()} `}report${data.total === 1 ? "" : "s"}`
            : "Trust & safety queue for flagged listings"
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <Segmented
          label="Filter by status"
          value={statusFilter}
          onChange={(v) => setFilters({ status: v === "open" ? null : v })}
          options={[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Actioned" },
            { value: "dismissed", label: "Dismissed" },
            { value: "all", label: "All" },
          ]}
        />
        <div className="md:ml-auto md:w-72">
          <SearchInput aria-label="Search reports" placeholder="Search reporter, area, details…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : isPending ? (
        <ReportsSkeleton />
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            illustration={statusFilter === "open" && !f.q ? "shield" : "search"}
            title={statusFilter === "open" && !f.q ? "Inbox zero 🎉" : "No reports found"}
            description={statusFilter === "open" && !f.q ? "No open reports — the community is behaving." : "Try another status or search term."}
          />
        </Card>
      ) : (
        <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isFetching}>
          <ul className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {data.items.map((r, i) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  index={i}
                  onView={() => setFilters({ listing: r.listingId })}
                  onResolve={(removeListing) => setIntent({ report: r, removeListing })}
                />
              ))}
            </AnimatePresence>
          </ul>
          <Card className="mt-4 overflow-hidden">
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
          </Card>
        </div>
      )}

      <ResolveModal intent={intent} onClose={() => setIntent(null)} />
      <ListingDrawer listingId={f.listing || null} onClose={() => setFilters({ listing: null })} />
    </>
  );
}
