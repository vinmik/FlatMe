import type { LucideIcon } from "lucide-react-native";
import { StyleSheet } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { colors, radius, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  size?: "sm" | "md";
}

/** Selectable pill with an animated fill — used for filters, amenities and form choices. */
export function Chip({ label, selected = false, onPress, icon: Icon, size = "md" }: ChipProps) {
  const t = useDerivedValue(() => withTiming(selected ? 1 : 0, { duration: 180 }), [selected]);
  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colors.white, colors.primary]),
    borderColor: interpolateColor(t.value, [0, 1], [colors.border, colors.primary]),
  }));
  const fg = selected ? colors.white : colors.foreground;

  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} scaleTo={0.94}>
      <Animated.View style={[styles.chip, size === "sm" && styles.sm, animated]}>
        {Icon && <Icon size={size === "sm" ? 14 : 16} color={fg} />}
        <Text variant={size === "sm" ? "small" : "smallMedium"} color={fg}>
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  sm: { height: 32, paddingHorizontal: spacing.md },
});
