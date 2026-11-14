import { Flag, Home, MessageSquare, RefreshCw, Users } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { PageHeader } from "@/app/layout/PageHeader";
import { Button, Card, CardBody, CardHeader, ErrorState, Skeleton, StatCard } from "@/components/ui";
import { useAuth } from "@/lib/auth/store";
import { formatNumber } from "@/lib/format";
import { AreaBarChart, CompanyDonut, TimelineChart } from "./charts";
import { useStats } from "./hooks";

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular">
          {formatNumber(value)} <span className="text-xs text-muted">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isPending, refetch, isFetching } = useStats();
  const firstName = user?.fullName.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's what's happening on FlatMe across Hyderabad."
        actions={
          <Button variant="secondary" onClick={() => void refetch()} loading={isFetching} icon={<RefreshCw className="size-4" />}>
            Refresh
          </Button>
        }
      />

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load stats" />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              index={0}
              label="Members"
              value={data?.users.total}
              icon={<Users className="size-[18px]" />}
              hint={data && <><span className="font-medium text-emerald-600">+{data.users.newLast7d}</span> this week · {data.users.suspended} suspended</>}
            />
            <StatCard
              index={1}
              tone="emerald"
              label="Active listings"
              value={data?.listings.active}
              icon={<Home className="size-[18px]" />}
              hint={data && <><span className="font-medium text-emerald-600">+{data.listings.newLast7d}</span> new · {data.listings.paused} paused</>}
            />
            <StatCard
              index={2}
              tone="violet"
              label="Inquiries"
              value={data?.inquiries.total}
              icon={<MessageSquare className="size-[18px]" />}
              hint={data && <><span className="font-medium text-fg">{formatNumber(data.inquiries.last7d)}</span> in the last 7 days</>}
            />
            <StatCard
              index={3}
              tone="rose"
              label="Open reports"
              value={data?.reports.open}
              icon={<Flag className="size-[18px]" />}
              hint={
                data && (
                  <Link to="/reports" className="font-medium text-primary hover:underline">
                    {data.reports.open > 0 ? "Review the queue →" : "Queue is clear ✓"}
                  </Link>
                )
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="min-w-0 xl:col-span-2">
              <CardHeader title="Activity" description="Daily totals over the last 14 days" />
              <CardBody>{data ? <TimelineChart data={data.timeline} /> : <Skeleton className="h-80 w-full rounded-brand" />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Members by company" description="Verified work domains" />
              <CardBody>{data ? <CompanyDonut data={data.byCompany} /> : <Skeleton className="mx-auto size-52 rounded-full" />}</CardBody>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="min-w-0 xl:col-span-2">
              <CardHeader title="Listings by area" description="Live and paused listings, hover for average rent" />
              <CardBody>{data ? <AreaBarChart data={data.byArea} /> : <Skeleton className="h-80 w-full rounded-brand" />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Listing health" description={data ? `${formatNumber(data.listings.total)} listings in total` : undefined} />
              <CardBody className="space-y-5">
                {data ? (
                  <>
                    <StatusBar label="Active" value={data.listings.active} total={data.listings.total} color="#10b981" />
                    <StatusBar label="Paused" value={data.listings.paused} total={data.listings.total} color="#f59e0b" />
                    <StatusBar label="Removed" value={data.listings.removed} total={data.listings.total} color="#f43f5e" />
                    <div className="rounded-brand bg-surface-2 p-4 text-sm">
                      <p className="font-medium">Member health</p>
                      <p className="mt-1 text-muted">
                        {formatNumber(data.users.active)} active · {formatNumber(data.users.suspended)} suspended
                      </p>
                      <Link to="/users?status=suspended" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                        View suspended accounts →
                      </Link>
                    </div>
                  </>
                ) : (
                  isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
