import {
  ApiErrorSchema,
  FeedSchema,
  filtersToQuery,
  InquirySchema,
  ListingDetailSchema,
  ListingPageSchema,
  ListingSummarySchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  PublicHighlightsSchema,
  reportRoute,
  ROUTES,
  UploadUrlResponseSchema,
  UserSchema,
} from "@flatme/shared";
import { z } from "zod";
import { ApiError } from "./errors";
import type { FlatMeApi } from "./types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;

interface HttpOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
  timeoutMs?: number;
}

const ItemsOf = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

export function createHttpApi({ baseUrl, getToken, onUnauthorized, timeoutMs = 20_000 }: HttpOptions): FlatMeApi {
  async function request<T>(method: Method, path: string, opts: { body?: unknown; query?: Query; schema?: z.ZodType<T> } = {}): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    const url = `${baseUrl}/${path}${qs.size ? `?${qs}` : ""}`;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, "network", "Network request failed");
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const parsed = ApiErrorSchema.safeParse(await res.json().catch(() => null));
      if (res.status === 401 && token) onUnauthorized();
      if (parsed.success) {
        const e = parsed.data.error;
        throw new ApiError(res.status, e.code, e.message, e.fields, e.retryAfterSec);
      }
      throw new ApiError(res.status, res.status >= 500 ? "internal" : "bad_request", `Request failed (${res.status})`);
    }

    if (!opts.schema || res.status === 204) return undefined as T;
    const json: unknown = await res.json();
    const result = opts.schema.safeParse(json);
    if (!result.success) {
      // A contract mismatch is a bug, not a user error — surface loudly in dev.
      if (__DEV__) console.warn(`[api] ${method} ${path} response failed validation`, result.error.issues);
      throw new ApiError(res.status, "internal", "Unexpected response from server");
    }
    return result.data;
  }

  const loc = (l: { lat: number; lng: number } | null) => (l ? { lat: l.lat, lng: l.lng } : {});

  return {
    highlights: () => request("GET", ROUTES.publicHighlights, { schema: PublicHighlightsSchema }),
    requestOtp: (email) => request("POST", ROUTES.otpRequest, { body: { email }, schema: OtpRequestResponseSchema }),
    verifyOtp: (email, code) => request("POST", ROUTES.otpVerify, { body: { email, code }, schema: OtpVerifyResponseSchema }),

    me: () => request("GET", ROUTES.me, { schema: UserSchema }),
    updateProfile: (input) => request("PATCH", ROUTES.me, { body: input, schema: UserSchema }),
    updatePrefs: (input) => request("PATCH", ROUTES.mePrefs, { body: input, schema: UserSchema }),
    deleteAccount: () => request("DELETE", ROUTES.me),

    feed: ({ location, filters }) =>
      request("GET", ROUTES.feed, { query: { ...loc(location), ...filtersToQuery(filters) }, schema: FeedSchema }),
    search: (query) => {
      const { areas, ...rest } = query;
      const q: Query = {};
      for (const [k, v] of Object.entries(rest)) if (typeof v === "string" || typeof v === "number") q[k] = v;
      if (Array.isArray(areas)) q.areas = areas.join(",");
      else if (typeof areas === "string") q.areas = areas;
      return request("GET", ROUTES.listings, { query: q, schema: ListingPageSchema });
    },
    listing: (id, location) => request("GET", ROUTES.listing(id), { query: loc(location), schema: ListingDetailSchema }),
    createListing: (input) => request("POST", ROUTES.listings, { body: input, schema: ListingDetailSchema }),
    updateListing: (id, input) => request("PUT", ROUTES.listing(id), { body: input, schema: ListingDetailSchema }),
    setListingStatus: (id, status) => request("PATCH", ROUTES.listingStatus(id), { body: { status }, schema: ListingDetailSchema }),
    deleteListing: (id) => request("DELETE", ROUTES.listing(id)),
    myListings: async () => (await request("GET", ROUTES.myListings, { schema: ItemsOf(ListingDetailSchema) })).items,

    favorites: async () => (await request("GET", ROUTES.favorites, { schema: ItemsOf(ListingSummarySchema) })).items,
    setFavorite: (id, favorite) => request(favorite ? "PUT" : "DELETE", ROUTES.favorite(id)),

    sendInquiry: (id, message) => request("POST", ROUTES.listingInquiries(id), { body: { message }, schema: InquirySchema }),
    reportListing: async (id, input) => {
      await request("POST", reportRoute(id), { body: input });
    },

    uploadPhoto: async (localUri, contentType, purpose) => {
      const target = await request("POST", ROUTES.uploadUrl, { body: { contentType, purpose }, schema: UploadUrlResponseSchema });
      const blob = await (await fetch(localUri)).blob();
      const put = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { ...target.requiredHeaders, "Content-Type": contentType },
        body: blob,
      }).catch(() => null);
      if (!put?.ok) throw new ApiError(put?.status ?? 0, put ? "internal" : "network", "Photo upload failed");
      return target.blobUrl;
    },
  };
}
