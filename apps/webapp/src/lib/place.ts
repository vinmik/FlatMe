import { AREAS, type AreaName, type GeoPoint } from "@flatme/shared";
import { create } from "zustand";

const KEY = "flatme.web.place.v1";

/** Where the person wants flats near: an office area they picked, or their device location. */
export interface Place {
  label: string;
  coords: GeoPoint;
}

interface PlaceState {
  place: Place | null;
  hydrate: () => void;
  setArea: (name: AreaName) => void;
  /** Asks the browser for the current position. Resolves false if it is denied or unavailable. */
  locate: () => Promise<boolean>;
  clear: () => void;
}

function save(place: Place | null) {
  try {
    if (place) localStorage.setItem(KEY, JSON.stringify(place));
    else localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export const usePlace = create<PlaceState>((set) => ({
  place: null,
  hydrate() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Place | null;
      if (p && typeof p.label === "string" && typeof p.coords?.lat === "number" && typeof p.coords?.lng === "number") set({ place: p });
    } catch {
      // ignore
    }
  },
  setArea(name) {
    const a = AREAS.find((x) => x.name === name);
    if (!a) return;
    const place = { label: a.name, coords: { lat: a.lat, lng: a.lng } };
    set({ place });
    save(place);
  },
  locate() {
    return new Promise<boolean>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Rounded so tiny movements don't refetch every list.
          const place = { label: "My location", coords: { lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3) } };
          set({ place });
          save(place);
          resolve(true);
        },
        () => resolve(false),
        { maximumAge: 10 * 60_000, timeout: 10_000 },
      );
    });
  },
  clear() {
    set({ place: null });
    save(null);
  },
}));

export const useCoords = () => usePlace((s) => s.place?.coords ?? null);
