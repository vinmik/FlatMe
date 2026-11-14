import type { QueryClient, QueryKey } from "@tanstack/react-query";

interface Page<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

type Snapshot = [QueryKey, unknown][];

/**
 * Optimistically patches (or removes) an entity across every cached page under `listKey`
 * and its detail query. Returns a rollback function for `onError`.
 */
export async function optimisticPatch<T extends { id: string }>(
  qc: QueryClient,
  opts: { listKey: QueryKey; detailKey: QueryKey; id: string; patch?: (item: T) => T; remove?: boolean },
): Promise<() => void> {
  await Promise.all([qc.cancelQueries({ queryKey: opts.listKey }), qc.cancelQueries({ queryKey: opts.detailKey })]);
  const snapshot: Snapshot = [...qc.getQueriesData({ queryKey: opts.listKey }), [opts.detailKey, qc.getQueryData(opts.detailKey)]];

  qc.setQueriesData<Page<T>>({ queryKey: opts.listKey }, (page) => {
    if (!page?.items) return page;
    if (opts.remove) {
      const items = page.items.filter((i) => i.id !== opts.id);
      return { ...page, items, total: page.total - (page.items.length - items.length) };
    }
    return opts.patch ? { ...page, items: page.items.map((i) => (i.id === opts.id ? opts.patch!(i) : i)) } : page;
  });
  if (opts.patch) qc.setQueryData<T>(opts.detailKey, (d) => (d ? opts.patch!(d) : d));

  return () => snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
}

/** Finds an entity in any cached list page — used as instant placeholder data for detail views. */
export function findInPages<T extends { id: string }>(qc: QueryClient, listKey: QueryKey, id: string): T | undefined {
  for (const [, page] of qc.getQueriesData<Page<T>>({ queryKey: listKey })) {
    const hit = page?.items?.find((i) => i.id === id);
    if (hit) return hit;
  }
  return undefined;
}
