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
    <div className="min-w-0">
      <p className="font-sans text-[24px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[32px]">
        {value}
      </p>
      <p
        title={meta}
        className="mt-2 truncate font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[16px]"
      >
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
    <div className={cn("flex min-h-[168px] min-w-0 flex-col", className)}>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p
            title={title}
            className="min-w-0 flex-1 truncate font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[16px]"
          >
            {title}
          </p>
          {icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-white">
              <StatIcon name={icon} />
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-4 min-w-0",
            items.length > 1 && "grid grid-cols-2 gap-3",
          )}
        >
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
            title={action}
            onClick={onAction}
            className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/[0.03] md:text-[14px]"
          >
            <span className="truncate">{action}</span>
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
 * KPI shell — one flat bordered surface. Put `DashboardStatRow`s inside
 * (e.g. 5-col top + 4-col wider bottom) with no gap between rows.
 */
export function DashboardStatGrid({ children, className }: DashboardStatGridProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface DashboardStatRowProps {
  children: React.ReactNode;
  /** Desktop columns — 5 top, 3 mid, 1 solo last card, etc. */
  columns?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

/**
 * One KPI band inside `DashboardStatGrid`.
 */
export function DashboardStatRow({
  children,
  columns = 5,
  className,
}: DashboardStatRowProps) {
  return (
    <div
      className={cn(
        "dashboard-stat-row grid grid-cols-1 sm:grid-cols-2",
        columns === 1 && "sm:grid-cols-1 xl:grid-cols-1",
        columns === 2 && "xl:grid-cols-2",
        columns === 3 && "xl:grid-cols-3",
        columns === 4 && "xl:grid-cols-4",
        columns === 5 && "xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
