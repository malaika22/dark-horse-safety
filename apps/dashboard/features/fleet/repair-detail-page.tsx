"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardModal,
  DashboardRowActionMenu,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetPlaceCard, type FleetRepairDetail } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { fleetBadgeTone } from "./fleet-ui";

const fieldClass =
  "w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

function stamp(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Chicago",
    })
    .toUpperCase();
}

function money(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function RepairDetailPage({ code }: { code: string }) {
  const router = useRouter();
  const [repair, setRepair] = React.useState<FleetRepairDetail | null>(null);
  const [places, setPlaces] = React.useState<FleetPlaceCard[]>([]);
  const [people, setPeople] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [partOpen, setPartOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const [detail, trucks] = await Promise.all([
      fleetApi.getRepair(code),
      fleetApi.trucksOverview(),
    ]);
    setRepair(detail.data);
    setPlaces(trucks.data.cards ?? []);
    setPeople(trucks.data.employees?.map((person) => person.name) ?? []);
    return detail.data;
  }, [code]);

  React.useEffect(() => {
    void load()
      .then((row) => {
        if (window.location.hash === "#resolve") setResolveOpen(true);
        if (window.location.hash === "#print") window.setTimeout(() => window.print(), 300);
        return row;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        toastApiError(err);
      });
  }, [load]);

  if (error && !repair) {
    return <p className="p-6 font-sans text-[13px] uppercase text-[#FF8A9A]">{error}</p>;
  }
  if (!repair) {
    return <p className="p-6 font-sans text-[13px] uppercase text-[#959597]">Loading repair request…</p>;
  }

  const peers = repair.peers ?? [];
  const index = peers.findIndex((item) => item.toUpperCase() === repair.code.toUpperCase());
  const prev = index > 0 ? peers[index - 1] : null;
  const next = index >= 0 && index < peers.length - 1 ? peers[index + 1] : null;
  const partTotal = repair.parts.reduce((sum, part) => sum + (part.cost ?? 0), 0);

  async function save(body: Parameters<typeof fleetApi.updateRepair>[1], message: string) {
    setBusy(true);
    try {
      const res = await fleetApi.updateRepair(repair!.id, body);
      setRepair(res.data);
      toastSuccess(message);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-[18px] font-[590] uppercase text-[#FDFDFF] md:text-[22px]">
            {repair.code} · {repair.assetLabel}
          </h1>
          <div className="flex items-center gap-1">
            <button type="button" disabled={!prev} onClick={() => prev && router.push(`/fleet/repair-requests/${prev}`)} className="rounded-md border border-[#2D2D30] px-2 py-1 font-sans text-[11px] text-[#FDFDFF] disabled:opacity-40">‹</button>
            <span className="font-sans text-[11px] uppercase text-[#959597]">{index >= 0 ? `${index + 1} of ${peers.length}` : "—"}</span>
            <button type="button" disabled={!next} onClick={() => next && router.push(`/fleet/repair-requests/${next}`)} className="rounded-md border border-[#2D2D30] px-2 py-1 font-sans text-[11px] text-[#FDFDFF] disabled:opacity-40">›</button>
          </div>
        </div>
        <DashboardToolbarButton onClick={() => setEditOpen(true)}>Edit request</DashboardToolbarButton>
      </div>

      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-sans text-[16px] uppercase text-[#FDFDFF]">{repair.code} · {repair.assetLabel}</h2>
              <DashboardBadge variant={fleetBadgeTone(repair.priorityTone)}>{repair.priorityLabel}</DashboardBadge>
            </div>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              {[repair.parentTruck, repair.reportedBy ? `Reported by ${repair.reportedBy}` : null, repair.dateLabel].filter(Boolean).join(" · ")}
            </p>
          </div>
          <DashboardBadge variant={fleetBadgeTone(repair.statusTone)}>{repair.statusLabel}</DashboardBadge>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <Panel title="Issue description">
            <p className="font-sans text-[13px] uppercase leading-relaxed text-[#C8C8C8]">{repair.issue}</p>
          </Panel>
          <Panel title="Asset & location">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Fact label="Asset" value={`${repair.assetLabel} · ${repair.assetCode}`} />
              <Fact label="Serial" value={repair.serial} />
              <Fact label="Category" value={repair.category} />
              <Fact label="Parent truck" value={repair.parentTruck} />
              <Fact label="Current location" value={repair.location} />
              <Fact
                label="Linked inspection"
                value={
                  repair.inspectionCode ? (
                    <Link href={repair.inspectionId ? `/fleet/inspections/${repair.inspectionId}` : "/fleet/inspections"} className="text-[#8EB4FF]">
                      {repair.inspectionCode}
                    </Link>
                  ) : "—"
                }
              />
            </dl>
          </Panel>
          <Panel title="Activity timeline">
            {repair.timeline.length === 0 ? (
              <p className="font-sans text-[12px] uppercase text-[#959597]">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {repair.timeline.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 border-b border-[#2D2D30] py-2">
                    <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{event.label}</span>
                    <span className="text-right font-sans text-[11px] uppercase text-[#959597]">
                      {[event.by, stamp(event.at)].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Parts">
            {repair.parts.length === 0 ? (
              <p className="font-sans text-[12px] uppercase text-[#959597]">No parts are recorded on this request.</p>
            ) : (
              <ul className="space-y-3">
                {repair.parts.map((part) => (
                  <li key={part.id} className="grid gap-2 border-b border-[#2D2D30] py-2 sm:grid-cols-[1.4fr_1fr_auto]">
                    <div>
                      <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{part.name}{part.sku ? ` · ${part.sku}` : ""}</p>
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        {part.orderedAt ? `Ordered ${stamp(part.orderedAt)}` : "Ordered"}
                        {part.vendor ? ` · ${part.vendor}` : ""}
                        {part.cost != null ? ` · ${money(part.cost)}` : ""}
                      </p>
                    </div>
                    <div className="font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {part.po ? <div>PO {part.po}</div> : null}
                      {part.workOrder ? <div>WO {part.workOrder}</div> : null}
                      {part.customer ? <div>{part.customer}</div> : null}
                      <div>{part.billable ? "Billable" : "Not billable"}</div>
                    </div>
                    <div className="font-sans text-[13px] text-[#FDFDFF]">{money(part.cost) ?? "—"}</div>
                  </li>
                ))}
              </ul>
            )}
            {partTotal > 0 ? (
              <p className="mt-3 text-right font-sans text-[13px] text-[#FDFDFF]">{money(partTotal)}</p>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Details">
            <dl className="space-y-2">
              <Row label="Priority" value={<span className="text-[#FF8A9A]">{repair.priorityLabel}</span>} />
              <Row label="Status" value={<span className="text-[#7DCEA0]">{repair.statusLabel}</span>} />
              <Row label="Assigned to" value={repair.assignedName} />
              <Row label="Downtime" value={repair.daysOpen != null ? `${repair.daysOpen} days` : null} />
              <Row label="Vendor / shop" value={repair.vendor} />
              <Row label="ETA" value={repair.etaLabel} />
            </dl>
          </Panel>
          <Panel
            title="Actions"
            extra={
              <DashboardRowActionMenu
                items={[
                  { id: "resolve", label: "Resolve", onSelect: () => setResolveOpen(true) },
                  { id: "vendor", label: "Reassign vendor", onSelect: () => setEditOpen(true) },
                  { id: "eta", label: "Update ETA", onSelect: () => setEditOpen(true) },
                  { id: "po", label: "Link purchase order", onSelect: () => setPartOpen(true) },
                  { id: "move", label: "Move asset", onSelect: () => router.push(`/fleet/assets/${encodeURIComponent(repair.assetCode)}/move`) },
                  { id: "print", label: "Print work ticket", onSelect: () => window.print() },
                  {
                    id: "corrective",
                    label: "Create corrective action",
                    onSelect: () => {
                      if (repair.inspectionId) router.push(`/fleet/inspections/${repair.inspectionId}`);
                      else toastSuccess("This request has no linked inspection");
                    },
                  },
                  {
                    id: "cancel",
                    label: "Cancel request",
                    destructive: true,
                    onSelect: () => {
                      void fleetApi.cancelRepair(repair.id).then(() => {
                        toastSuccess(`${repair.code} cancelled`);
                        router.push("/fleet/repair-requests");
                      }).catch(toastApiError);
                    },
                  },
                ]}
              />
            }
          >
            <div className="flex flex-col gap-2">
              <DashboardToolbarButton variant="primary" disabled={busy || repair.status === "CLOSED"} onClick={() => void save({ status: "IN_REPAIR" }, "Marked in progress")}>
                Mark in progress
              </DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => setPartOpen(true)}>Order parts</DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => setAssignOpen(true)}>Assign technician</DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => setNoteOpen(true)}>Add note</DashboardToolbarButton>
            </div>
          </Panel>
        </div>
      </div>

      <EditModal
        open={editOpen}
        repair={repair}
        busy={busy}
        onClose={() => setEditOpen(false)}
        onSave={async (body) => {
          await save(body, "Repair request updated");
          setEditOpen(false);
        }}
      />
      <PartModal
        open={partOpen}
        repair={repair}
        busy={busy}
        onClose={() => setPartOpen(false)}
        onSave={async (body) => {
          setBusy(true);
          try {
            const res = await fleetApi.addRepairPart(repair.id, body);
            setRepair(res.data);
            setPartOpen(false);
            toastSuccess("Part added");
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        }}
      />
      <NoteModal
        open={noteOpen}
        busy={busy}
        onClose={() => setNoteOpen(false)}
        onSave={async (text) => {
          setBusy(true);
          try {
            const res = await fleetApi.addRepairNote(repair.id, text);
            setRepair(res.data);
            setNoteOpen(false);
            toastSuccess("Note added");
          } catch (err) {
            toastApiError(err);
          } finally {
            setBusy(false);
          }
        }}
      />
      <AssignModal
        open={assignOpen}
        people={people}
        current={repair.assignedName}
        busy={busy}
        onClose={() => setAssignOpen(false)}
        onSave={async (name) => {
          await save({ assignedName: name }, "Technician assigned");
          setAssignOpen(false);
        }}
      />
      <ResolveModal
        open={resolveOpen}
        repair={repair}
        places={places}
        people={people}
        busy={busy}
        onClose={() => setResolveOpen(false)}
        onSave={async (body) => {
          setBusy(true);
          try {
            const res = await fleetApi.resolveRepair(repair.id, body);
            setRepair(res.data);
            setResolveOpen(false);
            const overview = await fleetApi.trucksOverview().catch(() => null);
            const truck = overview?.data.cards.find(
              (card) => card.name.toUpperCase() === body.returnTo.trim().toUpperCase(),
            );
            toastSuccess(
              `${repair.code} resolved. ${repair.assetLabel} returned to ${body.returnTo}.${
                truck?.readiness != null ? ` ${truck.name} readiness updated to ${truck.readiness}%.` : ""
              }`,
            );
          } catch (err) {
            throw err;
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function Panel({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-[10px] uppercase text-[#959597]">{label}</dt>
      <dd className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">{value || "—"}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-sans text-[11px] uppercase text-[#959597]">{label}</dt>
      <dd className="text-right font-sans text-[12px] uppercase text-[#FDFDFF]">{value || "—"}</dd>
    </div>
  );
}

function EditModal({
  open, repair, busy, onClose, onSave,
}: {
  open: boolean;
  repair: FleetRepairDetail;
  busy: boolean;
  onClose: () => void;
  onSave: (body: Parameters<typeof fleetApi.updateRepair>[1]) => Promise<void>;
}) {
  const [issue, setIssue] = React.useState(repair.issue);
  const [priority, setPriority] = React.useState(repair.priority);
  const [status, setStatus] = React.useState(repair.status);
  const [vendor, setVendor] = React.useState(repair.vendor ?? "");
  const [eta, setEta] = React.useState(repair.etaLabel ?? "");
  const [assigned, setAssigned] = React.useState(repair.assignedName ?? "");
  const [location, setLocation] = React.useState(repair.location ?? "");
  React.useEffect(() => {
    if (!open) return;
    setIssue(repair.issue);
    setPriority(repair.priority);
    setStatus(repair.status);
    setVendor(repair.vendor ?? "");
    setEta(repair.etaLabel ?? "");
    setAssigned(repair.assignedName ?? "");
    setLocation(repair.location ?? "");
  }, [open, repair]);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={`Edit ${repair.code}`}
      widthClassName="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void onSave({ issue, priority, status, vendorName: vendor, etaLabel: eta, assignedName: assigned, location })}>Save</DashboardToolbarButton>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="font-sans text-[11px] uppercase text-[#959597]">Issue<textarea className={fieldClass} rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-[11px] uppercase text-[#959597]">Priority<select className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value)}>{["URGENT", "HIGH", "MEDIUM", "LOW"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Status<select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>{["OPEN", "IN_REPAIR", "AWAITING_PARTS", "CLOSED", "CANCELLED"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Vendor<input className={fieldClass} value={vendor} onChange={(e) => setVendor(e.target.value)} /></label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">ETA<input className={fieldClass} value={eta} onChange={(e) => setEta(e.target.value)} /></label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Assigned<input className={fieldClass} value={assigned} onChange={(e) => setAssigned(e.target.value)} /></label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Location<input className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        </div>
      </div>
    </DashboardModal>
  );
}

function PartModal({
  open, repair, busy, onClose, onSave,
}: {
  open: boolean;
  repair: FleetRepairDetail;
  busy: boolean;
  onClose: () => void;
  onSave: (body: { name: string; sku?: string; vendor?: string; cost?: number; po?: string }) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [vendor, setVendor] = React.useState(repair.vendor ?? "");
  const [cost, setCost] = React.useState("");
  const [po, setPo] = React.useState(repair.purchaseOrder ?? "");
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Order parts"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !name.trim()} onClick={() => void onSave({ name: name.trim(), sku: sku.trim() || undefined, vendor: vendor.trim() || undefined, cost: cost ? Number(cost) : undefined, po: po.trim() || undefined })}>Add part</DashboardToolbarButton>
        </div>
      }
    >
      <div className="grid gap-3">
        <input className={fieldClass} placeholder="Part name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={fieldClass} placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input className={fieldClass} placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <input className={fieldClass} placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} />
        <input className={fieldClass} placeholder="Purchase order" value={po} onChange={(e) => setPo(e.target.value)} />
      </div>
    </DashboardModal>
  );
}

function NoteModal({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = React.useState("");
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Add note"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !text.trim()} onClick={() => void onSave(text.trim())}>Save note</DashboardToolbarButton>
        </div>
      }
    >
      <textarea className={fieldClass} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
    </DashboardModal>
  );
}

function AssignModal({
  open, people, current, busy, onClose, onSave,
}: {
  open: boolean;
  people: string[];
  current: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState(current ?? "");
  React.useEffect(() => { if (open) setName(current ?? ""); }, [open, current]);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Assign technician"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !name.trim()} onClick={() => void onSave(name.trim())}>Assign</DashboardToolbarButton>
        </div>
      }
    >
      <input className={fieldClass} list="repair-people" value={name} onChange={(e) => setName(e.target.value)} />
      <datalist id="repair-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
    </DashboardModal>
  );
}

function ResolveModal({
  open, repair, places, people, busy, onClose, onSave,
}: {
  open: boolean;
  repair: FleetRepairDetail;
  places: FleetPlaceCard[];
  people: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (body: {
    resolution: string;
    resolvedBy: string;
    actualCost?: number;
    partsUsed?: string;
    returnTo: string;
    requiresReinspection: boolean;
    closeFollowUp: boolean;
  }) => Promise<void>;
}) {
  const [resolution, setResolution] = React.useState("REPAIRED");
  const [resolvedBy, setResolvedBy] = React.useState(repair.assignedName ?? "");
  const [cost, setCost] = React.useState(repair.actualCost != null ? String(repair.actualCost) : "");
  const [partsUsed, setPartsUsed] = React.useState(repair.parts.map((part) => part.name).join(", "));
  const [returnTo, setReturnTo] = React.useState(repair.parentTruck ?? "");
  const [reinspect, setReinspect] = React.useState(false);
  const [closeFollowUp, setCloseFollowUp] = React.useState(Boolean(repair.inspectionCode));
  const [error, setError] = React.useState<string | null>(null);
  const trucks = places.filter((place) => place.kind === "TRUCK");
  const happen = [
    `${repair.assetLabel} ${repair.assetCode} will be marked ${resolution.replace(/_/g, " ")}.`,
    returnTo ? `It will be returned to ${returnTo}.` : null,
    reinspect ? "A re-inspection is flagged on this request." : null,
    closeFollowUp && repair.inspectionCode ? `${repair.inspectionCode} follow-up is recorded on this request.` : null,
  ].filter(Boolean);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={`Resolve repair — ${repair.code}`}
      widthClassName="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !resolvedBy.trim() || !returnTo.trim()} onClick={() => {
            setError(null);
            void onSave({ resolution, resolvedBy: resolvedBy.trim(), actualCost: cost ? Number(cost) : undefined, partsUsed: partsUsed.trim() || undefined, returnTo, requiresReinspection: reinspect, closeFollowUp }).catch(() => {
              setError(`Couldn’t resolve ${repair.code}. Your entries are preserved.`);
            });
          }}>
            Resolve and return asset
          </DashboardToolbarButton>
        </div>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase text-[#959597]">Confirm the repair outcome and return location.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-sans text-[11px] uppercase text-[#959597]">Resolution
          <select className={fieldClass} value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {["REPAIRED", "REPLACED", "NO FAULT FOUND", "WRITTEN OFF"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="font-sans text-[11px] uppercase text-[#959597]">Resolved by
          <input className={fieldClass} list="resolve-people" value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} />
          <datalist id="resolve-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
        </label>
        <label className="font-sans text-[11px] uppercase text-[#959597]">Actual cost
          <input className={fieldClass} value={cost} onChange={(e) => setCost(e.target.value)} placeholder={repair.parts.some((part) => part.cost != null) ? "Confirm vs parts" : ""} />
        </label>
        <label className="font-sans text-[11px] uppercase text-[#959597]">Parts used
          <input className={fieldClass} value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} />
        </label>
        <label className="font-sans text-[11px] uppercase text-[#959597] sm:col-span-2">Return asset to
          <select className={fieldClass} value={returnTo} onChange={(e) => setReturnTo(e.target.value)}>
            <option value="">Select a truck or location</option>
            {trucks.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            {places.filter((place) => place.kind === "LOCATION").map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
        <input type="checkbox" checked={reinspect} onChange={(e) => setReinspect(e.target.checked)} />
        Requires re-inspection
      </label>
      <label className="mt-2 flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
        <input type="checkbox" checked={closeFollowUp} onChange={(e) => setCloseFollowUp(e.target.checked)} />
        {repair.inspectionCode ? `Close ${repair.inspectionCode} re-inspection follow-up` : "Close re-inspection follow-up"}
      </label>
      <div className="mt-4 rounded-lg border border-[#2D2D30] bg-[#101010] p-3">
        <p className="font-sans text-[10px] uppercase text-[#959597]">What will happen</p>
        <p className="mt-1 font-sans text-[12px] uppercase leading-relaxed text-[#C8C8C8]">{happen.join(" ")}</p>
      </div>
      {error ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#FF4D4D] bg-[#3A1717] px-3 py-2">
          <p className="font-sans text-[12px] uppercase text-[#FF8A9A]">{error}</p>
          <DashboardToolbarButton
            disabled={busy || !resolvedBy.trim() || !returnTo.trim()}
            onClick={() => {
              setError(null);
              void onSave({ resolution, resolvedBy: resolvedBy.trim(), actualCost: cost ? Number(cost) : undefined, partsUsed: partsUsed.trim() || undefined, returnTo, requiresReinspection: reinspect, closeFollowUp }).catch(() => {
                setError(`Couldn’t resolve ${repair.code}. Your entries are preserved.`);
              });
            }}
          >
            Retry
          </DashboardToolbarButton>
        </div>
      ) : null}
    </DashboardModal>
  );
}
