import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui";

/** Segmented progress bar whose active segment fills with a spring. */
export function StepProgress({ step, total, label }: { step: number; total: number; label?: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} filled={i < step} />
        ))}
      </View>
      <Text variant="caption" color={colors.muted}>
        {label ?? `Step ${step} of ${total}`}
      </Text>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(filled ? 1 : 0, { damping: 20, stiffness: 120 });
  }, [filled, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  track: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
});
