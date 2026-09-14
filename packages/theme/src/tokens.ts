/**
 * Dark Horse Safety — design tokens
 * Admin (Dark Horse Force) + Technician shared palette
 */
import { fontStacks } from "./fonts";
export const colors = {
  background: "#161618",
  surface: "#1C1C1E",
  surfaceElevated: "#252525",
  surfaceMuted: "#2A2A2A",
  surfaceStrong: "#333333",

  foreground: "#FFFFFF",
  /** Near-white headings (auth titles) */
  foregroundBright: "#FDFDFF",
  /** Secondary / gray text (labels, hints, muted UI) */
  foregroundMuted: "#959597",
  foregroundSubtle: "#959597",

  primary: "#FFFFFF",
  primaryForeground: "#09090B",

  accent: "#E31C23",
  accentForeground: "#FFFFFF",

  border: "#222222",
  borderStrong: "#3D3D3D",
  borderFocus: "#FFFFFF",
  borderError: "#FF4D4D",

  /** Auth credential / status alert */
  alert: "#282826",
  alertForeground: "#EDF0F5",

  /** Auth/login divider line */
  divider: "#2D2D30",
  dividerShadow: "0px -1px 0px 0px #000000",

  success: "#22C55E",
  warning: "#F59E0B",
  error: "#FF4D4D",
  info: "#3B82F6",

  overlay: "rgba(0, 0, 0, 0.72)",
  mapRadius: "rgba(59, 130, 246, 0.35)",

  /** Dashboard app shell */
  shell: "#0C0C0C",
  shellHeader: "#121212",
  panel: "#1A1A1A",
  panelInset: "#121212",
  gold: "#C4A35A",
  goldHover: "#D4B56A",
} as const;

export const radii = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const typography = {
  fontSans: fontStacks.sans,
  fontDisplay: fontStacks.display,
  sizes: {
    xs: "0.6875rem",
    sm: "0.75rem",
    base: "0.875rem",
    lg: "1rem",
    xl: "1.125rem",
    "2xl": "1.375rem",
    "3xl": "1.75rem",
    "4xl": "2rem",
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  tracking: {
    label: "0.08em",
    heading: "0.04em",
    body: "0.06em",
  },
} as const;

export const shadows = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
  md: "0 8px 24px rgba(0, 0, 0, 0.45)",
  /** Primary (white) button — Figma layered elevation + inset highlight */
  buttonPrimary: [
    "0px 3.89px 3.89px 0px #08080814",
    "0px 0.97px 1.94px 0px #08080833",
    "0px 5.83px 11.67px 0px #EDEDED1F inset",
    "0px 0.97px 0.97px 0px #FFFFFF33 inset",
  ].join(", "),
} as const;

export const button = {
  primary: {
    background: "#FFFFFF",
    borderWidth: "0.97px",
    borderImageSource:
      "linear-gradient(180deg, rgba(188, 188, 188, 0.32) -23.51%, rgba(146, 146, 146, 0) 139.76%)",
    boxShadow: shadows.buttonPrimary,
  },
} as const;

export const brand = {
  name: "Dark Horse Force",
  product: "Dark Horse Safety",
  supportEmail: "ops-support@darkhorseops.com",
} as const;

export const theme = {
  colors,
  radii,
  spacing,
  typography,
  shadows,
  button,
  brand,
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof colors;
