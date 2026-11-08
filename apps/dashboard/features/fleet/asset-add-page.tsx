"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { fleetApi, type FleetAssetDraft, type FleetAssetKind, type FleetAssetPlace } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

const control =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

const empty = (): FleetAssetDraft & { assetCode: string } => ({
  assetCode: "",
  kind: "ASSET",
  name: "",
  category: "DETECTION",
  serial: "",
  manufacturer: "",
  model: "",
  home: "",
  technician: "",
  status: "READY",
  replacementValue: null,
  purchaseDate: "",
  purchaseOrder: "",
  vendor: "",
  warrantyExpires: "",
  rentalAgreement: "",
  rentalVendor: "",
  dailyRate: null,
  rentalStart: "",
  contractedReturn: "",
  quantity: null,
  minimum: null,
  unit: "EACH",
  unitCost: null,
  preferredVendor: "",
  lastPurchaseOrder: "",
  condition: "GOOD",
  sizeClass: "",
  agent: "",
  clocks: [],
  photoUrl: null,
  documents: [],
  notes: "",
  calibrationRequired: "YES",
  calibrationDate: "",
  calibrationInterval: "90 DAYS",
  nextCalibrationDue: "",
  bumpTestDate: "",
  bumpResult: "",
  sensors: [
    { gas: "O2", range: "0-30%", alarmLow: "19.5%", alarmHigh: "23.5%" },
    { gas: "LEL", range: "0-100%", alarmLow: "10%", alarmHigh: "20%" },
    { gas: "H2S", range: "0-100 PPM", alarmLow: "10 PPM", alarmHigh: "15 PPM" },
    { gas: "CO", range: "0-500 PPM", alarmLow: "35 PPM", alarmHigh: "200 PPM" },
  ],
  cylinderSize: "",
  cylinderMaterial: "",
});

function localErrors(form: FleetAssetDraft & { assetCode: string }) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Asset name is required";
  if (!form.home.trim()) errors.home = "Home is required";
  if (form.kind !== "CONSUMABLE" && (form.replacementValue == null || form.replacementValue <= 0)) {
    errors.replacementValue = "Required. Used for unaccounted equipment value.";
  }
  if (form.calibrationDate && form.nextCalibrationDue && form.nextCalibrationDue <= form.calibrationDate) {
    errors.nextCalibrationDue = "Must be after the calibration date";
  }
  return errors;
}

export function AssetAddPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [places, setPlaces] = React.useState<FleetAssetPlace[]>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = React.useState(empty);
  const [server, setServer] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fleetApi.trucksOverview();
        setPlaces(res.data.cards.map((card) => ({
          id: card.id,
          name: card.name,
          kind: card.kind,
          unit: card.unit,
          driver: card.driver,
          assets: card.assets,
          readiness: card.readiness,
        })));
        setEmployees(res.data.employees);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setServer((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  const errors = { ...localErrors(form), ...server };
  const attention = Object.keys(errors).length;

  async function save(another: boolean) {
    const local = localErrors(form);
    setServer({});
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const { assetCode, ...draft } = form;
      const res = await fleetApi.createAsset({ ...draft, ...(assetCode.trim() ? { assetCode: assetCode.trim() } : {}) });
      toastSuccess(`${res.data.asset.assetCode} saved`);
      if (another) {
        setForm(empty());
        return;
      }
      router.push(`/fleet/assets/${encodeURIComponent(res.data.asset.assetCode)}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const next: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.details)) next[field] = messages[0] ?? "Check this field";
        setServer(next);
        return;
      }
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading form" />
      </div>
    );
  }

  const gas = form.kind === "ASSET" && form.category === "DETECTION";

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <h1 className="font-sans text-[18px] font-[590] uppercase text-[#FDFDFF]">Add asset</h1>
      {attention ? (
        <div className="rounded-lg border border-[#6B2A2A] bg-[#2A1515] px-3 py-2 font-sans text-[11px] uppercase text-[#FF8A9A]">
          {attention} field{attention === 1 ? "" : "s"} need{attention === 1 ? "s" : ""} attention. Save is disabled until they are fixed.
        </div>
      ) : null}
      <section className="space-y-4 rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <h2 className="font-sans text-[12px] uppercase text-[#FDFDFF]">Asset identity</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Asset id · auto</span>
            <input className={`${control} ${errors.assetCode ? "border-[#E5484D]" : ""}`} value={form.assetCode} placeholder="Assigned on save" onChange={(event) => set("assetCode", event.target.value.toUpperCase())} />
            {errors.assetCode ? <span className="font-sans text-[10px] uppercase text-[#FF8A9A]">{errors.assetCode}</span> : <span className="font-sans text-[10px] uppercase text-[#959597]">Leave blank to assign the next id. A typed id must be unique.</span>}
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Asset name</span>
            <input className={`${control} ${errors.name ? "border-[#E5484D]" : ""}`} value={form.name} onChange={(event) => set("name", event.target.value)} />
            {errors.name ? <span className="font-sans text-[10px] uppercase text-[#FF8A9A]">{errors.name}</span> : null}
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Category</span>
            <select className={control} value={form.category} onChange={(event) => set("category", event.target.value)}>
              {["DETECTION", "AIR SUPPLY", "RESPIRATORY", "FIRE SUPPRESSION", "CAL GAS", "PPE"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Type</span>
            <select className={control} value={form.kind} onChange={(event) => set("kind", event.target.value as FleetAssetKind)}>
              <option value="ASSET">Asset</option>
              <option value="RENTAL">Rental</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </label>
          {form.kind !== "CONSUMABLE" ? (
            <label className="flex flex-col gap-2">
              <span className="font-sans text-[11px] uppercase text-[#959597]">Serial #</span>
              <input className={`${control} ${errors.serial ? "border-[#E5484D]" : ""}`} value={form.serial} onChange={(event) => set("serial", event.target.value)} />
              {errors.serial ? <span className="font-sans text-[10px] uppercase text-[#FF8A9A]">{errors.serial}</span> : null}
            </label>
          ) : null}
          <label className="flex flex-col gap-2"><span className="font-sans text-[11px] uppercase text-[#959597]">Manufacturer</span><input className={control} value={form.manufacturer} onChange={(event) => set("manufacturer", event.target.value)} /></label>
          <label className="flex flex-col gap-2"><span className="font-sans text-[11px] uppercase text-[#959597]">Model</span><input className={control} value={form.model} onChange={(event) => set("model", event.target.value)} /></label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Home *</span>
            <select className={`${control} ${errors.home ? "border-[#E5484D]" : ""}`} value={form.home} onChange={(event) => set("home", event.target.value)}>
              <option value="">Select truck or location</option>
              {places.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Assigned technician</span>
            <select className={control} value={form.technician} onChange={(event) => set("technician", event.target.value)}>
              <option value="">Auto from home truck</option>
              {employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">Status</span>
            <select className={control} value={form.status} onChange={(event) => set("status", event.target.value)}>
              {["READY", "NEEDS REVIEW", "OUT OF SERVICE"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        {form.kind !== "CONSUMABLE" ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="font-sans text-[11px] uppercase text-[#959597]">Calibration date</span>
              <input className={control} type="date" value={form.calibrationDate} onChange={(event) => set("calibrationDate", event.target.value)} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-sans text-[11px] uppercase text-[#959597]">Calibration interval</span>
              <input className={control} value={form.calibrationInterval} onChange={(event) => set("calibrationInterval", event.target.value)} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-sans text-[11px] uppercase text-[#959597]">Next calibration due</span>
              <input className={`${control} ${errors.nextCalibrationDue ? "border-[#E5484D]" : ""}`} type="date" value={form.nextCalibrationDue} onChange={(event) => set("nextCalibrationDue", event.target.value)} />
              {errors.nextCalibrationDue ? <span className="font-sans text-[10px] uppercase text-[#FF8A9A]">{errors.nextCalibrationDue}</span> : null}
            </label>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2"><span className="font-sans text-[11px] uppercase text-[#959597]">Quantity</span><input className={control} type="number" value={form.quantity ?? ""} onChange={(event) => set("quantity", event.target.value === "" ? null : Number(event.target.value))} /></label>
            <label className="flex flex-col gap-2"><span className="font-sans text-[11px] uppercase text-[#959597]">Minimum</span><input className={control} type="number" value={form.minimum ?? ""} onChange={(event) => set("minimum", event.target.value === "" ? null : Number(event.target.value))} /></label>
            <label className="flex flex-col gap-2"><span className="font-sans text-[11px] uppercase text-[#959597]">Unit</span><input className={control} value={form.unit} onChange={(event) => set("unit", event.target.value)} /></label>
          </div>
        )}
        {gas ? (
          <p className="font-sans text-[11px] uppercase text-[#8EB4FF]">Sensors load the detection template. Edit them after the asset is saved.</p>
        ) : null}
        <label className="flex max-w-xs flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">Replacement value *</span>
          <input className={`${control} ${errors.replacementValue ? "border-[#E5484D]" : ""}`} type="number" min="0" step="0.01" value={form.replacementValue ?? ""} onChange={(event) => set("replacementValue", event.target.value === "" ? null : Number(event.target.value))} />
          {errors.replacementValue ? <span className="font-sans text-[10px] uppercase text-[#FF8A9A]">{errors.replacementValue}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">Notes</span>
          <textarea className={`${control} h-20 py-2`} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton onClick={() => router.push("/fleet/assets")}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton disabled={busy || attention > 0} onClick={() => void save(true)}>Save & add another</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy || attention > 0} onClick={() => void save(false)}>Save</DashboardToolbarButton>
        </div>
      </section>
    </div>
  );
}
