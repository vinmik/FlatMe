"use client";

import { errorMessage } from "@/lib/api";
import { useListing } from "@/lib/hooks";
import { ErrorState, Skeleton } from "@/ui";
import { ListingEditor } from "./ListingEditor";

export function EditListing({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useListing(id);
  if (isPending) {
    return (
      <div role="status" aria-label="Loading listing" className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 rounded-brand" />
        <Skeleton className="h-72 rounded-brand" />
      </div>
    );
  }
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  if (!data.isOwner) return <ErrorState message="Only the person who posted this listing can edit it." />;
  return <ListingEditor existing={data} />;
}
