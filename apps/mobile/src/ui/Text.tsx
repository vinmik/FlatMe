import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, type as typeScale } from "@/theme/tokens";

type Variant = keyof typeof typeScale;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle["textAlign"];
}

export function Text({ variant = "body", color = colors.foreground, align, style, ...rest }: AppTextProps) {
  return <RNText {...rest} style={[typeScale[variant], { color, textAlign: align }, style]} />;
}
