import { availabilityLabel, formatDistance, formatRupees, furnishingLabel, type ListingDetail } from "@flatme/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Eye,
  Flag,
  Home,
  MapPin,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Share2,
  Sofa,
  Trash2,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Share, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, errorMessage } from "@/api";
import { useDeleteListing, useListing, useSetListingStatus, useToggleFavorite } from "@/api/hooks";
import { ContactSheet } from "@/features/listing-detail/ContactSheet";
import { GALLERY_HEIGHT, PhotoGallery } from "@/features/listing-detail/PhotoGallery";
import { ReportSheet } from "@/features/listing-detail/ReportSheet";
import { ListingMap } from "@/features/listings/ListingMap";
import { config } from "@/lib/config";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Avatar, Badge, Button, Chip, EmptyState, HeartButton, PressableScale, Skeleton, Text, toast, VerifiedBadge } from "@/ui";

const GENDER_LABEL = { any: "Anyone", male: "Male only", female: "Female only" } as const;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useListing(id);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerBg = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [GALLERY_HEIGHT - 140, GALLERY_HEIGHT - 60], [0, 1], Extrapolation.CLAMP) }));

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (q.isPending) return <DetailSkeleton onBack={back} />;
  if (q.isError || !q.data) {
    const gone = q.error instanceof ApiError && q.error.status === 404;
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.white }}>
        <FloatingButton icon={ArrowLeft} onPress={back} label="Back" style={{ margin: spacing.lg }} />
        <EmptyState
          icon={Home}
          title={gone ? "This flat is no longer available" : "Couldn't load this flat"}
          body={gone ? "The owner may have rented it out or removed it." : errorMessage(q.error)}
          action={<Button title={gone ? "Explore other flats" : "Retry"} size="md" onPress={gone ? back : () => void q.refetch()} />}
        />
      </View>
    );
  }

  const l = q.data;
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <PhotoGallery photos={l.photos} scrollY={scrollY} />
        <Body listing={l} />
      </Animated.ScrollView>

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.headerBg, headerBg]} />
        <FloatingButton icon={ArrowLeft} onPress={back} label="Back" />
        <Animated.View style={[{ flex: 1 }, headerBg]}>
          <Text variant="h3" numberOfLines={1} align="center">
            {l.roomType} in {l.area}
          </Text>
        </Animated.View>
        <HeaderActions listing={l} />
      </View>

      {l.isOwner ? <OwnerBar listing={l} /> : <ContactBar listing={l} />}
    </View>
  );
}

function Body({ listing: l }: { listing: ListingDetail }) {
  const distance = formatDistance(l.distanceKm);
  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Home, label: "Room type", value: l.roomType },
    { icon: Sofa, label: "Furnishing", value: furnishingLabel(l.furnishing) },
    { icon: CalendarDays, label: "Available", value: availabilityLabel(l.availableFrom, l.flexible) },
    { icon: Users, label: "Flatmates", value: l.flatmates === 0 ? "None yet" : `${l.flatmates} current` },
    { icon: UserRound, label: "Looking for", value: GENDER_LABEL[l.genderPreference] },
  ];

  return (
    <View style={styles.body}>
      {l.isOwner && l.status !== "active" && <StatusBanner listing={l} />}

      <Animated.View entering={FadeInUp.springify().damping(18)} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {l.owner.verified && <VerifiedBadge />}
          {l.flexible && <Badge label="Flexible move-in" tone="success" />}
          {l.isOwner && <Badge label="Your listing" tone="soft" />}
        </View>
        <Text variant="h1">
          {l.roomType} in {l.area}
        </Text>
        <View style={styles.inline}>
          <MapPin size={15} color={colors.muted} />
          <Text variant="body" color={colors.muted} style={{ flex: 1 }} numberOfLines={2}>
            {l.locality}
            {distance ? ` · ${distance} away` : ""}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80)} style={styles.priceCard}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.primaryDark}>
            MONTHLY RENT
          </Text>
          <Text variant="price" color={colors.primary}>
            {formatRupees(l.rent)}
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.primaryDark}>
            DEPOSIT
          </Text>
          <Text variant="h2">{l.deposit ? formatRupees(l.deposit) : "None"}</Text>
        </View>
      </Animated.View>

      <View style={styles.facts}>
        {facts.map((f, i) => (
          <Animated.View key={f.label} entering={FadeInDown.delay(120 + i * 50)} style={styles.fact}>
            <View style={styles.factIcon}>
              <f.icon size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.muted}>
                {f.label}
              </Text>
              <Text variant="smallMedium">{f.value}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {l.description ? (
        <Section title="About this flat" delay={200}>
          <Text variant="body" color={colors.foreground}>
            {l.description}
          </Text>
        </Section>
      ) : null}

      {l.amenities.length > 0 && (
        <Section title="Amenities" delay={240}>
          <View style={styles.chips}>
            {l.amenities.map((a) => (
              <Chip key={a} label={a} size="sm" />
            ))}
          </View>
        </Section>
      )}

      <Section title="Location" delay={280}>
        <View style={styles.mapWrap}>
          <ListingMap listings={[l]} selectedId={l.id} center={l.location} interactive={false} style={StyleSheet.absoluteFill} />
        </View>
        <Text variant="small" color={colors.muted}>
          Exact address is shared by the owner once you connect.
        </Text>
      </Section>

      <Section title="Listed by" delay={320}>
        <View style={styles.ownerCard}>
          <Avatar name={l.owner.firstName} uri={l.owner.avatarUrl} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.inline}>
              <Text variant="h3">{l.owner.firstName}</Text>
              {l.owner.verified && <VerifiedBadge />}
            </View>
            <Text variant="small" color={colors.muted}>
              {l.owner.designation} at {l.owner.company}
            </Text>
          </View>
        </View>
      </Section>
    </View>
  );
}

function StatusBanner({ listing: l }: { listing: ListingDetail }) {
  const removed = l.status === "removed";
  return (
    <Animated.View entering={FadeInDown} style={[styles.banner, removed ? styles.bannerDanger : styles.bannerWarn]}>
      <AlertTriangle size={18} color={removed ? colors.danger : colors.warning} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallMedium">{removed ? "Removed by FlatMe moderation" : "Paused — hidden from search"}</Text>
        <Text variant="small" color={colors.muted}>
          {removed ? (l.moderationReason ?? "This listing broke our community guidelines.") + " Contact support if you think this is a mistake." : "Resume it any time to start getting enquiries again."}
        </Text>
      </View>
    </Animated.View>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={{ gap: spacing.md }}>
      <Text variant="h3">{title}</Text>
      {children}
    </Animated.View>
  );
}

function HeaderActions({ listing }: { listing: ListingDetail }) {
  const toggle = useToggleFavorite();
  const [report, setReport] = useState(false);

  async function share() {
    const url = `${config.shareBaseUrl}/${listing.id}`;
    const message = `${listing.roomType} in ${listing.area} for ${formatRupees(listing.rent)}/mo on FlatMe`;
    await Share.share(Platform.OS === "ios" ? { message, url } : { message: `${message}\n${url}` }).catch(() => {});
  }

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <FloatingButton icon={Share2} onPress={share} label="Share" />
      {!listing.isOwner && (
        <>
          <View style={[styles.floating, shadow.sm]}>
            <HeartButton active={listing.isFavorite} size={40} onToggle={() => toggle.mutate({ listing, favorite: !listing.isFavorite })} />
          </View>
          <FloatingButton icon={Flag} onPress={() => setReport(true)} label="Report listing" />
          <ReportSheet listingId={listing.id} visible={report} onClose={() => setReport(false)} />
        </>
      )}
    </View>
  );
}

function ContactBar({ listing }: { listing: ListingDetail }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <Animated.View entering={FadeInUp.delay(250).springify().damping(18)} style={[styles.bar, shadow.lg, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={{ flex: 1 }}>
        <Text variant="h2" color={colors.primary}>
          {formatRupees(listing.rent)}
          <Text variant="small" color={colors.muted}>
            {" "}
            /month
          </Text>
        </Text>
        <Text variant="caption" color={colors.muted}>
          {availabilityLabel(listing.availableFrom, listing.flexible)}
        </Text>
      </View>
      <Button title="Contact owner" icon={MessageSquare} onPress={() => setOpen(true)} style={{ flex: 1.2 }} testID="contact-owner" />
      <ContactSheet listing={listing} visible={open} onClose={() => setOpen(false)} />
    </Animated.View>
  );
}

function OwnerBar({ listing }: { listing: ListingDetail }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setStatus = useSetListingStatus();
  const del = useDeleteListing();
  const paused = listing.status === "paused";
  const removed = listing.status === "removed";

  function toggleStatus() {
    setStatus.mutate(
      { id: listing.id, status: paused ? "active" : "paused" },
      { onSuccess: () => toast.success(paused ? "Listing is live again" : "Listing paused"), onError: (e) => toast.error(errorMessage(e)) },
    );
  }

  function confirmDelete() {
    const go = () =>
      del.mutate(listing.id, {
        onSuccess: () => {
          toast.success("Listing deleted");
          router.back();
        },
        onError: (e) => toast.error(errorMessage(e)),
      });
    if (Platform.OS === "web") return go();
    Alert.alert("Delete listing?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: go },
    ]);
  }

  return (
    <Animated.View entering={FadeInUp.delay(250)} style={[styles.bar, shadow.lg, { paddingBottom: Math.max(insets.bottom, spacing.lg), flexDirection: "column", alignItems: "stretch" }]}>
      <View style={[styles.inline, { gap: spacing.lg }]}>
        <View style={styles.inline}>
          <Eye size={15} color={colors.muted} />
          <Text variant="small" color={colors.muted}>
            {listing.stats.views} views
          </Text>
        </View>
        <View style={styles.inline}>
          <MessageSquare size={15} color={colors.muted} />
          <Text variant="small" color={colors.muted}>
            {listing.stats.inquiries} enquiries
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <PressableScale onPress={confirmDelete} style={[styles.square, { borderColor: colors.dangerSoft, backgroundColor: colors.dangerSoft }]} accessibilityLabel="Delete listing">
          <Trash2 size={20} color={colors.danger} />
        </PressableScale>
        {!removed && (
          <PressableScale onPress={toggleStatus} disabled={setStatus.isPending} style={styles.square} accessibilityLabel={paused ? "Resume listing" : "Pause listing"}>
            {paused ? <Play size={20} color={colors.success} /> : <Pause size={20} color={colors.foreground} />}
          </PressableScale>
        )}
        <Button title="Edit listing" icon={Pencil} onPress={() => router.push({ pathname: "/listing/edit/[id]", params: { id: listing.id } })} style={{ flex: 1 }} disabled={removed} />
      </View>
    </Animated.View>
  );
}

function FloatingButton({ icon: Icon, onPress, label, style }: { icon: LucideIcon; onPress: () => void; label: string; style?: object }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.floating, shadow.sm, style]}>
      <Icon size={20} color={colors.foreground} />
    </PressableScale>
  );
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Skeleton height={GALLERY_HEIGHT} rounded={0} />
      <FloatingButton icon={ArrowLeft} onPress={onBack} label="Back" style={{ position: "absolute", top: insets.top + spacing.sm, left: spacing.lg }} />
      <View style={[styles.body, { gap: spacing.lg }]}>
        <Skeleton width={120} height={22} />
        <Skeleton width="80%" height={30} />
        <Skeleton width="60%" height={18} />
        <Skeleton height={80} rounded={radius.lg} />
        <Skeleton height={140} rounded={radius.lg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerBg: { backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  floating: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  body: { marginTop: -spacing.xxl, backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.xxl },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  priceCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.accent },
  vDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.accent },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg },
  fact: { width: "50%", flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.sm },
  factIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  mapWrap: { height: 170, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.border },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  banner: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  bannerWarn: { backgroundColor: colors.warningSoft, borderColor: "#fde68a" },
  bannerDanger: { backgroundColor: colors.dangerSoft, borderColor: "#fecaca" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  square: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
});
