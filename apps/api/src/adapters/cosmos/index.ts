import { CosmosClient } from "@azure/cosmos";
import type { TokenCredential } from "@azure/identity";
import { CosmosListingRepository } from "./listingRepository";
import {
  CosmosAuditRepository,
  CosmosInquiryRepository,
  CosmosOtpRepository,
  CosmosReportRepository,
} from "./repositories";
import { CosmosUserRepository } from "./userRepository";

export const CONTAINERS = {
  users: "users",
  listings: "listings",
  otps: "otps",
  inquiries: "inquiries",
  reports: "reports",
  audit: "audit",
} as const;

/** Containers are provisioned by Bicep; the app only needs data-plane RBAC (no local keys). */
export function createCosmosRepositories(endpoint: string, database: string, credential: TokenCredential) {
  const db = new CosmosClient({ endpoint, aadCredentials: credential }).database(database);
  return {
    users: new CosmosUserRepository(db.container(CONTAINERS.users)),
    listings: new CosmosListingRepository(db.container(CONTAINERS.listings)),
    otps: new CosmosOtpRepository(db.container(CONTAINERS.otps)),
    inquiries: new CosmosInquiryRepository(db.container(CONTAINERS.inquiries)),
    reports: new CosmosReportRepository(db.container(CONTAINERS.reports)),
    audit: new CosmosAuditRepository(db.container(CONTAINERS.audit)),
  };
}
