import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon, SyncIcon } from "./icons";

export interface DashboardControlHeaderProps {
  title?: string;
  syncLabel?: string;
  onRunSync?: () => void;
  /** @deprecated Prefer primaryActionLabel + onPrimaryAction */
  onGeneratePayroll?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionIcon?: React.ReactNode;
  showPrimaryChevron?: boolean;
  showNotificationBell?: boolean;
  /** Hide the primary CTA (e.g. Generate payroll — shown in app nav header). */
  hidePrimaryAction?: boolean;
  className?: string;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardControlHeader({
  title = "Control center",
  syncLabel = "Last syn update 2:13pm CT",
  onRunSync,
  onGeneratePayroll,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionIcon,
  showPrimaryChevron = false,
  showNotificationBell = false,
  hidePrimaryAction = false,
  className,
}: DashboardControlHeaderProps) {
  const actionLabel = primaryActionLabel ?? "Generate payroll";
  const actionHandler = onPrimaryAction ?? onGeneratePayroll;
  const actionIcon =
    primaryActionIcon !== undefined
      ? primaryActionIcon
      : primaryActionLabel
        ? <PlusIcon className="shrink-0" />
        : null;
  const showPrimary = !hidePrimaryAction;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:flex-nowrap",
        className,
      )}
    >
      {title ? (
        <h2 className="min-w-0 shrink-0 font-sans text-[20px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[24px]">
          {title}
        </h2>
      ) : (
        <div className="hidden lg:block" />
      )}

      <div className="flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap lg:justify-end lg:gap-4">
        <p className="max-w-full truncate font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] sm:max-w-[14rem] sm:shrink-0 md:max-w-none md:text-[14px]">
          {syncLabel}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          {showNotificationBell ? (
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#959597] transition-colors hover:bg-[#353535] hover:text-[#FDFDFF]"
            >
              <BellIcon />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRunSync}
            className="btn-base btn-glass-surface inline-flex min-w-0 flex-1 justify-center gap-1 whitespace-nowrap sm:flex-none sm:w-auto"
          >
            <SyncIcon className="shrink-0" />
            <span className="truncate">Run sync</span>
          </button>
          {showPrimary ? (
            <button
              type="button"
              onClick={actionHandler}
              className="btn-base btn-primary-surface inline-flex min-w-0 flex-1 justify-center gap-1 whitespace-nowrap sm:flex-none sm:w-auto"
            >
              {actionIcon}
              <span className="truncate">{actionLabel}</span>
              {showPrimaryChevron ? (
                <ChevronDownIcon className="shrink-0" />
              ) : null}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
