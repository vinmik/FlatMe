import {
  toIsoDate,
  type AdminAuditQuerySchema,
  type AdminListing,
  type AdminListingQuerySchema,
  type AdminReportQuerySchema,
  type AdminStats,
  type AdminUser,
  type AdminUserQuerySchema,
  type AuditEntry,
  type ModerateListingSchema,
  type Report,
  type ResolveReportSchema,
  type Role,
  type SetUserStatusSchema,
} from "@flatme/shared";
import type { z } from "zod";
import type { ListingEntity, UserEntity } from "../domain/entities";
import { BadRequestError, ConflictError, NotFoundError } from "../domain/errors";
import { toAdminListing, toAdminUser } from "../domain/mappers";
import type {
  AuditRepository,
  Clock,
  InquiryRepository,
  ListingRepository,
  ReportRepository,
  UserRepository,
} from "../ports";
import type { AuditService } from "./auditService";
import { decodeCursor, nextCursor } from "./cursor";
import type { ListingService } from "./listingService";
import type { UserService } from "./userService";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_DAYS = 14;
const TOP_COMPANIES = 15;
const DEFAULT_REMOVAL_REASON = "Removed by FlatMe moderation for violating our listing guidelines";

interface Page<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

/**
 * Back-office use cases. Every mutation writes an audit entry. Callers must already have
 * passed the admin guard (role re-checked against the stored user document).
 */
export class AdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
    private readonly inquiries: InquiryRepository,
    private readonly reports: ReportRepository,
    private readonly userService: UserService,
    private readonly listingService: ListingService,
    private readonly audit: AuditService,
    private readonly auditLog: AuditRepository,
    private readonly clock: Clock,
  ) {}

  /* ───────────── Dashboard ───────────── */

  async stats(): Promise<AdminStats> {
    const now = this.clock.now();
    const since7d = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    const timelineStart = toIsoDate(new Date(now.getTime() - (TIMELINE_DAYS - 1) * DAY_MS));
    const [userRows, listingRows, inquiryTotal, recentInquiries, openReports] = await Promise.all([
      this.users.statsRows(),
      this.listings.statsRows(),
      this.inquiries.count(),
      this.inquiries.createdSince(timelineStart),
      this.reports.openCountsByListing(),
    ]);

    const byArea = new Map<string, { listings: number; rentSum: number }>();
    for (const l of listingRows) {
      if (l.status === "removed") continue;
      const a = byArea.get(l.area) ?? { listings: 0, rentSum: 0 };
      a.listings += 1;
      a.rentSum += l.rent;
      byArea.set(l.area, a);
    }
    const byCompany = new Map<string, number>();
    for (const u of userRows) if (u.company) byCompany.set(u.company, (byCompany.get(u.company) ?? 0) + 1);

    const timeline = Array.from({ length: TIMELINE_DAYS }, (_, i) => {
      const date = toIsoDate(new Date(Date.parse(timelineStart) + i * DAY_MS));
      return {
        date,
        signups: userRows.filter((u) => u.createdAt.startsWith(date)).length,
        listings: listingRows.filter((l) => l.createdAt.startsWith(date)).length,
        inquiries: recentInquiries.filter((c) => c.startsWith(date)).length,
      };
    });

    return {
      users: {
        total: userRows.length,
        active: userRows.filter((u) => u.status === "active").length,
        suspended: userRows.filter((u) => u.status === "suspended").length,
        newLast7d: userRows.filter((u) => u.createdAt >= since7d).length,
      },
      listings: {
        total: listingRows.length,
        active: listingRows.filter((l) => l.status === "active").length,
        paused: listingRows.filter((l) => l.status === "paused").length,
        removed: listingRows.filter((l) => l.status === "removed").length,
        newLast7d: listingRows.filter((l) => l.createdAt >= since7d).length,
      },
      inquiries: { total: inquiryTotal, last7d: recentInquiries.filter((c) => c >= since7d).length },
      reports: { open: [...openReports.values()].reduce((a, b) => a + b, 0) },
      byArea: [...byArea.entries()]
        .map(([area, a]) => ({ area, listings: a.listings, avgRent: Math.round(a.rentSum / a.listings) }))
        .sort((x, y) => y.listings - x.listings || x.area.localeCompare(y.area)),
      byCompany: [...byCompany.entries()]
        .map(([company, users]) => ({ company, users }))
        .sort((x, y) => y.users - x.users || x.company.localeCompare(y.company))
        .slice(0, TOP_COMPANIES),
      timeline,
    };
  }

  /* ───────────── Users ───────────── */

  async listUsers(q: z.output<typeof AdminUserQuerySchema>): Promise<Page<AdminUser>> {
    const offset = decodeCursor(q.cursor);
    const [page, counts] = await Promise.all([
      this.users.adminQuery({ text: q.q, status: q.status, role: q.role, offset, limit: q.limit }),
      this.listingCounts(),
    ]);
    return {
      items: page.items.map((u) => toAdminUser(u, counts.get(u.id) ?? 0)),
      total: page.total,
      nextCursor: nextCursor(offset, page.items.length, page.total),
    };
  }

  async getUser(id: string): Promise<AdminUser> {
    const user = await this.requireUser(id);
    const listings = await this.listings.listByOwner(id);
    return toAdminUser(user, listings.length);
  }

  async setUserStatus(actor: UserEntity, id: string, cmd: z.output<typeof SetUserStatusSchema>): Promise<AdminUser> {
    if (id === actor.id) throw new ConflictError("You can't change your own account status");
    const user = await this.requireUser(id);
    if (user.status !== cmd.status) {
      const updated: UserEntity = {
        ...user,
        status: cmd.status,
        suspendedReason: cmd.status === "suspended" ? (cmd.reason ?? null) : null,
        updatedAt: this.clock.now().toISOString(),
      };
      await this.users.upsert(updated);
      await this.audit.record(
        actor,
        cmd.status === "suspended" ? "user.suspend" : "user.reinstate",
        "user",
        id,
        `${user.email}${cmd.reason ? ` — ${cmd.reason}` : ""}`,
      );
    }
    return this.getUser(id);
  }

  async setUserRole(actor: UserEntity, id: string, role: Role): Promise<AdminUser> {
    if (id === actor.id && role !== "admin") throw new ConflictError("You can't remove your own admin role");
    const user = await this.requireUser(id);
    if (user.role !== role) {
      await this.users.upsert({ ...user, role, updatedAt: this.clock.now().toISOString() });
      await this.audit.record(actor, "user.role", "user", id, `${user.email}: ${user.role} → ${role}`);
    }
    return this.getUser(id);
  }

  async deleteUser(actor: UserEntity, id: string): Promise<void> {
    if (id === actor.id) throw new ConflictError("You can't delete your own account from the admin portal");
    const user = await this.requireUser(id);
    const { listingsDeleted } = await this.userService.deleteAccount(user);
    await this.audit.record(actor, "user.delete", "user", id, `${user.email} (${listingsDeleted} listings removed)`);
  }

  /* ───────────── Listings ───────────── */

  async listListings(q: z.output<typeof AdminListingQuerySchema>): Promise<Page<AdminListing>> {
    const offset = decodeCursor(q.cursor);
    const openCounts = await this.reports.openCountsByListing();
    const page = await this.listings.adminQuery({
      text: q.q,
      status: q.status,
      area: q.area,
      ownerId: q.ownerId,
      ids: q.reported ? [...openCounts.keys()] : undefined,
      offset,
      limit: q.limit,
    });
    return {
      items: page.items.map((l) => toAdminListing(l, openCounts.get(l.id) ?? 0)),
      total: page.total,
      nextCursor: nextCursor(offset, page.items.length, page.total),
    };
  }

  async getListing(id: string): Promise<AdminListing> {
    const listing = await this.requireListing(id);
    const openCounts = await this.reports.openCountsByListing();
    return toAdminListing(listing, openCounts.get(id) ?? 0);
  }

  async moderateListing(
    actor: UserEntity,
    id: string,
    cmd: z.output<typeof ModerateListingSchema>,
  ): Promise<AdminListing> {
    const listing = await this.requireListing(id);
    await this.applyModeration(actor, listing, cmd.status, cmd.reason);
    return this.getListing(id);
  }

  async deleteListing(actor: UserEntity, id: string): Promise<void> {
    const listing = await this.requireListing(id);
    await this.listingService.purge(id);
    await this.audit.record(actor, "listing.delete", "listing", id, describe(listing));
  }

  /* ───────────── Reports ───────────── */

  async listReports(q: z.output<typeof AdminReportQuerySchema>): Promise<Page<Report>> {
    const offset = decodeCursor(q.cursor);
    const page = await this.reports.query({ status: q.status, text: q.q, offset, limit: q.limit });
    return { items: page.items, total: page.total, nextCursor: nextCursor(offset, page.items.length, page.total) };
  }

  async resolveReport(actor: UserEntity, id: string, cmd: z.output<typeof ResolveReportSchema>): Promise<Report> {
    const report = await this.reports.get(id);
    if (!report) throw new NotFoundError("Report not found");
    if (report.status !== "open") throw new ConflictError("This report has already been handled");

    if (cmd.removeListing) {
      const listing = await this.listings.get(report.listingId);
      if (!listing) throw new BadRequestError("The reported listing no longer exists");
      await this.applyModeration(actor, listing, "removed", cmd.resolution);
    }

    const updated: Report = {
      ...report,
      status: cmd.status,
      resolution: cmd.resolution,
      resolvedBy: actor.email,
      resolvedAt: this.clock.now().toISOString(),
    };
    await this.reports.update(updated);
    await this.audit.record(
      actor,
      cmd.status === "resolved" ? "report.resolve" : "report.dismiss",
      "report",
      id,
      `${report.reason} on ${report.listingId}: ${cmd.resolution}${cmd.removeListing ? " (listing removed)" : ""}`,
    );
    return updated;
  }

  /* ───────────── Audit ───────────── */

  async listAudit(q: z.output<typeof AdminAuditQuerySchema>): Promise<Page<AuditEntry>> {
    const offset = decodeCursor(q.cursor);
    const page = await this.auditRepoQuery(q, offset);
    return {
      items: page.items.map(({ ttl: _ttl, ...entry }) => entry),
      total: page.total,
      nextCursor: nextCursor(offset, page.items.length, page.total),
    };
  }

  /* ───────────── helpers ───────────── */

  private auditRepoQuery(q: z.output<typeof AdminAuditQuerySchema>, offset: number) {
    return this.auditLog.query({ targetId: q.targetId, text: q.q, offset, limit: q.limit });
  }

  private async applyModeration(
    actor: UserEntity,
    listing: ListingEntity,
    status: ListingEntity["status"],
    reason: string | undefined,
  ): Promise<void> {
    const moderationReason = status === "removed" ? reason?.trim() || DEFAULT_REMOVAL_REASON : null;
    if (listing.status === status && listing.moderationReason === moderationReason) return;
    await this.listings.upsert({ ...listing, status, moderationReason, updatedAt: this.clock.now().toISOString() });
    await this.audit.record(
      actor,
      "listing.status",
      "listing",
      listing.id,
      `${describe(listing)}: ${listing.status} → ${status}${reason ? ` — ${reason}` : ""}`,
    );
  }

  private async listingCounts(): Promise<Map<string, number>> {
    const rows = await this.listings.statsRows();
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.ownerId, (counts.get(r.ownerId) ?? 0) + 1);
    return counts;
  }

  private async requireUser(id: string): Promise<UserEntity> {
    const user = await this.users.get(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  private async requireListing(id: string): Promise<ListingEntity> {
    const listing = await this.listings.get(id);
    if (!listing) throw new NotFoundError("Listing not found");
    return listing;
  }
}

function describe(l: ListingEntity): string {
  return `${l.roomType} in ${l.locality}, ${l.area} (owner ${l.ownerId})`;
}
