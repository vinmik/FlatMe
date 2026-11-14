import type { LucideIcon } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { colors, spacing } from "@/theme/tokens";
import { Text } from "./Text";

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withSequence(withTiming(-6, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1);
  }, [float]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.wrap}>
      <Animated.View style={[styles.halo, bob]}>
        <View style={styles.icon}>
          <Icon size={32} color={colors.primary} />
        </View>
      </Animated.View>
      <Text variant="h2" align="center">
        {title}
      </Text>
      {body && (
        <Text variant="body" color={colors.muted} align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      )}
      {action && <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>{action}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md, flex: 1 },
  halo: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
