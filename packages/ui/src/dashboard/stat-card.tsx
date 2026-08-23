import * as React from "react";
import { cn } from "../lib/cn";
import { ArrowRightIcon, StatIcon, type StatIconName } from "./icons";

export interface DashboardStatMetric {
  value: string;
  meta: string;
}

export interface DashboardStatCellProps {
  title: string;
  value?: string;
  meta?: string;
  metrics?: DashboardStatMetric[];
  action?: string;
  icon?: StatIconName;
  onAction?: () => void;
  className?: string;
}

function MetricBlock({ value, meta }: { value: string; meta: string }) {
  return (
    <div>
      <p className="font-sans text-[24px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[32px]">
        {value}
      </p>
      <p className="mt-2 font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[16px]">
        {meta}
      </p>
    </div>
  );
}

/** Single tile inside a divider grid (no individual card border). */
export function DashboardStatCell({
  title,
  value,
  meta,
  metrics,
  action,
  icon,
  onAction,
  className,
}: DashboardStatCellProps) {
  const items =
    metrics ?? (value && meta ? [{ value, meta }] : []);

  return (
    <div className={cn("flex min-h-[168px] flex-col", className)}>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[16px]">
            {title}
          </p>
          {icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-white">
              <StatIcon name={icon} />
            </span>
          ) : null}
        </div>

        <div className={cn("mt-4", items.length > 1 && "grid grid-cols-2 gap-4")}>
          {items.map((item) => (
            <MetricBlock
              key={`${item.value}-${item.meta}`}
              value={item.value}
              meta={item.meta}
            />
          ))}
        </div>
      </div>

      {action ? (
        <>
          <div className="divider-line-inset shrink-0" aria-hidden />
          <button
            type="button"
            onClick={onAction}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/[0.03] md:text-[14px]"
          >
            <span>{action}</span>
            <ArrowRightIcon className="shrink-0 text-[#FDFDFF]" />
          </button>
        </>
      ) : null}
    </div>
  );
}

/** @deprecated Use DashboardStatCell inside DashboardStatGrid */
export type DashboardStatCardProps = DashboardStatCellProps;

/** @deprecated Use DashboardStatCell inside DashboardStatGrid */
export function DashboardStatCard(props: DashboardStatCellProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-divider">
      <DashboardStatCell {...props} />
    </div>
  );
}

export interface DashboardStatGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * KPI grid — one flat surface, tiles separated by login-style dividers only.
 */
export function DashboardStatGrid({ children, className }: DashboardStatGridProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      <div className="dashboard-stat-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {children}
      </div>
    </div>
  );
}
