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
        "flex flex-col gap-2.5 divider-row py-3.5 md:flex-row md:items-center md:justify-between md:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF] md:text-[12px] md:leading-none">
          {title}
        </p>
        <p className="mt-1.5 font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[12px] md:leading-none">
          {subtitle}
        </p>
      </div>
      <DashboardBadge variant={statusVariant} pill className="shrink-0 self-start md:self-auto">
        {status}
      </DashboardBadge>
    </li>
  );
}
