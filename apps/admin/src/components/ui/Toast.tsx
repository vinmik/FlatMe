import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string | undefined;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function set(next: ToastItem[]) {
  items = next;
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  set(items.filter((t) => t.id !== id));
}

function push(tone: ToastTone, title: string, description?: string): number {
  const id = nextId++;
  set([...items.slice(-3), { id, tone, title, description }]);
  timers.set(id, setTimeout(() => dismissToast(id), tone === "error" ? 6500 : 4000));
  return id;
}

/** Imperative toast API; usable from hooks, mutations and non-React code. */
export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  info: (title: string, description?: string) => push("info", title, description),
  warning: (title: string, description?: string) => push("warning", title, description),
};

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <XCircle className="size-5 text-rose-500" />,
  info: <Info className="size-5 text-primary" />,
  warning: <AlertTriangle className="size-5 text-amber-500" />,
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => items;

export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-brand border border-line bg-surface p-4 shadow-pop",
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
