import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { gradients } from "@/theme/tokens";
import { LogoMark, Text } from "@/ui";

/**
 * Picks up exactly where the native splash (solid teal + icon) leaves off, then:
 * logo springs in → wordmark & tagline rise → ripple rings pulse → the whole layer
 * zooms and fades to reveal the app underneath.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const word = useSharedValue(0);
  const tagline = useSharedValue(0);
  const ring = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 250 });
    logo.value = withSpring(1, { damping: 9, stiffness: 140 });
    word.value = withDelay(280, withSpring(1, { damping: 16 }));
    tagline.value = withDelay(520, withTiming(1, { duration: 420 }));
    ring.value = withDelay(300, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1));
  }, [logo, logoOpacity, word, tagline, ring]);

  useEffect(() => {
    if (!ready) return;
    // Hold long enough for the intro to land, then reveal.
    exit.value = withDelay(
      1300,
      withSequence(
        withTiming(0.15, { duration: 160 }),
        withTiming(1, { duration: 520, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [ready, exit, onDone]);

  const container = useAnimatedStyle(() => ({ opacity: 1 - Math.max(0, exit.value - 0.15) / 0.85 }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logo.value * (1 + exit.value * 6) }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value * (1 - exit.value), transform: [{ translateY: (1 - word.value) * 24 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagline.value * (1 - exit.value), transform: [{ translateY: (1 - tagline.value) * 12 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.5 * (1 - exit.value), transform: [{ scale: 1 + ring.value * 1.6 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, container]} pointerEvents="none">
      <LinearGradient colors={gradients.brand} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={logoStyle}>
            <LogoMark size={96} inverted />
          </Animated.View>
        </View>
        <Animated.View style={wordStyle}>
          <Text variant="display" color="#fff" align="center" style={{ fontSize: 40, lineHeight: 46 }}>
            FlatMe
          </Text>
        </Animated.View>
        <Animated.View style={tagStyle}>
          <Text variant="bodyMedium" color="rgba(255,255,255,0.85)" align="center">
            Flatmates from companies you trust
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 999 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  logoWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  ring: { position: "absolute", width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: "#fff" },
});
