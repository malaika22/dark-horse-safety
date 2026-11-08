"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { fleetApi, type FleetAssetDetail, type FleetAssetMoveResult } from "@/lib/fleet-api";
import { BrandLoader } from "@/features/loading/brand-loader";

const control =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

const REASONS = ["REPAIR NEEDED", "JOB ASSIGNMENT", "CALIBRATION", "RESTOCK", "RETURN FROM REPAIR", "OTHER"];

function stamp(date = new Date()) {
  return date
    .toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(",", "")
    .toUpperCase();
}

export function AssetMovePage({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [detail, setDetail] = React.useState<FleetAssetDetail | null>(null);
  const [to, setTo] = React.useState("");
  const [reason, setReason] = React.useState("REPAIR NEEDED");
  const [parent, setParent] = React.useState("N/A");
  const [checkedOutTo, setCheckedOutTo] = React.useState("");
  const [movedBy, setMovedBy] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [when] = React.useState(stamp);
  const [failure, setFailure] = React.useState("");
  const [result, setResult] = React.useState<FleetAssetMoveResult | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.getAsset(code);
      setDetail(res.data);
      const places = res.data.places;
      const fromName = res.data.from?.name ?? "";
      const repairBay = places.find((place) => /REPAIR|BAY/i.test(place.name) && place.name !== fromName);
      const other = places.find((place) => place.name !== fromName);
      const expired = res.data.asset.calibration === "EXPIRED";
      setTo((repairBay && expired ? repairBay.name : other?.name) ?? "");
      setMovedBy(res.data.asset.technician || res.data.employees[0]?.name || "");
      if (res.data.asset.repairCode) {
        setNotes(`OPEN REPAIR ${res.data.asset.repairCode} STAYS LINKED AFTER THE MOVE.`);
      }
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Couldn't load this asset");
    } finally {
      setLoading(false);
    }
  }, [code]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function confirm() {
    if (!detail) return;
    setBusy(true);
    setFailure("");
    try {
      const res = await fleetApi.moveAsset(detail.asset.assetCode, {
        to,
        reason,
        newParentTruck: parent === "N/A" ? "N/A" : parent,
        checkedOutTo: checkedOutTo || undefined,
        movedBy,
        notes,
      });
      setResult(res.data);
    } catch (err) {
      const from = detail.from?.name || detail.asset.home || "ITS CURRENT LOCATION";
      setFailure(`Couldn't complete the move. Your entries are saved. ${detail.asset.assetCode} is still on ${from}.`);
      if (err instanceof Error && err.message) setFailure((current) => current);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!result) return;
    setBusy(true);
    try {
      await fleetApi.undoAssetMove(result.assetCode, { from: result.from, to: result.to });
      setResult(null);
      await load();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Couldn't undo the move");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading asset" />
      </div>
    );
  }

  if (!detail) {
    return <p className="bg-shell p-6 font-sans text-[12px] uppercase text-[#E06A7A]">{failure || "Asset not found"}</p>;
  }

  const asset = detail.asset;
  const from = detail.from;
  const destination = detail.places.find((place) => place.name === to) ?? null;
  const trucks = detail.places.filter((place) => place.kind === "TRUCK");
  const expired = asset.calibration === "EXPIRED";

  return (
    <div className="bg-shell p-3 sm:p-5">
      <h1 className="mb-4 font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">Move asset</h1>
      <section className="space-y-4 rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] text-[#C8C8C8]">▣</div>
          <div>
            <div className="font-sans text-[16px] uppercase text-[#FDFDFF]">{asset.name} · {asset.assetCode}</div>
            <div className="font-sans text-[11px] uppercase text-[#959597]">{asset.category || asset.equipmentType} · {asset.kind}{asset.technician ? ` · ${asset.technician}` : ""}</div>
          </div>
        </div>
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          <PlaceCard label="From · current location" place={from} />
          <div className="hidden items-center text-[#959597] md:flex">→</div>
          <label className="rounded-xl border border-[#2D2D30] bg-[#1A1A1A] p-4">
            <div className="font-sans text-[10px] uppercase text-[#959597]">To · new location</div>
            <select className={`${control} mt-3`} value={to} onChange={(event) => setTo(event.target.value)}>
              {detail.places.map((place) => (
                <option key={place.id} value={place.name}>{place.name}</option>
              ))}
            </select>
            <div className="mt-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
              {destination ? `${destination.assets} assets${destination.driver ? ` · ${destination.driver}` : ""}` : "Select a location"}
            </div>
          </label>
        </div>
        {expired ? (
          <Notice>
            Calibration expired — moving to a repair bay is recommended before reassigning to a truck.
          </Notice>
        ) : null}
        {asset.repairCode ? (
          <Notice>
            This asset has an open repair request ({asset.repairCode}). It will remain linked after the move.
          </Notice>
        ) : null}
        <div className="rounded-xl border border-[#2D2D30] p-4">
          <h2 className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Move details</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Reason *">
              <select className={control} value={reason} onChange={(event) => setReason(event.target.value)}>
                {REASONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="New parent truck">
              <select className={control} value={parent} onChange={(event) => setParent(event.target.value)}>
                <option value="N/A">N/A (yard/repair)</option>
                {trucks.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
              </select>
            </Field>
            <Field label="Checked out to">
              <select className={control} value={checkedOutTo} onChange={(event) => setCheckedOutTo(event.target.value)}>
                <option value="">Leave blank for a permanent move</option>
                {detail.employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}
              </select>
            </Field>
            <Field label="Date / time">
              <input className={control} value={when} readOnly />
            </Field>
            <Field label="Moved by">
              <select className={control} value={movedBy} onChange={(event) => setMovedBy(event.target.value)}>
                {detail.employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={`${control} h-20 py-2`} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
        </div>
        {failure ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#6B2A2A] bg-[#2A1515] px-3 py-2">
            <p className="font-sans text-[11px] uppercase text-[#FF8A9A]">{failure}</p>
            <button type="button" onClick={() => void confirm()} className="rounded border border-[#6B2A2A] px-3 py-1 font-sans text-[11px] uppercase text-[#FDFDFF]">Retry</button>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={() => router.push("/fleet/assets")}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !to} onClick={() => void confirm()}>
            {busy ? "Moving" : "Confirm move"}
          </DashboardToolbarButton>
        </div>
      </section>
      {result ? (
        <div className="fixed bottom-4 right-4 z-40 max-w-xl rounded-lg border border-[#1F6B45] bg-[#10281C] px-4 py-3 shadow-lg">
          <div className="font-sans text-[12px] uppercase text-[#7DCEA0]">{result.message}</div>
          <div className="mt-1 font-sans text-[11px] uppercase text-[#C8C8C8]">
            {result.from || "Previous location"}
            {result.readinessBefore != null && result.readinessAfter != null
              ? ` readiness is now ${result.readinessAfter}% (was ${result.readinessBefore}%)`
              : " was updated"}
            {result.repairCode ? ` · ${result.repairCode} still linked` : ""}
          </div>
          <div className="mt-2 flex gap-3 font-sans text-[11px] uppercase text-[#8EB4FF]">
            <button type="button" onClick={() => router.push(`/fleet/assets/${encodeURIComponent(result.assetCode)}/edit`)}>View asset</button>
            {result.fromId ? <button type="button" onClick={() => router.push(`/fleet/trucks/${result.fromId}`)}>View {result.from}</button> : null}
            <button type="button" disabled={busy} onClick={() => void undo()}>Undo</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlaceCard({ label, place }: { label: string; place: FleetAssetDetail["from"] }) {
  return (
    <div className="rounded-xl border border-[#2D2D30] bg-[#1A1A1A] p-4">
      <div className="font-sans text-[10px] uppercase text-[#959597]">{label}</div>
      <div className="mt-3 font-sans text-[16px] uppercase text-[#FDFDFF]">{place?.name ?? "Unassigned"}</div>
      <div className="mt-1 font-sans text-[11px] uppercase text-[#C8C8C8]">
        {place ? `${place.unit}${place.driver ? ` · ${place.driver}` : ""} · ${place.assets} assets` : "No current truck or yard"}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-sans text-[11px] uppercase text-[#959597]">{label}</span>
      {children}
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-[#5A4A1F] bg-[#241E10] px-3 py-2 font-sans text-[11px] uppercase text-[#E8C547]">{children}</div>;
}
