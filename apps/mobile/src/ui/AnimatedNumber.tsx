import { useEffect, useRef, useState } from "react";
import { Text, type AppTextProps } from "./Text";

interface AnimatedNumberProps extends Omit<AppTextProps, "children"> {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
}

/** Counts up from the previous value with an ease-out curve. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), durationMs = 1100, ...text }: AnimatedNumberProps) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = Date.now();
    const origin = from.current;
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <Text {...text}>{format(shown)}</Text>;
}
