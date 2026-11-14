import { LIMITS } from "@flatme/shared";
import { Image } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Star, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, LinearTransition, ZoomIn, ZoomOut } from "react-native-reanimated";
import { api, errorMessage } from "@/api";
import { colors, radius, spacing } from "@/theme/tokens";
import { PressableScale, Text, toast } from "@/ui";

const MAX_EDGE = 1600;

/** Downscales and re-encodes before upload: phone photos are 4–12 MB, this lands at ~300 KB. */
async function prepare(uri: string, width?: number, height?: number) {
  const resize = width && height && Math.max(width, height) > MAX_EDGE ? [{ resize: width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE } }] : [];
  const out = await manipulateAsync(uri, resize, { compress: 0.75, format: SaveFormat.JPEG });
  return out.uri;
}

/** Photo grid for the listing form. First photo is the cover. Uploads run in parallel with per-tile spinners. */
export function PhotoPicker({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [pending, setPending] = useState<string[]>([]);
  const remaining = LIMITS.photosPerListing - value.length - pending.length;

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 1 });
    if (res.canceled) return;
    const assets = res.assets.slice(0, remaining);
    setPending((p) => [...p, ...assets.map((a) => a.uri)]);
    const uploaded: string[] = [];
    await Promise.all(
      assets.map(async (a) => {
        try {
          const local = await prepare(a.uri, a.width, a.height);
          uploaded.push(await api.uploadPhoto(local, "image/jpeg", "listing"));
        } catch (e) {
          toast.error(`Upload failed: ${errorMessage(e)}`);
        } finally {
          setPending((p) => p.filter((u) => u !== a.uri));
        }
      }),
    );
    if (uploaded.length) onChange([...value, ...uploaded]);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.grid}>
        {value.map((url, i) => (
          <Animated.View key={url} entering={ZoomIn.springify().damping(16)} exiting={ZoomOut} layout={LinearTransition} style={styles.tile}>
            <PressableScale onPress={() => i > 0 && onChange([url, ...value.filter((u) => u !== url)])} style={StyleSheet.absoluteFill} accessibilityLabel={i === 0 ? "Cover photo" : "Make cover photo"}>
              <Image source={url} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            </PressableScale>
            {i === 0 && (
              <View style={styles.cover}>
                <Star size={10} color={colors.white} fill={colors.white} />
                <Text variant="caption" color={colors.white}>
                  Cover
                </Text>
              </View>
            )}
            <PressableScale onPress={() => onChange(value.filter((u) => u !== url))} style={styles.remove} hitSlop={6} accessibilityLabel="Remove photo">
              <X size={14} color={colors.white} strokeWidth={3} />
            </PressableScale>
          </Animated.View>
        ))}
        {pending.map((uri) => (
          <Animated.View key={uri} entering={FadeIn} style={styles.tile}>
            <Image source={uri} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} contentFit="cover" />
            <ActivityIndicator color={colors.primary} />
          </Animated.View>
        ))}
        {remaining > 0 && (
          <Animated.View layout={LinearTransition} style={styles.tile}>
            <PressableScale onPress={pick} style={styles.add} accessibilityRole="button" accessibilityLabel="Add photos">
              <ImagePlus size={24} color={colors.primary} />
              <Text variant="caption" color={colors.primary}>
                Add photo
              </Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>
      <Text variant="caption" color={colors.muted}>
        {value.length}/{LIMITS.photosPerListing} · Tap a photo to make it the cover. Listings with 3+ photos get 2× more enquiries.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  add: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  cover: { position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  remove: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
});
