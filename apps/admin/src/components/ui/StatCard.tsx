import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

export function CountUp({ value, format = formatNumber }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <span className="tabular">{format(display)}</span>;
}

export interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: "brand" | "emerald" | "amber" | "rose" | "violet";
  format?: (n: number) => string;
  index?: number;
}

const TONES = {
  brand: "bg-accent text-accent-fg",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
};

export function StatCard({ label, value, icon, hint, tone = "brand", format, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
    >
      <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-pop">
        <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-125" />
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted">{label}</p>
          <span className={cn("flex size-9 items-center justify-center rounded-[10px]", TONES[tone])}>{icon}</span>
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-fg">
          {value === undefined ? <Skeleton className="h-8 w-24" /> : <CountUp value={value} {...(format ? { format } : {})} />}
        </div>
        {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
      </Card>
    </motion.div>
  );
}
