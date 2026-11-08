"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardModal,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetKpiCell, type UnaccountedAsset } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { downloadCsv, fleetBadgeTone } from "./fleet-ui";
import { OpsLoadFailedState, OpsLoadingListState } from "@/features/operations/operations-states";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none";

export function UnaccountedPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<UnaccountedAsset[]>([]);
  const [kpi, setKpi] = React.useState<FleetKpiCell[]>([]);
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [busy, setBusy] = React.useState(false);
  const [chargeRow, setChargeRow] = React.useState<UnaccountedAsset | null>(null);
  const [method, setMethod] = React.useState<"BONUS" | "PAY">("BONUS");
  const [reason, setReason] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [report, setReport] = React.useState({
    assetLabel: "",
    assetCode: "",
    replacementValue: "",
    lastTruck: "",
    lastHolder: "",
  });

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes] = await Promise.all([
        fleetApi.listUnaccounted({ q: q.trim() || undefined }),
        fleetApi.unaccountedKpi(),
      ]);
      setRows(listRes.data.items);
      setKpi(kpiRes.data.cells);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load unaccounted equipment");
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 200);
    return () => window.clearTimeout(timer);
  }, [reload]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toastSuccess(message);
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitCharge() {
    if (!chargeRow) return;
    if (!reason.trim()) {
      toastApiError(new Error("Enter a reason for the charge"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.chargeTechnician(chargeRow.id, {
        method,
        reason: reason.trim(),
        notify,
      });
      toastSuccess(res.data.message ?? "Charge recorded");
      setChargeRow(null);
      setReason("");
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    const value = Number(report.replacementValue);
    if (!report.assetLabel.trim() || !report.assetCode.trim() || !Number.isFinite(value)) {
      toastApiError(new Error("Asset, code, and replacement value are required"));
      return;
    }
    setBusy(true);
    try {
      await fleetApi.reportMissing({
        assetLabel: report.assetLabel.trim(),
        assetCode: report.assetCode.trim(),
        replacementValue: value,
        lastTruck: report.lastTruck.trim() || undefined,
        lastHolder: report.lastHolder.trim() || undefined,
      });
      toastSuccess("Missing asset reported");
      setReportOpen(false);
      setReport({ assetLabel: "", assetCode: "", replacementValue: "", lastTruck: "", lastHolder: "" });
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const columns = React.useMemo<DashboardDataTableColumn<UnaccountedAsset>[]>(
    () => [
      {
        id: "asset",
        header: "Asset",
        cell: (row) => (
          <div>
            <div className="font-sans text-[11px] uppercase text-[#FDFDFF]">{row.assetLabel}</div>
            <div className="font-sans text-[10px] uppercase text-[#8EB4FF]">{row.assetCode}</div>
          </div>
        ),
      },
      {
        id: "value",
        header: "Replacement Value",
        cell: (row) => <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.valueLabel}</span>,
      },
      {
        id: "truck",
        header: "Last Known Truck",
        cell: (row) => <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.lastTruck ?? "—"}</span>,
      },
      {
        id: "holder",
        header: "Last Holder",
        cell: (row) => <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.lastHolder ?? "—"}</span>,
      },
      {
        id: "marked",
        header: "Marked Missing On",
        cell: (row) => <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.markedOn ?? "—"}</span>,
      },
      {
        id: "window",
        header: "Locate Window",
        cell: (row) => (
          <span className={row.daysLeft < 0 ? "font-sans text-[11px] uppercase text-[#FF8A9A]" : "font-sans text-[11px] uppercase text-[#E8C547]"}>
            {row.locateLabel}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>,
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              { id: "open", label: "Open Asset", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}`) },
              {
                id: "contact",
                label: "Contact Holder",
                onSelect: () => toastSuccess(row.lastHolder ? `Contact ${row.lastHolder}` : "No holder on file"),
              },
              {
                id: "extend",
                label: "Extend Locate Window",
                onSelect: () => void run(() => fleetApi.extendLocateWindow(row.id, 7), "Locate window extended 7 days"),
              },
              {
                id: "recover",
                label: "Mark Recovered",
                onSelect: () => void run(() => fleetApi.markRecovered(row.id), `${row.assetCode} marked recovered`),
              },
              {
                id: "charge",
                label: "Charge to Technician",
                onSelect: () => {
                  setMethod("BONUS");
                  setNotify(true);
                  setReason("");
                  setChargeRow(row);
                },
              },
              {
                id: "write",
                label: "Write Off",
                destructive: true,
                onSelect: () => void run(() => fleetApi.writeOffUnaccounted(row.id), `${row.assetCode} written off`),
              },
              {
                id: "history",
                label: "View Movement History",
                onSelect: () =>
                  toastSuccess(
                    row.history.length
                      ? row.history.map((item) => item.entry).join(" · ")
                      : "No movement history yet",
                  ),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  if (loading && rows.length === 0 && !error) return <OpsLoadingListState />;
  if (error && rows.length === 0) return <OpsLoadFailedState description={error} onRetry={reload} />;

  const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          Unaccounted Equipment
        </h1>
        <DashboardToolbarButton variant="primary" onClick={() => setReportOpen(true)}>
          Report Missing
        </DashboardToolbarButton>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpi.map((cell) => (
            <DashboardStatCell key={cell.title} title={cell.title} value={cell.value} meta={cell.meta} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search asset, serial or holder"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
        actions={
          <DashboardExportMenu
            items={[{ id: "csv", label: "Export current view · CSV", onSelect: () => downloadCsv("unaccounted.csv", ["Asset", "Code", "Value", "Last truck", "Holder", "Status"], rows.map((row) => [row.assetLabel, row.assetCode, row.valueLabel, row.lastTruck, row.lastHolder, row.statusLabel])) }]}
          />
        }
      />

      <DashboardDataTable columns={columns} rows={rows} getRowId={(row) => row.id} emptyMessage="No unaccounted equipment" />

      <DashboardModal
        open={Boolean(chargeRow)}
        onClose={() => setChargeRow(null)}
        title="Charge to Technician"
        widthClassName="max-w-lg"
        footer={
          <div className="flex items-center justify-between">
            <button type="button" className="font-sans text-[11px] uppercase text-[#959597]" onClick={() => setChargeRow(null)}>
              Cancel
            </button>
            <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void submitCharge()}>
              Charge to Technician
            </DashboardToolbarButton>
          </div>
        }
      >
        {chargeRow ? (
          <div className="space-y-4">
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              {chargeRow.assetCode} · {chargeRow.assetLabel} · {chargeRow.valueLabel} · {chargeRow.lastHolder ?? "Unassigned"}
            </p>
            <label className="block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Asset / Value / Technician</span>
              <input
                readOnly
                className={fieldClass}
                value={`${chargeRow.assetCode} · ${chargeRow.valueLabel} · ${chargeRow.lastHolder ?? "—"}`}
              />
            </label>
            <div>
              <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">Deduction method</p>
              {([
                ["BONUS", `Deduct from ${quarter} bonus`],
                ["PAY", "Deduct from pay"],
              ] as const).map(([value, label]) => (
                <label key={value} className="mb-2 flex items-center gap-2 rounded-lg border border-[#2D2D30] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                  <input type="checkbox" checked={method === value} onChange={() => setMethod(value)} />
                  {label}
                </label>
              ))}
            </div>
            <label className="block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Reason *</span>
              <input
                className={fieldClass}
                placeholder="Enter reason for charge"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Notify technician
            </label>
            <p className="rounded-lg bg-[#3A3418] px-3 py-2 font-sans text-[11px] uppercase text-[#E8C547]">
              This records a {chargeRow.valueLabel} deduction against {chargeRow.lastHolder ?? "the technician"} {method === "BONUS" ? `${quarter} bonus` : "pay"}
              {notify ? " and notifies them" : ""}.
            </p>
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Missing"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setReportOpen(false)}>Cancel</DashboardToolbarButton>
            <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void submitReport()}>
              Report Missing
            </DashboardToolbarButton>
          </div>
        }
      >
        <div className="space-y-3">
          {(
            [
              ["assetLabel", "Asset"],
              ["assetCode", "Asset ID"],
              ["replacementValue", "Replacement value"],
              ["lastTruck", "Last known truck"],
              ["lastHolder", "Last holder"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">{label}</span>
              <input
                className={fieldClass}
                value={report[key]}
                onChange={(e) => setReport((current) => ({ ...current, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </DashboardModal>
    </div>
  );
}
