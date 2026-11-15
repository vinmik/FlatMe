import {
  availabilityLabel,
  formatRupees,
  furnishingLabel,
  type ListingSummary,
} from "@flatme/shared";
import { BadgeCheck, Heart, Home, MapPin, ShieldCheck } from "lucide-react";

function MiniCard({ listing }: { listing: ListingSummary }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="relative h-28 bg-accent">
        {listing.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverPhoto}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-primary/40">
            <Home className="size-8" />
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium">
          {furnishingLabel(listing.furnishing)}
        </span>
        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-white/95 shadow">
          <Heart className="size-3.5" />
        </span>
      </div>
      <div className="p-2.5">
        <p className="flex items-center gap-1 text-[10px] text-muted">
          <BadgeCheck className="size-3 text-primary" />
          <span className="truncate">
            {listing.owner.company} · {listing.owner.firstName}
          </span>
          <span className="ml-auto shrink-0 font-medium text-emerald-700">
            {availabilityLabel(listing.availableFrom, listing.flexible)}
          </span>
        </p>
        <p className="mt-1 truncate text-xs font-semibold">
          {listing.roomType} in {listing.area}
        </p>
        <p className="mt-0.5 text-sm font-bold tabular">
          {formatRupees(listing.rent)}
          <span className="text-[10px] font-normal text-muted"> /month</span>
        </p>
      </div>
    </div>
  );
}

/** Decorative hero art: a phone showing real, current listings, with a few floating trust cues. */
export function HeroPhone({ listings }: { listings: ListingSummary[] }) {
  const [first, second] = listings;
  if (!first) return null;
  // The price label floats beside the second card, so it shows that card's listing.
  const price = second ?? first;

  return (
    <div
      aria-hidden
      className="relative hidden h-[572px] w-[440px] shrink-0 lg:block"
    >
      <div className="absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-200/70 via-accent to-transparent blur-2xl" />

      <div className="absolute inset-x-0 top-2 flex justify-center">
        <div className="w-[272px] animate-float">
          <div className="relative h-[548px] overflow-hidden rounded-[44px] border-[9px] border-gray-900 bg-canvas shadow-[0_40px_80px_-24px_rgba(8,60,80,0.45)]">
            <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
            <div className="px-3.5 pt-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted">Good evening 👋</p>
                  <p className="text-sm font-bold tracking-tight">
                    Find your next flat
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-medium shadow-card">
                  <MapPin className="size-3 text-primary" />
                  {first.area}
                </span>
              </div>
              <p className="mt-4 mb-2 text-xs font-semibold">Closest to you</p>
              <div className="space-y-2.5">
                <MiniCard listing={first} />
                {second && <MiniCard listing={second} />}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas to-transparent" />
          </div>
        </div>
      </div>

      <div className="absolute top-36 -left-2 flex animate-float-slow items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-pop">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <span>
          <span className="block text-xs font-semibold">
            Verified at {first.owner.company}
          </span>
          <span className="block text-[11px] text-muted">
            Work email confirmed
          </span>
        </span>
      </div>

      <div className="absolute top-[340px] -right-2 animate-float rounded-2xl bg-surface px-3.5 py-2.5 shadow-pop [animation-delay:-2s]">
        <span className="block text-[11px] text-muted">
          {price.roomType} · {price.area}
        </span>
        <span className="block text-base font-bold tabular">
          {formatRupees(price.rent)}
          <span className="text-xs font-normal text-muted"> /month</span>
        </span>
      </div>

      <div className="absolute top-[524px] left-2 flex animate-float-slow items-center gap-2 rounded-full bg-gray-900 px-3.5 py-2 text-xs font-medium text-white shadow-pop [animation-delay:-3s]">
        <span className="size-2 rounded-full bg-emerald-400" />
        No brokers, no fees
      </div>
    </div>
  );
}
