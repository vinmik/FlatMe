import { ListingPageSchema, PublicHighlightsSchema, PublicListingSchema, ROUTES, type ListingPage, type PublicHighlights, type PublicListing, type SearchQuery } from "@flatme/shared";
import type { z } from "zod";
import { config } from "./config";

/** How long the server may reuse a public response before asking the API again. */
const REVALIDATE_SECONDS = 60;

export function searchQueryString(query: SearchQuery): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) qs.set(k, v.join(","));
    } else qs.set(k, String(v));
  }
  return qs.toString();
}

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const res = await fetch(`${config.apiUrl}/${path}`, { headers: { Accept: "application/json" }, next: { revalidate: REVALIDATE_SECONDS, tags: ["listings"] } });
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    // API unreachable: pages render their empty states instead of crashing.
    return null;
  }
}

/** Server-side reads of what anyone may see. Each returns null when the API can't answer. */
export const publicApi = {
  highlights: (): Promise<PublicHighlights | null> => get(ROUTES.publicHighlights, PublicHighlightsSchema),
  search: (query: SearchQuery): Promise<ListingPage | null> => {
    const qs = searchQueryString(query);
    return get(`${ROUTES.publicListings}${qs ? `?${qs}` : ""}`, ListingPageSchema);
  },
  /** Null means the listing doesn't exist (or is paused/removed). Throws if the API itself is failing, so that isn't shown as "not found". */
  listing: async (id: string): Promise<PublicListing | null> => {
    const res = await fetch(`${config.apiUrl}/${ROUTES.publicListing(encodeURIComponent(id))}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["listings", `listing:${id}`] },
    });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error(`Listing lookup failed (${res.status})`);
    return PublicListingSchema.parse(await res.json());
  },
};
