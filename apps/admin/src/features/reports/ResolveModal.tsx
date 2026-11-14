import { REPORT_REASON_LABELS, type Report } from "@flatme/shared";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Modal, Segmented, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useResolveReport } from "./hooks";

export type ResolveIntent = { report: Report; removeListing: boolean } | null;

const TEMPLATES = {
  resolved: ["Verified with the owner and took action.", "Confirmed violation — listing taken down.", "Owner corrected the listing after a warning."],
  dismissed: ["Checked the listing — no policy violation found.", "Duplicate of an already-handled report.", "Not enough information to act on."],
} as const;

export function ResolveModal({ intent, onClose }: { intent: ResolveIntent; onClose: () => void }) {
  const [outcome, setOutcome] = useState<"resolved" | "dismissed">("resolved");
  const [removeListing, setRemoveListing] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useResolveReport();
  const last = useRef(intent);
  if (intent) last.current = intent;
  const report = last.current?.report;

  useEffect(() => {
    if (!intent) return;
    setOutcome("resolved");
    setRemoveListing(intent.removeListing);
    setResolution(intent.removeListing ? "Confirmed violation — listing taken down." : "");
    setError(undefined);
  }, [intent]);

  if (!report) return null;

  const submit = () => {
    const text = resolution.trim();
    if (text.length < 3) {
      setError("Add a short resolution note (3+ characters).");
      return;
    }
    mutation.mutate({ id: report.id, body: { status: outcome, resolution: text, removeListing: outcome === "resolved" && removeListing } });
    onClose();
  };

  const removing = outcome === "resolved" && removeListing;

  return (
    <Modal
      open={!!intent}
      onClose={onClose}
      size="lg"
      tone={removing ? "danger" : "default"}
      icon={removing ? <Trash2 className="size-5" /> : outcome === "resolved" ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
      title="Resolve report"
      description={
        <>
          <span className="font-medium text-fg">{REPORT_REASON_LABELS[report.reason]}</span> report on the {report.listingArea} listing by {report.reporterEmail}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={removing ? "danger" : "primary"} onClick={submit}>
            {removing ? "Resolve & remove listing" : outcome === "resolved" ? "Mark as actioned" : "Dismiss report"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {report.details && (
          <blockquote className="rounded-[10px] border-l-4 border-primary/50 bg-surface-2 px-4 py-3 text-sm text-fg italic">“{report.details}”</blockquote>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Outcome</p>
          <Segmented
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: "resolved", label: <><CheckCircle2 className="size-4" /> Actioned</> },
              { value: "dismissed", label: <><XCircle className="size-4" /> Dismissed</> },
            ]}
          />
        </div>
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-brand border p-3 transition",
            outcome !== "resolved" && "pointer-events-none opacity-50",
            removing ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40" : "border-line",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-rose-600"
            checked={removing}
            disabled={outcome !== "resolved"}
            onChange={(e) => setRemoveListing(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Also remove the listing</span>
            <span className="block text-xs text-muted">Takes it down immediately; the resolution note is shown to the owner.</span>
          </span>
        </label>
        <Textarea
          data-autofocus
          label="Resolution note"
          value={resolution}
          maxLength={500}
          onChange={(e) => {
            setResolution(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          hint="Recorded in the audit log."
        />
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES[outcome].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setResolution(t)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-muted transition hover:border-primary hover:text-primary"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
