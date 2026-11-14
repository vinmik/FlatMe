import { MapPin, Navigation, ShieldCheck, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StepProgress } from "@/features/profile/StepProgress";
import { haptics } from "@/lib/haptics";
import { useLocation } from "@/store/preferences";
import { useSession } from "@/store/session";
import { colors, spacing } from "@/theme/tokens";
import { Button, Text } from "@/ui";

const PERKS = [
  { icon: Navigation, text: "See flats sorted by distance from you" },
  { icon: Sparkles, text: "Get a personalised “Near you” feed" },
  { icon: ShieldCheck, text: "Your exact location is never shared" },
] as const;

export default function OnboardingLocation() {
  const insets = useSafeAreaInsets();
  const request = useLocation((s) => s.request);
  const complete = useSession((s) => s.completeOnboarding);
  const [busy, setBusy] = useState(false);

  async function allow() {
    setBusy(true);
    const ok = await request();
    if (ok) haptics.success();
    setBusy(false);
    complete();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <StepProgress step={2} total={2} />
      <View style={styles.hero}>
        <PulsingPin />
      </View>
      <Animated.View entering={FadeInDown.delay(100)} style={{ gap: spacing.sm }}>
        <Text variant="h1" align="center">
          Find flats near work
        </Text>
        <Text variant="body" color={colors.muted} align="center">
          Allow location so we can show the closest flats to you and your office.
        </Text>
      </Animated.View>
      <View style={styles.perks}>
        {PERKS.map(({ icon: Icon, text }, i) => (
          <Animated.View key={text} entering={FadeInDown.delay(200 + i * 80)} style={styles.perk}>
            <View style={styles.perkIcon}>
              <Icon size={18} color={colors.primary} />
            </View>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {text}
            </Text>
          </Animated.View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInDown.delay(450)} style={{ gap: spacing.xs }}>
        <Button title="Allow location" icon={MapPin} onPress={allow} loading={busy} testID="allow-location" />
        <Button title="Not now" variant="ghost" size="md" onPress={complete} disabled={busy} />
      </Animated.View>
    </View>
  );
}

function PulsingPin() {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-10, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
  }, [bob]);
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + bob.value / 40 }], opacity: 0.25 + bob.value / 60 }));

  return (
    <View style={styles.pinWrap}>
      {[0, 1, 2].map((i) => (
        <Ring key={i} delay={i * 700} />
      ))}
      <Animated.View style={[styles.pinShadow, shadowStyle]} />
      <Animated.View style={[styles.pin, pinStyle]}>
        <MapPin size={44} color={colors.white} fill={colors.primary} strokeWidth={1.6} />
      </Animated.View>
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }), -1));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + p.value * 1.6 }], opacity: 0.5 * (1 - p.value) }));
  return <Animated.View style={[styles.ring, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xxl, gap: spacing.xl },
  hero: { height: 220, alignItems: "center", justifyContent: "center" },
  pinWrap: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary },
  pin: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  pinShadow: { position: "absolute", bottom: 40, width: 50, height: 10, borderRadius: 25, backgroundColor: colors.foreground },
  perks: { gap: spacing.md },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  perkIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
