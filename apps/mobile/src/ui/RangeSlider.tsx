import { useLayoutEffect, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { haptics } from "@/lib/haptics";
import { colors, shadow } from "@/theme/tokens";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}

const THUMB = 28;

/** Dual-thumb slider built on PanResponder (no native dependency), snapping to `step` with haptic ticks. */
export function RangeSlider({ min, max, step, low, high, onChange }: RangeSliderProps) {
  const [width, setWidth] = useState(0);
  // Gesture callbacks are created once and read the latest props from a mutable box synced after each commit.
  const [{ latest, responders }] = useState(() => {
    const box = { current: { min, max, step, low, high, width: 0, onChange, startX: 0 } };
    return { latest: box, responders: { low: createThumbResponder(box, "low"), high: createThumbResponder(box, "high") } };
  });
  useLayoutEffect(() => {
    Object.assign(latest.current, { min, max, step, low, high, width, onChange });
  });

  const toX = (v: number) => ((v - min) / (max - min)) * Math.max(width - THUMB, 0);

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.rail} />
      <View style={[styles.fill, { left: toX(low) + THUMB / 2, width: Math.max(toX(high) - toX(low), 0) }]} />
      <View {...responders.low.panHandlers} hitSlop={12} style={[styles.thumb, shadow.md, { left: toX(low) }]} accessibilityLabel="Minimum budget" />
      <View {...responders.high.panHandlers} hitSlop={12} style={[styles.thumb, shadow.md, { left: toX(high) }]} accessibilityLabel="Maximum budget" />
    </View>
  );
}

type SliderState = { min: number; max: number; step: number; low: number; high: number; width: number; startX: number; onChange: (low: number, high: number) => void };

function createThumbResponder(ref: { current: SliderState }, which: "low" | "high") {
  const fromX = (s: SliderState, x: number) => {
    const usable = Math.max(s.width - THUMB, 1);
    const raw = s.min + (Math.min(Math.max(x, 0), usable) / usable) * (s.max - s.min);
    return Math.round(raw / s.step) * s.step;
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const s = ref.current;
      s.startX = ((s[which] - s.min) / (s.max - s.min)) * Math.max(s.width - THUMB, 1);
    },
    onPanResponderMove: (_e, g) => {
      const s = ref.current;
      const v = fromX(s, s.startX + g.dx);
      if (which === "low") {
        const next = Math.min(v, s.high - s.step);
        if (next !== s.low) {
          haptics.tap();
          s.onChange(next, s.high);
        }
      } else {
        const next = Math.max(v, s.low + s.step);
        if (next !== s.high) {
          haptics.tap();
          s.onChange(s.low, next);
        }
      }
    },
  });
}

const styles = StyleSheet.create({
  track: { height: THUMB + 8, justifyContent: "center" },
  rail: { position: "absolute", left: THUMB / 2, right: THUMB / 2, height: 6, borderRadius: 3, backgroundColor: colors.border },
  fill: { position: "absolute", height: 6, borderRadius: 3, backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
  },
});
