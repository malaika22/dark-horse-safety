import * as React from "react";
import { cn } from "../lib/cn";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";
import { DashboardGoldLink } from "./gold-link";

export interface DashboardDataRowProps {
  tag?: string;
  tagVariant?: DashboardBadgeVariant;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  trailing?: React.ReactNode;
  className?: string;
}

export function DashboardDataRow({
  tag,
  tagVariant = "neutral",
  title,
  subtitle,
  action,
  onAction,
  trailing,
  className,
}: DashboardDataRowProps) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-panel-inset px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {tag ? (
          <DashboardBadge variant={tagVariant}>{tag}</DashboardBadge>
        ) : null}
        <p
          className={cn(
            "truncate text-[11px] font-medium uppercase tracking-[0.04em] text-foreground-muted",
            tag ? "mt-1" : null,
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-foreground-subtle">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ?? (action ? (
        <DashboardGoldLink onClick={onAction}>{action}</DashboardGoldLink>
      ) : null)}
    </li>
  );
}
