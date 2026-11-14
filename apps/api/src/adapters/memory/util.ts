import type { Paged, PageWindow } from "../../ports";

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function newestFirst(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

export function containsText(haystack: readonly (string | null | undefined)[], needle: string | undefined): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase();
  return haystack.some((h) => h?.toLowerCase().includes(n));
}

export function paginate<T>(items: readonly T[], w: PageWindow): Paged<T> {
  return { items: items.slice(w.offset, w.offset + w.limit).map(clone), total: items.length };
}
