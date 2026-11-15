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

/**
 * Untyped view over a memory repository's documents, used by the Data Explorer so explorer edits
 * hit the same data the app reads (as they do against Cosmos).
 */
export interface MemoryCollection {
  all(): Record<string, unknown>[];
  put(doc: Record<string, unknown>): void;
  remove(id: string): void;
}

export function mapCollection<T>(docs: Map<string, T>, key: (doc: T) => string = (d) => (d as { id: string }).id): MemoryCollection {
  return {
    all: () => [...docs.values()].map((d) => clone(d) as Record<string, unknown>),
    put: (doc) => void docs.set(key(doc as T), clone(doc) as T),
    remove: (id) => {
      for (const [k, d] of docs) if ((d as { id?: unknown }).id === id) docs.delete(k);
    },
  };
}

export function arrayCollection<T extends { id: string }>(items: T[]): MemoryCollection {
  return {
    all: () => items.map((d) => clone(d) as unknown as Record<string, unknown>),
    put: (doc) => {
      const i = items.findIndex((d) => d.id === doc.id);
      if (i >= 0) items[i] = clone(doc) as T;
      else items.push(clone(doc) as T);
    },
    remove: (id) => {
      const i = items.findIndex((d) => d.id === id);
      if (i >= 0) items.splice(i, 1);
    },
  };
}
