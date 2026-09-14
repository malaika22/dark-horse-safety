import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardSectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardSectionHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-2",
        className,
      )}
    >
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.1em]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        {actions}
      </div>
    </div>
  );
}
