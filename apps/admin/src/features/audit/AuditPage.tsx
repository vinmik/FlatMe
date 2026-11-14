import type { AuditEntry } from "@flatme/shared";
import {
  Ban,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
  type LucideIcon,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/app/layout/PageHeader";
import { Badge, type BadgeTone, Card, EmptyState, ErrorState, Pagination, SearchInput, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber, formatRelative, shortId } from "@/lib/format";
import { useCursorPagination, useDebounced, useUrlFilters } from "@/lib/hooks";
import { useAudit } from "./hooks";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["q", "targetId"] as const;

const ACTIONS: Record<AuditEntry["action"], { label: string; icon: LucideIcon; tone: BadgeTone; dot: string }> = {
  "user.suspend": { label: "Suspended user", icon: Ban, tone: "danger", dot: "bg-rose-500" },
  "user.reinstate": { label: "Reinstated user", icon: UserCheck, tone: "success", dot: "bg-emerald-500" },
  "user.delete": { label: "Deleted user", icon: Trash2, tone: "danger", dot: "bg-rose-600" },
  "user.role": { label: "Changed role", icon: ShieldCheck, tone: "violet", dot: "bg-violet-500" },
  "listing.status": { label: "Moderated listing", icon: Building2, tone: "info", dot: "bg-sky-500" },
  "listing.delete": { label: "Deleted listing", icon: Trash2, tone: "danger", dot: "bg-rose-600" },
  "report.resolve": { label: "Resolved report", icon: CheckCircle2, tone: "success", dot: "bg-emerald-500" },
  "report.dismiss": { label: "Dismissed report", icon: XCircle, tone: "neutral", dot: "bg-slate-400" },
};

function targetLink(e: AuditEntry): string | null {
  if (e.action === "user.delete" || e.action === "listing.delete") return null;
  if (e.targetType === "user") return `/users?user=${encodeURIComponent(e.targetId)}`;
  if (e.targetType === "listing") return `/listings?listing=${encodeURIComponent(e.targetId)}`;
  return `/reports?status=all&q=${encodeURIComponent(e.targetId)}`;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function groupByDay(items: AuditEntry[]) {
  const groups: { day: string; items: AuditEntry[] }[] = [];
  for (const e of items) {
    const day = dayFmt.format(new Date(e.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return groups;
}

function TimelineItem({ entry: e, index }: { entry: AuditEntry; index: number }) {
  const meta = ACTIONS[e.action];
  const Icon = meta.icon;
  const link = targetLink(e);
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.25 }}
      className="relative pb-6 pl-12 last:pb-0"
    >
      <span className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full border border-line bg-surface shadow-card">
        <Icon className="size-4 text-fg" aria-hidden />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface", meta.dot)} aria-hidden />
      </span>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-sm text-muted">
              by <span className="font-medium text-fg">{e.actorEmail}</span>
            </span>
          </div>
          <p className="text-sm text-fg">{e.details}</p>
          <p className="text-xs text-muted">
            {e.targetType} ·{" "}
            {link ? (
              <Link to={link} className="font-mono text-primary hover:underline">
                {shortId(e.targetId)}
              </Link>
            ) : (
              <span className="font-mono">{shortId(e.targetId)}</span>
            )}
          </p>
        </div>
        <time dateTime={e.createdAt} title={formatDateTime(e.createdAt)} className="shrink-0 text-xs whitespace-nowrap text-muted tabular">
          {formatRelative(e.createdAt)}
        </time>
      </div>
    </motion.li>
  );
}

function AuditSkeleton() {
  return (
    <ul className="space-y-6 p-6" role="status" aria-label="Loading audit log">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AuditPage() {
  const [f, setFilters] = useUrlFilters(FILTER_KEYS);
  const [search, setSearch] = useState(f.q);
  const debounced = useDebounced(search.trim());
  useEffect(() => setFilters({ q: debounced }), [debounced, setFilters]);

  const pager = useCursorPagination(JSON.stringify([f.q, f.targetId]));
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useAudit({
    limit: PAGE_SIZE,
    q: f.q || undefined,
    targetId: f.targetId || undefined,
    cursor: pager.cursor,
  });

  let index = 0;
  return (
    <>
      <PageHeader
        title="Audit log"
        description={data ? `${formatNumber(data.total)} recorded admin actions` : "Every moderation action, attributed and timestamped"}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <div className="md:w-80">
            <SearchInput aria-label="Search audit log" placeholder="Search actor, action, details…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {f.targetId && (
            <div className="flex items-center gap-2 text-sm md:ml-auto">
              <span className="text-muted">Target</span>
              <Badge tone="brand">{f.targetId}</Badge>
              <button type="button" className="rounded p-0.5 text-muted hover:text-fg" onClick={() => setFilters({ targetId: null })} aria-label="Clear target filter">
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <AuditSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState illustration="inbox" title="No audit entries" description="Admin actions will appear here as they happen." />
        ) : (
          <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isFetching}>
            <div className="space-y-8 p-4 sm:p-6">
              {groupByDay(data.items).map((g) => (
                <section key={g.day} aria-label={g.day}>
                  <h2 className="mb-4 text-xs font-semibold tracking-wide text-muted uppercase">{g.day}</h2>
                  <ol className="relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-line">
                    {g.items.map((e) => (
                      <TimelineItem key={e.id} entry={e} index={index++} />
                    ))}
                  </ol>
                </section>
              ))}
            </div>
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
    </>
  );
}
