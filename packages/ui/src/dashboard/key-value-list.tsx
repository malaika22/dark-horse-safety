import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardKeyValueItem {
  label: string;
  value: React.ReactNode;
}

export interface DashboardKeyValueListProps {
  items: DashboardKeyValueItem[];
  bordered?: boolean;
  className?: string;
}

export function DashboardKeyValueList({
  items,
  bordered = false,
  className,
}: DashboardKeyValueListProps) {
  return (
    <ul className={cn("space-y-3.5", className)}>
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center justify-between gap-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em]",
            bordered && "divider-row pb-3.5 last:pb-0",
          )}
        >
          <span className="text-[#959597]">{item.label}</span>
          <span className="text-right font-[510] text-[#FDFDFF]">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export interface DashboardSyncRow {
  label: string;
  synced: number;
}

export interface DashboardSyncTableProps {
  rows: DashboardSyncRow[];
  className?: string;
}

export function DashboardSyncTable({ rows, className }: DashboardSyncTableProps) {
  return (
    <ul
      className={cn(
        "divider-section-top space-y-3.5 pt-4",
        className,
      )}
    >
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-center justify-between gap-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em]"
        >
          <span className="text-[#959597]">{row.label}</span>
          <span className="font-[510] text-[#FDFDFF]">{row.synced} synced</span>
        </li>
      ))}
    </ul>
  );
}
