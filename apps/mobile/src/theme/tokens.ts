/**
 * Design tokens mirrored from the Figma Make theme (theme.css). Every screen styles from
 * these — never hard-code colours or spacing in components.
 */
export const colors = {
  primary: "#0891b2",
  primaryDark: "#0e7490",
  primaryDeep: "#155e75",
  primarySoft: "#ecfeff",
  accent: "#e0f2fe",
  foreground: "#1f2937",
  text: "#111827",
  muted: "#6b7280",
  subtle: "#9ca3af",
  border: "#e5e7eb",
  surface: "#ffffff",
  background: "#ffffff",
  canvas: "#f9fafb",
  success: "#16a34a",
  successSoft: "#f0fdf4",
  danger: "#ef4444",
  dangerSoft: "#fef2f2",
  warning: "#f59e0b",
  warningSoft: "#fffbeb",
  overlay: "rgba(17, 24, 39, 0.45)",
  white: "#ffffff",
} as const;

export const gradients = {
  brand: ["#22d3ee", "#0891b2", "#155e75"] as const,
  hero: ["#ecfeff", "#ffffff"] as const,
  scrim: ["transparent", "rgba(0,0,0,0.55)"] as const,
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  price: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
} as const;

export const shadow = {
  sm: { shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: "#0f172a", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  lg: { shadowColor: "#0f172a", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  brand: { shadowColor: "#0891b2", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 140 },
  springBouncy: { damping: 10, stiffness: 260 },
  fast: 160,
  base: 260,
  slow: 420,
} as const;
