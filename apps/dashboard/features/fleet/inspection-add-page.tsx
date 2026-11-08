"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { fleetApi } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

type Check = { label: string; tag?: string };
type Result = "" | "PASS" | "FAIL" | "N/A";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none";

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

export function InspectionAddPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [assets, setAssets] = React.useState<
    Array<{
      assetCode: string;
      assetLabel: string;
      serial: string | null;
      parentTruck: string | null;
    }>
  >([]);
  const [inspectors, setInspectors] = React.useState<string[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);
  const [checklists, setChecklists] = React.useState<Record<string, Check[]>>({});
  const [failedInspections, setFailedInspections] = React.useState<
    Array<{
      id: string;
      code: string;
      assetCode: string;
      assetLabel: string;
      serial: string | null;
      parentTruck: string | null;
      dateLabel: string | null;
      resultLabel: string;
      failedItems: string[];
    }>
  >([]);
  const [parentId, setParentId] = React.useState("");
  const [incidentRef, setIncidentRef] = React.useState("");
  const [assetCode, setAssetCode] = React.useState("");
  const [inspector, setInspector] = React.useState("");
  const [inspectedAt, setInspectedAt] = React.useState("");
  const [type, setType] = React.useState("PRE-JOB");
  const [source, setSource] = React.useState("MOBILE_APP");
  const [results, setResults] = React.useState<Record<string, Result>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [findings, setFindings] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [photoNames, setPhotoNames] = React.useState<string[]>([]);
  const [createRepair, setCreateRepair] = React.useState(false);
  const [repairTouched, setRepairTouched] = React.useState(false);
  const [outOfService, setOutOfService] = React.useState(false);
  const [reinspect, setReinspect] = React.useState(false);
  const [dueAt, setDueAt] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fleetApi.inspectionFormOptions();
        if (cancelled) return;
        const data = res.data;
        setAssets(data.assets);
        setInspectors(data.inspectors);
        setTypes(data.types);
        setChecklists(data.checklists);
        setFailedInspections(data.failedInspections ?? []);
        setParentId(data.failedInspections?.[0]?.id ?? "");
        const requested = params.get("asset");
        const match = data.assets.find((row) => row.assetCode === requested);
        setAssetCode(match?.assetCode ?? data.assets[0]?.assetCode ?? "");
        setInspector(data.inspectors[0] ?? "");
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setInspectedAt(now.toISOString().slice(0, 16));
      } catch (err) {
        if (!cancelled) toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const parent = failedInspections.find((row) => row.id === parentId) ?? null;
  const checks =
    type === "RE-INSPECTION"
      ? (parent?.failedItems ?? []).map((label) => ({
          label,
          tag: parent ? `FAILED ON ${parent.code}` : undefined,
        }))
      : (checklists[type] ?? []);
  const asset =
    (type === "RE-INSPECTION" && parent
      ? assets.find((row) => row.assetCode === parent.assetCode) ?? {
          assetCode: parent.assetCode,
          assetLabel: parent.assetLabel,
          serial: parent.serial,
          parentTruck: parent.parentTruck,
        }
      : assets.find((row) => row.assetCode === assetCode)) ?? null;
  const answered = checks.filter((item) => results[item.label]);
  const failed = checks.filter((item) => results[item.label] === "FAIL");
  const passed = checks.filter((item) => results[item.label] === "PASS");
  const overall = failed.length ? "FAIL" : answered.length === checks.length && checks.length ? "PASS" : "—";

  React.useEffect(() => {
    if (!repairTouched) setCreateRepair(failed.length > 0);
  }, [failed.length, repairTouched]);

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      const names: string[] = [];
      for (const file of Array.from(files)) {
        const contentBase64 = await fileToBase64(file);
        const res = await crmApi.uploadFile({
          folder: "fleet-inspections",
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          contentBase64,
        });
        uploaded.push(res.data.url);
        names.push(file.name);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      setPhotoNames((prev) => [...prev, ...names]);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!assetCode || !inspector || !inspectedAt) {
      toastApiError(new Error("Asset, inspector, and date are required"));
      return;
    }
    if (!checks.length || answered.length !== checks.length) {
      toastApiError(new Error("Mark every checklist item Pass, Fail, or N/A"));
      return;
    }
    if (reinspect && !dueAt) {
      toastApiError(new Error("Choose a re-inspection due date"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.createInspectionRecord({
        assetCode: asset?.assetCode ?? assetCode,
        assetLabel: asset?.assetLabel,
        serial: asset?.serial ?? undefined,
        parentTruck: asset?.parentTruck ?? undefined,
        parentInspectionId: type === "RE-INSPECTION" ? parent?.id : undefined,
        incidentReference: type === "POST-INCIDENT" ? incidentRef.trim() || undefined : undefined,
        inspectorName: inspector,
        inspectedAt: new Date(inspectedAt).toISOString(),
        type,
        source,
        checklistItems: checks.map((item) => ({
          label: item.label,
          result: results[item.label] || "PASS",
          note: notes[item.label]?.trim() || undefined,
          tag: item.tag,
        })),
        findingsSummary: findings.trim() || undefined,
        photoUrls: photos,
        createRepair,
        markOutOfService: outOfService,
        reinspectionRequired: reinspect,
        reinspectionDueAt: reinspect && dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      toastSuccess(res.data.message);
      router.push(`/fleet/inspections/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading inspection form" />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          Add Inspection Record
        </h1>
        <div className="flex gap-2">
          <DashboardToolbarButton
            onClick={() => {
              const note = window.prompt("Add a note");
              if (note?.trim()) {
                setFindings((prev) => (prev ? `${prev}\n${note.trim()}` : note.trim()));
                toastSuccess("Note added");
              }
            }}
          >
            Add Note
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void save()}>
            Save Record
          </DashboardToolbarButton>
        </div>
      </div>

      <DashboardPanel className="p-4 sm:p-5">
        <DashboardPanelTitle icon="document" title="Asset & Inspection" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Asset *</span>
            <select
              className={fieldClass}
              value={type === "RE-INSPECTION" && parent ? parent.assetCode : assetCode}
              disabled={type === "RE-INSPECTION"}
              onChange={(e) => setAssetCode(e.target.value)}
            >
              {type === "RE-INSPECTION" && parent && !assets.some((row) => row.assetCode === parent.assetCode) ? (
                <option value={parent.assetCode}>
                  {parent.assetCode} · {parent.assetLabel}
                </option>
              ) : null}
              {assets.map((row) => (
                <option key={row.assetCode} value={row.assetCode}>
                  {row.assetCode} · {row.assetLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Serial (auto)</span>
            <input className={fieldClass} readOnly value={asset?.serial ?? "—"} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Parent Truck (auto)</span>
            <input className={fieldClass} readOnly value={asset?.parentTruck ?? "—"} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Inspector *</span>
            <select className={fieldClass} value={inspector} onChange={(e) => setInspector(e.target.value)}>
              {inspectors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {type === "RE-INSPECTION" ? (
            <label className="block md:col-span-2">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Based on</span>
              <select
                className={fieldClass}
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                {failedInspections.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.resultLabel} · {row.dateLabel ?? "—"} · {row.assetCode}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {type === "POST-INCIDENT" ? (
            <label className="block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Incident reference</span>
              <input
                className={fieldClass}
                value={incidentRef}
                onChange={(e) => setIncidentRef(e.target.value)}
                placeholder="INC-0142"
              />
            </label>
          ) : null}
          <label className="block md:col-span-2">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Date & Time *</span>
            <input
              type="datetime-local"
              className={fieldClass}
              value={inspectedAt}
              onChange={(e) => setInspectedAt(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">Inspection Type *</p>
            <div className="flex flex-wrap gap-2">
              {(types.length ? types : ["MONTHLY", "PRE-JOB", "ANNUAL", "POST-INCIDENT", "RE-INSPECTION"]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-sans text-[10px] uppercase",
                    type === item
                      ? "border-[#FDFDFF] bg-[#FDFDFF] text-[#111]"
                      : "border-[#2D2D30] text-[#959597]",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">Source</p>
            <div className="inline-flex rounded-lg border border-[#2D2D30] p-0.5">
              {["MOBILE_APP", "WEB"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSource(item)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-sans text-[10px] uppercase",
                    source === item ? "bg-[#FDFDFF] text-[#111]" : "text-[#959597]",
                  )}
                >
                  {item.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-4 sm:p-5">
        <DashboardPanelTitle icon="clipboard" title="Checklist" />
        <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
          Gas monitor · {type} · {checks.length} items
          {type === "MONTHLY" ? " · includes pre-job" : ""}
          {type === "ANNUAL" ? " · includes monthly" : ""}
          {type === "POST-INCIDENT" ? " · includes annual" : ""}
          {type === "RE-INSPECTION" && parent
            ? ` · failed items from ${parent.code}`
            : ""}
        </p>
        <div className="mt-4 hidden grid-cols-[1fr_220px_1fr] gap-3 font-sans text-[10px] uppercase text-[#6B6B6D] md:grid">
          <span>Check</span>
          <span>Result</span>
          <span>Note</span>
        </div>
        <ul className="mt-2 list-none">
          {checks.map((item) => (
            <li key={item.label} className="grid grid-cols-1 gap-2 border-b border-[#2A2A2A] py-3 md:grid-cols-[1fr_220px_1fr] md:items-center">
              <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                {item.label}
                {item.tag ? (
                  <span className="ml-2 font-sans text-[9px] font-normal text-[#8EB4FF]">+ {item.tag}</span>
                ) : null}
              </p>
              <div className="flex gap-3 font-sans text-[10px] uppercase text-[#C8C8C8]">
                {(["PASS", "FAIL", "N/A"] as const).map((value) => (
                  <label key={value} className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      name={item.label}
                      checked={results[item.label] === value}
                      onChange={() => setResults((prev) => ({ ...prev, [item.label]: value }))}
                      className="accent-[#FDFDFF]"
                    />
                    <span className={value === "FAIL" && results[item.label] === "FAIL" ? "text-[#FF8A9A]" : undefined}>
                      {value}
                    </span>
                  </label>
                ))}
              </div>
              <input
                value={notes[item.label] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [item.label]: e.target.value }))}
                placeholder="Add note..."
                className={fieldClass}
              />
            </li>
          ))}
        </ul>
      </DashboardPanel>

      <DashboardPanel className="p-4 sm:p-5">
        <DashboardPanelTitle icon="activity" title="Findings" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Overall Result *</span>
            <input className={fieldClass} readOnly value={overall} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Items Passed (auto)</span>
            <input className={fieldClass} readOnly value={`${passed.length} of ${checks.length}`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Items Failed (auto)</span>
            <input className={fieldClass} readOnly value={`${failed.length} of ${checks.length}`} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Findings Narrative</span>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Photos</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              id="inspection-photos"
              onChange={(e) => void onPhotos(e.target.files)}
            />
            <label
              htmlFor="inspection-photos"
              className="flex h-[74px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#2D2D30] font-sans text-[10px] uppercase text-[#959597]"
            >
              + Add Photos · PNG / JPG
            </label>
            {photoNames.length ? (
              <p className="mt-2 font-sans text-[10px] uppercase text-[#8EB4FF]">{photoNames.join(" · ")}</p>
            ) : null}
          </label>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-4 sm:p-5">
        <DashboardPanelTitle icon="lightning" title="Follow-up" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={createRepair}
                onChange={(e) => {
                  setRepairTouched(true);
                  setCreateRepair(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block font-sans text-[11px] uppercase text-[#FDFDFF]">Create Repair Request</span>
                {failed.length ? (
                  <span className="block font-sans text-[10px] uppercase text-[#E8C547]">
                    Default on because {failed.length} checklist item{failed.length === 1 ? "" : "s"} failed
                  </span>
                ) : (
                  <span className="block font-sans text-[10px] uppercase text-[#6B6B6D]">
                    Off — no items failed on re-check
                  </span>
                )}
              </span>
            </label>
            <label className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
              <input type="checkbox" checked={outOfService} onChange={(e) => setOutOfService(e.target.checked)} />
              Mark Out of Service
            </label>
            <label className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
              <input type="checkbox" checked={reinspect} onChange={(e) => setReinspect(e.target.checked)} />
              Re-Inspection Required
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Due Date</span>
            <input
              type="date"
              disabled={!reinspect}
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className={cn(fieldClass, !reinspect && "opacity-40")}
            />
          </label>
        </div>
      </DashboardPanel>

      <div className="flex justify-end gap-2">
        <DashboardToolbarButton onClick={() => router.push("/fleet/inspections")}>Cancel</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void save()}>
          Save Inspection
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
