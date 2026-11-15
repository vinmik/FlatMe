import { createHash } from "node:crypto";
import {
  DATA_CONTAINERS,
  matchesBrowseFilter,
  matchesSimpleSelect,
  parseSimpleSelect,
  readPath,
  stripSystemProps,
  type DataContainer,
} from "@flatme/shared";
import { BadRequestError, ConflictError, NotFoundError } from "../../domain/errors";
import type {
  DataBrowseFilter,
  DataExplorerRepository,
  DataPageRequest,
  DataPageResult,
  RawDocument,
} from "../../ports";
import type { MemoryCollection } from "./util";

/** Content hash standing in for Cosmos `_etag`, so optimistic concurrency behaves the same locally. */
function etagOf(doc: Record<string, unknown>): string {
  return `"mem-${createHash("sha1").update(JSON.stringify(stripSystemProps(doc))).digest("hex").slice(0, 16)}"`;
}

const withEtag = (doc: Record<string, unknown>) => ({ ...stripSystemProps(doc), _etag: etagOf(doc) }) as unknown as RawDocument;

function byNewest(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const x = typeof a.createdAt === "string" ? a.createdAt : "";
  const y = typeof b.createdAt === "string" ? b.createdAt : "";
  return x < y ? 1 : x > y ? -1 : 0;
}

/**
 * In-memory Data Explorer over the memory repositories. Ad-hoc queries support only
 * `SELECT * FROM c [WHERE c.<path> = <literal> [AND …]]` (see `parseSimpleSelect`); anything
 * else is rejected with a 400 explaining the limitation. Request charge is always 0.
 */
export class MemoryDataExplorerRepository implements DataExplorerRepository {
  constructor(private readonly collections: Readonly<Record<string, MemoryCollection>>) {}

  containers(): readonly DataContainer[] {
    return DATA_CONTAINERS.filter((c) => c.name in this.collections);
  }

  async browse(container: string, filter: DataBrowseFilter | undefined, page: DataPageRequest): Promise<DataPageResult> {
    const docs = this.all(container).filter((d) => !filter || matchesBrowseFilter(d, filter));
    return this.page(docs.sort(byNewest), page);
  }

  async query(container: string, query: string, page: DataPageRequest): Promise<DataPageResult> {
    const parsed = parseSimpleSelect(query);
    if (!parsed) {
      throw new BadRequestError(
        "The in-memory store only supports SELECT * FROM c [WHERE c.field = 'value' [AND …]]. Connect to Cosmos DB for full SQL.",
      );
    }
    return this.page(this.all(container).filter((d) => matchesSimpleSelect(d, parsed)), page);
  }

  async get(container: string, id: string, partitionKey: string): Promise<RawDocument | null> {
    const doc = this.find(container, id, partitionKey);
    return doc ? withEtag(doc) : null;
  }

  async replace(container: string, doc: RawDocument, partitionKey: string, etag?: string): Promise<RawDocument> {
    this.current(container, doc.id, partitionKey, etag);
    const clean = stripSystemProps(doc);
    this.collection(container).put(clean);
    return withEtag(clean);
  }

  async delete(container: string, id: string, partitionKey: string, etag?: string): Promise<void> {
    this.current(container, id, partitionKey, etag);
    this.collection(container).remove(id);
  }

  private collection(container: string): MemoryCollection {
    const c = this.collections[container];
    if (!c) throw new NotFoundError(`Unknown container "${container}"`);
    return c;
  }

  private all(container: string): Record<string, unknown>[] {
    return this.collection(container).all();
  }

  private pkPath(container: string): string {
    return DATA_CONTAINERS.find((c) => c.name === container)?.partitionKeyPath ?? "/id";
  }

  private find(container: string, id: string, partitionKey: string): Record<string, unknown> | undefined {
    const path = this.pkPath(container);
    return this.all(container).find((d) => d.id === id && String(readPath(d, path)) === partitionKey);
  }

  private current(container: string, id: string, partitionKey: string, etag: string | undefined): Record<string, unknown> {
    const existing = this.find(container, id, partitionKey);
    if (!existing) throw new NotFoundError("Document not found");
    if (etag && etag !== etagOf(existing)) {
      throw new ConflictError("This document was changed by someone else. Reload it and try again.");
    }
    return existing;
  }

  private page(docs: Record<string, unknown>[], page: DataPageRequest): DataPageResult {
    const offset = page.continuation ? Number(page.continuation) : 0;
    if (!Number.isInteger(offset) || offset < 0) throw new BadRequestError("Invalid continuation token");
    const end = offset + page.pageSize;
    return {
      items: docs.slice(offset, end).map(withEtag),
      continuation: end < docs.length ? String(end) : null,
      requestCharge: 0,
    };
  }
}
