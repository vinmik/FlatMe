/** Pieces with no browser-only behaviour, safe to use from server-rendered pages. */
import { initials } from "@flatme/shared";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ───────────── Button ───────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover",
  secondary: "bg-surface text-fg border border-line shadow-sm hover:bg-canvas",
  ghost: "text-muted hover:text-fg hover:bg-gray-100",
  soft: "bg-accent text-primary-hover hover:brightness-95",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant, size, loading, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ───────────── Small pieces ───────────── */

export function Chip({ selected, children, className, ...rest }: { selected?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-fg hover:border-primary/50 hover:bg-primary-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "glass";
const TONES: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  brand: "bg-accent text-primary-hover",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  glass: "bg-white/90 text-fg backdrop-blur",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>{children}</span>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  return src ? (
    <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={style} aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary-hover">
      {initials(name || "?")}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gray-200/80", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-brand border border-line bg-surface shadow-card", className)}>{children}</div>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-sm px-4 py-16 text-center">
      <h2 className="text-lg font-semibold">That didn&apos;t load</h2>
      <p className="mt-1.5 text-[15px] text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

