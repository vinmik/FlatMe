import type { AdminListing } from "@flatme/shared";
import { Flag, ImageOff, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/cn";

export const LISTING_STATUS: Record<AdminListing["status"], { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  removed: { label: "Removed", tone: "danger" },
};

export function ListingStatusBadge({ status }: { status: AdminListing["status"] }) {
  const s = LISTING_STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ReportsBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge tone="danger" icon={<Flag className="size-3" />}>
      {count} open
    </Badge>
  );
}

export function SeedBadge() {
  return (
    <Badge tone="neutral" icon={<Sparkles className="size-3" />} title="Created by the seed script">
      Seed
    </Badge>
  );
}

/** Image with a graceful fallback for missing/broken photos. */
export function ListingPhoto({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 text-muted", className)} role="img" aria-label={alt}>
        <ImageOff className="size-6" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} className={cn("object-cover", className)} />;
}

export function Locality({ listing }: { listing: Pick<AdminListing, "locality" | "area"> }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-muted">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">
        {listing.locality}, {listing.area}
      </span>
    </span>
  );
}
