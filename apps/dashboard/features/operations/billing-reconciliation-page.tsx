"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
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
  type BillingKpi,
  type BillingVarianceItem,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNoVariancesState,
} from "@/features/operations/operations-states";

function statusTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("MATCHED") || (s.includes("BILLED") && !s.includes("UNDER") && !s.includes("OVER")))
    return "border-[#3D8B6E] text-[#5ECF8E]";
  if (s.includes("UNDER") || s.includes("OVER"))
    return "border-[#B84A4A] text-[#E86A6A]";
  if (s.includes("MISSING")) return "border-[#C47A3A] text-[#E8A05C]";
  return "border-[#3E3E3E] text-[#959597]";
}

function nsTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("MATCHED")) return "border-[#3D8B6E] text-[#5ECF8E]";
  if (s.includes("NEEDED")) return "bg-[#3A3218] text-[#E8C547]";
  return "text-[#6F6F72]";
}

const EMPTY_KPI: BillingKpi = {
  ticketsThisCycle: 0,
  cycleLabel: "",
  matched: 0,
  matchedPct: 0,
  needsCorrection: 0,
  needsCorrectionMeta: "",
  unbilledValue: 0,
  unbilledValueLabel: "$0.00",
  unbilledMeta: "",
  readyForNetsuite: 0,
  readyForNetsuiteValueLabel: "$0.00",
  variances: 0,
  underbilled: 0,
  overbilled: 0,
  missing: 0,
  underValue: 0,
  underValueLabel: "$0",
  periodLabel: "",
};

export function BillingReconciliationPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<BillingVarianceItem[]>([]);
  const [kpi, setKpi] = React.useState<BillingKpi>(EMPTY_KPI);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.billingOverview();
      setItems(res.data.items);
      setKpi(res.data.kpis);
    } catch (err) {
      setError("Couldn't load billing variances.");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  useSetHeaderActions(
    <DashboardToolbarButton
      onClick={() => {
        const blob = new Blob([JSON.stringify(items, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "billing-reconciliation.json";
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export
    </DashboardToolbarButton>,
    [items],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (r) =>
        r.code.toLowerCase().includes(needle) ||
        r.customerName.toLowerCase().includes(needle) ||
        (r.workOrderCode ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const columns = React.useMemo<
    DashboardDataTableColumn<BillingVarianceItem>[]
  >(
    () => [
      {
        id: "wo",
        header: "WO Number",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              {row.workOrderYear ?? "2026"}
            </p>
            {row.workOrderId ? (
              <Link
                href={`/operations/billing/${row.id}`}
                className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
              >
                {row.workOrderCode}
              </Link>
            ) : (
              <Link
                href={`/operations/billing/${row.id}`}
                className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
              >
                {row.code}
              </Link>
            )}
          </div>
        ),
      },
      {
        id: "st",
        header: "Sales Ticket",
        cell: (row) =>
          row.stMissing ? (
            <span className="rounded-full bg-[#3A1C1C] px-2 py-0.5 font-sans text-[10px] uppercase text-[#E86A6A]">
              Missing
            </span>
          ) : (
            <Link
              href={`/operations/sales-tickets/${row.id}`}
              className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
            >
              {row.code}
            </Link>
          ),
      },
      {
        id: "sub",
        header: "Submitted By",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.submittedBy ?? row.customerName}
          </span>
        ),
      },
      {
        id: "emp",
        header: "Employs",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.employsName ?? row.employs}
            </p>
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              {row.employsCompany}
            </p>
          </div>
        ),
      },
      {
        id: "worked",
        header: "Worked",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.workedLabel ?? `${row.workedHours.toFixed(1)}H`}
          </span>
        ),
      },
      {
        id: "billed",
        header: "Billed",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.billedLabel ?? `${row.billedHours.toFixed(1)}H`}
          </span>
        ),
      },
      {
        id: "diff",
        header: "Difference",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[12px] uppercase",
              row.deltaHours < 0 ? "text-[#E86A6A]" : "text-[#C8C8C8]",
            )}
          >
            {row.differenceLabel ??
              `${row.deltaHours >= 0 ? "+" : ""}${row.deltaHours.toFixed(1)}H`}
          </span>
        ),
      },
      {
        id: "ns",
        header: "NetSuite",
        cell: (row) =>
          row.netsuiteStatus === "—" ? (
            <span className="font-sans text-[12px] text-[#6F6F72]">—</span>
          ) : (
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-1 font-sans text-[10px] uppercase",
                nsTone(row.netsuiteStatus),
              )}
            >
              {row.netsuiteStatus}
            </span>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md border px-2 py-1 font-sans text-[10px] uppercase",
              statusTone(row.reconciliationLabel),
            )}
          >
            {row.reconciliationLabel}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) return <OpsLoadingListState />;
  if (error)
    return <OpsLoadFailedState description={error} onRetry={load} />;
  if (items.length === 0) {
    return (
      <div className="bg-shell p-3 sm:p-6">
        <OpsNoVariancesState />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Tickets This Cycle"
            value={String(kpi.ticketsThisCycle)}
            meta={kpi.cycleLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Matched"
            value={String(kpi.matched)}
            meta={`${kpi.matchedPct}%`}
            icon="time"
          />
          <DashboardStatCell
            title="Needs Correction"
            value={String(kpi.needsCorrection)}
            meta={kpi.needsCorrectionMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Unbilled Value"
            value={kpi.unbilledValueLabel}
            meta={kpi.unbilledMeta}
            icon="lightning"
            className="bg-[#2A2418]"
          />
          <DashboardStatCell
            title="Ready For NetSuite"
            value={String(kpi.readyForNetsuite)}
            meta={kpi.readyForNetsuiteValueLabel}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search critical dates"
          className="min-w-[220px] flex-1"
        />
        <DashboardToolbarButton>Filter</DashboardToolbarButton>
        <DashboardToolbarButton>Sort: Date</DashboardToolbarButton>
        <DashboardToolbarButton>Mark Reviewed</DashboardToolbarButton>
        <DashboardToolbarButton>Export</DashboardToolbarButton>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          window.location.href = `/operations/billing/${row.id}`;
        }}
      />
    </div>
  );
}
