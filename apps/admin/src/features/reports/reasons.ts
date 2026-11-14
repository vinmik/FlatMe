import type { Report } from "@flatme/shared";
import type { BadgeTone } from "@/components/ui";

export const REASON_TONE: Record<Report["reason"], BadgeTone> = {
  scam: "danger",
  misleading: "warning",
  "already-taken": "info",
  inappropriate: "danger",
  duplicate: "neutral",
  other: "neutral",
};

export const REPORT_STATUS: Record<Report["status"], { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "warning" },
  resolved: { label: "Actioned", tone: "success" },
  dismissed: { label: "Dismissed", tone: "neutral" },
};
