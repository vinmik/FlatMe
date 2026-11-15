import {
  isPlainObject,
  readPath,
  stripSystemProps,
  validateReadOnlyQuery,
  type DataBrowseQuerySchema,
  type DataContainer,
  type DataPage,
  type DataQueryInputSchema,
} from "@flatme/shared";
import type { z } from "zod";
import type { UserEntity } from "../domain/entities";
import { BadRequestError, NotFoundError } from "../domain/errors";
import type { DataExplorerRepository, DataPageResult, RawDocument } from "../ports";
import type { AuditService } from "./auditService";

const MAX_LISTED_FIELDS = 8;

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const a = stripSystemProps(before);
  const b = stripSystemProps(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .sort();
}

const toPage = (r: DataPageResult): DataPage => ({ ...r, count: r.items.length });

/**
 * Admin Data Explorer: raw, allowlisted container access. Ad-hoc queries are validated as a single
 * read-only SELECT; every write is audited (`data.update` / `data.delete`, target `<container>/<id>`).
 */
export class DataExplorerService {
  constructor(
    private readonly repo: DataExplorerRepository,
    private readonly audit: AuditService,
  ) {}

  containers(): { items: DataContainer[] } {
    return { items: [...this.repo.containers()] };
  }

  async browse(container: string, q: z.output<typeof DataBrowseQuerySchema>): Promise<DataPage> {
    const c = this.container(container);
    const filter = q.field && q.value !== undefined ? { field: q.field, op: q.op, value: q.value } : undefined;
    return toPage(await this.repo.browse(c.name, filter, q));
  }

  async query(container: string, input: z.output<typeof DataQueryInputSchema>): Promise<DataPage> {
    const c = this.container(container);
    const problem = validateReadOnlyQuery(input.query);
    if (problem) throw new BadRequestError(problem);
    return toPage(await this.repo.query(c.name, input.query, input));
  }

  async get(container: string, id: string, partitionKey: string): Promise<RawDocument> {
    const doc = await this.repo.get(this.container(container).name, id, partitionKey);
    if (!doc) throw new NotFoundError("Document not found");
    return doc;
  }

  /** Full replace. `id` and the partition key value are immutable; `etag` (If-Match or body `_etag`) guards lost updates. */
  async replace(
    actor: UserEntity,
    container: string,
    id: string,
    partitionKey: string,
    body: unknown,
    ifMatch?: string,
  ): Promise<RawDocument> {
    const c = this.writable(container);
    if (!isPlainObject(body)) throw new BadRequestError("The document must be a JSON object");
    if (body.id !== id) throw new BadRequestError(`The document id can't be changed (expected "${id}")`);
    const pk = readPath(body, c.partitionKeyPath);
    if (typeof pk !== "string" || pk !== partitionKey) {
      throw new BadRequestError(`The partition key (${c.partitionKeyPath}) can't be changed (expected "${partitionKey}")`);
    }
    const etag = ifMatch || (typeof body._etag === "string" ? body._etag : undefined);

    const before = await this.get(c.name, id, partitionKey);
    const doc = { ...stripSystemProps(body), id } as RawDocument;
    const saved = await this.repo.replace(c.name, doc, partitionKey, etag);

    const changed = changedFields(before, doc);
    const summary = changed.length
      ? `changed ${changed.slice(0, MAX_LISTED_FIELDS).join(", ")}${changed.length > MAX_LISTED_FIELDS ? ` and ${changed.length - MAX_LISTED_FIELDS} more` : ""}`
      : "no field changes";
    await this.audit.record(actor, "data.update", "document", `${c.name}/${id}`, `Edited ${c.name}/${id} via Data Explorer: ${summary}`);
    return saved;
  }

  async delete(actor: UserEntity, container: string, id: string, partitionKey: string, ifMatch?: string): Promise<void> {
    const c = this.writable(container);
    await this.get(c.name, id, partitionKey);
    await this.repo.delete(c.name, id, partitionKey, ifMatch || undefined);
    await this.audit.record(
      actor,
      "data.delete",
      "document",
      `${c.name}/${id}`,
      `Deleted ${c.name}/${id} (partition key "${partitionKey}") via Data Explorer`,
    );
  }

  private container(name: string): DataContainer {
    const c = this.repo.containers().find((x) => x.name === name);
    if (!c) throw new NotFoundError(`Unknown container "${name}"`);
    return c;
  }

  private writable(name: string): DataContainer {
    const c = this.container(name);
    if (!c.writable) throw new BadRequestError(`The ${c.name} container is read-only in the Data Explorer`);
    return c;
  }
}
