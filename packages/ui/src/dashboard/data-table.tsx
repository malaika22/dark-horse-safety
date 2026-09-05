"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardDataTableColumn<T> {
  id: string;
  header: string;
  /** Tailwind width / min-width hint, e.g. "min-w-[140px]" */
  className?: string;
  align?: "left" | "center" | "right";
  cell: (row: T) => React.ReactNode;
}

export interface DashboardDataTableProps<T> {
  columns: DashboardDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  /** Optional click handler for entire row */
  onRowClick?: (row: T) => void;
  /** Flush inside a parent panel (no outer border / radius) */
  embedded?: boolean;
  /** Controlled row selection */
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  /** Show leading checkbox column */
  selectable?: boolean;
}

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.checked)}
      onClick={(event) => event.stopPropagation()}
      className="h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-[#3E3E3E] bg-[#1A1A1A] checked:border-[#FDFDFF] checked:bg-[#FDFDFF] checked:bg-[length:12px_12px] checked:bg-center checked:bg-no-repeat"
      style={
        checked
          ? {
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23121212' d='M6.5 11.2 3.3 8l1.1-1.1 2.1 2.1 5-5L12.6 5z'/%3E%3C/svg%3E\")",
            }
          : undefined
      }
    />
  );
}

/** Shared dark data table used across CRM / HR / Ops list pages. */
export function DashboardDataTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage = "No results",
  className,
  onRowClick,
  embedded = false,
  selectedIds,
  onSelectedIdsChange,
  selectable = false,
}: DashboardDataTableProps<T>) {
  const ids = rows.map(getRowId);
  const selected = selectedIds ?? [];
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someSelected = ids.some((id) => selected.includes(id)) && !allSelected;
  const colSpan = columns.length + (selectable ? 1 : 0);

  function toggleAll(checked: boolean) {
    if (!onSelectedIdsChange) return;
    if (checked) {
      onSelectedIdsChange(Array.from(new Set([...selected, ...ids])));
    } else {
      onSelectedIdsChange(selected.filter((id) => !ids.includes(id)));
    }
  }

  function toggleOne(id: string, checked: boolean) {
    if (!onSelectedIdsChange) return;
    if (checked) onSelectedIdsChange([...selected, id]);
    else onSelectedIdsChange(selected.filter((item) => item !== id));
  }

  return (
    <div
      className={cn(
        "overflow-hidden bg-panel",
        embedded
          ? "rounded-none border-0"
          : "rounded-xl border border-divider",
        className,
      )}
    >
      <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin] sm:scrollbar-hidden">
        <table className="dashboard-data-table w-full min-w-[640px] border-collapse text-left lg:min-w-[900px]">
          <thead>
            <tr>
              {selectable ? (
                <th
                  scope="col"
                  className="h-12 w-12 bg-[rgba(28,28,30,0.8078)] px-4 align-middle"
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    ariaLabel="Select all rows"
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "h-12 min-w-0 overflow-hidden bg-[rgba(28,28,30,0.8078)] px-4 align-middle font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.4px] text-foreground-muted",
                    alignClass(col.align),
                    col.className,
                  )}
                >
                  {typeof col.header === "string" && col.header ? (
                    <DashboardTableTruncatedText className="min-w-0 max-w-full text-foreground-muted">
                      {col.header}
                    </DashboardTableTruncatedText>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#959597]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                const isSelected = selected.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      onRowClick && "cursor-pointer hover:bg-white/[0.02]",
                      isSelected && "bg-white/[0.02]",
                    )}
                  >
                    {selectable ? (
                      <td className="box-border h-[60px] w-12 px-4 align-middle">
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => toggleOne(id, checked)}
                          ariaLabel={`Select row ${id}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "box-border h-[60px] min-w-0 overflow-hidden px-4 py-4 align-middle font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-white",
                          alignClass(col.align),
                          col.className,
                        )}
                      >
                        {renderTableCellContent(col.cell(row))}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface DashboardTableTruncatedTextProps {
  children: string;
  className?: string;
  /** Extra classes for the tooltip panel */
  tipClassName?: string;
}

/** Ellipsis text — shows full value in a fixed tooltip when truncated. */
export function DashboardTableTruncatedText({
  children,
  className,
  tipClassName,
}: DashboardTableTruncatedTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = React.useState(false);
  const [tip, setTip] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  function openTip() {
    const el = ref.current;
    if (!el) return;
    const isTruncated = el.scrollWidth > el.clientWidth + 1;
    setTruncated(isTruncated);
    if (!isTruncated) return;
    const rect = el.getBoundingClientRect();
    setTip({ top: rect.bottom + 6, left: rect.left });
  }

  function closeTip() {
    setTip(null);
  }

  return (
    <>
      <span
        ref={ref}
        className={cn(
          "block max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
          className,
        )}
        title={truncated && !tip ? children : undefined}
        onMouseEnter={openTip}
        onMouseLeave={closeTip}
        onFocus={openTip}
        onBlur={closeTip}
        tabIndex={truncated ? 0 : undefined}
      >
        {children}
      </span>
      {tip ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-[80] max-w-[min(280px,70vw)] rounded-md border border-[#2E2E2E] bg-[#1A1A1A] px-2.5 py-1.5 font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF] shadow-lg",
            tipClassName,
          )}
          style={{ top: tip.top, left: tip.left }}
        >
          {children}
        </span>
      ) : null}
    </>
  );
}

function renderTableCellContent(content: React.ReactNode) {
  if (typeof content === "string" || typeof content === "number") {
    return (
      <DashboardTableTruncatedText className="min-w-0 w-full max-w-full">
        {String(content)}
      </DashboardTableTruncatedText>
    );
  }
  return content;
}

export interface DashboardTablePrimaryCellProps {
  title: string;
  subtitle?: string;
  className?: string;
  /** Underline title — used on contacts / rules list links */
  underline?: boolean;
}

/** Name + muted ID stack used in customer / employee primary columns. */
export function DashboardTablePrimaryCell({
  title,
  subtitle,
  className,
  underline = false,
}: DashboardTablePrimaryCellProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[220px] flex-col gap-2",
        className,
      )}
    >
      <DashboardTableTruncatedText
        className={cn(
          "font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]",
          underline && "border-b border-[#FDFDFF]/75 pb-[3px]",
        )}
      >
        {title}
      </DashboardTableTruncatedText>
      {subtitle ? (
        <DashboardTableTruncatedText className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
          {subtitle}
        </DashboardTableTruncatedText>
      ) : null}
    </div>
  );
}

export interface DashboardTableBadgeStackProps {
  children: React.ReactNode;
  className?: string;
}

/** Vertical stack of status pills inside a table cell. */
export function DashboardTableBadgeStack({
  children,
  className,
}: DashboardTableBadgeStackProps) {
  return (
    <div className={cn("flex max-w-[160px] flex-col items-start gap-2", className)}>
      {children}
    </div>
  );
}
