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
  type NetsuiteHandoffItem,
  type NetsuiteKpi,
} from "@/lib/operations-api";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNothingReadyForNetsuiteState,
} from "@/features/operations/operations-states";
import { PoRequiredGateModal } from "@/features/operations/work-order-modals";

function exportTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("UNDER")) return "bg-[#3A3218] text-[#E8C547]";
  if (s.includes("NOT") || s.includes("FAIL"))
    return "bg-[#3A1C1C] text-[#E86A6A]";
  return "bg-[#1C3A2A] text-[#5ECF8E]";
}

function actionTone(v?: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("CORRECT")) return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s.includes("PROGRESS")) return "bg-[#2A1C3A] text-[#B794F4]";
  return "bg-[#3A3218] text-[#E8C547]";
}

const EMPTY_KPI: NetsuiteKpi = {
  ready: 0,
  readyValue: 0,
  readyValueLabel: "$0.00",
  sent: 0,
  sentValueLabel: "$0.00",
  corrected: 0,
  correctedMeta: "HELD FROM EXPORT",
  failed: 0,
  failedMeta: "",
};

export function NetsuiteHandoffPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<NetsuiteHandoffItem[]>([]);
  const [kpi, setKpi] = React.useState<NetsuiteKpi>(EMPTY_KPI);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [poGateOpen, setPoGateOpen] = React.useState(false);
  const [poWorkOrderId, setPoWorkOrderId] = React.useState<string | null>(null);
  const pendingActionRef = React.useRef<null | (() => Promise<void>)>(null);

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

  const ensurePoThen = React.useCallback(
    async (workOrderId: string | null | undefined, action: () => Promise<void>) => {
      if (!workOrderId) {
        await action();
        return;
      }
      try {
        const res = await crmApi.getWorkOrderPoStatus(workOrderId);
        if (res.data.missing) {
          pendingActionRef.current = action;
          setPoWorkOrderId(workOrderId);
          setPoGateOpen(true);
          return;
        }
        await action();
      } catch (err) {
        toastApiError(err);
      }
    },
    [],
  );

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      disabled={busy || kpi.ready === 0}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const firstReady = items.find((i) => i.ready && i.workOrderId);
            await ensurePoThen(firstReady?.workOrderId, async () => {
              const res = await operationsApi.exportReadyToNetsuite();
              toastSuccess(res.data.message);
              await load();
            });
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      Export To NetSuite
    </DashboardToolbarButton>,
    [busy, kpi.ready, load, items, ensurePoThen],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (r) =>
        r.code.toLowerCase().includes(needle) ||
        r.customerName.toLowerCase().includes(needle) ||
        (r.workOrderCode ?? "").toLowerCase().includes(needle) ||
        (r.locationLabel ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const columns = React.useMemo<
    DashboardDataTableColumn<NetsuiteHandoffItem>[]
  >(
    () => [
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
        id: "wo",
        header: "WO Number",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              {row.workOrderYear ?? "2026"}
            </p>
            {row.workOrderId ? (
              <Link
                href={`/operations/work-orders/${row.workOrderId}`}
                className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
              >
                {row.workOrderCode}
              </Link>
            ) : (
              <span className="font-sans text-[12px] uppercase text-[#6F6F72]">
                —
              </span>
            )}
          </div>
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
        id: "loc",
        header: "Location / Well",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.locationWell ?? row.locationLabel ?? "—"}
            </p>
            {row.locationField ? (
              <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
                {row.locationField}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "date",
        header: "Service Date",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.serviceDate ?? "—"}
          </span>
        ),
      },
      {
        id: "hrs",
        header: "Amount",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.hoursLabel ?? row.amountLabel}
          </span>
        ),
      },
      {
        id: "nsid",
        header: "NetSuite ID",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.netsuiteIdLabel ?? row.amountLabel}
          </span>
        ),
      },
      {
        id: "export",
        header: "Export Status",
        cell: (row) =>
          row.failed ? (
            <Link
              href={`/operations/netsuite/${row.id}/error`}
              className={cn(
                "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase underline",
                exportTone(row.exportStatus),
              )}
            >
              {row.exportStatus ?? "FAILED"}
            </Link>
          ) : (
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
                exportTone(row.exportStatus),
              )}
            >
              {row.exportStatus ?? row.netsuiteLabel}
            </span>
          ),
      },
      {
        id: "act",
        header: "Action",
        cell: (row) =>
          row.failed ? (
            <Link
              href={`/operations/netsuite/${row.id}/error`}
              className={cn(
                "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
                actionTone("PENDING"),
              )}
            >
              View Error
            </Link>
          ) : (
            <button
              type="button"
              disabled={busyId === row.id || !row.ready}
              onClick={() => {
                if (!row.ready) return;
                void (async () => {
                  setBusyId(row.id);
                  try {
                    await ensurePoThen(row.workOrderId, async () => {
                      await operationsApi.sendToNetsuite(row.id);
                      toastSuccess(`${row.code} marked sent`);
                      await load();
                    });
                  } catch (err) {
                    toastApiError(err);
                  } finally {
                    setBusyId(null);
                  }
                })();
              }}
              className={cn(
                "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
                actionTone(row.actionStatus),
                !row.ready && "opacity-70",
              )}
            >
              {row.actionStatus ?? "PENDING"}
            </button>
          ),
      },
    ],
    [busyId, load, ensurePoThen],
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
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Ready To Export"
            value={String(kpi.ready)}
            meta={kpi.readyValueLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Exported This Cycle"
            value={String(kpi.sent)}
            meta={kpi.sentValueLabel}
            icon="time"
          />
          <DashboardStatCell
            title="Corrections Pending"
            value={String(kpi.corrected)}
            meta={kpi.correctedMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Failed"
            value={String(kpi.failed)}
            meta={kpi.failedMeta}
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
        <Link href="/operations/billing">
          <DashboardToolbarButton>Billed Reconciliation</DashboardToolbarButton>
        </Link>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
      />

      <PoRequiredGateModal
        open={poGateOpen}
        workOrderId={poWorkOrderId}
        onClose={() => {
          setPoGateOpen(false);
          setPoWorkOrderId(null);
          pendingActionRef.current = null;
        }}
        onCleared={() => {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          setPoGateOpen(false);
          setPoWorkOrderId(null);
          if (action) void action();
        }}
      />
    </div>
  );
}
