export function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatRentShort(n: number): string {
  return n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `₹${n}`;
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function furnishingLabel(f: "furnished" | "semi-furnished" | "unfurnished"): string {
  return f === "semi-furnished" ? "Semi-furnished" : f === "furnished" ? "Furnished" : "Unfurnished";
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}
