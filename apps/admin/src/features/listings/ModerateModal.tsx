import type { AdminListing } from "@flatme/shared";
import { EyeOff, PlayCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { useModerateListing } from "./hooks";

type Target = AdminListing["status"];

const COPY: Record<Target, { title: string; body: string; cta: string; placeholder: string }> = {
  active: {
    title: "Re-activate this listing?",
    body: "It will be visible in search and the feed again.",
    cta: "Activate listing",
    placeholder: "e.g. Owner fixed the photos after review",
  },
  paused: {
    title: "Pause this listing?",
    body: "It will be hidden from search until it's re-activated. The owner can still see it.",
    cta: "Pause listing",
    placeholder: "e.g. Waiting for the owner to confirm availability",
  },
  removed: {
    title: "Remove this listing?",
    body: "It will be taken down and the owner will see your reason. Use this for policy violations.",
    cta: "Remove listing",
    placeholder: "e.g. Confirmed broker listing — violates our direct-owner policy",
  },
};

export function ModerateModal({ listing, target, onClose }: { listing: AdminListing; target: Target | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useModerateListing();

  useEffect(() => {
    if (target) {
      setReason("");
      setError(undefined);
    }
  }, [target]);

  // Keep the last target so the copy doesn't change during the exit animation.
  const last = useRef<Target>(target ?? "paused");
  if (target) last.current = target;
  const shown = last.current;
  const copy = COPY[shown];
  const submit = () => {
    if (!target) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("A reason is required for every moderation action (3+ characters).");
      return;
    }
    mutation.mutate({ id: listing.id, body: { status: target, reason: trimmed } });
    onClose();
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      tone={shown === "removed" ? "danger" : "default"}
      icon={shown === "removed" ? <Trash2 className="size-5" /> : shown === "paused" ? <EyeOff className="size-5" /> : <PlayCircle className="size-5" />}
      title={copy.title}
      description={
        <>
          <span className="font-medium text-fg">
            {listing.roomType} · {listing.locality}, {listing.area}
          </span>
          <br />
          {copy.body}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={shown === "removed" ? "danger" : "primary"} onClick={submit}>
            {copy.cta}
          </Button>
        </>
      }
    >
      <Textarea
        data-autofocus
        label="Reason"
        value={reason}
        maxLength={500}
        placeholder={copy.placeholder}
        onChange={(e) => {
          setReason(e.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        hint={`${reason.length}/500 · recorded in the audit log${shown === "removed" ? " and shown to the owner" : ""}`}
      />
    </Modal>
  );
}
