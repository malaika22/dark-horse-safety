"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardBadge, DashboardToolbarButton } from "@dark-horse-safety/ui";
import { fleetApi, type FleetTruckDetail } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { fleetBadgeTone } from "./fleet-ui";

export function LocationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<FleetTruckDetail | null>(null);
  const [view, setView] = React.useState<"CARDS" | "LIST">("CARDS");

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fleetApi.truckDetail(id);
        setDetail(res.data);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading location" />
      </div>
    );
  }
  if (!detail) return <p className="p-6 font-sans text-[12px] uppercase text-[#959597]">Location not found.</p>;

  const place = detail.location;
  const capacity = place?.maxCapacity ?? 0;
  const used = capacity ? Math.round((detail.children.length / capacity) * 100) : 0;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-[20px] uppercase text-[#FDFDFF]">
            {detail.card.name}
            {place?.city ? ` · ${place.city}${place.state ? `, ${place.state}` : ""}` : ""}
          </h1>
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            {detail.children.length} assets
            {detail.card.lastAudit ? ` · audited ${detail.card.lastAudit}` : ""}
          </p>
        </div>
        <DashboardBadge variant={detail.card.status === "ACTIVE" ? "success" : "warning"}>{detail.card.statusLabel}</DashboardBadge>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Capacity used" value={capacity ? `${used}%` : "—"} meta={capacity ? `${detail.children.length} of ${capacity}` : "No capacity set"} />
        <Stat label="Open repairs" value={String(detail.card.repairs)} meta="AT THIS LOCATION" />
        <Stat label="Expired calib" value={String(detail.card.calibExpired)} meta="ASSETS" />
        <Stat label="Last audit" value={detail.card.lastAudit ?? "—"} meta={place?.address ?? ""} />
      </div>
      <div className="flex items-center justify-between">
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">Assets here · {detail.children.length}</p>
        <div className="flex gap-2">
          <DashboardToolbarButton variant={view === "CARDS" ? "primary" : "glass"} onClick={() => setView("CARDS")}>Cards</DashboardToolbarButton>
          <DashboardToolbarButton variant={view === "LIST" ? "primary" : "glass"} onClick={() => setView("LIST")}>List</DashboardToolbarButton>
          {place ? (
            <>
              <DashboardToolbarButton onClick={() => router.push(`/fleet/trucks/locations/${place.id}/edit`)}>Edit location</DashboardToolbarButton>
              <DashboardToolbarButton
                disabled={detail.children.length > 0}
                onClick={() => {
                  void fleetApi
                    .saveLocation(
                      {
                        name: place.name,
                        type: place.type,
                        address: place.address ?? undefined,
                        city: place.city ?? undefined,
                        state: place.state ?? undefined,
                        latitude: place.latitude ?? undefined,
                        longitude: place.longitude ?? undefined,
                        responsibleName: place.responsibleName ?? undefined,
                        accessHours: place.accessHours ?? undefined,
                        maxCapacity: place.maxCapacity ?? undefined,
                        bayCount: place.bayCount ?? undefined,
                        emergencyContact: place.emergencyContact ?? undefined,
                        notes: place.notes ?? undefined,
                        status: "INACTIVE",
                      },
                      place.id,
                    )
                    .then(async () => {
                      toastSuccess("Location deactivated");
                      const next = await fleetApi.truckDetail(id);
                      setDetail(next.data);
                    })
                    .catch(toastApiError);
                }}
              >
                {detail.children.length > 0 ? `Move ${detail.children.length} assets before deactivating` : "Deactivate location"}
              </DashboardToolbarButton>
            </>
          ) : null}
        </div>
      </div>
      {detail.children.length === 0 ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">No assets list this location as their parent truck.</p>
      ) : view === "LIST" ? (
        <div className="overflow-hidden rounded-xl border border-[#2D2D30]">
          {detail.children.map((row) => (
            <div key={row.id} className="grid grid-cols-4 items-center gap-3 border-b border-[#2D2D30] px-4 py-3 last:border-b-0">
              <div>
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.assetLabel}</p>
                <p className="font-sans text-[10px] uppercase text-[#959597]">{row.assetCode}</p>
              </div>
              <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.equipmentType}</span>
              <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
              <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">Calib {row.calibration} · Repair {row.repair}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {detail.children.map((row) => (
            <article key={row.id} className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{row.assetLabel}</p>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">{row.equipmentType} · {row.assetCode}</p>
                </div>
                <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
              </div>
              <p className="mt-3 font-sans text-[11px] uppercase text-[#C8C8C8]">Calib {row.calibration} · Repair {row.repair}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <p className="font-sans text-[10px] uppercase text-[#959597]">{label}</p>
      <p className="mt-2 font-sans text-[22px] text-[#FDFDFF]">{value}</p>
      <p className="font-sans text-[10px] uppercase text-[#6B6B6D]">{meta}</p>
    </div>
  );
}
