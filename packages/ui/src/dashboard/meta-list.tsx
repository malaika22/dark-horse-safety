import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardMetaRowProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  className?: string;
}

/** Flexible list row — title/subtitle left, badge or value right. */
export function DashboardMetaRow({
  title,
  subtitle,
  trailing,
  className,
}: DashboardMetaRowProps) {
  return (
    <li
      className={cn(
        "divider-row flex items-start justify-between gap-3 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[12px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-1 font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 self-center">{trailing}</div> : null}
    </li>
  );
}

export interface DashboardMetaListProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardMetaList({ children, className }: DashboardMetaListProps) {
  return <ul className={cn("min-w-0", className)}>{children}</ul>;
}

export interface DashboardMetricItem {
  label: string;
  value: string;
}

export interface DashboardMetricGridProps {
  items: DashboardMetricItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}

/** Compact metric tiles (account summary RT / OT / etc.). */
export function DashboardMetricGrid({
  items,
  className,
  columns = 2,
}: DashboardMetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-divider bg-[#1A1A1A] px-3 py-3"
        >
          <p className="font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
            {item.label}
          </p>
          <p className="mt-2 font-sans text-[16px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[18px]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}

/** List / detail page title row with optional actions. */
export function DashboardPageHeader({
  title,
  subtitle,
  actions,
  leading,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {leading}
        <h2 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
