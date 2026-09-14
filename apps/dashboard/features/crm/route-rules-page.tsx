"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardSortDirection,
  useScrollLock,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmLookups } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import {
  CrmHistoryModal,
  CrmPickModal,
  CrmPromptFieldsModal,
} from "./crm-action-modals";
import { ROUTE_RULES_KPI_SHELL, ROUTE_RULES_SORT_OPTIONS } from "./crm-constants";
import {
  RouteGeofenceMap,
  RouteGpsFlagsSection,
  RouteRulesHierarchyList,
  RouteViewModeToggle,
  type RouteMapSite,
  type RouteRuleActions,
  type RouteViewMode,
} from "./route-rules-gps-panels";

type RouteFilters = {
  customer: string;
  site: string;
  gpsRequired: boolean;
  geofenceFrom: string;
  geofenceTo: string;
  routeAssigned: boolean;
};

type GpsFlagsFilters = {
  site: string;
  technician: string;
  flagType: string;
  outcome: string;
  ruleSource: string;
};

const DEFAULT_FILTERS: RouteFilters = {
  customer: "",
  site: "",
  gpsRequired: false,
  geofenceFrom: "",
  geofenceTo: "",
  routeAssigned: false,
};

const DEFAULT_FLAG_FILTERS: GpsFlagsFilters = {
  site: "",
  technician: "",
  flagType: "",
  outcome: "",
  ruleSource: "",
};

type OverviewData = NonNullable<
  Awaited<ReturnType<typeof crmApi.routeRulesOverview>>["data"]
>;
type CustomerDefaultRow = OverviewData["customerDefaults"][number];
type SiteOverrideRow = OverviewData["siteOverrides"][number];

function parseRadiusFt(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  if (/mi/i.test(raw) && n < 50) return Math.round(n * 5280);
  return Math.round(n);
}

function parseFilterBound(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseFloat(t.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function radiusInRange(
  radiusFt: number,
  from: string,
  to: string,
): boolean {
  const lo = parseFilterBound(from);
  const hi = parseFilterBound(to);
  if (lo != null && radiusFt < lo) return false;
  if (hi != null && radiusFt > hi) return false;
  return true;
}

function sourceSortKey(source: string) {
  if (source === "SITE_OVERRIDE") return 0;
  if (source === "CUSTOMER_DEFAULT") return 1;
  return 2;
}

function sortDirMul(direction: DashboardSortDirection) {
  return direction === "asc" ? 1 : -1;
}

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

function FilterToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
            checked
              ? "translate-x-[18px] bg-[#1A1A1A]"
              : "translate-x-1 bg-[#FDFDFF]"
          }`}
        />
      </button>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
        />
        <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
          -
        </span>
        <input
          type="text"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
        />
      </div>
    </div>
  );
}

function FiltersDrawerShell({
  open,
  onClose,
  title,
  children,
  onClearAll,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onClearAll: () => void;
  onApply: () => void;
}) {
  useScrollLock(open);

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
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            {title}
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
          {children}
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

function RouteRulesFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  siteOptions,
  onCustomerChange,
}: {
  open: boolean;
  onClose: () => void;
  value: RouteFilters;
  onChange: (f: RouteFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  siteOptions: { value: string; label: string }[];
  onCustomerChange?: (customerId: string) => void;
}) {
  function patch(p: Partial<RouteFilters>) {
    onChange({ ...value, ...p });
  }

  return (
    <FiltersDrawerShell
      open={open}
      onClose={onClose}
      title="Filters"
      onClearAll={onClearAll}
      onApply={onApply}
    >
      <FilterSelectRow
        label="Customer"
        value={value.customer}
        options={customerOptions}
        onChange={(v) => {
          patch({ customer: v, site: "" });
          onCustomerChange?.(v);
        }}
      />
      <FilterSelectRow
        label="Site"
        value={value.site}
        options={siteOptions}
        onChange={(v) => patch({ site: v })}
      />
      <FilterToggleRow
        label="GPS Required?"
        checked={value.gpsRequired}
        onChange={(v) => patch({ gpsRequired: v })}
      />
      <FilterRangeRow
        label="Geofence Radius"
        from={value.geofenceFrom}
        to={value.geofenceTo}
        onFromChange={(v) => patch({ geofenceFrom: v })}
        onToChange={(v) => patch({ geofenceTo: v })}
      />
      <FilterToggleRow
        label="Route Assigned?"
        checked={value.routeAssigned}
        onChange={(v) => patch({ routeAssigned: v })}
      />
    </FiltersDrawerShell>
  );
}

function GpsFlagsFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  siteOptions,
  technicianOptions,
  flagTypeOptions,
  outcomeOptions,
  ruleSourceOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: GpsFlagsFilters;
  onChange: (f: GpsFlagsFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  siteOptions: { value: string; label: string }[];
  technicianOptions: { value: string; label: string }[];
  flagTypeOptions: { value: string; label: string }[];
  outcomeOptions: { value: string; label: string }[];
  ruleSourceOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<GpsFlagsFilters>) {
    onChange({ ...value, ...p });
  }

  return (
    <FiltersDrawerShell
      open={open}
      onClose={onClose}
      title="GPS Flags Filters"
      onClearAll={onClearAll}
      onApply={onApply}
    >
      <FilterSelectRow
        label="Site"
        value={value.site}
        options={siteOptions}
        onChange={(v) => patch({ site: v })}
      />
      <FilterSelectRow
        label="Technician"
        value={value.technician}
        options={technicianOptions}
        onChange={(v) => patch({ technician: v })}
      />
      <FilterSelectRow
        label="Flag Type"
        value={value.flagType}
        options={flagTypeOptions}
        onChange={(v) => patch({ flagType: v })}
      />
      <FilterSelectRow
        label="Outcome"
        value={value.outcome}
        options={outcomeOptions}
        onChange={(v) => patch({ outcome: v })}
      />
      <FilterSelectRow
        label="Rule Source"
        value={value.ruleSource}
        options={ruleSourceOptions}
        onChange={(v) => patch({ ruleSource: v })}
      />
    </FiltersDrawerShell>
  );
}

function uniqueOptions(
  values: string[],
  labelFn?: (v: string) => string,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const v of values) {
    const key = v.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ value: key, label: labelFn ? labelFn(key) : key });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function sortCustomerDefaults(
  rows: (CustomerDefaultRow & { orderIndex: number; flagCount: number })[],
  sortField: string,
  direction: DashboardSortDirection,
) {
  const dir = sortDirMul(direction);
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortField) {
      case "customer":
      case "site":
        return a.name.localeCompare(b.name) * dir;
      case "radius":
        return (
          (parseRadiusFt(a.geofenceRadius) - parseRadiusFt(b.geofenceRadius)) *
          dir
        );
      case "rule":
        return a.gpsLabel.localeCompare(b.gpsLabel) * dir;
      case "source":
        return 0;
      case "flagRaised":
        return (a.flagCount - b.flagCount) * dir;
      case "lastModified":
        return (a.orderIndex - b.orderIndex) * dir;
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  });
  return sorted;
}

function sortSiteOverrides(
  rows: (SiteOverrideRow & { orderIndex: number; flagCount: number })[],
  sortField: string,
  direction: DashboardSortDirection,
) {
  const dir = sortDirMul(direction);
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortField) {
      case "site":
        return a.name.localeCompare(b.name) * dir;
      case "customer":
        return a.customer.localeCompare(b.customer) * dir;
      case "radius":
        return (
          (parseRadiusFt(a.geofenceRadius) - parseRadiusFt(b.geofenceRadius)) *
          dir
        );
      case "rule":
        return a.gpsLabel.localeCompare(b.gpsLabel) * dir;
      case "source":
        return a.overrides.localeCompare(b.overrides) * dir;
      case "flagRaised":
        return (a.flagCount - b.flagCount) * dir;
      case "lastModified":
        return (a.orderIndex - b.orderIndex) * dir;
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  });
  return sorted;
}

function sortMapSites(
  rows: RouteMapSite[],
  sortField: string,
  direction: DashboardSortDirection,
) {
  const dir = sortDirMul(direction);
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortField) {
      case "site":
        return a.label.localeCompare(b.label) * dir;
      case "customer":
        return a.customer.localeCompare(b.customer) * dir;
      case "radius":
        return (a.radiusFt - b.radiusFt) * dir;
      case "rule":
        return a.gpsMode.localeCompare(b.gpsMode) * dir;
      case "source":
        return (sourceSortKey(a.ruleSource) - sourceSortKey(b.ruleSource)) * dir;
      case "flagRaised":
        return (a.flagCount - b.flagCount) * dir;
      case "lastModified":
        return a.label.localeCompare(b.label) * dir;
      default:
        return a.label.localeCompare(b.label) * dir;
    }
  });
  return sorted;
}

export function RouteRulesPage() {
  const router = useRouter();
  const { askConfirm, dialogs } = useCrmDialogs();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("site");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [viewMode, setViewMode] = React.useState<RouteViewMode>("split");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<RouteFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<RouteFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [flagFiltersOpen, setFlagFiltersOpen] = React.useState(false);
  const [draftFlagFilters, setDraftFlagFilters] =
    React.useState<GpsFlagsFilters>(DEFAULT_FLAG_FILTERS);
  const [appliedFlagFilters, setAppliedFlagFilters] =
    React.useState<GpsFlagsFilters>(DEFAULT_FLAG_FILTERS);
  const [flagFiltersApplied, setFlagFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [selectedLocationId, setSelectedLocationId] = React.useState<
    string | null
  >(null);
  const [groupBy, setGroupBy] = React.useState<"site" | "date">("site");
  const [geofenceOpen, setGeofenceOpen] = React.useState(false);
  const [geofenceRuleId, setGeofenceRuleId] = React.useState<string | null>(
    null,
  );
  const [geofenceDefault, setGeofenceDefault] = React.useState("");
  const [testOpen, setTestOpen] = React.useState(false);
  const [testRuleId, setTestRuleId] = React.useState<string | null>(null);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [copyRuleId, setCopyRuleId] = React.useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTitle, setHistoryTitle] = React.useState("GPS Flags");
  const [historyEvents, setHistoryEvents] = React.useState<
    { id: string; at: string; label: string; detail?: string }[]
  >([]);
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("ROUTE_RULES");

  const { customers, locations, reloadEntities } = useCrmLookups({
    includeLocations: true,
  });

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.routeRulesOverview();
      setOverview(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route rules");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const kpiCells = React.useMemo(() => {
    const kpi = overview?.kpi ?? {};
    const cells = kpiCellsFromApi(ROUTE_RULES_KPI_SHELL, {
      sitesWithRule: Number(kpi.sitesWithRule ?? 0),
      usingSystemDefault: Number(kpi.usingSystemDefault ?? 0),
      gpsFlagsThisCycle: Number(kpi.gpsFlagsThisCycle ?? 0),
      sitesWithNoRule: Number(kpi.sitesWithNoRule ?? 0),
    });
    const metas = [
      "Customer or site level",
      "Nobody configured",
      kpi.flagsTopSite
        ? `Most from ${String(kpi.flagsTopSite)}`
        : "This cycle",
      "Needs setup",
    ];
    return cells.map((cell, i) => ({ ...cell, meta: metas[i] }));
  }, [overview]);

  const flagCountByLocation = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of overview?.mapSites ?? []) {
      map.set(s.locationId, s.flagCount);
    }
    return map;
  }, [overview]);

  const customerDefaults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const flagByCustomer = new Map<string, number>();
    for (const s of overview?.mapSites ?? []) {
      flagByCustomer.set(
        s.customer,
        (flagByCustomer.get(s.customer) ?? 0) + s.flagCount,
      );
    }

    let rows = (overview?.customerDefaults ?? []).map((r, orderIndex) => ({
      ...r,
      orderIndex,
      flagCount: flagByCustomer.get(r.name) ?? 0,
    }));

    if (filtersApplied && appliedFilters.customer) {
      const label =
        customers.find((c) => c.value === appliedFilters.customer)?.label ?? "";
      if (label) {
        rows = rows.filter((r) =>
          r.name.toLowerCase().includes(label.toLowerCase()),
        );
      }
    }

    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.detail.toLowerCase().includes(q),
      );
    }

    rows = sortCustomerDefaults(rows, sortField, sortDirection);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      detail: r.detail,
      meta: `${r.sitesCount} sites`,
      gpsTone: r.gpsRequired
        ? ("required" as const)
        : ("optional" as const),
    }));
  }, [
    overview,
    query,
    filtersApplied,
    appliedFilters,
    customers,
    sortField,
    sortDirection,
  ]);

  const siteOverrides = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = (overview?.siteOverrides ?? []).map((r, orderIndex) => ({
      ...r,
      orderIndex,
      flagCount: r.locationId
        ? (flagCountByLocation.get(r.locationId) ?? 0)
        : 0,
    }));

    rows = rows.filter((r) => {
      if (filtersApplied && appliedFilters.customer) {
        const label =
          customers.find((c) => c.value === appliedFilters.customer)?.label ??
          "";
        if (label && !r.customer.toLowerCase().includes(label.toLowerCase()))
          return false;
      }
      if (filtersApplied && appliedFilters.site) {
        if (r.locationId !== appliedFilters.site) return false;
      }
      if (filtersApplied && appliedFilters.gpsRequired && !r.gpsRequired)
        return false;
      if (filtersApplied && appliedFilters.routeAssigned && !r.locationId)
        return false;
      if (filtersApplied) {
        const ft = parseRadiusFt(r.geofenceRadius);
        if (
          !radiusInRange(
            ft,
            appliedFilters.geofenceFrom,
            appliedFilters.geofenceTo,
          )
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.detail.toLowerCase().includes(q)
      );
    });

    rows = sortSiteOverrides(rows, sortField, sortDirection);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      detail: r.detail,
      meta: r.overrides,
      locationId: r.locationId,
      gpsTone: /not required/i.test(r.gpsLabel)
        ? ("not_required" as const)
        : r.gpsRequired
          ? ("required" as const)
          : ("optional" as const),
    }));
  }, [
    overview,
    query,
    filtersApplied,
    appliedFilters,
    customers,
    flagCountByLocation,
    sortField,
    sortDirection,
  ]);

  const mapSites = React.useMemo(() => {
    let sites = [...(overview?.mapSites ?? [])] as RouteMapSite[];
    const q = query.trim().toLowerCase();

    sites = sites.filter((s) => {
      if (filtersApplied && appliedFilters.customer) {
        const label =
          customers.find((c) => c.value === appliedFilters.customer)?.label ??
          "";
        if (label && !s.customer.toLowerCase().includes(label.toLowerCase()))
          return false;
      }
      if (filtersApplied && appliedFilters.site) {
        if (s.locationId !== appliedFilters.site) return false;
      }
      if (filtersApplied && appliedFilters.gpsRequired && s.gpsMode !== "required")
        return false;
      if (filtersApplied && appliedFilters.routeAssigned) {
        // routeAssigned = resolved rule has locationId (site override)
        if (s.ruleSource !== "SITE_OVERRIDE") return false;
      }
      if (filtersApplied) {
        if (
          !radiusInRange(
            s.radiusFt,
            appliedFilters.geofenceFrom,
            appliedFilters.geofenceTo,
          )
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        s.label.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q)
      );
    });

    return sortMapSites(sites, sortField, sortDirection);
  }, [
    overview,
    query,
    filtersApplied,
    appliedFilters,
    customers,
    sortField,
    sortDirection,
  ]);

  const allFlags = overview?.flags ?? [];

  const filteredFlags = React.useMemo(() => {
    if (!flagFiltersApplied) return allFlags;
    return allFlags.filter((f) => {
      if (appliedFlagFilters.site && f.siteId !== appliedFlagFilters.site)
        return false;
      if (
        appliedFlagFilters.technician &&
        f.technician !== appliedFlagFilters.technician
      )
        return false;
      if (
        appliedFlagFilters.flagType &&
        f.flagType !== appliedFlagFilters.flagType
      )
        return false;
      if (
        appliedFlagFilters.outcome &&
        f.outcome !== appliedFlagFilters.outcome
      )
        return false;
      if (
        appliedFlagFilters.ruleSource &&
        f.ruleSource !== appliedFlagFilters.ruleSource
      )
        return false;
      return true;
    });
  }, [allFlags, flagFiltersApplied, appliedFlagFilters]);

  const flagFilterOptions = React.useMemo(() => {
    const siteOpts = uniqueOptions(
      allFlags.map((f) => f.siteId),
      (id) => allFlags.find((f) => f.siteId === id)?.site ?? id,
    );
    return {
      site: siteOpts,
      technician: uniqueOptions(allFlags.map((f) => f.technician)),
      flagType: uniqueOptions(allFlags.map((f) => f.flagType)),
      outcome: uniqueOptions(allFlags.map((f) => f.outcome), (v) =>
        v.replace(/_/g, " "),
      ),
      ruleSource: uniqueOptions(allFlags.map((f) => f.ruleSource), (v) => {
        if (v === "SITE_OVERRIDE") return "Site override";
        if (v === "CUSTOMER_DEFAULT") return "Customer default";
        return "System default";
      }),
    };
  }, [allFlags]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection,
      query,
      filtersApplied,
      viewMode,
      flagFilters: appliedFlagFilters,
      flagFiltersApplied,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: RouteFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
      viewMode?: RouteViewMode;
      flagFilters?: GpsFlagsFilters;
      flagFiltersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ??
          Object.values(nextFilters).some((v) =>
            typeof v === "boolean" ? v : Boolean(v),
          ),
      );
    }
    if (p.flagFilters) {
      const next = { ...DEFAULT_FLAG_FILTERS, ...p.flagFilters };
      setAppliedFlagFilters(next);
      setDraftFlagFilters(next);
      setFlagFiltersApplied(
        p.flagFiltersApplied ??
          Object.values(next).some((v) => Boolean(v)),
      );
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
    if (p.viewMode === "split" || p.viewMode === "list" || p.viewMode === "map") {
      setViewMode(p.viewMode);
    }
  }

  async function handleExport() {
    try {
      const res = await crmApi.exportRouteRules({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
      });
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportPdf() {
    try {
      const res = await crmApi.exportRouteRules({
        q: query || undefined,
        format: "pdf",
      });
      if (!res.data.pdf) throw new Error("No PDF");
      downloadPdf(res.data.pdf, res.data.filename);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportExcel() {
    try {
      const res = await crmApi.exportRouteRules({
        q: query || undefined,
        format: "xlsx",
      });
      if (!res.data.xlsx) throw new Error("No Excel file");
      downloadXlsx(res.data.xlsx, res.data.filename);
      toastSuccess("Excel downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  function openGeofenceForRule(ruleId: string | null) {
    if (!ruleId) {
      toastApiError(new Error("No route rule linked to adjust"));
      return;
    }
    const site = overview?.siteOverrides.find((r) => r.id === ruleId);
    const customer = overview?.customerDefaults.find((r) => r.id === ruleId);
    setGeofenceRuleId(ruleId);
    setGeofenceDefault(
      site?.geofenceRadius ?? customer?.geofenceRadius ?? "500 FT",
    );
    if (site?.locationId) setSelectedLocationId(site.locationId);
    setGeofenceOpen(true);
  }

  async function handleGeofenceConfirm(values: Record<string, string>) {
    if (!geofenceRuleId) return;
    const radius = values.geofenceRadius?.trim();
    if (!radius) {
      toastApiError(new Error("Geofence radius is required"));
      throw new Error("Geofence radius is required");
    }
    try {
      await crmApi.updateRouteRule(geofenceRuleId, {
        geofenceRadius: radius,
      });
      toastSuccess(`Geofence updated to ${radius}`);
      await reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleTestCoordinate(values: Record<string, string>) {
    if (!testRuleId) return;
    const lat = Number.parseFloat(values.lat ?? "");
    const lng = Number.parseFloat(values.lng ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toastApiError(new Error("Enter valid latitude and longitude"));
      throw new Error("Invalid coordinates");
    }
    try {
      const res = await crmApi.testRouteCoordinate(testRuleId, lat, lng);
      const { inside, distanceFt, radiusFt, locationName } = res.data;
      toastSuccess(
        inside
          ? `Inside geofence${locationName ? ` · ${locationName}` : ""} · ${distanceFt} ft of ${radiusFt} ft`
          : `Outside geofence · ${distanceFt} ft (radius ${radiusFt} ft)`,
      );
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleCopyConfirm(locationId: string) {
    if (!copyRuleId) return;
    try {
      await crmApi.copyRouteRuleToLocation(copyRuleId, locationId);
      const name =
        locations.find((l) => l.value === locationId)?.label ?? "site";
      toastSuccess(`Copied to ${name}`);
      await reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleViewGpsFlags(id: string, label?: string) {
    try {
      const res = await crmApi.routeRuleGpsFlags(id);
      setHistoryTitle(label ? `GPS Flags · ${label}` : "GPS Flags Raised Here");
      setHistoryEvents(
        (res.data.flags ?? []).map((f) => ({
          id: f.id,
          at: f.at,
          label: f.severity || "Flag",
          detail: f.message,
        })),
      );
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleResetInherited(id: string) {
    const ok = await askConfirm({
      title: "Reset to inherited?",
      description:
        "Remove this site override so the customer or system default applies again.",
      confirmLabel: "Reset",
    });
    if (!ok) return;
    try {
      await crmApi.archiveRouteRule(id);
      toastSuccess("Reset to inherited");
      await reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDeleteRule(id: string) {
    const ok = await askConfirm({
      title: "Delete rule",
      description: "Delete this route rule? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveRouteRule(id);
      toastSuccess("Rule deleted");
      await reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  const ruleActions: RouteRuleActions = {
    onEdit: (id) => router.push(`/crm/route-rules/${id}/edit`),
    onAdjustGeofence: (id) => openGeofenceForRule(id),
    onTestCoordinate: (id) => {
      setTestRuleId(id);
      setTestOpen(true);
    },
    onCopyToSite: (id) => {
      setCopyRuleId(id);
      setCopyOpen(true);
    },
    onViewGpsFlags: (id, label) => void handleViewGpsFlags(id, label),
    onResetInherited: (id) => void handleResetInherited(id),
    onDelete: (id) => void handleDeleteRule(id),
  };

  const geofenceFields = React.useMemo(
    () => [
      {
        key: "geofenceRadius",
        label: "Geofence Radius (ft)",
        placeholder: "e.g. 500",
        defaultValue: geofenceDefault,
      },
    ],
    [geofenceDefault],
  );

  const testFields = React.useMemo(
    () => [
      {
        key: "lat",
        label: "Latitude",
        placeholder: "e.g. 31.8457",
      },
      {
        key: "lng",
        label: "Longitude",
        placeholder: "e.g. -102.3676",
      },
    ],
    [],
  );

  const copyLocationOptions = React.useMemo(() => {
    const excludeLocationId =
      overview?.siteOverrides.find((r) => r.id === copyRuleId)?.locationId ??
      null;
    return locations
      .filter((l) => l.value !== excludeLocationId)
      .map((l) => ({ value: l.value, label: l.label }));
  }, [locations, overview, copyRuleId]);

  const systemDefault = {
    id: overview?.systemDefault.id ?? "system-default",
    name: overview?.systemDefault.name ?? "ALL SITES",
    detail:
      overview?.systemDefault.detail ??
      "1000 FT · ACCURACY 50M · GPS REQUIRED",
    appliesTo: overview?.systemDefault.appliesTo ?? 0,
    gpsTone: "required" as const,
  };

  const flagsSummary = React.useMemo(() => {
    if (!flagFiltersApplied) {
      return overview?.flagsSummary ?? { total: 0, sites: 0 };
    }
    const sites = new Set(filteredFlags.map((f) => f.siteId));
    return { total: filteredFlags.length, sites: sites.size };
  }, [flagFiltersApplied, overview, filteredFlags]);

  return (
    <CrmListLoadGate
      loading={loading}
      hasData={overview != null}
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

        <div className="flex flex-wrap items-center gap-2.5">
          <RouteViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Route Rules"
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
                options={ROUTE_RULES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardExportMenu
                items={[
                  {
                    id: "view-csv",
                    label: "Export current view · CSV",
                    onSelect: () => void handleExport(),
                  },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void handleExportExcel(),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void handleExportPdf(),
                  },
                ]}
              />
            </>
          }
        />

        {viewMode === "split" ? (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
            <RouteGeofenceMap
              sites={mapSites}
              selectedId={selectedLocationId}
              onSelect={setSelectedLocationId}
              onEditRule={(id) => router.push(`/crm/route-rules/${id}/edit`)}
            />
            <RouteRulesHierarchyList
              systemDefault={systemDefault}
              customerDefaults={customerDefaults}
              siteOverrides={siteOverrides}
              compact
              actions={ruleActions}
            />
          </div>
        ) : null}

        {viewMode === "list" ? (
          <RouteRulesHierarchyList
            systemDefault={systemDefault}
            customerDefaults={customerDefaults}
            siteOverrides={siteOverrides}
            actions={ruleActions}
          />
        ) : null}

        {viewMode === "map" ? (
          <RouteGeofenceMap
            sites={mapSites}
            selectedId={selectedLocationId}
            onSelect={setSelectedLocationId}
            onEditRule={(id) => router.push(`/crm/route-rules/${id}/edit`)}
            tall
          />
        ) : null}

        <RouteGpsFlagsSection
          flags={filteredFlags}
          summary={flagsSummary}
          insight={overview?.insight ?? null}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onAdjustRadius={openGeofenceForRule}
          onReview={() => setSavedViewsOpen(true)}
          onOpenFilters={() => {
            setDraftFlagFilters(appliedFlagFilters);
            setFlagFiltersOpen(true);
          }}
        />

        <RouteRulesFiltersDrawer
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
            void reloadEntities();
          }}
          customerOptions={customers}
          siteOptions={locations}
          onCustomerChange={(customerId) => {
            void reloadEntities({
              customerId: customerId || undefined,
            });
          }}
        />

        <GpsFlagsFiltersDrawer
          open={flagFiltersOpen}
          onClose={() => setFlagFiltersOpen(false)}
          value={draftFlagFilters}
          onChange={setDraftFlagFilters}
          onApply={() => {
            setAppliedFlagFilters(draftFlagFilters);
            setFlagFiltersApplied(true);
          }}
          onClearAll={() => {
            setDraftFlagFilters(DEFAULT_FLAG_FILTERS);
            setAppliedFlagFilters(DEFAULT_FLAG_FILTERS);
            setFlagFiltersApplied(false);
          }}
          siteOptions={flagFilterOptions.site}
          technicianOptions={flagFilterOptions.technician}
          flagTypeOptions={flagFilterOptions.flagType}
          outcomeOptions={flagFilterOptions.outcome}
          ruleSourceOptions={flagFilterOptions.ruleSource}
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

        <CrmPromptFieldsModal
          open={geofenceOpen}
          title="Adjust Geofence"
          fields={geofenceFields}
          confirmLabel="Update"
          onClose={() => {
            setGeofenceOpen(false);
            setGeofenceRuleId(null);
          }}
          onConfirm={handleGeofenceConfirm}
        />

        <CrmPromptFieldsModal
          open={testOpen}
          title="Test with a Sample Coordinate"
          fields={testFields}
          confirmLabel="Run test"
          onClose={() => {
            setTestOpen(false);
            setTestRuleId(null);
          }}
          onConfirm={handleTestCoordinate}
        />

        <CrmPickModal
          open={copyOpen}
          title="Copy to Another Site"
          label="Location"
          options={copyLocationOptions}
          confirmLabel="Copy"
          onClose={() => {
            setCopyOpen(false);
            setCopyRuleId(null);
          }}
          onConfirm={handleCopyConfirm}
        />

        <CrmHistoryModal
          open={historyOpen}
          title={historyTitle}
          events={historyEvents}
          onClose={() => setHistoryOpen(false)}
        />

        {dialogs}
      </div>
    </CrmListLoadGate>
  );
}
