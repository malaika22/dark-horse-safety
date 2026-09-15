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
  useScrollLock,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  downloadCsv,
  downloadPdf,
  downloadXlsx,
  type CrmSalesActivitySummary,
  type CrmTask,
} from "@/lib/crm-api";
import { mapSalesActivityRow } from "@/lib/crm-mappers";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmListEmptyState } from "@/features/crm/crm-states";
import { SALES_KPI_SHELL, SALES_SORT_OPTIONS } from "./crm-constants";
import type { SalesActivityRow } from "./crm-types";
import {
  CreateTaskModal,
  TaskCreatedSuccessModal,
  type CreateTaskFormPayload,
} from "./create-task-modals";
import { TaskDetailsDrawer } from "./task-details-drawer";

type SalesFilters = {
  type: string;
  repId: string;
  customerId: string;
  from: string;
  to: string;
  hasLinkedQuote: boolean;
  outcome: string;
  followUpStatus: string;
  hasExpenseLogged: boolean;
  locationId: string;
};

const DEFAULT_FILTERS: SalesFilters = {
  type: "",
  repId: "",
  customerId: "",
  from: "",
  to: "",
  hasLinkedQuote: false,
  outcome: "",
  followUpStatus: "",
  hasExpenseLogged: false,
  locationId: "",
};

function filtersAreActive(f: SalesFilters) {
  return Boolean(
    f.type ||
      f.repId ||
      f.customerId ||
      f.from ||
      f.to ||
      f.hasLinkedQuote ||
      f.outcome ||
      f.followUpStatus ||
      f.hasExpenseLogged ||
      f.locationId,
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
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
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
            <option value="">{placeholder ?? ""}</option>
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
      {hint ? (
        <p className="font-sans text-[9px] uppercase tracking-[-0.02em] text-[#959597]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FilterToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform ${
            checked ? "translate-x-4 bg-[#1A1A1A]" : "bg-[#959597]"
          }`}
        />
      </button>
    </div>
  );
}

function FilterDateRangeRow({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const inputClass =
    "h-8 w-full rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";
  return (
    <div className="space-y-1.5">
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        Date
      </p>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className={inputClass}
          aria-label="Start date"
        />
        <span className="shrink-0 font-sans text-[12px] text-[#FDFDFF]" aria-hidden>
          –
        </span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={inputClass}
          aria-label="End date"
        />
      </div>
    </div>
  );
}

function chipsFromFilters(
  f: SalesFilters,
  opts: {
    types: { value: string; label: string }[];
    reps: { value: string; label: string }[];
    customers: { value: string; label: string }[];
    locations: { value: string; label: string }[];
    outcomes: { value: string; label: string }[];
    followUpStatuses: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.type) chips.push({ id: "type", label: optionLabel(opts.types, f.type) });
  if (f.repId) chips.push({ id: "rep", label: optionLabel(opts.reps, f.repId) });
  if (f.customerId)
    chips.push({
      id: "customer",
      label: optionLabel(opts.customers, f.customerId),
    });
  if (f.from || f.to) {
    chips.push({
      id: "dates",
      label: `${f.from || "…"} – ${f.to || "…"}`,
    });
  }
  if (f.hasLinkedQuote) chips.push({ id: "hasLinkedQuote", label: "Has Linked Quote" });
  if (f.outcome)
    chips.push({
      id: "outcome",
      label: optionLabel(opts.outcomes, f.outcome),
    });
  if (f.followUpStatus)
    chips.push({
      id: "followUpStatus",
      label: optionLabel(opts.followUpStatuses, f.followUpStatus),
    });
  if (f.hasExpenseLogged)
    chips.push({ id: "hasExpenseLogged", label: "Has Expense Logged" });
  if (f.locationId)
    chips.push({
      id: "location",
      label: optionLabel(opts.locations, f.locationId),
    });
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
  repOptions,
  customerOptions,
  locationOptions,
  outcomeOptions,
  followUpStatusOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: SalesFilters;
  onChange: (f: SalesFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  typeOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
  customerOptions: { value: string; label: string }[];
  locationOptions: { value: string; label: string }[];
  outcomeOptions: { value: string; label: string }[];
  followUpStatusOptions: { value: string; label: string }[];
}) {
  useScrollLock(open);
  function patch(p: Partial<SalesFilters>) {
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
            label="Type"
            value={value.type}
            options={typeOptions}
            placeholder="All Types"
            onChange={(v) => patch({ type: v })}
          />
          <FilterSelectRow
            label="Rep"
            value={value.repId}
            options={repOptions}
            placeholder="All Reps"
            onChange={(v) => patch({ repId: v })}
          />
          <FilterSelectRow
            label="Customer"
            value={value.customerId}
            options={customerOptions}
            placeholder="All Customers"
            onChange={(v) => patch({ customerId: v, locationId: "" })}
          />
          <FilterDateRangeRow
            from={value.from}
            to={value.to}
            onFromChange={(v) => patch({ from: v })}
            onToChange={(v) => patch({ to: v })}
          />
          <FilterToggleRow
            label="Has Linked Quote?"
            checked={value.hasLinkedQuote}
            onCheckedChange={(v) => patch({ hasLinkedQuote: v })}
          />
          <FilterSelectRow
            label="Outcome"
            value={value.outcome}
            options={outcomeOptions}
            placeholder="Any Outcome"
            onChange={(v) => patch({ outcome: v })}
          />
          <FilterSelectRow
            label="Follow-up Status"
            value={value.followUpStatus}
            options={followUpStatusOptions}
            placeholder="Any Status"
            hint="Options: None · Open · Overdue · Done."
            onChange={(v) => patch({ followUpStatus: v })}
          />
          <FilterToggleRow
            label="Has Expense Logged?"
            checked={value.hasExpenseLogged}
            onCheckedChange={(v) => patch({ hasExpenseLogged: v })}
          />
          <FilterSelectRow
            label="Location"
            value={value.locationId}
            options={locationOptions}
            placeholder="All Locations"
            hint="Populated from the selected customer's sites."
            onChange={(v) => patch({ locationId: v })}
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

function combineDueAt(date: string, time: string) {
  const t = time || "10:00";
  return new Date(`${date}T${t}:00`).toISOString();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function SalesActivityPage() {
  const router = useRouter();
  const { askConfirm, dialogs } = useCrmDialogs();
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
  const [openTasks, setOpenTasks] = React.useState<CrmTask[]>([]);
  const [taskTotal, setTaskTotal] = React.useState(0);
  const [taskPage, setTaskPage] = React.useState(1);
  const [taskPageSize, setTaskPageSize] = React.useState(25);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [taskDrawerId, setTaskDrawerId] = React.useState<string | null>(null);
  const [createTaskFor, setCreateTaskFor] =
    React.useState<SalesActivityRow | null>(null);
  const [createTaskBusy, setCreateTaskBusy] = React.useState(false);
  const [createdTask, setCreatedTask] = React.useState<CrmTask | null>(null);
  const [tasksReloadKey, setTasksReloadKey] = React.useState(0);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("SALES_ACTIVITIES");

  const { lookups, reps, customers, reloadEntities } = useCrmLookups({
    includeLocations: false,
  });
  const [locationOptions, setLocationOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const typeOptions = lookupOptions(lookups, "salesActivityTypes");
  const outcomeOptions = lookupOptions(lookups, "activityOutcomes");
  const followUpStatusOptions = lookupOptions(lookups, "followUpStatuses");

  React.useEffect(() => {
    const customerId = draftFilters.customerId || appliedFilters.customerId;
    if (!customerId) {
      setLocationOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await reloadEntities({ customerId });
        const res = await crmApi.lookupLocations(undefined, customerId);
        if (cancelled) return;
        setLocationOptions(
          (res.data ?? []).map((l) => ({
            value: l.id,
            label: l.code ? `${l.name} (${l.code})` : l.name,
          })),
        );
      } catch {
        if (!cancelled) setLocationOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftFilters.customerId, appliedFilters.customerId, reloadEntities]);

  const chips = React.useMemo(
    () =>
      filtersApplied
        ? chipsFromFilters(appliedFilters, {
            types: typeOptions,
            reps,
            customers,
            locations: locationOptions,
            outcomes: outcomeOptions,
            followUpStatuses: followUpStatusOptions,
          })
        : [],
    [
      appliedFilters,
      filtersApplied,
      reps,
      typeOptions,
      customers,
      locationOptions,
      outcomeOptions,
      followUpStatusOptions,
    ],
  );

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.type) params.type = appliedFilters.type;
    if (appliedFilters.repId) params.repId = appliedFilters.repId;
    if (appliedFilters.customerId) params.customerId = appliedFilters.customerId;
    if (appliedFilters.from) params.from = appliedFilters.from;
    if (appliedFilters.to) params.to = appliedFilters.to;
    if (appliedFilters.outcome) params.outcome = appliedFilters.outcome;
    if (appliedFilters.followUpStatus)
      params.followUpStatus = appliedFilters.followUpStatus;
    if (appliedFilters.locationId) params.locationId = appliedFilters.locationId;
    if (appliedFilters.hasLinkedQuote) params.hasLinkedQuote = true;
    if (appliedFilters.hasExpenseLogged) params.hasExpenseLogged = true;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, error, reload } = useCrmList({
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

  const [summary, setSummary] = React.useState<CrmSalesActivitySummary | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] = React.useState(false);

  React.useEffect(() => {
    if (tab !== "summary") return;
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      try {
        const res = await crmApi.salesActivitiesSummary();
        if (!cancelled) setSummary(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, tasksReloadKey]);

  React.useEffect(() => {
    if (tab !== "activity") return;
    let cancelled = false;
    (async () => {
      setTasksLoading(true);
      try {
        const res = await crmApi.listTasks({
          page: taskPage,
          pageSize: taskPageSize,
          sort: "dueAt",
          direction: "asc",
          status: "OPEN",
        });
        if (cancelled) return;
        setOpenTasks(res.data.items ?? []);
        setTaskTotal(res.data.total ?? 0);
      } catch {
        if (!cancelled) {
          setOpenTasks([]);
          setTaskTotal(0);
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tasksReloadKey, tab, taskPage, taskPageSize]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const taskPageCount = Math.max(1, Math.ceil(taskTotal / taskPageSize) || 1);
  const safeTaskPage = Math.min(taskPage, taskPageCount);
  const activityTasks = summary?.tasks ?? [];

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDirection, pageSize, filtersApplied, appliedFilters]);

  React.useEffect(() => {
    setTaskPage(1);
  }, [taskPageSize]);

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
      setFiltersApplied(p.filtersApplied ?? filtersAreActive(nextFilters));
    } else if (typeof p.filtersApplied === "boolean") {
      setFiltersApplied(p.filtersApplied);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  function clearChip(id: string) {
    const next = { ...appliedFilters };
    if (id === "type") next.type = "";
    if (id === "rep") next.repId = "";
    if (id === "customer") {
      next.customerId = "";
      next.locationId = "";
    }
    if (id === "dates") {
      next.from = "";
      next.to = "";
    }
    if (id === "hasLinkedQuote") next.hasLinkedQuote = false;
    if (id === "outcome") next.outcome = "";
    if (id === "followUpStatus") next.followUpStatus = "";
    if (id === "hasExpenseLogged") next.hasExpenseLogged = false;
    if (id === "location") next.locationId = "";
    setAppliedFilters(next);
    setDraftFilters(next);
    setFiltersApplied(filtersAreActive(next));
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

  async function handleDeleteActivity(row: SalesActivityRow) {
    const ok = await askConfirm({
      title: "Delete activity?",
      description: `Archive ${row.activityId}? This removes it from the list.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveSalesActivity(row.id);
      toastSuccess("Activity deleted");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleCreateTask(payload: CreateTaskFormPayload) {
    if (!createTaskFor) return;
    setCreateTaskBusy(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentFileName: string | undefined;
      if (payload.file) {
        const contentBase64 = await fileToBase64(payload.file);
        const uploaded = await crmApi.uploadFile({
          folder: "crm-tasks",
          fileName: payload.file.name,
          mimeType: payload.file.type || undefined,
          contentBase64,
        });
        attachmentUrl = uploaded.data.url;
        attachmentFileName = uploaded.data.fileName;
      }
      const relatedParts = [
        createTaskFor.customer !== "—" ? createTaskFor.customer : null,
        createTaskFor.activityId,
        createTaskFor.linkedQuoteNumber,
      ].filter(Boolean);
      const res = await crmApi.createTask({
        taskType: payload.taskType.trim(),
        title: payload.notes.trim() || payload.taskType.trim(),
        priority: payload.priority,
        dueAt: combineDueAt(payload.dueDate, payload.dueTime),
        reminder: payload.reminder === "NONE" ? undefined : payload.reminder,
        notes: payload.notes.trim() || undefined,
        relatedLabel: payload.relatedTo.trim() || relatedParts.join(" · "),
        salesActivityId: createTaskFor.id,
        customerId: createTaskFor.customerId,
        quoteId: createTaskFor.linkedQuoteId,
        assigneeId: payload.assignedTo,
        attachmentUrl,
        attachmentFileName,
      });
      setCreateTaskFor(null);
      setCreatedTask(res.data);
      setTasksReloadKey((k) => k + 1);
      toastSuccess("Task created");
    } catch (err) {
      toastApiError(err);
    } finally {
      setCreateTaskBusy(false);
    }
  }

  function formatTaskListDue(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const date = d
      .toLocaleDateString("en-US", { month: "short", day: "numeric" })
      .toUpperCase();
    let h = d.getHours();
    const m = d.getMinutes();
    const am = h < 12;
    const h12 = h % 12 || 12;
    const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
    const hasTime = !(h === 0 && m === 0);
    return hasTime
      ? `Due ${date} ${h12}${mm}${am ? "A" : "P"}`
      : `Due ${date}`;
  }

  function taskListLabel(t: CrmTask) {
    const parts = [t.code, t.title];
    const place =
      t.customer?.name ||
      t.salesActivity?.subject ||
      (t.relatedLabel?.includes("·")
        ? t.relatedLabel.split("·")[0]?.trim()
        : null);
    if (place) parts.push(place);
    const due = formatTaskListDue(t.dueAt);
    if (due) parts.push(due);
    return parts.join(" · ");
  }

  function renderTasksList() {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-divider bg-panel px-4 py-4 sm:px-5 sm:py-5">
          <p className="mb-4 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Tasks List · {taskTotal}
          </p>
          {tasksLoading && openTasks.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">
              Loading tasks…
            </p>
          ) : openTasks.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">
              No open tasks
            </p>
          ) : (
            <ul className="divide-y divide-divider">
              {openTasks.map((t) => {
                const st = (t.displayStatus ?? t.status).toUpperCase();
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTaskDrawerId(t.id)}
                      className="flex w-full items-center justify-between gap-4 py-3 text-left transition-opacity first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="min-w-0 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 md:text-[13px]">
                        {taskListLabel(t)}
                      </span>
                      <DashboardBadge
                        variant={st === "OVERDUE" ? "error" : "neutral"}
                        pill
                        className="shrink-0"
                      >
                        {st}
                      </DashboardBadge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DashboardPagination
          page={safeTaskPage}
          pageSize={taskPageSize}
          total={taskTotal}
          onPageChange={setTaskPage}
          onPageSizeChange={setTaskPageSize}
        />
      </div>
    );
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
        id: "status",
        header: "Status",
        className: "min-w-[120px]",
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
              {
                id: "open",
                label: "Open Activity",
                onSelect: () => router.push(`/crm/sales/${row.id}`),
              },
              {
                id: "edit",
                label: "Edit",
                onSelect: () => router.push(`/crm/sales/${row.id}/edit`),
              },
              {
                id: "create-task",
                label: "Create Follow Up Task",
                onSelect: () => setCreateTaskFor(row),
              },
              {
                id: "quote",
                label: "Open Linked Quote",
                onSelect: () => {
                  if (row.linkedQuoteId) {
                    router.push(`/crm/quotes/${row.linkedQuoteId}`);
                  } else {
                    toastApiError(new Error("No linked quote on this activity"));
                  }
                },
              },
              {
                id: "customer",
                label: "Open Customer",
                onSelect: () => {
                  if (row.customerId) {
                    router.push(`/crm/customers/${row.customerId}`);
                  } else {
                    toastApiError(new Error("No customer on this activity"));
                  }
                },
              },
              {
                id: "delete",
                label: "Delete",
                destructive: true,
                onSelect: () => void handleDeleteActivity(row),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <CrmListLoadGate
      loading={loading}
      hasData={!initialLoading}
      error={error}
      onRetry={reload}
      kpiCount={5}
    >
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
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
            className={`rounded-full px-3.5 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
              tab === t.id
                ? "bg-[#FDFDFF] text-[#0D0D0D]"
                : "bg-transparent text-[#959597] hover:text-[#FDFDFF]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "activity" && bulkOpen ? (
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
      ) : tab === "activity" ? (
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
                onRemove={clearChip}
                onClearAll={() => {
                  setDraftFilters(DEFAULT_FILTERS);
                  setAppliedFilters(DEFAULT_FILTERS);
                  setFiltersApplied(false);
                }}
              />
            ) : null
          }
        />
      ) : null}

      {tab === "activity" ? (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            emptyMessage={
          <CrmListEmptyState
            query={query}
            filtersActive={Boolean(filtersApplied)}
            emptyDescription="Log your first sales activity to get started."
            createLabel="+ Log Activity"
            createHref="/crm/sales/new"
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
            onRowClick={(row) => router.push(`/crm/sales/${row.id}`)}
          />
          <DashboardPagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          {renderTasksList()}
        </>
      ) : (
        <div className="space-y-4">
          {summaryLoading && !summary ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">
              Loading summary…
            </p>
          ) : null}

          <div className="rounded-xl border border-divider bg-panel p-4 sm:p-5">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Activity by Rep & Type
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Rep", "Calls", "Visits", "Emails", "Meetings", "Total"].map(
                      (h) => (
                        <th
                          key={h}
                          className="pb-3 pr-3 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] first:pl-0"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(summary?.byRep ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 font-sans text-[12px] uppercase text-[#959597]"
                      >
                        No activity this week
                      </td>
                    </tr>
                  ) : (
                    summary!.byRep.map((row) => (
                      <tr key={row.repId ?? row.repName}>
                        <td className="py-2.5 pr-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                          {row.repName}
                        </td>
                        <td className="py-2.5 pr-3 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {row.calls}
                        </td>
                        <td className="py-2.5 pr-3 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {row.visits}
                        </td>
                        <td className="py-2.5 pr-3 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {row.emails}
                        </td>
                        <td className="py-2.5 pr-3 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {row.meetings}
                        </td>
                        <td className="py-2.5 font-sans text-[12px] font-[510] uppercase tabular-nums text-[#FDFDFF]">
                          {row.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-divider bg-panel p-4 sm:p-5">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Outcome Distribution
            </p>
            {(summary?.outcomes ?? []).length === 0 ? (
              <p className="font-sans text-[12px] uppercase text-[#959597]">
                No outcomes logged this week
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {summary!.outcomes.slice(0, 3).map((o) => {
                  const key = o.label.toUpperCase();
                  const tone =
                    key.includes("POSITIVE") || key.includes("WON")
                      ? {
                          box: "bg-[#3A1F1F]",
                          label: "text-[#E8A0A0]",
                        }
                      : key.includes("NO ANSWER") || key.includes("CALLBACK")
                        ? {
                            box: "bg-[#1A2A22]",
                            label: "text-[#9BC4A8]",
                          }
                        : {
                            box: "bg-[#1F2E24]",
                            label: "text-[#A8D4B5]",
                          };
                  return (
                    <div
                      key={o.label}
                      className={`rounded-xl px-4 py-4 ${tone.box}`}
                    >
                      <p
                        className={`font-sans text-[10px] uppercase tracking-[-0.02em] ${tone.label}`}
                      >
                        {o.label}
                      </p>
                      <p className="mt-2 font-sans text-[18px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[20px]">
                        {o.count} · {o.percent}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-divider bg-panel p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Follow-up Compliance
              </p>
              {summary ? (
                <span className="rounded-full bg-[#3A3218] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#E8C547]">
                  {summary.followUpCompliance.onTrack} of{" "}
                  {summary.followUpCompliance.total} on track ·{" "}
                  {summary.followUpCompliance.percent}%
                </span>
              ) : null}
            </div>
            <p className="mb-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {summary?.followUpCompliance.overdueCount
                ? `${summary.followUpCompliance.overdueCount} overdue follow-ups`
                : "No overdue follow-ups"}
            </p>
            <ul className="space-y-2">
              {(summary?.followUpCompliance.overdueItems ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/crm/sales/${item.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-[#161616] px-3 py-2.5 text-left transition-opacity hover:opacity-80"
                  >
                    <span className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
                      <span className="font-[510]">{item.activityCode}</span>
                      {item.customerName ? (
                        <>
                          {" "}
                          <span className="text-[#959597]">
                            {item.customerName}
                          </span>
                        </>
                      ) : null}
                      {item.subject ? (
                        <>
                          {" — "}
                          <span className="text-[#959597]">{item.subject}</span>
                        </>
                      ) : null}
                    </span>
                    <DashboardBadge variant="error" pill className="shrink-0">
                      {item.daysOverdue} day
                      {item.daysOverdue === 1 ? "" : "s"} overdue
                    </DashboardBadge>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-divider bg-panel p-4 sm:p-5">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Tasks List · {(summary?.tasks ?? activityTasks).length}
            </p>
            <ul className="divide-y divide-divider">
              {(summary?.tasks ?? activityTasks).length === 0 ? (
                <li className="font-sans text-[12px] uppercase text-[#959597]">
                  No open tasks
                </li>
              ) : (
                (summary?.tasks ?? activityTasks).map((t) => {
                  const st = (t.displayStatus ?? t.status).toUpperCase();
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setTaskDrawerId(t.id)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left transition-opacity first:pt-0 last:pb-0 hover:opacity-80"
                      >
                        <span className="min-w-0 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2">
                          {taskListLabel(t)}
                        </span>
                        <DashboardBadge
                          variant={st === "OVERDUE" ? "error" : "neutral"}
                          pill
                          className="shrink-0"
                        >
                          {st}
                        </DashboardBadge>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}

      <SalesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(filtersAreActive(draftFilters));
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setFiltersApplied(false);
        }}
        typeOptions={typeOptions}
        repOptions={reps}
        customerOptions={customers}
        locationOptions={locationOptions}
        outcomeOptions={outcomeOptions}
        followUpStatusOptions={followUpStatusOptions}
      />

      <CreateTaskModal
        open={Boolean(createTaskFor)}
        onClose={() => setCreateTaskFor(null)}
        busy={createTaskBusy}
        defaults={{
          relatedTo: createTaskFor
            ? [
                createTaskFor.customer !== "—" ? createTaskFor.customer : null,
                createTaskFor.activityId,
                createTaskFor.linkedQuoteNumber,
              ]
                .filter(Boolean)
                .join(" · ")
            : "",
          assignedTo: "",
          notes: "",
        }}
        reps={reps}
        onCreate={handleCreateTask}
      />

      <TaskCreatedSuccessModal
        open={Boolean(createdTask)}
        task={createdTask}
        onClose={() => setCreatedTask(null)}
        onCreateAnother={() => {
          const row = rows.find((r) => r.id === createdTask?.salesActivityId);
          setCreatedTask(null);
          if (row) setCreateTaskFor(row);
        }}
      />

      <TaskDetailsDrawer
        open={Boolean(taskDrawerId)}
        taskId={taskDrawerId}
        onClose={() => setTaskDrawerId(null)}
        onCompleted={() => setTasksReloadKey((k) => k + 1)}
      />

      {dialogs}

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
