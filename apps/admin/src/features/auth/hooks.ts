import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth/store";

export const authKeys = { me: ["auth", "me"] as const };

export function useRequestOtp() {
  return useMutation({ mutationFn: (email: string) => api.auth.requestOtp(email) });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: ({ email, code }: { email: string; code: string }) => api.auth.verifyOtp(email, code) });
}

/**
 * Re-validates the stored session against the API on load. A 401 signs out automatically
 * (via the API client); a role change away from admin also ends the session.
 */
export function useSessionCheck() {
  const { token } = useAuth();
  const me = useQuery({ queryKey: [...authKeys.me, token], queryFn: api.auth.me, enabled: !!token, staleTime: 5 * 60_000, retry: false });

  useEffect(() => {
    if (!me.data) return;
    if (me.data.role !== "admin") authStore.signOut("forbidden");
    else authStore.updateUser(me.data);
  }, [me.data]);

  return me;
}
