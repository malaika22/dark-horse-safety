"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardModal,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatRow,
  DashboardToolbarButton,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetAsset, type FleetKpiCell } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { fleetBadgeTone } from "./fleet-ui";
import { AssetFiltersDrawer, EMPTY_ASSET_FILTERS, type AssetFilterState } from "./asset-filters";

function barColor(readiness: number) {
  if (readiness < 75) return "bg-[#E06A7A]";
  if (readiness < 90) return "bg-[#C9A227]";
  return "bg-[#3DDC97]";
}

function download(rows: FleetAsset[]) {
  const header = ["Asset", "Code", "Type", "Parent", "Location", "Readiness", "Calibration", "Repair", "Status"];
  const body = rows.map((row) =>
    [row.assetLabel, row.assetCode, row.equipmentType, row.parentTruck ?? "", row.location ?? "", row.readiness ?? "", row.calibration, row.repair, row.statusLabel]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fleet-assets.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function matches(row: FleetAsset, filters: AssetFilterState, query: string) {
  const below = Number(filters.readinessBelow);
  if (filters.readinessBelow && (row.readiness == null || row.readiness >= below)) return false;
  if (filters.issue && !(row.exceptions ?? []).includes(filters.issue) && row.exception !== filters.issue) return false;
  if (filters.parent && row.parentTruck !== filters.parent) return false;
  if (filters.location && row.location !== filters.location) return false;
  if (filters.type && row.equipmentType !== filters.type) return false;
  if (!query) return true;
  return [row.assetLabel, row.assetCode, row.equipmentType, row.parentTruck, row.location]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function AssetsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<FleetAsset[]>([]);
  const [cells, setCells] = React.useState<FleetKpiCell[]>([]);
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<AssetFilterState>(EMPTY_ASSET_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [group, setGroup] = React.useState<"FLAT" | "TRUCK">("FLAT");
  const [sort, setSort] = React.useState<"LOW" | "HIGH">("LOW");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [status, setStatus] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulk, setBulk] = React.useState<"MOVE" | "ASSIGN" | null>(null);
  const [destination, setDestination] = React.useState("");
  const [places, setPlaces] = React.useState<Array<{ id: string; name: string; kind: string }>>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.listAssets();
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

  const filtered = items
    .filter((row) => {
      if (status === "READY" && row.status !== "READY") return false;
      if (status === "NEEDS_REVIEW" && row.status !== "NEEDS_REVIEW") return false;
      if (status === "OUT_OF_SERVICE" && row.status !== "OUT_OF_SERVICE") return false;
      if (status === "CHECKED_OUT" && row.status !== "CHECKED_OUT") return false;
      return matches(row, filters, q.trim().toLowerCase());
    })
    .sort((a, b) => {
      const left = a.readiness ?? (sort === "LOW" ? -1 : 101);
      const right = b.readiness ?? (sort === "LOW" ? -1 : 101);
      return sort === "LOW" ? left - right : right - left;
    });

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilters = Object.values(filters).filter(Boolean).length + (status ? 1 : 0);

  const columns = React.useMemo<DashboardDataTableColumn<FleetAsset>[]>(
    () => [
      {
        id: "asset",
        header: "Asset",
        cell: (row) => (
          <div>
            <div className="text-[#FDFDFF]">{row.assetLabel}</div>
            <div className="text-[10px] text-[#959597]">{row.assetCode}</div>
          </div>
        ),
      },
      { id: "type", header: "Equipment type", cell: (row) => row.equipmentType },
      { id: "truck", header: "Parent truck", cell: (row) => row.parentTruck ?? "—" },
      { id: "location", header: "Location", cell: (row) => row.location ?? "—" },
      {
        id: "readiness",
        header: "Readiness",
        className: "min-w-[140px]",
        cell: (row) =>
          row.readiness == null ? (
            <span className="text-[10px] uppercase text-[#959597]">Excluded</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-8 text-[#FDFDFF]">{row.readiness}%</span>
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#2A2A2A]">
                <span className={`block h-full ${barColor(row.readiness)}`} style={{ width: `${row.readiness}%` }} />
              </span>
            </div>
          ),
      },
      {
        id: "cal",
        header: "Calibration",
        cell: (row) => <DashboardBadge variant={fleetBadgeTone(row.calibrationTone || "neutral")}>{row.calibration}</DashboardBadge>,
      },
      {
        id: "repair",
        header: "Repair",
        cell: (row) => <DashboardBadge variant={fleetBadgeTone(row.repairTone || "neutral")}>{row.repair}</DashboardBadge>,
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
              { id: "open", label: "Open asset", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}`) },
              { id: "edit", label: "Edit", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}/edit`) },
              { id: "move", label: "Move", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}/move`) },
              { id: "out", label: "Check out", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}?action=checkout`) },
              { id: "cal", label: "Add calibration", onSelect: () => router.push(`/fleet/calibration/new?asset=${encodeURIComponent(row.assetCode)}`) },
              { id: "insp", label: "Add inspection", onSelect: () => router.push(`/fleet/inspections/new?asset=${encodeURIComponent(row.assetCode)}`) },
              { id: "repair", label: "Create repair request", onSelect: () => router.push(`/fleet/repair-requests/new?asset=${encodeURIComponent(row.assetCode)}`) },
              { id: "missing", label: "Mark missing", destructive: true, onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}?action=missing`) },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading assets" />
      </div>
    );
  }

  async function openBulk(action: "MOVE" | "ASSIGN") {
    setBulk(action);
    setDestination("");
    if (places.length) return;
    try {
      const res = await fleetApi.trucksOverview();
      setPlaces(res.data.cards.map((card) => ({ id: card.id, name: card.name, kind: card.kind })));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function applyBulk() {
    if (!bulk || !destination) return;
    try {
      const res = await fleetApi.bulkAssets({ codes: selectedIds, action: bulk, to: destination });
      toastSuccess(res.data.message);
      setSelectedIds([]);
      setBulk(null);
      await load();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function markOut() {
    try {
      const res = await fleetApi.bulkAssets({ codes: selectedIds, action: "OUT_OF_SERVICE" });
      toastSuccess(res.data.message);
      setSelectedIds([]);
      await load();
    } catch (err) {
      toastApiError(err);
    }
  }

  const groups = new Map<string, FleetAsset[]>();
  if (group === "TRUCK") {
    for (const row of filtered) {
      const key = row.parentTruck ?? (row.status === "CHECKED_OUT" ? "CHECKED OUT" : "NO TRUCK");
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">Assets</h1>
        <DashboardToolbarButton variant="primary" onClick={() => router.push("/fleet/assets/new")}>Add asset</DashboardToolbarButton>
      </div>
      <div className="rounded-xl border border-[#2D2D30] bg-[#141414]">
        <DashboardStatRow columns={5}>
          {cells.map((cell) => {
            const key =
              cell.title === "Ready"
                ? "READY"
                : cell.title === "Needs Review"
                  ? "NEEDS_REVIEW"
                  : cell.title === "Out of Service"
                    ? "OUT_OF_SERVICE"
                    : cell.title === "Checked Out"
                      ? "CHECKED_OUT"
                      : "";
            return (
              <button key={cell.title} type="button" className="text-left" onClick={() => setStatus(status === key ? "" : key)}>
                <DashboardStatCell title={cell.title} value={cell.value} meta={cell.meta} />
              </button>
            );
          })}
        </DashboardStatRow>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearchInput value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Asset ID, serial, model, truck, location" containerClassName="min-w-[240px] flex-1" />
        <DashboardToolbarButton onClick={() => setFiltersOpen(true)}>Filter{activeFilters ? ` · ${activeFilters}` : ""}</DashboardToolbarButton>
        <DashboardToolbarButton variant={group === "FLAT" ? "primary" : "glass"} onClick={() => setGroup("FLAT")}>Flat</DashboardToolbarButton>
        <DashboardToolbarButton variant={group === "TRUCK" ? "primary" : "glass"} onClick={() => setGroup("TRUCK")}>By truck</DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => setSort(sort === "LOW" ? "HIGH" : "LOW")}>
          Sort: readiness {sort === "LOW" ? "lowest first" : "highest first"}
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => download(filtered)}>Export</DashboardToolbarButton>
      </div>
      {selectedIds.length > 0 ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton onClick={() => download(items.filter((row) => selectedIds.includes(row.assetCode)))}>Export</DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => void openBulk("ASSIGN")}>Assign to truck</DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => void markOut()}>Mark out of service</DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => void openBulk("MOVE")}>Move to location</DashboardToolbarButton>
            </>
          }
        />
      ) : null}
      {group === "FLAT" ? (
        <DashboardDataTable columns={columns} rows={slice} getRowId={(row) => row.assetCode} emptyMessage="No assets match these filters." selectable selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} onRowClick={(row) => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}`)} />
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([name, rows]) => (
            <section key={name} className="overflow-hidden rounded-xl border border-[#2D2D30]">
              <div className="bg-[#1A1A1A] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.08em] text-[#C8C8C8]">
                {name} · {rows.length}
              </div>
              <DashboardDataTable columns={columns} rows={rows} getRowId={(row) => row.assetCode} embedded emptyMessage="No assets" selectable selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} onRowClick={(row) => router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}`)} />
            </section>
          ))}
          {groups.size === 0 ? <p className="font-sans text-[12px] uppercase text-[#959597]">No assets match these filters.</p> : null}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-[11px] uppercase text-[#959597]">
        <span>
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <label>
            Page size
            <select
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="ml-2 rounded border border-[#2D2D30] bg-[#1A1A1A] px-2 py-1 text-[#FDFDFF]"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded border border-[#2D2D30] px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{safePage} / {pages}</span>
          <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="rounded border border-[#2D2D30] px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
      <DashboardModal
        open={Boolean(bulk)}
        onClose={() => setBulk(null)}
        title={bulk === "ASSIGN" ? "Assign to truck" : "Move to location"}
        footer={
          <button type="button" disabled={!destination} onClick={() => void applyBulk()} className="rounded-lg bg-[#FDFDFF] px-4 py-2 font-sans text-[11px] uppercase text-[#121212] disabled:opacity-40">
            Apply
          </button>
        }
      >
        <select value={destination} onChange={(event) => setDestination(event.target.value)} className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
          <option value="">Select</option>
          {places.filter((place) => (bulk === "ASSIGN" ? place.kind === "TRUCK" : place.kind === "LOCATION")).map((place) => (
            <option key={place.id} value={place.name}>{place.name}</option>
          ))}
        </select>
      </DashboardModal>
      <AssetFiltersDrawer
        open={filtersOpen}
        value={filters}
        parents={[...new Set(items.map((row) => row.parentTruck).filter((name): name is string => Boolean(name)))].sort()}
        locations={[...new Set(items.map((row) => row.location).filter((name): name is string => Boolean(name)))].sort()}
        types={[...new Set(items.map((row) => row.equipmentType))].sort()}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => { setFilters(next); setPage(1); setFiltersOpen(false); }}
      />
    </div>
  );
}
