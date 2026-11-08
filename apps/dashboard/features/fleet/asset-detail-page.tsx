"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardBadge, DashboardModal, DashboardRowActionMenu, DashboardToolbarButton } from "@dark-horse-safety/ui";
import { fleetApi, type FleetAssetDetail } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
const TABS = ["OVERVIEW", "CALIBRATION & DATES", "HISTORY", "MOVEMENT", "INCIDENTS", "DOCUMENTS", "NOTES"] as const;

function shortDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

export function AssetDetailPage({ code }: { code: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<FleetAssetDetail | null>(null);
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("OVERVIEW");
  const [note, setNote] = React.useState("");
  const [action, setAction] = React.useState<null | "checkout" | "checkin" | "oos" | "missing" | "retire" | "cal">(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.getAsset(code);
      setDetail(res.data);
    } catch (err) {
      toastApiError(err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [code]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const requested = params.get("action");
    if (
      requested === "checkout" ||
      requested === "checkin" ||
      requested === "oos" ||
      requested === "missing" ||
      requested === "retire" ||
      requested === "cal"
    ) {
      setAction(requested);
    }
  }, [params]);

  if (loading || !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading asset" />
      </div>
    );
  }

  const asset = detail.asset;
  const record = detail.record;
  const index = detail.peers.indexOf(asset.assetCode);
  const prev = index > 0 ? detail.peers[index - 1] : null;
  const next = index >= 0 && index < detail.peers.length - 1 ? detail.peers[index + 1] : null;
  const score = record.weighted;

  async function saveNote() {
    if (!note.trim()) return;
    try {
      await fleetApi.addAssetNote(asset.assetCode, note.trim());
      setNote("");
      toastSuccess("Note saved");
      await load();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]">{asset.name} · {asset.assetCode}</span>
          <button type="button" disabled={!prev} onClick={() => prev && router.push(`/fleet/assets/${encodeURIComponent(prev)}`)} className="rounded border border-[#2D2D30] px-2 py-1 text-[#FDFDFF] disabled:opacity-40">‹</button>
          <span className="font-sans text-[11px] uppercase text-[#959597]">{index + 1} of {detail.peers.length}</span>
          <button type="button" disabled={!next} onClick={() => next && router.push(`/fleet/assets/${encodeURIComponent(next)}`)} className="rounded border border-[#2D2D30] px-2 py-1 text-[#FDFDFF] disabled:opacity-40">›</button>
        </div>
        <div className="flex items-center gap-2">
          <DashboardRowActionMenu
            items={[
              { id: "edit", label: "Edit", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(asset.assetCode)}/edit`) },
              { id: "move", label: "Move", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(asset.assetCode)}/move`) },
              { id: "out", label: "Check out", onSelect: () => setAction("checkout") },
              { id: "in", label: "Check in", onSelect: () => setAction("checkin") },
              { id: "cal", label: "Mark calibration complete", onSelect: () => setAction("cal") },
              { id: "insp", label: "Add inspection", onSelect: () => router.push("/fleet/inspections/new") },
              { id: "repair", label: "Create repair request", onSelect: () => router.push("/fleet/repair-requests") },
              { id: "note", label: "Add note", onSelect: () => setTab("NOTES") },
              { id: "truck", label: "View parent truck", onSelect: () => detail.from && router.push(`/fleet/trucks/${detail.from.id}`) },
              { id: "oos", label: "Mark out of service", destructive: true, onSelect: () => setAction("oos") },
              { id: "missing", label: "Mark missing", destructive: true, onSelect: () => setAction("missing") },
              { id: "retire", label: "Retire asset", destructive: true, onSelect: () => setAction("retire") },
            ]}
          />
          <DashboardToolbarButton onClick={() => router.push(`/fleet/assets/${encodeURIComponent(asset.assetCode)}/edit`)}>Edit asset</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => router.push(`/fleet/assets/${encodeURIComponent(asset.assetCode)}/move`)}>Move asset</DashboardToolbarButton>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-[#2D2D30] bg-[#141414] p-4 lg:grid-cols-[1fr_180px]">
        <div>
          <h1 className="font-sans text-[20px] uppercase text-[#FDFDFF]">{asset.name}</h1>
          <div className="mt-3 grid gap-3 font-sans text-[11px] uppercase text-[#C8C8C8] sm:grid-cols-4">
            <Info label="Serial" value={asset.serial || "—"} />
            <Info label="Location" value={asset.checkedOutTo ? `Checked out · ${asset.checkedOutTo}` : "On parent truck"} />
            <Info label="Home" value={asset.home || "—"} />
            <Info label="Technician" value={asset.technician || "—"} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-sans text-[28px] text-[#7DCEA0]">{score}%</div>
          <DashboardBadge variant={score >= 85 ? "success" : "warning"}>{asset.status || "READY"}</DashboardBadge>
          <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">Equal-weight average</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1 font-sans text-[10px] uppercase ${tab === item ? "bg-[#FDFDFF] text-[#121212]" : "bg-[#1A1A1A] text-[#C8C8C8]"}`}>
            {item}
            {item === "HISTORY" ? ` ${record.history.length}` : ""}
            {item === "MOVEMENT" ? ` ${record.movements.length}` : ""}
            {item === "INCIDENTS" ? ` ${record.incidents.length}` : ""}
            {item === "DOCUMENTS" ? ` ${record.documents.length}` : ""}
            {item === "NOTES" ? ` ${record.notes.length}` : ""}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
          {tab === "OVERVIEW" ? (
            <div className="grid gap-4 font-sans text-[12px] uppercase text-[#C8C8C8] sm:grid-cols-3">
              <Info label="Category" value={asset.category || asset.equipmentType} />
              <Info label="Type" value={asset.kind} />
              <Info label="Status" value={asset.status} />
              <Info label="Condition" value={asset.condition || "—"} />
              <Info label="Assigned tech" value={asset.technician || "—"} />
              <Info label="Vendor" value={asset.vendor || asset.preferredVendor || "—"} />
              <Info label="Replacement value" value={asset.replacementValue == null ? "—" : `$${asset.replacementValue.toLocaleString()}`} />
              <Info label="Purchase date" value={asset.purchaseDate || "—"} />
            </div>
          ) : null}
          {tab === "CALIBRATION & DATES" ? (
            <div className="grid gap-4 font-sans text-[12px] uppercase text-[#C8C8C8] sm:grid-cols-3">
              <Info label="Last calibration" value={shortDate(record.calibrationDate)} />
              <Info label="Next due" value={shortDate(record.nextCalibrationDue)} />
              <Info label="Result" value={asset.calibration} />
              <Info label="Bump test" value={shortDate(record.bumpTestDate)} />
              <Info label="Frequency" value={record.calibrationInterval || "—"} />
              <Info label="Bump result" value={record.bumpResult || "—"} />
              {record.clocks.map((clock) => (
                <Info key={clock.test} label={clock.test} value={`${shortDate(clock.lastDone)} → ${shortDate(clock.nextDue)} · ${clock.result || "—"}`} />
              ))}
            </div>
          ) : null}
          {tab === "HISTORY" ? <Rows empty="No inspections, calibrations, or repairs on this asset." rows={record.history.map((row) => ({ title: `${row.code} · ${row.label}`, meta: `${shortDate(row.date)} · ${row.result}`, href: row.href }))} /> : null}
          {tab === "MOVEMENT" ? <Rows empty="No recorded moves." rows={record.movements.map((row) => ({ title: `${row.from || "—"} → ${row.to || "—"}`, meta: `${row.who} · ${shortDate(row.when)} · ${row.why}` }))} /> : null}
          {tab === "INCIDENTS" ? <Rows empty="No failed inspections or repair requests." rows={record.incidents.map((row) => ({ title: `${row.code} · ${row.severity}`, meta: `${row.summary || "Logged from the fleet record"} · ${shortDate(row.date)}`, href: row.href }))} /> : null}
          {tab === "DOCUMENTS" ? <Rows empty="No documents attached." rows={record.documents.map((row) => ({ title: row.name, meta: `${row.type} · ${row.expiry || "No expiry"} · ${row.status}`, href: row.url }))} /> : null}
          {tab === "NOTES" ? (
            <div className="space-y-3">
              <Rows empty="No notes yet." rows={record.notes.map((row) => ({ title: row.text, meta: shortDate(row.at) }))} />
              <div className="flex gap-2">
                <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note" className="h-10 flex-1 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF]" />
                <DashboardToolbarButton variant="primary" onClick={() => void saveNote()}>Save note</DashboardToolbarButton>
              </div>
            </div>
          ) : null}
        </section>
        <aside className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
          <h2 className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Health / readiness</h2>
          <div className="space-y-3">
            {record.health.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between font-sans text-[10px] uppercase text-[#C8C8C8]"><span>{row.label}</span><span>{row.value}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]"><div className="h-full bg-[#3DDC97]" style={{ width: `${row.value}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Equal-weight average · {record.weighted}%</p>
          <DashboardToolbarButton className="mt-4" onClick={() => setAction(asset.checkedOutTo ? "checkin" : "checkout")}>
            {asset.checkedOutTo ? `Check in from ${asset.checkedOutTo}` : "Check out"}
          </DashboardToolbarButton>
        </aside>
      </div>
      <AssetActionModal
        key={action ?? "closed"}
        action={action}
        detail={detail}
        people={detail.employees.map((person) => person.name)}
        places={detail.places.map((place) => place.name)}
        onClose={() => setAction(null)}
        onDone={() => { setAction(null); void load(); }}
      />
    </div>
  );
}

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF]";

function AssetActionModal({
  action, detail, people, places, onClose, onDone,
}: {
  action: null | "checkout" | "checkin" | "oos" | "missing" | "retire" | "cal";
  detail: FleetAssetDetail;
  people: string[];
  places: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const asset = detail.asset;
  const [person, setPerson] = React.useState(asset.technician || people[0] || "");
  const [when, setWhen] = React.useState("");
  const [due, setDue] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [destination, setDestination] = React.useState(asset.home || places[0] || "");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [result, setResult] = React.useState("PASS");
  const [createRepair, setCreateRepair] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function readinessOf(name: string) {
    const overview = await fleetApi.trucksOverview().catch(() => null);
    return overview?.data.cards.find((card) => card.name.toUpperCase() === name.toUpperCase())?.readiness ?? null;
  }

  async function submit() {
    if (!action) return;
    if ((action === "checkout" || action === "checkin" || action === "cal") && !person.trim()) {
      setError("A person is required. Your other entries are preserved.");
      return;
    }
    if ((action === "oos" || action === "missing" || action === "retire") && !reason.trim()) {
      setError("A reason is required. Your other entries are preserved.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const home = asset.home || destination;
      if (action === "checkout") {
        await fleetApi.checkoutAsset(asset.assetCode, { technician: person.trim(), due: due || undefined, reference: reference.trim() || undefined });
      }
      if (action === "checkin") {
        await fleetApi.checkInAsset(asset.assetCode);
        if (notes.trim() || reason.trim()) {
          await fleetApi.addAssetNote(asset.assetCode, `CHECK IN · ${reason || "NO CONDITION NOTED"}${notes.trim() ? ` · ${notes.trim()}` : ""}`);
        }
        if (destination && asset.home && destination.toUpperCase() !== asset.home.toUpperCase()) {
          try {
            await fleetApi.moveAsset(asset.assetCode, { to: destination, reason: reason.trim() || "CHECK IN" });
          } catch {
            setError(`${asset.assetCode} was checked in. The move to ${destination} did not complete.`);
            return;
          }
        }
      }
      if (action === "oos") {
        await fleetApi.bulkAssets({ codes: [asset.assetCode], action: "OUT_OF_SERVICE" });
        await fleetApi.addAssetNote(asset.assetCode, `OUT OF SERVICE · ${reason.trim()}`);
        if (createRepair) {
          await fleetApi.createRepair({ assetCode: asset.assetCode, assetLabel: asset.name, parentTruck: home || undefined, issue: reason.trim(), issueType: "OUT OF SERVICE" });
        }
      }
      if (action === "missing") {
        await fleetApi.reportMissing({
          assetCode: asset.assetCode,
          assetLabel: asset.name,
          replacementValue: asset.replacementValue ?? 0,
          lastTruck: home || undefined,
          lastHolder: asset.technician || person.trim() || undefined,
        });
        await fleetApi.addAssetNote(asset.assetCode, `MARKED MISSING · ${reason.trim()}`);
      }
      if (action === "retire") {
        await fleetApi.retireAsset(asset.assetCode);
        await fleetApi.addAssetNote(asset.assetCode, `RETIRED · ${reason.trim()}`);
      }
      if (action === "cal") {
        await fleetApi.createCalibration({
          assetCode: asset.assetCode,
          assetLabel: asset.name,
          serial: asset.serial || undefined,
          model: asset.model || undefined,
          parentTruck: home || undefined,
          technician: person.trim(),
          result,
          lastCalAt: when ? new Date(when).toISOString() : new Date().toISOString(),
          frequencyDays: 90,
          notes: notes.trim() || undefined,
          calType: "FULL CALIBRATION",
        });
      }
      const score = home ? await readinessOf(home) : null;
      const readiness = score != null ? ` ${home} readiness is now ${score}%.` : "";
      const copy = {
        checkout: `${asset.assetCode} checked out to ${person.trim()}.${due ? ` Due back ${due}.` : ""}${readiness}`,
        checkin: `${asset.assetCode} returned to ${home || "its home"}.${readiness}`,
        oos: `${asset.assetCode} marked out of service.${readiness}`,
        missing: `${asset.assetCode} marked missing.${asset.replacementValue != null ? ` Value on the record is $${asset.replacementValue.toLocaleString()}.` : ""}`,
        retire: `${asset.assetCode} retired. History is kept. This action cannot be reversed.`,
        cal: `${asset.assetCode} calibration recorded.${readiness}`,
      }[action];
      setSuccess(copy);
      toastSuccess(copy);
    } catch (err) {
      setError("Couldn't complete this action. Your entries are preserved.");
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    checkout: "Check out equipment",
    checkin: "Check in equipment",
    oos: "Mark out of service",
    missing: "Mark asset missing",
    retire: "Retire asset",
    cal: "Calibration complete",
  };
  if (!action) return null;
  return (
    <DashboardModal
      open
      onClose={onClose}
      title={titles[action]}
      widthClassName="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={success ? onDone : onClose}>{success ? "Done" : "Cancel"}</DashboardToolbarButton>
          {success ? null : (
            <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void submit()}>
              {action === "checkout" ? "Check out" : action === "checkin" ? "Check in" : action === "retire" ? "Retire asset" : action === "cal" ? "Mark complete" : action === "missing" ? "Mark missing" : "Mark out of service"}
            </DashboardToolbarButton>
          )}
        </div>
      }
    >
      <p className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">{asset.name} · {asset.assetCode}{asset.home ? ` · ${asset.home}` : ""}</p>
      {action === "checkout" || action === "checkin" || action === "cal" ? (
        <label className="mb-3 block font-sans text-[10px] uppercase text-[#959597]">{action === "checkin" ? "Returned by" : action === "cal" ? "Completed by" : "Checked out to"}
          <input className={fieldClass} list="asset-action-people" value={person} onChange={(e) => setPerson(e.target.value)} />
          <datalist id="asset-action-people">{people.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
      ) : null}
      {action === "checkout" ? (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-[10px] uppercase text-[#959597]">Work order<input className={fieldClass} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
          <label className="font-sans text-[10px] uppercase text-[#959597]">Due back<input type="date" className={fieldClass} value={due} onChange={(e) => setDue(e.target.value)} /></label>
        </div>
      ) : null}
      {action === "checkin" ? (
        <label className="mb-3 block font-sans text-[10px] uppercase text-[#959597]">Return to
          <select className={fieldClass} value={destination} onChange={(e) => setDestination(e.target.value)}>
            {places.map((place) => <option key={place} value={place}>{place}</option>)}
          </select>
        </label>
      ) : null}
      {action === "cal" ? (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-[10px] uppercase text-[#959597]">Date and time<input type="datetime-local" className={fieldClass} value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label className="font-sans text-[10px] uppercase text-[#959597]">Result
            <select className={fieldClass} value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="PASS">PASS</option>
              <option value="PASS_WITH_ADJUSTMENT">PASS WITH ADJUSTMENT</option>
              <option value="FAILED">FAIL</option>
            </select>
          </label>
        </div>
      ) : null}
      {action === "oos" || action === "missing" || action === "retire" || action === "checkin" ? (
        <label className="mb-3 block font-sans text-[10px] uppercase text-[#959597]">{action === "checkin" ? "Condition on return" : "Reason"}
          <input className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      ) : null}
      {action === "oos" ? (
        <label className="mb-3 flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
          <input type="checkbox" checked={createRepair} onChange={(e) => setCreateRepair(e.target.checked)} />
          Create a repair request from this reason
        </label>
      ) : null}
      {action === "missing" ? (
        <p className="mb-3 font-sans text-[11px] uppercase text-[#E8C547]">
          Replacement value on the asset record: {asset.replacementValue == null ? "not stored" : `$${asset.replacementValue.toLocaleString()}`}
        </p>
      ) : null}
      {action === "retire" ? (
        <p className="mb-3 font-sans text-[11px] uppercase text-[#E8C547]">Admin only. This removes the asset from active inventory and cannot be reversed.</p>
      ) : null}
      <label className="block font-sans text-[10px] uppercase text-[#959597]">Notes
        <textarea className={fieldClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#FF4D4D] bg-[#3A1717] px-3 py-2">
          <p className="font-sans text-[12px] uppercase text-[#FF8A9A]">{error}</p>
          <DashboardToolbarButton disabled={busy} onClick={() => void submit()}>Retry</DashboardToolbarButton>
        </div>
      ) : null}
      {success ? <p className="mt-3 rounded-lg border border-[#2F6B45] bg-[#13281C] px-3 py-2 font-sans text-[12px] uppercase text-[#7DCEA0]">{success}</p> : null}
    </DashboardModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#959597]">{label}</div>
      <div className="mt-1 text-[#FDFDFF]">{value}</div>
    </div>
  );
}

function Rows({ rows, empty }: { rows: Array<{ title: string; meta: string; href?: string }>; empty: string }) {
  if (!rows.length) return <p className="font-sans text-[12px] uppercase text-[#959597]">{empty}</p>;
  return (
    <div className="divide-y divide-[#2D2D30]">
      {rows.map((row) => (
        <div key={`${row.title}-${row.meta}`} className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.title}</div>
            <div className="font-sans text-[10px] uppercase text-[#959597]">{row.meta}</div>
          </div>
          {row.href ? <a className="font-sans text-[10px] uppercase text-[#8EB4FF]" href={row.href}>Open</a> : null}
        </div>
      ))}
    </div>
  );
}
