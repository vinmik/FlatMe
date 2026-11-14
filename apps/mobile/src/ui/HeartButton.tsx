import { Heart } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { colors, shadow } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";

const PARTICLES = 6;

/** Favourite toggle: heart pops with a spring and bursts a ring of particles when liked. */
export function HeartButton({ active, onToggle, size = 36 }: { active: boolean; onToggle: () => void; size?: number }) {
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.value = withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 300 }));
    if (active) {
      burst.value = 0;
      burst.value = withTiming(1, { duration: 520 });
    }
  }, [active, pop, burst]);

  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <PressableScale
      haptic="light"
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from saved" : "Save listing"}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2, backgroundColor: active ? colors.danger : "rgba(255,255,255,0.95)" }, shadow.md]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: PARTICLES }, (_, i) => (
          <Particle key={i} index={i} progress={burst} radius={size * 0.9} />
        ))}
      </View>
      <Animated.View style={heart}>
        <Heart size={size * 0.5} color={active ? colors.white : colors.foreground} fill={active ? colors.white : "transparent"} />
      </Animated.View>
    </PressableScale>
  );
}

function Particle({ index, progress, radius }: { index: number; progress: SharedValue<number>; radius: number }) {
  const angle = (index / PARTICLES) * Math.PI * 2;
  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0 && progress.value < 1 ? 1 - progress.value : 0,
    transform: [
      { translateX: Math.cos(angle) * radius * progress.value },
      { translateY: Math.sin(angle) * radius * progress.value },
      { scale: 1 - progress.value * 0.5 },
    ],
  }));
  return <Animated.View style={[styles.particle, { backgroundColor: index % 2 ? colors.danger : "#f97316" }, style]} />;
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center" },
  particle: { position: "absolute", left: "50%", top: "50%", width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3 },
});
