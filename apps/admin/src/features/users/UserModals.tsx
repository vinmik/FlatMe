import type { AdminUser } from "@flatme/shared";
import { AlertTriangle, ShieldCheck, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Modal, Textarea, Input } from "@/components/ui";
import { useDeleteUser, useSetUserRole, useSetUserStatus } from "./hooks";

export function StatusModal({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const suspending = user.status === "active";
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useSetUserStatus();

  useEffect(() => {
    if (open) {
      setReason("");
      setError(undefined);
    }
  }, [open]);

  const submit = () => {
    const trimmed = reason.trim();
    if (suspending && trimmed.length < 3) {
      setError("Give a reason (at least 3 characters) — it's shown to the member and logged.");
      return;
    }
    mutation.mutate({ id: user.id, body: { status: suspending ? "suspended" : "active", ...(trimmed ? { reason: trimmed } : {}) } });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone={suspending ? "danger" : "default"}
      icon={suspending ? <ShieldOff className="size-5" /> : <UserCheck className="size-5" />}
      title={suspending ? `Suspend ${user.fullName || user.email}?` : `Reinstate ${user.fullName || user.email}?`}
      description={
        suspending
          ? "They'll be signed out immediately and won't be able to sign in or contact listings. Their listings stay as they are."
          : "They'll be able to sign in and use FlatMe again."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={suspending ? "danger" : "primary"} onClick={submit} loading={mutation.isPending}>
            {suspending ? "Suspend account" : "Reinstate account"}
          </Button>
        </>
      }
    >
      <Textarea
        data-autofocus
        label={suspending ? "Reason" : "Note (optional)"}
        placeholder={suspending ? "e.g. Multiple verified scam reports" : "e.g. Appeal reviewed and accepted"}
        value={reason}
        maxLength={500}
        onChange={(e) => {
          setReason(e.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        hint={`${reason.length}/500 · recorded in the audit log`}
      />
    </Modal>
  );
}

export function RoleModal({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const promoting = user.role !== "admin";
  const mutation = useSetUserRole();
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={promoting ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
      tone={promoting ? "default" : "danger"}
      title={promoting ? "Grant admin access?" : "Remove admin access?"}
      description={
        promoting ? (
          <>
            <strong className="text-fg">{user.email}</strong> will be able to moderate listings, suspend members and see the audit log.
          </>
        ) : (
          <>
            <strong className="text-fg">{user.email}</strong> will lose access to this portal on their next request.
          </>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-autofocus
            variant={promoting ? "primary" : "danger"}
            onClick={() => {
              mutation.mutate({ id: user.id, role: promoting ? "admin" : "user" });
              onClose();
            }}
          >
            {promoting ? "Promote to admin" : "Demote to member"}
          </Button>
        </>
      }
    />
  );
}

export function DeleteUserModal({ user, open, onClose, onDeleted }: { user: AdminUser; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const mutation = useDeleteUser();
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<AlertTriangle className="size-5" />}
      title="Delete this account permanently?"
      description={
        <>
          This removes <strong className="text-fg">{user.fullName || user.email}</strong>, their profile and{" "}
          <strong className="text-fg">{user.listingCount} listing{user.listingCount === 1 ? "" : "s"}</strong>. This can&apos;t be undone.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!matches}
            loading={mutation.isPending}
            icon={<Trash2 className="size-4" />}
            onClick={() => {
              mutation.mutate({ id: user.id, email: user.email });
              onClose();
              onDeleted();
            }}
          >
            Delete account
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Input
          data-autofocus
          label={`Type ${user.email} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={user.email}
        />
      </form>
    </Modal>
  );
}
