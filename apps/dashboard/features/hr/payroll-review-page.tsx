"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
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
  type HrPayrollException,
  type HrPayrollReviewKpi,
  type HrPayrollReviewRow,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  LockPayCycleModal,
  RequestCycleUnlockModal,
  ResolveClockOutModal,
  ResolveDocsModal,
  ResolveEditRequestModal,
  ResolveFormModal,
  ResolveGpsModal,
  ResolveLockedEntryModal,
  type ResolveKind,
} from "@/features/hr/payroll-resolve-modals";

type SortKey = "name" | "gross" | "total" | "status" | "rt";

type Filters = {
  status: string;
  hasExceptions: string;
};

const DEFAULT_FILTERS: Filters = {
  status: "ANY",
  hasExceptions: "ANY",
};

const EMPTY_KPI: HrPayrollReviewKpi = {
  cycleId: "",
  cycleCode: "",
  cycleLabel: "",
  dateRange: "",
  payrollApprovedAt: null,
  banner:
    "Payroll totals come from approved billable time entries. Non-billable time (breaks, travel, standby) is excluded from RT / OT.",
  regularTimeTotal: "0.0H",
  regularTimeMeta: "$0.00",
  overTimeTotal: "0.0H",
  overTimeMeta: "$0.00",
  leaveTotal: "0.0H",
  leaveMeta: "$0.00",
  totalGross: "$0.00",
  totalGrossMeta: "0.0H",
  exceptions: 0,
  exceptionsMeta: "0 Missing Docs",
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
        d="M8 6v12M8 6l-3 3M8 6l3 3M16 18V6M16 18l-3-3M16 18l3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4h6a2 2 0 012 2v1h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h1V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 12.5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExportIcon() {
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

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "READY"
      ? "bg-[#203B2C] text-[#ACEBCE]"
      : s === "REVIEW"
        ? "bg-[#2A2618] text-[#C4A35A]"
        : s === "BLOCK"
          ? "bg-[#3A1515] text-[#FF6B6B]"
          : "bg-[#2A2A2A] text-[#959597]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone,
      )}
    >
      {s}
    </span>
  );
}

function ExceptionChip({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const colors =
    tone === "danger"
      ? "bg-[#3A1515] text-[#FF6B6B]"
      : tone === "info"
        ? "bg-[#1A2744] text-[#8BB4FF]"
        : "bg-[#2A2618] text-[#C4A35A]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        colors,
      )}
    >
      {label}
    </button>
  );
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PayrollReviewPage() {
  const router = useRouter();
  const [kpi, setKpi] = React.useState<HrPayrollReviewKpi>(EMPTY_KPI);
  const [rows, setRows] = React.useState<HrPayrollReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(25);
  const [total, setTotal] = React.useState(0);
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);

  const [resolveKind, setResolveKind] = React.useState<ResolveKind | null>(
    null,
  );
  const [resolveTargetId, setResolveTargetId] = React.useState<string | null>(
    null,
  );
  const [resolveMeta, setResolveMeta] = React.useState("");
  const [resolvePayload, setResolvePayload] = React.useState<
    Record<string, string>
  >({});
  const [lockOpen, setLockOpen] = React.useState(false);
  const [unlockOpen, setUnlockOpen] = React.useState(false);
  const [lockPreview, setLockPreview] = React.useState<{
    cycleId: string;
    cycle: string;
    dateRange: string;
    employees: string;
    totalHours: string;
    grossTotal: string;
    unresolved: Array<{
      id: string;
      label: string;
      count: number;
      tone: string;
    }>;
    warning: string;
  } | null>(null);
  const [unlockPreview, setUnlockPreview] = React.useState<{
    cycleId: string;
    metaLine: string;
    exportedBadge: string;
    entry: {
      lockedOn: string;
      lockedBy: string;
      payrollExported: string;
    };
  } | null>(null);

  useSetHeaderBreadcrumb("Employees & HR / Payroll Review");

  const closeResolve = React.useCallback(() => {
    setResolveKind(null);
    setResolveTargetId(null);
    setResolveMeta("");
    setResolvePayload({});
  }, []);

  const openResolve = React.useCallback(
    async (ex: HrPayrollException) => {
      const kind = (ex.kind || ex.id) as ResolveKind;
      const targetId = ex.targetId;
      if (!targetId) {
        toastApiError(new Error("Missing resolve target"));
        return;
      }
      setBusy(true);
      try {
        const res = await hrApi.payrollResolveContext(kind, targetId);
        const data = res.data as Record<string, unknown>;
        const entry = (data.entry as Record<string, string> | undefined) ?? {};
        setResolveKind(kind);
        setResolveTargetId(targetId);
        setResolveMeta(String(data.metaLine ?? ""));
        setResolvePayload({
          issue: entry.issue ?? "",
          clockIn: entry.clockIn ?? "",
          clockOut: entry.clockOut ?? "",
          original: entry.original ?? "",
          requested: entry.requested ?? "",
          difference: entry.difference ?? "",
          deltaLabel: entry.deltaLabel ?? entry.difference ?? "",
          missingDocuments: entry.missingDocuments ?? "",
          outstanding: entry.outstanding ?? "",
          impact: entry.impact ?? "",
          form: entry.form ?? "",
          status: entry.status ?? "",
          location: entry.location ?? "",
          jobSite: entry.jobSite ?? "",
          flagReason: entry.flagReason ?? "",
          lockedOn: entry.lockedOn ?? "",
          payrollExported: entry.payrollExported ?? "",
        });
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  async function openLockModal() {
    setBusy(true);
    try {
      const res = await hrApi.payrollLockPreview(kpi.cycleId || undefined);
      setLockPreview(res.data);
      setLockOpen(true);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function openUnlockModal() {
    setBusy(true);
    try {
      const res = await hrApi.payrollUnlockPreview(kpi.cycleId || undefined);
      setUnlockPreview(res.data);
      setUnlockOpen(true);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, filters, sortKey, sortDir]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [kpiRes, listRes] = await Promise.all([
          hrApi.payrollReviewKpi(),
          hrApi.listPayrollReview({
            q: debouncedQ || undefined,
            page,
            pageSize,
            sort: sortKey,
            direction: sortDir,
            status: filters.status !== "ANY" ? filters.status : undefined,
            hasExceptions:
              filters.hasExceptions !== "ANY"
                ? filters.hasExceptions
                : undefined,
          }),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        setRows(listRes.data.items);
        setTotal(listRes.data.total);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, page, pageSize, sortKey, sortDir, filters, reloadKey]);

  const generateReport = React.useCallback(() => {
    void (async () => {
      setBusy(true);
      try {
        const res = await hrApi.generatePayrollReport(kpi.cycleId || undefined);
        downloadCsv(res.data.csv, res.data.filename);
        toastSuccess("Payroll report generated");
        setReloadKey((k) => k + 1);
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, [kpi.cycleId]);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DashboardToolbarButton disabled={busy} onClick={() => void openLockModal()}>
        Lock Cycle
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<GridIcon />}
        disabled={busy}
        onClick={generateReport}
      >
        Generate Payroll Report
      </DashboardToolbarButton>
    </div>,
    [busy, generateReport, kpi.cycleId],
  );

  async function approvePayroll() {
    setBusy(true);
    try {
      const res = await hrApi.approvePayrollReview(kpi.cycleId || undefined);
      toastSuccess(res.data.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function exportList() {
    setBusy(true);
    try {
      const res = await hrApi.exportPayrollReview({
        q: debouncedQ || undefined,
        status: filters.status !== "ANY" ? filters.status : undefined,
        hasExceptions:
          filters.hasExceptions !== "ANY" ? filters.hasExceptions : undefined,
        sort: sortKey,
        direction: sortDir,
      });
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export ready");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
      setExportOpen(false);
    }
  }

  const sortLabel =
    sortKey === "gross"
      ? "Gross"
      : sortKey === "total"
        ? "Total Hours"
        : sortKey === "status"
          ? "Status"
          : sortKey === "rt"
            ? "Regular Time"
            : "Employee";

  const columns = React.useMemo<DashboardDataTableColumn<HrPayrollReviewRow>[]>(
    () => [
      {
        id: "employ",
        header: "Employ",
        className: "min-w-[140px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {row.name}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
              {row.code}
            </p>
          </div>
        ),
      },
      {
        id: "rt",
        header: "RT",
        align: "right",
        cell: (row) => row.rtHours.toFixed(1),
      },
      {
        id: "ot",
        header: "OT",
        align: "right",
        cell: (row) => row.otHours.toFixed(1),
      },
      {
        id: "holiday",
        header: "Holiday (Hrs)",
        align: "right",
        className: "min-w-[100px]",
        cell: (row) => row.holidayHours.toFixed(1),
      },
      {
        id: "sick",
        header: "Sick (Hrs)",
        align: "right",
        cell: (row) => row.sickHours.toFixed(1),
      },
      {
        id: "vacation",
        header: "Vacation (Hrs)",
        align: "right",
        className: "min-w-[110px]",
        cell: (row) => row.vacationHours.toFixed(1),
      },
      {
        id: "total",
        header: "Total",
        align: "right",
        cell: (row) => row.totalHours.toFixed(1),
      },
      {
        id: "gross",
        header: "Gross",
        align: "right",
        cell: (row) => money(row.gross),
      },
      {
        id: "exceptions",
        header: "Exceptions",
        className: "min-w-[160px]",
        cell: (row) =>
          row.exceptions.length === 0 ? (
            <span className="text-[#959597]">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {row.exceptions.map((ex) => (
                <ExceptionChip
                  key={`${row.id}-${ex.id}`}
                  label={ex.label}
                  tone={ex.tone}
                  onClick={(e) => {
                    e.stopPropagation();
                    void openResolve(ex);
                  }}
                />
              ))}
            </div>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <StatusPill status={row.status} />,
      },
    ],
    [openResolve],
  );

  if (loading && rows.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="rounded-xl border border-divider bg-panel px-4 py-3 sm:px-5">
        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
          {kpi.banner}
        </p>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          <DashboardStatCell
            title="Regular Time Total"
            value={kpi.regularTimeTotal}
            meta={kpi.regularTimeMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Over Time Total"
            value={kpi.overTimeTotal}
            meta={kpi.overTimeMeta}
            icon="time"
          />
          <DashboardStatCell
            title="PTO / Sick / Hol."
            value={kpi.leaveTotal}
            meta={kpi.leaveMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Total Gross"
            value={kpi.totalGross}
            meta={kpi.totalGrossMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Exceptions"
            value={String(kpi.exceptions)}
            meta={kpi.exceptionsMeta}
            icon="alert"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search critical dates"
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
              Sort: {sortLabel}
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              anchorRef={sortRef}
              align="right"
              className="min-w-[200px]"
              items={[
                {
                  id: "name",
                  label: "Employee",
                  onSelect: () => {
                    setSortKey("name");
                    setSortDir("asc");
                  },
                },
                {
                  id: "rt",
                  label: "Regular Time",
                  onSelect: () => {
                    setSortKey("rt");
                    setSortDir("desc");
                  },
                },
                {
                  id: "total",
                  label: "Total Hours",
                  onSelect: () => {
                    setSortKey("total");
                    setSortDir("desc");
                  },
                },
                {
                  id: "gross",
                  label: "Gross",
                  onSelect: () => {
                    setSortKey("gross");
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
            leftIcon={<ClipboardCheckIcon />}
            disabled={busy}
            onClick={() => void approvePayroll()}
          >
            Approve Payroll Total
          </DashboardToolbarButton>
          <div className="relative">
            <DashboardToolbarButton
              ref={exportRef}
              leftIcon={<ExportIcon />}
              showChevron
              disabled={busy}
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
                {
                  id: "csv",
                  label: "Export CSV",
                  onSelect: () => {
                    void exportList();
                  },
                },
              ]}
            />
          </div>
        </div>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        emptyMessage="No payroll rows for this cycle"
        onRowClick={(row) => router.push(`/hr/employees/${row.employeeId}`)}
      />

      <DashboardPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

      <DashboardModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Payroll"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton
              onClick={() => {
                setDraftFilters(DEFAULT_FILTERS);
                setFilters(DEFAULT_FILTERS);
                setFilterOpen(false);
              }}
            >
              Clear
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
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Status
            </span>
            <select
              value={draftFilters.status}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              <option value="ANY">Any</option>
              <option value="READY">Ready</option>
              <option value="REVIEW">Review</option>
              <option value="BLOCK">Block</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Exceptions
            </span>
            <select
              value={draftFilters.hasExceptions}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  hasExceptions: e.target.value,
                }))
              }
              className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              <option value="ANY">Any</option>
              <option value="YES">Has Exceptions</option>
              <option value="NO">No Exceptions</option>
            </select>
          </label>
        </div>
      </DashboardModal>
    </div>

    <ResolveClockOutModal
      open={resolveKind === "clock-out"}
      busy={busy}
      metaLine={resolveMeta}
      issue={resolvePayload.issue}
      clockIn={resolvePayload.clockIn}
      clockOutDisplay={resolvePayload.clockOut}
      onClose={closeResolve}
      onAskEmployee={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollAskEmployee(resolveTargetId);
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onEnterClockOut={(clockOut) => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollResolveClockOut(
              resolveTargetId,
              clockOut,
            );
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <ResolveEditRequestModal
      open={resolveKind === "edit"}
      busy={busy}
      metaLine={resolveMeta}
      original={resolvePayload.original}
      requested={resolvePayload.requested}
      difference={resolvePayload.difference}
      approveLabel={
        resolvePayload.deltaLabel
          ? `Approve ${resolvePayload.deltaLabel}`
          : "Approve"
      }
      onClose={closeResolve}
      onClarify={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            await hrApi.clarifyTimeEditRequest(
              resolveTargetId,
              "Please clarify this time edit for payroll.",
            );
            toastSuccess("Clarification requested");
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onReject={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            await hrApi.rejectTimeEditRequest(
              resolveTargetId,
              "Rejected from payroll review",
            );
            toastSuccess("Edit request rejected");
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onApprove={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            await hrApi.approveTimeEditRequest(resolveTargetId);
            toastSuccess("Edit request approved");
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <ResolveDocsModal
      open={resolveKind === "docs"}
      busy={busy}
      metaLine={resolveMeta}
      missingDocuments={resolvePayload.missingDocuments}
      outstanding={resolvePayload.outstanding}
      impact={resolvePayload.impact}
      onClose={closeResolve}
      onUpload={() => toastSuccess("Upload opens from employee documents")}
      onMarkResolved={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollResolveDocs(resolveTargetId);
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <ResolveFormModal
      open={resolveKind === "form"}
      busy={busy}
      metaLine={resolveMeta}
      form={resolvePayload.form}
      status={resolvePayload.status}
      impact={resolvePayload.impact}
      onClose={closeResolve}
      onNotify={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollAskEmployee(
              resolveTargetId,
              "Please complete the required form for payroll.",
            );
            toastSuccess(res.data.message);
            closeResolve();
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onMarkComplete={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollResolveForm(resolveTargetId);
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <ResolveGpsModal
      open={resolveKind === "gps"}
      busy={busy}
      metaLine={resolveMeta}
      location={resolvePayload.location}
      jobSite={resolvePayload.jobSite}
      flagReason={resolvePayload.flagReason}
      onClose={closeResolve}
      onMarkError={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollResolveGps(
              resolveTargetId,
              "error",
            );
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onConfirm={() => {
        if (!resolveTargetId) return;
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollResolveGps(
              resolveTargetId,
              "confirm",
            );
            toastSuccess(res.data.message);
            closeResolve();
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <ResolveLockedEntryModal
      open={resolveKind === "locked"}
      busy={busy}
      metaLine={resolveMeta}
      lockedOn={resolvePayload.lockedOn}
      payrollExported={resolvePayload.payrollExported}
      impact={resolvePayload.impact}
      onClose={closeResolve}
      onRequestUnlock={() => {
        closeResolve();
        void openUnlockModal();
      }}
    />

    <LockPayCycleModal
      open={lockOpen}
      busy={busy}
      cycle={lockPreview?.cycle ?? ""}
      dateRange={lockPreview?.dateRange ?? ""}
      employees={lockPreview?.employees ?? ""}
      totalHours={lockPreview?.totalHours ?? ""}
      grossTotal={lockPreview?.grossTotal ?? ""}
      unresolved={lockPreview?.unresolved ?? []}
      warning={lockPreview?.warning ?? ""}
      onClose={() => setLockOpen(false)}
      onViewException={(id) => {
        setLockOpen(false);
        if (id === "time-off") router.push("/hr/time-off");
        else if (id === "gps") {
          setFilters((f) => ({ ...f, hasExceptions: "YES" }));
        } else {
          setFilters((f) => ({ ...f, status: "BLOCK" }));
        }
      }}
      onLock={() => {
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollLockCycle(kpi.cycleId || undefined);
            toastSuccess(res.data.message);
            setLockOpen(false);
            setReloadKey((k) => k + 1);
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />

    <RequestCycleUnlockModal
      open={unlockOpen}
      busy={busy}
      metaLine={unlockPreview?.metaLine ?? ""}
      lockedOn={unlockPreview?.entry.lockedOn ?? ""}
      lockedBy={unlockPreview?.entry.lockedBy ?? ""}
      payrollExported={unlockPreview?.entry.payrollExported ?? ""}
      exportedBadge={unlockPreview?.exportedBadge ?? ""}
      onClose={() => setUnlockOpen(false)}
      onSubmit={(reason) => {
        void (async () => {
          setBusy(true);
          try {
            const res = await hrApi.payrollUnlockRequest(
              reason,
              unlockPreview?.cycleId || kpi.cycleId || undefined,
            );
            toastSuccess(res.data.message);
            setUnlockOpen(false);
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
