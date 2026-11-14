import type { AdminUser } from "@flatme/shared";
import { Ban, Briefcase, Calendar, Clock, ExternalLink, Home, Mail, Phone, ShieldCheck, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Avatar, Badge, Button, Drawer, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth/store";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { useUser } from "./hooks";
import { DeleteUserModal, RoleModal, StatusModal } from "./UserModals";

export function UserStatusBadge({ user }: { user: Pick<AdminUser, "status"> }) {
  return user.status === "suspended" ? (
    <Badge tone="danger" dot>
      Suspended
    </Badge>
  ) : (
    <Badge tone="success" dot>
      Active
    </Badge>
  );
}

export function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return role === "admin" ? (
    <Badge tone="violet" icon={<ShieldCheck className="size-3" />}>
      Admin
    </Badge>
  ) : (
    <Badge>Member</Badge>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] bg-surface-2 px-3 py-2.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate text-sm font-medium text-fg">{children}</dd>
      </div>
    </div>
  );
}

type ModalKind = "status" | "role" | "delete" | null;

export function UserDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data: user, error, refetch } = useUser(userId);
  const me = useAuth().user;
  const [modal, setModal] = useState<ModalKind>(null);
  const isSelf = !!user && user.id === me?.id;

  return (
    <>
      <Drawer
        open={!!userId}
        onClose={onClose}
        title={user ? user.fullName || user.email : "Member"}
        subtitle={user?.email}
        footer={
          user && (
            <>
              <Button
                variant="ghost"
                className="mr-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                icon={<Trash2 className="size-4" />}
                onClick={() => setModal("delete")}
                disabled={isSelf}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                icon={user.role === "admin" ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                onClick={() => setModal("role")}
                disabled={isSelf}
              >
                {user.role === "admin" ? "Demote" : "Make admin"}
              </Button>
              <Button
                variant={user.status === "active" ? "danger" : "primary"}
                icon={user.status === "active" ? <Ban className="size-4" /> : <UserCheck className="size-4" />}
                onClick={() => setModal("status")}
                disabled={isSelf}
              >
                {user.status === "active" ? "Suspend" : "Reinstate"}
              </Button>
            </>
          )
        }
      >
        {error && !user ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-40 w-full rounded-brand" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.fullName || user.email} src={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user.fullName || "—"}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <UserStatusBadge user={user} />
                  <RoleBadge role={user.role} />
                  {user.verified && <Badge tone="brand">Verified email</Badge>}
                  {!user.profileComplete && <Badge tone="warning">Profile incomplete</Badge>}
                </div>
              </div>
            </div>

            {isSelf && (
              <p className="rounded-[10px] bg-accent px-3 py-2 text-sm text-accent-fg">This is your account — actions are disabled.</p>
            )}

            {user.status === "suspended" && (
              <div className="rounded-brand border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Suspended</p>
                <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-200">{user.suspendedReason ?? "No reason recorded."}</p>
              </div>
            )}

            <dl className="grid gap-2 sm:grid-cols-2">
              <Detail icon={<Mail className="size-4" />} label="Email">
                {user.email}
              </Detail>
              <Detail icon={<Phone className="size-4" />} label="Phone">
                {user.phone ? `+91 ${user.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}` : "—"}
              </Detail>
              <Detail icon={<Briefcase className="size-4" />} label="Company">
                {user.company}
                {user.designation && <span className="font-normal text-muted"> · {user.designation}</span>}
              </Detail>
              <Detail icon={<Home className="size-4" />} label="Listings">
                {user.listingCount}
              </Detail>
              <Detail icon={<Calendar className="size-4" />} label="Joined">
                {formatDate(user.createdAt)}
              </Detail>
              <Detail icon={<Clock className="size-4" />} label="Last sign-in">
                <span title={formatDateTime(user.lastLoginAt)}>{formatRelative(user.lastLoginAt)}</span>
              </Detail>
            </dl>

            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Preferences</h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={user.notifications.newListings ? "info" : "neutral"}>New listing alerts {user.notifications.newListings ? "on" : "off"}</Badge>
                <Badge tone={user.notifications.messages ? "info" : "neutral"}>Messages {user.notifications.messages ? "on" : "off"}</Badge>
                <Badge tone={user.notifications.priceDrops ? "info" : "neutral"}>Price drops {user.notifications.priceDrops ? "on" : "off"}</Badge>
                <Badge tone={user.privacy.showPhone ? "info" : "neutral"}>Phone {user.privacy.showPhone ? "visible" : "hidden"}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user.listingCount > 0 && (
                <Link
                  to={`/listings?ownerId=${encodeURIComponent(user.id)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  View their listings <ExternalLink className="size-3.5" />
                </Link>
              )}
              <Link to={`/audit?targetId=${encodeURIComponent(user.id)}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Audit history <ExternalLink className="size-3.5" />
              </Link>
            </div>
            <p className="text-xs text-muted">ID: {user.id}</p>
          </div>
        )}
      </Drawer>

      {user && (
        <>
          <StatusModal user={user} open={modal === "status"} onClose={() => setModal(null)} />
          <RoleModal user={user} open={modal === "role"} onClose={() => setModal(null)} />
          <DeleteUserModal user={user} open={modal === "delete"} onClose={() => setModal(null)} onDeleted={onClose} />
        </>
      )}
    </>
  );
}
