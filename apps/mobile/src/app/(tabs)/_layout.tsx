import { useRouter } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Compass, Heart, Map, Plus, User, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/lib/haptics";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { PressableScale, Text } from "@/ui";

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  explore: { icon: Compass, label: "Explore" },
  map: { icon: Map, label: "Map" },
  saved: { icon: Heart, label: "Saved" },
  profile: { icon: User, label: "Profile" },
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: "shift" }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, shadow.lg, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, i) => {
        if (route.name === "post") {
          return (
            <View key={route.key} style={styles.slot}>
              <PostButton onPress={() => router.push("/listing/new")} />
            </View>
          );
        }
        const meta = ICONS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        return (
          <TabItem
            key={route.key}
            icon={meta.icon}
            label={meta.label}
            focused={focused}
            onPress={() => {
              const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) {
                haptics.tap();
                navigateToTab(route.key);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({ icon: Icon, label, focused, onPress }: { icon: LucideIcon; label: string; focused: boolean; onPress: () => void }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 180 });
  }, [focused, p]);
  const pill = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: interpolate(p.value, [0, 1], [0.4, 1]) }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [0, -2]) }, { scale: interpolate(p.value, [0, 1], [1, 1.08]) }] }));
  const color = focused ? colors.primary : colors.subtle;

  return (
    <PressableScale onPress={onPress} haptic={false} style={styles.slot} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Animated.View style={icon}>
          <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
        </Animated.View>
      </View>
      <Text variant="caption" color={color}>
        {label}
      </Text>
    </PressableScale>
  );
}

function PostButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} haptic="medium" accessibilityRole="button" accessibilityLabel="Post a room" testID="tab-post">
      <View style={[styles.post, shadow.md]}>
        <Plus size={28} color={colors.white} strokeWidth={2.6} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...Platform.select({ web: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } }),
  },
  slot: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  iconWrap: { width: 56, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, backgroundColor: colors.accent },
  post: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
  },
});
