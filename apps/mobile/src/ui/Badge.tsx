import { ShieldCheck } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Text } from "./Text";

interface BadgeProps {
  label: string;
  tone?: "glass" | "soft" | "success" | "warning" | "danger" | "neutral";
  style?: StyleProp<ViewStyle>;
}

const tones = {
  glass: { bg: "rgba(255,255,255,0.95)", fg: colors.text },
  soft: { bg: colors.accent, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: "#b45309" },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: "#f3f4f6", fg: colors.foreground },
} as const;

export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, tone === "glass" && shadow.sm, style]}>
      <Text variant="caption" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

export function VerifiedBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, styles.verified, shadow.sm, style]}>
      <ShieldCheck size={12} color={colors.success} strokeWidth={2.5} />
      <Text variant="caption" color={colors.success}>
        Verified
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: radius.pill, alignSelf: "flex-start" },
  verified: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.95)" },
});
