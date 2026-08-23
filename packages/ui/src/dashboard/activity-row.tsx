import * as React from "react";
import { cn } from "../lib/cn";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";

export interface DashboardActivityRowProps {
  title: string;
  subtitle: string;
  status: string;
  statusVariant?: DashboardBadgeVariant;
  className?: string;
}

export function DashboardActivityRow({
  title,
  subtitle,
  status,
  statusVariant = "warning",
  className,
}: DashboardActivityRowProps) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-4 divider-row py-3.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </p>
        <p className="mt-1.5 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
          {subtitle}
        </p>
      </div>
      <DashboardBadge variant={statusVariant} pill className="shrink-0">
        {status}
      </DashboardBadge>
    </li>
  );
}
