import type { Container, Database, ItemDefinition, SqlParameter, SqlQuerySpec } from "@azure/cosmos";
import { DATA_CONTAINERS, type DataContainer } from "@flatme/shared";
import { BadRequestError, ConflictError, NotFoundError } from "../../domain/errors";
import type {
  DataBrowseFilter,
  DataExplorerRepository,
  DataPageRequest,
  DataPageResult,
  RawDocument,
} from "../../ports";
import { Where } from "./util";

/** Empty pages are possible on cross-partition queries; skip a few before returning one. */
const MAX_EMPTY_PAGES = 5;

function statusOf(err: unknown): number | undefined {
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  return typeof code === "number" ? code : undefined;
}

/** Extracts the human-readable part of a Cosmos query error ("Syntax error, incorrect syntax near …"). */
export function cosmosQueryMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const messages = [...raw.matchAll(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!.replace(/\\(.)/g, "$1"));
  const text = messages.length ? messages.join(" ") : (raw.split(/\r?\n/)[0] ?? raw).replace(/^Message:\s*/, "");
  return text.length > 300 ? `${text.slice(0, 297)}…` : text;
}

/** `contact.email` → `c["contact"]["email"]` (paths are pre-validated; brackets avoid reserved words). */
function fieldRef(path: string): string {
  return `c${path.split(".").map((p) => `["${p}"]`).join("")}`;
}

function conflictOrNotFound(err: unknown): never {
  const status = statusOf(err);
  if (status === 404) throw new NotFoundError("Document not found");
  if (status === 412 || status === 409) {
    throw new ConflictError("This document was changed by someone else. Reload it and try again.");
  }
  throw err;
}

export class CosmosDataExplorerRepository implements DataExplorerRepository {
  constructor(private readonly db: Database) {}

  containers(): readonly DataContainer[] {
    return DATA_CONTAINERS;
  }

  async browse(container: string, filter: DataBrowseFilter | undefined, page: DataPageRequest): Promise<DataPageResult> {
    const where = new Where();
    if (filter) {
      const ref = fieldRef(filter.field);
      if (filter.op === "contains") {
        where.add(`CONTAINS(ToString(${ref}), @value, true)`, { "@value": filter.value });
      } else {
        // Match the typed form too, so `rent = 12000` or `verified = true` work from a text box.
        const alts = [`${ref} = @value`];
        const params: Record<string, SqlParameter["value"]> = { "@value": filter.value };
        const n = Number(filter.value);
        if (filter.value.trim() !== "" && Number.isFinite(n)) {
          alts.push(`${ref} = @num`);
          params["@num"] = n;
        }
        if (filter.value === "true" || filter.value === "false") {
          alts.push(`${ref} = @bool`);
          params["@bool"] = filter.value === "true";
        }
        if (filter.value === "null") alts.push(`IS_NULL(${ref})`);
        where.add(`(${alts.join(" OR ")})`, params);
      }
    }
    return this.run(this.c(container), { query: `SELECT * FROM c${where} ORDER BY c._ts DESC`, parameters: where.parameters }, page);
  }

  async query(container: string, query: string, page: DataPageRequest): Promise<DataPageResult> {
    return this.run(this.c(container), { query }, page);
  }

  async get(container: string, id: string, partitionKey: string): Promise<RawDocument | null> {
    try {
      const { resource } = await this.c(container).item(id, partitionKey).read<ItemDefinition>();
      return (resource as RawDocument | undefined) ?? null;
    } catch (err) {
      if (statusOf(err) === 404) return null;
      throw err;
    }
  }

  async replace(container: string, doc: RawDocument, partitionKey: string, etag?: string): Promise<RawDocument> {
    try {
      const { resource } = await this.c(container)
        .item(doc.id, partitionKey)
        .replace(doc, etag ? { accessCondition: { type: "IfMatch", condition: etag } } : {});
      return resource as RawDocument;
    } catch (err) {
      return conflictOrNotFound(err);
    }
  }

  async delete(container: string, id: string, partitionKey: string, etag?: string): Promise<void> {
    try {
      await this.c(container)
        .item(id, partitionKey)
        .delete(etag ? { accessCondition: { type: "IfMatch", condition: etag } } : {});
    } catch (err) {
      conflictOrNotFound(err);
    }
  }

  private c(container: string): Container {
    if (!DATA_CONTAINERS.some((c) => c.name === container)) throw new NotFoundError(`Unknown container "${container}"`);
    return this.db.container(container);
  }

  private async run(container: Container, spec: SqlQuerySpec, page: DataPageRequest): Promise<DataPageResult> {
    try {
      const iterator = container.items.query(spec, {
        maxItemCount: page.pageSize,
        ...(page.continuation ? { continuationToken: page.continuation } : {}),
      });
      let requestCharge = 0;
      for (let attempt = 0; ; attempt++) {
        const res = await iterator.fetchNext();
        requestCharge += res.requestCharge ?? 0;
        const continuation = res.hasMoreResults ? (res.continuationToken ?? null) : null;
        if (res.resources.length > 0 || !continuation || attempt >= MAX_EMPTY_PAGES) {
          return { items: res.resources, continuation, requestCharge: Math.round(requestCharge * 100) / 100 };
        }
      }
    } catch (err) {
      if (statusOf(err) === 400) throw new BadRequestError(`Query failed: ${cosmosQueryMessage(err)}`);
      throw err;
    }
  }
}
