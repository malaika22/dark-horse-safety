import * as React from "react";
import { cn } from "../lib/cn";

export type CycleKpiIconName =
  | "unbilled"
  | "approved"
  | "payroll"
  | "pipeline";

function CycleKpiIcon({
  name,
  className,
}: {
  name: CycleKpiIconName;
  className?: string;
}) {
  const iconClass = cn("h-5 w-5 shrink-0 text-[#959597]", className);

  switch (name) {
    case "unbilled":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={iconClass}
        >
          <rect
            x="3"
            y="7"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 11h18"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 15h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "approved":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={iconClass}
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8.5 12l2.5 2.5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "payroll":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={iconClass}
        >
          <path
            d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M15 4v3h3M9 12h6M9 16h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "pipeline":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={iconClass}
        >
          <path
            d="M4 6h16M7 6V4h10v2M6 10h12l-1.5 8H7.5L6 10z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export interface DashboardCycleKpiItem {
  title: string;
  value: string;
  icon: CycleKpiIconName;
  /** Full muted meta line when no highlight split is needed. */
  meta?: string;
  /** Muted prefix before green highlight, e.g. "24.5H • " */
  metaPrefix?: string;
  /** Green highlight segment, e.g. "-38% since c09" */
  metaHighlight?: string;
}

export interface DashboardCycleKpiCardProps extends DashboardCycleKpiItem {
  className?: string;
}

export function DashboardCycleKpiCard({
  title,
  value,
  icon,
  meta,
  metaPrefix,
  metaHighlight,
  className,
}: DashboardCycleKpiCardProps) {
  const metaText = meta ?? `${metaPrefix ?? ""}${metaHighlight ?? ""}`;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-[#2D2D30] bg-[#1A1A1A] p-3.5 sm:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          title={title}
          className="min-w-0 flex-1 truncate font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]"
        >
          {title}
        </p>
        <CycleKpiIcon name={icon} />
      </div>

      <p className="mt-3 font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[32px]">
        {value}
      </p>

      <p
        title={metaText}
        className="mt-2.5 truncate font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[13px]"
      >
        {metaHighlight ? (
          <>
            {metaPrefix ? (
              <span className="text-[#959597]">{metaPrefix}</span>
            ) : null}
            <span className="text-[#22C55E]">{metaHighlight}</span>
          </>
        ) : (
          <span className="text-[#959597]">{meta}</span>
        )}
      </p>
    </div>
  );
}

export interface DashboardCycleKpiStripProps {
  children: React.ReactNode;
  className?: string;
}

/** Row of separated cycle KPI cards — gap grid, no shared divider shell. */
export function DashboardCycleKpiStrip({
  children,
  className,
}: DashboardCycleKpiStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
