import type { AdminReportQuery, Report, ResolveReport } from "@flatme/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { api } from "@/lib/api";
import { optimisticPatch } from "@/lib/queries";

export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (q: AdminReportQuery) => [...reportKeys.lists(), q] as const,
  detail: (id: string) => [...reportKeys.all, "detail", id] as const,
};

export function useReports(q: AdminReportQuery) {
  return useQuery({ queryKey: reportKeys.list(q), queryFn: () => api.reports.list(q), placeholderData: keepPreviousData });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveReport }) => api.reports.resolve(id, body),
    onMutate: ({ id, body }) =>
      optimisticPatch<Report>(qc, {
        listKey: reportKeys.lists(),
        detailKey: reportKeys.detail(id),
        id,
        patch: (r) => ({ ...r, status: body.status, resolution: body.resolution, resolvedAt: new Date().toISOString() }),
      }),
    onError: (_e, _v, rollback) => rollback?.(),
    onSuccess: (r, { body }) => {
      toast.success(
        r.status === "resolved" ? "Report resolved" : "Report dismissed",
        body.removeListing ? "The listing was removed and the owner notified." : undefined,
      );
    },
    onSettled: (_r, _e, { body }) => {
      void qc.invalidateQueries({ queryKey: reportKeys.lists() });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
      // Open-report counts (and possibly status) on listings changed.
      void qc.invalidateQueries({ queryKey: ["listings"], refetchType: body.removeListing ? "active" : "none" });
    },
  });
}
