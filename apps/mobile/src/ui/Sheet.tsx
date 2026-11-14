import { X } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { colors, motion, radius, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Max height as a fraction of the screen. */
  maxHeight?: number;
}

/**
 * Bottom sheet: springs up over a fading scrim, stays mounted until the exit animation
 * finishes, and keeps its footer (primary action) pinned above the keyboard.
 */
export function Sheet({ visible, onClose, title, children, footer, maxHeight = 0.9 }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  // Mount synchronously when opened (derived during render); unmount only after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, motion.springSoft));
    } else if (mounted) {
      progress.set(
        withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress]);

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height }] }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.panel, { maxHeight: height * maxHeight, paddingBottom: Math.max(insets.bottom, spacing.lg) }, panel]}>
          <View style={styles.grabber} />
          {title && (
            <View style={styles.header}>
              <Text variant="h2">{title}</Text>
              <PressableScale onPress={onClose} style={styles.close} accessibilityLabel="Close">
                <X size={20} color={colors.foreground} />
              </PressableScale>
            </View>
          )}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.overlay },
  anchor: { flex: 1, justifyContent: "flex-end" },
  panel: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
