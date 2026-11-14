import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius } from "@/theme/tokens";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmering placeholder — a light band sweeps across while content loads. */
export function Skeleton({ width = "100%", height = 16, rounded = radius.sm, style }: SkeletonProps) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 100}%` }] }));

  return (
    <View style={[{ width, height, borderRadius: rounded, backgroundColor: "#eef0f3", overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.75)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function ListingCardSkeleton({ width = 280 }: { width?: number | "100%" }) {
  return (
    <View style={{ width, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
      <Skeleton height={190} rounded={0} />
      <View style={{ padding: 16, gap: 10 }}>
        <Skeleton width={90} height={14} />
        <Skeleton width={140} height={14} />
        <Skeleton width={120} height={24} />
      </View>
    </View>
  );
}
