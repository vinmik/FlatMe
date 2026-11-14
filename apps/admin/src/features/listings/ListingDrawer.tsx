import { AMENITIES, availabilityLabel, type AdminListing } from "@flatme/shared";
import { BadgeCheck, Building2, Eye, ExternalLink, EyeOff, Flag, MessageSquare, PlayCircle, Trash2, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Avatar, Badge, Button, Drawer, ErrorState, Skeleton } from "@/components/ui";
import { formatDate, formatNumber, formatRelative, formatRupees, furnishingLabel } from "@/lib/format";
import { useListing } from "./hooks";
import { ListingStatusBadge, Locality, ReportsBadge, SeedBadge } from "./ListingBits";
import { ModerateModal } from "./ModerateModal";
import { PhotoCarousel } from "./PhotoCarousel";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

const GENDER = { any: "Anyone", male: "Men only", female: "Women only" } as const;

export function ListingDrawer({ listingId, onClose }: { listingId: string | null; onClose: () => void }) {
  const { data: l, error, refetch } = useListing(listingId);
  const [target, setTarget] = useState<AdminListing["status"] | null>(null);
  const title = l ? `${l.roomType} in ${l.locality}` : "Listing";

  return (
    <>
      <Drawer
        open={!!listingId}
        onClose={onClose}
        title={title}
        subtitle={l && <Locality listing={l} />}
        footer={
          l && (
            <>
              {l.status !== "removed" && (
                <Button
                  variant="ghost"
                  className="mr-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setTarget("removed")}
                >
                  Remove
                </Button>
              )}
              {l.status === "active" && (
                <Button variant="secondary" icon={<EyeOff className="size-4" />} onClick={() => setTarget("paused")}>
                  Pause
                </Button>
              )}
              {l.status !== "active" && (
                <Button icon={<PlayCircle className="size-4" />} onClick={() => setTarget("active")}>
                  {l.status === "removed" ? "Restore & activate" : "Activate"}
                </Button>
              )}
            </>
          )
        }
      >
        {error && !l ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !l ? (
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-brand" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <PhotoCarousel photos={l.photos} alt={title} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight tabular">
                  {formatRupees(l.rent)}
                  <span className="text-sm font-normal text-muted"> /month</span>
                </p>
                <p className="text-sm text-muted">Deposit {formatRupees(l.deposit)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ListingStatusBadge status={l.status} />
                <ReportsBadge count={l.openReports} />
                {l.seed && <SeedBadge />}
              </div>
            </div>

            {l.status === "removed" && l.moderationReason && (
              <div className="rounded-brand border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Removed by moderation</p>
                <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-200">{l.moderationReason}</p>
              </div>
            )}

            {l.openReports > 0 && (
              <Link
                to={`/reports?status=open&q=${encodeURIComponent(l.id)}`}
                className="flex items-center gap-3 rounded-brand border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <Flag className="size-4" />
                <span className="flex-1">
                  {l.openReports} open report{l.openReports === 1 ? "" : "s"} on this listing
                </span>
                <ExternalLink className="size-4" />
              </Link>
            )}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label="Room type">{l.roomType}</Fact>
              <Fact label="Furnishing">{furnishingLabel(l.furnishing)}</Fact>
              <Fact label="Preferred">{GENDER[l.genderPreference]}</Fact>
              <Fact label="Availability">{availabilityLabel(l.availableFrom, l.flexible)}</Fact>
              <Fact label="Flatmates">{l.flatmates}</Fact>
              <Fact label="Listed">{formatDate(l.createdAt)}</Fact>
            </dl>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-3 rounded-brand border border-line p-3">
                <Eye className="size-5 text-primary" />
                <div>
                  <p className="text-lg font-semibold tabular">{formatNumber(l.stats.views)}</p>
                  <p className="text-xs text-muted">views</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-brand border border-line p-3">
                <MessageSquare className="size-5 text-violet-500" />
                <div>
                  <p className="text-lg font-semibold tabular">{formatNumber(l.stats.inquiries)}</p>
                  <p className="text-xs text-muted">inquiries</p>
                </div>
              </div>
            </div>

            {l.description && (
              <section>
                <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Description</h3>
                <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{l.description}</p>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Amenities</h3>
              {l.amenities.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES.filter((a) => l.amenities.includes(a)).map((a) => (
                    <Badge key={a} tone="brand">
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">None listed</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Owner</h3>
              <div className="flex items-center gap-3 rounded-brand border border-line p-3">
                <Avatar name={l.contact.name} src={l.owner.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-medium">
                    {l.contact.name}
                    {l.owner.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    <Building2 className="size-3" /> {l.owner.designation ? `${l.owner.designation}, ` : ""}
                    {l.owner.company}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {l.contact.email}
                    {l.contact.phone ? ` · +91 ${l.contact.phone}` : ""}
                  </p>
                </div>
                <Link to={`/users?user=${encodeURIComponent(l.owner.id)}`} className="text-sm font-medium text-primary hover:underline">
                  <Users className="mr-1 inline size-4" />
                  Profile
                </Link>
              </div>
            </section>

            <p className="text-xs text-muted">
              ID {l.id} · updated {formatRelative(l.updatedAt)} · {l.location.lat.toFixed(4)}, {l.location.lng.toFixed(4)}
            </p>
          </div>
        )}
      </Drawer>
      {l && <ModerateModal listing={l} target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
