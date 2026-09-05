"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardFilterChips,
  DashboardListToolbar,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapSalesActivityRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { SALES_KPI_SHELL, SALES_SORT_OPTIONS } from "./crm-constants";
import type { SalesActivityRow } from "./crm-types";

type SalesFilters = {
  type: string;
  status: string;
  repId: string;
};

const DEFAULT_FILTERS: SalesFilters = {
  type: "",
  status: "",
  repId: "",
};

const STATUS_FALLBACK = [
  { value: "COMPLETE", label: "Complete" },
  { value: "PENDING", label: "Pending" },
  { value: "OPEN", label: "Open" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
];

function FilterChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="relative min-w-0 max-w-[200px] flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
          <FilterChevronIcon />
        </span>
      </div>
    </div>
  );
}

function chipsFromFilters(
  f: SalesFilters,
  opts: {
    types: { value: string; label: string }[];
    statuses: { value: string; label: string }[];
    reps: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.type) chips.push({ id: "type", label: optionLabel(opts.types, f.type) });
  if (f.status)
    chips.push({ id: "status", label: optionLabel(opts.statuses, f.status) });
  if (f.repId) chips.push({ id: "rep", label: optionLabel(opts.reps, f.repId) });
  return chips;
}

function SalesFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  typeOptions,
  statusOptions,
  repOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: SalesFilters;
  onChange: (f: SalesFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  typeOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<SalesFilters>) {
    onChange({ ...value, ...p });
  }

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close filters backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Filters
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <FilterSelectRow
            label="Type"
            value={value.type}
            options={typeOptions}
            onChange={(v) => patch({ type: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={statusOptions}
            onChange={(v) => patch({ status: v })}
          />
          <FilterSelectRow
            label="Rep"
            value={value.repId}
            options={repOptions}
            onChange={(v) => patch({ repId: v })}
          />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>Clear All</DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onApply();
                onClose();
              }}
            >
              Apply
            </DashboardToolbarButton>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function SalesActivityPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<"activity" | "summary">("activity");
  const [sortField, setSortField] = React.useState("activityAt");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<SalesFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<SalesFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("SALES_ACTIVITIES");

  const { lookups, reps } = useCrmLookups({ includeLocations: false });
  const typeOptions = lookupOptions(lookups, "salesActivityTypes");
  const statusOptions = React.useMemo(() => {
    const fromLookup =
      lookupOptions(lookups, "salesActivityStatuses").length > 0
        ? lookupOptions(lookups, "salesActivityStatuses")
        : lookupOptions(lookups, "activityStatuses");
    return fromLookup.length ? fromLookup : STATUS_FALLBACK;
  }, [lookups]);

  const chips = React.useMemo(
    () =>
      filtersApplied
        ? chipsFromFilters(appliedFilters, {
            types: typeOptions,
            statuses: statusOptions,
            reps,
          })
        : [],
    [appliedFilters, filtersApplied, reps, statusOptions, typeOptions],
  );

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.type) params.type = appliedFilters.type;
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.repId) params.repId = appliedFilters.repId;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listSalesActivities(p),
    mapRow: mapSalesActivityRow,
    kpi: () => crmApi.salesActivitiesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(SALES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const summaryStats = React.useMemo(() => {
    const byType: Record<string, number> = {};
    for (const row of rows) {
      const key = row.type || "Other";
      byType[key] = (byType[key] ?? 0) + 1;
    }
    const kpiTotal =
      typeof kpiData?.total === "number"
        ? kpiData.total
        : typeof kpiData?.activities === "number"
          ? kpiData.activities
          : total;
    return {
      total: kpiTotal,
      pageCount: rows.length,
      byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      calls: kpiData?.calls ?? byType.CALL ?? byType.Call ?? 0,
      visits: kpiData?.visits ?? byType.VISIT ?? byType.Visit ?? 0,
      meetings: kpiData?.meetings ?? byType.MEETING ?? byType.Meeting ?? 0,
      followUps: kpiData?.followUps ?? 0,
    };
  }, [kpiData, rows, total]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDirection, pageSize, filtersApplied, appliedFilters]);

  function tomorrowIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection,
      query,
      filtersApplied,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: SalesFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ??
          Boolean(nextFilters.type || nextFilters.status || nextFilters.repId),
      );
    } else if (typeof p.filtersApplied === "boolean") {
      setFiltersApplied(p.filtersApplied);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  async function handleExport(opts?: { all?: boolean }) {
    try {
      const res = await crmApi.exportSalesActivities({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        ids: opts?.all
          ? undefined
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined,
        ...extraParams,
      });
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportPdf(opts?: { all?: boolean }) {
    try {
      const res = await crmApi.exportSalesActivities({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "pdf",
        ids: opts?.all
          ? undefined
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined,
        ...extraParams,
      });
      if (!res.data.pdf) throw new Error("No PDF");
      downloadPdf(res.data.pdf, res.data.filename);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportExcel(opts?: { all?: boolean }) {
    try {
      const res = await crmApi.exportSalesActivities({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "xlsx",
        ids: opts?.all
          ? undefined
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined,
        ...extraParams,
      });
      if (!res.data.xlsx) throw new Error("No Excel file");
      downloadXlsx(res.data.xlsx, res.data.filename);
      toastSuccess("Excel downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleFollowUp(id: string) {
    try {
      await crmApi.followUpSalesActivity(id, { followUpAt: tomorrowIso() });
      toastSuccess("Follow-up logged");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkFollowUp() {
    const results = await Promise.allSettled(
      selectedIds.map((id) =>
        crmApi.followUpSalesActivity(id, { followUpAt: tomorrowIso() }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toastApiError(new Error(`${failed} follow-up(s) failed`));
    } else {
      toastSuccess("Follow-ups logged");
    }
    setSelectedIds([]);
    reload();
  }

  const columns: DashboardDataTableColumn<SalesActivityRow>[] = React.useMemo(
    () => [
      {
        id: "activityId",
        header: "Activity ID",
        className: "min-w-[120px] max-w-[160px]",
        cell: (row) => (
          <DashboardTablePrimaryCell title={row.activityId} subtitle={row.time} underline />
        ),
      },
      {
        id: "date",
        header: "Date",
        className: "min-w-[80px]",
        cell: (row) => row.date,
      },
      {
        id: "type",
        header: "Type",
        className: "min-w-[90px]",
        cell: (row) => row.type,
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[120px] max-w-[160px]",
        cell: (row) => row.customer,
      },
      {
        id: "contact",
        header: "Contact",
        className: "min-w-[110px] hidden md:table-cell",
        cell: (row) => row.contact,
      },
      {
        id: "rep",
        header: "Rep",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => row.rep,
      },
      {
        id: "subject",
        header: "Subject",
        className: "min-w-[130px] hidden lg:table-cell",
        cell: (row) => (
          <span className="underline underline-offset-2">{row.subject}</span>
        ),
      },
      {
        id: "outcome",
        header: "Outcome",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge variant={row.outcome.variant} pill className="max-w-full">
            {row.outcome.label}
          </DashboardBadge>
        ),
      },
      {
        id: "followUp",
        header: "Follow-up",
        className: "min-w-[90px] hidden xl:table-cell",
        cell: (row) =>
          row.followUp ? (
            <DashboardBadge variant={row.followUp.variant} pill className="max-w-full">
              {row.followUp.label}
            </DashboardBadge>
          ) : (
            <span className="text-[#959597]">—</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[90px]",
        cell: (row) => (
          <DashboardBadge variant={row.status.variant} pill className="max-w-full">
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              { id: "open", label: "Open Activity", onSelect: () => router.push(`/crm/sales/${row.id}`) },
              {
                id: "followup",
                label: "Log Follow-up",
                onSelect: () => void handleFollowUp(row.id),
              },
              { id: "quote", label: "Create Quote", onSelect: () => router.push("/crm/quotes/new") },
              {
                id: "edit",
                label: "Edit",
                onSelect: () => router.push(`/crm/sales/${row.id}/edit`),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <CrmListLoadGate loading={loading} hasData={!initialLoading} kpiCount={5}>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Sales Activity
        </h1>
        <Link href="/crm/sales/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary" showChevron>
            Log Activity
          </DashboardToolbarButton>
        </Link>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex items-center gap-2">
        {(
          [
            { id: "activity", label: "Sales Activity" },
            { id: "summary", label: "Summary" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
              tab === t.id
                ? "bg-[#353535] text-[#FDFDFF]"
                : "bg-transparent text-[#959597] hover:text-[#FDFDFF]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton onClick={() => void handleBulkFollowUp()}>
                Log Follow-up
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void handleExport({ all: true }) },
                  { id: "xlsx", label: "Export as Excel", onSelect: () => void handleExportExcel() },
                  { id: "pdf", label: "Export as PDF", onSelect: () => void handleExportPdf() },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search WO, Customer, Loca..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              {`Filter (${chips.length > 0 ? chips.length : "-"})`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved Views
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void handleExport({ all: true }) },
                  { id: "xlsx", label: "Export as Excel", onSelect: () => void handleExportExcel({ all: true }) },
                  { id: "pdf", label: "Export as PDF", onSelect: () => void handleExportPdf({ all: true }) },
                ]}
              />
              <DashboardSortMenu
                options={SALES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
              />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={(id) => {
                  const next = { ...appliedFilters };
                  if (id === "type") next.type = "";
                  if (id === "status") next.status = "";
                  if (id === "rep") next.repId = "";
                  setAppliedFilters(next);
                  setDraftFilters(next);
                  if (!next.type && !next.status && !next.repId) {
                    setFiltersApplied(false);
                  }
                }}
                onClearAll={() => {
                  setDraftFilters(DEFAULT_FILTERS);
                  setAppliedFilters(DEFAULT_FILTERS);
                  setFiltersApplied(false);
                }}
              />
            ) : null
          }
        />
      )}

      {tab === "activity" ? (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            emptyMessage="No sales activity found"
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onRowClick={(row) => router.push(`/crm/sales/${row.id}`)}
          />
          <DashboardPagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <div className="space-y-4 rounded-xl border border-divider bg-panel p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">Total activities</p>
              <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">{summaryStats.total}</p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">Calls</p>
              <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">{summaryStats.calls}</p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">Visits</p>
              <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">{summaryStats.visits}</p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">Meetings</p>
              <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">{summaryStats.meetings}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 font-sans text-[11px] uppercase text-[#959597]">
              Counts by type (current page · {summaryStats.pageCount})
            </p>
            {summaryStats.byType.length === 0 ? (
              <p className="font-sans text-[12px] uppercase text-[#959597]">No activities loaded</p>
            ) : (
              <ul className="space-y-2">
                {summaryStats.byType.map(([type, count]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between gap-3 font-sans text-[12px] uppercase text-[#FDFDFF]"
                  >
                    <span>{type}</span>
                    <span className="text-[#959597]">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {summaryStats.followUps ? (
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              Follow-ups due: {summaryStats.followUps}
            </p>
          ) : null}
        </div>
      )}

      <SalesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setFiltersApplied(false);
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        repOptions={reps}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={(viewId) => {
          setActiveViewId(viewId);
          const view = savedViews.find((v) => v.id === viewId);
          if (view?.payload != null) applySavedViewPayload(view.payload);
        }}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) {
              void createView(
                `${source.label} copy`,
                (source.payload as Record<string, unknown> | undefined) ??
                  currentViewPayload(),
              );
            }
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />
    </div>
    </CrmListLoadGate>
  );
}
