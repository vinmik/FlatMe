import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputInstance } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from "react-native-reanimated";
import { colors, radius, spacing } from "@/theme/tokens";
import { Text } from "./Text";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  success?: boolean;
  autoFocus?: boolean;
}

/**
 * One hidden input drives N animated cells, so paste, SMS/Email autofill and backspace all
 * behave natively while the UI shows individual boxes.
 */
export function OtpInput({ value, onChange, length = 6, error, success, autoFocus = true }: OtpInputProps) {
  const ref = useRef<TextInputInstance>(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) shake.value = withSequence(...[-10, 10, -8, 8, -4, 0].map((x) => withTiming(x, { duration: 55 })));
  }, [error, shake]);

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code">
      <Animated.View style={[styles.row, row]}>
        {Array.from({ length }, (_, i) => (
          <Cell key={i} char={value[i]} active={i === Math.min(value.length, length - 1) && value.length < length} error={!!error} success={!!success} index={i} />
        ))}
      </Animated.View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

function Cell({ char, active, error, success, index }: { char?: string; active: boolean; error: boolean; success: boolean; index: number }) {
  const blink = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    blink.value = active ? withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })), -1) : 0;
    lift.value = withSpring(active ? 1 : 0, { damping: 14 });
  }, [active, blink, lift]);

  useEffect(() => {
    if (success) lift.set(withSequence(withTiming(0, { duration: index * 40 }), withSpring(1.4, { damping: 6 }), withSpring(0)));
  }, [success, index, lift]);

  const box = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 3 }, { scale: 1 + lift.value * 0.04 }] }));
  const caret = useAnimatedStyle(() => ({ opacity: blink.value }));
  const border = error ? colors.danger : success ? colors.success : active ? colors.primary : char ? colors.primaryDark : colors.border;

  return (
    <Animated.View style={[styles.cell, { borderColor: border, backgroundColor: success ? colors.successSoft : char || active ? colors.white : colors.canvas }, box]}>
      {char ? (
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Text variant="h1" color={colors.text}>
            {char}
          </Text>
        </Animated.View>
      ) : (
        active && <Animated.View style={[styles.caret, caret]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  cell: { width: 48, height: 58, borderRadius: radius.md, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  caret: { width: 2, height: 26, backgroundColor: colors.primary, borderRadius: 1 },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
