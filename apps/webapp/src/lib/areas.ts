import { AREAS, type ListingSummary } from "@flatme/shared";

export const areaSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");
export const areaFromSlug = (slug: string) => AREAS.find((a) => areaSlug(a.name) === slug);
export const areaHref = (name: string) => `/flats/${areaSlug(name)}`;

export const listingTitle = (l: Pick<ListingSummary, "roomType" | "locality" | "area">) => `${l.roomType} in ${l.locality}, ${l.area}`;
export const listingHref = (id: string) => `/listing/${id}`;

export const GENDER_LABEL = { any: "Anyone", male: "Male only", female: "Female only" } as const;
export const AVAILABILITY_LABEL = { immediate: "Immediately", "within-week": "Within a week", "within-month": "Within a month", flexible: "Flexible" } as const;
