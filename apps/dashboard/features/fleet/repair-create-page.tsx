"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardModal, DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { fleetApi, type FleetAsset, type FleetPlaceCard } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

const fieldClass =
  "w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

export function RepairCreatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [assets, setAssets] = React.useState<FleetAsset[]>([]);
  const [places, setPlaces] = React.useState<FleetPlaceCard[]>([]);
  const [people, setPeople] = React.useState<string[]>([]);
  const [assetCode, setAssetCode] = React.useState(params.get("asset") ?? "");
  const [serial, setSerial] = React.useState("");
  const [parentTruck, setParentTruck] = React.useState(params.get("truck") ?? "");
  const [location, setLocation] = React.useState(params.get("location") ?? "");
  const [returnedBy, setReturnedBy] = React.useState(params.get("returnedBy") ?? "");
  const [dateLabel, setDateLabel] = React.useState(params.get("date") ?? "");
  const [issueType, setIssueType] = React.useState(params.get("issueType") ?? "CONDITION ON RETURN");
  const [priority, setPriority] = React.useState("MEDIUM");
  const [category, setCategory] = React.useState(params.get("category") ?? "");
  const [issue, setIssue] = React.useState(params.get("issue") ?? "");
  const [assignedName, setAssignedName] = React.useState(params.get("assign") ?? "");
  const [vendorName, setVendorName] = React.useState("");
  const [etaLabel, setEtaLabel] = React.useState("");
  const [estimatedCost, setEstimatedCost] = React.useState("");
  const [partsNeeded, setPartsNeeded] = React.useState("");
  const [expectedDowntime, setExpectedDowntime] = React.useState("");
  const [moveAsset, setMoveAsset] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<
    | { kind: "saved"; code: string; detail: string }
    | { kind: "partial"; code: string; assetCode: string; detail: string }
    | null
  >(null);

  React.useEffect(() => {
    void Promise.all([fleetApi.listAssets(), fleetApi.trucksOverview()])
      .then(([assetRes, truckRes]) => {
        setAssets(assetRes.data.items ?? []);
        setPlaces(truckRes.data.cards ?? []);
        setPeople(truckRes.data.employees?.map((person) => person.name) ?? []);
      })
      .catch(toastApiError);
  }, []);

  const selected = assets.find((item) => item.assetCode === assetCode);
  React.useEffect(() => {
    if (!selected) return;
    if (!parentTruck && selected.parentTruck) setParentTruck(selected.parentTruck);
    if (!category && selected.equipmentType) setCategory(selected.equipmentType);
  }, [selected, parentTruck, category]);

  const prefilled = params.get("from") === "check-in" || params.get("returnedBy") || params.get("issue");

  async function onPhoto(file: File) {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const uploaded = await crmApi.uploadFile({
      folder: "fleet-repairs",
      fileName: file.name,
      mimeType: file.type,
      contentBase64,
    });
    setPhotos((current) => [...current, uploaded.data.url]);
  }

  function resetForm() {
    setAssetCode("");
    setSerial("");
    setParentTruck("");
    setLocation("");
    setReturnedBy("");
    setIssue("");
    setNotes("");
    setPhotos([]);
    setEstimatedCost("");
    setPartsNeeded("");
    setExpectedDowntime("");
    setMoveAsset(false);
    setSaveError(null);
  }

  async function submit(andAnother = false) {
    if (!assetCode.trim() || !issue.trim()) {
      setSaveError("Asset and issue description are required. Your other entries are preserved.");
      return;
    }
    setBusy(true);
    setSaveError(null);
    let createdCode = "";
    try {
      const created = await fleetApi.createRepair({
        assetCode: assetCode.trim(),
        assetLabel: selected?.assetLabel,
        serial: serial.trim() || undefined,
        parentTruck: parentTruck.trim() || undefined,
        location: location.trim() || undefined,
        issue: issue.trim(),
        issueType,
        priority,
        category: category.trim() || undefined,
        vendorName: vendorName.trim() || undefined,
        assignedName: assignedName.trim() || undefined,
        etaLabel: etaLabel.trim() || undefined,
        notes: notes.trim() || undefined,
        photoUrls: photos,
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : undefined,
        partsNeeded: partsNeeded.trim() || undefined,
        expectedDowntime: expectedDowntime.trim() || undefined,
        reportedBy: returnedBy.trim() || undefined,
      });
      createdCode = created.data.code;
      if (moveAsset) {
        if (!location.trim()) {
          setOutcome({
            kind: "partial",
            code: createdCode,
            assetCode: assetCode.trim(),
            detail: `${createdCode} was saved. Choose a current location before the asset can be moved.`,
          });
          return;
        }
        await fleetApi.moveAsset(assetCode.trim(), {
          to: location.trim(),
          reason: `Repair ${createdCode}`,
          newParentTruck: parentTruck.trim() || undefined,
        });
      }
      let detail = `${createdCode} created for ${selected?.assetLabel ?? assetCode}.`;
      if (moveAsset) {
        const overview = await fleetApi.trucksOverview();
        const truck = overview.data.cards.find(
          (card) => card.name.toUpperCase() === parentTruck.trim().toUpperCase(),
        );
        detail = `${createdCode} created. ${selected?.assetLabel ?? assetCode} moved to ${location.trim()}.${
          truck?.readiness != null ? ` ${truck.name} readiness updated to ${truck.readiness}%.` : ""
        }`;
      }
      if (andAnother) {
        toastSuccess(detail);
        resetForm();
        return;
      }
      setOutcome({ kind: "saved", code: createdCode, detail });
    } catch (err) {
      if (createdCode) {
        setOutcome({
          kind: "partial",
          code: createdCode,
          assetCode: assetCode.trim(),
          detail: `${createdCode} was saved. The asset move did not complete — move it manually.`,
        });
        return;
      }
      setSaveError("Couldn’t save. Your entries are preserved.");
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <h1 className="font-sans text-[18px] font-[590] uppercase text-[#FDFDFF] md:text-[22px]">Create repair request</h1>
      {prefilled ? (
        <div className="rounded-lg border border-[#2450A6] bg-[#16356B] px-3 py-2 font-sans text-[12px] uppercase text-[#D6E4FF]">
          Pre-filled from check-in
          {selected ? ` · ${selected.assetLabel} ${selected.assetCode}` : assetCode ? ` · ${assetCode}` : ""}
          {dateLabel ? ` · ${dateLabel}` : ""}
          {returnedBy ? ` · returned by ${returnedBy}` : ""}
          {params.get("condition") ? ` · condition: ${params.get("condition")}` : ""}
        </div>
      ) : null}

      <Section title="Asset & truck">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Asset">
            <select className={fieldClass} value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
              <option value="">Select an asset</option>
              {assets.map((item) => (
                <option key={item.assetCode} value={item.assetCode}>{item.assetLabel} · {item.assetCode}</option>
              ))}
            </select>
          </Field>
          <Field label="Serial #"><input className={fieldClass} value={serial} onChange={(e) => setSerial(e.target.value)} /></Field>
          <Field label="Parent truck">
            <select className={fieldClass} value={parentTruck} onChange={(e) => setParentTruck(e.target.value)}>
              <option value="">No home truck</option>
              {places.filter((place) => place.kind === "TRUCK").map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </Field>
          <Field label="Current location">
            <select className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Select a location</option>
              {places.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </Field>
          <Field label="Reported by">
            <input className={fieldClass} list="repair-create-people" value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} />
          </Field>
          <Field label="Date"><input className={fieldClass} value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Reported date" /></Field>
        </div>
      </Section>

      <Section title="Issue details">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Issue type"><input className={fieldClass} value={issueType} onChange={(e) => setIssueType(e.target.value)} /></Field>
          <Field label="Priority">
            <select className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {["URGENT", "HIGH", "MEDIUM", "LOW"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Category"><input className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        </div>
        <Field label="Description">
          <textarea className={fieldClass} rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} />
        </Field>
      </Section>

      <Section title="Assignment & cost">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Assign to">
            <input className={fieldClass} list="repair-create-people" value={assignedName} onChange={(e) => setAssignedName(e.target.value)} />
          </Field>
          <Field label="Est. cost"><input className={fieldClass} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} /></Field>
          <Field label="Parts needed"><input className={fieldClass} value={partsNeeded} onChange={(e) => setPartsNeeded(e.target.value)} /></Field>
          <Field label="Expected downtime"><input className={fieldClass} value={expectedDowntime} onChange={(e) => setExpectedDowntime(e.target.value)} /></Field>
          <Field label="Vendor"><input className={fieldClass} value={vendorName} onChange={(e) => setVendorName(e.target.value)} /></Field>
          <Field label="ETA"><input className={fieldClass} value={etaLabel} onChange={(e) => setEtaLabel(e.target.value)} /></Field>
        </div>
        <label className="flex items-start gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
          <input type="checkbox" checked={moveAsset} onChange={(e) => setMoveAsset(e.target.checked)} />
          <span>
            Move asset to the selected location
            <span className="mt-1 block text-[11px] text-[#959597]">
              {location.trim()
                ? `${selected?.assetLabel ?? "The asset"} will be moved to ${location.trim()} when the request is saved. Truck readiness is recalculated from the live record.`
                : "Select a current location to move the asset when this request is saved."}
            </span>
          </span>
        </label>
        <datalist id="repair-create-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Photos">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#2D2D30] font-sans text-[11px] uppercase text-[#959597]">
            Upload photo of the issue
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onPhoto(file).catch(toastApiError); }} />
          </label>
          {photos.length ? <p className="mt-2 font-sans text-[11px] uppercase text-[#8EB4FF]">{photos.length} photo{photos.length === 1 ? "" : "s"} attached</p> : null}
        </Section>
        <Section title="Notes">
          <textarea className={fieldClass} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Section>
      </div>

      {saveError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FF4D4D] bg-[#3A1717] px-3 py-2">
          <p className="font-sans text-[12px] uppercase text-[#FF8A9A]">{saveError}</p>
          <DashboardToolbarButton disabled={busy} onClick={() => void submit()}>Retry</DashboardToolbarButton>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <DashboardToolbarButton onClick={() => router.push("/fleet/repair-requests")}>Cancel</DashboardToolbarButton>
        <DashboardToolbarButton disabled={busy} onClick={() => void submit(true)}>Save & add another</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void submit()}>Save repair request</DashboardToolbarButton>
      </div>

      <DashboardModal
        open={outcome != null}
        onClose={() => setOutcome(null)}
        title="Repair request created"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => outcome && router.push(`/fleet/repair-requests/${outcome.code}`)}>
              View {outcome?.code}
            </DashboardToolbarButton>
            {outcome?.kind === "partial" ? (
              <DashboardToolbarButton variant="primary" onClick={() => router.push(`/fleet/assets/${outcome.assetCode}`)}>
                Move asset
              </DashboardToolbarButton>
            ) : (
              <DashboardToolbarButton variant="primary" onClick={() => router.push("/fleet/repair-requests")}>
                Back to repair requests
              </DashboardToolbarButton>
            )}
          </div>
        }
      >
        <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{outcome?.detail}</p>
        <p className={`mt-3 font-sans text-[11px] uppercase ${outcome?.kind === "partial" ? "text-[#E8C547]" : "text-[#7DCEA0]"}`}>
          {outcome?.kind === "partial" ? "Request saved · asset move requires action" : "Request saved"}
        </p>
      </DashboardModal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <h2 className="mb-3 font-sans text-[12px] uppercase text-[#959597]">{title}</h2>
      <div className="space-y-3">{children}</div>
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
