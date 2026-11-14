import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  loading?: boolean;
}

export function Pagination({ page, pageSize, total, hasPrev, hasNext, onPrev, onNext, loading }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-sm text-muted tabular">
        Showing <span className="font-medium text-fg">{formatNumber(from)}</span>–
        <span className="font-medium text-fg">{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-fg">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted sm:inline tabular">
          Page {page} of {pages}
        </span>
        <Button variant="secondary" size="sm" onClick={onPrev} disabled={!hasPrev || loading} icon={<ChevronLeft className="size-4" />} aria-label="Previous page">
          Prev
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={!hasNext || loading} aria-label="Next page">
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
