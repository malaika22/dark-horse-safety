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
  useScrollLock,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapRequirementRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmListEmptyState } from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import { REQUIREMENTS_KPI_SHELL, REQUIREMENTS_SORT_OPTIONS } from "./crm-constants";
import type { RequirementRow } from "./crm-types";

type AffectedTech = {
  id: string;
  name: string;
  role: string;
  status: { label: string; variant: "success" | "warning" | "error" | "offline" | "neutral" };
};
type AffectedWo = {
  id: string;
  workOrder: string;
  subtitle?: string;
  blockedBy?: string | null;
};
type RequirementStatusItem = {
  id: string;
  label: string;
  count: number;
  variant: "success" | "warning" | "error" | "offline" | "neutral";
};
type EnforcementItem = {
  id: string;
  label: string;
  enforcement: { label: string; variant: "success" | "warning" | "error" | "offline" | "neutral" };
};
type BlockedTech = { id: string; name: string; fails: string };
type BlockedAction = {
  id: string;
  label: string;
  level: { label: string; variant: "success" | "warning" | "error" | "offline" | "neutral" };
};

function asBadgeVariant(
  value?: string,
): "success" | "warning" | "error" | "offline" | "neutral" {
  if (
    value === "success" ||
    value === "warning" ||
    value === "error" ||
    value === "offline" ||
    value === "neutral"
  ) {
    return value;
  }
  return "neutral";
}

function statusToneClass(
  variant: "success" | "warning" | "error" | "offline" | "neutral",
) {
  if (variant === "success") return "text-[#4ADE80]";
  if (variant === "error") return "text-[#FF6B7A]";
  if (variant === "warning") return "text-[#F5A623]";
  if (variant === "offline") return "text-[#F87171]";
  return "text-[#959597]";
}

function statusCountBadgeClass(
  variant: "success" | "warning" | "error" | "offline" | "neutral",
) {
  if (variant === "success") return "bg-[#1F3D2A] text-[#4ADE80]";
  if (variant === "error") return "bg-[#3D1F24] text-[#FF6B7A]";
  if (variant === "warning") return "bg-[#3D2F14] text-[#F5A623]";
  if (variant === "offline") return "bg-[#3D1F24] text-[#F87171]";
  return "bg-[#2A2A2A] text-[#959597]";
}

function statusDotClass(
  variant: "success" | "warning" | "error" | "offline" | "neutral",
) {
  if (variant === "success") return "bg-[#4ADE80]";
  if (variant === "error") return "bg-[#FF6B7A]";
  if (variant === "warning") return "bg-[#F5A623]";
  if (variant === "offline") return "bg-[#F87171]";
  return "bg-[#959597]";
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
  useScrollLock(open);
  function patch(p: Partial<RequirementFilters>) {
    onChange({ ...value, ...p });
  }

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-hidden">
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

function optionLabel(
  options: { value: string; label: string }[],
  value: string,
) {
  return options.find((o) => o.value === value)?.label ?? value;
}

function chipsFromFilters(
  f: RequirementFilters,
  opts: {
    customers: { value: string; label: string }[];
    types: { value: string; label: string }[];
    enforcement: { value: string; label: string }[];
    statuses: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.customer)
    chips.push({
      id: "customer",
      label: optionLabel(opts.customers, f.customer),
    });
  if (f.requirementType)
    chips.push({
      id: "requirementType",
      label: optionLabel(opts.types, f.requirementType),
    });
  if (f.enforcement)
    chips.push({
      id: "enforcement",
      label: optionLabel(opts.enforcement, f.enforcement),
    });
  if (f.status)
    chips.push({
      id: "status",
      label: optionLabel(opts.statuses, f.status),
    });
  return chips;
}

function countTrailing(label: string) {
  return (
    <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
      {label}
    </span>
  );
}

export function RequirementsPage() {
  const router = useRouter();
  const { askConfirm, askPick, askPrompt, dialogs } = useCrmDialogs();

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
  const [affectedFocusLabel, setAffectedFocusLabel] = React.useState<string | null>(
    null,
  );
  const [requirementStatusItems, setRequirementStatusItems] = React.useState<
    RequirementStatusItem[]
  >([]);
  const [requirementStatusTotal, setRequirementStatusTotal] = React.useState(0);
  const [enforcementItems, setEnforcementItems] = React.useState<EnforcementItem[]>(
    [],
  );
  const [blockedTechs, setBlockedTechs] = React.useState<BlockedTech[]>([]);
  const [blockedActions, setBlockedActions] = React.useState<BlockedAction[]>([]);
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
  const filterChips = React.useMemo(
    () =>
      filtersApplied
        ? chipsFromFilters(appliedFilters, {
            customers,
            types: typeOptions,
            enforcement: enforcementOptions,
            statuses: statusOptions,
          })
        : [],
    [
      appliedFilters,
      customers,
      enforcementOptions,
      filtersApplied,
      statusOptions,
      typeOptions,
    ],
  );

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

  const { rows, total, kpiData, loading, initialLoading, error, reload } = useCrmList({
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

  function applyAffectedPayload(
    data: {
      technicians?: {
        id: string;
        name: string;
        role: string;
        status?: { label: string; variant: string };
        fails?: string | null;
      }[];
      workOrders?: {
        id: string;
        workOrder: string;
        subtitle?: string;
        blockedBy?: string | null;
      }[];
      requirementStatus?: {
        id: string;
        label: string;
        count: number;
        variant: string;
      }[];
      enforcementItems?: {
        id: string;
        label: string;
        enforcement: { label: string; variant: string };
      }[];
      blockedTechnicians?: { id: string; name: string; fails: string }[];
      blockedActions?: {
        id: string;
        label: string;
        level: { label: string; variant: string };
      }[];
    },
    focusLabel: string | null,
  ) {
    const techs = (data.technicians ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      status: {
        label: t.status?.label ?? "MET",
        variant: asBadgeVariant(t.status?.variant ?? "success"),
      },
    }));
    setAffectedTechs(techs);
    setAffectedWos(
      (data.workOrders ?? []).map((w) => ({
        id: w.id,
        workOrder: w.workOrder,
        subtitle: w.subtitle,
        blockedBy: w.blockedBy,
      })),
    );
    const statusItems = (data.requirementStatus ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      count: s.count,
      variant: asBadgeVariant(s.variant),
    }));
    setRequirementStatusItems(statusItems);
    setRequirementStatusTotal(statusItems.reduce((sum, s) => sum + s.count, 0));
    setEnforcementItems(
      (data.enforcementItems ?? []).map((e) => ({
        id: e.id,
        label: e.label,
        enforcement: {
          label: e.enforcement.label,
          variant: asBadgeVariant(e.enforcement.variant),
        },
      })),
    );
    setBlockedTechs(data.blockedTechnicians ?? []);
    setBlockedActions(
      (data.blockedActions ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        level: {
          label: a.level.label,
          variant: asBadgeVariant(a.level.variant),
        },
      })),
    );
    setAffectedFocusLabel(focusLabel);
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.requirementsAffectedSummary();
        if (cancelled) return;
        applyAffectedPayload(res.data, null);
      } catch (err) {
        if (!cancelled) toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const row = rows.find((r) => r.id === id);
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.requirementAffected(id);
        if (cancelled) return;
        applyAffectedPayload(res.data, row?.requirement ?? row?.code ?? id);
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
    const ok = await askConfirm({
      title: "Remove requirement",
      description: "Remove this requirement? This cannot be undone.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveRequirement(id);
      toastSuccess("Requirement removed");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkDelete() {
    const ok = await askConfirm({
      title: "Remove requirements",
      description: `Remove ${selectedIds.length} requirement(s)? This cannot be undone.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.bulkDeleteRequirements(selectedIds);
      toastSuccess("Requirements removed");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleEnforcementLevel(id: string) {
    const level = await askPick({
      title: "Set enforcement level",
      label: "Enforcement",
      confirmLabel: "Apply",
      options: [
        { value: "HARD_GATE", label: "Hard gate" },
        { value: "SOFT_GATE", label: "Warning" },
        { value: "ADVISORY", label: "Informational" },
      ],
    });
    if (!level) return;
    try {
      await crmApi.updateRequirement(id, {
        enforcementLevel: level,
      });
      toastSuccess(`Enforcement set to ${level.replace(/_/g, " ")}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleUploadEvidence(row: RequirementRow) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          const contentBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
            reader.readAsDataURL(file);
          });
          const uploaded = await crmApi.uploadFile({
            folder: `requirements/${row.id}`,
            fileName: file.name,
            mimeType: file.type || undefined,
            contentBase64,
          });
          await crmApi.updateRequirement(row.id, {
            evidenceRequired: true,
            docsRequired: true,
            evidenceUrl: uploaded.data.url,
            status: "COMPLETE",
            notes: `Evidence file: ${file.name}`,
          });
          toastSuccess(`Evidence uploaded for ${row.requirement}`);
          reload();
        } catch (err) {
          toastApiError(err);
        }
      })();
    };
    input.click();
  }

  async function handleRequestFromCustomer(row: RequirementRow) {
    const ok = await askConfirm({
      title: "Request from customer",
      description: `Email ${row.customer} requesting evidence for "${row.requirement}"?`,
      confirmLabel: "Send request",
    });
    if (!ok) return;
    try {
      const res = await crmApi.requestRequirementEvidence(row.id);
      toastSuccess(
        res.data.to
          ? `Request emailed to ${res.data.to}`
          : `Request sent for ${row.customer}`,
      );
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  function handleOpenRequirement(row: RequirementRow) {
    setSelectedIds([row.id]);
    void handleViewAffected(row.id, row.requirement, "techs");
    requestAnimationFrame(() => {
      document
        .getElementById("requirements-affected-panels")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleViewAffected(id: string, label: string, focus: "techs" | "wo") {
    try {
      const res = await crmApi.requirementAffected(id);
      applyAffectedPayload(res.data, label);
      const techCount = res.data.technicians?.length ?? 0;
      const woCount = res.data.workOrders?.length ?? 0;
      toastSuccess(
        focus === "techs"
          ? `${techCount} technician(s) affected · ${label}`
          : `${woCount} blocked work order(s) · ${label}`,
      );
    } catch (err) {
      toastApiError(err);
    }
  }

  function requirementRowActions(row: RequirementRow) {
    return [
      {
        id: "open",
        label: "Open Requirement",
        onSelect: () => handleOpenRequirement(row),
      },
      {
        id: "edit",
        label: "Edit Requirement",
        onSelect: () => router.push(`/crm/requirements/${row.id}/edit`),
      },
      {
        id: "techs",
        label: "View Affected Technicians",
        onSelect: () =>
          void handleViewAffected(row.id, row.requirement, "techs"),
      },
      {
        id: "wo",
        label: "View Blocked Work Orders",
        onSelect: () => void handleViewAffected(row.id, row.requirement, "wo"),
      },
      {
        id: "level",
        label: "Change Enforcement Level",
        onSelect: () => void handleEnforcementLevel(row.id),
      },
      {
        id: "upload",
        label: "Upload Evidence",
        onSelect: () => void handleUploadEvidence(row),
      },
      {
        id: "request",
        label: "Request from Customer",
        onSelect: () => void handleRequestFromCustomer(row),
      },
      {
        id: "delete",
        label: "Remove Requirement",
        destructive: true,
        onSelect: () => void handleArchive(row.id),
      },
    ];
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
        header: "Responsible",
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
        id: "evidence",
        header: "Evidence",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.evidence.variant}
            pill
            className="max-w-full"
          >
            {row.evidence.label}
          </DashboardBadge>
        ),
      },
      {
        id: "enforcement",
        header: "Enforcement",
        className: "hidden min-w-[120px] max-w-[150px] xl:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.enforcement.variant}
            pill
            className="max-w-full"
          >
            {row.enforcement.label}
          </DashboardBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu items={requirementRowActions(row)} />
        ),
      },
    ],
    // handlers close over latest state via component scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, rows],
  );

  return (
    <CrmListLoadGate
      loading={loading}
      hasData={!initialLoading}
      error={error}
      onRetry={reload}
      kpiCount={4}
    >
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
              {`Filter${filterChips.length > 0 ? ` (${filterChips.length})` : ""}`}
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
          chips={
            filterChips.length > 0 ? (
              <DashboardFilterChips
                chips={filterChips}
                onRemove={(id) => {
                  const next = { ...appliedFilters };
                  if (id === "customer") next.customer = "";
                  if (id === "requirementType") next.requirementType = "";
                  if (id === "enforcement") next.enforcement = "";
                  if (id === "status") next.status = "";
                  setAppliedFilters(next);
                  setDraftFilters(next);
                  setFiltersApplied(
                    Object.values(next).some((v) => Boolean(v)),
                  );
                }}
                onClearAll={() => {
                  setAppliedFilters(DEFAULT_FILTERS);
                  setDraftFilters(DEFAULT_FILTERS);
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
        emptyMessage={
          <CrmListEmptyState
            query={query}
            filtersActive={Boolean(filtersApplied) || filterChips.length > 0}
            emptyDescription="Create your first requirement to get started."
            createLabel="+ New Requirement"
            createHref="/crm/requirements/new"
            onClearFilters={() => {
              setFiltersApplied(false);
              setDraftFilters(DEFAULT_FILTERS);
              setAppliedFilters(DEFAULT_FILTERS);
            }}
            onClearSearch={() => setQuery("")}
          />
        }
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <div
        id="requirements-affected-panels"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Affected Technicians"
              trailing={countTrailing(
                affectedFocusLabel
                  ? `${affectedTechs.length} Technicians · ${affectedFocusLabel}`
                  : `${affectedTechs.length} Technicians · ${affectedTechs.filter((t) => t.status.label === "MET").length} Meet`,
              )}
            />
          </div>
          <div className="divide-y divide-[#2D2D30] pb-1">
            {affectedTechs.length === 0 ? (
              <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No affected technicians
              </p>
            ) : (
              affectedTechs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                >
                  <p className="min-w-0 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {item.name}
                    <span className="text-[#959597]"> · {item.role}</span>
                  </p>
                  <span
                    className={`shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${statusToneClass(item.status.variant)}`}
                  >
                    {item.status.label}
                  </span>
                </div>
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
                  : `${affectedWos.filter((w) => w.blockedBy).length || affectedWos.length} Blocked`,
              )}
            />
          </div>
          <div className="divide-y divide-[#2D2D30] pb-1">
            {affectedWos.length === 0 ? (
              <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No affected work orders
              </p>
            ) : (
              affectedWos.map((item) => (
                <div key={item.id} className="px-4 py-3.5 sm:px-5">
                  <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {item.workOrder}
                  </p>
                  <p className="mt-1.5 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                    {[item.subtitle].filter(Boolean).join(" · ")}
                    {item.blockedBy ? (
                      <>
                        {(item.subtitle ? " · " : "") + "Blocked by: "}
                        <span className="font-[510] text-[#FF6B7A]">
                          {item.blockedBy}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
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
                `Across ${requirementStatusTotal || total} Requirements`,
              )}
            />
          </div>
          <div className="divide-y divide-[#2D2D30] pb-1">
            {requirementStatusItems.length === 0 ? (
              <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No status data
              </p>
            ) : (
              requirementStatusItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                >
                  <span className="min-w-0 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {item.label}
                  </span>
                  <span
                    className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 font-sans text-[11px] font-[510] tabular-nums tracking-[-0.02em] ${statusCountBadgeClass(item.variant)}`}
                  >
                    {item.count}
                  </span>
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
              trailing={countTrailing("Per Requirement")}
            />
          </div>
          <div className="divide-y divide-[#2D2D30] pb-1">
            {enforcementItems.length === 0 ? (
              <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
                No enforcement data
              </p>
            ) : (
              enforcementItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {item.label}
                  </span>
                  <span
                    className={`shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${statusToneClass(item.enforcement.variant)}`}
                  >
                    {item.enforcement.label}
                  </span>
                  <DashboardRowActionMenu
                    items={[
                      {
                        id: "open",
                        label: "Open Requirement",
                        onSelect: () => {
                          const row = rows.find((r) => r.id === item.id);
                          if (row) handleOpenRequirement(row);
                          else
                            router.push(`/crm/requirements/${item.id}/edit`);
                        },
                      },
                      {
                        id: "edit",
                        label: "Edit Requirement",
                        onSelect: () =>
                          router.push(`/crm/requirements/${item.id}/edit`),
                      },
                      {
                        id: "level",
                        label: "Change Enforcement Level",
                        onSelect: () => void handleEnforcementLevel(item.id),
                      },
                      {
                        id: "delete",
                        label: "Remove Requirement",
                        destructive: true,
                        onSelect: () => void handleArchive(item.id),
                      },
                    ]}
                  />
                </div>
              ))
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Who / What This Blocks"
            trailing={countTrailing(
              `${blockedTechs.length} Technicians · ${blockedActions.length} Actions`,
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 border-t border-[#2D2D30] px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
          <div>
            <p className="mb-3 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
              Blocked Technicians · {blockedTechs.length}
            </p>
            <ul className="flex list-none flex-col gap-3.5">
              {blockedTechs.length === 0 ? (
                <li className="font-sans text-[11px] uppercase text-[#959597]">
                  No technicians blocked
                </li>
              ) : (
                blockedTechs.map((person) => (
                  <li
                    key={person.id}
                    className="font-sans text-[12px] uppercase tracking-[-0.02em]"
                  >
                    <span className="text-[#FDFDFF]">{person.name}</span>
                    <span className="text-[#FF6B7A]">
                      {" "}
                      — {person.fails.replace(/^FAILS:\s*/i, "Fails: ")}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
              Blocked Actions · Derived from enforcement level
            </p>
            <ul className="flex list-none flex-col gap-3.5">
              {blockedActions.length === 0 ? (
                <li className="font-sans text-[11px] uppercase text-[#959597]">
                  No actions blocked
                </li>
              ) : (
                blockedActions.map((action) => (
                  <li
                    key={action.id}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(action.level.variant)}`}
                    />
                    <p className="min-w-0 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {action.label}
                      <span className="text-[#959597]"> · </span>
                      <span className={statusToneClass(action.level.variant)}>
                        {action.level.label}
                      </span>
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
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
      {dialogs}
    </div>
    </CrmListLoadGate>
  );
}
