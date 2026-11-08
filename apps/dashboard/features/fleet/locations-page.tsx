"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetLocationRecord } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

export function LocationsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<FleetLocationRecord[]>([]);
  const [q, setQ] = React.useState("");
  const [menu, setMenu] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fleetApi.listLocations();
        setRows(res.data.items);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = rows.filter((row) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.address, row.city, row.type].some((value) =>
      String(value ?? "").toLowerCase().includes(query),
    );
  });
  const assets = rows.reduce((sum, row) => sum + (row.assets ?? 0), 0);
  const yards = rows.filter((row) => row.type === "YARD").length;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading locations" />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[20px] uppercase text-[#FDFDFF]">Locations</h1>
        <div className="relative">
          <DashboardToolbarButton variant="primary" onClick={() => setMenu((open) => !open)}>
            Add Location
          </DashboardToolbarButton>
          {menu ? (
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-[#2D2D30] bg-[#161616] p-1">
              {["YARD", "REPAIR_BAY", "STORAGE"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                  onClick={() => router.push(`/fleet/trucks/locations/new?type=${type}`)}
                >
                  Add {type.replace("_", " ")}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell title="Locations" value={String(rows.length)} meta="MANAGED" />
          <DashboardStatCell title="Active" value={String(rows.filter((row) => row.status === "ACTIVE").length)} meta="NO INACTIVE" />
          <DashboardStatCell title="Assets Held" value={String(assets)} meta="ACROSS LOCATIONS" />
          <DashboardStatCell title="Yards" value={String(yards)} meta="MAIN YARD" />
        </DashboardStatRow>
      </DashboardStatGrid>
      <DashboardSearchInput placeholder="Search location or address" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-hidden rounded-xl border border-[#2D2D30]">
        <div className="grid grid-cols-[1.2fr_0.8fr_1.2fr_0.6fr_0.8fr_0.7fr] gap-2 border-b border-[#2D2D30] px-4 py-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Location</span><span>Type</span><span>Address</span><span>Assets</span><span>Last audited</span><span>Status</span>
        </div>
        {visible.map((row) => (
          <div key={row.id} className="grid grid-cols-[1.2fr_0.8fr_1.2fr_0.6fr_0.8fr_0.7fr] items-center gap-2 border-b border-[#2D2D30] px-4 py-3 last:border-b-0">
            <button type="button" className="text-left font-sans text-[12px] uppercase text-[#8EB4FF]" onClick={() => router.push(`/fleet/trucks/locations/${row.slug ?? row.id}`)}>
              {row.name}
            </button>
            <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.type.replace("_", " ")}</span>
            <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{[row.city, row.state].filter(Boolean).join(", ") || row.address || "—"}</span>
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">{row.assets ?? 0}</span>
            <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.lastAudit ?? "—"}</span>
            <div className="flex items-center justify-between">
              <DashboardBadge variant={row.status === "ACTIVE" ? "success" : "neutral"}>{row.cardStatus?.replace("_", " ") ?? row.status}</DashboardBadge>
              <DashboardRowActionMenu
                items={[
                  { id: "open", label: "Open Location", onSelect: () => router.push(`/fleet/trucks/locations/${row.slug ?? row.id}`) },
                  { id: "edit", label: "Edit", onSelect: () => router.push(`/fleet/trucks/locations/${row.id}/edit`) },
                  { id: "asset", label: "Add Asset to Location", onSelect: () => toastSuccess("Assign an asset by setting its parent truck to this location") },
                  { id: "map", label: "View on Map", onSelect: () => router.push(`/fleet/trucks/locations/${row.id}/edit`) },
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
