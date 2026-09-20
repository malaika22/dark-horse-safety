"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { operationsApi, type OpsPurchaseOrderItem } from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNoPurchaseOrdersState,
} from "@/features/operations/operations-states";

export function PurchaseOrdersPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<OpsPurchaseOrderItem[]>([]);
  const [kpi, setKpi] = React.useState({
    total: 0,
    billedBack: 0,
    notOnTicket: 0,
    totalAmountLabel: "$0",
  });

  useSetHeaderBreadcrumb("Operations / Purchase Orders");

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

  const columns = React.useMemo<
    DashboardDataTableColumn<OpsPurchaseOrderItem>[]
  >(
    () => [
      {
        id: "code",
        header: "PO",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.code}
          </span>
        ),
      },
      {
        id: "cust",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "wo",
        header: "Work Order",
        cell: (row) =>
          row.workOrderId ? (
            <Link
              href={`/operations/work-orders/${row.workOrderId}`}
              className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
            >
              {row.workOrderCode}
            </Link>
          ) : (
            <span className="font-sans text-[12px] uppercase text-[#6F6F72]">
              {row.workOrderCode ?? "—"}
            </span>
          ),
      },
      {
        id: "ticket",
        header: "Sales Ticket",
        cell: (row) => (
          <Link
            href={`/operations/sales-tickets/${row.ticketId}`}
            className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
          >
            {row.ticketCode}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#E8C547]">
            {row.statusLabel}
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
        <OpsNoPurchaseOrdersState />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        Purchase Orders
      </h1>
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Total POs"
            value={String(kpi.total)}
            meta={kpi.totalAmountLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Billed Back"
            value={String(kpi.billedBack)}
            icon="folder"
          />
          <DashboardStatCell
            title="Not on Ticket"
            value={String(kpi.notOnTicket)}
            icon="alert"
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
