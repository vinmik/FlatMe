import { motion } from "motion/react";
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once all boxes are filled. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/** Segmented one-time-code input: auto-advances, supports backspace/arrow navigation and paste. */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid, autoFocus }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    focus(focusIndex);
    if (clean.length === length) onComplete?.(clean);
  };

  const setAt = (i: number, d: string) => {
    const arr = [...digits];
    arr[i] = d;
    // Keep the code contiguous: everything after a cleared box shifts out.
    const joined = arr.join("");
    return d ? joined : arr.slice(0, i).join("") + arr.slice(i + 1).join("");
  };

  const handleInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Autofill / IME delivering several digits into one box.
      const merged = (digits.slice(0, i).join("") + typed).slice(0, length);
      commit(merged, merged.length);
      return;
    }
    const d = typed.slice(-1);
    const prefix = digits.slice(0, i).join("");
    const next = prefix.length < i ? prefix + d : setAt(i, d);
    commit(next, Math.min(next.length, i + 1));
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) commit(setAt(i, ""), i);
      else if (i > 0) commit(setAt(i - 1, ""), i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted, pasted.length);
  };

  return (
    <motion.div
      role="group"
      aria-label="One-time code"
      className="flex justify-between gap-2 sm:gap-3"
      animate={invalid ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={d}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, scale: d ? [1, 1.08, 1] : 1 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
          className={cn(
            "h-14 w-full min-w-0 rounded-brand border bg-surface text-center text-2xl font-semibold text-fg tabular shadow-sm transition",
            "caret-primary focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none disabled:opacity-60",
            invalid ? "border-rose-400" : d ? "border-primary/60" : "border-line",
          )}
        />
      ))}
    </motion.div>
  );
}
