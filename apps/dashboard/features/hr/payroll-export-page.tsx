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
import { downloadCsv, hrApi } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  ConfirmPayrollExportModal,
  ExportCreatedModal,
  ExportFailedModal,
} from "@/features/hr/payroll-export-modals";

type ExportRow = {
  id: string;
  employeeId: string;
  name: string;
  code: string;
  exportCode: string;
  cycleCode: string;
  rtHours: number;
  otHours: number;
  ptoHours: number;
  ptoDays: number;
  gross: number;
  adpCode: string;
  batchCode: string;
  reviewerName: string;
  status: string;
};

type ExportKpi = {
  cycleId: string;
  cycleCode: string;
  ready: number;
  readyMeta: string;
  exported: number;
  exportedMeta: string;
  holds: number;
  holdsMeta: string;
  errors: number;
  errorsMeta: string;
  gross: string;
  grossMeta: string;
};

const EMPTY_KPI: ExportKpi = {
  cycleId: "",
  cycleCode: "",
  ready: 0,
  readyMeta: "Approved and ready to export",
  exported: 0,
  exportedMeta: "Have crossed pay cycles",
  holds: 0,
  holdsMeta: "Missing time approval",
  errors: 0,
  errorsMeta: "Missing required fields",
  gross: "$0.00",
  grossMeta: "Before deductions, this cycle",
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

function SheetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "READY"
      ? "bg-[#2A2040] text-[#C4B5FD]"
      : s === "EXPORTED"
        ? "bg-[#1E1B4B] text-[#A5B4FC]"
        : s === "HOLD"
          ? "bg-[#203B2C] text-[#ACEBCE]"
          : s === "ERROR"
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

function money(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function PayrollExportPage() {
  const router = useRouter();
  const [kpi, setKpi] = React.useState<ExportKpi>(EMPTY_KPI);
  const [rows, setRows] = React.useState<ExportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("ANY");
  const [sortKey, setSortKey] = React.useState("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [rowMenu, setRowMenu] = React.useState<ExportRow | null>(null);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);
  const reviewRef = React.useRef<HTMLButtonElement>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{
    payCycle: string;
    employeeCount: string;
    totalHours: string;
    grossTotal: string;
    fileFormat: string;
    destination: string;
    warning: string | null;
    cycleId: string;
  } | null>(null);
  const [createdOpen, setCreatedOpen] = React.useState(false);
  const [created, setCreated] = React.useState<{
    csv: string;
    filename: string;
    file: string;
    payCycle: string;
    employees: number;
    grossTotal: string;
    timestamp: string;
    warning: string | null;
    cycleId: string;
  } | null>(null);
  const [failedOpen, setFailedOpen] = React.useState(false);
  const [failedReason, setFailedReason] = React.useState("");
  const [failedLog, setFailedLog] = React.useState("");

  useSetHeaderBreadcrumb("Employees & HR / Payroll Export");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, sortKey, sortDir]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [kpiRes, listRes] = await Promise.all([
          hrApi.adpExportKpi(),
          hrApi.listAdpExport({
            q: debouncedQ || undefined,
            page,
            pageSize: 25,
            sort: sortKey,
            direction: sortDir,
            status: statusFilter !== "ANY" ? statusFilter : undefined,
          }),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        setRows(listRes.data.items as ExportRow[]);
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
  }, [debouncedQ, page, statusFilter, sortKey, sortDir, reloadKey]);

  const openConfirm = React.useCallback(() => {
    void (async () => {
      setBusy(true);
      try {
        const res = await hrApi.adpExportConfirm(kpi.cycleId || undefined);
        setConfirm({
          payCycle: res.data.payCycle,
          employeeCount: res.data.employeeCount,
          totalHours: res.data.totalHours,
          grossTotal: res.data.grossTotal,
          fileFormat: res.data.fileFormat,
          destination: res.data.destination,
          warning: res.data.warning,
          cycleId: res.data.cycleId ?? kpi.cycleId,
        });
        setConfirmOpen(true);
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, [kpi.cycleId]);

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<SheetIcon />}
      disabled={busy}
      onClick={openConfirm}
    >
      Export to ADP
    </DashboardToolbarButton>,
    [busy, openConfirm],
  );

  async function runExport() {
    setBusy(true);
    try {
      const res = await hrApi.adpExportNow(
        confirm?.cycleId || kpi.cycleId || undefined,
      );
      setConfirmOpen(false);
      if (!res.data.ok) {
        setFailedReason(res.data.errorReason || "Export failed");
        setFailedLog(res.data.log || "");
        setFailedOpen(true);
        return;
      }
      setCreated({
        csv: res.data.csv || "",
        filename: res.data.filename || res.data.file || "payroll-export.csv",
        file: res.data.file || res.data.filename || "",
        payCycle: res.data.payCycle || "",
        employees: res.data.employees || 0,
        grossTotal: res.data.grossTotal || "",
        timestamp: res.data.timestamp || "",
        warning: res.data.warning,
        cycleId: res.data.cycleId || kpi.cycleId,
      });
      setCreatedOpen(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const columns = React.useMemo<DashboardDataTableColumn<ExportRow>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        className: "min-w-[130px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
              {row.name}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase underline text-[#959597]">
              {row.exportCode}
            </p>
          </div>
        ),
      },
      {
        id: "cycle",
        header: "Cycle",
        cell: (row) => row.cycleCode,
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
        id: "pto",
        header: "PTO",
        align: "right",
        cell: (row) => (
          <div className="text-right">
            <p>{row.ptoHours.toFixed(1)}</p>
            <p className="mt-0.5 text-[10px] text-[#959597]">
              {row.ptoDays} Days
            </p>
          </div>
        ),
      },
      {
        id: "gross",
        header: "Gross",
        align: "right",
        cell: (row) => (
          <div className="text-right">
            <p>{money(row.gross)}</p>
            <p className="mt-0.5 text-[10px] text-[#959597]">Reviewer</p>
          </div>
        ),
      },
      {
        id: "adp",
        header: "ADP Code",
        cell: (row) => (
          <span className="uppercase text-[#6B9EFF] underline">{row.adpCode}</span>
        ),
      },
      {
        id: "batch",
        header: "Batch",
        cell: (row) => row.batchCode,
      },
      {
        id: "reviewer",
        header: "Reviewer",
        cell: (row) => row.reviewerName,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <StatusPill status={row.status} />,
      },
      {
        id: "actions",
        header: "",
        className: "w-10",
        cell: (row) => (
          <button
            type="button"
            ref={row.id === rowMenu?.id ? rowMenuRef : undefined}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
            onClick={(e) => {
              e.stopPropagation();
              setRowMenu((cur) => (cur?.id === row.id ? null : row));
            }}
            aria-label="Row actions"
          >
            ⋮
          </button>
        ),
      },
    ],
    [rowMenu?.id],
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
        <DashboardStatGrid>
          <DashboardStatRow columns={5}>
            <DashboardStatCell
              title="Ready"
              value={String(kpi.ready)}
              meta={kpi.readyMeta}
              icon="lightning"
            />
            <DashboardStatCell
              title="Exported"
              value={String(kpi.exported)}
              meta={kpi.exportedMeta}
              icon="folder"
            />
            <DashboardStatCell
              title="Holds"
              value={String(kpi.holds)}
              meta={kpi.holdsMeta}
              icon="time"
            />
            <DashboardStatCell
              title="Errors"
              value={String(kpi.errors)}
              meta={kpi.errorsMeta}
              icon="document"
            />
            <DashboardStatCell
              title="Gross"
              value={kpi.gross}
              meta={kpi.grossMeta}
              icon="alert"
            />
          </DashboardStatRow>
        </DashboardStatGrid>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-[380px]">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, pay cycle,…"
              className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardToolbarButton
              leftIcon={<FilterIcon />}
              onClick={() => setFilterOpen(true)}
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
                Sort: {sortKey === "gross" ? "Gross" : sortKey === "status" ? "Status" : "Employee"}
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={sortOpen}
                onClose={() => setSortOpen(false)}
                anchorRef={sortRef}
                align="right"
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
            <div className="relative">
              <DashboardToolbarButton
                ref={reviewRef}
                leftIcon={<SearchIcon />}
                showChevron
                onClick={() => setReviewOpen((o) => !o)}
              >
                Review Exceptions
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                anchorRef={reviewRef}
                align="right"
                items={[
                  {
                    id: "holds",
                    label: "View Holds",
                    onSelect: () => setStatusFilter("HOLD"),
                  },
                  {
                    id: "errors",
                    label: "View Errors",
                    onSelect: () => setStatusFilter("ERROR"),
                  },
                  {
                    id: "review-page",
                    label: "Open Payroll Review",
                    onSelect: () => router.push("/hr/payroll-review"),
                  },
                ]}
              />
            </div>
            <div className="relative">
              <DashboardToolbarButton
                ref={exportRef}
                leftIcon={<ExportGlyph />}
                showChevron
                disabled={busy}
                onClick={() => setExportMenuOpen((o) => !o)}
              >
                Export
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={exportMenuOpen}
                onClose={() => setExportMenuOpen(false)}
                anchorRef={exportRef}
                align="right"
                items={[
                  {
                    id: "adp",
                    label: "Export to ADP",
                    onSelect: () => openConfirm(),
                  },
                  {
                    id: "csv",
                    label: "Download Table CSV",
                    onSelect: () => {
                      const header = [
                        "Employee",
                        "Code",
                        "Cycle",
                        "RT",
                        "OT",
                        "PTO",
                        "Gross",
                        "ADP",
                        "Batch",
                        "Reviewer",
                        "Status",
                      ];
                      const lines = [
                        header.join(","),
                        ...rows.map((r) =>
                          [
                            `"${r.name}"`,
                            r.code,
                            r.cycleCode,
                            r.rtHours,
                            r.otHours,
                            r.ptoHours,
                            r.gross,
                            r.adpCode,
                            r.batchCode,
                            `"${r.reviewerName}"`,
                            r.status,
                          ].join(","),
                        ),
                      ];
                      downloadCsv(lines.join("\n"), "payroll-export-table.csv");
                      toastSuccess("Export ready");
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            emptyMessage="No payroll export rows"
            onRowClick={(row) => router.push(`/hr/employees/${row.employeeId}`)}
          />
          <DashboardMenuPopover
            open={Boolean(rowMenu)}
            onClose={() => setRowMenu(null)}
            anchorRef={rowMenuRef}
            align="right"
            items={
              rowMenu
                ? [
                    {
                      id: "employee",
                      label: "Open Employee",
                      onSelect: () =>
                        router.push(`/hr/employees/${rowMenu.employeeId}`),
                    },
                    {
                      id: "review",
                      label: "Payroll Review",
                      onSelect: () => router.push("/hr/payroll-review"),
                    },
                  ]
                : []
            }
          />
        </div>

        <DashboardPagination
          page={page}
          pageSize={25}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <DashboardModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Export"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton
              onClick={() => {
                setStatusFilter("ANY");
                setFilterOpen(false);
              }}
            >
              Clear
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => setFilterOpen(false)}
            >
              Apply
            </DashboardToolbarButton>
          </div>
        }
      >
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
          >
            <option value="ANY">Any</option>
            <option value="READY">Ready</option>
            <option value="EXPORTED">Exported</option>
            <option value="HOLD">Hold</option>
            <option value="ERROR">Error</option>
          </select>
        </label>
      </DashboardModal>

      <ConfirmPayrollExportModal
        open={confirmOpen}
        busy={busy}
        payCycle={confirm?.payCycle ?? ""}
        employeeCount={confirm?.employeeCount ?? ""}
        totalHours={confirm?.totalHours ?? ""}
        grossTotal={confirm?.grossTotal ?? ""}
        fileFormat={confirm?.fileFormat ?? ""}
        destination={confirm?.destination ?? ""}
        warning={confirm?.warning}
        onClose={() => setConfirmOpen(false)}
        onReviewExceptions={() => {
          setConfirmOpen(false);
          router.push("/hr/payroll-review");
        }}
        onExportNow={() => void runExport()}
      />

      <ExportCreatedModal
        open={createdOpen}
        busy={busy}
        file={created?.file ?? ""}
        payCycle={created?.payCycle ?? ""}
        employees={created?.employees ?? "—"}
        grossTotal={created?.grossTotal ?? ""}
        timestamp={created?.timestamp ?? ""}
        warning={created?.warning}
        onClose={() => setCreatedOpen(false)}
        onViewHistory={() => {
          setCreatedOpen(false);
          setStatusFilter("EXPORTED");
        }}
        onLockCycle={() => {
          setCreatedOpen(false);
          void (async () => {
            setBusy(true);
            try {
              const res = await hrApi.payrollLockCycle(
                created?.cycleId || undefined,
              );
              toastSuccess(res.data.message);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
        onDownload={() => {
          if (!created?.csv) return;
          downloadCsv(created.csv, created.filename);
          toastSuccess("Download started");
        }}
      />

      <ExportFailedModal
        open={failedOpen}
        busy={busy}
        errorReason={failedReason}
        onClose={() => setFailedOpen(false)}
        onContactSupport={() =>
          toastSuccess("Support contacted for export failure")
        }
        onViewLog={() =>
          toastSuccess(failedLog || "No additional log available")
        }
        onRetry={() => {
          setFailedOpen(false);
          openConfirm();
        }}
      />
    </>
  );
}
