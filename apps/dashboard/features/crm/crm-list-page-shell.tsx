"use client";

import * as React from "react";
import {
  DashboardDataTable,
  DashboardFilterChips,
  DashboardListToolbar,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardFilterChip,
  type StatIconName,
} from "@dark-horse-safety/ui";

export type CrmListKpi = {
  title: string;
  value: string;
  meta: string;
  icon?: StatIconName;
};

export function PlusIcon({ className }: { className?: string }) {
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
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma Add CTA — filled person / user silhouette. */
export function AddUserIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="7.5" r="3.5" fill="currentColor" />
      <path
        d="M5 20.75c0-3.5 3.15-6 7-6s7 2.5 7 6"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma primary CTA — document with corner plus (Create Quote / Send Quote). */
export function DocumentPlusIcon({ className }: { className?: string }) {
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
        d="M7 3.75h6.5L17.25 7.5V14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M7 3.75v16.5h6.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3.75V7.5h3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.25h3.5M9 13.25h2.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17.5 16.25v5M15 18.75h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const DEFAULT_CHIPS: DashboardFilterChip[] = [
  { id: "active", label: "Active" },
  { id: "current", label: "Current" },
  { id: "future", label: "Future" },
];

/**
 * Shared CRM list layout — same shell as Customers:
 * title + primary CTA · 4 KPI · search/filter/sort/export · chips · data table
 */
export function CrmListPageShell<T>({
  title,
  primaryAction,
  searchPlaceholder,
  kpi,
  columns,
  rows,
  getRowId,
  emptyMessage = "No results",
  searchFilter,
  defaultChips = DEFAULT_CHIPS,
}: {
  title: string;
  primaryAction: React.ReactNode;
  searchPlaceholder: string;
  kpi: CrmListKpi[];
  columns: DashboardDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  searchFilter: (row: T, query: string) => boolean;
  defaultChips?: DashboardFilterChip[];
}) {
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState(defaultChips);

  const filtered = rows.filter((row) => {
    if (!query.trim()) return true;
    return searchFilter(row, query.trim().toLowerCase());
  });

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          {title}
        </h2>
        <div className="flex flex-row flex-wrap items-center gap-2">
          {primaryAction}
        </div>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpi.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
        filters={
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
          >
            Filter
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardToolbarButton
              variant="muted"
              leftIcon={<DashboardToolbarIcons.Sort className="shrink-0" />}
            >
              Sort: Notice start (nearest)
            </DashboardToolbarButton>
            <DashboardToolbarButton
              leftIcon={
                <DashboardToolbarIcons.Customers className="shrink-0" />
              }
            >
              Payroll review
            </DashboardToolbarButton>
            <DashboardToolbarButton
              leftIcon={
                <DashboardToolbarIcons.Download className="shrink-0" />
              }
              showChevron
            >
              Export
            </DashboardToolbarButton>
          </>
        }
        chips={
          <DashboardFilterChips
            chips={chips}
            onRemove={(id) =>
              setChips((prev) => prev.filter((c) => c.id !== id))
            }
            onClearAll={() => setChips([])}
          />
        }
      />

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={getRowId}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
