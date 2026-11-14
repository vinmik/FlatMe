import type { AdminUser, AdminUserQuery } from "@flatme/shared";
import { ChevronRight, Download } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/app/layout/PageHeader";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  rowClass,
  SearchInput,
  Segmented,
  Select,
  SkeletonRows,
  Table,
  TBody,
  Td,
  Th,
  THead,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { useCursorPagination, useDebounced, useUrlFilters } from "@/lib/hooks";
import { useUsers } from "./hooks";
import { RoleBadge, UserDrawer, UserStatusBadge } from "./UserDrawer";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["q", "status", "role", "user"] as const;

function toCsv(rows: AdminUser[]): string {
  const head = ["id", "email", "fullName", "company", "designation", "role", "status", "listingCount", "createdAt", "lastLoginAt"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [head.join(","), ...rows.map((u) => head.map((h) => esc(u[h as keyof AdminUser])).join(","))].join("\n");
}

export default function UsersPage() {
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounced(search.trim());
  useEffect(() => setFilters({ q: debouncedSearch }), [debouncedSearch, setFilters]);

  const status = filters.status === "active" || filters.status === "suspended" ? filters.status : undefined;
  const role = filters.role === "admin" || filters.role === "user" ? filters.role : undefined;
  const pager = useCursorPagination(JSON.stringify([filters.q, status, role]));
  const query: AdminUserQuery = { limit: PAGE_SIZE, q: filters.q || undefined, status, role, cursor: pager.cursor };
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useUsers(query);

  const exportCsv = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([toCsv(data.items)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `flatme-users-page-${pager.page}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description={data ? `${formatNumber(data.total)} members match your filters` : "Verified professionals on FlatMe"}
        actions={
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} disabled={!data?.items.length}>
            Export page
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="lg:w-80">
            <SearchInput
              aria-label="Search users"
              placeholder="Search name, email or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
            <Segmented
              label="Filter by status"
              value={status ?? "all"}
              onChange={(v) => setFilters({ status: v === "all" ? null : v })}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <div className="w-36">
              <Select aria-label="Filter by role" value={role ?? ""} onChange={(e) => setFilters({ role: e.target.value || null })}>
                <option value="">All roles</option>
                <option value="user">Members</option>
                <option value="admin">Admins</option>
              </Select>
            </div>
          </div>
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <SkeletonRows rows={10} cols={5} />
        ) : data.items.length === 0 ? (
          <EmptyState
            illustration="search"
            title="No members found"
            description="Try a different search or clear the filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setFilters({ q: null, status: null, role: null });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <Table className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isFetching}>
              <THead>
                <tr>
                  <Th>Member</Th>
                  <Th>Company</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Listings</Th>
                  <Th>Joined</Th>
                  <Th>Last active</Th>
                  <Th className="w-8">
                    <span className="sr-only">Open</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {data.items.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.22 }}
                    className={rowClass}
                    tabIndex={0}
                    aria-label={`Open ${u.fullName || u.email}`}
                    onClick={() => setFilters({ user: u.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFilters({ user: u.id });
                      }
                    }}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName || u.email} src={u.avatarUrl} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{u.fullName || "—"}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-fg">{u.company}</p>
                      <p className="max-w-48 truncate text-xs text-muted">{u.designation || "—"}</p>
                    </Td>
                    <Td>
                      <RoleBadge role={u.role} />
                    </Td>
                    <Td>
                      <UserStatusBadge user={u} />
                    </Td>
                    <Td className="text-right tabular">{u.listingCount}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatRelative(u.lastLoginAt)}</Td>
                    <Td>
                      <ChevronRight className="size-4 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Td>
                  </motion.tr>
                ))}
              </TBody>
            </Table>
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
          </>
        )}
      </Card>

      <UserDrawer userId={filters.user || null} onClose={() => setFilters({ user: null })} />
    </>
  );
}
