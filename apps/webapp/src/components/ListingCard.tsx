"use client";

import { availabilityLabel, formatDistance, formatRupees, furnishingLabel, type ListingSummary } from "@flatme/shared";
import { BadgeCheck, Heart, Home, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { listingHref, listingTitle } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { useFavoriteIds, useToggleFavorite } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Badge } from "@/ui";

/** Save / unsave. Signed-out visitors are sent to sign in and brought back. */
export function HeartButton({ listing, className }: { listing: ListingSummary; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const signedIn = useSession((s) => !!s.token);
  const saved = useFavoriteIds().has(listing.id);
  const toggle = useToggleFavorite();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this flat"}
      onClick={() => (signedIn ? toggle.mutate({ listing, favorite: !saved }) : router.push(`/signin?next=${encodeURIComponent(path)}`))}
      className={cn(
        "flex size-9 items-center justify-center rounded-full shadow-md transition-transform active:scale-90",
        saved ? "bg-rose-500 text-white" : "bg-white/95 text-fg hover:text-rose-500",
        className,
      )}
    >
      <Heart className="size-[18px]" fill={saved ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}

export function ListingCard({ listing, active, onHover, className }: { listing: ListingSummary; active?: boolean; onHover?: (id: string | null) => void; className?: string }) {
  const distance = formatDistance(listing.distanceKm);
  return (
    <article
      onMouseEnter={onHover && (() => onHover(listing.id))}
      onMouseLeave={onHover && (() => onHover(null))}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-brand border bg-surface shadow-card transition-shadow hover:shadow-pop",
        active ? "border-primary ring-2 ring-primary/25" : "border-line",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-accent">
        {listing.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.coverPhoto} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-primary/40">
            <Home className="size-12" aria-hidden />
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          <Badge tone="glass">{furnishingLabel(listing.furnishing)}</Badge>
          {distance && <Badge tone="glass">{distance}</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-sm text-muted">
          {listing.owner.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified work email" />}
          <span className="truncate">
            {listing.owner.company} · {listing.owner.firstName}
          </span>
          <span className="ml-auto shrink-0 text-xs font-medium text-emerald-700">{availabilityLabel(listing.availableFrom, listing.flexible)}</span>
        </div>
        <h3 className="text-base leading-snug font-semibold">
          {/* The link covers the whole card; the heart sits above it. */}
          <Link href={listingHref(listing.id)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-brand focus-visible:after:outline-2 focus-visible:after:outline-primary">
            {listingTitle(listing)}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <p className="tabular">
            <span className="text-xl font-bold tracking-tight">{formatRupees(listing.rent)}</span>
            <span className="text-sm text-muted"> /month</span>
          </p>
          <p className="flex items-center gap-3 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Users className="size-4" aria-hidden />
              {listing.flatmates}
              <span className="sr-only">{listing.flatmates === 1 ? "flatmate" : "flatmates"}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {listing.area}
            </span>
          </p>
        </div>
      </div>
      <HeartButton listing={listing} className="absolute top-2.5 right-2.5 z-10" />
    </article>
  );
}
