"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardDrawer,
  DashboardMenuPopover,
  DashboardPagination,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  downloadCsv,
  hrApi,
  type HrEmployee,
  type HrEmployeeFilterOptions,
} from "@/lib/hr-api";
import { useCrmSavedViews, type CrmSavedViewItem } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import {
  OffboardingChecklistModal,
  TerminationConfirmModal,
} from "@/features/hr/employee-offboarding-modals";

type SortKey = "name" | "code" | "role" | "status" | "hours";
type EmployeeFilters = {
  status: string;
  role: string;
  crew: string;
  supervisorId: string;
  assignedTruck: string;
  certificationHeld: string;
  certExpiringWithinDays: string;
  availableOnDate: string;
  hasOpenTimeEdit: boolean;
  missingBbs: boolean;
};

const DEFAULT_FILTERS: EmployeeFilters = {
  status: "ANY",
  role: "ANY",
  crew: "ANY",
  supervisorId: "",
  assignedTruck: "ANY",
  certificationHeld: "ANY",
  certExpiringWithinDays: "",
  availableOnDate: "",
  hasOpenTimeEdit: false,
  missingBbs: false,
};

const VIEW_PRESETS: CrmSavedViewItem[] = [
  {
    id: "__preset_active_techs",
    label: "Active Technicians",
    builtin: true,
    payload: { filters: { ...DEFAULT_FILTERS, status: "ACTIVE" } },
  },
  {
    id: "__preset_certs_60d",
    label: "Certificates Expiring 60D",
    builtin: true,
    payload: {
      filters: { ...DEFAULT_FILTERS, certExpiringWithinDays: "60" },
    },
  },
  {
    id: "__preset_missing_bbs",
    label: "Missing BBS This Week",
    builtin: true,
    payload: { filters: { ...DEFAULT_FILTERS, missingBbs: true } },
  },
  {
    id: "__preset_on_leave",
    label: "On Leave",
    builtin: true,
    payload: { filters: { ...DEFAULT_FILTERS }, onLeave: true },
  },
  {
    id: "__preset_unassigned",
    label: "Unassigned To A Truck",
    builtin: true,
    payload: { filters: { ...DEFAULT_FILTERS }, unassignedTruck: true },
  },
];

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function FilterCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 9.5 17 19 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6v12M5 9l3-3 3 3M16 18V6M13 15l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExportGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function PlusPersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "border-[#22C55E]/50 text-[#22C55E]";
  if (s === "NEED_REVIEW") return "border-[#E8C47C]/50 text-[#E8C47C]";
  return "border-[#A78BFA]/50 text-[#A78BFA]";
}

function certTone(tone: string) {
  const t = tone.toLowerCase();
  if (t === "none") return "border-[#22C55E]/50 text-[#22C55E]";
  if (t === "warning") return "border-[#E8C47C]/50 text-[#E8C47C]";
  if (t === "error") return "border-[#FF6B6B]/50 text-[#FF6B6B]";
  return "border-[#5A5A5A] text-[#959597]";
}

function bbsTone(bbs: string) {
  const b = bbs.toUpperCase();
  if (b === "SUBMITTED") return "border-[#22C55E]/50 text-[#22C55E]";
  if (b === "PENDING") return "border-[#E8C47C]/50 text-[#E8C47C]";
  if (b === "MISSING") return "border-[#FF6B6B]/50 text-[#FF6B6B]";
  return "border-[#5A5A5A] text-[#959597]";
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function FieldSelect({
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
    <label className="flex items-center justify-between gap-3 py-2.5">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[140px] max-w-[180px] appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      >
        {options.map((o) => (
          <option key={o.value || o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EmployeesPage() {
  const router = useRouter();
  const { askPrompt, dialogs } = useCrmDialogs();
  const saved = useCrmSavedViews("EMPLOYEES");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<HrEmployee[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [filters, setFilters] = React.useState<EmployeeFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] =
    React.useState<EmployeeFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [viewsOpen, setViewsOpen] = React.useState(false);
  const [saveNewOpen, setSaveNewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [rowMenuId, setRowMenuId] = React.useState<string | null>(null);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [offboardEmployeeId, setOffboardEmployeeId] = React.useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [options, setOptions] = React.useState<HrEmployeeFilterOptions | null>(
    null,
  );
  const [kpi, setKpi] = React.useState({
    active: 0,
    activeDelta: 0,
    hoursThisCycle: 0,
    hoursAvg: 0,
    pendingRequests: 0,
    pendingEdits: 0,
    pendingTimeOff: 0,
    trainingFlags: 0,
    trainingFlagsMeta: "Clear",
  });
  const [extraQuery, setExtraQuery] = React.useState<{
    onLeave?: boolean;
    unassignedTruck?: boolean;
  }>({});

  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [debouncedQ, sortKey, sortDir, filters, extraQuery]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, kpiRes, optRes] = await Promise.all([
        hrApi.listEmployees({
          q: debouncedQ || undefined,
          page,
          pageSize,
          sort: sortKey,
          direction: sortDir,
          status:
            filters.status !== "ANY" ? filters.status : undefined,
          role: filters.role !== "ANY" ? filters.role : undefined,
          crew: filters.crew !== "ANY" ? filters.crew : undefined,
          supervisorId: filters.supervisorId || undefined,
          assignedTruck:
            filters.assignedTruck !== "ANY"
              ? filters.assignedTruck
              : undefined,
          certificationHeld:
            filters.certificationHeld !== "ANY"
              ? filters.certificationHeld
              : undefined,
          certExpiringWithinDays:
            filters.certExpiringWithinDays || undefined,
          availableOnDate: filters.availableOnDate || undefined,
          hasOpenTimeEdit: filters.hasOpenTimeEdit ? "true" : undefined,
          missingBbs: filters.missingBbs ? "true" : undefined,
          onLeave: extraQuery.onLeave ? "true" : undefined,
          unassignedTruck: extraQuery.unassignedTruck ? "true" : undefined,
        }),
        hrApi.employeesKpi(),
        options
          ? Promise.resolve(null)
          : hrApi.employeeFilterOptions().catch(() => null),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi({
        active: kpiRes.data.active ?? 0,
        activeDelta: kpiRes.data.activeDelta ?? 0,
        hoursThisCycle: kpiRes.data.hoursThisCycle ?? 0,
        hoursAvg: kpiRes.data.hoursAvg ?? 0,
        pendingRequests: kpiRes.data.pendingRequests ?? 0,
        pendingEdits: kpiRes.data.pendingEdits ?? 0,
        pendingTimeOff: kpiRes.data.pendingTimeOff ?? 0,
        trainingFlags: kpiRes.data.trainingFlags ?? 0,
        trainingFlagsMeta: kpiRes.data.trainingFlagsMeta ?? "Clear",
      });
      if (optRes?.data) setOptions(optRes.data);
    } catch (err) {
      toastApiError(err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQ,
    page,
    pageSize,
    sortKey,
    sortDir,
    filters,
    extraQuery,
    reloadKey,
    options,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<PlusPersonIcon />}
      onClick={() => router.push("/hr/employees/new")}
    >
      Add Employee
    </DashboardToolbarButton>,
    [router],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  }

  function handleExport() {
    const source =
      selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    const header = [
      "Name",
      "Code",
      "Role",
      "Status",
      "Supervisor",
      "Truck",
      "Hours",
      "Certs",
      "BBS",
    ];
    const lines = source.map((r) =>
      [
        r.name,
        r.code,
        r.roleTitle,
        r.status,
        r.supervisor?.name ?? "",
        r.assignedTruck ?? "",
        r.hoursThisCycle,
        r.certExpiringLabel,
        r.bbsThisWeek,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv([header.join(","), ...lines].join("\n"), "employees.csv");
    toastSuccess("Export downloaded");
  }

  async function bulkAssign(kind: "crew" | "supervisor" | "training") {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      if (kind === "crew") {
        const crew = await askPrompt({
          title: "Assign Crew",
          label: "Crew",
          placeholder: "Alpha",
          confirmLabel: "Assign",
        });
        if (crew == null) return;
        await hrApi.bulkAssignEmployees({ ids, crew: crew.trim() });
      } else if (kind === "supervisor") {
        const pick = options?.supervisors.find((s) => s.value);
        const supervisorId = await askPrompt({
          title: "Assign Supervisor",
          label: "Supervisor ID",
          placeholder: pick?.value || "",
          confirmLabel: "Assign",
          defaultValue: pick?.value || "",
        });
        if (supervisorId == null) return;
        await hrApi.bulkAssignEmployees({
          ids,
          supervisorId: supervisorId.trim(),
        });
      } else {
        const training = await askPrompt({
          title: "Assign Training",
          label: "Certification",
          placeholder: "H2S",
          confirmLabel: "Assign",
        });
        if (training == null) return;
        await hrApi.bulkAssignEmployees({
          ids,
          trainingLabel: training.trim(),
        });
      }
      toastSuccess("Assignment updated");
      setSelected(new Set());
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  function applyViewPayload(payload: unknown) {
    const p = (payload ?? {}) as {
      filters?: Partial<EmployeeFilters>;
      onLeave?: boolean;
      unassignedTruck?: boolean;
      q?: string;
      sort?: SortKey;
      direction?: "asc" | "desc";
    };
    setFilters({ ...DEFAULT_FILTERS, ...(p.filters ?? {}) });
    setDraftFilters({ ...DEFAULT_FILTERS, ...(p.filters ?? {}) });
    setExtraQuery({
      onLeave: Boolean(p.onLeave),
      unassignedTruck: Boolean(p.unassignedTruck),
    });
    if (p.q != null) setSearch(p.q);
    if (p.sort) setSortKey(p.sort);
    if (p.direction) setSortDir(p.direction);
  }

  const allViews = React.useMemo(
    () => [...VIEW_PRESETS, ...saved.savedViews],
    [saved.savedViews],
  );

  const columns = React.useMemo<DashboardDataTableColumn<HrEmployee>[]>(
    () => [
      {
        id: "select",
        header: (
          <input
            type="checkbox"
            checked={rows.length > 0 && selected.size === rows.length}
            onChange={toggleSelectAll}
            aria-label="Select all"
          />
        ),
        className: "w-10",
        cell: (row) => (
          <input
            type="checkbox"
            checked={selected.has(row.id)}
            onChange={() => toggleSelect(row.id)}
            aria-label={`Select ${row.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        id: "name",
        header: "Name",
        className: "min-w-[130px]",
        cell: (row) => (
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => router.push(`/hr/employees/${row.id}`)}
          >
            <p className="truncate font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              {row.name}
            </p>
            <span className="mt-0.5 inline-block font-sans text-[11px] uppercase text-[#60A5FA] underline">
              {row.code}
            </span>
          </button>
        ),
      },
      {
        id: "role",
        header: "Role",
        className: "min-w-[120px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.roleTitle}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 font-sans text-[10px] font-[510] uppercase",
              statusTone(row.status),
            )}
          >
            {row.status.replace("_", " ")}
          </span>
        ),
      },
      {
        id: "supervisor",
        header: "Supervisor",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.supervisor?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "truck",
        header: "Assigned Truck",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.assignedTruck ?? "Unassigned"}
          </span>
        ),
      },
      {
        id: "hours",
        header: "Hours This Cycl",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
            {row.hoursThisCycle.toFixed(1)} Hrs
          </span>
        ),
      },
      {
        id: "certs",
        header: "Certs Expiring",
        className: "min-w-[120px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 font-sans text-[10px] font-[510] uppercase",
              certTone(row.certExpiringTone),
            )}
          >
            {row.certExpiringLabel}
          </span>
        ),
      },
      {
        id: "bbs",
        header: "BBS This Week",
        className: "min-w-[110px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 font-sans text-[10px] font-[510] uppercase",
              bbsTone(row.bbsThisWeek),
            )}
          >
            {row.bbsThisWeek}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <button
            type="button"
            aria-label="Row actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
            onClick={(e) => {
              e.stopPropagation();
              rowMenuRef.current = e.currentTarget;
              setRowMenuId((id) => (id === row.id ? null : row.id));
            }}
          >
            <KebabIcon />
          </button>
        ),
      },
    ],
    [rows, selected, router],
  );

  const rowMenu = rows.find((r) => r.id === rowMenuId) ?? null;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Active"
            value={String(kpi.active)}
            meta={`+${kpi.activeDelta} This Month`}
            icon="document"
          />
          <DashboardStatCell
            title="Hours This Cycle"
            value={kpi.hoursThisCycle.toFixed(1)}
            meta={`Per Tech Avg ${kpi.hoursAvg.toFixed(1)}H`}
            icon="time"
          />
          <DashboardStatCell
            title="Pending Requests"
            value={String(kpi.pendingRequests)}
            meta={`${kpi.pendingEdits} Edits · ${kpi.pendingTimeOff} Time Off`}
            icon="folder"
          />
          <DashboardStatCell
            title="Training Flags"
            value={String(kpi.trainingFlags)}
            meta={kpi.trainingFlagsMeta}
            icon="lightning"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      {selected.size > 0 ? (
        <DashboardBulkSelectBar
          selectedCount={selected.size}
          actions={
            <>
              <DashboardToolbarButton
                disabled={busy}
                onClick={handleExport}
              >
                Export
              </DashboardToolbarButton>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => void bulkAssign("training")}
              >
                Assign Training
              </DashboardToolbarButton>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => void bulkAssign("crew")}
              >
                Assign Crew
              </DashboardToolbarButton>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => void bulkAssign("supervisor")}
              >
                Assign Supervisor
              </DashboardToolbarButton>
            </>
          }
        />
      ) : (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, Employee ID, E…"
            className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
          />
        </div>
        <DashboardToolbarButton
          leftIcon={<FilterCheckIcon />}
          onClick={() => {
            setDraftFilters(filters);
            setFilterOpen(true);
          }}
        >
          Filter
        </DashboardToolbarButton>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <DashboardToolbarButton
              ref={sortRef}
              leftIcon={<SortIcon />}
              showChevron
              onClick={() => setSortOpen((o) => !o)}
            >
              Sort:{" "}
              {sortKey === "name"
                ? "Name (A-Z)"
                : sortKey === "hours"
                  ? "Hours"
                  : sortKey === "status"
                    ? "Status"
                    : sortKey === "role"
                      ? "Role"
                      : "Code"}
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              anchorRef={sortRef}
              align="right"
              className="min-w-[180px]"
              items={[
                {
                  id: "name",
                  label: "Name (A-Z)",
                  onSelect: () => {
                    setSortKey("name");
                    setSortDir("asc");
                  },
                },
                {
                  id: "hours",
                  label: "Hours This Cycle",
                  onSelect: () => {
                    setSortKey("hours");
                    setSortDir("desc");
                  },
                },
                {
                  id: "status",
                  label: "Status",
                  onSelect: () => {
                    setSortKey("status");
                    setSortDir("asc");
                  },
                },
                {
                  id: "role",
                  label: "Role",
                  onSelect: () => {
                    setSortKey("role");
                    setSortDir("asc");
                  },
                },
              ]}
            />
          </div>
          <DashboardToolbarButton
            leftIcon={<DocIcon />}
            onClick={() => router.push("/hr/payroll-review")}
          >
            Payroll Review
          </DashboardToolbarButton>
          <div className="relative">
            <DashboardToolbarButton
              ref={exportRef}
              leftIcon={<ExportGlyph />}
              showChevron
              onClick={() => setExportOpen((o) => !o)}
            >
              Export
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={exportOpen}
              onClose={() => setExportOpen(false)}
              anchorRef={exportRef}
              align="right"
              className="min-w-[180px]"
              items={[
                { id: "csv", label: "Export CSV", onSelect: handleExport },
                {
                  id: "views",
                  label: "Save View",
                  onSelect: () => setViewsOpen(true),
                },
              ]}
            />
          </div>
        </div>
      </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <BrandLoader label="Loading employees" />
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            emptyMessage="No employees found"
            onRowClick={(row) => router.push(`/hr/employees/${row.id}`)}
          />
          <DashboardPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      <DashboardDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        widthClassName="max-w-[420px]"
        footer={
          <div className="flex items-center justify-between gap-2">
            <DashboardToolbarButton onClick={() => setFilterOpen(false)}>
              Close
            </DashboardToolbarButton>
            <div className="flex gap-2">
              <DashboardToolbarButton
                onClick={() => {
                  setDraftFilters(DEFAULT_FILTERS);
                  setFilters(DEFAULT_FILTERS);
                  setExtraQuery({});
                  setFilterOpen(false);
                }}
              >
                Clear All
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                onClick={() => {
                  setFilters(draftFilters);
                  setExtraQuery({});
                  setFilterOpen(false);
                }}
              >
                Apply
              </DashboardToolbarButton>
            </div>
          </div>
        }
      >
        <div className="divide-y divide-[#2D2D30] px-1">
          <FieldSelect
            label="Status"
            value={draftFilters.status}
            options={options?.statuses ?? [{ value: "ANY", label: "Any" }]}
            onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
          />
          <FieldSelect
            label="Role"
            value={draftFilters.role}
            options={options?.roles ?? [{ value: "ANY", label: "Any" }]}
            onChange={(v) => setDraftFilters((f) => ({ ...f, role: v }))}
          />
          <FieldSelect
            label="Crew"
            value={draftFilters.crew}
            options={options?.crews ?? [{ value: "ANY", label: "Any" }]}
            onChange={(v) => setDraftFilters((f) => ({ ...f, crew: v }))}
          />
          <FieldSelect
            label="Supervisor"
            value={draftFilters.supervisorId}
            options={options?.supervisors ?? [{ value: "", label: "Any" }]}
            onChange={(v) =>
              setDraftFilters((f) => ({ ...f, supervisorId: v }))
            }
          />
          <FieldSelect
            label="Assigned Truck"
            value={draftFilters.assignedTruck}
            options={options?.trucks ?? [{ value: "ANY", label: "Any" }]}
            onChange={(v) =>
              setDraftFilters((f) => ({ ...f, assignedTruck: v }))
            }
          />
          <FieldSelect
            label="Certification Held"
            value={draftFilters.certificationHeld}
            options={
              options?.certifications ?? [{ value: "ANY", label: "Any" }]
            }
            onChange={(v) =>
              setDraftFilters((f) => ({ ...f, certificationHeld: v }))
            }
          />
          <label className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Certification Expiring Within N Days
            </span>
            <input
              value={draftFilters.certExpiringWithinDays}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  certExpiringWithinDays: e.target.value,
                }))
              }
              className="h-9 w-[100px] rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Available On A Date
            </span>
            <input
              type="date"
              value={draftFilters.availableOnDate}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  availableOnDate: e.target.value,
                }))
              }
              className="h-9 rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Has Open Time Edit
            </span>
            <Toggle
              checked={draftFilters.hasOpenTimeEdit}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, hasOpenTimeEdit: v }))
              }
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Missing BBS
            </span>
            <Toggle
              checked={draftFilters.missingBbs}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, missingBbs: v }))
              }
            />
          </label>
        </div>
      </DashboardDrawer>

      <DashboardSaveViewsModal
        open={viewsOpen}
        onClose={() => setViewsOpen(false)}
        views={allViews}
        activeViewId={saved.activeViewId}
        onSelectView={(id) => {
          saved.setActiveViewId(id);
          const view = allViews.find((v) => v.id === id);
          applyViewPayload(view?.payload);
          setViewsOpen(false);
        }}
        onSaveNewView={() => {
          setViewsOpen(false);
          setSaveNewOpen(true);
        }}
        onViewAction={(id, action) => {
          if (action === "delete") void saved.deleteView(id);
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewOpen}
        onClose={() => setSaveNewOpen(false)}
        onConfirm={({ name }) => {
          void saved.createView(name, {
            filters,
            q: debouncedQ,
            sort: sortKey,
            direction: sortDir,
            ...extraQuery,
          });
          setSaveNewOpen(false);
        }}
      />

      <DashboardMenuPopover
        open={Boolean(rowMenu)}
        onClose={() => setRowMenuId(null)}
        anchorRef={rowMenuRef}
        align="right"
        className="min-w-[240px]"
        items={
          rowMenu
            ? [
                {
                  id: "truck",
                  label: "Assign Truck",
                  onSelect: () => {
                    void (async () => {
                      const truck = await askPrompt({
                        title: "Assign Truck",
                        label: "Truck ID",
                        placeholder: "TRK-14",
                        defaultValue: rowMenu.assignedTruck ?? "",
                        confirmLabel: "Assign",
                      });
                      if (truck == null) return;
                      try {
                        await hrApi.updateEmployee(rowMenu.id, {
                          assignedTruck: truck.trim() || null,
                        });
                        toastSuccess("Truck assigned");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "supervisor",
                  label: "Assign Supervisor",
                  onSelect: () => {
                    void (async () => {
                      const supervisorId = await askPrompt({
                        title: "Assign Supervisor",
                        label: "Supervisor employee ID",
                        placeholder: options?.supervisors[1]?.value ?? "",
                        confirmLabel: "Assign",
                      });
                      if (supervisorId == null) return;
                      try {
                        await hrApi.updateEmployee(rowMenu.id, {
                          supervisorId: supervisorId.trim() || null,
                        });
                        toastSuccess("Supervisor assigned");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "add-training",
                  label: "Add Training Record",
                  onSelect: () => {
                    void (async () => {
                      const cert = await askPrompt({
                        title: "Add Training Record",
                        label: "Certification",
                        placeholder: "H2S",
                        confirmLabel: "Add",
                      });
                      if (cert == null) return;
                      try {
                        await hrApi.addEmployeeTraining(rowMenu.id, {
                          name: cert.trim(),
                        });
                        toastSuccess("Training recorded");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "reset-password",
                  label: "Reset Password",
                  onSelect: () => {
                    void (async () => {
                      try {
                        const res = await hrApi.resetEmployeePassword(
                          rowMenu.id,
                        );
                        toastSuccess(res.data.message);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "preview",
                  label: "Preview As This User",
                  onSelect: () => {
                    toastSuccess(
                      `Preview mode · ${rowMenu.name} (session scoped)`,
                    );
                    router.push(`/hr/employees/${rowMenu.id}`);
                  },
                },
                {
                  id: "print",
                  label: "Print Profile",
                  onSelect: () => {
                    router.push(`/hr/employees/${rowMenu.id}?print=1`);
                  },
                },
                {
                  id: "offboard",
                  label: "Start Offboarding",
                  destructive: true,
                  onSelect: () => {
                    setOffboardEmployeeId(rowMenu.id);
                    setOffboardOpen(true);
                  },
                },
              ]
            : []
        }
      />

      <OffboardingChecklistModal
        open={offboardOpen}
        employeeId={offboardEmployeeId}
        onClose={() => {
          setOffboardOpen(false);
          setOffboardEmployeeId(null);
        }}
        onProceed={() => {
          setOffboardOpen(false);
          setTerminateOpen(true);
        }}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
      <TerminationConfirmModal
        open={terminateOpen}
        employeeId={offboardEmployeeId}
        onClose={() => {
          setTerminateOpen(false);
          setOffboardEmployeeId(null);
        }}
        onBackToChecklist={() => {
          setTerminateOpen(false);
          setOffboardOpen(true);
        }}
        onTerminated={() => setReloadKey((k) => k + 1)}
      />

      {dialogs}
    </div>
  );
}
