import { BUDGET } from "./constants";
import type { GeoPoint, ListingFilters, ListingSummary } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date-only ISO string (YYYY-MM-DD) in UTC. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Converts the "available from" choice in the post-a-room flow to a concrete date. */
export function availabilityToDate(
  option: "immediate" | "within-week" | "within-month" | "flexible",
  now: Date = new Date(),
): { availableFrom: string; flexible: boolean } {
  const offsetDays = option === "within-week" ? 7 : option === "within-month" ? 30 : 0;
  return { availableFrom: toIsoDate(new Date(now.getTime() + offsetDays * DAY_MS)), flexible: option === "flexible" };
}

/** Inverse of {@link availabilityToDate}, used when editing an existing listing. */
export function dateToAvailability(
  availableFrom: string,
  flexible: boolean,
  now: Date = new Date(),
): "immediate" | "within-week" | "within-month" | "flexible" {
  if (flexible) return "flexible";
  const days = (Date.parse(availableFrom) - Date.parse(toIsoDate(now))) / DAY_MS;
  if (days <= 0) return "immediate";
  if (days <= 7) return "within-week";
  return "within-month";
}

export function availabilityLabel(availableFrom: string, flexible: boolean, now: Date = new Date()): string {
  if (flexible) return "Flexible";
  if (Date.parse(availableFrom) <= Date.parse(toIsoDate(now))) return "Available now";
  return `From ${new Date(availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function moveInCutoff(moveIn: ListingFilters["moveIn"], now: Date = new Date()): string | null {
  if (moveIn === "any") return null;
  const days = moveIn === "immediate" ? 0 : moveIn === "within-week" ? 7 : 30;
  return toIsoDate(new Date(now.getTime() + days * DAY_MS));
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const DEFAULT_FILTERS: ListingFilters = {
  budgetMin: BUDGET.min,
  budgetMax: BUDGET.max,
  gender: "any",
  furnishing: "any",
  moveIn: "any",
  areas: [],
};

export function countActiveFilters(f: ListingFilters): number {
  return (
    (f.gender !== "any" ? 1 : 0) +
    (f.furnishing !== "any" ? 1 : 0) +
    (f.moveIn !== "any" ? 1 : 0) +
    f.areas.length +
    (f.budgetMin !== DEFAULT_FILTERS.budgetMin || f.budgetMax !== DEFAULT_FILTERS.budgetMax ? 1 : 0)
  );
}

/**
 * Single source of truth for filter semantics. The API pushes these into the Cosmos query,
 * and the app uses this function for optimistic/offline filtering of cached results.
 */
export function matchesFilters(
  l: Pick<ListingSummary, "rent" | "genderPreference" | "furnishing" | "area" | "availableFrom" | "flexible">,
  f: ListingFilters,
  now: Date = new Date(),
): boolean {
  if (l.rent < f.budgetMin || l.rent > f.budgetMax) return false;
  if (f.gender !== "any" && l.genderPreference !== "any" && l.genderPreference !== f.gender) return false;
  if (f.furnishing !== "any" && l.furnishing !== f.furnishing) return false;
  if (f.areas.length > 0 && !f.areas.includes(l.area)) return false;
  const cutoff = moveInCutoff(f.moveIn, now);
  if (cutoff && !l.flexible && l.availableFrom > cutoff) return false;
  return true;
}

export function filtersToQuery(f: ListingFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.budgetMin !== DEFAULT_FILTERS.budgetMin) q.budgetMin = String(f.budgetMin);
  if (f.budgetMax !== DEFAULT_FILTERS.budgetMax) q.budgetMax = String(f.budgetMax);
  if (f.gender !== "any") q.gender = f.gender;
  if (f.furnishing !== "any") q.furnishing = f.furnishing;
  if (f.moveIn !== "any") q.moveIn = f.moveIn;
  if (f.areas.length) q.areas = f.areas.join(",");
  return q;
}
