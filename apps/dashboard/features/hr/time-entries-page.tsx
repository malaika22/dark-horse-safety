"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardDrawer,
  DashboardMenuPopover,
  DashboardPagination,
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
  type HrTimeEntry,
  type HrTimeEntryFilterOptions,
  type HrTimeEntryKpi,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";

type SortKey = "date" | "hours" | "status" | "category";
type TimeFilters = {
  status: string;
  technicianId: string;
  dateFrom: string;
  dateTo: string;
  category: string;
  gpsFlagged: boolean;
  missingClockOut: boolean;
  billable: string;
  locked: string;
};

const DEFAULT_FILTERS: TimeFilters = {
  status: "ANY",
  technicianId: "ANY",
  dateFrom: "",
  dateTo: "",
  category: "ANY",
  gpsFlagged: false,
  missingClockOut: false,
  billable: "ANY",
  locked: "ANY",
};

const EMPTY_KPI: HrTimeEntryKpi = {
  totalEntries: 0,
  techCount: 0,
  pending: 0,
  missingClockOut: 0,
  approved: 0,
  approvedPct: 0,
  locked: 0,
  gpsFlagged: 0,
  gpsFlaggedToday: 0,
  editRequests: 0,
};

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6v12M8 18l-3-3M8 18l3-3M16 18V6M16 6l-3 3M16 6l3 3"
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
        d="M12 3v12M8 11l4 4 4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImportGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21V9M8 13l4-4 4 4M5 3h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
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

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function categoryTone(category: string) {
  const c = category.toUpperCase();
  if (c === "REGULAR") return "text-[#34D399]";
  if (c === "OVERTIME") return "text-[#F59E0B]";
  if (c === "ON_JOB_TRAINING") return "text-[#60A5FA]";
  return "text-[#94A3B8]";
}

function categoryLabel(category: string) {
  return category.replaceAll("_", " ");
}

function sourceTone(source: string) {
  const s = source.toUpperCase();
  if (s === "MOBILE") return "text-[#22C55E]";
  if (s === "IMPORTED") return "text-[#A78BFA]";
  return "text-[#F59E0B]";
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED")
    return "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]";
  if (s === "PENDING")
    return "border-[#E8C47C]/40 bg-[#E8C47C]/15 text-[#E8C47C]";
  if (s === "REJECTED")
    return "border-[#FF6B6B]/40 bg-[#FF6B6B]/20 text-[#FF6B6B]";
  if (s === "MISSING_CO")
    return "border-[#F59E0B]/50 bg-transparent text-[#F59E0B]";
  if (s === "LOCKED")
    return "border-[#5A5A5A] bg-[#2A2A2A] text-[#959597]";
  return "border-[#5A5A5A] text-[#959597]";
}

function statusLabel(status: string) {
  if (status === "MISSING_CO") return "MISSING C.O";
  return status.replaceAll("_", " ");
}

export function TimeEntriesPage() {
  const router = useRouter();
  const { askPrompt, dialogs } = useCrmDialogs();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<HrTimeEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [filters, setFilters] = React.useState<TimeFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] =
    React.useState<TimeFilters>(DEFAULT_FILTERS);
  const [options, setOptions] =
    React.useState<HrTimeEntryFilterOptions | null>(null);
  const [kpi, setKpi] = React.useState<HrTimeEntryKpi>(EMPTY_KPI);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [rowMenuId, setRowMenuId] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [gpsOpen, setGpsOpen] = React.useState<HrTimeEntry | null>(null);

  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const filterKey = React.useMemo(
    () =>
      [
        filters.status,
        filters.technicianId,
        filters.dateFrom,
        filters.dateTo,
        filters.category,
        filters.gpsFlagged ? "1" : "0",
        filters.missingClockOut ? "1" : "0",
        filters.billable,
        filters.locked,
      ].join("|"),
    [filters],
  );

  React.useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [debouncedQ, sortKey, sortDir, filterKey]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, kpiRes, optRes] = await Promise.all([
        hrApi.listTimeEntries({
          page,
          pageSize,
          q: debouncedQ || undefined,
          sort: sortKey,
          direction: sortDir,
          status: filters.status !== "ANY" ? filters.status : undefined,
          technicianId:
            filters.technicianId !== "ANY" ? filters.technicianId : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          category: filters.category !== "ANY" ? filters.category : undefined,
          gpsFlagged: filters.gpsFlagged ? "true" : undefined,
          missingClockOut: filters.missingClockOut ? "true" : undefined,
          billable: filters.billable !== "ANY" ? filters.billable : undefined,
          locked: filters.locked !== "ANY" ? filters.locked : undefined,
        }),
        hrApi.timeEntriesKpi(),
        hrApi.timeEntryFilterOptions(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi(kpiRes.data);
      setOptions(optRes.data);
    } catch (err) {
      toastApiError(err, "Failed to load time entries");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, sortKey, sortDir, filterKey, filters]);

  React.useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DashboardToolbarButton
        leftIcon={<ImportGlyph />}
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            try {
              const res = await hrApi.importGoCanvasTimesheets();
              toastSuccess(res.data.message);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Import GoCanvas Timesheets
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        onClick={() => router.push("/hr/time-edit-requests")}
      >
        Time Edit Requests ({kpi.editRequests})
      </DashboardToolbarButton>
    </div>,
    [busy, kpi.editRequests, router],
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
    if (rows.length > 0 && selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  function handleExport(ids?: string[]) {
    const exportRows =
      ids && ids.length > 0 ? rows.filter((r) => ids.includes(r.id)) : rows;
    const header = [
      "Date",
      "Cycle",
      "Technician",
      "Code",
      "Work Order",
      "Category",
      "Clock In",
      "Clock Out",
      "Source",
      "Hours",
      "Billable",
      "GPS",
      "Status",
    ];
    const lines = exportRows.map((r) =>
      [
        r.date,
        r.cycleLabel,
        r.technician.name,
        r.technician.code,
        r.workOrderCode ?? r.workOrderShort ?? "",
        r.category,
        r.clockIn ?? "",
        r.clockOut ?? "",
        r.source,
        r.hours,
        r.billable ? "BILLABLE" : "NON-BILLABLE",
        r.gpsLabel,
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv([header.join(","), ...lines].join("\n"), "time-entries.csv");
    toastSuccess(`Exported ${exportRows.length} rows`);
  }

  async function approveSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await hrApi.bulkApproveTimeEntries(ids);
      toastSuccess(res.data.message);
      setSelected(new Set());
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function approveAllClean() {
    setBusy(true);
    try {
      const res = await hrApi.approveAllCleanTimeEntries();
      toastSuccess(res.data.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const columns = React.useMemo<DashboardDataTableColumn<HrTimeEntry>[]>(
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
            aria-label={`Select ${row.technician.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        id: "date",
        header: "Date",
        className: "min-w-[120px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              {row.dateLabel}
            </p>
            <p className="mt-0.5 truncate font-sans text-[10px] uppercase text-[#959597]">
              {row.cycleLabel}
            </p>
          </div>
        ),
      },
      {
        id: "technician",
        header: "Technician",
        className: "min-w-[120px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              {row.technician.name}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
              {row.technician.code}
            </p>
          </div>
        ),
      },
      {
        id: "wo",
        header: "Work Order",
        className: "min-w-[120px]",
        cell: (row) =>
          row.workOrderShort || row.workOrderCode ? (
            <div className="min-w-0">
              {row.workOrderShort ? (
                <p className="truncate font-sans text-[12px] uppercase text-[#60A5FA] underline">
                  {row.workOrderShort}
                </p>
              ) : null}
              {row.workOrderCode ? (
                <p className="mt-0.5 truncate font-sans text-[10px] uppercase text-[#60A5FA] underline">
                  {row.workOrderCode}
                </p>
              ) : null}
            </div>
          ) : (
            <span className="font-sans text-[12px] uppercase text-[#FF6B6B]">
              Missing
            </span>
          ),
      },
      {
        id: "category",
        header: "Category",
        className: "min-w-[110px]",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] font-[510] uppercase",
              categoryTone(row.category),
            )}
          >
            {categoryLabel(row.category)}
          </span>
        ),
      },
      {
        id: "clock",
        header: "Clock In/Out",
        className: "min-w-[120px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
              {row.clockIn ?? "—"}
              {row.clockOut ? ` - ${row.clockOut}` : ""}
            </p>
            <p
              className={cn(
                "mt-0.5 font-sans text-[10px] uppercase",
                sourceTone(row.source),
              )}
            >
              {row.source}
            </p>
          </div>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        className: "min-w-[90px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
              {Number(row.hours).toFixed(1)}H
            </p>
            {row.workHours != null || row.travelHours != null ? (
              <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                W {Number(row.workHours ?? 0).toFixed(1)} T{" "}
                {Number(row.travelHours ?? 0).toFixed(1)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "billable",
        header: "Billable",
        className: "min-w-[100px]",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] uppercase",
              row.billable ? "text-[#7DD3FC]" : "text-[#959597]",
            )}
          >
            {row.billable ? "Billable" : "Non-Billable"}
          </span>
        ),
      },
      {
        id: "gps",
        header: "GPS",
        className: "min-w-[70px]",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] font-[510] uppercase",
              row.gpsFlagged ? "text-[#FF6B6B]" : "text-[#22C55E]",
            )}
          >
            {row.gpsLabel}
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
            {statusLabel(row.status)}
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
    [rows, selected],
  );

  const rowMenu = rows.find((r) => r.id === rowMenuId) ?? null;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="rounded-xl border border-divider bg-panel px-4 py-3 sm:px-5">
        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Clock-in categories:{" "}
          <span className="text-[#FDFDFF]">Regular</span>,{" "}
          <span className="text-[#FDFDFF]">On-Job Training</span>,{" "}
          <span className="text-[#FDFDFF]">Non-Billable</span>. GPS flags when
          clock-in is outside the job geofence.
        </p>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          <DashboardStatCell
            title="Total Entries"
            value={String(kpi.totalEntries)}
            meta={`Across ${kpi.techCount} Techs`}
            icon="document"
          />
          <DashboardStatCell
            title="Pending"
            value={String(kpi.pending)}
            meta={`${kpi.missingClockOut} Missing Clock-out`}
            icon="time"
          />
          <DashboardStatCell
            title="Approved"
            value={String(kpi.approved)}
            meta={`${kpi.approvedPct}%`}
            icon="document"
          />
          <DashboardStatCell
            title="Locked"
            value={String(kpi.locked)}
            meta="In Closed Cycle"
            icon="document"
          />
          <DashboardStatCell
            title="GPS Flagged"
            value={String(kpi.gpsFlagged)}
            meta={`+${kpi.gpsFlaggedToday} Today`}
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
                onClick={() => handleExport(Array.from(selected))}
              >
                Export
              </DashboardToolbarButton>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => void approveAllClean()}
              >
                Approve All Clean
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                disabled={busy}
                onClick={() => void approveSelected()}
              >
                Approve Selected
              </DashboardToolbarButton>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technician, work or..."
            className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardToolbarButton
            leftIcon={<FilterIcon />}
            onClick={() => {
              setDraftFilters(filters);
              setFilterOpen(true);
            }}
          >
            Filter
          </DashboardToolbarButton>
          <div className="relative">
            <DashboardToolbarButton
              ref={sortRef}
              leftIcon={<SortIcon />}
              showChevron
              onClick={() => setSortOpen((o) => !o)}
            >
              Sort: Date ({sortDir === "desc" ? "Descending" : "Ascending"})
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              anchorRef={sortRef}
              align="right"
              className="min-w-[200px]"
              items={[
                {
                  id: "date-desc",
                  label: "Date (Descending)",
                  onSelect: () => {
                    setSortKey("date");
                    setSortDir("desc");
                  },
                },
                {
                  id: "date-asc",
                  label: "Date (Ascending)",
                  onSelect: () => {
                    setSortKey("date");
                    setSortDir("asc");
                  },
                },
                {
                  id: "hours",
                  label: "Hours",
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
              ]}
            />
          </div>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy}
            onClick={() => void approveAllClean()}
          >
            Approve All Clean
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
              className="min-w-[160px]"
              items={[
                {
                  id: "csv",
                  label: "Export CSV",
                  onSelect: () => handleExport(),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <BrandLoader label="Loading time entries" />
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            emptyMessage="No time entries found"
            onRowClick={(row) => router.push(`/hr/time-entries/${row.id}`)}
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
                  setFilterOpen(false);
                }}
              >
                Clear All
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                onClick={() => {
                  setFilters(draftFilters);
                  setFilterOpen(false);
                }}
              >
                Apply
              </DashboardToolbarButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4 px-1 py-2">
          <FilterRow label="Status">
            <select
              value={draftFilters.status}
              onChange={(e) =>
                setDraftFilters((p) => ({ ...p, status: e.target.value }))
              }
              className="h-9 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              {(options?.statuses ?? [{ value: "ANY", label: "Any" }]).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </FilterRow>
          <FilterRow label="Technician">
            <select
              value={draftFilters.technicianId}
              onChange={(e) =>
                setDraftFilters((p) => ({
                  ...p,
                  technicianId: e.target.value,
                }))
              }
              className="h-9 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              {(options?.technicians ?? [{ value: "ANY", label: "Any" }]).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </FilterRow>
          <FilterRow label="Date Range">
            <div className="flex gap-2">
              <input
                type="date"
                value={draftFilters.dateFrom}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, dateFrom: e.target.value }))
                }
                className="h-9 w-full rounded-lg border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              />
              <input
                type="date"
                value={draftFilters.dateTo}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, dateTo: e.target.value }))
                }
                className="h-9 w-full rounded-lg border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              />
            </div>
          </FilterRow>
          <FilterRow label="Category">
            <select
              value={draftFilters.category}
              onChange={(e) =>
                setDraftFilters((p) => ({ ...p, category: e.target.value }))
              }
              className="h-9 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              {(options?.categories ?? [{ value: "ANY", label: "Any" }]).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </FilterRow>
          <FilterRow label="GPS Flagged">
            <div className="flex justify-end">
              <Toggle
                checked={draftFilters.gpsFlagged}
                onChange={(v) =>
                  setDraftFilters((p) => ({ ...p, gpsFlagged: v }))
                }
              />
            </div>
          </FilterRow>
          <FilterRow label="Missing Clock-Out">
            <div className="flex justify-end">
              <Toggle
                checked={draftFilters.missingClockOut}
                onChange={(v) =>
                  setDraftFilters((p) => ({ ...p, missingClockOut: v }))
                }
              />
            </div>
          </FilterRow>
          <FilterRow label="Billable / Non-Billable">
            <select
              value={draftFilters.billable}
              onChange={(e) =>
                setDraftFilters((p) => ({ ...p, billable: e.target.value }))
              }
              className="h-9 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              {(options?.billable ?? [{ value: "ANY", label: "Any" }]).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </FilterRow>
          <FilterRow label="Locked">
            <select
              value={draftFilters.locked}
              onChange={(e) =>
                setDraftFilters((p) => ({ ...p, locked: e.target.value }))
              }
              className="h-9 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              {(options?.locked ?? [{ value: "ANY", label: "Any" }]).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </FilterRow>
        </div>
      </DashboardDrawer>

      <DashboardMenuPopover
        open={Boolean(rowMenu)}
        onClose={() => setRowMenuId(null)}
        anchorRef={rowMenuRef}
        align="right"
        className="min-w-[220px]"
        items={
          rowMenu
            ? [
                {
                  id: "detail",
                  label: "Open Detail",
                  onSelect: () =>
                    router.push(`/hr/time-entries/${rowMenu.id}`),
                },
                {
                  id: "correction",
                  label: "Request Correction",
                  onSelect: () => {
                    void (async () => {
                      const reason = await askPrompt({
                        title: "Request Correction",
                        label: "Reason",
                        placeholder: "Describe the correction…",
                        confirmLabel: "Submit",
                      });
                      if (reason == null) return;
                      try {
                        await hrApi.requestTimeEntryCorrection(rowMenu.id, {
                          reason: reason.trim() || undefined,
                        });
                        toastSuccess("Correction requested");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "wo",
                  label: "View Work Order",
                  onSelect: () => {
                    if (!rowMenu.workOrderCode && !rowMenu.workOrderShort) {
                      toastApiError(
                        new Error("No work order linked to this entry"),
                      );
                      return;
                    }
                    toastSuccess(
                      `Work order ${rowMenu.workOrderShort ?? rowMenu.workOrderCode}`,
                    );
                  },
                },
                {
                  id: "gps",
                  label: "View GPS Trail",
                  onSelect: () => setGpsOpen(rowMenu),
                },
                {
                  id: "note",
                  label: "Add Note",
                  onSelect: () => {
                    void (async () => {
                      const text = await askPrompt({
                        title: "Add Note",
                        label: "Note",
                        placeholder: "Enter note…",
                        confirmLabel: "Add",
                      });
                      if (text == null || !text.trim()) return;
                      try {
                        await hrApi.addTimeEntryNote(
                          rowMenu.id,
                          text.trim(),
                        );
                        toastSuccess("Note added");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
              ]
            : []
        }
      />

      <DashboardDrawer
        open={Boolean(gpsOpen)}
        onClose={() => setGpsOpen(null)}
        title="GPS Trail"
        widthClassName="max-w-[420px]"
      >
        {gpsOpen ? (
          <div className="space-y-3 px-1 py-2">
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              {gpsOpen.technician.name} · {gpsOpen.dateLabel} ·{" "}
              {gpsOpen.gpsLabel}
            </p>
            {(gpsOpen.gpsTrail ?? []).length === 0 ? (
              <p className="py-6 text-center font-sans text-[11px] uppercase text-[#959597]">
                No GPS trail points recorded
              </p>
            ) : (
              <ul className="space-y-2">
                {(gpsOpen.gpsTrail ?? []).map((p, idx) => (
                  <li
                    key={`${p.at}-${idx}`}
                    className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2"
                  >
                    <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                      {p.at}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/hr/time-entries/${gpsOpen.id}`}
              className="inline-flex font-sans text-[11px] uppercase text-[#60A5FA] underline"
            >
              Open full detail
            </Link>
          </div>
        ) : null}
      </DashboardDrawer>

      {dialogs}
    </div>
  );
}
