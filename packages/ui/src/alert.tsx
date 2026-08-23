import * as React from "react";
import { cn } from "./lib/cn";

export type AlertVariant = "neutral" | "error" | "success";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({
  className,
  variant = "neutral",
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      data-variant={variant}
      className={cn("auth-alert w-full", className)}
      {...props}
    >
      {children}
    </div>
  );
}
