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
  /* Missing / Failed */
  error: { background: "#FF4D4D", border: "#FF4D4D", color: "#FFFFFF" },
  /* Needs Review / billing alert */
  review: { background: "#FF9500", border: "#FF9500", color: "#FFFFFF" },
  /* Offline */
  offline: { background: "#2A2040", border: "#6B5B95", color: "#C4B5FD" },
  employee: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  /* Exception queue — solid red */
  safety: { background: "#FF4D4D", border: "#FF4D4D", color: "#FFFFFF" },
  /* Exception queue — muted maroon */
  billing: { background: "#3A1515", border: "#5C1F1F", color: "#FF6B6B" },
  /* Exception queue — charcoal pills */
  operations: { background: "#2A2A2A", border: "#3E3E3E", color: "#959597" },
  fleet: { background: "#2A2A2A", border: "#3E3E3E", color: "#959597" },
  neutral: { background: "#2A2A2A", border: "#3E3E3E", color: "#959597" },
  customer: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
  gold: { background: "#2A2618", border: "#C4A35A", color: "#C4A35A" },
};

const variantClasses: Record<DashboardBadgeVariant, string> = {
  success: "",
  warning: "",
  error: "",
  info: "border-transparent bg-info/15 text-sky-300",
  neutral: "",
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
  const label = typeof children === "string" ? children : null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center border font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[11px]",
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
      title={label ?? undefined}
      {...props}
    >
      {label ? (
        <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {label}
        </span>
      ) : (
        children
      )}
    </span>
  );
}
