import { countActiveFilters, formatDistance, formatRupees, furnishingLabel, type ListingSummary } from "@flatme/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LocateFixed, MapPinOff } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View, type ListViewToken } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFavoriteIds, useSearch, useToggleFavorite } from "@/api/hooks";
import { FilterButton } from "@/features/listings/FilterButton";
import { FilterSheet } from "@/features/listings/FilterSheet";
import { ListingMap, type ListingMapHandle } from "@/features/listings/ListingMap";
import { useFilters, useLocation } from "@/store/preferences";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { HeartButton, PressableScale, Text, VerifiedBadge } from "@/ui";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - spacing.xl * 2 - spacing.xxl;
  const map = useRef<ListingMapHandle>(null);
  const list = useRef<FlatList<ListingSummary>>(null);
  const { filters, setFilters } = useFilters();
  const coords = useLocation((s) => s.coords);
  const requestLocation = useLocation((s) => s.request);
  const [sheet, setSheet] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const search = useSearch({ ...filters, lat: coords?.lat, lng: coords?.lng, sort: coords ? "distance" : "newest", limit: 50 });
  const listings = useMemo(() => search.data?.pages.flatMap((p) => p.items) ?? [], [search.data]);

  // FlatList requires a stable onViewableItemsChanged; it only touches refs/setters, so a one-time closure is safe.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0]?.item as ListingSummary | undefined;
    if (first) {
      setSelectedId(first.id);
      map.current?.focus(first.location, true);
    }
  });

  function selectFromPin(id: string) {
    const i = listings.findIndex((l) => l.id === id);
    if (i < 0) return;
    setSelectedId(id);
    list.current?.scrollToIndex({ index: i, animated: true, viewOffset: spacing.xl });
  }

  async function recenter() {
    if (coords) return map.current?.focus(coords);
    if (await requestLocation()) {
      const c = useLocation.getState().coords;
      if (c) map.current?.focus(c);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ListingMap ref={map} listings={listings} selectedId={selectedId} onSelect={selectFromPin} center={coords} showsUserLocation={!!coords} style={StyleSheet.absoluteFill} />

      <Animated.View entering={FadeInDown} style={[styles.top, { top: insets.top + spacing.md }]}>
        <View style={[styles.countPill, shadow.md]}>
          <Text variant="smallMedium">{search.isPending ? "Loading flats…" : `${search.data?.pages[0]?.total ?? 0} flats in view`}</Text>
        </View>
        <View style={shadow.md}>
          <FilterButton count={countActiveFilters(filters)} onPress={() => setSheet(true)} inverted />
        </View>
      </Animated.View>

      <View style={[styles.bottom, { bottom: spacing.lg }]}>
        <PressableScale onPress={recenter} style={[styles.locate, shadow.md]} accessibilityLabel="Centre on my location">
          <LocateFixed size={22} color={colors.primary} />
        </PressableScale>

        {!search.isPending && listings.length === 0 ? (
          <Animated.View entering={FadeInUp} style={[styles.empty, shadow.md]}>
            <MapPinOff size={22} color={colors.muted} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              No flats match these filters
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            ref={list}
            horizontal
            data={listings}
            keyExtractor={(l) => l.id}
            renderItem={({ item, index }) => <MapCard listing={item} width={cardWidth} index={index} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + spacing.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            getItemLayout={(_, i) => ({ length: cardWidth + spacing.md, offset: (cardWidth + spacing.md) * i, index: i })}
            onEndReached={() => search.hasNextPage && void search.fetchNextPage()}
          />
        )}
      </View>

      <FilterSheet visible={sheet} value={filters} onClose={() => setSheet(false)} onApply={(f) => (setFilters(f), setSheet(false))} />
    </View>
  );
}

function MapCard({ listing, width, index }: { listing: ListingSummary; width: number; index: number }) {
  const router = useRouter();
  const favIds = useFavoriteIds();
  const toggle = useToggleFavorite();
  const fav = favIds.has(listing.id);
  const distance = formatDistance(listing.distanceKm);

  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 3) * 80)} style={{ width }}>
      <PressableScale scaleTo={0.97} onPress={() => router.push({ pathname: "/listing/[id]", params: { id: listing.id } })} style={[styles.card, shadow.lg]}>
        <Image source={listing.coverPhoto ?? undefined} style={styles.cardImg} contentFit="cover" transition={250} recyclingKey={listing.id} />
        <View style={styles.cardBody}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            {listing.owner.verified && <VerifiedBadge />}
          </View>
          <Text variant="h3" numberOfLines={1}>
            {listing.area}
          </Text>
          <Text variant="small" color={colors.muted} numberOfLines={1}>
            {listing.roomType} · {furnishingLabel(listing.furnishing)}
            {distance ? ` · ${distance}` : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: "auto" }}>
            <Text variant="h3" color={colors.primary}>
              {formatRupees(listing.rent)}
            </Text>
            <Text variant="small" color={colors.muted}>
              /mo
            </Text>
          </View>
        </View>
        <View style={styles.cardHeart}>
          <HeartButton active={fav} size={32} onToggle={() => toggle.mutate({ listing, favorite: !fav })} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: spacing.xl, right: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  countPill: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill },
  bottom: { position: "absolute", left: 0, right: 0, gap: spacing.md },
  locate: { alignSelf: "flex-end", marginRight: spacing.xl, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  empty: { marginHorizontal: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white },
  card: { flexDirection: "row", backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden", height: 124 },
  cardImg: { width: 116, height: "100%", backgroundColor: colors.border },
  cardBody: { flex: 1, padding: spacing.md, gap: 2 },
  cardHeart: { position: "absolute", top: spacing.sm, right: spacing.sm },
});
