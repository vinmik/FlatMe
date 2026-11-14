import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { ChevronRight, HelpCircle, Home, LogOut, Mail, Pencil, Settings, type LucideIcon } from "lucide-react-native";
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { queryClient, useFavorites, useMyListings } from "@/api/hooks";
import { config } from "@/lib/config";
import { useSession } from "@/store/session";
import { colors, gradients, radius, shadow, spacing } from "@/theme/tokens";
import { AnimatedNumber, Avatar, PressableScale, Text, VerifiedBadge } from "@/ui";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const mine = useMyListings();
  const favs = useFavorites();
  if (!user) return null;

  const activeCount = mine.data?.filter((l) => l.status === "active").length ?? 0;

  function confirmSignOut() {
    const go = () => {
      queryClient.clear();
      void signOut();
    };
    if (Platform.OS === "web") return go();
    Alert.alert("Sign out?", "You'll need a fresh code from your work email to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: go },
    ]);
  }

  const rows: { icon: LucideIcon; label: string; hint?: string; href?: Href; onPress?: () => void }[] = [
    { icon: Home, label: "My listings", hint: mine.data ? `${mine.data.length}` : undefined, href: "/my-listings" },
    { icon: Pencil, label: "Edit profile", href: "/edit-profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: HelpCircle, label: "Help & support", onPress: () => void Linking.openURL(`mailto:${config.supportEmail}?subject=FlatMe%20support`) },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.avatarRing}>
          <Avatar name={user.fullName} uri={user.avatarUrl} size={88} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80)} style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="h1" color={colors.white} align="center">
            {user.fullName}
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.88)" align="center">
            {user.designation} · {user.company}
          </Text>
          {user.verified && <VerifiedBadge style={{ marginTop: spacing.xs }} />}
        </Animated.View>
      </LinearGradient>

      <Animated.View entering={FadeInDown.delay(140).springify().damping(18)} style={[styles.stats, shadow.md]}>
        <Stat value={activeCount} label="Active listings" />
        <View style={styles.divider} />
        <Stat value={favs.data?.length ?? 0} label="Saved flats" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={[styles.card, shadow.sm]}>
        <View style={styles.emailRow}>
          <Mail size={16} color={colors.muted} />
          <Text variant="small" color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </Animated.View>

      <View style={[styles.card, shadow.sm, { paddingVertical: spacing.xs }]}>
        {rows.map((r, i) => (
          <Animated.View key={r.label} entering={FadeInDown.delay(240 + i * 60)}>
            <PressableScale scaleTo={0.98} onPress={r.onPress ?? (() => r.href && router.push(r.href))} style={[styles.row, i > 0 && styles.rowBorder]} accessibilityRole="button">
              <View style={styles.rowIcon}>
                <r.icon size={18} color={colors.primary} />
              </View>
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {r.label}
              </Text>
              {r.hint && (
                <Text variant="smallMedium" color={colors.muted}>
                  {r.hint}
                </Text>
              )}
              <ChevronRight size={18} color={colors.subtle} />
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(520)}>
        <PressableScale onPress={confirmSignOut} style={[styles.card, styles.row, shadow.sm]} accessibilityRole="button" testID="sign-out">
          <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
            <LogOut size={18} color={colors.danger} />
          </View>
          <Text variant="bodyMedium" color={colors.danger} style={{ flex: 1 }}>
            Sign out
          </Text>
        </PressableScale>
      </Animated.View>
      <Text variant="caption" color={colors.subtle} align="center" style={{ marginTop: spacing.xl }}>
        FlatMe · made for working professionals
      </Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <AnimatedNumber value={value} variant="h1" color={colors.primary} />
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + spacing.xl },
  avatarRing: { padding: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.35)" },
  stats: { flexDirection: "row", marginHorizontal: spacing.xl, marginTop: -spacing.xxxl, backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: spacing.lg },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  card: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  emailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md + 2 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
