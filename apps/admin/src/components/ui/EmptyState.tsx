import { motion } from "motion/react";
import type { ReactNode } from "react";

type Illustration = "search" | "inbox" | "shield" | "error" | "lost";

function Art({ kind }: { kind: Illustration }) {
  const common = (
    <>
      <circle cx="100" cy="80" r="64" fill="#e0f2fe" />
      <circle cx="160" cy="34" r="6" fill="#a5f3fc" />
      <circle cx="40" cy="128" r="4" fill="#a5f3fc" />
      <circle cx="34" cy="40" r="3" fill="#0891b2" opacity=".4" />
    </>
  );
  switch (kind) {
    case "search":
      return (
        <svg viewBox="0 0 200 160" className="h-32 w-40" aria-hidden>
          {common}
          <rect x="54" y="46" width="76" height="92" rx="10" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
          <rect x="66" y="62" width="44" height="6" rx="3" fill="#e5e7eb" />
          <rect x="66" y="76" width="52" height="6" rx="3" fill="#e5e7eb" />
          <rect x="66" y="90" width="36" height="6" rx="3" fill="#e5e7eb" />
          <circle cx="124" cy="96" r="22" fill="#fff" stroke="#0891b2" strokeWidth="6" />
          <path d="m140 112 18 18" stroke="#0891b2" strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 200 160" className="h-32 w-40" aria-hidden>
          {common}
          <path d="M100 30 142 46v34c0 26-18 44-42 52-24-8-42-26-42-52V46Z" fill="#fff" stroke="#0891b2" strokeWidth="4" />
          <path d="m82 82 13 13 24-26" fill="none" stroke="#10b981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg viewBox="0 0 200 160" className="h-32 w-40" aria-hidden>
          <circle cx="100" cy="80" r="64" fill="#ffe4e6" />
          <path d="M100 38 146 120H54Z" fill="#fff" stroke="#e11d48" strokeWidth="4" strokeLinejoin="round" />
          <path d="M100 68v24" stroke="#e11d48" strokeWidth="7" strokeLinecap="round" />
          <circle cx="100" cy="106" r="4.5" fill="#e11d48" />
        </svg>
      );
    case "lost":
      return (
        <svg viewBox="0 0 200 160" className="h-32 w-40" aria-hidden>
          {common}
          <path d="M60 86 100 54l40 32v42a4 4 0 0 1-4 4H64a4 4 0 0 1-4-4Z" fill="#fff" stroke="#0891b2" strokeWidth="4" />
          <path d="M50 90 100 50l50 40" fill="none" stroke="#0891b2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <text x="100" y="118" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0891b2" fontFamily="Inter, sans-serif">?</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 200 160" className="h-32 w-40" aria-hidden>
          {common}
          <path d="M48 84 66 50h68l18 34v40a6 6 0 0 1-6 6H54a6 6 0 0 1-6-6Z" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
          <path d="M48 84h32l6 12h28l6-12h32" fill="none" stroke="#0891b2" strokeWidth="4" strokeLinejoin="round" />
          <path d="M84 66h32" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
  }
}

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  illustration?: Illustration;
  action?: ReactNode;
}

export function EmptyState({ title, description, illustration = "inbox", action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <Art kind={illustration} />
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
