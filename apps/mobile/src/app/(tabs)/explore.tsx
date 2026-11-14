import { countActiveFilters, type ListingSummary } from "@flatme/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronRight, Clock, Home, IndianRupee, MapPin, Search, Sofa, Sparkles, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFeed } from "@/api/hooks";
import { FilterButton } from "@/features/listings/FilterButton";
import { FilterSheet } from "@/features/listings/FilterSheet";
import { ConnectedListingCard, RAIL_CARD_WIDTH } from "@/features/listings/ListingCard";
import { useFilters, useLocation } from "@/store/preferences";
import { useSession } from "@/store/session";
import { colors, gradients, radius, shadow, spacing } from "@/theme/tokens";
import { Button, EmptyState, ListingCardSkeleton, PressableScale, Skeleton, Text } from "@/ui";

const RAIL_ICONS: Record<string, LucideIcon> = { closest: MapPin, budget: IndianRupee, furnished: Sofa, immediate: Clock, newest: Sparkles };

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const permission = useLocation((s) => s.permission);
  const requestLocation = useLocation((s) => s.request);
  const { filters, setFilters, reset } = useFilters();
  const feed = useFeed();
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeCount = countActiveFilters(filters);

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 80], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [-100, 0, 100], [30, 0, -24], Extrapolation.CLAMP) }],
  }));

  async function refresh() {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  }

  const rails = feed.data?.rails.filter((r) => r.items.length > 0) ?? [];
  const firstName = user?.fullName.split(" ")[0] || "there";

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.white} colors={[colors.primary]} progressViewOffset={insets.top} />}
      >
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <Animated.View style={heroStyle}>
            <Animated.View entering={FadeInDown.duration(500)}>
              <Text variant="small" color="rgba(255,255,255,0.85)">
                {greeting()}, {firstName} 👋
              </Text>
              <Text variant="display" color={colors.white} style={{ marginTop: 2 }}>
                Find your next flat
              </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.searchRow}>
              <PressableScale onPress={() => router.push("/listings")} style={[styles.search, shadow.md]} accessibilityRole="search" accessibilityLabel="Search flats">
                <Search size={20} color={colors.muted} />
                <Text variant="body" color={colors.subtle} style={{ flex: 1 }} numberOfLines={1}>
                  Search area, locality…
                </Text>
              </PressableScale>
              <FilterButton count={activeCount} onPress={() => setSheet(true)} inverted />
            </Animated.View>
            {permission !== "granted" && (
              <Animated.View entering={FadeInDown.delay(200)}>
                <PressableScale onPress={() => void requestLocation()} style={styles.locationNudge}>
                  <MapPin size={14} color={colors.white} />
                  <Text variant="smallMedium" color={colors.white}>
                    Enable location to see flats near you
                  </Text>
                  <ChevronRight size={14} color={colors.white} />
                </PressableScale>
              </Animated.View>
            )}
          </Animated.View>
        </LinearGradient>

        <View style={styles.sheetTop}>
          {activeCount > 0 && (
            <Animated.View entering={FadeInDown} style={styles.filterBanner}>
              <Text variant="smallMedium" color={colors.primaryDark} style={{ flex: 1 }}>
                {activeCount} filter{activeCount > 1 ? "s" : ""} applied
              </Text>
              <PressableScale onPress={reset} hitSlop={8}>
                <Text variant="smallMedium" color={colors.primary}>
                  Clear all
                </Text>
              </PressableScale>
            </Animated.View>
          )}

          {feed.isPending ? (
            <RailsSkeleton />
          ) : feed.isError ? (
            <EmptyState icon={Home} title="Couldn't load flats" body="Check your connection and try again." action={<Button title="Retry" size="md" onPress={() => void feed.refetch()} />} />
          ) : rails.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No flats match"
              body="Try widening your budget or clearing some filters."
              action={<Button title="Clear filters" size="md" variant="secondary" onPress={reset} />}
            />
          ) : (
            rails.map((rail, i) => (
              <Rail key={rail.key} railKey={rail.key} title={rail.title} items={rail.items} index={i} onSeeAll={() => router.push({ pathname: "/listings", params: { rail: rail.key } })} />
            ))
          )}
        </View>
      </Animated.ScrollView>

      <FilterSheet visible={sheet} value={filters} onClose={() => setSheet(false)} onApply={(f) => (setFilters(f), setSheet(false))} />
    </View>
  );
}

function Rail({ railKey, title, items, index, onSeeAll }: { railKey: string; title: string; items: ListingSummary[]; index: number; onSeeAll: () => void }) {
  const Icon = RAIL_ICONS[railKey] ?? Sparkles;
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 90).springify().damping(18)} style={styles.rail}>
      <View style={styles.railHead}>
        <View style={styles.railIcon}>
          <Icon size={16} color={colors.primary} />
        </View>
        <Text variant="h3" style={{ flex: 1 }}>
          {title}
        </Text>
        <PressableScale onPress={onSeeAll} hitSlop={8} style={styles.seeAll} accessibilityLabel={`See all ${title}`}>
          <Text variant="smallMedium" color={colors.primary}>
            See all
          </Text>
          <ChevronRight size={16} color={colors.primary} />
        </PressableScale>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(l) => l.id}
        renderItem={({ item, index: i }) => <ConnectedListingCard listing={item} index={i} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railList}
        snapToInterval={RAIL_CARD_WIDTH + spacing.lg}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: spacing.lg }} />}
      />
    </Animated.View>
  );
}

function RailsSkeleton() {
  return (
    <View style={{ gap: spacing.xxl, paddingTop: spacing.lg }}>
      {[0, 1].map((i) => (
        <View key={i} style={{ gap: spacing.md }}>
          <Skeleton width={160} height={20} style={{ marginHorizontal: spacing.xl }} />
          <View style={{ flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.xl }}>
            <ListingCardSkeleton />
            <ListingCardSkeleton />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + spacing.lg },
  searchRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  search: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  locationNudge: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, marginTop: spacing.md, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  sheetTop: { marginTop: -spacing.xxl, backgroundColor: colors.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.lg, minHeight: 400 },
  filterBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent },
  rail: { paddingTop: spacing.lg, gap: spacing.md },
  railHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  railIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  railList: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, paddingTop: spacing.xs },
});
