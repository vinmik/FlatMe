import { CITY, formatRentShort, type GeoPoint } from "@flatme/shared";
import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { config } from "@/lib/config";
import { colors, fonts, shadow } from "@/theme/tokens";
import { Text } from "@/ui";
import type { ListingMapHandle, ListingMapProps } from "./mapTypes";
import { StylisedMap } from "./StylisedMap";

export type { ListingMapHandle, ListingMapProps } from "./mapTypes";

const delta = (zoomed: boolean) => (zoomed ? { latitudeDelta: 0.02, longitudeDelta: 0.02 } : { latitudeDelta: 0.12, longitudeDelta: 0.12 });

const NativeListingMap = forwardRef<ListingMapHandle, ListingMapProps>(function NativeListingMap(
  { listings, selectedId, onSelect, center, interactive = true, showsUserLocation, style, draggablePin },
  ref,
) {
  const map = useRef<MapView>(null);
  const start = center ?? draggablePin?.value ?? CITY.center;
  const initial: Region = { latitude: start.lat, longitude: start.lng, ...delta(!!draggablePin || !interactive) };

  useImperativeHandle(ref, () => ({
    focus: (p, zoomed = false) => map.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, ...delta(zoomed) }, 450),
  }));

  return (
    <MapView
      ref={map}
      provider={PROVIDER_DEFAULT}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={initial}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      scrollEnabled={interactive || !!draggablePin}
      zoomEnabled={interactive || !!draggablePin}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      {listings.map((l) => (
        <PricePin key={l.id} id={l.id} rent={l.rent} location={l.location} selected={l.id === selectedId} onSelect={onSelect} />
      ))}
      {draggablePin && (
        <Marker
          draggable
          coordinate={{ latitude: draggablePin.value.lat, longitude: draggablePin.value.lng }}
          onDragEnd={(e) => draggablePin.onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
          pinColor={colors.primary}
        />
      )}
    </MapView>
  );
});

/** Google Maps on Android hard-crashes without an API key, so fall back to the stylised map until one is configured. */
export const ListingMap = Platform.OS === "android" && !config.googleMapsApiKey ? StylisedMap : NativeListingMap;

const PricePin = memo(function PricePin({
  id,
  rent,
  location,
  selected,
  onSelect,
}: {
  id: string;
  rent: number;
  location: GeoPoint;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  // Custom marker views must re-render to the native bitmap only when their look changes.
  const [track, setTrack] = useState(true);
  useEffect(() => setTrack(true), [selected]);
  return (
    <Marker
      coordinate={{ latitude: location.lat, longitude: location.lng }}
      onPress={() => onSelect?.(id)}
      tracksViewChanges={track}
      zIndex={selected ? 10 : 1}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View onLayout={() => setTimeout(() => setTrack(false), 300)} style={{ alignItems: "center" }}>
        <View style={[styles.pin, selected && styles.pinSelected, shadow.md]}>
          <Text style={[styles.pinText, selected && { color: colors.white }]}>{formatRentShort(rent)}</Text>
        </View>
        <View style={[styles.tail, selected && { borderTopColor: colors.primary }]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pin: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  pinSelected: { backgroundColor: colors.primary, transform: [{ scale: 1.12 }] },
  pinText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.white,
    marginTop: -1,
  },
});
