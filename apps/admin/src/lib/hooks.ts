import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

/** Reads/writes a set of string filters in the URL query so views are shareable and survive reloads. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>;
  const set = useCallback(
    (patch: Partial<Record<K | string, string | null>>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v as string);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [values, set] as const;
}

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

/**
 * Cursor pagination for opaque API cursors: keeps a stack of the cursors that led to each page
 * so "Prev" works, and resets to page 1 whenever `resetKey` (the serialized filters) changes.
 */
export function useCursorPagination(resetKey: string) {
  const [state, setState] = useState<{ key: string; stack: (string | undefined)[] }>({ key: resetKey, stack: [undefined] });
  const stack = state.key === resetKey ? state.stack : [undefined];
  if (state.key !== resetKey) setState({ key: resetKey, stack });

  const next = useCallback(
    (cursor: string | null | undefined) => {
      if (cursor) setState((s) => ({ key: resetKey, stack: [...(s.key === resetKey ? s.stack : [undefined]), cursor] }));
    },
    [resetKey],
  );
  const prev = useCallback(() => setState((s) => ({ key: resetKey, stack: s.stack.length > 1 ? s.stack.slice(0, -1) : s.stack })), [resetKey]);
  const reset = useCallback(() => setState({ key: resetKey, stack: [undefined] }), [resetKey]);

  return { cursor: stack[stack.length - 1], page: stack.length, hasPrev: stack.length > 1, next, prev, reset };
}
