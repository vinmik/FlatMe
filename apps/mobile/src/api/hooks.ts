import type { ListingDetail, ListingInput, ListingSummary, ReportInput, SearchQuery, UpdatePrefs, UpdateProfile } from "@flatme/shared";
import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilters, useLocation } from "@/store/preferences";
import { useSession } from "@/store/session";
import { api } from "./index";
import { ApiError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

export const keys = {
  highlights: ["highlights"] as const,
  feed: (f: unknown, loc: unknown) => ["feed", f, loc] as const,
  search: (q: unknown) => ["search", q] as const,
  listing: (id: string) => ["listing", id] as const,
  mine: ["my-listings"] as const,
  favorites: ["favorites"] as const,
};

/* ───────────── Discovery ───────────── */

export function useHighlights() {
  return useQuery({ queryKey: keys.highlights, queryFn: () => api.highlights(), staleTime: 5 * 60_000 });
}

export function useFeed() {
  const filters = useFilters((s) => s.filters);
  const coords = useLocation((s) => s.coords);
  // Round so tiny GPS jitter doesn't refetch the feed.
  const loc = coords ? { lat: +coords.lat.toFixed(3), lng: +coords.lng.toFixed(3) } : null;
  return useQuery({ queryKey: keys.feed(filters, loc), queryFn: () => api.feed({ location: loc, filters }) });
}

export function useSearch(query: Omit<SearchQuery, "cursor">) {
  return useInfiniteQuery({
    queryKey: keys.search(query),
    queryFn: ({ pageParam }) => api.search({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useListing(id: string) {
  const coords = useLocation((s) => s.coords);
  return useQuery({ queryKey: keys.listing(id), queryFn: () => api.listing(id, coords), enabled: !!id });
}

/* ───────────── Favourites (optimistic) ───────────── */

export function useFavorites() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: keys.favorites, queryFn: () => api.favorites(), enabled: signedIn });
}

export function useFavoriteIds(): Set<string> {
  const { data } = useFavorites();
  return new Set(data?.map((l) => l.id));
}

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

/* ───────────── Listings I own ───────────── */

export function useMyListings() {
  return useQuery({ queryKey: keys.mine, queryFn: () => api.myListings() });
}

function invalidateListings(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: keys.mine });
  void qc.invalidateQueries({ queryKey: ["feed"] });
  void qc.invalidateQueries({ queryKey: ["search"] });
  if (id) void qc.invalidateQueries({ queryKey: keys.listing(id) });
}

export function useSaveListing(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ListingInput) => (id ? api.updateListing(id, input) : api.createListing(input)),
    onSuccess: (l) => {
      qc.setQueryData(keys.listing(l.id), l);
      invalidateListings(qc, l.id);
    },
  });
}

export function useSetListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) => api.setListingStatus(id, status),
    onSuccess: (l) => {
      qc.setQueryData(keys.listing(l.id), l);
      invalidateListings(qc, l.id);
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteListing(id),
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

/* ───────────── Profile ───────────── */

export function useUpdateProfile() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({ mutationFn: (input: UpdateProfile) => api.updateProfile(input), onSuccess: setUser });
}

export function useUpdatePrefs() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({ mutationFn: (input: UpdatePrefs) => api.updatePrefs(input), onSuccess: setUser });
}

export function useDeleteAccount() {
  const signOut = useSession((s) => s.signOut);
  return useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
    },
  });
}
