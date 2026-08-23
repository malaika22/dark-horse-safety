import * as React from "react";
import { cn } from "./lib/cn";

export type StatusIconVariant = "warning" | "success" | "info";

export interface StatusIconProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: StatusIconVariant;
}

export function StatusIcon({
  variant = "warning",
  className,
  ...props
}: StatusIconProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full",
        variant === "success"
          ? "bg-surface-strong text-foreground-muted"
          : "bg-foreground-muted text-background",
        className,
      )}
      aria-hidden
      {...props}
    >
      {variant === "success" ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className="text-2xl font-bold leading-none">!</span>
      )}
    </div>
  );
}
