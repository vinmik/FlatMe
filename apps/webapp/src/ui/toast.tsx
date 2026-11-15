import { CheckCircle2, CircleAlert } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/cn";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  text: string;
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let nextId = 1;

function push(kind: ToastItem["kind"], text: string) {
  const id = nextId++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, kind, text }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), kind === "error" ? 6000 : 3500);
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[2000] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-pop",
            t.kind === "error" ? "bg-rose-600" : "bg-gray-900",
          )}
        >
          {t.kind === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
