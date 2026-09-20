"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { operationsApi, type BillingVarianceItem } from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNoVariancesState,
} from "@/features/operations/operations-states";

function reconTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("UNDER")) return "bg-[#3A3218] text-[#E8C547]";
  if (s.includes("OVER") || s.includes("MISSING") || s.includes("NOT"))
    return "bg-[#3A1C1C] text-[#E86A6A]";
  return "bg-[#2A2A2A] text-[#959597]";
}

export function BillingReconciliationPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<BillingVarianceItem[]>([]);
  const [kpi, setKpi] = React.useState({
    variances: 0,
    underbilled: 0,
    overbilled: 0,
    missing: 0,
    underValueLabel: "$0",
    periodLabel: "",
  });

  useSetHeaderBreadcrumb("Operations / Billing Reconciliation");

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

  const columns = React.useMemo<
    DashboardDataTableColumn<BillingVarianceItem>[]
  >(
    () => [
      {
        id: "code",
        header: "Ticket",
        cell: (row) => (
          <Link
            href={`/operations/sales-tickets/${row.id}`}
            className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
          >
            {row.code}
          </Link>
        ),
      },
      {
        id: "cust",
        header: "Customer / Location",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.locationLabel ?? row.customerName}
          </span>
        ),
      },
      {
        id: "hrs",
        header: "Worked / Billed",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.workedHours.toFixed(1)} / {row.billedHours.toFixed(1)}
          </span>
        ),
      },
      {
        id: "delta",
        header: "Delta Hrs",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#E86A6A]">
            {row.deltaHours >= 0 ? "+" : ""}
            {row.deltaHours.toFixed(1)}
          </span>
        ),
      },
      {
        id: "recon",
        header: "Reconciliation",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
              reconTone(row.reconciliation),
            )}
          >
            {row.reconciliationLabel}
          </span>
        ),
      },
      {
        id: "issue",
        header: "Issue",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#959597]">
            {row.issueLabel}
          </span>
        ),
      },
      {
        id: "amt",
        header: "Amount",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.amountLabel}
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
      <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        Billing Reconciliation
      </h1>
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Variances"
            value={String(kpi.variances)}
            meta={kpi.periodLabel}
            icon="alert"
          />
          <DashboardStatCell
            title="Underbilled"
            value={String(kpi.underbilled)}
            meta={kpi.underValueLabel}
            icon="time"
          />
          <DashboardStatCell
            title="Overbilled"
            value={String(kpi.overbilled)}
            icon="document"
          />
          <DashboardStatCell
            title="Missing Data"
            value={String(kpi.missing)}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>
      <DashboardDataTable
        columns={columns}
        rows={items}
        getRowId={(r) => r.id}
      />
    </div>
  );
}
