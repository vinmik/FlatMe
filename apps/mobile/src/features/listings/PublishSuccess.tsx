import type { ListingDetail } from "@flatme/shared";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, PartyPopper } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { config } from "@/lib/config";
import { haptics } from "@/lib/haptics";
import { colors, radius, spacing } from "@/theme/tokens";
import { Button, PressableScale, Text } from "@/ui";

const CONFETTI_COLORS = ["#0891b2", "#22d3ee", "#f59e0b", "#ef4444", "#16a34a", "#a855f7"];

/** Full-screen celebration after publishing: confetti burst, share link and next actions. */
export function PublishSuccess({ listing, edited, onView, onDone }: { listing: ListingDetail; edited: boolean; onView: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const link = `${config.shareBaseUrl}/${listing.id}`;

  async function copy() {
    await Clipboard.setStringAsync(link);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Animated.View entering={FadeIn} style={[styles.root, { paddingTop: insets.top + spacing.xxxl, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      {!edited && <Confetti />}
      <Animated.View entering={ZoomIn.springify().damping(9).delay(100)} style={styles.badge}>
        <PartyPopper size={48} color={colors.primary} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(250)} style={{ gap: spacing.sm }}>
        <Text variant="display" align="center">
          {edited ? "Changes saved" : "You're live! 🎉"}
        </Text>
        <Text variant="body" color={colors.muted} align="center">
          {edited
            ? "Your listing has been updated."
            : `Your ${listing.roomType} in ${listing.area} is now visible to verified professionals nearby.`}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(380)} style={styles.linkBox}>
        <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
          {link}
        </Text>
        <PressableScale onPress={copy} style={[styles.copy, copied && { backgroundColor: colors.success }]} accessibilityLabel="Copy link">
          {copied ? <Check size={16} color={colors.white} /> : <Copy size={16} color={colors.white} />}
          <Text variant="smallMedium" color={colors.white}>
            {copied ? "Copied" : "Copy link"}
          </Text>
        </PressableScale>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(440)}>
        <Text variant="caption" color={colors.subtle} align="center">
          Share it in your office Slack or WhatsApp groups for faster responses.
        </Text>
      </Animated.View>

      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInDown.delay(520)} style={{ gap: spacing.sm }}>
        <Button title="View listing" onPress={onView} testID="view-published" />
        <Button title="Back to explore" variant="ghost" size="md" onPress={onDone} />
      </Animated.View>
    </Animated.View>
  );
}

/** Deterministic hash → [0, 1); keeps render pure while still looking random. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: rand(i, 1) * width,
        drift: (rand(i, 2) - 0.5) * 160,
        delay: rand(i, 3) * 400,
        size: 6 + rand(i, 4) * 6,
        rotate: rand(i, 5) * 720,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        round: i % 3 === 0,
      })),
    [width],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height * 0.9} />
      ))}
    </View>
  );
}

function Piece({ x, drift, delay, size, rotate, color, round, fall }: { x: number; drift: number; delay: number; size: number; rotate: number; color: string; round: boolean; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [{ translateX: x + drift * t.value }, { translateY: -40 + fall * t.value }, { rotate: `${rotate * t.value}deg` }],
  }));
  return <Animated.View style={[{ position: "absolute", width: size, height: round ? size : size * 0.45, borderRadius: round ? size / 2 : 1, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: colors.white, paddingHorizontal: spacing.xxl, gap: spacing.xl, zIndex: 10 },
  badge: { alignSelf: "center", width: 112, height: 112, borderRadius: 56, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  linkBox: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, paddingLeft: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas },
  copy: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
});
