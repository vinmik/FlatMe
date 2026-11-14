import { DEFAULT_FILTERS, type GeoPoint, type ListingFilters } from "@flatme/shared";
import * as Location from "expo-location";
import { create } from "zustand";

interface LocationState {
  /** Null when permission is denied or not yet resolved — the API then ranks by recency. */
  coords: GeoPoint | null;
  permission: "unknown" | "granted" | "denied";
  /** Asks for permission (if needed) and resolves the current position. */
  request: () => Promise<boolean>;
  /** Silently refreshes the position if permission was already granted. */
  refresh: () => Promise<void>;
}

async function currentPosition(): Promise<GeoPoint | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
  return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}

export const useLocation = create<LocationState>((set) => ({
  coords: null,
  permission: "unknown",
  async request() {
    const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied" as const }));
    if (status !== "granted") {
      set({ permission: "denied" });
      return false;
    }
    set({ permission: "granted", coords: await currentPosition() });
    return true;
  },
  async refresh() {
    const { status } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: "denied" as const }));
    if (status !== "granted") return set({ permission: status === "denied" ? "denied" : "unknown" });
    set({ permission: "granted", coords: await currentPosition() });
  },
}));

interface FilterState {
  filters: ListingFilters;
  setFilters: (f: ListingFilters) => void;
  reset: () => void;
}

export const useFilters = create<FilterState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (filters) => set({ filters }),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));
