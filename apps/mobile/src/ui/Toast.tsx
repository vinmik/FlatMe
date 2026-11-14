import { CheckCircle2, Info, XCircle } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeOutUp, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { haptics } from "@/lib/haptics";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

const useToasts = create<{ current: ToastItem | null; show: (kind: Kind, message: string) => void; clear: () => void }>((set) => ({
  current: null,
  show: (kind, message) => set({ current: { id: Date.now(), kind, message } }),
  clear: () => set({ current: null }),
}));

/** Fire-and-forget notifications, callable from anywhere (hooks, mutations, handlers). */
export const toast = {
  success: (m: string) => {
    haptics.success();
    useToasts.getState().show("success", m);
  },
  error: (m: string) => {
    haptics.error();
    useToasts.getState().show("error", m);
  },
  info: (m: string) => useToasts.getState().show("info", m),
};

const icons = { success: CheckCircle2, error: XCircle, info: Info } as const;
const tint = { success: colors.success, error: colors.danger, info: colors.primary } as const;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToasts((s) => s.current);
  const clear = useToasts((s) => s.clear);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(clear, 2800);
    return () => clearTimeout(t);
  }, [current, clear]);

  if (!current) return null;
  const Icon = icons[current.kind];
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Animated.View key={current.id} entering={SlideInUp.springify().damping(16)} exiting={FadeOutUp} style={styles.toast} accessibilityLiveRegion="polite">
        <Icon size={20} color={tint[current.kind]} />
        <Text variant="smallMedium" style={{ flex: 1 }}>
          {current.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 1000, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    maxWidth: 480,
    width: "100%",
    ...shadow.lg,
  },
});
