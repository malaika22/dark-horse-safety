"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { fleetApi } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

const field =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

const TYPES = ["RIG", "VESSEL", "MONITOR", "GAS DETECTOR", "OTHER"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "ANNUAL", "PRE-JOB"];
const RESULTS = ["PASS", "PASS WITH FINDINGS", "FAIL", "OVERDUE"];

function day(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CustomerOwnedFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(Boolean(id));
  const [busy, setBusy] = React.useState(false);
  const [customers, setCustomers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = React.useState({
    name: "",
    type: "RIG",
    customerId: "",
    customerName: "",
    serial: "",
    location: "",
    operationalStatus: "ACTIVE",
    frequency: "QUARTERLY",
    formName: "",
    nextDue: "",
    lastInspected: "",
    lastResult: "PASS",
    notes: "",
    photoUrl: "",
  });

  React.useEffect(() => {
    void (async () => {
      try {
        const listed = await crmApi.listCustomers({ pageSize: 100 });
        setCustomers(
          (listed.data.items ?? []).map((item) => ({ id: item.id, name: item.name })),
        );
      } catch (error) {
        toastApiError(error);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fleetApi.getCustomerOwned(id);
        const row = res.data;
        setForm({
          name: row.description,
          type: row.type || "OTHER",
          customerId: row.customerId ?? "",
          customerName: row.customerName,
          serial: row.serial ?? "",
          location: row.wellSite,
          operationalStatus: row.operationalStatus || "ACTIVE",
          frequency: row.frequency || "QUARTERLY",
          formName: row.formName || "",
          nextDue: day(row.nextDueAt),
          lastInspected: day(row.lastInspectionAt),
          lastResult: row.lastInspectionResult || "PASS",
          notes: row.notes || "",
          photoUrl: row.photoUrl || "",
        });
      } catch (error) {
        toastApiError(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(file: File) {
    const contentBase64 = await fileToBase64(file);
    const uploaded = await crmApi.uploadFile({
      folder: "fleet-customer-owned",
      fileName: file.name,
      mimeType: file.type,
      contentBase64,
    });
    set("photoUrl", uploaded.data.url);
    toastSuccess("Photo uploaded");
  }

  async function save() {
    if (!form.name.trim() || !form.customerName.trim()) {
      toastApiError(new Error("Equipment name and owning customer are required"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.saveCustomerOwned(
        {
          name: form.name,
          type: form.type,
          customerName: form.customerName,
          customerId: form.customerId || undefined,
          serial: form.serial,
          location: form.location,
          operationalStatus: form.operationalStatus,
          frequency: form.frequency,
          formName: form.formName,
          nextDue: form.nextDue || undefined,
          lastInspected: form.lastInspected || undefined,
          lastResult: form.lastResult,
          notes: form.notes,
          photoUrl: form.photoUrl,
        },
        id,
      );
      toastSuccess(id ? "Equipment updated" : `${res.data.code} registered`);
      router.push("/fleet/customer-owned-equipment");
    } catch (error) {
      toastApiError(error);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <BrandLoader />;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-semibold uppercase tracking-wide text-[#FDFDFF]">
          {id ? "Edit customer-owned equipment" : "Add customer-owned equipment"}
        </h1>
        <DashboardToolbarButton disabled={busy} onClick={() => void save()}>
          Save equipment
        </DashboardToolbarButton>
      </div>

      <section className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#141416] p-4">
        <h2 className="font-sans text-[11px] uppercase tracking-wide text-[#959597]">Equipment identity</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Equipment name</span>
            <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Type</span>
            <select className={field} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Owning customer</span>
            <input
              className={field}
              list="customer-owned-customers"
              value={form.customerName}
              onChange={(e) => {
                const name = e.target.value;
                const match = customers.find((item) => item.name.toUpperCase() === name.toUpperCase());
                setForm((current) => ({
                  ...current,
                  customerName: name,
                  customerId: match?.id ?? "",
                }));
              }}
            />
            <datalist id="customer-owned-customers">
              {customers.map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Serial / unit no.</span>
            <input className={field} value={form.serial} onChange={(e) => set("serial", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Location / well</span>
            <input className={field} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Status</span>
            <select
              className={field}
              value={form.operationalStatus}
              onChange={(e) => set("operationalStatus", e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="OUT OF SERVICE">OUT OF SERVICE</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#141416] p-4">
        <h2 className="font-sans text-[11px] uppercase tracking-wide text-[#959597]">Inspection requirements</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Inspection frequency</span>
            <select className={field} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
              {FREQUENCIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Inspection form to use</span>
            <input className={field} value={form.formName} onChange={(e) => set("formName", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Next due</span>
            <input className={field} type="date" value={form.nextDue} onChange={(e) => set("nextDue", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Last inspected</span>
            <input
              className={field}
              type="date"
              value={form.lastInspected}
              onChange={(e) => set("lastInspected", e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Last result</span>
            <select className={field} value={form.lastResult} onChange={(e) => set("lastResult", e.target.value)}>
              {RESULTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Ownership</span>
            <input className={field} value="CUSTOMER OWNED" readOnly />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#141416] p-4">
        <h2 className="font-sans text-[11px] uppercase tracking-wide text-[#959597]">Photo</h2>
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#2D2D30] text-center">
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {form.photoUrl ? "Photo attached" : "Upload equipment photo"}
          </span>
          <span className="font-sans text-[10px] text-[#959597]">PNG · JPG</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file).catch(toastApiError);
            }}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#141416] p-4">
        <h2 className="font-sans text-[11px] uppercase tracking-wide text-[#959597]">Notes</h2>
        <input className={field} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="font-sans text-[11px] uppercase text-[#959597]"
            onClick={() => router.push("/fleet/customer-owned-equipment")}
          >
            Cancel
          </button>
          <DashboardToolbarButton disabled={busy} onClick={() => void save()}>
            Save equipment
          </DashboardToolbarButton>
        </div>
      </section>
    </div>
  );
}
