import type { Container } from "@azure/cosmos";
import type { AuditEntity, InquiryEntity, OtpEntity, ReportEntity } from "../../domain/entities";
import type {
  AuditCriteria,
  AuditRepository,
  InquiryRepository,
  OtpRepository,
  Paged,
  ReportCriteria,
  ReportRepository,
} from "../../ports";
import { deleteItem, queryAll, queryCount, queryValues, readItem, Where } from "./util";

/** `otps` container, partition key /email, id = email, per-item TTL. */
export class CosmosOtpRepository implements OtpRepository {
  constructor(private readonly c: Container) {}

  get(email: string): Promise<OtpEntity | null> {
    return readItem<OtpEntity>(this.c, email, email);
  }

  async upsert(otp: OtpEntity): Promise<void> {
    await this.c.items.upsert(otp);
  }

  delete(email: string): Promise<void> {
    return deleteItem(this.c, email, email);
  }
}

/** `inquiries` container, partition key /listingId. */
export class CosmosInquiryRepository implements InquiryRepository {
  constructor(private readonly c: Container) {}

  async create(inquiry: InquiryEntity): Promise<void> {
    await this.c.items.create(inquiry);
  }

  countFromUserSince(userId: string, sinceIso: string): Promise<number> {
    return queryCount(this.c, " WHERE c.fromUserId = @u AND c.createdAt >= @s", [
      { name: "@u", value: userId },
      { name: "@s", value: sinceIso },
    ]);
  }

  async deleteByListing(listingId: string): Promise<void> {
    const ids = await queryValues<string>(this.c, { query: "SELECT VALUE c.id FROM c" }, listingId);
    for (const id of ids) await deleteItem(this.c, id, listingId);
  }

  count(): Promise<number> {
    return queryCount(this.c, "", []);
  }

  createdSince(sinceIso: string): Promise<string[]> {
    return queryValues<string>(this.c, {
      query: "SELECT VALUE c.createdAt FROM c WHERE c.createdAt >= @s",
      parameters: [{ name: "@s", value: sinceIso }],
    });
  }
}

/** `reports` container, partition key /listingId. */
export class CosmosReportRepository implements ReportRepository {
  constructor(private readonly c: Container) {}

  async create(report: ReportEntity): Promise<void> {
    await this.c.items.create(report);
  }

  async get(id: string): Promise<ReportEntity | null> {
    const [r] = await queryAll<ReportEntity>(this.c, {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    });
    return r ?? null;
  }

  async update(report: ReportEntity): Promise<void> {
    await this.c.items.upsert(report);
  }

  async findOpen(reporterId: string, listingId: string): Promise<ReportEntity | null> {
    const [r] = await queryAll<ReportEntity>(
      this.c,
      {
        query: "SELECT * FROM c WHERE c.reporterId = @r AND c.status = 'open'",
        parameters: [{ name: "@r", value: reporterId }],
      },
      listingId,
    );
    return r ?? null;
  }

  countFromUserSince(userId: string, sinceIso: string): Promise<number> {
    return queryCount(this.c, " WHERE c.reporterId = @u AND c.createdAt >= @s", [
      { name: "@u", value: userId },
      { name: "@s", value: sinceIso },
    ]);
  }

  async query(q: ReportCriteria): Promise<Paged<ReportEntity>> {
    const w = new Where();
    if (q.status) w.add("c.status = @status", { "@status": q.status });
    if (q.text) {
      w.add(
        "(c.listingId = @t OR CONTAINS(c.reporterEmail, @t, true) OR CONTAINS(c.reason, @t, true) OR CONTAINS(c.details, @t, true))",
        { "@t": q.text },
      );
    }
    const [items, total] = await Promise.all([
      queryAll<ReportEntity>(this.c, {
        query: `SELECT * FROM c${w} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`,
        parameters: [...w.parameters, { name: "@offset", value: q.offset }, { name: "@limit", value: q.limit }],
      }),
      queryCount(this.c, w.toString(), w.parameters),
    ]);
    return { items, total };
  }

  async openCountsByListing(): Promise<Map<string, number>> {
    const ids = await queryValues<string>(this.c, { query: "SELECT VALUE c.listingId FROM c WHERE c.status = 'open'" });
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  async deleteByListing(listingId: string): Promise<void> {
    const ids = await queryValues<string>(this.c, { query: "SELECT VALUE c.id FROM c" }, listingId);
    for (const id of ids) await deleteItem(this.c, id, listingId);
  }
}

/** `audit` container, partition key /id, per-item TTL (365 days). */
export class CosmosAuditRepository implements AuditRepository {
  constructor(private readonly c: Container) {}

  async append(entry: AuditEntity): Promise<void> {
    await this.c.items.create(entry);
  }

  async query(q: AuditCriteria): Promise<Paged<AuditEntity>> {
    const w = new Where();
    if (q.targetId) w.add("c.targetId = @target", { "@target": q.targetId });
    if (q.text) {
      w.add("(CONTAINS(c.actorEmail, @t, true) OR CONTAINS(c.action, @t, true) OR CONTAINS(c.details, @t, true))", {
        "@t": q.text,
      });
    }
    const [items, total] = await Promise.all([
      queryAll<AuditEntity>(this.c, {
        query: `SELECT * FROM c${w} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`,
        parameters: [...w.parameters, { name: "@offset", value: q.offset }, { name: "@limit", value: q.limit }],
      }),
      queryCount(this.c, w.toString(), w.parameters),
    ]);
    return { items, total };
  }
}
