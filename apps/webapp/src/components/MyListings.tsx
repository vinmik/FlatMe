"use client";

import { formatRupees, LIMITS, type ListingDetail } from "@flatme/shared";
import { Eye, Home, MessageSquare, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { listingHref, listingTitle } from "@/lib/areas";
import { useDeleteListing, useMyListings, useSetListingStatus } from "@/lib/hooks";
import { Badge, Button, buttonClass, Card, EmptyState, ErrorState, Modal, Skeleton } from "@/ui";
import { toast } from "@/ui/toast";

const STATUS = {
  active: { tone: "green", label: "Live" },
  paused: { tone: "amber", label: "Paused" },
  removed: { tone: "red", label: "Removed by FlatMe" },
} as const;

function Row({ listing, onDelete }: { listing: ListingDetail; onDelete: () => void }) {
  const setStatus = useSetListingStatus();
  const s = STATUS[listing.status];
  const title = listingTitle(listing);

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row">
      <div className="h-40 shrink-0 overflow-hidden rounded-xl bg-accent sm:h-28 sm:w-40">
        {listing.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.coverPhoto} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-primary/40">
            <Home className="size-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={s.tone}>{s.label}</Badge>
          <span className="text-sm text-muted">
            Posted {new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <h2 className="mt-1.5 truncate text-lg font-semibold">
          {listing.status === "active" ? (
            <Link href={listingHref(listing.id)} className="hover:text-primary">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted tabular">
          <span className="font-semibold text-fg">{formatRupees(listing.rent)} /month</span>
          <span className="flex items-center gap-1">
            <Eye className="size-4" aria-hidden />
            {listing.stats.views} views
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-4" aria-hidden />
            {listing.stats.inquiries} messages
          </span>
        </p>
        {listing.status === "removed" && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {listing.moderationReason ? `Reason: ${listing.moderationReason}` : "This listing was taken down by our team."} It is hidden from everyone else.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {listing.status !== "removed" && (
            <>
              <Link href={`/listing/${listing.id}/edit`} className={buttonClass("secondary", "sm")}>
                <Pencil className="size-4" aria-hidden />
                Edit
              </Link>
              <Button
                variant="secondary"
                size="sm"
                loading={setStatus.isPending}
                icon={listing.status === "paused" ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                onClick={() =>
                  setStatus.mutate(
                    { id: listing.id, status: listing.status === "paused" ? "active" : "paused" },
                    {
                      onSuccess: (l) => toast.success(l.status === "active" ? "Listing is live again" : "Listing paused. It is hidden from everyone else."),
                      onError: (e) => toast.error(errorMessage(e)),
                    },
                  )
                }
              >
                {listing.status === "paused" ? "Make live" : "Pause"}
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" icon={<Trash2 className="size-4" aria-hidden />} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function MyListings() {
  const { data, isPending, isError, error, refetch } = useMyListings();
  const del = useDeleteListing();
  const [deleting, setDeleting] = useState<ListingDetail | null>(null);
  const used = data?.filter((l) => l.status !== "removed").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My listings</h1>
          {data && data.length > 0 && (
            <p className="mt-1 text-muted">
              {used} of {LIMITS.listingsPerUser} listings used
            </p>
          )}
        </div>
        <Link href="/post" className={buttonClass("primary")}>
          <Plus className="size-4" aria-hidden />
          Post a room
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {isPending ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-brand" />)
        ) : isError ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState icon={<Home className="size-7" aria-hidden />} title="You haven't posted a room yet" body="Have a spare room or moving out? Post it and reach verified professionals near you." />
        ) : (
          data.map((l) => <Row key={l.id} listing={l} onDelete={() => setDeleting(l)} />)
        )}
      </div>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this listing?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep listing
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() =>
                deleting &&
                del.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success("Listing deleted");
                    setDeleting(null);
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              Delete listing
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-muted">{deleting && `"${listingTitle(deleting)}" and its messages will be removed for good. If the room is only taken for now, pause it instead.`}</p>
      </Modal>
    </div>
  );
}
