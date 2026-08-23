import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DashboardPanel({
  children,
  className,
  ...props
}: DashboardPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-divider bg-panel",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
