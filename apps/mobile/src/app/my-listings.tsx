import { formatRupees, type ListingDetail } from "@flatme/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Eye, Home, MessageSquare, Plus } from "lucide-react-native";
import { FlatList, RefreshControl, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { errorMessage } from "@/api";
import { useMyListings, useSetListingStatus } from "@/api/hooks";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Badge, Button, EmptyState, Header, PressableScale, Skeleton, Text, toast } from "@/ui";

const STATUS = {
  active: { label: "Live", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  removed: { label: "Removed", tone: "danger" },
} as const;

export default function MyListingsScreen() {
  const router = useRouter();
  const mine = useMyListings();
  const items = mine.data ?? [];
  const totals = items.reduce((t, l) => ({ views: t.views + l.stats.views, inquiries: t.inquiries + l.stats.inquiries }), { views: 0, inquiries: 0 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title="My listings"
        right={
          <PressableScale onPress={() => router.push("/listing/new")} style={styles.add} accessibilityLabel="Post a room">
            <Plus size={20} color={colors.white} />
          </PressableScale>
        }
      />
      {mine.isPending ? (
        <View style={styles.list}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={128} rounded={radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          renderItem={({ item, index }) => <MyListingRow listing={item} index={index} />}
          contentContainerStyle={[styles.list, items.length === 0 && { flex: 1 }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            items.length ? (
              <Animated.View entering={FadeInDown} style={[styles.summary, shadow.sm]}>
                <Summary label="Listings" value={items.length} />
                <Summary label="Total views" value={totals.views} />
                <Summary label="Enquiries" value={totals.inquiries} />
              </Animated.View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon={Home}
              title="You haven't posted yet"
              body="Have a room to fill? It takes under 2 minutes to list it."
              action={<Button title="Post a room" icon={Plus} size="md" onPress={() => router.push("/listing/new")} />}
            />
          }
        />
      )}
    </View>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text variant="h2" color={colors.primary}>
        {value}
      </Text>
      <Text variant="caption" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}

function MyListingRow({ listing: l, index }: { listing: ListingDetail; index: number }) {
  const router = useRouter();
  const setStatus = useSetListingStatus();
  const s = STATUS[l.status];
  const live = l.status === "active";

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(18)}>
      <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: "/listing/[id]", params: { id: l.id } })} style={[styles.row, shadow.sm, !live && { opacity: 0.85 }]}>
        <Image source={l.coverPhoto ?? undefined} style={styles.thumb} contentFit="cover" transition={200} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Badge label={s.label} tone={s.tone} />
          </View>
          <Text variant="h3" numberOfLines={1}>
            {l.roomType} in {l.area}
          </Text>
          <Text variant="smallMedium" color={colors.primary}>
            {formatRupees(l.rent)}/mo
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Stat icon={Eye} value={l.stats.views} />
            <Stat icon={MessageSquare} value={l.stats.inquiries} />
          </View>
        </View>
        {l.status !== "removed" && (
          <Switch
            value={live}
            disabled={setStatus.isPending}
            onValueChange={(on) =>
              setStatus.mutate(
                { id: l.id, status: on ? "active" : "paused" },
                { onSuccess: () => toast.success(on ? "Listing is live" : "Listing paused"), onError: (e) => toast.error(errorMessage(e)) },
              )
            }
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
            accessibilityLabel={live ? "Pause listing" : "Resume listing"}
          />
        )}
      </PressableScale>
    </Animated.View>
  );
}

function Stat({ icon: Icon, value }: { icon: typeof Eye; value: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon size={13} color={colors.muted} />
      <Text variant="caption" color={colors.muted}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl * 2 },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.white },
  thumb: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.border },
});
