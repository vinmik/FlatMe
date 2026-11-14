import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openOverlays = 0;

/**
 * Accessibility plumbing shared by Modal and Drawer: traps Tab focus inside the panel,
 * closes on Escape, locks body scroll, and restores focus to the opener on close.
 */
export function useOverlay(open: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    openOverlays += 1;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const panel = ref.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const auto = panel.querySelector<HTMLElement>("[data-autofocus]");
      (auto ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current;
      if (!panel) return;
      // Only the top-most overlay reacts.
      const all = document.querySelectorAll("[data-overlay-panel]");
      if (all[all.length - 1] !== panel) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      openOverlays -= 1;
      if (openOverlays === 0) document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open]);

  return ref;
}
