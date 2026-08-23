import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardSegmentedProgressProps {
  completed: number;
  total: number;
  label?: string;
  sublabel?: string;
  startLabel?: string;
  todayLabel?: string;
  endLabel?: string;
  className?: string;
}

export function DashboardSegmentedProgress({
  completed,
  total,
  label,
  sublabel,
  startLabel,
  todayLabel,
  endLabel,
  className,
}: DashboardSegmentedProgressProps) {
  return (
    <div className={className}>
      {label || sublabel ? (
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
          {label ? (
            <span className="font-sans text-[12px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
              {label}
            </span>
          ) : (
            <span />
          )}
          {sublabel ? (
            <span className="min-w-0 break-words text-right font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[12px] md:leading-none">
              {sublabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-[3px]">
        {Array.from({ length: total }).map((_, index) => {
          /* filled: first → third-last of cycle (before current day) */
          const isFilled = index < completed - 1;
          const isCurrent = index === completed - 1;
          return (
            <div
              key={index}
              className={cn(
                "h-2.5 flex-1 rounded-[2px]",
                isFilled && "payroll-segment-filled",
                isCurrent && "payroll-segment-current",
                !isFilled && !isCurrent && "payroll-segment-empty",
              )}
            />
          );
        })}
      </div>

      {startLabel || todayLabel || endLabel ? (
        <div className="mt-2.5 flex justify-between gap-2 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] sm:text-[11px]">
          <span className="min-w-0 truncate text-[#959597]">{startLabel}</span>
          {todayLabel ? (
            <span className="shrink-0 text-[#22C55E]">{todayLabel}</span>
          ) : (
            <span />
          )}
          <span className="min-w-0 truncate text-right text-[#959597]">{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use DashboardSegmentedProgress for Figma-style payroll progress */
export interface DashboardProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function DashboardProgressBar({
  value,
  max = 100,
  label,
  sublabel,
  className,
}: DashboardProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {label || sublabel ? (
        <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
          {label ? <span>{label}</span> : <span />}
          {sublabel ? <span>{sublabel}</span> : null}
        </div>
      ) : null}
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface DashboardTimelineProps {
  start: string;
  today: string;
  end: string;
  progressPct?: number;
  className?: string;
}

export function DashboardTimeline({
  start,
  today,
  end,
  progressPct = 50,
  className,
}: DashboardTimelineProps) {
  return (
    <div className={cn("mt-4", className)}>
      <div className="relative h-1 rounded-full bg-surface-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-emerald-500/40"
          style={{ width: `${progressPct}%` }}
        />
        <span
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-400"
          style={{ left: `${progressPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-[0.08em] text-foreground-subtle">
        <span>{start}</span>
        <span className="text-emerald-300">{today}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}
