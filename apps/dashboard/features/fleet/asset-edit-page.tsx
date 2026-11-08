"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import {
  fleetApi,
  type FleetAssetClock,
  type FleetAssetDetail,
  type FleetAssetDocument,
  type FleetAssetDraft,
  type FleetAssetKind,
} from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

const control =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

const CATEGORIES = ["DETECTION", "AIR SUPPLY", "RESPIRATORY", "FIRE SUPPRESSION", "CAL GAS", "PPE", "RESCUE"];
const STATUSES = ["READY", "NEEDS REVIEW", "OUT OF SERVICE", "STOCKED", "LOW", "CRITICAL"];

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function layoutOf(draft: FleetAssetDraft) {
  if (draft.kind === "RENTAL") return "RENTAL" as const;
  if (draft.kind === "CONSUMABLE") return "CONSUMABLE" as const;
  const blob = `${draft.name} ${draft.category} ${draft.kind}`.toUpperCase();
  if (draft.kind === "EXTINGUISHER" || blob.includes("EXTING") || blob.includes("FIRE")) return "EXTINGUISHER" as const;
  if (blob.includes("SCBA") || blob.includes("CYLINDER") || blob.includes("RESPIRATORY")) return "SCBA" as const;
  if (blob.includes("MONITOR") || blob.includes("DETECTION")) return "GAS" as const;
  return "ASSET" as const;
}

function subtitle(layout: ReturnType<typeof layoutOf>) {
  if (layout === "RENTAL") return "Equipment type · rental — showing vendor · daily rate · rental start · contracted return";
  if (layout === "CONSUMABLE") return "Equipment type · consumable — showing quantity · minimum level · unit · no serial, no calibration";
  if (layout === "EXTINGUISHER") return "Equipment type · fire extinguisher — showing annual inspection · 6-year maintenance · hydro test";
  if (layout === "SCBA") return "Equipment type · scba / cylinders — showing hydro test · posi check · flow test · cylinder size";
  if (layout === "GAS") return "Equipment type · gas monitor — showing sensors · calibration interval · bump test";
  return "Equipment type · asset — showing identity, home, and documents";
}

function rentalHint(draft: FleetAssetDraft) {
  if (!draft.rentalStart || draft.dailyRate == null) return "";
  const start = new Date(draft.rentalStart);
  if (Number.isNaN(start.getTime())) return "";
  const daysOut = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));
  const accrued = daysOut * draft.dailyRate;
  let due = "";
  if (draft.contractedReturn) {
    const end = new Date(draft.contractedReturn);
    if (!Number.isNaN(end.getTime())) {
      const left = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
      due = left >= 0 ? ` · return due in ${left} days` : ` · ${Math.abs(left)} days past return`;
    }
  }
  return `${daysOut} days out · ${money(accrued)} accrued${due} · late days billed at daily rate`;
}

export function AssetEditPage({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [detail, setDetail] = React.useState<FleetAssetDetail | null>(null);
  const [draft, setDraft] = React.useState<FleetAssetDraft | null>(null);
  const [docType, setDocType] = React.useState("CERTIFICATE");

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fleetApi.getAsset(code);
        setDetail(res.data);
        const {
          assetCode: _code,
          calibration: _cal,
          repairCode: _repair,
          repairId: _rid,
          holder: _holder,
          equipmentType: _type,
          checkedOutTo: _out,
          readiness: _ready,
          exists: _exists,
          noteLog: _notes,
          ...form
        } = res.data.asset;
        setDraft(form);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  function set<K extends keyof FleetAssetDraft>(key: K, value: FleetAssetDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onPhoto(file: File | undefined) {
    if (!file || !draft) return;
    setBusy(true);
    try {
      const uploaded = await crmApi.uploadFile({
        folder: "fleet-assets",
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await fileToBase64(file),
      });
      set("photoUrl", uploaded.data.url);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onDocument(file: File | undefined) {
    if (!file || !draft) return;
    setBusy(true);
    try {
      const uploaded = await crmApi.uploadFile({
        folder: "fleet-assets",
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await fileToBase64(file),
      });
      const row: FleetAssetDocument = {
        id: crypto.randomUUID(),
        type: docType,
        name: file.name,
        url: uploaded.data.url,
        expiry: "",
        status: "CURRENT",
      };
      set("documents", [row, ...draft.documents]);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft || !detail) return;
    const layout = layoutOf(draft);
    const kind: FleetAssetKind = layout === "EXTINGUISHER" ? "EXTINGUISHER" : draft.kind;
    if (!draft.name.trim() || !draft.home.trim()) {
      toastApiError(new Error("Asset name and home are required"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.saveAsset(detail.asset.assetCode, { ...draft, kind });
      setDetail(res.data);
      toastSuccess("Asset saved");
      router.push("/fleet/assets");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !draft || !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading asset" />
      </div>
    );
  }

  const layout = layoutOf(draft);
  const short = draft.quantity != null && draft.minimum != null ? draft.minimum - draft.quantity : 0;
  const stockValue = draft.quantity != null && draft.unitCost != null ? draft.quantity * draft.unitCost : null;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div>
        <h1 className="font-sans text-[18px] font-[590] uppercase text-[#FDFDFF]">
          {layout === "CONSUMABLE" ? "Edit item" : "Edit asset"} · {detail.asset.assetCode}
        </h1>
        <p className="mt-1 font-sans text-[11px] uppercase text-[#8EB4FF]">{subtitle(layout)}</p>
      </div>

      <Panel title="Asset identity">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Asset id"><input className={control} value={detail.asset.assetCode} readOnly /></Field>
          <Field label="Asset name"><input className={control} value={draft.name} onChange={(event) => set("name", event.target.value)} /></Field>
          <Field label="Category">
            <select className={control} value={draft.category} onChange={(event) => {
              const category = event.target.value;
              setDraft((current) => {
                if (!current) return current;
                const fire = category.includes("FIRE");
                const scba = category.includes("RESPIRATORY");
                const clocks = current.clocks.length > 0 ? current.clocks : fire
                  ? [
                      { test: "ANNUAL INSPECTION", lastDone: "", interval: "12 MONTHS", nextDue: "", result: "" },
                      { test: "6-YEAR MAINTENANCE", lastDone: "", interval: "6 YEARS", nextDue: "", result: "" },
                      { test: "HYDRO TEST", lastDone: "", interval: "12 YEARS", nextDue: "", result: "" },
                    ]
                  : scba
                    ? [
                        { test: "HYDRO TEST", lastDone: "", interval: "5 YEARS", nextDue: "", result: "" },
                        { test: "POSI CHECK", lastDone: "", interval: "6 MONTHS", nextDue: "", result: "" },
                        { test: "FLOW TEST", lastDone: "", interval: "12 MONTHS", nextDue: "", result: "" },
                      ]
                    : current.clocks;
                const sensors = category === "DETECTION" && current.sensors.length === 0
                  ? [
                      { gas: "O2", range: "0-30%", alarmLow: "19.5%", alarmHigh: "23.5%" },
                      { gas: "LEL", range: "0-100%", alarmLow: "10%", alarmHigh: "20%" },
                      { gas: "H2S", range: "0-100 PPM", alarmLow: "10 PPM", alarmHigh: "15 PPM" },
                      { gas: "CO", range: "0-500 PPM", alarmLow: "35 PPM", alarmHigh: "200 PPM" },
                    ]
                  : current.sensors;
                return { ...current, category, clocks, sensors };
              });
            }}>
              {!CATEGORIES.includes(draft.category) && draft.category ? <option>{draft.category}</option> : null}
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select
              className={control}
              value={layout === "EXTINGUISHER" ? "ASSET" : draft.kind}
              onChange={(event) => set("kind", event.target.value as FleetAssetKind)}
            >
              <option value="ASSET">Asset</option>
              <option value="RENTAL">Rental</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </Field>
          {layout !== "CONSUMABLE" ? (
            <Field label="Serial #"><input className={control} value={draft.serial} onChange={(event) => set("serial", event.target.value)} /></Field>
          ) : null}
          <Field label="Manufacturer"><input className={control} value={draft.manufacturer} onChange={(event) => set("manufacturer", event.target.value)} /></Field>
          <Field label="Model"><input className={control} value={draft.model} onChange={(event) => set("model", event.target.value)} /></Field>
        </div>
      </Panel>

      <Panel title="Location & assignment">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Home *">
            <select className={control} value={draft.home} onChange={(event) => set("home", event.target.value)}>
              {!detail.places.some((place) => place.name === draft.home) && draft.home ? <option>{draft.home}</option> : null}
              {detail.places.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </Field>
          {layout !== "CONSUMABLE" ? (
            <Field label="Assigned technician">
              <select className={control} value={draft.technician} onChange={(event) => set("technician", event.target.value)}>
                <option value="">Unassigned</option>
                {!detail.employees.some((employee) => employee.name === draft.technician) && draft.technician ? <option>{draft.technician}</option> : null}
                {detail.employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}
              </select>
            </Field>
          ) : null}
          <Field label="Status">
            <select className={control} value={draft.status} onChange={(event) => set("status", event.target.value)}>
              {!STATUSES.includes(draft.status) && draft.status ? <option>{draft.status}</option> : null}
              {STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </div>
      </Panel>

      {layout === "GAS" || layout === "SCBA" || layout === "ASSET" ? (
        <Panel title={layout === "SCBA" ? "Condition & OSHA test clocks" : "Condition & calibration"}>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Condition">
              <select className={control} value={draft.condition} onChange={(event) => set("condition", event.target.value)}>
                {["GOOD", "FAIR", "POOR", "OUT OF SERVICE"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            {layout === "SCBA" ? (
              <>
                <Field label="Cylinder size *"><input className={control} value={draft.cylinderSize} onChange={(event) => set("cylinderSize", event.target.value)} /></Field>
                <Field label="Cylinder material"><input className={control} value={draft.cylinderMaterial} onChange={(event) => set("cylinderMaterial", event.target.value)} /></Field>
              </>
            ) : (
              <>
                <Field label="Calibration required">
                  <select className={control} value={draft.calibrationRequired || "YES"} onChange={(event) => set("calibrationRequired", event.target.value)}>
                    <option>YES</option>
                    <option>NO</option>
                  </select>
                </Field>
                <Field label="Calibration date"><input className={control} type="date" value={draft.calibrationDate} onChange={(event) => set("calibrationDate", event.target.value)} /></Field>
                <Field label="Calibration interval *"><input className={control} value={draft.calibrationInterval} placeholder="90 DAYS" onChange={(event) => set("calibrationInterval", event.target.value)} /></Field>
                <Field label="Next calibration due"><input className={control} type="date" value={draft.nextCalibrationDue} onChange={(event) => set("nextCalibrationDue", event.target.value)} /></Field>
                <Field label="Bump test date"><input className={control} type="date" value={draft.bumpTestDate} onChange={(event) => set("bumpTestDate", event.target.value)} /></Field>
              </>
            )}
          </div>
          {draft.calibrationDate && draft.nextCalibrationDue && draft.nextCalibrationDue <= draft.calibrationDate ? (
            <p className="mt-3 font-sans text-[11px] uppercase text-[#FF8A9A]">Next calibration due must be after the calibration date.</p>
          ) : null}
          {layout === "SCBA" ? <ClockTable draft={draft} set={set} /> : null}
        </Panel>
      ) : null}

      {layout === "GAS" ? (
        <Panel title="Sensors · detection equipment only">
          <table className="w-full font-sans text-[11px] uppercase text-[#C8C8C8]">
            <thead>
              <tr className="text-left text-[#959597]"><th className="py-2">Gas</th><th>Range</th><th>Alarm low</th><th>Alarm high</th></tr>
            </thead>
            <tbody>
              {draft.sensors.map((sensor, index) => (
                <tr key={`${sensor.gas}-${index}`} className="border-t border-[#2D2D30]">
                  {(["gas", "range", "alarmLow", "alarmHigh"] as const).map((key) => (
                    <td key={key} className="py-2 pr-2">
                      <input className={control} value={sensor[key]} onChange={(event) => set("sensors", draft.sensors.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="mt-3 font-sans text-[11px] uppercase text-[#8EB4FF]" onClick={() => set("sensors", [...draft.sensors, { gas: "", range: "", alarmLow: "", alarmHigh: "" }])}>+ Add sensor</button>
        </Panel>
      ) : null}

      {layout === "RENTAL" ? (
        <Panel title="Rental terms">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Rental vendor *"><input className={control} value={draft.rentalVendor} onChange={(event) => set("rentalVendor", event.target.value)} /></Field>
            <Field label="Daily rate *"><input className={control} type="number" min="0" step="0.01" value={draft.dailyRate ?? ""} onChange={(event) => set("dailyRate", event.target.value === "" ? null : Number(event.target.value))} /></Field>
            <Field label="Rental start *"><input className={control} type="date" value={draft.rentalStart} onChange={(event) => set("rentalStart", event.target.value)} /></Field>
            <Field label="Contracted return *"><input className={control} type="date" value={draft.contractedReturn} onChange={(event) => set("contractedReturn", event.target.value)} /></Field>
          </div>
          {rentalHint(draft) ? <p className="mt-3 font-sans text-[11px] uppercase text-[#E8C547]">{rentalHint(draft)}</p> : null}
        </Panel>
      ) : null}

      {layout === "CONSUMABLE" ? (
        <Panel title="Stock">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Quantity on hand *"><input className={control} type="number" min="0" value={draft.quantity ?? ""} onChange={(event) => set("quantity", event.target.value === "" ? null : Number(event.target.value))} /></Field>
            <Field label="Minimum level *"><input className={control} type="number" min="0" value={draft.minimum ?? ""} onChange={(event) => set("minimum", event.target.value === "" ? null : Number(event.target.value))} /></Field>
            <Field label="Unit *"><input className={control} value={draft.unit} onChange={(event) => set("unit", event.target.value)} /></Field>
          </div>
          {short > 0 ? <p className="mt-3 font-sans text-[11px] uppercase text-[#E8C547]">Below minimum · {short} short · raise a purchase order to refill.</p> : null}
        </Panel>
      ) : null}

      {layout === "EXTINGUISHER" ? (
        <Panel title="Condition & inspection clocks">
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            <Field label="Condition">
              <select className={control} value={draft.condition} onChange={(event) => set("condition", event.target.value)}>
                {["GOOD", "FAIR", "POOR", "OUT OF SERVICE"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Size & class *"><input className={control} value={draft.sizeClass} onChange={(event) => set("sizeClass", event.target.value)} /></Field>
            <Field label="Agent"><input className={control} value={draft.agent} onChange={(event) => set("agent", event.target.value)} /></Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-[11px] uppercase text-[#C8C8C8]">
              <thead>
                <tr className="text-left text-[#959597]">
                  <th className="py-2">Test</th>
                  <th>Last done</th>
                  <th>Interval</th>
                  <th>Next due</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {draft.clocks.map((clock, index) => (
                  <tr key={clock.test || index} className="border-t border-[#2D2D30]">
                    <td className="py-2 text-[#FDFDFF]">{clock.test}</td>
                    <td><input className={control} type="date" value={clock.lastDone} onChange={(event) => setClock(draft, index, "lastDone", event.target.value, set)} /></td>
                    <td><input className={control} value={clock.interval} onChange={(event) => setClock(draft, index, "interval", event.target.value, set)} /></td>
                    <td><input className={control} type="date" value={clock.nextDue} onChange={(event) => setClock(draft, index, "nextDue", event.target.value, set)} /></td>
                    <td>
                      <select className={control} value={clock.result} onChange={(event) => setClock(draft, index, "result", event.target.value, set)}>
                        <option value="">—</option>
                        {["PASS", "FAIL", "NOT DONE"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel title={layout === "RENTAL" ? "Liability value" : layout === "CONSUMABLE" ? "Cost & ordering" : "Purchase & value"}>
        <div className="grid gap-3 md:grid-cols-3">
          {layout === "CONSUMABLE" ? (
            <Field label="Unit cost *"><input className={control} type="number" min="0" step="0.01" value={draft.unitCost ?? ""} onChange={(event) => set("unitCost", event.target.value === "" ? null : Number(event.target.value))} /></Field>
          ) : (
            <Field label="Replacement value *"><input className={control} type="number" min="0" step="0.01" value={draft.replacementValue ?? ""} onChange={(event) => set("replacementValue", event.target.value === "" ? null : Number(event.target.value))} /></Field>
          )}
          <Field label="Purchase date"><input className={control} type="date" value={draft.purchaseDate} onChange={(event) => set("purchaseDate", event.target.value)} /></Field>
          {layout === "RENTAL" ? (
            <Field label="Rental agreement"><input className={control} value={draft.rentalAgreement} onChange={(event) => set("rentalAgreement", event.target.value)} /></Field>
          ) : (
            <Field label={layout === "CONSUMABLE" ? "Last purchase order" : "Purchase order"}>
              <input className={control} value={layout === "CONSUMABLE" ? draft.lastPurchaseOrder : draft.purchaseOrder} onChange={(event) => set(layout === "CONSUMABLE" ? "lastPurchaseOrder" : "purchaseOrder", event.target.value)} />
            </Field>
          )}
          <Field label={layout === "CONSUMABLE" ? "Preferred vendor" : "Vendor"}>
            <input className={control} value={layout === "CONSUMABLE" ? draft.preferredVendor : draft.vendor} onChange={(event) => set(layout === "CONSUMABLE" ? "preferredVendor" : "vendor", event.target.value)} />
          </Field>
          {layout === "EXTINGUISHER" || layout === "ASSET" ? (
            <Field label="Warranty expires"><input className={control} type="date" value={draft.warrantyExpires} onChange={(event) => set("warrantyExpires", event.target.value)} /></Field>
          ) : null}
        </div>
        {stockValue != null ? <p className="mt-3 font-sans text-[11px] uppercase text-[#959597]">Stock value on hand · {money(stockValue)}</p> : null}
      </Panel>

      <Panel title="Photo">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#2D2D30] bg-[#1A1A1A] px-4 py-8 text-center">
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{draft.photoUrl ? "Replace primary photo" : "Primary photo · used as the asset thumbnail"}</span>
          <span className="mt-1 font-sans text-[10px] uppercase text-[#959597]">PNG · JPG · one image</span>
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => void onPhoto(event.target.files?.[0])} />
        </label>
        {draft.photoUrl ? <a className="mt-2 inline-block font-sans text-[11px] uppercase text-[#8EB4FF]" href={draft.photoUrl} target="_blank" rel="noreferrer">View current photo</a> : null}
      </Panel>

      <Panel title="Documents">
        <table className="w-full font-sans text-[11px] uppercase">
          <thead>
            <tr className="text-left text-[#959597]">
              <th className="py-2">Type</th>
              <th>File</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {draft.documents.map((doc) => (
              <tr key={doc.id} className="border-t border-[#2D2D30] text-[#C8C8C8]">
                <td className="py-2">{doc.type}</td>
                <td><a className="text-[#8EB4FF]" href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a></td>
                <td>
                  <input className={control} type="date" value={doc.expiry} onChange={(event) => set("documents", draft.documents.map((item) => item.id === doc.id ? { ...item, expiry: event.target.value } : item))} />
                </td>
                <td className="text-[#7DCEA0]">{doc.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className={`${control} w-40`} value={docType} onChange={(event) => setDocType(event.target.value)}>
            {["CERTIFICATE", "MANUAL", "WARRANTY", "AGREEMENT", "OTHER"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="cursor-pointer font-sans text-[11px] uppercase text-[#8EB4FF]">
            + Add document
            <input type="file" className="hidden" onChange={(event) => void onDocument(event.target.files?.[0])} />
          </label>
        </div>
      </Panel>

      <Panel title="Notes">
        <textarea className={`${control} h-20 py-2`} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
        <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">Repairs and part swaps are logged in history, not here.</p>
      </Panel>

      <div className="flex justify-end gap-2">
        <DashboardToolbarButton onClick={() => router.push("/fleet/assets")}>Cancel</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void save()}>Save changes</DashboardToolbarButton>
      </div>
    </div>
  );
}

function ClockTable({
  draft,
  set,
}: {
  draft: FleetAssetDraft;
  set: <K extends keyof FleetAssetDraft>(key: K, value: FleetAssetDraft[K]) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full font-sans text-[11px] uppercase text-[#C8C8C8]">
        <thead>
          <tr className="text-left text-[#959597]"><th className="py-2">Test</th><th>Last done</th><th>Interval</th><th>Next due</th><th>Result</th></tr>
        </thead>
        <tbody>
          {draft.clocks.map((clock, index) => (
            <tr key={clock.test || index} className="border-t border-[#2D2D30]">
              <td className="py-2 text-[#FDFDFF]">{clock.test}</td>
              <td><input className={control} type="date" value={clock.lastDone} onChange={(event) => setClock(draft, index, "lastDone", event.target.value, set)} /></td>
              <td><input className={control} value={clock.interval} onChange={(event) => setClock(draft, index, "interval", event.target.value, set)} /></td>
              <td><input className={control} type="date" value={clock.nextDue} onChange={(event) => setClock(draft, index, "nextDue", event.target.value, set)} /></td>
              <td>
                <select className={control} value={clock.result} onChange={(event) => setClock(draft, index, "result", event.target.value, set)}>
                  <option value="">—</option>
                  {["PASS", "FAIL", "NOT DONE"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function setClock(
  draft: FleetAssetDraft,
  index: number,
  key: keyof FleetAssetClock,
  value: string,
  set: <K extends keyof FleetAssetDraft>(key: K, value: FleetAssetDraft[K]) => void,
) {
  set("clocks", draft.clocks.map((clock, clockIndex) => (clockIndex === index ? { ...clock, [key]: value } : clock)));
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <h2 className="mb-3 font-sans text-[12px] uppercase tracking-[0.06em] text-[#FDFDFF]">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-sans text-[11px] uppercase text-[#959597]">{label}</span>
      {children}
    </label>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      resolve(raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
