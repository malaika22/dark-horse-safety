"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
import { mapEodReportRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { EOD_KPI_SHELL, EOD_SORT_OPTIONS } from "./crm-constants";
import type { BadgeCell, EodReportRow } from "./crm-types";

type EodFilters = {
  status: string;
  repId: string;
};

const DEFAULT_EOD_FILTERS: EodFilters = {
  status: "",
  repId: "",
};

function FilterCheckMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8v4.5l3 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  f: EodFilters,
  opts: {
    statuses: { value: string; label: string }[];
    reps: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.status === "NEEDS_REVIEW" || f.status === "PENDING") {
    chips.push({ id: "exceptions", label: "Exceptions" });
  } else if (f.status) {
    chips.push({
      id: "status",
      label: optionLabel(opts.statuses, f.status),
    });
  }
  if (f.repId) {
    chips.push({ id: "rep", label: optionLabel(opts.reps, f.repId) });
  }
  return chips;
}

function EodFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  statusOptions,
  repOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: EodFilters;
  onChange: (f: EodFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  statusOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<EodFilters>) {
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

function BadgeOrDash({ value }: { value: BadgeCell }) {
  if (!value) return <span className="text-[#959597]">—</span>;
  return (
    <DashboardBadge variant={value.variant} pill className="max-w-full">
      {value.label}
    </DashboardBadge>
  );
}

function StackedCell({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate">{title}</div>
      {subtitle ? (
        <div className="truncate text-[10px] uppercase text-[#959597]">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export function EodReportsPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("reportDate");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<EodFilters>(DEFAULT_EOD_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<EodFilters>(DEFAULT_EOD_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("EOD_REPORTS");

  const { lookups, reps } = useCrmLookups({ includeLocations: false });
  const statusOptions = React.useMemo(() => {
    const base = lookupOptions(lookups, "eodStatuses");
    if (!base.some((o) => o.value === "NEEDS_REVIEW")) {
      return [...base, { value: "NEEDS_REVIEW", label: "Needs review" }];
    }
    return base;
  }, [lookups]);

  const chips = React.useMemo(
    () =>
      filtersApplied
        ? chipsFromFilters(appliedFilters, { statuses: statusOptions, reps })
        : [],
    [appliedFilters, filtersApplied, reps, statusOptions],
  );

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.repId) params.repId = appliedFilters.repId;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listEodReports(p),
    mapRow: mapEodReportRow,
    kpi: () => crmApi.eodReportsKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(EOD_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDirection, pageSize, filtersApplied, appliedFilters]);

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
      filters?: EodFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_EOD_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ?? Boolean(nextFilters.status || nextFilters.repId),
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

  async function handleExport(opts?: { ids?: string[]; all?: boolean }) {
    try {
      const ids =
        opts?.all ? undefined : opts?.ids?.length
          ? opts.ids.join(",")
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined;
      const res = await crmApi.exportEodReports({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        ids,
        ...extraParams,
      });
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportPdf(opts?: { ids?: string[]; all?: boolean }) {
    try {
      const ids =
        opts?.all ? undefined : opts?.ids?.length
          ? opts.ids.join(",")
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined;
      const res = await crmApi.exportEodReports({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "pdf",
        ids,
        ...extraParams,
      });
      if (!res.data.pdf) throw new Error("No PDF");
      downloadPdf(res.data.pdf, res.data.filename);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportExcel(opts?: { ids?: string[]; all?: boolean }) {
    try {
      const ids =
        opts?.all ? undefined : opts?.ids?.length
          ? opts.ids.join(",")
          : selectedIds.length
            ? selectedIds.join(",")
            : undefined;
      const res = await crmApi.exportEodReports({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "xlsx",
        ids,
        ...extraParams,
      });
      if (!res.data.xlsx) throw new Error("No Excel file");
      downloadXlsx(res.data.xlsx, res.data.filename);
      toastSuccess("Excel downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleRemind(id: string) {
    try {
      await crmApi.remindEodReport(id);
      toastSuccess("Reminder sent");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkRemind() {
    try {
      await crmApi.bulkRemindEodReports(selectedIds);
      toastSuccess("Reminders sent");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  function applyExceptionFilter() {
    const next: EodFilters = { status: "PENDING", repId: appliedFilters.repId };
    setDraftFilters(next);
    setAppliedFilters(next);
    setFiltersApplied(true);
    toastSuccess("Showing exception reports");
  }

  function clearChip(id: string) {
    if (id === "exceptions" || id === "status") {
      const next = { ...appliedFilters, status: "" };
      setAppliedFilters(next);
      setDraftFilters(next);
      if (!next.repId) setFiltersApplied(false);
    } else if (id === "rep") {
      const next = { ...appliedFilters, repId: "" };
      setAppliedFilters(next);
      setDraftFilters(next);
      if (!next.status) setFiltersApplied(false);
    }
  }

  const columns: DashboardDataTableColumn<EodReportRow>[] = React.useMemo(
    () => [
      {
        id: "reportId",
        header: "Report ID",
        className: "min-w-[110px] max-w-[150px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.reportId}
            subtitle={row.submittedTime}
            underline
          />
        ),
      },
      {
        id: "date",
        header: "Date",
        className: "min-w-[80px]",
        cell: (row) => row.date,
      },
      {
        id: "rep",
        header: "Rep",
        className: "min-w-[120px]",
        cell: (row) => row.rep,
      },
      {
        id: "activities",
        header: "Activities",
        className: "min-w-[90px]",
        cell: (row) => row.activities,
      },
      {
        id: "calls",
        header: "Calls",
        className: "min-w-[80px] hidden md:table-cell",
        cell: (row) => (
          <StackedCell title={row.calls} subtitle={row.callsDetail} />
        ),
      },
      {
        id: "visits",
        header: "Visits",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => (
          <StackedCell title={row.visits} subtitle={row.visitsDetail} />
        ),
      },
      {
        id: "meetings",
        header: "Meetings",
        className: "min-w-[90px] hidden lg:table-cell",
        cell: (row) =>
          row.meetingsBadge ? (
            <DashboardBadge
              variant={row.meetingsBadge.variant}
              pill
              className="max-w-full"
            >
              {row.meetingsBadge.label}
            </DashboardBadge>
          ) : (
            <span className="underline underline-offset-2">
              {row.meetings || "—"}
            </span>
          ),
      },
      {
        id: "quotes",
        header: "Quotes",
        className: "min-w-[120px] hidden xl:table-cell",
        cell: (row) => <BadgeOrDash value={row.quotes} />,
      },
      {
        id: "pipeline",
        header: "Pipeline",
        className: "min-w-[130px] hidden xl:table-cell",
        cell: (row) => <BadgeOrDash value={row.pipeline} />,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge
            variant={row.status.variant}
            pill
            className="max-w-full"
          >
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
              {
                id: "open",
                label: "Open Report",
                onSelect: () => router.push(`/crm/eod-reports/${row.id}`),
              },
              {
                id: "activities",
                label: "View Reps Activities That Day",
                onSelect: () =>
                  router.push(
                    `/crm/sales?repId=${encodeURIComponent(row.id)}&date=${encodeURIComponent(row.date)}`,
                  ),
              },
              {
                id: "reminder",
                label: "Send Reminder",
                onSelect: () => void handleRemind(row.id),
              },
              {
                id: "export",
                label: "Export",
                onSelect: () => void handleExport({ ids: [row.id] }),
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
      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton onClick={() => void handleBulkRemind()}>
                Send reminder
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  {
                    id: "selected-csv",
                    label: "Export selected view • CSV",
                    onSelect: () => void handleExport({ ids: selectedIds }),
                  },
                  {
                    id: "all-csv",
                    label: "Export all • CSV",
                    onSelect: () => void handleExport({ all: true }),
                  },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void handleExportExcel({ ids: selectedIds }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void handleExportPdf({ ids: selectedIds }),
                  },
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
              rightIcon={
                <FilterCheckMarkIcon className="shrink-0 text-[#959597]" />
              }
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              Filter
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved views
              </DashboardToolbarButton>
              <DashboardSortMenu
                options={EOD_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                leftIcon={<ClockIcon className="shrink-0" />}
                showChevron
                onClick={applyExceptionFilter}
              >
                Review Exceptions
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  {
                    id: "view-csv",
                    label: "Export current view • CSV",
                    onSelect: () => void handleExport(),
                  },
                  {
                    id: "all-csv",
                    label: "Export all • CSV",
                    onSelect: () => void handleExport({ all: true }),
                  },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void handleExportExcel({ all: true }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void handleExportPdf({ all: true }),
                  },
                ]}
              />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={clearChip}
                onClearAll={() => {
                  setDraftFilters(DEFAULT_EOD_FILTERS);
                  setAppliedFilters(DEFAULT_EOD_FILTERS);
                  setFiltersApplied(false);
                }}
              />
            ) : null
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage="No EOD reports found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/eod-reports/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <EodFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_EOD_FILTERS);
          setAppliedFilters(DEFAULT_EOD_FILTERS);
          setFiltersApplied(false);
        }}
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
