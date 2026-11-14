import { SlidersHorizontal } from "lucide-react-native";
import { StyleSheet } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { colors, radius } from "@/theme/tokens";
import { PressableScale, Text } from "@/ui";

/** Square filter button with a popping active-count badge. */
export function FilterButton({ count, onPress, inverted }: { count: number; onPress: () => void; inverted?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Filters${count ? `, ${count} active` : ""}`} style={[styles.btn, inverted ? styles.inverted : count > 0 && styles.active]}>
      <SlidersHorizontal size={20} color={inverted ? colors.primary : count > 0 ? colors.white : colors.foreground} />
      {count > 0 && (
        <Animated.View entering={ZoomIn.springify()} exiting={ZoomOut} style={styles.badge}>
          <Text variant="caption" color={colors.white}>
            {count}
          </Text>
        </Animated.View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  inverted: { backgroundColor: colors.white, borderColor: colors.white },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
