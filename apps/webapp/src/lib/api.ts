import {
  ApiErrorSchema,
  InquirySchema,
  ListingDetailSchema,
  ListingPageSchema,
  ListingSummarySchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  reportRoute,
  ROUTES,
  UploadUrlResponseSchema,
  UserSchema,
  type ErrorCode,
  type GeoPoint,
  type ListingInput,
  type ReportInput,
  type SearchQuery,
  type UpdatePrefs,
  type UpdateProfile,
} from "@flatme/shared";
import { z } from "zod";
import { config } from "./config";
import { searchQueryString } from "./public-api";
import { useSession } from "./session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "network",
    message: string,
    readonly fields?: Record<string, string>,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Plain-language message for any thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    if (err.code === "network") return "Can't reach FlatMe right now. Check your connection and try again.";
    return err.message || fallback;
  }
  return fallback;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;

async function request<T>(method: Method, path: string, opts: { body?: unknown; query?: Query; schema?: z.ZodType<T> } = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const url = `${config.apiUrl}/${path}${qs.size ? `?${qs}` : ""}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = useSession.getState().token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(0, "network", "Network request failed");
  }

  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(await res.json().catch(() => null));
    // A rejected token means the session is over (expired, deleted or suspended account).
    if (res.status === 401 && token) useSession.getState().signOut();
    if (parsed.success) {
      const e = parsed.data.error;
      throw new ApiError(res.status, e.code, e.message, e.fields, e.retryAfterSec);
    }
    throw new ApiError(res.status, res.status >= 500 ? "internal" : "bad_request", `Request failed (${res.status})`);
  }

  if (!opts.schema || res.status === 204) return undefined as T;
  const result = opts.schema.safeParse(await res.json());
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") console.warn(`[api] ${method} ${path} response failed validation`, result.error.issues);
    throw new ApiError(res.status, "internal", "Unexpected response from server");
  }
  return result.data;
}

const ItemsOf = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });
const loc = (l: GeoPoint | null) => (l ? { lat: l.lat, lng: l.lng } : {});

export const api = {
  requestOtp: (email: string) => request("POST", ROUTES.otpRequest, { body: { email }, schema: OtpRequestResponseSchema }),
  verifyOtp: (email: string, code: string) => request("POST", ROUTES.otpVerify, { body: { email, code }, schema: OtpVerifyResponseSchema }),

  me: () => request("GET", ROUTES.me, { schema: UserSchema }),
  updateProfile: (input: UpdateProfile) => request("PATCH", ROUTES.me, { body: input, schema: UserSchema }),
  updatePrefs: (input: UpdatePrefs) => request("PATCH", ROUTES.mePrefs, { body: input, schema: UserSchema }),
  deleteAccount: () => request<void>("DELETE", ROUTES.me),

  /** Browsing uses the public endpoint, so it works the same signed in or out. */
  search: (query: SearchQuery) => request("GET", `${ROUTES.publicListings}?${searchQueryString(query)}`, { schema: ListingPageSchema }),
  listing: (id: string, location: GeoPoint | null) => request("GET", ROUTES.listing(id), { query: loc(location), schema: ListingDetailSchema }),
  createListing: (input: ListingInput) => request("POST", ROUTES.listings, { body: input, schema: ListingDetailSchema }),
  updateListing: (id: string, input: ListingInput) => request("PUT", ROUTES.listing(id), { body: input, schema: ListingDetailSchema }),
  setListingStatus: (id: string, status: "active" | "paused") =>
    request("PATCH", ROUTES.listingStatus(id), { body: { status }, schema: ListingDetailSchema }),
  deleteListing: (id: string) => request<void>("DELETE", ROUTES.listing(id)),
  myListings: async () => (await request("GET", ROUTES.myListings, { schema: ItemsOf(ListingDetailSchema) })).items,

  favorites: async () => (await request("GET", ROUTES.favorites, { schema: ItemsOf(ListingSummarySchema) })).items,
  setFavorite: (id: string, favorite: boolean) => request<void>(favorite ? "PUT" : "DELETE", ROUTES.favorite(id)),

  sendInquiry: (id: string, message: string) => request("POST", ROUTES.listingInquiries(id), { body: { message }, schema: InquirySchema }),
  reportListing: (id: string, input: ReportInput) => request<void>("POST", reportRoute(id), { body: input }),

  /** Sends a photo straight to file storage with a short-lived upload link and returns its public URL. */
  uploadPhoto: async (blob: Blob, purpose: "listing" | "avatar") => {
    const contentType = "image/jpeg" as const;
    const target = await request("POST", ROUTES.uploadUrl, { body: { contentType, purpose }, schema: UploadUrlResponseSchema });
    const put = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: { ...target.requiredHeaders, "Content-Type": contentType },
      body: blob,
    }).catch(() => null);
    if (!put?.ok) throw new ApiError(put?.status ?? 0, put ? "internal" : "network", "Photo upload failed. Please try again.");
    return target.blobUrl;
  },
};
