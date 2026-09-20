"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardPagination,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type SalesTicket,
  type SalesTicketQueueKpi,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

const EMPTY_KPI: SalesTicketQueueKpi = {
  waitingReview: 0,
  returned: 0,
  adjusted: 0,
  total: 0,
  approvedValue: 0,
  approvedValueLabel: "$0",
  periodLabel: "CURRENT BILLING PERIOD",
  billedHours: 0,
  billableHours: 0,
  underbilledHours: 0,
  matched: 0,
  matchedPct: 0,
  needsReview: 0,
  needsReviewMeta: "",
};

function reconTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("UNDER")) return "bg-[#3A3218] text-[#E8C547]";
  if (s.includes("OVER") || s.includes("MISSING") || s.includes("NOT BILL"))
    return "bg-[#3A1C1C] text-[#E86A6A]";
  if (s.includes("BILLED")) return "bg-[#1C3A2A] text-[#5ECF8E]";
  return "bg-[#2A2A2A] text-[#959597]";
}

function approvalTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("APPROVED")) return "border-[#3D8B6E] text-[#5ECF8E]";
  if (s.includes("CORRECTION")) return "border-[#C47A3A] text-[#E8A05C]";
  if (s.includes("PENDING")) return "border-[#C4A83A] text-[#E8C547]";
  if (s.includes("REJECTED")) return "border-[#B84A4A] text-[#E86A6A]";
  if (s.includes("DRAFT")) return "border-[#7A5CA8] text-[#B794F4]";
  return "border-[#3E3E3E] text-[#959597]";
}

function netsuiteTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("SENT")) return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s.includes("READY")) return "bg-[#2A3218] text-[#A8C45C]";
  if (s.includes("CORRECTED")) return "bg-[#3A1C1C] text-[#E86A6A]";
  return "bg-[#2A2520] text-[#A89070]";
}

export function SalesTicketsPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sort, setSort] = React.useState("date");
  const [rows, setRows] = React.useState<SalesTicket[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [kpi, setKpi] = React.useState<SalesTicketQueueKpi>(EMPTY_KPI);
  const [creating, setCreating] = React.useState(false);

  useSetHeaderBreadcrumb("Operations / Sales Ticket Review Queue");
  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      disabled={creating}
      onClick={() => {
        void (async () => {
          setCreating(true);
          try {
            const res = await operationsApi.createSalesTicketFromWorkOrder();
            toastSuccess(`Created ${res.data.code}`);
            router.push(`/operations/sales-tickets/${res.data.id}`);
          } catch (err) {
            toastApiError(err);
          } finally {
            setCreating(false);
          }
        })();
      }}
    >
      + Create From Work Order
    </DashboardToolbarButton>,
    [creating, router],
  );

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const listRes = await operationsApi.listSalesTickets({
          q: q || undefined,
          page,
          pageSize,
          sort,
        });
        if (cancelled) return;
        setRows(listRes.data.items);
        setTotal(listRes.data.total);
        setKpi(listRes.kpi);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load sales tickets.");
          setRows([]);
          setTotal(0);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, page, pageSize, sort, reloadKey]);

  const columns = React.useMemo<DashboardDataTableColumn<SalesTicket>[]>(
    () => [
      {
        id: "wo",
        header: "WO Number",
        className: "min-w-[140px]",
        cell: (row) => (
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/operations/sales-tickets/${row.id}`}
                className="font-sans text-[12px] uppercase text-[#8B9BB4] underline underline-offset-2 hover:text-[#FDFDFF]"
                onClick={(e) => e.stopPropagation()}
              >
                {row.code}
              </Link>
              {row.stMissing ? (
                <span className="rounded bg-[#3A1C1C] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#E86A6A]">
                  Missing
                </span>
              ) : null}
            </div>
            {row.workOrderCode ? (
              <Link
                href={
                  row.workOrderId
                    ? `/operations/work-orders/${row.workOrderId}`
                    : `/operations/sales-tickets/${row.id}`
                }
                className="font-sans text-[11px] uppercase text-[#6F6F72] underline underline-offset-2 hover:text-[#FDFDFF]"
                onClick={(e) => e.stopPropagation()}
              >
                {row.workOrderCode}
              </Link>
            ) : null}
          </div>
        ),
      },
      {
        id: "cust",
        header: "Customer / Location",
        className: "min-w-[180px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.locationLabel ?? row.customerName}
          </span>
        ),
      },
      {
        id: "tech",
        header: "Assigned Tech",
        className: "min-w-[130px]",
        cell: (row) => (
          <div>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.techName ?? row.employeeName ?? "—"}
              {(row.techExtraCount ?? 0) > 0 ? (
                <span className="text-[#6F6F72]"> +{row.techExtraCount}</span>
              ) : null}
            </p>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              {row.techStatus ?? "—"}
            </p>
          </div>
        ),
      },
      {
        id: "date",
        header: "Job Date",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.jobDateLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        className: "min-w-[70px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {(row.hours ?? row.submittedHours).toFixed(1)}
          </span>
        ),
      },
      {
        id: "billed",
        header: "Billed / D Hrs",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.billedDeltaLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "recon",
        header: "Reconciliation",
        className: "min-w-[120px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase tracking-[-0.02em]",
              reconTone(row.reconciliation),
            )}
          >
            {row.reconciliationLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "amt",
        header: "Amount",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.amountLabel ?? row.submittedValueLabel}
          </span>
        ),
      },
      {
        id: "issue",
        header: "Issue",
        className: "min-w-[100px]",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            {row.issueLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "approval",
        header: "Approval",
        className: "min-w-[130px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 font-sans text-[10px] uppercase tracking-[-0.02em]",
              approvalTone(row.approvalStatus),
            )}
          >
            {row.approvalLabel ?? row.status}
          </span>
        ),
      },
      {
        id: "ns",
        header: "NetSuite",
        className: "min-w-[120px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase tracking-[-0.02em]",
              netsuiteTone(row.netsuiteStatus),
            )}
          >
            {row.netsuiteLabel ?? "NOT SENT"}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading && rows.length === 0) {
    return <OpsLoadingListState />;
  }
  if (loadError && rows.length === 0) {
    return (
      <OpsLoadFailedState description={loadError} onRetry={refresh} />
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Sales Ticket Review Queue
        </h1>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Approved Sales Ticket Value"
            value={kpi.approvedValueLabel}
            meta={kpi.periodLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Hours"
            value={kpi.billedHours.toFixed(1)}
            meta={`BILLED HOURS · ${kpi.billableHours.toFixed(1)} BILLABLE · ${kpi.underbilledHours.toFixed(1)} UNDERBILLED`}
            icon="time"
          />
          <DashboardStatCell
            title="Matched Sales Tickets"
            value={String(kpi.matched)}
            meta={`${kpi.matchedPct}% OF REVIEWED TICKETS`}
            icon="folder"
          />
          <DashboardStatCell
            title="Needs Review"
            value={String(kpi.needsReview)}
            meta={kpi.needsReviewMeta}
            icon="alert"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1">
          <DashboardSearchInput
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search ST, WO, Customer, Location…"
          />
        </div>
        <DashboardToolbarButton>Filter</DashboardToolbarButton>
        <DashboardToolbarButton
          onClick={() =>
            setSort((s) => (s === "date" ? "amount" : s === "amount" ? "code" : "date"))
          }
        >
          Sort: {sort === "date" ? "Date" : sort === "amount" ? "Amount" : "Code"}
        </DashboardToolbarButton>
        <DashboardToolbarButton
          onClick={() => router.push("/operations/billing")}
        >
          Review Billing Exceptions
        </DashboardToolbarButton>
        <DashboardToolbarButton
          onClick={() => {
            const blob = new Blob(
              [JSON.stringify({ kpi, items: rows }, null, 2)],
              { type: "application/json" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "sales-ticket-review-queue.json";
            a.click();
            URL.revokeObjectURL(url);
            toastSuccess("Exported queue JSON");
          }}
        >
          Export
        </DashboardToolbarButton>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        onRowClick={(row) =>
          router.push(`/operations/sales-tickets/${row.id}`)
        }
        emptyMessage="No sales tickets in review queue."
      />

      <DashboardPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </div>
  );
}
