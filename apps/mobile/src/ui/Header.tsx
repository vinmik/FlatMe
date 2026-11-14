import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/** Standard stack header: back chevron, centred title, optional trailing action. */
export function Header({ title, right, onBack, transparent }: { title?: string; right?: ReactNode; onBack?: () => void; transparent?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }, !transparent && styles.solid]}>
      <PressableScale
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        style={styles.icon}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <ArrowLeft size={22} color={colors.foreground} />
      </PressableScale>
      <Text variant="h3" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export const iconButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.canvas,
};

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  solid: { backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: iconButtonStyle,
  title: { flex: 1, textAlign: "center" },
  right: { minWidth: 40, alignItems: "flex-end" },
});
