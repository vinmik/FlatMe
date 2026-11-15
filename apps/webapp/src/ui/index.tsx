"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export * from "./base";

/* ───────────── Form fields ───────────── */

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  left?: ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const fieldClass = (error?: string) =>
  cn(
    "w-full rounded-xl border bg-surface text-[15px] text-fg placeholder:text-subtle transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
    error ? "border-rose-400" : "border-line",
  );

export function Input({ label, error, hint, left, className, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint}>
      <div className="relative">
        {left && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5 text-muted">{left}</span>}
        <input
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          className={cn(fieldClass(error), "h-11 px-3.5", className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

export function Textarea({ label, error, hint, className, id, ...rest }: Omit<FieldProps, "left"> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fid}-msg` : undefined}
        className={cn(fieldClass(error), "min-h-28 resize-y px-3.5 py-2.5", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-gray-300")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
    </div>
  );
}

/* ───────────── Modal ───────────── */

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl bg-surface p-0 text-fg shadow-pop backdrop:bg-gray-900/45",
        wide ? "max-w-2xl" : "max-w-md",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
