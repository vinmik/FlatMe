import { availabilityLabel, formatDistance, formatRupees, furnishingLabel, type ListingSummary } from "@flatme/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Home, MapPin, Users } from "lucide-react-native";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import { useFavoriteIds, useToggleFavorite } from "@/api/hooks";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Badge, CompanyMark, HeartButton, PressableScale, Text, VerifiedBadge } from "@/ui";

export const RAIL_CARD_WIDTH = 280;

interface ListingCardProps {
  listing: ListingSummary;
  layout?: "rail" | "full";
  index?: number;
  favorite: boolean;
  onToggleFavorite: (listing: ListingSummary, next: boolean) => void;
}

/** Listing card from the Figma mock: photo with badges, company, area, price and quick facts. */
export const ListingCard = memo(function ListingCard({ listing, layout = "rail", index = 0, favorite, onToggleFavorite }: ListingCardProps) {
  const router = useRouter();
  const distance = formatDistance(listing.distanceKm);
  const entering = (layout === "rail" ? FadeInRight : FadeInUp).delay(Math.min(index, 6) * 70).springify().damping(18);

  return (
    <Animated.View entering={entering} style={layout === "rail" ? { width: RAIL_CARD_WIDTH } : undefined}>
      <PressableScale
        scaleTo={0.97}
        onPress={() => router.push({ pathname: "/listing/[id]", params: { id: listing.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${listing.roomType} in ${listing.area}, ${formatRupees(listing.rent)} per month`}
        style={[styles.card, shadow.sm]}
      >
        <View style={[styles.media, layout === "full" && { height: 210 }]}>
          <Image source={listing.coverPhoto ?? undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} recyclingKey={listing.id} placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }} />
          <View style={styles.topLeft}>
            {listing.owner.verified && <VerifiedBadge />}
            {distance && <Badge tone="glass" label={distance} />}
          </View>
          <View style={styles.topRight}>
            <HeartButton active={favorite} onToggle={() => onToggleFavorite(listing, !favorite)} />
          </View>
          <View style={styles.bottomLeft}>
            <Badge tone="glass" label={furnishingLabel(listing.furnishing)} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <CompanyMark company={listing.owner.company} />
            <Text variant="smallMedium" color={colors.foreground} numberOfLines={1} style={{ flex: 1 }}>
              {listing.owner.company} · {listing.owner.firstName}
            </Text>
            <Text variant="caption" color={colors.success}>
              {availabilityLabel(listing.availableFrom, listing.flexible)}
            </Text>
          </View>
          <View style={styles.row}>
            <MapPin size={14} color={colors.muted} />
            <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
              {listing.area} · {listing.locality}
            </Text>
          </View>
          <View style={[styles.row, { alignItems: "baseline", gap: 4 }]}>
            <Text variant="price" color={colors.primary}>
              {formatRupees(listing.rent)}
            </Text>
            <Text variant="small" color={colors.muted}>
              /month
            </Text>
          </View>
          <View style={styles.facts}>
            <View style={styles.row}>
              <Users size={15} color={colors.muted} />
              <Text variant="small" color={colors.muted}>
                {listing.flatmates} flatmate{listing.flatmates === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.row}>
              <Home size={15} color={colors.muted} />
              <Text variant="small" color={colors.muted}>
                {listing.roomType}
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
});

/** Card wired to the favourites cache — the common case for any list of listings. */
export function ConnectedListingCard(props: Omit<ListingCardProps, "favorite" | "onToggleFavorite">) {
  const ids = useFavoriteIds();
  const toggle = useToggleFavorite();
  return <ListingCard {...props} favorite={ids.has(props.listing.id)} onToggleFavorite={(listing, favorite) => toggle.mutate({ listing, favorite })} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  media: { height: 190, backgroundColor: "#eef0f3" },
  topLeft: { position: "absolute", top: spacing.md, left: spacing.md, flexDirection: "row", gap: spacing.xs + 2 },
  topRight: { position: "absolute", top: spacing.md, right: spacing.md },
  bottomLeft: { position: "absolute", bottom: spacing.md, left: spacing.md },
  body: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  facts: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.sm + 2,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
