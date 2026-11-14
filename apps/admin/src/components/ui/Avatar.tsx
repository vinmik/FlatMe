import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const PALETTE = [
  "bg-cyan-100 text-cyan-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-sky-100 text-sky-800",
  "bg-lime-100 text-lime-800",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-14 text-lg" : "size-9 text-xs";
  if (src) return <img src={src} alt="" className={cn("rounded-full object-cover", dims, className)} />;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", dims, PALETTE[hash(name) % PALETTE.length], className)}
    >
      {initials(name)}
    </span>
  );
}
