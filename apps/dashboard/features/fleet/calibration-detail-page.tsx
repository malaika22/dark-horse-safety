"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardModal,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { fleetBadgeTone } from "./fleet-ui";
import {
  fleetApi,
  type FleetCalibrationDetail,
} from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF]";

export function CalibrationDetailPage({ code }: { code: string }) {
  const router = useRouter();
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const [row, setRow] = React.useState<FleetCalibrationDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState(false);
  const [freqOpen, setFreqOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    setError(null);
    fleetApi
      .getCalibration(code)
      .then((res) => setRow(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Calibration could not be loaded"));
  }, [code]);

  React.useEffect(() => {
    load();
  }, [load]);

  function downloadCertificate() {
    if (!row) return;
    const lines = [
      `Calibration ${row.code}`,
      `Asset ${row.assetLabel} (${row.assetCode})`,
      row.serial ? `Serial ${row.serial}` : null,
      row.parentTruck ? `Truck ${row.parentTruck}` : null,
      `Result ${row.resultLabel}`,
      `Status ${row.statusLabel}`,
      row.dateLabel ? `Calibrated ${row.dateLabel}` : null,
      row.dueLabel ? `Next due ${row.dueLabel}` : null,
      row.method ? `Method ${row.method}` : null,
      row.technician ? `Technician ${row.technician}` : null,
      row.lot ? `Lot ${row.lot}` : null,
      ...row.readings.map((reading) =>
        `${reading.gas}: ${reading.reading || "—"} / ${reading.expected || "—"}${reading.result ? ` ${reading.result}` : ""}`,
      ),
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="font-sans text-[13px] text-[#FF8A9A]">{error}</p>;
  if (!row) return <p className="font-sans text-[13px] uppercase text-[#959597]">Loading calibration…</p>;

  const readings = row.readings.length
    ? row.readings.map((reading) => ({
        gas: reading.gas,
        text: [reading.reading, reading.expected].filter(Boolean).join(" / "),
        result: reading.result || "",
        sensor: row.sensors.find((sensor) => sensor.gas.toUpperCase() === reading.gas.toUpperCase()) ?? null,
      }))
    : row.sensors.map((sensor) => ({
        gas: sensor.gas,
        text: sensor.range || "No reading stored",
        result: "",
        sensor,
      }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] uppercase text-[#959597]">Fleet & Assets / Calibration / {row.code}</p>
          <h1 className="mt-1 font-sans text-[22px] text-[#FDFDFF]">{row.code} · {row.assetLabel}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardToolbarButton
            disabled={!row.nav.prevCode}
            onClick={() => row.nav.prevCode && router.push(`/fleet/calibration/${row.nav.prevCode}`)}
          >
            Previous
          </DashboardToolbarButton>
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            {row.nav.index} of {row.nav.total} · ordered by next due
          </span>
          <DashboardToolbarButton
            disabled={!row.nav.nextCode}
            onClick={() => row.nav.nextCode && router.push(`/fleet/calibration/${row.nav.nextCode}`)}
          >
            Next
          </DashboardToolbarButton>
          <DashboardToolbarButton ref={menuRef} onClick={() => setMenu((open) => !open)}>Actions</DashboardToolbarButton>
          <DashboardToolbarButton onClick={downloadCertificate}>Print certificate</DashboardToolbarButton>
          <DashboardToolbarButton onClick={() => setNoteOpen(true)}>Add note</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => router.push(`/fleet/calibration/new?asset=${encodeURIComponent(row.assetCode)}`)}>
            Add new calibration
          </DashboardToolbarButton>
        </div>
      </div>
      <DashboardMenuPopover
        open={menu}
        onClose={() => setMenu(false)}
        anchorRef={menuRef}
        align="right"
        items={[
          { id: "add", label: "Add new calibration", onSelect: () => router.push(`/fleet/calibration/new?asset=${encodeURIComponent(row.assetCode)}`) },
          { id: "cert", label: "Download certificate", onSelect: downloadCertificate },
          { id: "asset", label: `View asset · ${row.assetCode}`, onSelect: () => router.push(`/fleet/assets/${row.assetCode}`) },
          { id: "freq", label: "Adjust frequency", onSelect: () => setFreqOpen(true) },
          {
            id: "oos",
            label: "Mark out of service",
            destructive: true,
            onSelect: () => {
              setBusy(true);
              fleetApi.markCalibrationOutOfService(row.id)
                .then(() => { toastSuccess(`${row.code} marked out of service`); load(); })
                .catch(toastApiError)
                .finally(() => setBusy(false));
            },
          },
          { id: "edit", label: "Edit record", hint: "Admin only · reason required · logged", onSelect: () => setEditOpen(true) },
        ]}
      />

      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[16px] text-[#FDFDFF]">{row.code} · {row.assetLabel}</p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              {[row.parentTruck, row.technician ? `Calibrated by ${row.technician}` : null, row.dateLabel].filter(Boolean).join(" · ") || "No technician or date stored"}
            </p>
          </div>
          <div className="flex gap-2">
            <DashboardBadge variant={fleetBadgeTone(row.resultTone)}>{row.resultLabel}</DashboardBadge>
            <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
          <h2 className="mb-3 font-sans text-[12px] uppercase text-[#959597]">Calibration info</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Info label="Asset" value={row.assetLabel} />
            <Info label="Serial" value={row.serial || "—"} />
            <Info label="Type" value={row.calType || "—"} />
            <Info label="Method" value={row.method || "—"} />
            <Info label="Technician" value={row.technician || "—"} />
            <Info label="Cal gas lot" value={row.lot || "—"} />
          </dl>
        </section>
        <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
          <h2 className="mb-3 font-sans text-[12px] uppercase text-[#959597]">Dates</h2>
          <dl className="grid grid-cols-2 gap-3">
            <Info label="Last calibration" value={row.dateLabel || "—"} />
            <Info label="Next due" value={row.dueLabel || "—"} />
            <Info label="Frequency" value={row.frequencyLabel} />
            <Info label="Days left" value={row.daysLeft == null ? "—" : String(row.daysLeft)} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <h2 className="font-sans text-[12px] uppercase text-[#959597]">Sensor results</h2>
        <p className="mb-3 mt-1 font-sans text-[11px] uppercase text-[#6B6B6E]">
          Readings are shown only when they were saved with this calibration. Alarm thresholds come from the asset sensor record.
        </p>
        {readings.length ? readings.map((reading) => (
          <div key={reading.gas} className="flex items-center justify-between gap-3 border-t border-[#2D2D30] py-3">
            <div>
              <p className="font-sans text-[13px] text-[#FDFDFF]">
                {reading.gas}
                {reading.sensor && (reading.sensor.alarmLow || reading.sensor.alarmHigh) ? (
                  <span
                    className="ml-2 cursor-help text-[#8EB4FF]"
                    title={`Low alarm ${reading.sensor.alarmLow || "—"} · High alarm ${reading.sensor.alarmHigh || "—"} · From asset record · Sensors · ${row.assetCode}`}
                  >
                    info
                  </span>
                ) : null}
              </p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{reading.text}</p>
            </div>
            {reading.result ? (
              <DashboardBadge variant={reading.result === "FAIL" || reading.result === "FAILED" ? "error" : "success"}>
                {reading.result}
              </DashboardBadge>
            ) : (
              <span className="font-sans text-[11px] uppercase text-[#959597]">Not recorded</span>
            )}
          </div>
        )) : (
          <p className="font-sans text-[12px] uppercase text-[#959597]">No sensor readings or thresholds are stored for this asset.</p>
        )}
      </section>

      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-[12px] uppercase text-[#959597]">Certificate & history</h2>
          <DashboardToolbarButton onClick={downloadCertificate}>Download</DashboardToolbarButton>
        </div>
        {row.photoUrl ? (
          <a href={row.photoUrl} target="_blank" rel="noreferrer" className="mb-3 inline-block font-sans text-[12px] uppercase text-[#8EB4FF]">
            Readings photo
          </a>
        ) : null}
        <p className="font-sans text-[13px] text-[#FDFDFF]">Certificate {row.code}</p>
        {row.notes ? <p className="mt-2 font-sans text-[12px] uppercase text-[#C8C8C8]">{row.notes}</p> : null}
        <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
          {[row.lot ? `Gas lot ${row.lot}` : null, row.dateLabel ? `Issued ${row.dateLabel}` : null].filter(Boolean).join(" · ") || "No lot or issue date stored"}
        </p>
        <div className="mt-4 space-y-2">
          {row.previous ? (
            <History
              label="Previous calibration"
              value={`${row.previous.dateLabel ?? "—"} · ${row.previous.resultLabel}`}
              onOpen={() => router.push(`/fleet/calibration/${row.previous?.code}`)}
            />
          ) : null}
          {row.bump ? (
            <History
              label="Bump test"
              value={`${row.bump.dateLabel ?? "—"} · ${row.bump.resultLabel}`}
              onOpen={() => router.push(`/fleet/inspections/${row.bump?.code}`)}
            />
          ) : null}
          {row.linkedInspection ? (
            <History
              label="Linked inspection"
              value={`${row.linkedInspection.code} · ${row.linkedInspection.resultLabel} ${row.linkedInspection.dateLabel ?? ""}`}
              onOpen={() => router.push(`/fleet/inspections/${row.linkedInspection?.code}`)}
            />
          ) : null}
          {row.linkedInspection?.afterCalibration ? (
            <p className="font-sans text-[11px] uppercase text-[#E8C547]">
              This calibration was current when {row.linkedInspection.code} failed on {row.linkedInspection.dateLabel}.
            </p>
          ) : null}
          {row.edits.map((edit) => (
            <p key={edit.at} className="font-sans text-[11px] uppercase text-[#959597]">
              Logged {edit.at.slice(0, 10)} · {edit.reason}
            </p>
          ))}
        </div>
      </section>

      <FrequencyModal
        open={freqOpen}
        days={row.frequencyDays}
        busy={busy}
        onClose={() => setFreqOpen(false)}
        onSave={(days) => {
          setBusy(true);
          fleetApi.adjustCalibrationFrequency(row.id, days)
            .then(() => { toastSuccess(`${row.code} frequency updated`); setFreqOpen(false); load(); })
            .catch(toastApiError)
            .finally(() => setBusy(false));
        }}
      />
      <EditModal
        open={editOpen}
        row={row}
        busy={busy}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />
      <NoteModal
        open={noteOpen}
        busy={busy}
        onClose={() => setNoteOpen(false)}
        onSave={(note) => {
          setBusy(true);
          fleetApi.updateCalibration(row.id, { assetCode: row.assetCode, reason: `NOTE · ${note}` })
            .then(() => { toastSuccess(`Note logged on ${row.code}`); setNoteOpen(false); load(); })
            .catch(toastApiError)
            .finally(() => setBusy(false));
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[10px] uppercase text-[#959597]">{label}</dt>
      <dd className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">{value}</dd>
    </div>
  );
}

function History({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center justify-between rounded-lg border border-[#2D2D30] px-3 py-2 text-left">
      <span className="font-sans text-[11px] uppercase text-[#959597]">{label}</span>
      <span className="font-sans text-[12px] uppercase text-[#8EB4FF]">{value}</span>
    </button>
  );
}

function FrequencyModal({
  open, days, busy, onClose, onSave,
}: {
  open: boolean;
  days: number;
  busy: boolean;
  onClose: () => void;
  onSave: (days: number) => void;
}) {
  const [value, setValue] = React.useState(String(days));
  React.useEffect(() => setValue(String(days)), [days, open]);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Adjust frequency"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => onSave(Number(value))}>Save</DashboardToolbarButton>
        </div>
      }
    >
      <label className="font-sans text-[11px] uppercase text-[#959597]">Frequency in days
        <input className={fieldClass} value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
    </DashboardModal>
  );
}

function EditModal({
  open, row, busy, onClose, onSaved,
}: {
  open: boolean;
  row: FleetCalibrationDetail;
  busy: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [method, setMethod] = React.useState(row.method);
  const [technician, setTechnician] = React.useState(row.technician);
  const [lot, setLot] = React.useState(row.lot);
  React.useEffect(() => {
    setReason("");
    setMethod(row.method);
    setTechnician(row.technician);
    setLot(row.lot);
  }, [row, open]);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={`Edit ${row.code}`}
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || !reason.trim()}
            onClick={() => {
              fleetApi.updateCalibration(row.id, {
                assetCode: row.assetCode,
                method,
                technician,
                lot,
                reason: reason.trim(),
              }).then(() => { toastSuccess(`${row.code} updated`); onSaved(); }).catch(toastApiError);
            }}
          >
            Save record
          </DashboardToolbarButton>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block font-sans text-[11px] uppercase text-[#959597]">Reason
          <input className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required · this is logged" />
        </label>
        <label className="block font-sans text-[11px] uppercase text-[#959597]">Method
          <input className={fieldClass} value={method} onChange={(e) => setMethod(e.target.value)} />
        </label>
        <label className="block font-sans text-[11px] uppercase text-[#959597]">Technician
          <input className={fieldClass} value={technician} onChange={(e) => setTechnician(e.target.value)} />
        </label>
        <label className="block font-sans text-[11px] uppercase text-[#959597]">Cal gas lot
          <input className={fieldClass} value={lot} onChange={(e) => setLot(e.target.value)} />
        </label>
      </div>
    </DashboardModal>
  );
}

function NoteModal({
  open, busy, onClose, onSave,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (open) setNote(""); }, [open]);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Add note"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || !note.trim()} onClick={() => onSave(note.trim())}>Log note</DashboardToolbarButton>
        </div>
      }
    >
      <textarea className={fieldClass} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
    </DashboardModal>
  );
}
