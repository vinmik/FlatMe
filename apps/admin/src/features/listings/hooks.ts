import type { AdminListing, AdminListingQuery, ModerateListing } from "@flatme/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { api } from "@/lib/api";
import { findInPages, optimisticPatch } from "@/lib/queries";

export const listingKeys = {
  all: ["listings"] as const,
  lists: () => [...listingKeys.all, "list"] as const,
  list: (q: AdminListingQuery) => [...listingKeys.lists(), q] as const,
  detail: (id: string) => [...listingKeys.all, "detail", id] as const,
};

export function useListings(q: AdminListingQuery) {
  return useQuery({ queryKey: listingKeys.list(q), queryFn: () => api.listings.list(q), placeholderData: keepPreviousData });
}

export function useListing(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: listingKeys.detail(id ?? ""),
    queryFn: () => api.listings.get(id as string),
    enabled: !!id,
    placeholderData: () => (id ? findInPages<AdminListing>(qc, listingKeys.lists(), id) : undefined),
  });
}

const VERB: Record<AdminListing["status"], string> = { active: "activated", paused: "paused", removed: "removed" };

export function useModerateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ModerateListing }) => api.listings.moderate(id, body),
    onMutate: ({ id, body }) =>
      optimisticPatch<AdminListing>(qc, {
        listKey: listingKeys.lists(),
        detailKey: listingKeys.detail(id),
        id,
        patch: (l) => ({ ...l, status: body.status, moderationReason: body.status === "removed" ? (body.reason ?? null) : null }),
      }),
    onError: (_e, _v, rollback) => rollback?.(),
    onSuccess: (l) => {
      qc.setQueryData(listingKeys.detail(l.id), l);
      toast.success(`Listing ${VERB[l.status]}`, `${l.roomType} in ${l.locality}, ${l.area}`);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: listingKeys.lists() });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
