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
  className?: string;
}

function PayrollIcon({ className }: { className?: string }) {
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
        d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v7M14.25 12.5c0-.9-1-1.5-2.25-1.5s-2.25.6-2.25 1.5S11 14 12 14.25 14.25 15 14.25 16.1 13.25 17.5 12 17.5s-2.25-.6-2.25-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

export function DashboardControlHeader({
  title = "Control center",
  syncLabel = "Last syn update 2:13pm CT",
  onRunSync,
  onGeneratePayroll,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionIcon,
  showPrimaryChevron = true,
  className,
}: DashboardControlHeaderProps) {
  const actionLabel = primaryActionLabel ?? "Generate payroll";
  const actionHandler = onPrimaryAction ?? onGeneratePayroll;
  const actionIcon =
    primaryActionIcon ??
    (primaryActionLabel ? (
      <PlusIcon className="shrink-0" />
    ) : (
      <PayrollIcon className="shrink-0" />
    ));

  return (
    <div
      className={cn(
        "flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between",
        className,
      )}
    >
      <h2 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
        {title}
      </h2>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
        <p className="font-sans text-[12px] font-normal uppercase leading-[150%] tracking-[-0.02em] text-[#959597] md:text-[16px]">
          {syncLabel}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRunSync}
            className="btn-base btn-glass-surface inline-flex shrink-0 justify-center gap-1 whitespace-nowrap sm:w-auto"
          >
            <SyncIcon className="shrink-0" />
            Run sync
          </button>
          <button
            type="button"
            onClick={actionHandler}
            className="btn-base btn-primary-surface inline-flex shrink-0 justify-center gap-1 whitespace-nowrap sm:w-auto"
          >
            {actionIcon}
            {actionLabel}
            {showPrimaryChevron ? (
              <ChevronDownIcon className="shrink-0" />
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
