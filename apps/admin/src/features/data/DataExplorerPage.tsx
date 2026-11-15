import { readPath, type DataContainer } from "@flatme/shared";
import { Braces, ChevronRight, Database, FileJson, FileSpreadsheet, Filter, Lock, Play, Rows3, Terminal, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/app/layout/PageHeader";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  rowClass,
  Segmented,
  Select,
  SkeletonRows,
  Table,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useUrlFilters } from "@/lib/hooks";
import { DocumentDrawer, type DocKey } from "./DocumentDrawer";
import { toCsvExport, toJsonExport } from "./export";
import { flattenPages, useBrowse, useDataContainers, useDataQuery } from "./hooks";

const FILTER_KEYS = ["container", "mode", "field", "op", "value", "doc"] as const;
const DEFAULT_QUERY = "SELECT * FROM c";
const MAX_EXTRA_COLUMNS = 4;

type Mode = "browse" | "query";
type Op = "eq" | "contains";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The most common scalar top-level fields (besides id/partition key/system props), in first-seen order on ties. */
export function pickColumns(items: unknown[], pkField: string | null): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!isRecord(item)) continue;
    for (const [k, v] of Object.entries(item)) {
      if (k === "id" || k === pkField || k.startsWith("_") || isRecord(v) || Array.isArray(v)) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_EXTRA_COLUMNS)
    .map(([k]) => k);
}

function Cell({ value }: { value: unknown }) {
  if (value === undefined) return <span className="text-muted">—</span>;
  if (value === null) return <span className="font-mono text-xs text-muted">null</span>;
  if (typeof value === "boolean") return <Badge tone={value ? "success" : "neutral"}>{String(value)}</Badge>;
  if (typeof value === "number") return <span className="tabular">{value}</span>;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <span className="block max-w-[16rem] truncate" title={text}>
      {text}
    </span>
  );
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function docKeyOf(item: unknown, c: DataContainer): DocKey | null {
  if (!isRecord(item) || typeof item.id !== "string") return null;
  const pk = readPath(item, c.partitionKeyPath);
  return typeof pk === "string" ? { id: item.id, pk } : null;
}

export default function DataExplorerPage() {
  const [f, setFilters] = useUrlFilters(FILTER_KEYS);
  const containers = useDataContainers();
  const list = containers.data?.items ?? [];
  const container = list.find((c) => c.name === f.container) ?? list[0] ?? null;
  const mode: Mode = f.mode === "query" ? "query" : "browse";
  const op: Op = f.op === "contains" ? "contains" : "eq";

  // Audit links open a document via ?doc=<id>; show it as an id filter.
  useEffect(() => {
    if (f.doc) setFilters({ doc: null, mode: null, field: "id", op: null, value: f.doc });
  }, [f.doc, setFilters]);

  const [draft, setDraft] = useState({ field: f.field, op, value: f.value });
  useEffect(() => setDraft({ field: f.field, op, value: f.value }), [f.field, op, f.value]);

  const [queryText, setQueryText] = useState(DEFAULT_QUERY);
  const [submitted, setSubmitted] = useState<{ container: string; query: string; run: number } | null>(null);

  const browseFilter = f.field && f.value ? { field: f.field, op, value: f.value } : {};
  const browse = useBrowse(mode === "browse" ? (container?.name ?? null) : null, browseFilter);
  const activeQuery = submitted && submitted.container === container?.name ? submitted : null;
  const query = useDataQuery(mode === "query" ? (container?.name ?? null) : null, activeQuery?.query ?? null, activeQuery?.run ?? 0);
  const result = mode === "browse" ? browse : query;
  const { items, requestCharge, hasMore } = flattenPages(result.data);

  const pkField = container && /^\/[^/]+$/.test(container.partitionKeyPath) ? container.partitionKeyPath.slice(1) : null;
  const showPk = !!container && pkField !== "id";
  const columns = useMemo(() => pickColumns(items, pkField), [items, pkField]);
  const scalarRows = items.length > 0 && items.every((i) => !isRecord(i));
  const [open, setOpen] = useState<DocKey | null>(null);
  useEffect(() => setOpen(null), [container?.name]);

  const applyFilter = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ field: draft.field.trim() || null, op: draft.op === "eq" ? null : draft.op, value: draft.value || null });
  };
  const runQuery = () => {
    const text = queryText.trim();
    if (!container || !text) return;
    setSubmitted((s) => ({ container: container.name, query: text, run: (s?.run ?? 0) + 1 }));
  };
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return (
    <>
      <PageHeader
        title="Data Explorer"
        description="Browse, query and fix raw Cosmos DB documents. Edits and deletes are written to the audit log."
      />

      {containers.error && !containers.data ? (
        <Card>
          <ErrorState error={containers.error} onRetry={() => void containers.refetch()} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="space-y-4 border-b border-line p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {container ? (
                <div className="scrollbar-thin overflow-x-auto">
                  <Segmented
                    label="Container"
                    value={container.name}
                    onChange={(name) => setFilters({ container: name, field: null, op: null, value: null })}
                    options={list.map((c) => ({
                      value: c.name,
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          {c.writable ? <Database className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                          {c.name}
                        </span>
                      ),
                    }))}
                  />
                </div>
              ) : (
                <div className="h-9 w-96 animate-pulse rounded-[10px] bg-surface-2" aria-label="Loading containers" />
              )}
              <Segmented
                label="Mode"
                size="sm"
                value={mode}
                onChange={(m) => setFilters({ mode: m === "browse" ? null : m })}
                options={[
                  { value: "browse", label: <span className="inline-flex items-center gap-1.5"><Rows3 className="size-3.5" aria-hidden />Browse</span> },
                  { value: "query", label: <span className="inline-flex items-center gap-1.5"><Terminal className="size-3.5" aria-hidden />SQL query</span> },
                ]}
              />
            </div>

            {container && (
              <p className="text-xs text-muted">
                Partition key <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-fg">{container.partitionKeyPath}</code>
                {!container.writable && " · read-only"}
              </p>
            )}

            {mode === "browse" ? (
              <form onSubmit={applyFilter} className="flex flex-col gap-2 md:flex-row md:items-end" aria-label="Filter documents">
                <div className="md:w-56">
                  <Input
                    aria-label="Field"
                    placeholder="Field, e.g. status or contact.email"
                    value={draft.field}
                    onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
                    spellCheck={false}
                    className="font-mono"
                  />
                </div>
                <div className="md:w-36">
                  <Select aria-label="Operator" value={draft.op} onChange={(e) => setDraft((d) => ({ ...d, op: e.target.value as Op }))}>
                    <option value="eq">equals</option>
                    <option value="contains">contains</option>
                  </Select>
                </div>
                <div className="md:w-64">
                  <Input aria-label="Value" placeholder="Value" value={draft.value} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} />
                </div>
                <Button type="submit" variant="secondary" icon={<Filter className="size-4" />} disabled={!!draft.value && !draft.field.trim()}>
                  Apply
                </Button>
                {(f.field || f.value) && (
                  <Button variant="ghost" icon={<X className="size-4" />} onClick={() => setFilters({ field: null, op: null, value: null })}>
                    Clear
                  </Button>
                )}
              </form>
            ) : (
              <div className="space-y-2">
                <Textarea
                  aria-label="SQL query"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      runQuery();
                    }
                  }}
                  rows={4}
                  spellCheck={false}
                  className="font-mono text-sm"
                  placeholder="SELECT * FROM c WHERE c.status = 'active'"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button icon={<Play className="size-4" />} onClick={runQuery} disabled={!container || !queryText.trim()} loading={query.isFetching && !query.isFetchingNextPage}>
                    Run query
                  </Button>
                  <span className="text-xs text-muted">Read-only: a single SELECT statement. Ctrl/⌘+Enter to run. Cross-partition queries are allowed.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-muted">
            <span className="tabular" aria-live="polite">
              {result.data ? `${formatNumber(items.length)} ${items.length === 1 ? "item" : "items"} loaded${hasMore ? " (more available)" : ""}` : "\u00a0"}
            </span>
            {result.data && <Badge tone="info">{requestCharge} RU</Badge>}
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<FileJson className="size-3.5" />}
                disabled={items.length === 0}
                onClick={() => container && download(`${container.name}-${stamp()}.json`, toJsonExport(items), "application/json")}
              >
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<FileSpreadsheet className="size-3.5" />}
                disabled={items.length === 0}
                onClick={() => container && download(`${container.name}-${stamp()}.csv`, toCsvExport(items), "text/csv;charset=utf-8")}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {result.error && !result.data ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : mode === "query" && !activeQuery ? (
            <EmptyState illustration="search" title="Run a query" description="Write a SELECT against this container and press Run (or Ctrl/⌘+Enter)." />
          ) : !container || result.isPending ? (
            <SkeletonRows rows={8} cols={5} />
          ) : items.length === 0 ? (
            <EmptyState illustration="search" title="No documents" description={f.value ? "Nothing matches this filter." : "This container is empty."} />
          ) : scalarRows ? (
            <Table aria-busy={result.isFetching}>
              <THead>
                <tr>
                  <Th>Value</Th>
                </tr>
              </THead>
              <TBody>
                {items.map((v, i) => (
                  <tr key={i}>
                    <Td className="font-mono text-xs">{JSON.stringify(v)}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <Table aria-busy={result.isFetching} aria-label={`${container.name} documents`}>
              <THead>
                <tr>
                  <Th>id</Th>
                  {showPk && <Th>{container.partitionKeyPath}</Th>}
                  {columns.map((c) => (
                    <Th key={c}>{c}</Th>
                  ))}
                  <Th>Modified (_ts)</Th>
                  <Th className="w-8">
                    <span className="sr-only">Open</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {items.map((item, i) => {
                  const rec = isRecord(item) ? item : {};
                  const key = docKeyOf(item, container);
                  const openRow = () => key && setOpen(key);
                  return (
                    <motion.tr
                      key={key ? `${key.pk}\u0000${key.id}` : i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min((i % 25) * 0.02, 0.4), duration: 0.2 }}
                      className={cn(key ? rowClass : undefined)}
                      tabIndex={key ? 0 : undefined}
                      aria-label={key ? `Open ${key.id}` : undefined}
                      onClick={openRow}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRow();
                        }
                      }}
                    >
                      <Td className="font-mono text-xs">
                        <Cell value={rec.id} />
                      </Td>
                      {showPk && (
                        <Td className="font-mono text-xs">
                          <Cell value={readPath(rec, container.partitionKeyPath)} />
                        </Td>
                      )}
                      {columns.map((c) => (
                        <Td key={c}>
                          <Cell value={rec[c]} />
                        </Td>
                      ))}
                      <Td className="whitespace-nowrap text-muted tabular">
                        {typeof rec._ts === "number" ? formatDateTime(new Date(rec._ts * 1000).toISOString()) : "—"}
                      </Td>
                      <Td>{key ? <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" /> : <Braces className="size-4 text-muted" />}</Td>
                    </motion.tr>
                  );
                })}
              </TBody>
            </Table>
          )}

          {hasMore && (
            <div className="flex justify-center border-t border-line p-3">
              <Button variant="secondary" loading={result.isFetchingNextPage} onClick={() => void result.fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </Card>
      )}

      {container && <DocumentDrawer container={container} docKey={open} onClose={() => setOpen(null)} />}
    </>
  );
}
