"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardPagination,
  DashboardPanel,
  DashboardPanelTitle,
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
import { mapPricingRuleRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmHistoryModal } from "./crm-action-modals";
import { PRICING_KPI_SHELL, PRICING_SORT_OPTIONS } from "./crm-constants";
import type { PricingRuleRow } from "./crm-types";

type PricingFilters = {
  customer: string;
  serviceType: string;
  rateType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const DEFAULT_PRICING_FILTERS: PricingFilters = {
  customer: "",
  serviceType: "",
  rateType: "",
  status: "",
  effectiveFrom: "",
  effectiveTo: "",
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

function ClipboardIcon({ className }: { className?: string }) {
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
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}


function countTrailing(label: string) {
  return (
    <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
      {label}
    </span>
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

function FilterRangeRow({
  label,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          type="text"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
        <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
          -
        </span>
        <input
          type="text"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
      </div>
    </div>
  );
}

function PricingFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  serviceOptions,
  rateTypeOptions,
  statusOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: PricingFilters;
  onChange: (f: PricingFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  serviceOptions: { value: string; label: string }[];
  rateTypeOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<PricingFilters>) {
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
            label="Customer"
            value={value.customer}
            options={customerOptions}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterSelectRow
            label="Service Type"
            value={value.serviceType}
            options={serviceOptions}
            onChange={(v) => patch({ serviceType: v })}
          />
          <FilterSelectRow
            label="Rate Type"
            value={value.rateType}
            options={rateTypeOptions}
            onChange={(v) => patch({ rateType: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={statusOptions}
            onChange={(v) => patch({ status: v })}
          />
          <FilterRangeRow
            label="Effective Date"
            from={value.effectiveFrom}
            to={value.effectiveTo}
            onFromChange={(v) => patch({ effectiveFrom: v })}
            onToChange={(v) => patch({ effectiveTo: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>
            Close
          </DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
            </DashboardToolbarButton>
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

export function PricingRulesPage() {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("serviceItem");
  const [sortDir, setSortDir] = React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<PricingFilters>(
    DEFAULT_PRICING_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<PricingFilters>(
    DEFAULT_PRICING_FILTERS,
  );
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen, setSaveNewOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTitle, setHistoryTitle] = React.useState("Rule History");
  const [historyEvents, setHistoryEvents] = React.useState<
    { id: string; at: string; label: string; detail?: string }[]
  >([]);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("PRICING_RULES");

  const { lookups, customers } = useCrmLookups({ includeLocations: false });
  const serviceOptions = lookupOptions(lookups, "serviceItems");
  const rateTypeOptions = lookupOptions(lookups, "rateTypes");
  const statusOptions = lookupOptions(lookups, "pricingStatuses");

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.serviceType) params.serviceItem = appliedFilters.serviceType;
    if (appliedFilters.rateType) params.rateType = appliedFilters.rateType;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listPricingRules(p),
    mapRow: mapPricingRuleRow,
    kpi: () => crmApi.pricingRulesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDir,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(PRICING_KPI_SHELL, kpiData),
    [kpiData],
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDir, pageSize, filtersApplied]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection: sortDir,
      query,
      filtersApplied,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: PricingFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_PRICING_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ??
          Object.values(nextFilters).some((v) => Boolean(v)),
      );
    } else if (typeof p.filtersApplied === "boolean") {
      setFiltersApplied(p.filtersApplied);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDir(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  async function runExport(opts?: {
    format?: "csv" | "pdf" | "xlsx";
    selectedOnly?: boolean;
  }) {
    try {
      if (opts?.selectedOnly && selectedIds.length === 0) {
        toastApiError(new Error("Select at least one pricing rule to export"));
        return;
      }
      const format = opts?.format ?? "csv";
      const res = await crmApi.exportPricingRules({
        q: query || undefined,
        sort: sortField,
        direction: sortDir,
        format: format === "csv" ? undefined : format,
        ids: opts?.selectedOnly ? selectedIds.join(",") : undefined,
        ...extraParams,
      });
      if (format === "pdf") {
        if (!res.data.pdf) throw new Error("No PDF");
        downloadPdf(res.data.pdf, res.data.filename);
        toastSuccess("PDF downloaded");
        return;
      }
      if (format === "xlsx") {
        if (!res.data.xlsx) throw new Error("No Excel file");
        downloadXlsx(res.data.xlsx, res.data.filename);
        toastSuccess("Excel downloaded");
        return;
      }
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleViewHistory(id: string, label?: string) {
    try {
      const res = await crmApi.pricingRuleHistory(id);
      setHistoryTitle(label ? `History · ${label}` : "Rule History");
      setHistoryEvents(res.data.events ?? []);
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this pricing rule?")) {
      return;
    }
    try {
      await crmApi.deletePricingRule(id);
      toastSuccess("Pricing rule deleted");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await crmApi.duplicatePricingRule(id);
      toastSuccess("Pricing rule duplicated");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete ${selectedIds.length} pricing rule(s)?`)
    ) {
      return;
    }
    try {
      await crmApi.bulkDeletePricingRules(selectedIds);
      toastSuccess("Pricing rules deleted");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns: DashboardDataTableColumn<PricingRuleRow>[] = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px] max-w-[240px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.customer}
            subtitle={row.code}
            underline
          />
        ),
      },
      {
        id: "service",
        header: "Service / Item",
        className: "min-w-[140px] max-w-[180px]",
        cell: (row) => row.service,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px] max-w-[140px]",
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
        id: "rate",
        header: "Rate",
        className: "min-w-[90px] max-w-[110px]",
        cell: (row) => row.rate,
      },
      {
        id: "unit",
        header: "Unit",
        className: "hidden min-w-[90px] max-w-[110px] md:table-cell",
        cell: (row) => row.unit,
      },
      {
        id: "effective",
        header: "Effective",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.effective,
      },
      {
        id: "expires",
        header: "Expires",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.expires,
      },
      {
        id: "owner",
        header: "Owner",
        className: "hidden min-w-[110px] max-w-[140px] xl:table-cell",
        cell: (row) => row.owner,
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "edit",
                label: "Edit Rate",
                onSelect: () => router.push(`/crm/pricing-rules/${row.id}/edit`),
              },
              {
                id: "dup",
                label: "Duplicate Rule",
                onSelect: () => void handleDuplicate(row.id),
              },
              { id: "history", label: "View History", onSelect: () => void handleViewHistory(row.id, row.customer) },
              {
                id: "delete",
                label: "Delete Rule",
                destructive: true,
                onSelect: () => void handleDelete(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  const bulkOpen = selectedIds.length > 0;

  return (
    <CrmListLoadGate loading={loading} hasData={!initialLoading} kpiCount={4}>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
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
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
                onClick={() => void handleBulkDelete()}
              >
                Delete
              </DashboardToolbarButton>
              <DashboardToolbarButton
                onClick={() => {
                  void (async () => {
                    try {
                      await Promise.all(
                        selectedIds.map((id) =>
                          crmApi.updatePricingRule(id, { status: "ACTIVE" }),
                        ),
                      );
                      toastSuccess("Status set to Active");
                      setSelectedIds([]);
                      reload();
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                }}
              >
                Set Status
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  {
                    id: "csv",
                    label: "Export selected • CSV",
                    onSelect: () => void runExport({ selectedOnly: true }),
                  },
                  {
                    id: "all",
                    label: "Export all • CSV",
                    onSelect: () => void runExport(),
                  },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx", selectedOnly: true }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf", selectedOnly: true }),
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
              placeholder="Search Pricing Rules"
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
              <DashboardSortMenu
                options={PRICING_SORT_OPTIONS}
                field={sortField}
                direction={sortDir}
                onFieldChange={setSortField}
                onDirectionChange={setSortDir}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                leftIcon={<ClipboardIcon className="shrink-0" />}
                onClick={() => setSavedViewsOpen(true)}
              >
                Payroll Review
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void runExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx" }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf" }),
                  },
                ]}
              />
            </>
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage="No pricing rules found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/pricing-rules/${row.id}/edit`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Rate Change History"
              trailing={countTrailing("0 Rate Changes")}
            />
          </div>
          <div className="pb-2">
            {([] as { id: string; label: string; from: string; to: string }[]).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </span>
                <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em]">
                  <span className="text-[#959597] line-through">{item.from}</span>
                  <span className="mx-1.5 text-[#959597]">→</span>
                  <span className="font-[510] text-[#FDFDFF]">{item.to}</span>
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Schedule Changes"
              trailing={countTrailing("0 Changes")}
            />
          </div>
          <div className="pb-2">
            {([] as { id: string; customer: string; effective: string }[]).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                  {item.customer}
                </span>
                <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Effective {item.effective}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Permission Gate"
            trailing={countTrailing("0 Permission Gates")}
          />
        </div>
        <div className="pb-2">
          {([] as { id: string; customer: string; status: { label: string; variant: "success" | "warning" | "offline" } }[]).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
            >
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                {item.customer}
              </span>
              <DashboardBadge
                variant={item.status.variant}
                pill
                className="shrink-0"
              >
                {item.status.label}
              </DashboardBadge>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <PricingFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_PRICING_FILTERS);
          setAppliedFilters(DEFAULT_PRICING_FILTERS);
          setFiltersApplied(false);
        }}
        customerOptions={customers}
        serviceOptions={serviceOptions}
        rateTypeOptions={rateTypeOptions}
        statusOptions={statusOptions}
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
        onSaveNewView={() => setSaveNewOpen(true)}
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
        open={saveNewOpen}
        onClose={() => setSaveNewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />

      <CrmHistoryModal
        open={historyOpen}
        title={historyTitle}
        events={historyEvents}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
    </CrmListLoadGate>
  );
}
