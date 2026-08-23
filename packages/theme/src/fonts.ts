/**
 * SF Pro — global font stacks for Dark Horse Safety.
 * Uses native SF Pro on Apple via -apple-system / BlinkMacSystemFont.
 * Falls back to Segoe UI / Roboto on other platforms.
 */
export const fontStacks = {
  sans: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"SF Pro Text"',
    '"SF Pro Display"',
    "system-ui",
    "Segoe UI",
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),
  display: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"SF Pro Display"',
    '"SF Pro Text"',
    "system-ui",
    "Segoe UI",
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),
} as const;

export type FontStacks = typeof fontStacks;
