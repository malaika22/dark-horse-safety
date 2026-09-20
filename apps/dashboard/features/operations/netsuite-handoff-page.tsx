"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { operationsApi, type NetsuiteHandoffItem } from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNothingReadyForNetsuiteState,
} from "@/features/operations/operations-states";

function nsTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("SENT")) return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s.includes("READY")) return "bg-[#2A3218] text-[#A8C45C]";
  if (s.includes("CORRECTED")) return "bg-[#3A1C1C] text-[#E86A6A]";
  return "bg-[#2A2520] text-[#A89070]";
}

export function NetsuiteHandoffPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<NetsuiteHandoffItem[]>([]);
  const [kpi, setKpi] = React.useState({
    ready: 0,
    sent: 0,
    corrected: 0,
    readyValueLabel: "$0",
  });
  const [busyId, setBusyId] = React.useState<string | null>(null);

  useSetHeaderBreadcrumb("Operations / NetSuite Handoff");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.netsuiteOverview();
      setItems(res.data.items);
      setKpi(res.data.kpis);
    } catch (err) {
      setError("Couldn't load NetSuite queue.");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns = React.useMemo<
    DashboardDataTableColumn<NetsuiteHandoffItem>[]
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
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.customerName}
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
      {
        id: "ns",
        header: "NetSuite",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
              nsTone(row.netsuiteStatus),
            )}
          >
            {row.netsuiteLabel}
          </span>
        ),
      },
      {
        id: "act",
        header: "",
        cell: (row) =>
          row.ready || row.netsuiteStatus === "READY_TO_SEND" ? (
            <DashboardToolbarButton
              disabled={busyId === row.id}
              onClick={() => {
                void (async () => {
                  setBusyId(row.id);
                  try {
                    await operationsApi.sendToNetsuite(row.id);
                    toastSuccess(`${row.code} marked sent`);
                    await load();
                  } catch (err) {
                    toastApiError(err);
                  } finally {
                    setBusyId(null);
                  }
                })();
              }}
            >
              Send
            </DashboardToolbarButton>
          ) : (
            <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
              —
            </span>
          ),
      },
    ],
    [busyId, load],
  );

  if (loading) return <OpsLoadingListState />;
  if (error)
    return <OpsLoadFailedState description={error} onRetry={load} />;
  if (items.length === 0) {
    return (
      <div className="bg-shell p-3 sm:p-6">
        <OpsNothingReadyForNetsuiteState />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        NetSuite Handoff
      </h1>
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Ready to Send"
            value={String(kpi.ready)}
            meta={kpi.readyValueLabel}
            icon="lightning"
          />
          <DashboardStatCell
            title="Sent"
            value={String(kpi.sent)}
            icon="document"
          />
          <DashboardStatCell
            title="Corrected"
            value={String(kpi.corrected)}
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
