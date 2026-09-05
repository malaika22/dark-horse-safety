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
import { mapRequirementRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { REQUIREMENTS_KPI_SHELL, REQUIREMENTS_SORT_OPTIONS } from "./crm-constants";
import type { RequirementRow } from "./crm-types";

type AffectedTech = { id: string; name: string; role: string };
type AffectedWo = { id: string; workOrder: string; priority: string };
type AffectedWell = {
  id: string;
  label: string;
  status: { label: string; variant: "success" | "warning" | "error" | "offline" | "neutral" };
};

function wellStatusBadge(status: string): AffectedWell["status"] {
  const upper = status.toUpperCase();
  if (upper.includes("ACTIVE") || upper === "OK") {
    return { label: status, variant: "success" };
  }
  if (upper.includes("WARN") || upper.includes("PENDING")) {
    return { label: status, variant: "warning" };
  }
  if (upper.includes("BLOCK") || upper.includes("INACTIVE") || upper.includes("FAIL")) {
    return { label: status, variant: "error" };
  }
  return { label: status || "—", variant: "neutral" };
}

type RequirementFilters = {
  customer: string;
  requirementType: string;
  enforcement: string;
  status: string;
};

const DEFAULT_FILTERS: RequirementFilters = {
  customer: "",
  requirementType: "",
  enforcement: "",
  status: "",
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

function RequirementsFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  typeOptions,
  enforcementOptions,
  statusOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: RequirementFilters;
  onChange: (f: RequirementFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  enforcementOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<RequirementFilters>) {
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
            label="Requirement Type"
            value={value.requirementType}
            options={typeOptions}
            onChange={(v) => patch({ requirementType: v })}
          />
          <FilterSelectRow
            label="Enforcement"
            value={value.enforcement}
            options={enforcementOptions}
            onChange={(v) => patch({ enforcement: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={statusOptions}
            onChange={(v) => patch({ status: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
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


function countTrailing(label: string) {
  return (
    <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
      {label}
    </span>
  );
}

function WidgetRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
      <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
        {left}
      </span>
      <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {right}
      </span>
    </div>
  );
}

export function RequirementsPage() {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDir, setSortDir] = React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<RequirementFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<RequirementFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen, setSaveNewOpen] = React.useState(false);
  const [affectedTechs, setAffectedTechs] = React.useState<AffectedTech[]>([]);
  const [affectedWos, setAffectedWos] = React.useState<AffectedWo[]>([]);
  const [affectedWells, setAffectedWells] = React.useState<AffectedWell[]>([]);
  const [affectedFocusLabel, setAffectedFocusLabel] = React.useState<string | null>(
    null,
  );
  const [enforcementItems, setEnforcementItems] = React.useState<
    { id: string; label: string; rate: string }[]
  >([]);
  const [blockedBy, setBlockedBy] = React.useState<
    { id: string; name: string; initials: string }[]
  >([]);
  const [blockedProcesses, setBlockedProcesses] = React.useState<string[]>([]);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("REQUIREMENTS");

  const { lookups, customers } = useCrmLookups({ includeLocations: false });
  const typeOptions = lookupOptions(lookups, "requirementTypes");
  const enforcementOptions = lookupOptions(lookups, "enforcementLevels");
  const statusOptions = lookupOptions(lookups, "requirementStatuses");

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.requirementType)
      params.requirementType = appliedFilters.requirementType;
    if (appliedFilters.enforcement)
      params.enforcementLevel = appliedFilters.enforcement;
    if (appliedFilters.status) params.status = appliedFilters.status;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listRequirements(p),
    mapRow: mapRequirementRow,
    kpi: () => crmApi.requirementsKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDir,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(REQUIREMENTS_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDir, pageSize, filtersApplied]);

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
      filters?: RequirementFilters;
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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.requirementsAffectedSummary();
        if (cancelled) return;
        const techs = res.data.technicians ?? [];
        const wos = res.data.workOrders ?? [];
        setAffectedTechs(techs);
        setAffectedWos(wos);
        setAffectedWells(
          (res.data.statusWells ?? []).map((w) => ({
            id: w.id,
            label: w.label,
            status: {
              label: w.status?.label ?? "—",
              variant: (w.status?.variant as AffectedWell["status"]["variant"]) ?? "neutral",
            },
          })),
        );
        setAffectedFocusLabel(null);
        setBlockedBy(
          techs.map((t) => ({
            id: t.id,
            name: t.name,
            initials: t.name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          })),
        );
        setBlockedProcesses(
          Array.from(new Set(wos.map((w) => w.priority || "Work Order"))),
        );
      } catch (err) {
        if (!cancelled) toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.enforcementLevel || "—";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const totalRows = rows.length || 1;
    setEnforcementItems(
      Array.from(counts.entries()).map(([label, count]) => ({
        id: label,
        label: label.replace(/_/g, " "),
        rate: `${Math.round((count / totalRows) * 100)}%`,
      })),
    );
  }, [rows]);

  React.useEffect(() => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const row = rows.find((r) => r.id === id);
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.requirementAffected(id);
        if (cancelled) return;
        const techs = res.data.technicians ?? [];
        const wos = res.data.workOrders ?? [];
        setAffectedTechs(techs);
        setAffectedWos(wos);
        setAffectedFocusLabel(row?.requirement ?? row?.code ?? id);
        setBlockedBy(
          techs.map((t) => ({
            id: t.id,
            name: t.name,
            initials: t.name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          })),
        );
        setBlockedProcesses(
          Array.from(new Set(wos.map((w) => w.priority || "Work Order"))),
        );
      } catch (err) {
        if (!cancelled) toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIds, rows]);

  async function runExport(opts?: {
    format?: "csv" | "pdf" | "xlsx";
    selectedOnly?: boolean;
  }) {
    try {
      if (opts?.selectedOnly && selectedIds.length === 0) {
        toastApiError(new Error("Select at least one requirement to export"));
        return;
      }
      const format = opts?.format ?? "csv";
      const res = await crmApi.exportRequirements({
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

  async function handleArchive(id: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this requirement?")
    ) {
      return;
    }
    try {
      await crmApi.archiveRequirement(id);
      toastSuccess("Requirement deleted");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete ${selectedIds.length} requirement(s)?`)
    ) {
      return;
    }
    try {
      await crmApi.bulkDeleteRequirements(selectedIds);
      toastSuccess("Requirements deleted");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleEnforcementLevel(id: string) {
    const useSoft =
      typeof window === "undefined" ||
      window.confirm(
        "Set enforcement to SOFT_GATE?\n\nOK = SOFT_GATE, Cancel = ACTIVE",
      );
    try {
      await crmApi.updateRequirement(id, {
        enforcementLevel: useSoft ? "SOFT_GATE" : "ACTIVE",
      });
      toastSuccess(
        useSoft ? "Enforcement set to SOFT_GATE" : "Enforcement set to ACTIVE",
      );
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleViewAffected(id: string, label: string, focus: "techs" | "wo") {
    try {
      const res = await crmApi.requirementAffected(id);
      const techs = res.data.technicians ?? [];
      const wos = res.data.workOrders ?? [];
      setAffectedTechs(techs);
      setAffectedWos(wos);
      setAffectedFocusLabel(label);
      setBlockedBy(
        techs.map((t) => ({
          id: t.id,
          name: t.name,
          initials: t.name
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        })),
      );
      setBlockedProcesses(
        Array.from(new Set(wos.map((w) => w.priority || "Work Order"))),
      );
      const techCount = techs.length;
      const woCount = wos.length;
      toastSuccess(
        focus === "techs"
          ? `${techCount} technician(s) affected · ${label}`
          : `${woCount} work order(s) affected · ${label}`,
      );
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns: DashboardDataTableColumn<RequirementRow>[] = React.useMemo(
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
        id: "requirement",
        header: "Requirement",
        className: "min-w-[140px] max-w-[180px]",
        cell: (row) => row.requirement,
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
        id: "type",
        header: "Type",
        className: "hidden min-w-[100px] max-w-[130px] md:table-cell",
        cell: (row) => row.type,
      },
      {
        id: "owner",
        header: "Owner",
        className: "hidden min-w-[110px] max-w-[140px] md:table-cell",
        cell: (row) => row.owner,
      },
      {
        id: "due",
        header: "Due",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.due,
      },
      {
        id: "review",
        header: "Review",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.review.variant}
            pill
            className="max-w-full"
          >
            {row.review.label}
          </DashboardBadge>
        ),
      },
      {
        id: "docs",
        header: "Docs",
        className: "hidden min-w-[110px] max-w-[140px] xl:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.docs.variant}
            pill
            className="max-w-full"
          >
            {row.docs.label}
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
                id: "edit",
                label: "Edit Requirement",
                onSelect: () =>
                  router.push(`/crm/requirements/${row.id}/edit`),
              },
              {
                id: "techs",
                label: "View Affected Technicians",
                onSelect: () =>
                  void handleViewAffected(row.id, row.requirement, "techs"),
              },
              {
                id: "wo",
                label: "View Affected Work Orders",
                onSelect: () =>
                  void handleViewAffected(row.id, row.requirement, "wo"),
              },
              {
                id: "level",
                label: "Change Enforcement Level",
                onSelect: () => void handleEnforcementLevel(row.id),
              },
              {
                id: "delete",
                label: "Delete",
                destructive: true,
                onSelect: () => void handleArchive(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

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
                          crmApi.updateRequirement(id, { status: "ACTIVE" }),
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
              placeholder="Search Requirements"
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
                options={REQUIREMENTS_SORT_OPTIONS}
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
        emptyMessage="No requirements found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/requirements/${row.id}/edit`)}
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
              title="Affected Technicians"
              trailing={countTrailing(
                affectedFocusLabel
                  ? `${affectedTechs.length} Technicians · ${affectedFocusLabel}`
                  : `${affectedTechs.length} Technicians`,
              )}
            />
          </div>
          <div className="pb-2">
            {affectedTechs.length === 0 ? (
              <p className="px-4 py-2.5 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No affected technicians
              </p>
            ) : (
              affectedTechs.map((item) => (
                <WidgetRow
                  key={item.id}
                  left={item.name}
                  right={item.role}
                />
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Affected Work Orders"
              trailing={countTrailing(
                affectedFocusLabel
                  ? `${affectedWos.length} Work Orders · ${affectedFocusLabel}`
                  : `${affectedWos.length} Work Orders`,
              )}
            />
          </div>
          <div className="pb-2">
            {affectedWos.length === 0 ? (
              <p className="px-4 py-2.5 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No affected work orders
              </p>
            ) : (
              affectedWos.map((item) => (
                <WidgetRow
                  key={item.id}
                  left={item.workOrder}
                  right={item.priority}
                />
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Requirement Status"
              trailing={countTrailing(
                `${affectedWells.length} Wells · ${affectedWells.filter((w) => w.status.variant === "success").length} Active`,
              )}
            />
          </div>
          <div className="pb-2">
            {affectedWells.length === 0 ? (
              <p className="px-4 py-2.5 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No wells
              </p>
            ) : (
              affectedWells.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                    {item.label}
                  </span>
                  <DashboardBadge
                    variant={item.status.variant}
                    pill
                    className="shrink-0"
                  >
                    {item.status.label}
                  </DashboardBadge>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Enforcement Level"
              trailing={countTrailing(
                `${enforcementItems.length} Active Rules`,
              )}
            />
          </div>
          <div className="pb-2">
            {enforcementItems.length === 0 ? (
              <p className="px-4 py-2.5 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No enforcement data
              </p>
            ) : (
              enforcementItems.map((item) => (
                <WidgetRow
                  key={item.id}
                  left={item.label}
                  right={item.rate}
                />
              ))
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Who Does This Block?"
            trailing={countTrailing(
              `${blockedBy.length} People · ${blockedProcesses.length} Processes`,
            )}
          />
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <ul className="flex list-none flex-col gap-3">
            {blockedBy.length === 0 ? (
              <li className="font-sans text-[11px] uppercase text-[#959597]">
                No people blocked
              </li>
            ) : (
              blockedBy.map((person) => (
                <li key={person.id} className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {person.initials}
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {person.name}
                  </span>
                </li>
              ))
            )}
          </ul>
          <ul className="flex list-none flex-col gap-3 sm:items-end">
            {blockedProcesses.length === 0 ? (
              <li className="font-sans text-[11px] uppercase text-[#959597]">
                No processes
              </li>
            ) : (
              blockedProcesses.map((process) => (
                <li
                  key={process}
                  className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                >
                  {process}
                </li>
              ))
            )}
          </ul>
        </div>
      </DashboardPanel>

      <RequirementsFiltersDrawer
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
        customerOptions={customers}
        typeOptions={typeOptions}
        enforcementOptions={enforcementOptions}
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
    </div>
    </CrmListLoadGate>
  );
}
