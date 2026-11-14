import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminAuditQuery } from "@/lib/api/endpoints";

export const auditKeys = {
  all: ["audit"] as const,
  list: (q: AdminAuditQuery) => [...auditKeys.all, q] as const,
};

export function useAudit(q: AdminAuditQuery) {
  return useQuery({ queryKey: auditKeys.list(q), queryFn: () => api.audit.list(q), placeholderData: keepPreviousData });
}

