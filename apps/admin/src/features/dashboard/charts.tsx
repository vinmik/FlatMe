import type { AdminStats } from "@flatme/shared";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { cn } from "@/lib/cn";
import { formatNumber, formatRupees, formatShortDate } from "@/lib/format";

const AXIS = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

type TipProps = TooltipContentProps<TooltipValueType, string | number>;

function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; color?: string | undefined }[] }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-fg">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-muted">
          {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
          <span className="flex-1">{r.label}</span>
          <span className="font-medium text-fg tabular">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Shown instead of an empty plot so a fresh environment doesn't look broken. */
function ChartEmpty({ className, children }: { className: string; children: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-brand border border-dashed border-line text-sm text-muted", className)}>
      <BarChart3 className="size-6 opacity-50" aria-hidden />
      {children}
    </div>
  );
}

const SERIES = [
  { key: "signups", label: "Sign-ups", color: "#0891b2" },
  { key: "listings", label: "New listings", color: "#10b981" },
  { key: "inquiries", label: "Inquiries", color: "#8b5cf6" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

export function TimelineChart({ data }: { data: AdminStats["timeline"] }) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const toggle = (k: SeriesKey) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else if (n.size < SERIES.length - 1) n.add(k);
      return n;
    });

  if (!data.some((d) => d.signups || d.listings || d.inquiries)) {
    return <ChartEmpty className="h-80">No activity in the last 14 days</ChartEmpty>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Toggle series">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={!hidden.has(s.key)}
            onClick={() => toggle(s.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
              hidden.has(s.key) ? "border-line text-muted opacity-60" : "border-transparent bg-surface-2 text-fg",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      <div className="h-72" role="img" aria-label="Daily sign-ups, new listings and inquiries over the last 14 days">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} {...AXIS} minTickGap={16} />
            <YAxis allowDecimals={false} {...AXIS} />
            <Tooltip
              cursor={{ stroke: "var(--line)", strokeWidth: 1 }}
              content={(p: TipProps) =>
                p.active && p.payload?.length ? (
                  <TooltipCard
                    title={formatShortDate(String(p.label))}
                    rows={p.payload.map((e) => ({
                      label: SERIES.find((s) => s.key === e.dataKey)?.label ?? String(e.name),
                      value: formatNumber(Number(e.value)),
                      color: e.color,
                    }))}
                  />
                ) : null
              }
            />
            {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.2}
                fill={`url(#g-${s.key})`}
                animationDuration={900}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AreaBarChart({ data }: { data: AdminStats["byArea"] }) {
  const sorted = [...data].sort((a, b) => b.listings - a.listings);
  if (sorted.length === 0) return <ChartEmpty className="h-80">No listings yet</ChartEmpty>;
  return (
    <div className="h-80" role="img" aria-label="Listings by area">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="4 4" />
          <XAxis type="number" allowDecimals={false} {...AXIS} />
          <YAxis type="category" dataKey="area" width={118} {...AXIS} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            content={(p: TipProps) => {
              const row = p.payload?.[0]?.payload as AdminStats["byArea"][number] | undefined;
              return p.active && row ? (
                <TooltipCard
                  title={row.area}
                  rows={[
                    { label: "Listings", value: formatNumber(row.listings), color: "#0891b2" },
                    { label: "Avg rent", value: formatRupees(row.avgRent) },
                  ]}
                />
              ) : null;
            }}
          />
          <Bar dataKey="listings" radius={[0, 6, 6, 0]} animationDuration={900}>
            {sorted.map((d, i) => (
              <Cell key={d.area} fill={i < 3 ? "#0891b2" : "#67e8f9"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const DONUT = ["#0891b2", "#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#94a3b8"];

export function CompanyDonut({ data }: { data: AdminStats["byCompany"] }) {
  const sorted = [...data].sort((a, b) => b.users - a.users);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6).reduce((sum, c) => sum + c.users, 0);
  const slices = rest > 0 ? [...top, { company: "Others", users: rest }] : top;
  const total = slices.reduce((s, c) => s + c.users, 0);
  if (total === 0) return <ChartEmpty className="h-52">No members yet</ChartEmpty>;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-52 w-full" role="img" aria-label="Users by company">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="users" nameKey="company" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={900}>
              {slices.map((s, i) => (
                <Cell key={s.company} fill={DONUT[i % DONUT.length]} />
              ))}
            </Pie>
            <Tooltip
              content={(p: TipProps) => {
                const e = p.payload?.[0];
                return p.active && e ? (
                  <TooltipCard
                    title={String(e.name)}
                    rows={[{ label: "Users", value: `${formatNumber(Number(e.value))} (${Math.round((Number(e.value) / Math.max(total, 1)) * 100)}%)` }]}
                  />
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular">{formatNumber(total)}</span>
          <span className="text-xs text-muted">members</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {slices.map((s, i) => (
          <li key={s.company} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
            <span className="flex-1 truncate text-muted">{s.company}</span>
            <span className="font-medium tabular">{s.users}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
