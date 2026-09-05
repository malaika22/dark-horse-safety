"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "./icons";
import { DashboardMenuPopover, type DashboardMenuItem } from "./overlay";
import { DashboardToolbarButton } from "./toolbar";

export interface DashboardPageSizeControlProps {
  value: number;
  options?: number[];
  onChange: (size: number) => void;
  className?: string;
}

/** "Page size: 25" trigger + 25/50/100 menu. */
export function DashboardPageSizeControl({
  value,
  options = [25, 50, 100],
  onChange,
  className,
}: DashboardPageSizeControlProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:border-[#3E3E3E] hover:bg-[#2A2A2A] hover:text-[#FDFDFF] md:text-[12px]"
      >
        Page size: {value}
        <ChevronDownIcon className="shrink-0 opacity-70" />
      </button>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="right"
        placement="top"
        className="min-w-[72px] px-5 py-4"
        items={options.map((size) => ({
          id: String(size),
          label: String(size),
          onSelect: () => onChange(size),
        }))}
      />
    </div>
  );
}

export interface DashboardPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/** Showing X–Y of Z + page size + page controls. */
export function DashboardPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  className,
}: DashboardPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  const pages = React.useMemo(() => {
    const maxButtons = 3;
    let from = Math.max(1, safePage - 1);
    let to = Math.min(pageCount, from + maxButtons - 1);
    from = Math.max(1, to - maxButtons + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [pageCount, safePage]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
        {onPageSizeChange ? (
          <DashboardPageSizeControl
            value={pageSize}
            options={pageSizeOptions}
            onChange={(size) => {
              onPageSizeChange(size);
              onPageChange(1);
            }}
          />
        ) : null}
        <div className="flex items-center gap-1.5">
          <PageNavButton
            label="First page"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
          >
            «
          </PageNavButton>
          <PageNavButton
            label="Previous page"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            ‹
          </PageNavButton>
          {pages.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-sans text-[12px] font-[510] uppercase tabular-nums leading-none tracking-[-0.02em] transition-colors",
                n === safePage
                  ? "border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF]"
                  : "border-[#2D2D30] bg-[#1A1A1A] text-[#959597] hover:border-[#3E3E3E] hover:bg-[#2A2A2A] hover:text-[#FDFDFF]",
              )}
            >
              {n}
            </button>
          ))}
          <PageNavButton
            label="Next page"
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(safePage + 1)}
          >
            ›
          </PageNavButton>
          <PageNavButton
            label="Last page"
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(pageCount)}
          >
            »
          </PageNavButton>
        </div>
      </div>
    </div>
  );
}

function PageNavButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center px-1 font-sans text-[14px] leading-none text-[#959597] transition-colors hover:text-[#FDFDFF] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export interface DashboardBulkSelectBarProps {
  selectedCount: number;
  actions?: React.ReactNode;
  className?: string;
}

/** Bulk select • N rows selected + action buttons. */
export function DashboardBulkSelectBar({
  selectedCount,
  actions,
  className,
}: DashboardBulkSelectBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-divider bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]">
        Bulk select • {selectedCount} rows selected
      </p>
      {actions ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export interface DashboardExportMenuProps {
  triggerLabel?: string;
  items?: DashboardMenuItem[];
  className?: string;
}

const DEFAULT_EXPORT_ITEMS: Omit<DashboardMenuItem, "onSelect">[] = [
  { id: "view-csv", label: "Export current view • CSV" },
  { id: "all-csv", label: "Export all • CSV" },
  { id: "pdf", label: "Export as PDF" },
];

/** Export toolbar button + popover. */
export function DashboardExportMenu({
  triggerLabel = "Export",
  items,
  className,
}: DashboardExportMenuProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const menuItems =
    items ??
    DEFAULT_EXPORT_ITEMS.map((item) => ({
      ...item,
      onSelect: () => undefined,
    }));

  return (
    <div className={cn("relative", className)}>
      <DashboardToolbarButton
        ref={anchorRef}
        leftIcon={<DownloadGlyph />}
        showChevron
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {triggerLabel}
      </DashboardToolbarButton>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={menuItems}
        className="min-w-[220px]"
      />
    </div>
  );
}

function DownloadGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export type DashboardSortDirection = "asc" | "desc";

export interface DashboardSortOption {
  id: string;
  label: string;
}

export interface DashboardSortMenuProps {
  options: DashboardSortOption[];
  field: string;
  direction: DashboardSortDirection;
  onFieldChange: (field: string) => void;
  onDirectionChange: (direction: DashboardSortDirection) => void;
  /** When false, trigger shows field label only (no A-Z / Z-A). Default true. */
  showDirectionInTrigger?: boolean;
  className?: string;
}

/** Sort popover — ascending/descending + field list with check. */
export function DashboardSortMenu({
  options,
  field,
  direction,
  onFieldChange,
  onDirectionChange,
  showDirectionInTrigger = true,
  className,
}: DashboardSortMenuProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const activeLabel =
    options.find((option) => option.id === field)?.label ?? "Sort";
  const directionLabel = direction === "asc" ? "A-Z" : "Z-A";
  const triggerValue = showDirectionInTrigger
    ? `${activeLabel} (${directionLabel})`
    : activeLabel;

  return (
    <div className={cn("relative", className)}>
      <DashboardToolbarButton
        ref={anchorRef}
        variant="muted"
        leftIcon={<SortGlyph />}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="max-w-full"
      >
        <span className="sm:hidden text-foreground-muted">Sort</span>
        <span className="hidden max-w-[14rem] truncate sm:inline">
          <span className="text-foreground-muted">Sort: </span>
          <span className="text-white">{triggerValue}</span>
        </span>
      </DashboardToolbarButton>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={[]}
        className="min-w-[220px] px-0 py-2"
      >
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 px-4 py-3">
            <SortRadio
              label="Sort ascending"
              checked={direction === "asc"}
              onChange={() => onDirectionChange("asc")}
            />
            <SortRadio
              label="Sort descending"
              checked={direction === "desc"}
              onChange={() => onDirectionChange("desc")}
            />
          </div>
          <div className="mx-4 h-px bg-[#2D2D30]" />
          <ul className="flex flex-col gap-1 px-2 py-2">
            {options.map((option) => {
              const active = option.id === field;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onFieldChange(option.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
                  >
                    <span>{option.label}</span>
                    {active ? <CheckGlyph /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DashboardMenuPopover>
    </div>
  );
}

function SortRadio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center gap-2.5 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]"
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full border",
          checked ? "border-[#FDFDFF]" : "border-[#959597]",
        )}
      >
        {checked ? <span className="h-2 w-2 rounded-full bg-[#FDFDFF]" /> : null}
      </span>
      {label}
    </button>
  );
}

function SortGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l5 5L19 7"
        stroke="#22C55E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface DashboardRowActionMenuProps {
  items: DashboardMenuItem[];
  className?: string;
}

/** Vertical ellipsis row action menu. */
export function DashboardRowActionMenu({
  items,
  className,
}: DashboardRowActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
      >
        <span aria-hidden className="text-[16px] leading-none">
          ⋮
        </span>
      </button>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={items}
        className="min-w-[180px]"
      />
    </div>
  );
}
