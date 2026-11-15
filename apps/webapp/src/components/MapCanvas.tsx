"use client";

import { CITY, formatRentShort, type GeoPoint, type ListingSummary } from "@flatme/shared";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createMap(el: HTMLElement, center: GeoPoint, zoom: number, interactive = true) {
  const map = L.map(el, { center: [center.lat, center.lng], zoom, scrollWheelZoom: interactive, dragging: interactive, zoomControl: interactive });
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
  return map;
}

/** Listings as price pins. Hovering a card highlights its pin; clicking a pin selects the listing. */
export function ListingsMap({ listings, activeId, onSelect }: { listings: ListingSummary[]; activeId: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = createMap(el.current, CITY.center, 12);
    map.current = m;
    const layer = markers.current;
    return () => {
      m.remove();
      map.current = null;
      layer.clear();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const marker of markers.current.values()) marker.remove();
    markers.current.clear();
    for (const l of listings) {
      const marker = L.marker([l.location.lat, l.location.lng], {
        icon: L.divIcon({ className: "", html: `<span class="price-pin">${formatRentShort(l.rent)}</span>`, iconSize: [0, 0] }),
        title: `${l.roomType} in ${l.area}`,
        keyboard: true,
      })
        .on("click", () => select.current(l.id))
        .addTo(m);
      markers.current.set(l.id, marker);
    }
    if (listings.length) {
      m.fitBounds(L.latLngBounds(listings.map((l) => [l.location.lat, l.location.lng] as [number, number])), { padding: [48, 48], maxZoom: 15 });
    }
  }, [listings]);

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      marker.getElement()?.querySelector(".price-pin")?.classList.toggle("is-active", id === activeId);
      marker.setZIndexOffset(id === activeId ? 1000 : 0);
    }
  }, [activeId, listings]);

  return <div ref={el} className="size-full" role="application" aria-label="Map of flats" />;
}

/** Shows roughly where a flat is, without a precise pin. */
export function AreaMap({ center }: { center: GeoPoint }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = createMap(el.current, center, 14, false);
    L.circle([center.lat, center.lng], { radius: 400, color: "#0891b2", weight: 2, fillColor: "#0891b2", fillOpacity: 0.15 }).addTo(m);
    return () => void m.remove();
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="size-full" role="img" aria-label="Approximate location on a map" />;
}

/** Lets an owner place the pin for their flat by clicking or dragging. */
export function PinMap({ value, fallback, onChange }: { value: GeoPoint | null; fallback: GeoPoint; onChange: (p: GeoPoint) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    if (!el.current) return;
    const m = createMap(el.current, value ?? fallback, 14);
    map.current = m;
    m.on("click", (e) => change.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    return () => {
      m.remove();
      map.current = null;
      pin.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      pin.current?.remove();
      pin.current = null;
      m.setView([fallback.lat, fallback.lng], 14);
      return;
    }
    if (!pin.current) {
      pin.current = L.marker([value.lat, value.lng], {
        draggable: true,
        icon: L.divIcon({ className: "", html: '<span class="pin-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: "Flat location. Drag to adjust.",
      })
        .on("dragend", (e) => {
          const p = (e.target as L.Marker).getLatLng();
          change.current({ lat: p.lat, lng: p.lng });
        })
        .addTo(m);
    } else pin.current.setLatLng([value.lat, value.lng]);
    m.panTo([value.lat, value.lng]);
  }, [value?.lat, value?.lng, fallback.lat, fallback.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="size-full" role="application" aria-label="Click the map to set the flat's location" />;
}
