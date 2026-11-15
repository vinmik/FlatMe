import { z } from "zod";
import {
  AMENITIES,
  AREA_NAMES,
  AVAILABILITY_OPTIONS,
  BUDGET,
  COMPANIES,
  FURNISHING,
  GENDER_PREFS,
  LIMITS,
  PHOTO_CONTENT_TYPES,
  ROOM_TYPES,
} from "./constants";
import { isCorporateEmail } from "./email";

/* ───────────────────────────── Primitives ───────────────────────────── */

export const AreaSchema = z.enum(AREA_NAMES);
export const RoomTypeSchema = z.enum(ROOM_TYPES);
export const FurnishingSchema = z.enum(FURNISHING);
export const GenderPrefSchema = z.enum(GENDER_PREFS);
export const AvailabilityOptionSchema = z.enum(AVAILABILITY_OPTIONS);
export const AmenitySchema = z.enum(AMENITIES);
export const CompanySchema = z.enum(COMPANIES);

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const CorporateEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"))
  .refine(isCorporateEmail, "Please use your work email — personal mailboxes aren't allowed");

export const IndianPhoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

/* ───────────────────────────── Auth ───────────────────────────── */

export const OtpRequestSchema = z.object({ email: CorporateEmailSchema });
export type OtpRequest = z.input<typeof OtpRequestSchema>;

export const OtpRequestResponseSchema = z.object({
  expiresInSec: z.number(),
  resendInSec: z.number(),
  /** Only populated when the API runs with OTP_DEV_MODE=true (local development). */
  devCode: z.string().optional(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;

export const OtpVerifySchema = z.object({
  email: CorporateEmailSchema,
  code: z.string().regex(new RegExp(`^\\d{${LIMITS.otpLength}}$`), "Enter the 6-digit code"),
});
export type OtpVerify = z.input<typeof OtpVerifySchema>;

/* ───────────────────────────── User ───────────────────────────── */

export const NotificationPrefsSchema = z.object({
  newListings: z.boolean().default(true),
  messages: z.boolean().default(true),
  priceDrops: z.boolean().default(false),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const PrivacyPrefsSchema = z.object({
  showPhone: z.boolean().default(true),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  company: z.string(),
  designation: z.string(),
  phone: z.string(),
  avatarUrl: z.string().url().nullable(),
  verified: z.boolean(),
  profileComplete: z.boolean(),
  /** "admin" is granted to emails in the API's ADMIN_EMAILS allowlist; admins can use the admin portal. */
  role: z.enum(["user", "admin"]).default("user"),
  notifications: NotificationPrefsSchema,
  privacy: PrivacyPrefsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const OtpVerifyResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  isNewUser: z.boolean(),
  user: UserSchema,
  /** Company detected from the email domain, used to pre-fill onboarding. */
  suggestedCompany: z.string().optional(),
});
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponseSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(80),
  company: z.string().trim().min(1, "Company is required").max(80),
  designation: z.string().trim().min(2, "Designation is required").max(80),
  phone: IndianPhoneSchema,
  avatarUrl: z.string().url().nullable().optional(),
});
export type UpdateProfile = z.input<typeof UpdateProfileSchema>;

export const UpdatePrefsSchema = z.object({
  notifications: NotificationPrefsSchema.partial().optional(),
  privacy: PrivacyPrefsSchema.partial().optional(),
});
export type UpdatePrefs = z.input<typeof UpdatePrefsSchema>;

/* ───────────────────────────── Listings ───────────────────────────── */

/** "removed" = taken down by moderation; only the owner (and admins) can still see it. */
export const ListingStatusSchema = z.enum(["active", "paused", "removed"]);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const OwnerSnapshotSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  company: z.string(),
  designation: z.string(),
  verified: z.boolean(),
  avatarUrl: z.string().url().nullable(),
});
export type OwnerSnapshot = z.infer<typeof OwnerSnapshotSchema>;

export const ListingInputSchema = z
  .object({
    area: AreaSchema,
    locality: z.string().trim().min(3, "Add a locality or landmark").max(120),
    location: GeoPointSchema,
    rent: z.coerce.number().int().min(1000, "Rent looks too low").max(200000),
    deposit: z.coerce.number().int().min(0).max(1000000),
    roomType: RoomTypeSchema,
    furnishing: FurnishingSchema,
    availability: AvailabilityOptionSchema,
    genderPreference: GenderPrefSchema,
    flatmates: z.coerce.number().int().min(0).max(6).default(1),
    amenities: z.array(AmenitySchema).max(AMENITIES.length).default([]),
    description: z.string().trim().max(1000).default(""),
    photos: z.array(z.string().url()).max(LIMITS.photosPerListing).default([]),
  })
  .refine((v) => v.deposit <= v.rent * 12, { message: "Deposit can't exceed 12 months' rent", path: ["deposit"] });
export type ListingInput = z.input<typeof ListingInputSchema>;
export type ListingInputParsed = z.output<typeof ListingInputSchema>;

export const ListingSummarySchema = z.object({
  id: z.string(),
  area: AreaSchema,
  locality: z.string(),
  location: GeoPointSchema,
  rent: z.number(),
  roomType: RoomTypeSchema,
  furnishing: FurnishingSchema,
  genderPreference: GenderPrefSchema,
  availableFrom: z.string(),
  flexible: z.boolean(),
  flatmates: z.number(),
  coverPhoto: z.string().nullable(),
  owner: OwnerSnapshotSchema.pick({ firstName: true, company: true, verified: true }),
  /** Kilometres from the caller's location, when a location was supplied. */
  distanceKm: z.number().nullable(),
  status: ListingStatusSchema,
  createdAt: z.string(),
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;

export const ListingContactSchema = z.object({
  name: z.string(),
  company: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
});

export const ListingDetailSchema = ListingSummarySchema.extend({
  deposit: z.number(),
  description: z.string(),
  amenities: z.array(AmenitySchema),
  photos: z.array(z.string()),
  owner: OwnerSnapshotSchema,
  contact: ListingContactSchema,
  isOwner: z.boolean(),
  isFavorite: z.boolean(),
  stats: z.object({ views: z.number(), inquiries: z.number() }),
  /** Set when an admin removed the listing; shown to the owner. */
  moderationReason: z.string().nullable().default(null),
  updatedAt: z.string(),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

export const MyListingSchema = ListingDetailSchema;
export type MyListing = ListingDetail;

export const SetListingStatusSchema = z.object({ status: z.enum(["active", "paused"]) });

/* ───────────────────────────── Search & feed ───────────────────────────── */

export const MoveInFilterSchema = z.enum(["any", "immediate", "within-week", "within-month"]);
export const FurnishingFilterSchema = z.enum(["any", ...FURNISHING]);
export const SortSchema = z.enum(["distance", "rent-asc", "rent-desc", "newest"]);

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []) : v),
    z.array(item),
  );

export const ListingFiltersSchema = z.object({
  budgetMin: z.coerce.number().int().min(0).default(BUDGET.min),
  budgetMax: z.coerce.number().int().min(0).default(BUDGET.max),
  gender: GenderPrefSchema.default("any"),
  furnishing: FurnishingFilterSchema.default("any"),
  moveIn: MoveInFilterSchema.default("any"),
  areas: csv(AreaSchema).default([]),
});
export type ListingFilters = z.output<typeof ListingFiltersSchema>;

export const SearchQuerySchema = ListingFiltersSchema.extend({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sort: SortSchema.default("newest"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type SearchQuery = z.input<typeof SearchQuerySchema>;

export const PageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), nextCursor: z.string().nullable() });

export const ListingPageSchema = PageSchema(ListingSummarySchema);
export type ListingPage = z.infer<typeof ListingPageSchema>;

export const FeedRailKeySchema = z.enum(["closest", "budget", "furnished", "immediate", "newest"]);
export const FeedSchema = z.object({
  rails: z.array(
    z.object({ key: FeedRailKeySchema, title: z.string(), items: z.array(ListingSummarySchema) }),
  ),
});
export type Feed = z.infer<typeof FeedSchema>;

export const PublicStatsSchema = z.object({
  activeListings: z.number(),
  professionals: z.number(),
  companies: z.number(),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;

export const PublicHighlightsSchema = z.object({
  stats: PublicStatsSchema,
  featured: z.array(ListingSummarySchema),
});
export type PublicHighlights = z.infer<typeof PublicHighlightsSchema>;

/**
 * What anyone can see without signing in (website visitors and search engines):
 * the room itself, never the owner's contact details, and only an approximate location.
 */
export const PublicListingSchema = ListingSummarySchema.extend({
  deposit: z.number(),
  description: z.string(),
  amenities: z.array(AmenitySchema),
  photos: z.array(z.string()),
  updatedAt: z.string(),
});
export type PublicListing = z.infer<typeof PublicListingSchema>;

/* ───────────────────────────── Inquiries ───────────────────────────── */

export const InquiryInputSchema = z.object({
  message: z.string().trim().min(10, "Say a little more (10+ characters)").max(1000),
});
export type InquiryInput = z.input<typeof InquiryInputSchema>;

export const InquirySchema = z.object({
  id: z.string(),
  listingId: z.string(),
  fromUserId: z.string(),
  message: z.string(),
  createdAt: z.string(),
});
export type Inquiry = z.infer<typeof InquirySchema>;

/* ───────────────────────────── Media ───────────────────────────── */

export const UploadUrlRequestSchema = z.object({
  contentType: z.enum(PHOTO_CONTENT_TYPES),
  purpose: z.enum(["listing", "avatar"]).default("listing"),
});
export type UploadUrlRequest = z.input<typeof UploadUrlRequestSchema>;

export const UploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  blobUrl: z.string().url(),
  expiresAt: z.string(),
  requiredHeaders: z.record(z.string(), z.string()),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;

/* ───────────────────────────── Errors ───────────────────────────── */

export const ErrorCodeSchema = z.enum([
  "bad_request",
  "validation_failed",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "otp_invalid",
  "otp_expired",
  "personal_email",
  "internal",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    retryAfterSec: z.number().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
