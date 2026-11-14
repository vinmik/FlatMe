import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/** FlatMe mark: a house whose window is two people — "flat + me". */
export function LogoMark({ size = 72, inverted = false }: { size?: number; inverted?: boolean }) {
  const fg = inverted ? "#0891b2" : "#ffffff";
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#22d3ee" />
          <Stop offset="0.55" stopColor="#0891b2" />
          <Stop offset="1" stopColor="#155e75" />
        </LinearGradient>
      </Defs>
      <Rect width="72" height="72" rx="20" fill={inverted ? "#ffffff" : "url(#lg)"} />
      <Path d="M16 34 L36 17 L56 34 V54 a3 3 0 0 1 -3 3 H19 a3 3 0 0 1 -3 -3 Z" fill="none" stroke={fg} strokeWidth="4.5" strokeLinejoin="round" />
      <Circle cx="30" cy="37" r="4" fill={fg} />
      <Circle cx="42" cy="37" r="4" fill={fg} />
      <Path d="M23 51 a7 7 0 0 1 14 0 M35 51 a7 7 0 0 1 14 0" stroke={fg} strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
