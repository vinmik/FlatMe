import type { ListingEntity, ReportEntity, UserEntity } from "../../domain/entities";
import { MemoryDataExplorerRepository } from "./dataExplorerRepository";
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
  const repos = {
    users: new MemoryUserRepository(seed?.users),
    listings: new MemoryListingRepository(seed?.listings),
    otps: new MemoryOtpRepository(),
    inquiries: new MemoryInquiryRepository(),
    reports: new MemoryReportRepository(seed?.reports),
    audit: new MemoryAuditRepository(),
  };
  const collections = Object.fromEntries(Object.entries(repos).map(([name, repo]) => [name, repo.collection()]));
  return { ...repos, data: new MemoryDataExplorerRepository(collections) };
}

export {
  MemoryAuditRepository,
  MemoryDataExplorerRepository,
  MemoryInquiryRepository,
  MemoryListingRepository,
  MemoryOtpRepository,
  MemoryReportRepository,
  MemoryUserRepository,
};
