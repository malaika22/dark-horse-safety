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
  type OpsPurchaseOrderItem,
  type PurchaseOrderKpi,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNoPurchaseOrdersState,
} from "@/features/operations/operations-states";

function statusTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("APPROVED") || s.includes("MATCHED") || s.includes("BILLED"))
    return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s.includes("NEEDS") || s.includes("REVIEW"))
    return "bg-[#3A3218] text-[#E8C547]";
  if (s.includes("NOT")) return "bg-[#3A1C1C] text-[#E86A6A]";
  return "bg-[#2A2A2A] text-[#959597]";
}

const EMPTY_KPI: PurchaseOrderKpi = {
  total: 0,
  totalAmount: 0,
  totalAmountLabel: "$0.00",
  received: 0,
  awaiting: 0,
  billedBack: 0,
  billedBackAmountLabel: "$0.00",
  missingBeforeInvoice: 0,
  missingMeta: "",
  overThreshold: 0,
  overThresholdMeta: "NEED APPROVAL",
  notOnTicket: 0,
};

export function PurchaseOrdersPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<OpsPurchaseOrderItem[]>([]);
  const [kpi, setKpi] = React.useState<PurchaseOrderKpi>(EMPTY_KPI);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.purchaseOrdersOverview();
      setItems(res.data.items);
      setKpi(res.data.kpis);
    } catch (err) {
      setError("Couldn't load purchase orders.");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  useSetHeaderActions(
    <Link href="/operations/purchase-orders/new">
      <DashboardToolbarButton variant="primary">
        + New Purchase Order
      </DashboardToolbarButton>
    </Link>,
    [],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (r) =>
        r.code.toLowerCase().includes(needle) ||
        r.vendor.toLowerCase().includes(needle) ||
        r.customerName.toLowerCase().includes(needle) ||
        r.type.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const columns = React.useMemo<
    DashboardDataTableColumn<OpsPurchaseOrderItem>[]
  >(
    () => [
      {
        id: "code",
        header: "PO #",
        cell: (row) => (
          <Link
            href={`/operations/sales-tickets/${row.ticketId}`}
            className="font-sans text-[12px] uppercase text-[#FDFDFF] underline"
          >
            {row.code}
          </Link>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.vendor}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.type}
          </span>
        ),
      },
      {
        id: "emp",
        header: "Employs",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.employsName}
            </p>
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              {row.employsCompany}
            </p>
          </div>
        ),
      },
      {
        id: "total",
        header: "Total",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.amountLabel}
          </span>
        ),
      },
      {
        id: "approved",
        header: "Approved By",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.approvedBy}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
              statusTone(row.statusLabel),
            )}
          >
            {row.statusLabel}
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
        <OpsNoPurchaseOrdersState />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="POs This Cycle"
            value={String(kpi.total)}
            meta={kpi.totalAmountLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Received"
            value={String(kpi.received)}
            meta={`AWAITING ${kpi.awaiting}`}
            icon="time"
          />
          <DashboardStatCell
            title="Billed Back To Customer"
            value={String(kpi.billedBack)}
            meta={kpi.billedBackAmountLabel}
            icon="folder"
          />
          <DashboardStatCell
            title="Missing Before Invoice"
            value={String(kpi.missingBeforeInvoice)}
            meta={kpi.missingMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Over Threshold"
            value={String(kpi.overThreshold)}
            meta={kpi.overThresholdMeta}
            icon="alert"
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
        <DashboardToolbarButton>Marked Reviewed</DashboardToolbarButton>
        <DashboardToolbarButton>Export</DashboardToolbarButton>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
      />
    </div>
  );
}
