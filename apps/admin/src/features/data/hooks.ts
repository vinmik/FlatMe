import { DATA_PAGE_SIZE_DEFAULT, type DataBrowseQuery, type DataDocument, type DataPage } from "@flatme/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { api } from "@/lib/api";

export const dataKeys = {
  all: ["data"] as const,
  containers: () => [...dataKeys.all, "containers"] as const,
  lists: () => [...dataKeys.all, "list"] as const,
  browse: (container: string, q: DataBrowseQuery) => [...dataKeys.lists(), container, "browse", q] as const,
  query: (container: string, query: string, run: number) => [...dataKeys.lists(), container, "query", query, run] as const,
  doc: (container: string, id: string, pk: string) => [...dataKeys.all, "doc", container, id, pk] as const,
};

/** Flattens continuation pages into one list plus totals (RU are summed across loaded pages). */
export function flattenPages(data: InfiniteData<DataPage> | undefined) {
  const pages = data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.items),
    requestCharge: Math.round(pages.reduce((s, p) => s + p.requestCharge, 0) * 100) / 100,
    hasMore: !!pages[pages.length - 1]?.continuation,
  };
}

export function useDataContainers() {
  return useQuery({ queryKey: dataKeys.containers(), queryFn: () => api.data.containers(), staleTime: Infinity });
}

export function useBrowse(container: string | null, q: Omit<DataBrowseQuery, "continuation">) {
  return useInfiniteQuery({
    queryKey: dataKeys.browse(container ?? "", q),
    queryFn: ({ pageParam }) => api.data.browse(container!, { ...q, continuation: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: !!container,
  });
}

/** `run` increments on every explicit "Run" so re-running the same text refetches. */
export function useDataQuery(container: string | null, query: string | null, run: number) {
  return useInfiniteQuery({
    queryKey: dataKeys.query(container ?? "", query ?? "", run),
    queryFn: ({ pageParam }) =>
      api.data.query(container!, { query: query!, pageSize: DATA_PAGE_SIZE_DEFAULT, continuation: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: !!container && !!query,
    staleTime: Infinity,
  });
}

export function useDocument(container: string, key: { id: string; pk: string } | null) {
  return useQuery({
    queryKey: dataKeys.doc(container, key?.id ?? "", key?.pk ?? ""),
    queryFn: () => api.data.get(container, key!.id, key!.pk),
    enabled: !!key,
  });
}

function useInvalidateData() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: dataKeys.lists() });
    void qc.invalidateQueries({ queryKey: ["audit"] });
    // Raw edits can affect any typed view (users, listings, reports, stats).
    for (const key of ["users", "listings", "reports", "stats"]) void qc.invalidateQueries({ queryKey: [key], refetchType: "none" });
  };
}

export function useReplaceDocument(container: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ id, pk, doc }: { id: string; pk: string; doc: DataDocument }) => api.data.replace(container, id, pk, doc),
    onSuccess: (saved, { id, pk }) => {
      qc.setQueryData(dataKeys.doc(container, id, pk), saved);
      toast.success("Document saved", `${container}/${id}`);
    },
    onSettled: invalidate,
  });
}

export function useDeleteDocument(container: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ id, pk }: { id: string; pk: string }) => api.data.remove(container, id, pk),
    onSuccess: (_r, { id, pk }) => {
      qc.removeQueries({ queryKey: dataKeys.doc(container, id, pk) });
      toast.success("Document deleted", `${container}/${id}`);
    },
    onSettled: invalidate,
  });
}
