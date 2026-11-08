"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import {
  fleetApi,
  type FleetAsset,
  type FleetAssetDetail,
} from "@/lib/fleet-api";
import { toastApiError } from "@/lib/toast";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF]";

type Reading = {
  gas: string;
  span: string;
  reading: string;
  result: string;
  alarmLow: string;
  alarmHigh: string;
};

type Outcome =
  | { kind: "saved"; code: string; detail: string }
  | { kind: "partial"; code: string; assetCode: string; detail: string };

const DRAFT_KEY = "fleet-calibration-draft";

function judge(span: string, reading: string) {
  const expected = Number(span);
  const actual = Number(reading);
  if (!span.trim() || !reading.trim() || !Number.isFinite(expected) || !Number.isFinite(actual) || expected === 0) {
    return "";
  }
  return Math.abs(actual - expected) / Math.abs(expected) <= 0.1 ? "PASS" : "FAIL";
}

function plusDays(value: string, days: number) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CalibrationFormPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [assets, setAssets] = React.useState<FleetAsset[]>([]);
  const [detail, setDetail] = React.useState<FleetAssetDetail | null>(null);
  const [assetCode, setAssetCode] = React.useState(params.get("asset") ?? "");
  const [calType, setCalType] = React.useState("FULL CALIBRATION");
  const [when, setWhen] = React.useState("");
  const [technician, setTechnician] = React.useState("");
  const [parentTruck, setParentTruck] = React.useState("");
  const [lot, setLot] = React.useState("");
  const [lotExpiry, setLotExpiry] = React.useState("");
  const [interval, setInterval] = React.useState("90");
  const [nextDue, setNextDue] = React.useState("");
  const [dueTouched, setDueTouched] = React.useState(false);
  const [readings, setReadings] = React.useState<Reading[]>([]);
  const [bumpGas, setBumpGas] = React.useState("");
  const [bumpResponse, setBumpResponse] = React.useState("");
  const [bumpResult, setBumpResult] = React.useState("");
  const [bumpNote, setBumpNote] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [photoName, setPhotoName] = React.useState("");
  const [markOut, setMarkOut] = React.useState(false);
  const [outTouched, setOutTouched] = React.useState(false);
  const [notify, setNotify] = React.useState(true);
  const [remind30, setRemind30] = React.useState(true);
  const [remind7, setRemind7] = React.useState(true);
  const [remindDue, setRemindDue] = React.useState(true);
  const [override, setOverride] = React.useState(false);
  const [overrideResult, setOverrideResult] = React.useState("PASS");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [draftNote, setDraftNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    fleetApi.listAssets().then((res) => setAssets(res.data.items)).catch(() => setAssets([]));
  }, []);

  React.useEffect(() => {
    setError(null);
    if (!assetCode) {
      setDetail(null);
      return;
    }
    fleetApi.getAsset(assetCode).then((res) => setDetail(res.data)).catch(() => setDetail(null));
  }, [assetCode]);

  React.useEffect(() => {
    if (!detail) return;
    setParentTruck(detail.asset.home || "");
    setTechnician(detail.asset.technician || "");
    setReadings(
      detail.asset.sensors.map((sensor) => ({
        gas: sensor.gas,
        span: "",
        reading: "",
        result: "",
        alarmLow: sensor.alarmLow,
        alarmHigh: sensor.alarmHigh,
      })),
    );
    const parsed = Number(String(detail.asset.calibrationInterval).replace(/\D/g, ""));
    if (parsed > 0) setInterval(String(parsed));
  }, [detail]);

  React.useEffect(() => {
    if (calType === "BUMP TEST") setInterval("1");
  }, [calType]);

  React.useEffect(() => {
    if (!dueTouched) setNextDue(plusDays(when, Number(interval) || 0));
  }, [when, interval, dueTouched]);

  const bump = calType === "BUMP TEST";
  const judged = readings.filter((row) => row.result === "PASS" || row.result === "FAIL");
  const fails = judged.filter((row) => row.result === "FAIL");
  const computed = bump
    ? bumpResult === "FAIL" ? "FAILED" : bumpResult === "PASS" ? "PASS" : ""
    : !judged.length ? "" : fails.length ? "FAILED" : "PASS";
  const result = override && overrideReason.trim() ? overrideResult : computed;
  const resultText = bump
    ? computed === "FAILED" ? "FAIL" : computed === "PASS" ? "PASS" : "Enter the bump response"
    : judged.length
      ? `${fails.length ? "FAIL" : "PASS"} · ${judged.length - fails.length} of ${readings.length || judged.length} sensors pass`
      : readings.length ? "Enter a span and a reading for each sensor" : "This asset has no sensors on its record";

  React.useEffect(() => {
    if (!outTouched) setMarkOut(result === "FAILED");
  }, [result, outTouched]);

  function updateReading(index: number, patch: Partial<Reading>) {
    setReadings((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };
      if ("span" in patch || "reading" in patch) next.result = judge(next.span, next.reading);
      return next;
    }));
  }

  function payload() {
    return {
      assetCode,
      assetLabel: detail?.asset.name,
      serial: detail?.asset.serial || undefined,
      model: detail?.asset.model || undefined,
      parentTruck: parentTruck || undefined,
      technician: technician || undefined,
      result: result || "PASS",
      lastCalAt: when ? new Date(when).toISOString() : undefined,
      frequencyDays: dueTouched && when && nextDue
        ? Math.max(1, Math.round((new Date(nextDue).getTime() - new Date(when).getTime()) / 86400000))
        : Number(interval) || undefined,
      calType,
      method: bump ? "BUMP TEST" : calType,
      lot: lot || undefined,
      lotExpiry: lotExpiry || undefined,
      notes: [
        notes,
        bumpNote,
        !bump && remind30 ? "REMIND 30 DAYS BEFORE" : null,
        !bump && remind7 ? "REMIND 7 DAYS BEFORE" : null,
        !bump && remindDue ? "REMIND ON DUE DATE" : null,
      ].filter(Boolean).join(" · ") || undefined,
      bumpGas: bump ? bumpGas || undefined : undefined,
      bumpResponse: bump ? bumpResponse || undefined : undefined,
      bumpResult: bump ? bumpResult || undefined : undefined,
      photoUrl: photoUrl || undefined,
      overrideReason: override && overrideReason.trim() ? overrideReason.trim() : undefined,
      readings: bump ? undefined : readings.filter((row) => row.gas.trim()).map((row) => ({
        gas: row.gas,
        expected: row.span,
        reading: row.reading,
        result: row.result,
      })),
    };
  }

  function resetAnother() {
    setLot("");
    setLotExpiry("");
    setNotes("");
    setBumpNote("");
    setBumpGas("");
    setBumpResponse("");
    setBumpResult("");
    setPhotoUrl("");
    setPhotoName("");
    setOverride(false);
    setOverrideReason("");
    setError(null);
    setOutcome(null);
    setReadings((rows) => rows.map((row) => ({ ...row, span: "", reading: "", result: "" })));
  }

  async function onPhoto(file: File) {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const uploaded = await crmApi.uploadFile({
      folder: "fleet-calibrations",
      fileName: file.name,
      mimeType: file.type,
      contentBase64,
    });
    setPhotoUrl(uploaded.data.url);
    setPhotoName(file.name);
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload(), savedAt: new Date().toISOString() }));
    setDraftNote("Draft kept in this browser. Nothing was written to the asset.");
    setError(null);
  }

  async function submit() {
    if (!assetCode) {
      setError("Select an asset. Your other entries are preserved. Nothing was written.");
      return;
    }
    if (!when) {
      setError("Date and time are required. Your other entries are preserved. Nothing was written.");
      return;
    }
    if (!technician.trim()) {
      setError("Calibrated by is required. Your other entries are preserved. Nothing was written.");
      return;
    }
    if (!bump && !lot.trim()) {
      setError("Cal gas lot number is required for this calibration. Your other entries are preserved. Nothing was written.");
      return;
    }
    if (!result) {
      setError("Enter the sensor or bump result before saving. Your other entries are preserved. Nothing was written.");
      return;
    }
    if (override && !overrideReason.trim()) {
      setError("A reason is required to override the result. Nothing was written.");
      return;
    }
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const created = await fleetApi.createCalibration(payload());
      if (markOut && result === "FAILED") {
        await fleetApi.bulkAssets({ codes: [assetCode], action: "OUT_OF_SERVICE" });
      }
      let moved = false;
      let readiness: number | null = null;
      const home = parentTruck.trim();
      const current = detail?.from?.name ?? "";
      if (home && current && current.toUpperCase() !== home.toUpperCase()) {
        try {
          await fleetApi.moveAsset(assetCode, { to: home, reason: `Calibration ${created.data.code}` });
          moved = true;
          const overview = await fleetApi.trucksOverview();
          readiness = overview.data.cards.find((card) => card.name.toUpperCase() === home.toUpperCase())?.readiness ?? null;
        } catch {
          setOutcome({
            kind: "partial",
            code: created.data.code,
            assetCode,
            detail: `${created.data.code} saved. ${detail?.asset.name ?? assetCode} could not be returned to ${home}. Move it manually.`,
          });
          return;
        }
      }
      const due = nextDue || created.data.dueLabel;
      const detailText = [
        `${created.data.code} saved.`,
        moved ? `${detail?.asset.name ?? assetCode} returned to ${home}.` : null,
        readiness != null ? `${home} readiness updated to ${readiness}%.` : null,
        due ? `Next calibration due ${due}.` : null,
        notify && technician ? `Technician ${technician} is recorded on this calibration.` : null,
      ].filter(Boolean).join(" ");
      window.localStorage.removeItem(DRAFT_KEY);
      setOutcome({ kind: "saved", code: created.data.code, detail: detailText });
    } catch (err) {
      setError("Couldn’t save. Your entries are preserved. Nothing was written.");
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const people = detail?.employees ?? [];
  const places = detail?.places ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-sans text-[22px] uppercase text-[#FDFDFF]">Add calibration record</h1>

      <Section title="Asset & truck">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Asset">
            <select className={fieldClass} value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
              <option value="">Search by asset</option>
              {assets.map((item) => (
                <option key={item.assetCode} value={item.assetCode}>{item.assetLabel} · {item.assetCode}</option>
              ))}
            </select>
          </Field>
          <Field label="Serial · auto">
            <input className={fieldClass} value={detail?.asset.serial || ""} readOnly placeholder="Fills from the asset" />
          </Field>
          <Field label="Model · auto">
            <input className={fieldClass} value={detail?.asset.model || ""} readOnly placeholder="Fills from the asset" />
          </Field>
          <Field label="Parent truck / location · auto">
            <select className={fieldClass} value={parentTruck} onChange={(e) => setParentTruck(e.target.value)}>
              <option value="">{detail ? "No home on the asset" : "Select an asset first"}</option>
              {places.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </Field>
          <Field label="Calibrated by">
            <input className={fieldClass} list="cal-people" value={technician} onChange={(e) => setTechnician(e.target.value)} />
            <datalist id="cal-people">{people.map((person) => <option key={person.id} value={person.name} />)}</datalist>
          </Field>
          <Field label="Date & time">
            <input type="datetime-local" className={fieldClass} value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <p className="font-sans text-[11px] uppercase text-[#6B6B6E]">
          {technician
            ? `Defaults to the asset technician${parentTruck ? ` on ${parentTruck}` : ""}. Techs and fleet mechanics can be typed over it.`
            : "No technician is stored on this asset. Enter who performed the calibration."}
        </p>
      </Section>

      <Section title="Calibration details">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Calibration type">
            <select className={fieldClass} value={calType} onChange={(e) => setCalType(e.target.value)}>
              <option>FULL CALIBRATION</option>
              <option>BUMP TEST</option>
              <option>FIELD VERIFICATION</option>
            </select>
          </Field>
          <Field label={bump ? "Cal gas lot number" : "Cal gas lot number"}>
            <input className={fieldClass} value={lot} onChange={(e) => setLot(e.target.value)} />
          </Field>
          <Field label="Cal gas expiry">
            <input type="date" className={fieldClass} value={lotExpiry} onChange={(e) => setLotExpiry(e.target.value)} />
          </Field>
          <Field label="Result · computed">
            <input className={fieldClass} value={result === "FAILED" ? "FAIL" : result} readOnly />
          </Field>
          <Field label="Next due date">
            <input type="date" className={fieldClass} value={nextDue} onChange={(e) => { setDueTouched(true); setNextDue(e.target.value); }} />
          </Field>
          <Field label="Interval (days)">
            <select className={fieldClass} value={interval} onChange={(e) => { setDueTouched(false); setInterval(e.target.value); }}>
              {["1", "30", "90", "180", "365"].map((days) => <option key={days} value={days}>{days}</option>)}
            </select>
          </Field>
        </div>
        <p className="font-sans text-[11px] uppercase text-[#8EB4FF]">{resultText}</p>
        <label className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#E8C547]">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          Override result · reason required · logged
        </label>
        {override ? (
          <div className="grid gap-3 md:grid-cols-2">
            <select className={fieldClass} value={overrideResult} onChange={(e) => setOverrideResult(e.target.value)}>
              <option value="PASS">PASS</option>
              <option value="PASS_WITH_ADJUSTMENT">PASS WITH ADJUSTMENT</option>
              <option value="FAILED">FAIL</option>
            </select>
            <input className={fieldClass} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason" />
          </div>
        ) : null}
      </Section>

      {bump ? (
        <Section title="Bump test">
          <p className="font-sans text-[11px] uppercase text-[#6B6B6E]">Daily check. A full calibration stays on its own interval.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Bump test gas"><input className={fieldClass} value={bumpGas} onChange={(e) => setBumpGas(e.target.value)} /></Field>
            <Field label="Response time"><input className={fieldClass} value={bumpResponse} onChange={(e) => setBumpResponse(e.target.value)} /></Field>
            <Field label="Response">
              <div className="flex h-10 items-center gap-4">
                {["PASS", "FAIL"].map((item) => (
                  <label key={item} className="flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                    <input type="radio" name="bump-result" checked={bumpResult === item} onChange={() => setBumpResult(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Note"><input className={fieldClass} value={bumpNote} onChange={(e) => setBumpNote(e.target.value)} /></Field>
        </Section>
      ) : (
        <Section title="Sensor readings">
          {readings.length ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px] grid-cols-[1.2fr_1fr_1fr_auto] gap-3 font-sans text-[10px] uppercase text-[#959597]">
                <span>Gas</span><span>Span value</span><span>Reading</span><span>Result</span>
              </div>
              {readings.map((row, index) => (
                <div key={`${row.gas}-${index}`} className={`mt-2 grid min-w-[640px] grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 ${row.result === "FAIL" ? "bg-[#3A1717]" : ""}`}>
                  <div>
                    <p className="font-sans text-[13px] text-[#FDFDFF]">{row.gas}</p>
                    {row.alarmLow || row.alarmHigh ? (
                      <p className="font-sans text-[10px] uppercase text-[#6B6B6E]" title={`Low alarm ${row.alarmLow || "—"} · High alarm ${row.alarmHigh || "—"} · From asset record · Sensors · ${assetCode}`}>
                        Low {row.alarmLow || "—"} · High {row.alarmHigh || "—"}
                      </p>
                    ) : null}
                  </div>
                  <input className={fieldClass} value={row.span} onChange={(e) => updateReading(index, { span: e.target.value })} />
                  <input className={fieldClass} value={row.reading} onChange={(e) => updateReading(index, { reading: e.target.value })} />
                  <span className={`font-sans text-[12px] uppercase ${row.result === "FAIL" ? "text-[#FF8A9A]" : row.result === "PASS" ? "text-[#7DCEA0]" : "text-[#959597]"}`}>
                    {row.result || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-[12px] uppercase text-[#959597]">No sensors are stored on this asset, so no readings are prefilled.</p>
          )}
        </Section>
      )}

      {!bump ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Certificate & readings photo">
            <p className="font-sans text-[11px] uppercase text-[#6B6B6E]">The certificate number is assigned when this record is saved.</p>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#2D2D30] font-sans text-[11px] uppercase text-[#959597]">
              {photoName || "Readings display photo · optional"}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onPhoto(file).catch(toastApiError); }} />
            </label>
          </Section>
          <Section title="Notes">
            <textarea className={fieldClass} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Section>
        </div>
      ) : (
        <Section title="Notes">
          <textarea className={fieldClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Section>
      )}

      <Section title="Follow-up">
        <Check checked={markOut} onChange={(checked) => { setOutTouched(true); setMarkOut(checked); }} label="Mark asset out of service" hint={result === "FAILED" ? "On because the result is fail." : "Off while the result is pass."} />
        <Check checked={notify} onChange={setNotify} label="Record the assigned technician on save" hint={technician || "No technician is assigned on this asset."} />
        {!bump ? (
          <>
            <Check checked={remind30} onChange={setRemind30} label="Remind 30 days before" hint={nextDue ? `From ${nextDue}` : "Set a due date first"} />
            <Check checked={remind7} onChange={setRemind7} label="Remind 7 days before" hint={nextDue || ""} />
            <Check checked={remindDue} onChange={setRemindDue} label="Remind on the due date" hint={nextDue || ""} />
          </>
        ) : null}
        {detail?.asset.repairCode ? (
          <p className="font-sans text-[11px] uppercase text-[#8EB4FF]">Linked repair {detail.asset.repairCode}</p>
        ) : null}
      </Section>

      {draftNote ? <p className="font-sans text-[12px] uppercase text-[#E8C547]">{draftNote}</p> : null}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FF4D4D] bg-[#3A1717] px-3 py-2">
          <p className="font-sans text-[12px] uppercase text-[#FF8A9A]">{error}</p>
          <DashboardToolbarButton disabled={busy} onClick={() => void submit()}>Retry</DashboardToolbarButton>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <DashboardToolbarButton onClick={() => router.push("/fleet/calibration")}>Cancel</DashboardToolbarButton>
        <DashboardToolbarButton disabled={busy} onClick={saveDraft}>Save as draft</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void submit()}>Save calibration</DashboardToolbarButton>
      </div>

      {outcome ? (
        <div className={`fixed bottom-6 right-6 z-40 w-[360px] rounded-xl border bg-[#161616] p-4 shadow-xl ${outcome.kind === "partial" ? "border-[#E8C547]" : "border-[#2F6B45]"}`}>
          <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{outcome.detail}</p>
          <div className="mt-3 flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => router.push(`/fleet/calibration/${outcome.code}`)}>View {outcome.code}</DashboardToolbarButton>
            {outcome.kind === "partial" ? (
              <DashboardToolbarButton variant="primary" onClick={() => router.push(`/fleet/assets/${outcome.assetCode}`)}>Move asset</DashboardToolbarButton>
            ) : (
              <DashboardToolbarButton variant="primary" onClick={resetAnother}>Add another</DashboardToolbarButton>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <h2 className="font-sans text-[12px] uppercase text-[#959597]">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block font-sans text-[10px] uppercase text-[#959597]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-sans text-[12px] uppercase text-[#FDFDFF]">{label}</span>
        {hint ? <span className="block font-sans text-[11px] uppercase text-[#6B6B6E]">{hint}</span> : null}
      </span>
    </label>
  );
}
