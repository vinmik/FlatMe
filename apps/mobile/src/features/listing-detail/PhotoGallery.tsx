import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { colors, radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui";

export const GALLERY_HEIGHT = 340;

/**
 * Full-bleed paging photo gallery. `scrollY` is the parent scroll offset: pulling down
 * stretches the image (parallax zoom) and scrolling up slides it at half speed.
 */
export function PhotoGallery({ photos, scrollY }: { photos: string[]; scrollY: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const items = photos.length ? photos : [null];

  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-GALLERY_HEIGHT, 0, GALLERY_HEIGHT], [-GALLERY_HEIGHT / 2, 0, GALLERY_HEIGHT * 0.5], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-GALLERY_HEIGHT, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ height: GALLERY_HEIGHT, overflow: "hidden", backgroundColor: colors.border }}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        <FlatList
          horizontal
          pagingEnabled
          data={items}
          keyExtractor={(u, i) => `${u}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <Image source={item ?? undefined} style={{ width, height: GALLERY_HEIGHT }} contentFit="cover" transition={300} />}
        />
      </Animated.View>
      {items.length > 1 && (
        <>
          <View style={styles.dots} pointerEvents="none">
            {items.map((_, i) => (
              <Dot key={i} active={i === index} />
            ))}
          </View>
          <View style={styles.counter} pointerEvents="none">
            <Text variant="caption" color={colors.white}>
              {index + 1}/{items.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 20 : 6);
  useEffect(() => {
    w.value = withSpring(active ? 20 : 6, { damping: 18, stiffness: 200 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[styles.dot, style, { opacity: active ? 1 : 0.6 }]} />;
}

const styles = StyleSheet.create({
  dots: { position: "absolute", bottom: spacing.xxxl + spacing.md, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.white },
  counter: { position: "absolute", bottom: spacing.xxxl + spacing.sm, right: spacing.lg, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
});
