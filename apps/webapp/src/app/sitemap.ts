import { AREAS } from "@flatme/shared";
import type { MetadataRoute } from "next";
import { areaHref, listingHref } from "@/lib/areas";
import { config } from "@/lib/config";
import { publicApi } from "@/lib/public-api";

const MAX_LISTINGS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${config.siteUrl}${path}`;
  const entries: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/flats"), changeFrequency: "hourly", priority: 0.9 },
    ...AREAS.map((a) => ({ url: url(areaHref(a.name)), changeFrequency: "daily" as const, priority: 0.8 })),
  ];

  let cursor: string | undefined;
  let count = 0;
  do {
    const page = await publicApi.search({ sort: "newest", limit: 50, cursor });
    if (!page) break;
    for (const l of page.items) entries.push({ url: url(listingHref(l.id)), lastModified: l.createdAt, changeFrequency: "daily", priority: 0.6 });
    count += page.items.length;
    cursor = page.nextCursor ?? undefined;
  } while (cursor && count < MAX_LISTINGS);

  return entries;
}
