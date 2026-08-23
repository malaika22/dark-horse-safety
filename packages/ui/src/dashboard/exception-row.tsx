import * as React from "react";
import { cn } from "../lib/cn";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";

export interface DashboardExceptionRowProps {
  tag: string;
  tagVariant?: DashboardBadgeVariant;
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export function DashboardExceptionRow({
  tag,
  tagVariant = "gold",
  title,
  action,
  onAction,
  className,
}: DashboardExceptionRowProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 divider-row py-3.5 md:flex-row md:items-end md:justify-between md:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <DashboardBadge variant={tagVariant} pill>
          {tag}
        </DashboardBadge>
        <p className="mt-2 font-sans text-[12px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF] md:text-[14px] md:leading-none">
          {title}
        </p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 self-start font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] underline decoration-[#FDFDFF]/70 underline-offset-4 transition-opacity hover:opacity-80 md:self-auto md:text-[14px]"
        >
          {action}
        </button>
      ) : null}
    </li>
  );
}

export interface DashboardStatRowItem {
  label: string;
  value: React.ReactNode;
}

export interface DashboardStatListProps {
  items: DashboardStatRowItem[];
  className?: string;
}

export function DashboardStatList({ items, className }: DashboardStatListProps) {
  return (
    <div className={cn("divider-section-top space-y-3 pt-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[14px]"
        >
          <span className="text-[#959597]">{item.label}</span>
          <span className="font-[590] text-[#FDFDFF]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
