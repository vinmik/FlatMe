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
import { arrayCollection, clone, containsText, mapCollection, newestFirst, paginate, type MemoryCollection } from "./util";

export class MemoryOtpRepository implements OtpRepository {
  private readonly docs = new Map<string, OtpEntity>();

  collection(): MemoryCollection {
    return mapCollection(this.docs, (d) => d.email);
  }

  async get(email: string): Promise<OtpEntity | null> {
    const d = this.docs.get(email);
    return d ? clone(d) : null;
  }

  async upsert(otp: OtpEntity): Promise<void> {
    this.docs.set(otp.email, clone(otp));
  }

  async delete(email: string): Promise<void> {
    this.docs.delete(email);
  }
}

export class MemoryInquiryRepository implements InquiryRepository {
  readonly items: InquiryEntity[] = [];

  collection(): MemoryCollection {
    return arrayCollection(this.items);
  }

  async create(inquiry: InquiryEntity): Promise<void> {
    this.items.push(clone(inquiry));
  }

  async countFromUserSince(userId: string, sinceIso: string): Promise<number> {
    return this.items.filter((i) => i.fromUserId === userId && i.createdAt >= sinceIso).length;
  }

  async deleteByListing(listingId: string): Promise<void> {
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i]?.listingId === listingId) this.items.splice(i, 1);
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async createdSince(sinceIso: string): Promise<string[]> {
    return this.items.filter((i) => i.createdAt >= sinceIso).map((i) => i.createdAt);
  }
}

export class MemoryReportRepository implements ReportRepository {
  private readonly docs = new Map<string, ReportEntity>();

  constructor(seed: readonly ReportEntity[] = []) {
    for (const r of seed) this.docs.set(r.id, clone(r));
  }

  collection(): MemoryCollection {
    return mapCollection(this.docs);
  }

  async create(report: ReportEntity): Promise<void> {
    this.docs.set(report.id, clone(report));
  }

  async get(id: string): Promise<ReportEntity | null> {
    const r = this.docs.get(id);
    return r ? clone(r) : null;
  }

  async update(report: ReportEntity): Promise<void> {
    this.docs.set(report.id, clone(report));
  }

  async findOpen(reporterId: string, listingId: string): Promise<ReportEntity | null> {
    const r = [...this.docs.values()].find(
      (d) => d.reporterId === reporterId && d.listingId === listingId && d.status === "open",
    );
    return r ? clone(r) : null;
  }

  async countFromUserSince(userId: string, sinceIso: string): Promise<number> {
    return [...this.docs.values()].filter((r) => r.reporterId === userId && r.createdAt >= sinceIso).length;
  }

  async query(q: ReportCriteria): Promise<Paged<ReportEntity>> {
    const items = [...this.docs.values()]
      .filter(
        (r) =>
          (!q.status || r.status === q.status) &&
          containsText([r.listingId, r.reporterEmail, r.reason, r.details], q.text),
      )
      .sort(newestFirst);
    return paginate(items, q);
  }

  async openCountsByListing(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const r of this.docs.values()) {
      if (r.status === "open") counts.set(r.listingId, (counts.get(r.listingId) ?? 0) + 1);
    }
    return counts;
  }

  async deleteByListing(listingId: string): Promise<void> {
    for (const [id, r] of this.docs) if (r.listingId === listingId) this.docs.delete(id);
  }
}

export class MemoryAuditRepository implements AuditRepository {
  private readonly docs: AuditEntity[] = [];

  collection(): MemoryCollection {
    return arrayCollection(this.docs);
  }

  async append(entry: AuditEntity): Promise<void> {
    this.docs.push(clone(entry));
  }

  async query(q: AuditCriteria): Promise<Paged<AuditEntity>> {
    const items = this.docs
      .filter(
        (a) => (!q.targetId || a.targetId === q.targetId) && containsText([a.actorEmail, a.action, a.details], q.text),
      )
      .sort(newestFirst);
    return paginate(items, q);
  }
}
