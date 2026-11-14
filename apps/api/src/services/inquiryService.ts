import { randomUUID } from "node:crypto";
import type { Inquiry } from "@flatme/shared";
import type { InquiryEntity, UserEntity } from "../domain/entities";
import { BadRequestError, ForbiddenError, NotFoundError, RateLimitedError } from "../domain/errors";
import { inquiryEmail } from "../adapters/email/templates";
import type { Clock, EmailSender, InquiryRepository, ListingRepository, Logger, UserRepository } from "../ports";
import { listingTitle } from "./listingService";

const HOUR_MS = 60 * 60 * 1000;
export const INQUIRIES_PER_HOUR = 10;

export class InquiryService {
  constructor(
    private readonly inquiries: InquiryRepository,
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
    private readonly email: EmailSender,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async create(from: UserEntity, listingId: string, message: string): Promise<Inquiry> {
    if (!from.profileComplete) throw new ForbiddenError("Complete your profile before contacting owners");
    const listing = await this.listings.get(listingId);
    if (!listing || listing.status !== "active") throw new NotFoundError("This listing is no longer available");
    if (listing.ownerId === from.id) throw new BadRequestError("You can't enquire about your own listing");

    const now = this.clock.now();
    const recent = await this.inquiries.countFromUserSince(from.id, new Date(now.getTime() - HOUR_MS).toISOString());
    if (recent >= INQUIRIES_PER_HOUR) {
      throw new RateLimitedError("You've sent a lot of enquiries — please try again in a while", 15 * 60);
    }

    const inquiry: InquiryEntity = {
      id: randomUUID(),
      listingId,
      fromUserId: from.id,
      toUserId: listing.ownerId,
      message,
      createdAt: now.toISOString(),
    };
    await this.inquiries.create(inquiry);

    try {
      await this.listings.incrementStat(listingId, "inquiries");
    } catch (err) {
      this.logger.warn(`inquiries increment failed for ${listingId}: ${String(err)}`);
    }

    const owner = await this.users.get(listing.ownerId);
    if (owner && owner.status === "active" && owner.notifications.messages) {
      try {
        await this.email.send(
          inquiryEmail({
            to: owner.email,
            ownerFirstName: listing.owner.firstName || "there",
            fromName: from.fullName,
            fromCompany: from.company,
            fromEmail: from.email,
            listingTitle: listingTitle(listing),
            message,
          }),
        );
      } catch (err) {
        // The inquiry is persisted; a failed notification must not fail the request.
        this.logger.error(`inquiry email failed for listing ${listingId}: ${String(err)}`);
      }
    }

    return {
      id: inquiry.id,
      listingId: inquiry.listingId,
      fromUserId: inquiry.fromUserId,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
    };
  }
}
