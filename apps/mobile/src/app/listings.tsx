import { countActiveFilters, type ListingFilters, type SearchQuery } from "@flatme/shared";
import { useLocalSearchParams } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSearch } from "@/api/hooks";
import { FilterButton } from "@/features/listings/FilterButton";
import { FilterSheet } from "@/features/listings/FilterSheet";
import { ConnectedListingCard } from "@/features/listings/ListingCard";
import { useFilters, useLocation } from "@/store/preferences";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import { Button, Chip, EmptyState, Header, ListingCardSkeleton, PressableScale, Text } from "@/ui";

type Sort = NonNullable<SearchQuery["sort"]>;
const SORTS: { value: Sort; label: string; needsLocation?: boolean }[] = [
  { value: "distance", label: "Nearest", needsLocation: true },
  { value: "newest", label: "Newest" },
  { value: "rent-asc", label: "Price: low to high" },
  { value: "rent-desc", label: "Price: high to low" },
];

const RAIL_TITLES: Record<string, string> = {
  closest: "Closest to you",
  budget: "Budget friendly",
  furnished: "Fully furnished",
  immediate: "Move in now",
  newest: "Just listed",
};

/** Rails on Explore open this screen pre-configured, so "See all" is just a sort + filter preset. */
function railPreset(rail: string | undefined, f: ListingFilters, hasLocation: boolean): { sort: Sort; filters: ListingFilters } {
  switch (rail) {
    case "closest":
      return { sort: hasLocation ? "distance" : "newest", filters: f };
    case "budget":
      return { sort: "rent-asc", filters: f };
    case "furnished":
      return { sort: "newest", filters: { ...f, furnishing: "furnished" } };
    case "immediate":
      return { sort: "newest", filters: { ...f, moveIn: "immediate" } };
    default:
      return { sort: hasLocation ? "distance" : "newest", filters: f };
  }
}

export default function ListingsScreen() {
  const { rail } = useLocalSearchParams<{ rail?: string }>();
  const coords = useLocation((s) => s.coords);
  const globalFilters = useFilters((s) => s.filters);
  const preset = useMemo(() => railPreset(rail, globalFilters, !!coords), [rail, globalFilters, coords]);
  const [filters, setFilters] = useState(preset.filters);
  const [sort, setSort] = useState<Sort>(preset.sort);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState(false);
  const q = useDeferredValue(text.trim().toLowerCase());

  const search = useSearch({ ...filters, sort, lat: coords?.lat, lng: coords?.lng, limit: 20 });
  const all = useMemo(() => search.data?.pages.flatMap((p) => p.items) ?? [], [search.data]);
  // Free-text narrows the loaded page client-side (area/locality); structured filters go to the API.
  const items = useMemo(() => (q ? all.filter((l) => `${l.area} ${l.locality} ${l.owner.company}`.toLowerCase().includes(q)) : all), [all, q]);
  const total = search.data?.pages[0]?.total ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title={rail ? (RAIL_TITLES[rail] ?? "All flats") : "Search flats"} />
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search size={18} color={colors.muted} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Area, locality or company"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              autoFocus={!rail}
              returnKeyType="search"
              autoCorrect={false}
            />
            {text.length > 0 && (
              <PressableScale onPress={() => setText("")} hitSlop={8} accessibilityLabel="Clear search">
                <X size={18} color={colors.muted} />
              </PressableScale>
            )}
          </View>
          <FilterButton count={countActiveFilters(filters)} onPress={() => setSheet(true)} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}>
          {SORTS.filter((s) => !s.needsLocation || coords).map((s) => (
            <Chip key={s.value} size="sm" label={s.label} selected={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </ScrollView>
      </View>

      {search.isPending ? (
        <View style={styles.list}>
          <ListingCardSkeleton width="100%" />
          <ListingCardSkeleton width="100%" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          renderItem={({ item, index }) => <ConnectedListingCard listing={item} layout="full" index={index % 20} />}
          contentContainerStyle={[styles.list, items.length === 0 && { flex: 1 }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => search.hasNextPage && !search.isFetchingNextPage && void search.fetchNextPage()}
          refreshControl={<RefreshControl refreshing={search.isRefetching && !search.isFetchingNextPage} onRefresh={() => void search.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <Animated.View entering={FadeIn}>
              <Text variant="smallMedium" color={colors.muted}>
                {q ? `${items.length} matching “${text.trim()}”` : `${total} flat${total === 1 ? "" : "s"} found`}
              </Text>
            </Animated.View>
          }
          ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} /> : undefined}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={{ flex: 1 }}>
              <EmptyState
                icon={Search}
                title="No flats found"
                body={q ? "Try a different area or locality." : "Try widening your budget or removing filters."}
                action={
                  <Button
                    title="Reset search"
                    size="md"
                    variant="secondary"
                    onPress={() => {
                      setText("");
                      setFilters(preset.filters);
                    }}
                  />
                }
              />
            </Animated.View>
          }
        />
      )}
      <FilterSheet visible={sheet} value={filters} onClose={() => setSheet(false)} onApply={(f) => (setFilters(f), setSheet(false))} />
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { gap: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  searchRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl },
  search: { flex: 1, height: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: "100%" },
  list: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
});
