import { AREAS, formatRentShort, type GeoPoint } from "@flatme/shared";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { colors, fonts, shadow } from "@/theme/tokens";
import { Text } from "@/ui";
import type { ListingMapHandle, ListingMapProps } from "./mapTypes";

/**
 * Key-less map: a stylised city canvas (used on web, and on Android until a Google Maps key is configured) that projects the
 * same pins and area labels, so the web preview keeps the full map interaction model.
 */
export const StylisedMap = forwardRef<ListingMapHandle, ListingMapProps>(function StylisedMap({ listings, selectedId, onSelect, style, draggablePin }, ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useImperativeHandle(ref, () => ({ focus: () => {} }));

  const points = useMemo(() => [...AREAS.map((a) => ({ lat: a.lat, lng: a.lng })), ...listings.map((l) => l.location), ...(draggablePin ? [draggablePin.value] : [])], [listings, draggablePin]);
  const bounds = useMemo(() => {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return { minLat: Math.min(...lats) - 0.01, maxLat: Math.max(...lats) + 0.01, minLng: Math.min(...lngs) - 0.01, maxLng: Math.max(...lngs) + 0.01 };
  }, [points]);
  const project = (p: GeoPoint) => ({
    left: ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * size.w,
    top: (1 - (p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * size.h,
  });

  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <LinearGradient colors={["#e6f6f9", "#f1f5f9", "#eef7ee"]} style={StyleSheet.absoluteFill} />
      {Array.from({ length: 12 }, (_, i) => (
        <View key={`v${i}`} style={[styles.grid, { left: `${(i + 1) * 8}%`, top: 0, bottom: 0, width: 1 }]} />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <View key={`h${i}`} style={[styles.grid, { top: `${(i + 1) * 8}%`, left: 0, right: 0, height: 1 }]} />
      ))}
      {size.w > 0 &&
        AREAS.map((a) => {
          const p = project(a);
          return (
            <Text key={a.name} variant="caption" color={colors.subtle} style={{ position: "absolute", left: p.left - 40, top: p.top + 14, width: 80, textAlign: "center" }}>
              {a.name}
            </Text>
          );
        })}
      {size.w > 0 &&
        listings.map((l) => {
          const p = project(l.location);
          const selected = l.id === selectedId;
          return (
            <Pressable key={l.id} onPress={() => onSelect?.(l.id)} style={{ position: "absolute", left: p.left - 28, top: p.top - 30, zIndex: selected ? 10 : 1 }}>
              <View style={[styles.pin, selected && styles.pinSelected, shadow.md]}>
                <Text style={[styles.pinText, selected && { color: colors.white }]}>{formatRentShort(l.rent)}</Text>
              </View>
            </Pressable>
          );
        })}
      {size.w > 0 && draggablePin && (
        <View style={[styles.dot, { left: project(draggablePin.value).left - 10, top: project(draggablePin.value).top - 10 }]} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { position: "absolute", backgroundColor: "rgba(8,145,178,0.06)" },
  pin: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  pinSelected: { backgroundColor: colors.primary, transform: [{ scale: 1.12 }] },
  pinText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  dot: { position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.white },
});
