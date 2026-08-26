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
}

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
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
}: DashboardDataTableProps<T>) {
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
      <div className="overflow-x-auto scrollbar-hidden">
        <table className="dashboard-data-table w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "h-12 bg-[rgba(28,28,30,0.8078)] px-4 align-middle font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.4px] text-foreground-muted",
                    alignClass(col.align),
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#959597]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-white/[0.02]",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "box-border h-[60px] px-4 py-4 align-middle font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-white",
                        alignClass(col.align),
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
    <div className={cn("flex w-full min-w-0 max-w-[220px] flex-col gap-2 overflow-hidden", className)}>
      <p
        title={title}
        className={cn(
          "block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-white md:text-[13px]",
          underline && "underline decoration-white/40 underline-offset-4",
        )}
      >
        {title}
      </p>
      {subtitle ? (
        <p
          title={subtitle}
          className="block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]"
        >
          {subtitle}
        </p>
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
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {children}
    </div>
  );
}
