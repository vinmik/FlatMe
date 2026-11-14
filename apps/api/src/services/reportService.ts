import { randomUUID } from "node:crypto";
import type { Report, ReportInputSchema } from "@flatme/shared";
import type { z } from "zod";
import type { UserEntity } from "../domain/entities";
import { BadRequestError, ConflictError, NotFoundError, RateLimitedError } from "../domain/errors";
import type { Clock, ListingRepository, ReportRepository } from "../ports";

const DAY_MS = 24 * 60 * 60 * 1000;
export const REPORTS_PER_DAY = 10;

export type ReportInputParsed = z.output<typeof ReportInputSchema>;

export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly listings: ListingRepository,
    private readonly clock: Clock,
  ) {}

  async create(reporter: UserEntity, listingId: string, input: ReportInputParsed): Promise<Report> {
    const listing = await this.listings.get(listingId);
    if (!listing || listing.status !== "active") throw new NotFoundError("This listing is no longer available");
    if (listing.ownerId === reporter.id) throw new BadRequestError("You can't report your own listing");
    if (await this.reports.findOpen(reporter.id, listingId)) {
      throw new ConflictError("You've already reported this listing — our team is looking into it");
    }
    const now = this.clock.now();
    const recent = await this.reports.countFromUserSince(reporter.id, new Date(now.getTime() - DAY_MS).toISOString());
    if (recent >= REPORTS_PER_DAY) throw new RateLimitedError("Too many reports today. Please try again tomorrow.", 3600);

    const report: Report = {
      id: randomUUID(),
      listingId,
      listingArea: listing.area,
      listingOwnerId: listing.ownerId,
      reporterId: reporter.id,
      reporterEmail: reporter.email,
      reason: input.reason,
      details: input.details,
      status: "open",
      resolution: null,
      resolvedBy: null,
      createdAt: now.toISOString(),
      resolvedAt: null,
    };
    await this.reports.create(report);
    return report;
  }
}
