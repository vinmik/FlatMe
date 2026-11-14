import type { Container, ItemDefinition, SqlParameter, SqlQuerySpec } from "@azure/cosmos";

/** Removes Cosmos system properties (_rid, _etag, _ts, …) so they never reach DTOs. */
export function clean<T>(doc: ItemDefinition | undefined | null): T | null {
  if (!doc) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) if (!k.startsWith("_")) out[k] = v;
  return out as T;
}

export async function queryAll<T>(container: Container, spec: SqlQuerySpec, partitionKey?: string): Promise<T[]> {
  const { resources } = await container.items
    .query<ItemDefinition>(spec, partitionKey !== undefined ? { partitionKey } : {})
    .fetchAll();
  return resources.map((r) => clean<T>(r) as T);
}

export async function queryValues<T>(container: Container, spec: SqlQuerySpec, partitionKey?: string): Promise<T[]> {
  const { resources } = await container.items
    .query<T>(spec, partitionKey !== undefined ? { partitionKey } : {})
    .fetchAll();
  return resources;
}

export async function queryCount(container: Container, where: string, parameters: SqlParameter[]): Promise<number> {
  const [n] = await queryValues<number>(container, { query: `SELECT VALUE COUNT(1) FROM c${where}`, parameters });
  return n ?? 0;
}

export async function readItem<T>(container: Container, id: string, partitionKey: string): Promise<T | null> {
  try {
    const { resource } = await container.item(id, partitionKey).read<ItemDefinition>();
    return clean<T>(resource);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function deleteItem(container: Container, id: string, partitionKey: string): Promise<void> {
  try {
    await container.item(id, partitionKey).delete();
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

export function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 404;
}

/** Small builder for parameterized WHERE clauses (values are never interpolated into SQL). */
export class Where {
  private readonly clauses: string[] = [];
  readonly parameters: SqlParameter[] = [];

  add(clause: string, params: Record<string, SqlParameter["value"]> = {}): this {
    this.clauses.push(clause);
    for (const [name, value] of Object.entries(params)) this.parameters.push({ name, value });
    return this;
  }

  toString(): string {
    return this.clauses.length ? ` WHERE ${this.clauses.join(" AND ")}` : "";
  }
}
