"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardStatCell,
  DashboardStatRow,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetAsset, type FleetKpiCell } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { fleetBadgeTone } from "./fleet-ui";
import { AssetFiltersDrawer, EMPTY_ASSET_FILTERS, type AssetFilterState } from "./asset-filters";

const CHIPS = [
  { id: "", label: "All exceptions" },
  { id: "CALIBRATION_EXPIRED", label: "Expired calib" },
  { id: "FAILED_INSPECTION", label: "Failed insp" },
  { id: "OPEN_REPAIR", label: "Open repair" },
  { id: "OUT_OF_SERVICE", label: "Out of service" },
  { id: "MISSING", label: "Missing" },
  { id: "LOW_STOCK", label: "Low stock" },
];

function barColor(readiness: number) {
  if (readiness < 75) return "bg-[#E06A7A]";
  if (readiness < 90) return "bg-[#C9A227]";
  return "bg-[#3DDC97]";
}

function actionLabel(row: FleetAsset) {
  if (row.exception === "FAILED_INSPECTION") return "Create repair";
  if (row.exception === "CALIBRATION_EXPIRED") return "Calibrate";
  if (row.exception === "MISSING") return "Open case";
  if (row.exception === "OUT_OF_SERVICE" || row.exception === "OPEN_REPAIR") return "Move asset";
  if (row.exception === "LOW_STOCK") return "Adjust qty";
  return "";
}

export function AssetReadinessPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<FleetAsset[]>([]);
  const [cells, setCells] = React.useState<FleetKpiCell[]>([]);
  const [chip, setChip] = React.useState("");
  const [filters, setFilters] = React.useState<AssetFilterState>(EMPTY_ASSET_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.assetReadiness();
      setItems(res.data.items);
      setCells(res.data.cells);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const query = chip || filters.issue;
  const visible = items.filter((row) => {
    if (query && row.exception !== query) return false;
    const below = Number(filters.readinessBelow);
    if (filters.readinessBelow && (row.readiness == null || row.readiness >= below)) return false;
    if (filters.parent && row.parentTruck !== filters.parent) return false;
    if (filters.location && row.location !== filters.location) return false;
    if (filters.type && row.equipmentType !== filters.type) return false;
    return true;
  });

  async function runAction(row: FleetAsset) {
    const label = actionLabel(row);
    setBusyId(row.id);
    try {
      if (label === "Create repair" && row.inspectionId) {
        const res = await fleetApi.createRepairFromInspection(row.inspectionId, {
          issue: "Failed inspection",
        });
        toastSuccess(res.data.message || `${res.data.code} opened`);
        await load();
        return;
      }
      if (label === "Calibrate" || label === "Move asset" || label === "Adjust qty") {
        const path = label === "Calibrate"
          ? `/fleet/calibration/new?asset=${encodeURIComponent(row.assetCode)}`
          : label === "Adjust qty"
            ? `/fleet/assets/${encodeURIComponent(row.assetCode)}/edit`
            : `/fleet/assets/${encodeURIComponent(row.assetCode)}/move`;
        router.push(path);
        return;
      }
      if (label === "Open case") {
        router.push(`/fleet/unaccounted?q=${encodeURIComponent(row.assetCode)}`);
        return;
      }
      toastSuccess(`${row.assetCode} has no parent truck on file`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusyId("");
    }
  }

  function view(row: FleetAsset) {
    router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}`);
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading readiness" />
      </div>
    );
  }

  const exportRows = () => {
    const header = ["Asset", "Code", "Exception", "Readiness", "Value", "Blocking"];
    const body = visible.map((row) =>
      [row.assetLabel, row.assetCode, row.exceptionLabel ?? "", row.readiness ?? "", row.valueLabel ?? "", row.blockingLabel]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asset-readiness.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">Asset Readiness</h1>
        <DashboardToolbarButton onClick={exportRows}>Export</DashboardToolbarButton>
      </div>
      <div className="space-y-3">
        {[cells.slice(0, 4), cells.slice(4, 8)].map((row, index) => (
          <div key={index} className="rounded-xl border border-[#2D2D30] bg-[#141414]">
            <DashboardStatRow columns={4}>
              {row.map((cell) => (
                <button
                  key={cell.title}
                  type="button"
                  className="text-left"
                  onClick={() => cell.filterKey && setChip(chip === cell.filterKey ? "" : cell.filterKey)}
                >
                  <DashboardStatCell title={cell.title} value={cell.value} meta={cell.meta} />
                </button>
              ))}
            </DashboardStatRow>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            onClick={() => setChip(item.id)}
            className={`rounded-full px-3 py-1 font-sans text-[10px] uppercase ${chip === item.id ? "bg-[#FDFDFF] text-[#121212]" : "bg-[#2A2A2A] text-[#C8C8C8]"}`}
          >
            {item.label}
          </button>
        ))}
        <DashboardToolbarButton onClick={() => setFiltersOpen(true)}>Filters</DashboardToolbarButton>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#2D2D30]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_auto] gap-3 border-b border-[#2D2D30] px-4 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <span>Asset</span>
          <span>Exception</span>
          <span>Readiness / stock</span>
          <span>Replacement value</span>
          <span>Blocking dispatch</span>
          <span>Actions</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-8 font-sans text-[12px] uppercase text-[#959597]">
            {chip === "LOW_STOCK" ? "No consumable inventory is on file." : "No exceptions match these filters."}
          </p>
        ) : (
          visible.map((row) => (
            <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_auto] items-center gap-3 border-b border-[#2D2D30] px-4 py-3 last:border-b-0">
              <div>
                <div className="font-sans text-[13px] uppercase text-[#FDFDFF]">{row.assetLabel}</div>
                <div className="font-sans text-[10px] uppercase text-[#959597]">
                  {[row.parentTruck, row.assetCode].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div>
                {row.exceptionLabel ? (
                  <DashboardBadge variant={fleetBadgeTone(row.exceptionTone || "danger")}>{row.exceptionLabel}</DashboardBadge>
                ) : null}
              </div>
              <div>
                {row.readiness == null ? (
                  <span className="font-sans text-[10px] uppercase text-[#959597]">Excluded from truck score</span>
                ) : (
                  <div>
                    <div className="font-sans text-[12px] text-[#FDFDFF]">{row.readiness}%</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#2A2A2A]">
                      <div className={`h-full ${barColor(row.readiness)}`} style={{ width: `${row.readiness}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="font-sans text-[12px] text-[#FDFDFF]">{row.valueLabel ?? "—"}</div>
              <div className={`font-sans text-[12px] uppercase ${row.blockingDispatch ? "text-[#FF8A9A]" : "text-[#C8C8C8]"}`}>
                {row.blockingLabel}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => view(row)} className="rounded-lg border border-[#2D2D30] px-3 py-1.5 font-sans text-[10px] uppercase text-[#FDFDFF]">
                  View
                </button>
                {actionLabel(row) ? (
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void runAction(row)}
                    className="rounded-lg border border-[#2D2D30] px-3 py-1.5 font-sans text-[10px] uppercase text-[#FDFDFF] disabled:opacity-50"
                  >
                    {actionLabel(row)}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      <AssetFiltersDrawer
        open={filtersOpen}
        value={filters}
        parents={[...new Set(items.map((row) => row.parentTruck).filter((name): name is string => Boolean(name)))].sort()}
        locations={[...new Set(items.map((row) => row.location).filter((name): name is string => Boolean(name)))].sort()}
        types={[...new Set(items.map((row) => row.equipmentType))].sort()}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => { setFilters(next); setChip(next.issue); setFiltersOpen(false); }}
      />
    </div>
  );
}
