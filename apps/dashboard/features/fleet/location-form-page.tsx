"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { fleetApi, type FleetLocationRecord } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

const field =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

export function LocationFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = React.useState(Boolean(id));
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    type: params.get("type") ?? "YARD",
    address: "",
    city: "MIDLAND",
    state: "TX",
    latitude: "",
    longitude: "",
    responsibleName: "",
    accessHours: "24-HOUR YARD",
    maxCapacity: "",
    bayCount: "",
    emergencyContact: "",
    status: "ACTIVE",
    notes: "",
  });

  React.useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fleetApi.getLocation(id);
        fill(res.data);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function fill(row: FleetLocationRecord) {
    setForm({
      name: row.name,
      type: row.type,
      address: row.address ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      latitude: row.latitude == null ? "" : String(row.latitude),
      longitude: row.longitude == null ? "" : String(row.longitude),
      responsibleName: row.responsibleName ?? "",
      accessHours: row.accessHours ?? "",
      maxCapacity: row.maxCapacity == null ? "" : String(row.maxCapacity),
      bayCount: row.bayCount == null ? "" : String(row.bayCount),
      emergencyContact: row.emergencyContact ?? "",
      status: row.status,
      notes: row.notes ?? "",
    });
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      toastApiError(new Error("Location name is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.saveLocation(
        {
          name: form.name.trim(),
          type: form.type,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          responsibleName: form.responsibleName.trim() || undefined,
          accessHours: form.accessHours.trim() || undefined,
          maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
          bayCount: form.bayCount ? Number(form.bayCount) : undefined,
          emergencyContact: form.emergencyContact.trim() || undefined,
          status: form.status,
          notes: form.notes.trim() || undefined,
        },
        id,
      );
      toastSuccess(id ? "Location saved" : "Location created");
      router.push(`/fleet/trucks/locations/${res.data.slug ?? res.data.id}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  function useCurrent() {
    if (!navigator.geolocation) {
      toastApiError(new Error("This browser cannot read the current location"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        set("latitude", position.coords.latitude.toFixed(6));
        set("longitude", position.coords.longitude.toFixed(6));
        setConfirm(true);
      },
      () => toastApiError(new Error("Location permission was denied")),
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading location" />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-[20px] uppercase text-[#FDFDFF]">{id ? "Edit Location" : "Add Location"}</h1>
        <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void save()}>
          {id ? "Save Changes" : "Save Location"}
        </DashboardToolbarButton>
      </div>
      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <h2 className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Location details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Location name *"><input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Type *">
            <select className={field} value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="YARD">Yard</option>
              <option value="REPAIR_BAY">Repair bay</option>
              <option value="STORAGE">Storage</option>
            </select>
          </Field>
          <Field label="Responsible person"><input className={field} value={form.responsibleName} onChange={(e) => set("responsibleName", e.target.value)} /></Field>
          <Field label="Address"><input className={field} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="City"><input className={field} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State"><input className={field} value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
        </div>
      </section>
      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <h2 className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Capacity and access</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Maximum capacity"><input className={field} value={form.maxCapacity} onChange={(e) => set("maxCapacity", e.target.value)} /></Field>
          <Field label="Bay count"><input className={field} value={form.bayCount} onChange={(e) => set("bayCount", e.target.value)} /></Field>
          <Field label="Access hours"><input className={field} value={form.accessHours} onChange={(e) => set("accessHours", e.target.value)} /></Field>
          <Field label="Emergency contact"><input className={field} value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} /></Field>
          <Field label="Status">
            <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-[12px] uppercase text-[#FDFDFF]">Coordinates</h2>
          <button type="button" className="font-sans text-[11px] uppercase text-[#8EB4FF]" onClick={useCurrent}>Use my current location</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Latitude"><input className={field} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} /></Field>
          <Field label="Longitude"><input className={field} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} /></Field>
        </div>
        <button type="button" className="mt-3 font-sans text-[11px] uppercase text-[#FDFDFF]" onClick={() => setConfirm(true)}>
          Confirm coordinates
        </button>
      </section>
      <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
        <h2 className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Capacity notes</h2>
        <textarea className="min-h-20 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </section>
      {confirm ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2D2D30] bg-[#121212] p-5">
            <h2 className="font-sans text-[14px] uppercase text-[#FDFDFF]">Confirm current location</h2>
            <dl className="mt-4 space-y-2 font-sans text-[12px] uppercase">
              <Row label="Address" value={[form.address, form.city, form.state].filter(Boolean).join(", ") || "—"} />
              <Row label="Coordinates" value={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "—"} />
              <Row label="Access" value={form.accessHours || "—"} />
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <DashboardToolbarButton onClick={() => setConfirm(false)}>Cancel</DashboardToolbarButton>
              <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void save()}>Use this location</DashboardToolbarButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#959597]">{label}</dt>
      <dd className="text-[#FDFDFF]">{value}</dd>
    </div>
  );
}
