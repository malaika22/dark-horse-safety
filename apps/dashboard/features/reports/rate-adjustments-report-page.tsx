"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardDrawer,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  DashboardRowActionMenu,
  cn,
  type DashboardBadgeVariant,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  reportsApi,
  type RateAdjustmentsOptions,
  type RateAdjustmentsReport,
  type RateAdjustmentsRow,
} from "@/lib/reports-api";
import { downloadCsv } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";
import {
  OpsAllCaughtUpState,
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

type Filters = {
  customerId: string;
  adjustedById: string;
  from: string;
  to: string;
  deltaThreshold: string;
};

const EMPTY_FILTERS: Filters = {
  customerId: "",
  adjustedById: "",
  from: "",
  to: "",
  deltaThreshold: "",
};

const SORT_OPTIONS = [
  { id: "date", label: "Date" },
  { id: "delta", label: "Delta $" },
  { id: "customer", label: "Customer" },
  { id: "ticket", label: "Ticket" },
];

const fieldClass =
  "h-9 w-full min-w-[140px] appearance-none rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";

function FilterCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 12.5l4 4L18.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusTicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function deltaToneClass(tone: string) {
  if (tone === "neg") return "text-[#E8A0A0]";
  if (tone === "pos") return "text-[#ACEBCE]";
  return "text-[#FDFDFF]";
}

function reasonBadgeVariant(tone: string): DashboardBadgeVariant {
  return tone === "outline" ? "success" : "billing";
}

function adjusterBadgeVariant(tone: string): DashboardBadgeVariant {
  if (tone === "gold") return "gold";
  if (tone === "red") return "billing";
  return "success";
}

function RateAdjustmentsFiltersDrawer({
  open,
  onClose,
  draft,
  onChange,
  options,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  draft: Filters;
  onChange: (next: Filters) => void;
  options: RateAdjustmentsOptions | null;
  onApply: () => void;
  onClearAll: () => void;
}) {
  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      widthClassName="max-w-[380px]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
            </DashboardToolbarButton>
            <PayrollPrimaryButton onClick={onApply}>Apply</PayrollPrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 pt-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Date Range
          </span>
          <div className="flex w-full max-w-[220px] flex-col gap-2">
            <input
              type="date"
              className={fieldClass}
              value={draft.from}
              onChange={(e) => onChange({ ...draft, from: e.target.value })}
              aria-label="From date"
            />
            <input
              type="date"
              className={fieldClass}
              value={draft.to}
              onChange={(e) => onChange({ ...draft, to: e.target.value })}
              aria-label="To date"
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Customer
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.customerId}
            onChange={(e) =>
              onChange({ ...draft, customerId: e.target.value })
            }
          >
            {(options?.customers ?? [{ value: "", label: "Any" }]).map((o) => (
              <option key={o.value || "any"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Adjusted By
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.adjustedById}
            onChange={(e) =>
              onChange({ ...draft, adjustedById: e.target.value })
            }
          >
            {(options?.adjustedBy ?? [{ value: "", label: "Any" }]).map(
              (o) => (
                <option key={o.value || "any"} value={o.value}>
                  {o.label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="max-w-[120px] shrink-0 font-sans text-[11px] font-[510] uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF]">
            Delta Above Threshold
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.deltaThreshold}
            onChange={(e) =>
              onChange({ ...draft, deltaThreshold: e.target.value })
            }
          >
            {(
              options?.deltaThresholds ?? [{ value: "", label: "Any" }]
            ).map((o) => (
              <option key={o.value || "any"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </DashboardDrawer>
  );
}

export function RateAdjustmentsReportPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortField, setSortField] = React.useState("date");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [options, setOptions] = React.useState<RateAdjustmentsOptions | null>(
    null,
  );
  const [report, setReport] = React.useState<RateAdjustmentsReport | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  useSetHeaderBreadcrumb("Report / Rate Adjustments");
  useSetHeaderActions(
    <PayrollPrimaryButton
      className="gap-1.5"
      onClick={() => router.push("/operations/sales-tickets")}
    >
      <PlusTicketIcon />
      Open Ticket
    </PayrollPrimaryButton>,
    [router],
  );

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  const queryParams = React.useMemo(
    () => ({
      q: q || undefined,
      customerId: filters.customerId || undefined,
      adjustedById: filters.adjustedById || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      deltaThreshold: filters.deltaThreshold
        ? Number(filters.deltaThreshold)
        : undefined,
      sort: sortField as "date" | "delta" | "customer" | "ticket",
      direction: sortDirection,
    }),
    [q, filters, sortField, sortDirection],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await reportsApi.rateAdjustmentsOptions();
        if (!cancelled) setOptions(res.data);
      } catch (err) {
        if (!cancelled) toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await reportsApi.rateAdjustments(queryParams);
        if (!cancelled) setReport(res.data);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load rate adjustments report.");
          setReport(null);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryParams, reloadKey]);

  const filtersActive = Boolean(
    filters.customerId ||
      filters.adjustedById ||
      filters.from ||
      filters.to ||
      filters.deltaThreshold,
  );

  async function runExport() {
    try {
      const res = await reportsApi.rateAdjustmentsExport(queryParams);
      downloadCsv(res.data.csv, res.data.filename);
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns = React.useMemo<
    DashboardDataTableColumn<RateAdjustmentsRow>[]
  >(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.dateLabel}
          </span>
        ),
      },
      {
        id: "ticket",
        header: "Ticket",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#8B9BB4]">
            {row.ticketCode}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.customerShort}
          </span>
        ),
      },
      {
        id: "tech",
        header: "Technician",
        cell: (row) => (
          <span className="max-w-[100px] truncate font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.technician}
          </span>
        ),
      },
      {
        id: "rate",
        header: "Rate Change",
        cell: (row) => (
          <span className="whitespace-nowrap font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.rateChangeLabel}
          </span>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        cell: (row) => (
          <span className="whitespace-nowrap font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.hoursLabel}
          </span>
        ),
      },
      {
        id: "delta",
        header: "Delta $",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] uppercase",
              deltaToneClass(row.deltaTone),
            )}
          >
            {row.deltaLabel}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <DashboardBadge variant={reasonBadgeVariant(row.reasonTone)} pill>
            {row.reason}
          </DashboardBadge>
        ),
      },
      {
        id: "by",
        header: "Adjusted By",
        cell: (row) => (
          <DashboardBadge
            variant={adjusterBadgeVariant(row.adjustedByTone)}
            pill
          >
            {row.adjustedBy}
          </DashboardBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "open",
                label: "Open Ticket",
                onSelect: () =>
                  router.push(`/operations/sales-tickets?q=${row.ticketCode}`),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  if (loading && !report) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadingListState rows={6} />
      </div>
    );
  }

  if (loadError && !report) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadFailedState description={loadError} onRetry={() => refresh()} />
      </div>
    );
  }

  if (!report) return null;

  const kpis = report.kpis;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Adjustments This Cycle"
            value={String(kpis.adjustmentsThisCycle)}
            meta={kpis.adjustmentsMeta}
            icon="lightning"
          />
          <DashboardStatCell
            title="Total Dollar Impact"
            value={kpis.totalDollarImpactLabel}
            meta={kpis.totalDollarImpactMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Largest Adjustment"
            value={kpis.largestAdjustmentLabel}
            meta={kpis.largestAdjustmentMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Most Adjustments By"
            value={kpis.mostAdjustmentsBy}
            meta={kpis.mostAdjustmentsMeta}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search ticket, customer, tech…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
        filters={
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
            rightIcon={
              filtersActive ? (
                <FilterCheckIcon />
              ) : undefined
            }
            onClick={() => {
              setDraft(filters);
              setFilterOpen(true);
            }}
          >
            Filter
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardSortMenu
              options={SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
              directionFormat="long"
            />
            <DashboardExportMenu
              items={[
                {
                  id: "view-csv",
                  label: "Export current view • CSV",
                  onSelect: () => void runExport(),
                },
                {
                  id: "all-csv",
                  label: "Export all • CSV",
                  onSelect: () => void runExport(),
                },
              ]}
            />
          </>
        }
      />

      {report.rows.length === 0 ? (
        <OpsAllCaughtUpState />
      ) : (
        <DashboardDataTable
          columns={columns}
          rows={report.rows}
          getRowId={(row) => row.id}
        />
      )}

      <RateAdjustmentsFiltersDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        draft={draft}
        onChange={setDraft}
        options={options}
        onApply={() => {
          setFilters(draft);
          setFilterOpen(false);
        }}
        onClearAll={() => {
          setDraft(EMPTY_FILTERS);
          setFilters(EMPTY_FILTERS);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}
