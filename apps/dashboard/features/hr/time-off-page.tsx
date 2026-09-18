"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardDrawer,
  DashboardMenuPopover,
  DashboardModal,
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
  type HrEmployee,
  type HrTimeOffCalendar,
  type HrTimeOffKpi,
  type HrTimeOffRequest,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import {
  ApproveTimeOffModal,
  DenyTimeOffModal,
} from "@/features/hr/time-off-modals";
import { TimeOffCalendarView } from "@/features/hr/time-off-calendar";

type SortKey = "startDate" | "requestedAt" | "status" | "type" | "hours";
type ViewMode = "list" | "calendar";

type Filters = {
  status: string;
  type: string;
  coverage: string;
};

const DEFAULT_FILTERS: Filters = {
  status: "ANY",
  type: "ANY",
  coverage: "ANY",
};

const EMPTY_KPI: HrTimeOffKpi = {
  pending: 0,
  pendingMeta: "Awaiting supervisor approval",
  approved: 0,
  approvedMeta: "Have crossed pay cycles",
  denied: 0,
  deniedMeta: "Eligible to resubmit",
  upcoming: 0,
  upcomingMeta: "Starting within 14 days",
  coverageNeeded: 0,
  coverageNeededMeta: "Shifts without backup coverage",
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

function FilterFunnelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l4 4 10-10"
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
        d="M8 6v12M8 6l-3 3M8 6l3 3M16 18V6M16 18l-3-3M16 18l3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipboardPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4h6v2H9V4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8 6H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v6M9 14h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "offline" as const;
  if (s === "PENDING") return "success" as const;
  if (s === "DENIED") return "warning" as const;
  return "neutral" as const;
}

function RequestTimeOffModal({
  open,
  employees,
  busy,
  onClose,
  onCreated,
}: {
  open: boolean;
  employees: HrEmployee[];
  busy: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [employeeId, setEmployeeId] = React.useState("");
  const [type, setType] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setType("");
    setStartDate("");
    setEndDate("");
    setReason("");
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Request Time Off"
      widthClassName="max-w-lg"
      footer={
        <>
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || !employeeId || !type || !startDate || !endDate}
            onClick={() => {
              void (async () => {
                try {
                  await hrApi.createTimeOff({
                    employeeId,
                    type,
                    startDate,
                    endDate,
                    reason: reason.trim() || undefined,
                  });
                  toastSuccess("Time off requested");
                  onCreated();
                  onClose();
                } catch (err) {
                  toastApiError(err);
                }
              })();
            }}
          >
            Submit Request
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Employee
          </span>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
          >
            <option value="">Select type</option>
            {["PTO", "SICK", "UNPAID", "BEREAVEMENT", "HOLIDAY"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              From
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              To
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Reason (Optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
          />
        </label>
      </div>
    </DashboardModal>
  );
}

export function TimeOffPage() {
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<HrTimeOffKpi>(EMPTY_KPI);
  const [rows, setRows] = React.useState<HrTimeOffRequest[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("startDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [view, setView] = React.useState<ViewMode>("list");
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const [denyId, setDenyId] = React.useState<string | null>(null);
  const [calYear, setCalYear] = React.useState(2026);
  const [calMonth, setCalMonth] = React.useState(6);
  const [calendar, setCalendar] = React.useState<HrTimeOffCalendar | null>(null);
  const [calLoading, setCalLoading] = React.useState(false);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [kpiRes, listRes, empRes] = await Promise.all([
          hrApi.timeOffKpi(),
          hrApi.listTimeOff({
            page,
            pageSize,
            q: debouncedSearch || undefined,
            status: filters.status,
            type: filters.type,
            coverage: filters.coverage,
            sort: sortKey,
            direction: sortDir,
          }),
          hrApi.listEmployees({ pageSize: 100 }),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        setRows(listRes.data.items);
        setTotal(listRes.data.total);
        setEmployees(empRes.data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, filters, sortKey, sortDir, reloadKey]);

  React.useEffect(() => {
    if (view !== "calendar") return;
    let cancelled = false;
    setCalLoading(true);
    void (async () => {
      try {
        const res = await hrApi.timeOffCalendar({
          year: calYear,
          month: calMonth,
          q: debouncedSearch || undefined,
          type: filters.type !== "ANY" ? filters.type : undefined,
          status: filters.status !== "ANY" ? filters.status : undefined,
        });
        if (!cancelled) setCalendar(res.data);
      } catch (err) {
        if (!cancelled) toastApiError(err);
      } finally {
        if (!cancelled) setCalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, calYear, calMonth, debouncedSearch, filters, reloadKey]);

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<ClipboardPlusIcon />}
      className="h-8 shrink-0"
      onClick={() => setRequestOpen(true)}
    >
      Request Time Off
    </DashboardToolbarButton>,
    [],
  );

  const columns = React.useMemo<DashboardDataTableColumn<HrTimeOffRequest>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        className: "min-w-[120px]",
        cell: (row) => (
          <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.employee.name}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {row.type}
          </span>
        ),
      },
      {
        id: "from",
        header: "From",
        cell: (row) => (
          <span className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.startLabel}
          </span>
        ),
      },
      {
        id: "to",
        header: "To",
        cell: (row) => (
          <div>
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {row.endLabel}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
              {row.dayCount} day{row.dayCount === 1 ? "" : "s"}
            </p>
          </div>
        ),
      },
      {
        id: "hours",
        header: "Hours / Days",
        cell: (row) => (
          <div>
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {Number(row.hoursRequested).toFixed(1)}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
              Requested
            </p>
          </div>
        ),
      },
      {
        id: "balance",
        header: "Balance After",
        cell: (row) => (
          <div>
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {row.balanceAfter != null
                ? Number(row.balanceAfter).toFixed(1)
                : "—"}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
              Remaining
            </p>
          </div>
        ),
      },
      {
        id: "coverage",
        header: "Coverage",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]",
              row.coverage === "COVERED" ? "text-[#7A9E8C]" : "text-[#E8A0A0]",
            )}
          >
            {row.coverage}
          </span>
        ),
      },
      {
        id: "requested",
        header: "Requested Date",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {row.requestedLabel}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <DashboardBadge variant={statusVariant(row.status)} pill>
            {row.status}
          </DashboardBadge>
        ),
      },
    ],
    [],
  );

  const sortLabel =
    sortKey === "startDate"
      ? `Notice Start (${sortDir === "asc" ? "Nearest" : "Farthest"})`
      : sortKey === "requestedAt"
        ? "Requested Date"
        : sortKey === "hours"
          ? "Hours"
          : sortKey === "type"
            ? "Type"
            : "Status";

  async function handleExport() {
    setBusy(true);
    try {
      const res = await hrApi.exportTimeOff({
        q: debouncedSearch || undefined,
        status: filters.status,
        type: filters.type,
        coverage: filters.coverage,
        sort: sortKey,
        direction: sortDir,
      });
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
      setExportOpen(false);
    }
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-shell">
        <BrandLoader />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="space-y-3 bg-shell p-5">
        <p className="font-sans text-[12px] uppercase text-[#FF6B6B]">{error}</p>
        <DashboardToolbarButton onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </DashboardToolbarButton>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
        <DashboardStatGrid>
          <DashboardStatRow columns={5}>
            <DashboardStatCell
              title="Pending"
              value={String(kpi.pending)}
              meta={kpi.pendingMeta}
              icon="lightning"
            />
            <DashboardStatCell
              title="Approved"
              value={String(kpi.approved)}
              meta={kpi.approvedMeta}
              icon="document"
            />
            <DashboardStatCell
              title="Denied"
              value={String(kpi.denied)}
              meta={kpi.deniedMeta}
              icon="alert"
            />
            <DashboardStatCell
              title="Upcoming"
              value={String(kpi.upcoming)}
              meta={kpi.upcomingMeta}
              icon="folder"
            />
            <DashboardStatCell
              title="Coverage Needed"
              value={String(kpi.coverageNeeded)}
              meta={kpi.coverageNeededMeta}
              icon="document"
            />
          </DashboardStatRow>
        </DashboardStatGrid>

        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit rounded-lg bg-[#2A2A2A] p-0.5">
            {(["list", "calendar"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "h-8 rounded-md px-3.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] transition-colors",
                  view === mode
                    ? "bg-[#3A3A3A] text-[#FDFDFF]"
                    : "text-[#959597] hover:text-[#C8C8C8]",
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-0 w-full max-w-[360px] flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
                  <SearchIcon />
                </span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search employee, date, or r..."
                  className="h-8 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
                />
              </div>

              <DashboardToolbarButton
                leftIcon={<FilterFunnelIcon />}
                rightIcon={<FilterCheckIcon />}
                className="h-8 shrink-0"
                onClick={() => {
                  setDraftFilters(filters);
                  setFilterOpen(true);
                }}
              >
                Filter
              </DashboardToolbarButton>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <DashboardToolbarButton
                  ref={sortRef}
                  leftIcon={<SortIcon />}
                  className="h-8 shrink-0"
                  onClick={() => setSortOpen((o) => !o)}
                >
                  Sort: {sortLabel}
                </DashboardToolbarButton>
                <DashboardMenuPopover
                  open={sortOpen}
                  onClose={() => setSortOpen(false)}
                  anchorRef={sortRef}
                  align="right"
                  className="min-w-[220px]"
                  items={[
                    {
                      id: "start-asc",
                      label: "Notice Start (Nearest)",
                      onSelect: () => {
                        setSortKey("startDate");
                        setSortDir("asc");
                        setPage(1);
                      },
                    },
                    {
                      id: "start-desc",
                      label: "Notice Start (Farthest)",
                      onSelect: () => {
                        setSortKey("startDate");
                        setSortDir("desc");
                        setPage(1);
                      },
                    },
                    {
                      id: "requested",
                      label: "Requested Date",
                      onSelect: () => {
                        setSortKey("requestedAt");
                        setSortDir("desc");
                        setPage(1);
                      },
                    },
                    {
                      id: "status",
                      label: "Status",
                      onSelect: () => {
                        setSortKey("status");
                        setSortDir("asc");
                        setPage(1);
                      },
                    },
                  ]}
                />
              </div>

              <DashboardToolbarButton
                leftIcon={<ClockIcon />}
                showChevron
                className="h-8 shrink-0"
                onClick={() =>
                  toastSuccess(
                    `${kpi.coverageNeeded} coverage exception${kpi.coverageNeeded === 1 ? "" : "s"} open`,
                  )
                }
              >
                Review Exceptions
              </DashboardToolbarButton>

              <div className="relative">
                <DashboardToolbarButton
                  ref={exportRef}
                  leftIcon={<DownloadIcon />}
                  showChevron
                  disabled={busy}
                  className="h-8 shrink-0"
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
                      onSelect: () => void handleExport(),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {view === "calendar" ? (
          calLoading && !calendar ? (
            <div className="flex justify-center py-16">
              <BrandLoader />
            </div>
          ) : (
            <TimeOffCalendarView
              year={calendar?.year ?? calYear}
              month={calendar?.month ?? calMonth}
              monthLabel={calendar?.monthLabel ?? "—"}
              events={calendar?.events ?? []}
              onPrev={() => {
                if (calMonth === 1) {
                  setCalYear((y) => y - 1);
                  setCalMonth(12);
                } else setCalMonth((m) => m - 1);
              }}
              onNext={() => {
                if (calMonth === 12) {
                  setCalYear((y) => y + 1);
                  setCalMonth(1);
                } else setCalMonth((m) => m + 1);
              }}
              onEventClick={(id) => {
                const row =
                  rows.find((r) => r.id === id) ||
                  calendar?.events.find((e) => e.id === id);
                if (!row) return;
                const status =
                  "status" in row
                    ? row.status
                    : rows.find((r) => r.id === id)?.status;
                if (status === "PENDING") setApproveId(id);
              }}
            />
          )
        ) : (
          <>
            <DashboardDataTable
              columns={columns}
              rows={rows}
              getRowId={(r) => r.id}
              emptyMessage="No time off requests"
              onRowClick={(row) => {
                if (row.status !== "PENDING") return;
                setApproveId(row.id);
              }}
            />
            <DashboardPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <DashboardDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Time Off"
        footer={
          <>
            <DashboardToolbarButton
              onClick={() => {
                setDraftFilters(DEFAULT_FILTERS);
                setFilters(DEFAULT_FILTERS);
                setPage(1);
                setFilterOpen(false);
              }}
            >
              Clear
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                setFilters(draftFilters);
                setPage(1);
                setFilterOpen(false);
              }}
            >
              Apply
            </DashboardToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          {(
            [
              ["status", "Status", ["ANY", "PENDING", "APPROVED", "DENIED"]],
              [
                "type",
                "Type",
                ["ANY", "PTO", "SICK", "UNPAID", "BEREAVEMENT", "HOLIDAY"],
              ],
              ["coverage", "Coverage", ["ANY", "COVERED", "NEEDED"]],
            ] as const
          ).map(([key, label, options]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                {label}
              </span>
              <select
                value={draftFilters[key]}
                onChange={(e) =>
                  setDraftFilters((f) => ({ ...f, [key]: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </DashboardDrawer>

      <RequestTimeOffModal
        open={requestOpen}
        employees={employees}
        busy={busy}
        onClose={() => setRequestOpen(false)}
        onCreated={() => setReloadKey((k) => k + 1)}
      />

      <ApproveTimeOffModal
        open={Boolean(approveId)}
        requestId={approveId}
        busy={busy}
        onClose={() => setApproveId(null)}
        onDeny={() => {
          const id = approveId;
          setApproveId(null);
          if (id) setDenyId(id);
        }}
        onConfirm={(note) => {
          if (!approveId) return;
          void (async () => {
            setBusy(true);
            try {
              await hrApi.approveTimeOff(approveId, note || undefined);
              toastSuccess("Time off approved");
              setApproveId(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />

      <DenyTimeOffModal
        open={Boolean(denyId)}
        requestId={denyId}
        busy={busy}
        onClose={() => setDenyId(null)}
        onConfirm={(reason) => {
          if (!denyId) return;
          void (async () => {
            setBusy(true);
            try {
              await hrApi.denyTimeOff(denyId, reason);
              toastSuccess("Time off denied");
              setDenyId(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </>
  );
}
