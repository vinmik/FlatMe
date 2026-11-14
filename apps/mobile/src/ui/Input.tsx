import { useEffect, useState, type ReactNode, type Ref } from "react";
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import { Text } from "./Text";

export interface InputProps extends Omit<TextInputProps, "ref"> {
  ref?: Ref<TextInputInstance>;
  label?: string;
  hint?: string;
  error?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  multilineHeight?: number;
}

/** Text field with animated focus ring and a gentle shake when an error appears. */
export function Input({ ref, label, hint, error, left, right, containerStyle, multilineHeight = 110, onFocus, onBlur, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, focus]);

  useEffect(() => {
    if (error) shake.value = withSequence(...[-6, 6, -4, 4, 0].map((x) => withTiming(x, { duration: 50 })));
  }, [error, shake]);

  const ring = useAnimatedStyle(() => ({
    borderColor: error ? colors.danger : interpolateColor(focus.value, [0, 1], [colors.border, colors.primary]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.canvas, colors.white]),
    transform: [{ translateX: shake.value }],
  }));

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label && (
        <Text variant="smallMedium" color={colors.foreground}>
          {label}
        </Text>
      )}
      <Animated.View style={[styles.field, rest.multiline && { height: multilineHeight, alignItems: "flex-start" }, ring]}>
        {left}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.primary}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, rest.multiline && styles.multiline, style]}
        />
        {right}
      </Animated.View>
      {error ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)}>
          <Text variant="small" color={colors.danger}>
            {error}
          </Text>
        </Animated.View>
      ) : hint ? (
        <Text variant="small" color={colors.muted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
  multiline: { textAlignVertical: "top", height: "100%" },
});
