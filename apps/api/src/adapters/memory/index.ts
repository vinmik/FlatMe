import type { ListingEntity, ReportEntity, UserEntity } from "../../domain/entities";
import { MemoryListingRepository } from "./listingRepository";
import {
  MemoryAuditRepository,
  MemoryInquiryRepository,
  MemoryOtpRepository,
  MemoryReportRepository,
} from "./repositories";
import { MemoryUserRepository } from "./userRepository";

export interface MemorySeed {
  users: readonly UserEntity[];
  listings: readonly ListingEntity[];
  reports?: readonly ReportEntity[];
}

export function createMemoryRepositories(seed?: MemorySeed) {
  return {
    users: new MemoryUserRepository(seed?.users),
    listings: new MemoryListingRepository(seed?.listings),
    otps: new MemoryOtpRepository(),
    inquiries: new MemoryInquiryRepository(),
    reports: new MemoryReportRepository(seed?.reports),
    audit: new MemoryAuditRepository(),
  };
}

export {
  MemoryAuditRepository,
  MemoryInquiryRepository,
  MemoryListingRepository,
  MemoryOtpRepository,
  MemoryReportRepository,
  MemoryUserRepository,
};
