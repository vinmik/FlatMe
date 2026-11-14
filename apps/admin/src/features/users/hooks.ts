import type { AdminUser, AdminUserQuery, Role, SetUserStatus } from "@flatme/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { api } from "@/lib/api";
import { findInPages, optimisticPatch } from "@/lib/queries";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (q: AdminUserQuery) => [...userKeys.lists(), q] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export function useUsers(q: AdminUserQuery) {
  return useQuery({ queryKey: userKeys.list(q), queryFn: () => api.users.list(q), placeholderData: keepPreviousData });
}

export function useUser(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => api.users.get(id as string),
    enabled: !!id,
    placeholderData: () => (id ? findInPages<AdminUser>(qc, userKeys.lists(), id) : undefined),
  });
}

function useUserMutation<V>(opts: {
  mutationFn: (v: V) => Promise<AdminUser | void>;
  id: (v: V) => string;
  patch?: (u: AdminUser, v: V) => AdminUser;
  remove?: boolean;
  success: (v: V, u: AdminUser | void) => string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: (v) =>
      optimisticPatch<AdminUser>(qc, {
        listKey: userKeys.lists(),
        detailKey: userKeys.detail(opts.id(v)),
        id: opts.id(v),
        ...(opts.patch ? { patch: (u: AdminUser) => opts.patch!(u, v) } : {}),
        ...(opts.remove ? { remove: true } : {}),
      }),
    onError: (_e, _v, rollback) => rollback?.(),
    onSuccess: (u, v) => {
      if (u) qc.setQueryData(userKeys.detail(u.id), u);
      if (opts.remove) qc.removeQueries({ queryKey: userKeys.detail(opts.id(v)) });
      toast.success(opts.success(v, u));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: userKeys.lists() });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useSetUserStatus() {
  return useUserMutation({
    mutationFn: ({ id, body }: { id: string; body: SetUserStatus }) => api.users.setStatus(id, body),
    id: (v) => v.id,
    patch: (u, { body }) => ({ ...u, status: body.status, suspendedReason: body.status === "suspended" ? (body.reason ?? null) : null }),
    success: ({ body }, u) => `${u ? u.fullName || u.email : "User"} ${body.status === "suspended" ? "suspended" : "reinstated"}`,
  });
}

export function useSetUserRole() {
  return useUserMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.users.setRole(id, role),
    id: (v) => v.id,
    patch: (u, { role }) => ({ ...u, role }),
    success: ({ role }, u) => `${u ? u.fullName || u.email : "User"} is now ${role === "admin" ? "an admin" : "a member"}`,
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useUserMutation({
    mutationFn: ({ id }: { id: string; email: string }) => api.users.remove(id).then(() => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
    }),
    id: (v) => v.id,
    remove: true,
    success: ({ email }) => `Deleted ${email}`,
  });
}
