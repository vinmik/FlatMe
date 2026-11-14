import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.accent, fg: colors.primaryDark },
  outline: { bg: colors.white, fg: colors.foreground, border: colors.border },
  ghost: { bg: "transparent", fg: colors.primary },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Button({ title, onPress, variant = "primary", size = "lg", icon: Icon, iconRight: IconRight, loading, disabled, style, testID }: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={inactive}
      haptic={variant === "primary" ? "light" : "tap"}
      style={[
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: p.bg, borderColor: p.border ?? p.bg, borderWidth: p.border ? 1 : 0 },
        variant === "primary" && !inactive && shadow.brand,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <ActivityIndicator color={p.fg} />
        </Animated.View>
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={18} color={p.fg} strokeWidth={2.2} />}
          <Text variant="bodyMedium" color={p.fg} style={{ fontSize: size === "lg" ? 16 : 14 }}>
            {title}
          </Text>
          {IconRight && <IconRight size={18} color={p.fg} strokeWidth={2.2} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  lg: { height: 54 },
  md: { height: 44, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.5 },
});
