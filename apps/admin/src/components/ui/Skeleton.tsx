import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Shimmering placeholder block. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200/70 dark:bg-slate-700/40",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-[var(--shimmer)] after:to-transparent",
        className,
      )}
      {...rest}
    />
  );
}

export function SkeletonRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-1/4" : "flex-1")} style={{ opacity: 1 - c * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
