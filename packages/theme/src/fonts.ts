/**
 * SF Pro Display — global font stacks for Dark Horse Safety.
 * Faces are self-hosted via packages/theme/src/fonts.css
 * (files in apps/dashboard/public/fonts/).
 */
export const fontStacks = {
  sans: [
    '"SF Pro Display"',
    '"SF Pro Text"',
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Segoe UI",
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),
  display: [
    '"SF Pro Display"',
    '"SF Pro Text"',
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Segoe UI",
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),
} as const;

export type FontStacks = typeof fontStacks;
