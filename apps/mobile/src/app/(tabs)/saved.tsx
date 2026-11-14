import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFavorites } from "@/api/hooks";
import { ConnectedListingCard } from "@/features/listings/ListingCard";
import { colors, spacing } from "@/theme/tokens";
import { Button, EmptyState, ListingCardSkeleton, Text } from "@/ui";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const favs = useFavorites();
  const items = favs.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Animated.View entering={FadeInDown} style={[styles.head, { paddingTop: insets.top + spacing.lg }]}>
        <Text variant="h1">Saved</Text>
        <Text variant="body" color={colors.muted}>
          {items.length ? `${items.length} flat${items.length > 1 ? "s" : ""} you liked` : "Flats you ❤️ show up here"}
        </Text>
      </Animated.View>
      {favs.isPending ? (
        <View style={styles.list}>
          <ListingCardSkeleton width="100%" />
          <ListingCardSkeleton width="100%" />
        </View>
      ) : (
        <Animated.FlatList
          data={items}
          keyExtractor={(l) => l.id}
          itemLayoutAnimation={LinearTransition.springify().damping(18)}
          renderItem={({ item, index }) => <ConnectedListingCard listing={item} layout="full" index={index} />}
          contentContainerStyle={[styles.list, items.length === 0 && { flex: 1 }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          refreshControl={<RefreshControl refreshing={favs.isRefetching} onRefresh={() => void favs.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon={Heart}
              title="No saved flats yet"
              body="Tap the heart on any listing to keep it here for later."
              action={<Button title="Explore flats" size="md" onPress={() => router.navigate("/explore")} />}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs, backgroundColor: colors.canvas },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: spacing.lg },
});
