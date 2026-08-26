import * as React from "react";
import { cn } from "../lib/cn";

export type DashboardBadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "review"
  | "operations"
  | "employee"
  | "safety"
  | "fleet"
  | "billing"
  | "customer"
  | "gold"
  | "offline";

const variantTone: Partial<
  Record<DashboardBadgeVariant, { background: string; border: string; color: string }>
> = {
  success: { background: "#203B2C", border: "#22C55E", color: "#ACEBCE" },
  /* Pending */
  warning: { background: "#352E1B", border: "#534A1E", color: "#CAC897" },
  /* Missing */
  error: { background: "#3D1F1F", border: "#4B212B", color: "#FFBBCA" },
  /* Needs Review */
  review: { background: "#31221B", border: "#4B3429", color: "#FFD1A9" },
  /* Offline */
  offline: { background: "#2A2040", border: "#6B5B95", color: "#C4B5FD" },
  operations: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  employee: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  safety: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  fleet: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  billing: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  customer: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  gold: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
};

const variantClasses: Record<DashboardBadgeVariant, string> = {
  success: "",
  warning: "",
  error: "",
  info: "border-transparent bg-info/15 text-sky-300",
  neutral: "border-transparent bg-white/10 text-foreground-muted",
  review: "",
  offline: "",
  operations: "",
  employee: "",
  safety: "",
  fleet: "",
  billing: "",
  customer: "",
  gold: "",
};

export interface DashboardBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: DashboardBadgeVariant;
  pill?: boolean;
}

export function DashboardBadge({
  variant = "neutral",
  pill = true,
  className,
  style,
  children,
  ...props
}: DashboardBadgeProps) {
  const tone = variantTone[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center border font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[11.82px]",
        pill ? "rounded-full px-2.5 py-1" : "rounded px-1.5 py-0.5",
        variantClasses[variant],
        className,
      )}
      style={
        tone
          ? {
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </span>
  );
}
