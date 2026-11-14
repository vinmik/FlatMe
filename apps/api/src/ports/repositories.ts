import type { AccountStatus, GeoPoint, ListingFilters, ListingStatus, ReportStatusSchema, Role } from "@flatme/shared";
import type { z } from "zod";
import type {
  AuditEntity,
  InquiryEntity,
  ListingEntity,
  OtpEntity,
  ReportEntity,
  UserEntity,
} from "../domain/entities";

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface PageWindow {
  offset: number;
  limit: number;
}

/* ───────────────────────────── Users ───────────────────────────── */

export interface AdminUserCriteria extends PageWindow {
  /** Case-insensitive "contains" over email / full name / company. */
  text?: string;
  status?: AccountStatus;
  role?: Role;
}

export interface UserStatsRow {
  company: string;
  status: AccountStatus;
  createdAt: string;
}

export interface UserRepository {
  get(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  upsert(user: UserEntity): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  countDistinctCompanies(): Promise<number>;
  /** Newest first. */
  adminQuery(q: AdminUserCriteria): Promise<Paged<UserEntity>>;
  /** Lightweight projection used by the admin dashboard. */
  statsRows(): Promise<UserStatsRow[]>;
}

/* ───────────────────────────── Listings ───────────────────────────── */

export type ListingSort = "distance" | "rent-asc" | "rent-desc" | "newest";

export interface ListingSearchCriteria {
  filters: ListingFilters;
  /** Caller location; enables distanceKm and the "distance" sort. */
  near?: GeoPoint;
  sort: ListingSort;
  offset: number;
  limit: number;
  /** Reference time for move-in cutoffs. */
  now: Date;
}

export interface ListingHit {
  listing: ListingEntity;
  distanceKm: number | null;
}

export interface ListingSearchResult {
  hits: ListingHit[];
  total: number;
}

export interface AdminListingCriteria extends PageWindow {
  /** Case-insensitive "contains" over locality / area / owner first name / company / id. */
  text?: string;
  status?: ListingStatus;
  area?: string;
  ownerId?: string;
  /** Restrict to these ids (e.g. listings with open reports). */
  ids?: readonly string[];
}

export interface ListingStatsRow {
  ownerId: string;
  area: string;
  rent: number;
  status: ListingStatus;
  createdAt: string;
}

/**
 * Search semantics (all adapters MUST agree — the memory adapter is the reference):
 * only status=active, filters per shared `matchesFilters`, sort with `createdAt desc`
 * as tie-breaker, "distance" without `near` falls back to "newest".
 */
export interface ListingRepository {
  get(id: string): Promise<ListingEntity | null>;
  getMany(ids: readonly string[]): Promise<ListingEntity[]>;
  listByOwner(ownerId: string): Promise<ListingEntity[]>;
  upsert(listing: ListingEntity): Promise<void>;
  delete(id: string): Promise<void>;
  search(criteria: ListingSearchCriteria): Promise<ListingSearchResult>;
  incrementStat(id: string, stat: "views" | "inquiries"): Promise<void>;
  countActive(): Promise<number>;
  /** Every status, newest first. */
  adminQuery(q: AdminListingCriteria): Promise<Paged<ListingEntity>>;
  statsRows(): Promise<ListingStatsRow[]>;
}

/* ───────────────────────────── OTP / inquiries ───────────────────────────── */

export interface OtpRepository {
  get(email: string): Promise<OtpEntity | null>;
  upsert(otp: OtpEntity): Promise<void>;
  delete(email: string): Promise<void>;
}

export interface InquiryRepository {
  create(inquiry: InquiryEntity): Promise<void>;
  countFromUserSince(userId: string, sinceIso: string): Promise<number>;
  deleteByListing(listingId: string): Promise<void>;
  count(): Promise<number>;
  /** createdAt values of inquiries at/after `sinceIso`. */
  createdSince(sinceIso: string): Promise<string[]>;
}

/* ───────────────────────────── Reports / audit ───────────────────────────── */

export interface ReportCriteria extends PageWindow {
  status?: z.infer<typeof ReportStatusSchema>;
  /** Case-insensitive "contains" over listing id, reporter email, reason and details. */
  text?: string;
}

export interface ReportRepository {
  create(report: ReportEntity): Promise<void>;
  get(id: string): Promise<ReportEntity | null>;
  update(report: ReportEntity): Promise<void>;
  findOpen(reporterId: string, listingId: string): Promise<ReportEntity | null>;
  countFromUserSince(userId: string, sinceIso: string): Promise<number>;
  /** Newest first. */
  query(q: ReportCriteria): Promise<Paged<ReportEntity>>;
  /** listingId → number of open reports (only listings with at least one). */
  openCountsByListing(): Promise<Map<string, number>>;
  deleteByListing(listingId: string): Promise<void>;
}

export interface AuditCriteria extends PageWindow {
  targetId?: string;
  /** Case-insensitive "contains" over actor email, action and details. */
  text?: string;
}

export interface AuditRepository {
  append(entry: AuditEntity): Promise<void>;
  /** Newest first. */
  query(q: AuditCriteria): Promise<Paged<AuditEntity>>;
}
