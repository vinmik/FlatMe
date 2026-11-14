import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/store";
import { config } from "@/lib/config";

export const statsKeys = { all: ["stats"] as const };

export function useStats() {
  const { token } = useAuth();
  return useQuery({ queryKey: statsKeys.all, queryFn: api.stats, enabled: config.authDisabled || !!token, refetchInterval: 60_000 });
}
