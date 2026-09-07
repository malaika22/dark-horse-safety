"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "./icons";

function FilterCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4 7h16M7 12h10M10 17h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M8 6v12M8 6l-2.5 2.5M8 6l2.5 2.5M16 18V6M16 18l-2.5-2.5M16 18l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 4v10M8 10l4 4 4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CustomersIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-3.5 w-3.5 shrink-0", className)}
    >
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 8a3 3 0 11.2 5.9M20.5 19c0-2.2-1.6-4-3.8-4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type DashboardToolbarButtonVariant = "glass" | "primary" | "muted";

export interface DashboardToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DashboardToolbarButtonVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
}

/** Shared toolbar / filter / export action button. */
export const DashboardToolbarButton = React.forwardRef<
  HTMLButtonElement,
  DashboardToolbarButtonProps
>(function DashboardToolbarButton(
  {
    variant = "glass",
    leftIcon,
    rightIcon,
    showChevron = false,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "btn-base inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-sans font-[510] uppercase tracking-[-0.02em]",
        variant === "glass" && "btn-glass-surface text-white",
        variant === "muted" &&
          "border border-[#3E3E3E] bg-[#353535] text-foreground-muted hover:bg-[#3D3D3D] hover:text-foreground-muted",
        variant === "primary" && "btn-primary-surface",
        className,
      )}
      {...props}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
      {showChevron ? <ChevronDownIcon className="shrink-0" /> : null}
    </button>
  );
});

export interface DashboardFilterChip {
  id: string;
  label: string;
}

export interface DashboardFilterChipsProps {
  chips: DashboardFilterChip[];
  onRemove?: (id: string) => void;
  onClearAll?: () => void;
  clearAllLabel?: string;
  className?: string;
}

/** Active filter chips row + Clear all. */
export function DashboardFilterChips({
  chips,
  onRemove,
  onClearAll,
  clearAllLabel = "Clear all",
  className,
}: DashboardFilterChipsProps) {
  if (!chips.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onRemove?.(chip.id)}
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[#3E3E3E] bg-[#353535] px-2.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] text-white transition-colors hover:bg-[#3D3D3D]"
        >
          {chip.label}
          <span aria-hidden className="text-[#959597]">
            ×
          </span>
        </button>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-7 items-center gap-1 px-1 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:text-white"
        >
          <span aria-hidden>×</span>
          {clearAllLabel}
        </button>
      ) : null}
    </div>
  );
}

export interface DashboardListToolbarProps {
  search: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  chips?: React.ReactNode;
  className?: string;
}

/**
 * Shared list-page toolbar layout:
 * [search] [filter…]   …actions
 * [chips]
 */
export function DashboardListToolbar({
  search,
  filters,
  actions,
  chips,
  className,
}: DashboardListToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 sm:max-w-md">{search}</div>
          {filters ? (
            <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
              {filters}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {chips}
    </div>
  );
}

export const DashboardToolbarIcons = {
  Filter: FilterCheckIcon,
  Sort: SortIcon,
  Download: DownloadIcon,
  Customers: CustomersIcon,
  /** @deprecated Use Customers — same Figma asset */
  Document: CustomersIcon,
};
