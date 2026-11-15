"use client";

import { type ListingDetail, type ListingInput, type ListingPage, type ListingSummary, type ReportInput, type SearchQuery, type UpdatePrefs, type UpdateProfile } from "@flatme/shared";
import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { useCoords, usePlace } from "./place";
import { refreshListings } from "./refresh";
import { useSession } from "./session";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

export const keys = {
  search: (q: unknown) => ["search", q] as const,
  listing: (id: string) => ["listing", id] as const,
  mine: ["my-listings"] as const,
  favorites: ["favorites"] as const,
};

/** Listing search. `initial` is the first page the server already rendered, so the list never starts empty. */
export function useSearch(query: Omit<SearchQuery, "cursor">, initial?: ListingPage) {
  return useInfiniteQuery({
    queryKey: keys.search(query),
    queryFn: ({ pageParam }) => api.search({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: initial ? { pages: [initial], pageParams: [undefined] } : undefined,
  });
}

/** Full listing with owner contact; only available to signed-in people. */
export function useListing(id: string, enabled = true) {
  const coords = useCoords();
  const signedIn = useSession((s) => !!s.token);
  return useQuery({ queryKey: keys.listing(id), queryFn: () => api.listing(id, coords), enabled: enabled && signedIn });
}

export function useFavorites() {
  const signedIn = useSession((s) => !!s.token);
  return useQuery({ queryKey: keys.favorites, queryFn: api.favorites, enabled: signedIn });
}

export function useFavoriteIds(): Set<string> {
  const { data } = useFavorites();
  return new Set(data?.map((l) => l.id));
}

/** Saves or unsaves at once on screen, and undoes it if the server refuses. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listing, favorite }: { listing: ListingSummary; favorite: boolean }) => api.setFavorite(listing.id, favorite),
    onMutate: async ({ listing, favorite }) => {
      await qc.cancelQueries({ queryKey: keys.favorites });
      const prev = qc.getQueryData<ListingSummary[]>(keys.favorites);
      qc.setQueryData<ListingSummary[]>(keys.favorites, (old = []) =>
        favorite ? [listing, ...old.filter((l) => l.id !== listing.id)] : old.filter((l) => l.id !== listing.id),
      );
      qc.setQueryData<ListingDetail>(keys.listing(listing.id), (d) => (d ? { ...d, isFavorite: favorite } : d));
      return { prev };
    },
    onError: (_e, { listing, favorite }, ctx) => {
      qc.setQueryData(keys.favorites, ctx?.prev);
      qc.setQueryData<ListingDetail>(keys.listing(listing.id), (d) => (d ? { ...d, isFavorite: !favorite } : d));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites }),
  });
}

export function useMyListings() {
  const signedIn = useSession((s) => !!s.token);
  return useQuery({ queryKey: keys.mine, queryFn: api.myListings, enabled: signedIn });
}

function invalidateListings(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: keys.mine });
  void qc.invalidateQueries({ queryKey: ["search"] });
  if (id) void qc.invalidateQueries({ queryKey: keys.listing(id) });
}

export function useSaveListing(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ListingInput) => {
      const saved = await (id ? api.updateListing(id, input) : api.createListing(input));
      await refreshListings(saved.id).catch(() => {});
      return saved;
    },
    onSuccess: (l) => {
      qc.setQueryData(keys.listing(l.id), l);
      invalidateListings(qc, l.id);
    },
  });
}

export function useSetListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" }) => {
      const saved = await api.setListingStatus(id, status);
      await refreshListings(id).catch(() => {});
      return saved;
    },
    onSuccess: (l) => {
      qc.setQueryData(keys.listing(l.id), l);
      invalidateListings(qc, l.id);
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.deleteListing(id);
      await refreshListings(id).catch(() => {});
    },
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: keys.listing(id) });
      invalidateListings(qc);
    },
  });
}

export function useSendInquiry(id: string) {
  return useMutation({ mutationFn: (message: string) => api.sendInquiry(id, message) });
}

export function useReportListing(id: string) {
  return useMutation({ mutationFn: (input: ReportInput) => api.reportListing(id, input) });
}

export function useUpdateProfile() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({ mutationFn: (input: UpdateProfile) => api.updateProfile(input), onSuccess: setUser });
}

export function useUpdatePrefs() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({ mutationFn: (input: UpdatePrefs) => api.updatePrefs(input), onSuccess: setUser });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await api.deleteAccount();
      await refreshListings().catch(() => {});
    },
    onSuccess: signOutEverywhere,
  });
}

/** Ends the session and reloads onto the home page, so nothing from the account stays in memory. */
export function signOutEverywhere() {
  queryClient.clear();
  useSession.getState().signOut();
  usePlace.getState().clear();
  window.location.assign("/");
}
