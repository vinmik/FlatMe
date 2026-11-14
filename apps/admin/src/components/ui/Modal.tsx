import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useOverlay } from "./useOverlay";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "danger";
}

export function Modal({ open, onClose, title, description, icon, children, footer, size = "md", tone = "default" }: ModalProps) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();
  const descId = useId();

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            data-overlay-panel
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "relative w-full rounded-2xl border border-line bg-surface shadow-pop focus:outline-none",
              size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md",
            )}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start gap-3 px-6 pt-6">
              {icon && (
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    tone === "danger" ? "bg-rose-100 text-rose-600 dark:bg-rose-950" : "bg-accent text-accent-fg",
                  )}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id={titleId} className="text-base font-semibold text-fg">
                  {title}
                </h2>
                {description && (
                  <div id={descId} className="mt-1 text-sm text-muted">
                    {description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mt-1 -mr-2 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>
            {children && <div className="px-6 pt-5">{children}</div>}
            {footer && <div className="mt-6 flex justify-end gap-2 rounded-b-2xl border-t border-line bg-surface-2 px-6 py-4">{footer}</div>}
            {!footer && <div className="h-6" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
