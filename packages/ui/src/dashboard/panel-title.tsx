import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type PanelIconName =
  | "lightning"
  | "cycle"
  | "chart"
  | "activity"
  | "sync"
  | "clipboard"
  | "document";

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {children}
    </svg>
  );
}

export function PanelIcon({ name, className }: { name: PanelIconName; className?: string }) {
  switch (name) {
    case "lightning":
      return (
        <Svg className={className}>
          <path
            d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
            fill="currentColor"
          />
        </Svg>
      );
    case "cycle":
    case "sync":
      return (
        <Svg className={className}>
          <path
            d="M20.5 12a8.5 8.5 0 01-14.55 6.05"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M3.5 12A8.5 8.5 0 0118.05 5.95"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M20.5 7.5V12H16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 16.5V12H8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "chart":
      return (
        <Svg className={className}>
          <path d="M4 19V5M4 19h16M7 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "clipboard":
      return (
        <Svg className={className}>
          {/* Clipboard body */}
          <path
            d="M8 6h8a1.5 1.5 0 011.5 1.5v12A1.5 1.5 0 0116 21H8a1.5 1.5 0 01-1.5-1.5v-12A1.5 1.5 0 018 6z"
            fill="currentColor"
          />
          {/* Clip */}
          <rect x="9.5" y="3.5" width="5" height="4" rx="1.25" fill="currentColor" />
          <rect x="10.25" y="4.25" width="3.5" height="2.5" rx="0.75" fill="#2A2A2A" />
          {/* Checklist marks */}
          <path
            d="M9.5 12.2l1 1 1.8-2.2M9.5 16.2l1 1 1.8-2.2"
            stroke="#2A2A2A"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Text lines */}
          <path
            d="M14 12.5h3.5M14 16.5h2.5"
            stroke="#2A2A2A"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "document":
      return (
        <Svg className={className}>
          <path
            d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
            fill="currentColor"
          />
          <path d="M15 4v3h3" stroke="#1A1A1A" strokeWidth="1.25" strokeLinejoin="round" />
        </Svg>
      );
    case "activity":
      return (
        <Svg className={className}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}

export interface DashboardPanelTitleProps {
  icon?: PanelIconName;
  /** Full icon asset (includes background) — e.g. /icons/billing-icon.png */
  iconSrc?: string;
  title: string;
  trailing?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function DashboardPanelTitle({
  icon,
  iconSrc,
  title,
  trailing,
  className,
  titleClassName,
}: DashboardPanelTitleProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt=""
            className="h-8 w-8 shrink-0 rounded-[8px] object-cover"
          />
        ) : icon ? (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-white">
            <PanelIcon name={icon} />
          </span>
        ) : null}
        <h2
          className={cn(
            "min-w-0 font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[16px]",
            titleClassName,
          )}
        >
          {title}
        </h2>
      </div>
      {trailing ? (
        <div className="w-full min-w-0 overflow-x-auto scrollbar-hidden md:w-auto md:overflow-visible">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardDropdownFilter({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]",
        className,
      )}
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}
