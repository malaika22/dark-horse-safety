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
  DashboardMenuPopover,
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
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapEodReportRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmListEmptyState } from "@/features/crm/crm-states";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { EOD_KPI_SHELL, EOD_SORT_OPTIONS } from "./crm-constants";
import type { EodReportRow } from "./crm-types";
import {
  EodSendReminderModal,
  type EodAttentionItem,
} from "./eod-flow-modals";

function shortRepName(rep?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null) {
  if (!rep) return "—";
  const first = rep.firstName?.trim();
  const last = rep.lastName?.trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  return (first || last || rep.email || "—").toUpperCase();
}

function fmtAttentionDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

type EodFilters = {
  status: string;
  repId: string;
  dateFrom: string;
  dateTo: string;
  hasPipeline: boolean;
};

const DEFAULT_EOD_FILTERS: EodFilters = {
  status: "",
  repId: "",
  dateFrom: "",
  dateTo: "",
  hasPipeline: false,
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
          className="h-8 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
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

function FilterDateRangeRow({
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
  const inputClass =
    "h-8 min-w-0 flex-1 rounded-lg border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none [color-scheme:dark]";
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 max-w-[200px] flex-1 items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className={inputClass}
          aria-label="Date from"
        />
        <span className="shrink-0 font-sans text-[12px] text-[#FDFDFF]" aria-hidden>
          –
        </span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={inputClass}
          aria-label="Date to"
        />
      </div>
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
            checked
              ? "translate-x-4 bg-[#1A1A1A]"
              : "bg-[#959597]"
          }`}
        />
      </button>
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
  if (f.repId) {
    chips.push({ id: "rep", label: optionLabel(opts.reps, f.repId) });
  }
  if (f.status === "NEEDS_REVIEW" || f.status === "PENDING") {
    chips.push({ id: "exceptions", label: "Exceptions" });
  } else if (f.status) {
    chips.push({
      id: "status",
      label: optionLabel(opts.statuses, f.status),
    });
  }
  if (f.dateFrom || f.dateTo) {
    const from = f.dateFrom || "…";
    const to = f.dateTo || "…";
    chips.push({ id: "dates", label: `${from} – ${to}` });
  }
  if (f.hasPipeline) {
    chips.push({ id: "pipeline", label: "Has Pipeline" });
  }
  return chips;
}

function filtersAreActive(f: EodFilters) {
  return Boolean(
    f.status || f.repId || f.dateFrom || f.dateTo || f.hasPipeline,
  );
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
  useScrollLock(open);
  function patch(p: Partial<EodFilters>) {
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 scrollbar-hidden">
          <FilterSelectRow
            label="Rep"
            value={value.repId}
            options={repOptions}
            onChange={(v) => patch({ repId: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={statusOptions}
            onChange={(v) => patch({ status: v })}
          />
          <FilterDateRangeRow
            label="Date Range"
            from={value.dateFrom}
            to={value.dateTo}
            onFromChange={(v) => patch({ dateFrom: v })}
            onToChange={(v) => patch({ dateTo: v })}
          />
          <FilterToggleRow
            label="Has Pipeline Value?"
            checked={value.hasPipeline}
            onCheckedChange={(v) => patch({ hasPipeline: v })}
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

function AttentionPanel({
  items,
  onRemind,
  onView,
}: {
  items: {
    id: string;
    kind: "missing" | "late";
    date: string;
    rep: string;
    detail: string;
  }[];
  onRemind: (id: string) => void;
  onView: (id: string) => void;
}) {
  if (items.length === 0) return null;
  const missing = items.filter((i) => i.kind === "missing").length;
  const late = items.filter((i) => i.kind === "late").length;
  const summary = [
    missing ? `${missing} Missing` : null,
    late ? `${late} Late` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-xl border border-[#2D2D30] bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2D2D30] px-4 py-3 sm:px-5">
        <span className="text-[#E8C07A]" aria-hidden>
          ⚠
        </span>
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Needs Attention — Not Submitted
          {summary ? (
            <span className="text-[#959597]"> ({summary})</span>
          ) : null}
        </p>
      </div>
      <ul className="divide-y divide-[#2D2D30]">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <DashboardBadge
                variant={item.kind === "missing" ? "error" : "warning"}
                pill
              >
                {item.kind === "missing" ? "Missing" : "Late"}
              </DashboardBadge>
              <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {item.date}
              </span>
              <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {item.rep}
              </span>
              <span
                className={`font-sans text-[11px] uppercase tracking-[-0.02em] ${
                  item.kind === "missing" ? "text-[#FF6B6B]" : "text-[#959597]"
                }`}
              >
                {item.detail}
              </span>
            </div>
            {item.kind === "missing" ? (
              <DashboardToolbarButton
                variant="primary"
                onClick={() => onRemind(item.id)}
              >
                Remind
              </DashboardToolbarButton>
            ) : (
              <DashboardToolbarButton onClick={() => onView(item.id)}>
                View
              </DashboardToolbarButton>
            )}
          </li>
        ))}
      </ul>
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
  const [attention, setAttention] = React.useState<
    {
      id: string;
      kind: "missing" | "late";
      date: string;
      rep: string;
      detail: string;
    }[]
  >([]);
  const [reminderItems, setReminderItems] = React.useState<EodAttentionItem[]>(
    [],
  );
  const [sendReminderOpen, setSendReminderOpen] = React.useState(false);
  const [attentionTick, setAttentionTick] = React.useState(0);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("EOD_REPORTS");

  const remindMenuRef = React.useRef<HTMLButtonElement>(null);
  const [remindMenuOpen, setRemindMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listEodAttention();
        if (cancelled) return;
        const raw = res.data.items ?? [];
        setAttention(
          raw.map((r) => ({
            id: r.id,
            kind: r.kind,
            date: fmtAttentionDate(r.reportDate),
            rep: shortRepName(r.rep),
            detail: r.detail,
          })),
        );
        setReminderItems(
          raw.map((r) => ({
            id: r.id,
            kind: r.kind,
            repName: shortRepName(r.rep),
            dateLabel: fmtAttentionDate(r.reportDate),
            detail: r.detail,
            selectedByDefault: r.selectedByDefault !== false,
          })),
        );
      } catch {
        if (!cancelled) {
          setAttention([]);
          setReminderItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attentionTick]);

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
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.repId) params.repId = appliedFilters.repId;
    if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom;
    if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo;
    if (appliedFilters.hasPipeline) params.hasPipeline = true;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, error, reload } = useCrmList({
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
        p.filtersApplied ?? filtersAreActive(nextFilters),
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
      await crmApi.remindEodReport(id, { viaEmail: true, viaPush: true });
      toastSuccess("Reminder sent");
      reload();
      setAttentionTick((t) => t + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openSendReminderModal() {
    setAttentionTick((t) => t + 1);
    setSendReminderOpen(true);
  }

  async function handleSendReminderPayload(payload: {
    ids: string[];
    message: string;
    viaPush: boolean;
    viaEmail: boolean;
  }) {
    try {
      const res = await crmApi.bulkRemindEodReports(payload.ids, {
        message: payload.message,
        viaPush: payload.viaPush,
        viaEmail: payload.viaEmail,
      });
      toastSuccess(
        `Reminders sent to ${res.data.sent} rep${res.data.sent === 1 ? "" : "s"}`,
      );
      setSelectedIds([]);
      reload();
      setAttentionTick((t) => t + 1);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      await crmApi.acknowledgeEodReport(id, { by: "Manager" });
      toastSuccess("Report acknowledged");
      reload();
      setAttentionTick((t) => t + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkRemind() {
    try {
      const ids =
        selectedIds.length > 0
          ? selectedIds
          : attention.filter((a) => a.kind === "missing").map((a) => a.id);
      if (ids.length === 0) {
        toastApiError(new Error("No reports to remind"));
        return;
      }
      await crmApi.bulkRemindEodReports(ids, {
        viaEmail: true,
        viaPush: true,
      });
      toastSuccess("Reminders sent");
      setSelectedIds([]);
      reload();
      setAttentionTick((t) => t + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  function applyExceptionFilter() {
    const next: EodFilters = {
      ...appliedFilters,
      status: "PENDING",
    };
    setDraftFilters(next);
    setAppliedFilters(next);
    setFiltersApplied(true);
    toastSuccess("Showing exception reports");
  }

  function clearChip(id: string) {
    let next = { ...appliedFilters };
    if (id === "exceptions" || id === "status") {
      next = { ...next, status: "" };
    } else if (id === "rep") {
      next = { ...next, repId: "" };
    } else if (id === "dates") {
      next = { ...next, dateFrom: "", dateTo: "" };
    } else if (id === "pipeline") {
      next = { ...next, hasPipeline: false };
    }
    setAppliedFilters(next);
    setDraftFilters(next);
    setFiltersApplied(filtersAreActive(next));
  }

  useSetHeaderActions(
    <div className="relative">
      <DashboardToolbarButton
        ref={remindMenuRef}
        variant="primary"
        showChevron
        leftIcon={<ClockIcon className="shrink-0" />}
        onClick={() => setRemindMenuOpen((o) => !o)}
      >
        Send Reminder
      </DashboardToolbarButton>
      <DashboardMenuPopover
        open={remindMenuOpen}
        onClose={() => setRemindMenuOpen(false)}
        anchorRef={remindMenuRef}
        align="right"
        className="min-w-[220px]"
        items={[
          {
            id: "compose",
            label: "Open Reminder Composer",
            onSelect: () => void openSendReminderModal(),
          },
          {
            id: "missing",
            label: "Remind Missing Reports",
            onSelect: () => void handleBulkRemind(),
          },
          {
            id: "selected",
            label: "Remind Selected",
            onSelect: () => {
              if (selectedIds.length === 0) {
                toastApiError(new Error("Select reports first"));
                return;
              }
              void handleBulkRemind();
            },
          },
          {
            id: "exceptions",
            label: "Review Exceptions",
            onSelect: applyExceptionFilter,
          },
          {
            id: "views",
            label: "Saved Views",
            onSelect: () => setSavedViewsOpen(true),
          },
        ]}
      />
    </div>,
    [remindMenuOpen, selectedIds, attention, reminderItems],
  );

  const columns: DashboardDataTableColumn<EodReportRow>[] = React.useMemo(
    () => [
      {
        id: "reportId",
        header: "Report ID",
        className: "min-w-[120px] max-w-[160px]",
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
        className: "min-w-[72px]",
        cell: (row) => row.date,
      },
      {
        id: "rep",
        header: "Rep",
        className: "min-w-[88px]",
        cell: (row) => row.rep,
      },
      {
        id: "activities",
        header: "Activities",
        className: "min-w-[72px]",
        cell: (row) => row.activities,
      },
      {
        id: "calls",
        header: "Calls",
        className: "min-w-[56px] hidden md:table-cell",
        cell: (row) => row.calls,
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
        className: "min-w-[80px] hidden lg:table-cell",
        cell: (row) =>
          row.meetingsMissing ? (
            <span className="text-[#959597]">Missing</span>
          ) : (
            row.meetings
          ),
      },
      {
        id: "quotes",
        header: "Quotes",
        className: "min-w-[80px] hidden xl:table-cell",
        cell: (row) => row.quotesLabel,
      },
      {
        id: "pipeline",
        header: "Pipeline",
        className: "min-w-[72px] hidden xl:table-cell",
        cell: (row) => row.pipelineLabel,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[100px]",
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
        id: "reviewed",
        header: "Reviewed",
        className: "min-w-[140px] hidden lg:table-cell",
        cell: (row) =>
          row.reviewed.state === "reviewed" ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#4ADE80]">
              <span aria-hidden>✓</span>
              <span className="truncate">
                Reviewed{" "}
                <span className="text-[#959597]">{row.reviewed.detail}</span>
              </span>
            </span>
          ) : (
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Awaiting
            </span>
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
                    `/crm/sales?${new URLSearchParams({
                      ...(row.repId ? { repId: row.repId } : {}),
                      date: row.date,
                    }).toString()}`,
                  ),
              },
              {
                id: "reminder",
                label: "Send Reminder",
                onSelect: () => {
                  const match = reminderItems.find((i) => i.id === row.id);
                  setReminderItems((prev) => {
                    if (match) {
                      return prev.map((i) => ({
                        ...i,
                        selectedByDefault: i.id === row.id,
                      }));
                    }
                    return [
                      {
                        id: row.id,
                        kind: "missing" as const,
                        repName: row.rep,
                        dateLabel: row.date,
                        detail: row.submittedTime || "Needs reminder",
                        selectedByDefault: true,
                      },
                      ...prev.map((i) => ({
                        ...i,
                        selectedByDefault: false,
                      })),
                    ];
                  });
                  setSendReminderOpen(true);
                },
              },
              {
                id: "ack",
                label: "Acknowledge",
                onSelect: () => void handleAcknowledge(row.id),
              },
              {
                id: "contact",
                label: "Contact Rep",
                onSelect: () => {
                  const match = reminderItems.find((i) => i.id === row.id);
                  void (async () => {
                    try {
                      const res = await crmApi.getEodReport(row.id);
                      const email = res.data.rep?.email;
                      if (email) {
                        window.location.href = `mailto:${email}?subject=${encodeURIComponent(
                          `EOD ${row.reportId}`,
                        )}`;
                      } else {
                        toastApiError(
                          new Error(
                            match
                              ? `No email on file for ${match.repName}`
                              : "No email on file for this rep",
                          ),
                        );
                      }
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                },
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
    [router, reminderItems],
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
              placeholder="Rep · Date · Report ID"
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
                options={EOD_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger
                directionFormat="long"
              />
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

      <AttentionPanel
        items={attention}
        onRemind={(id) => void handleRemind(id)}
        onView={(id) => router.push(`/crm/eod-reports/${id}`)}
      />

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={
          <CrmListEmptyState
            query={query}
            filtersActive={Boolean(filtersApplied)}
            emptyDescription="No EOD reports yet for this view."
            onClearFilters={() => {
              setFiltersApplied(false);
              setDraftFilters(DEFAULT_EOD_FILTERS);
              setAppliedFilters(DEFAULT_EOD_FILTERS);
            }}
            onClearSearch={() => setQuery("")}
          />
        }
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
          setFiltersApplied(filtersAreActive(draftFilters));
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

      <EodSendReminderModal
        open={sendReminderOpen}
        onClose={() => setSendReminderOpen(false)}
        items={reminderItems}
        onSend={handleSendReminderPayload}
      />
    </div>
    </CrmListLoadGate>
  );
}
