"use client";

import * as React from "react";
import { settingsApi, type GlobalDefaults } from "@/lib/settings-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { fieldClass, SettingsFrame, SettingsPanel } from "./settings-frame";

const GROUPS: { title: string; rows: { value: keyof GlobalDefaults; owner: keyof GlobalDefaults; label: string }[] }[] = [
  {
    title: "Operations",
    rows: [
      { label: "Closeout escalation", value: "closeoutEscalation", owner: "closeoutOwner" },
      { label: "Work-stopped request escalation", value: "workStoppedEscalation", owner: "workStoppedOwner" },
      { label: "Recurring work order generation", value: "recurringGeneration", owner: "recurringOwner" },
    ],
  },
  {
    title: "Finance + approvals",
    rows: [
      { label: "Pay cycle", value: "payCycle", owner: "payCycleOwner" },
      { label: "PO over-threshold approval", value: "poApproval", owner: "poOwner" },
      { label: "Missing PO invoice block", value: "missingPoBlock", owner: "missingPoOwner" },
    ],
  },
  {
    title: "Safety + location",
    rows: [
      { label: "Required forms", value: "requiredForms", owner: "requiredFormsOwner" },
      { label: "Geofence fallback", value: "geofenceFallback", owner: "geofenceOwner" },
      { label: "MSA enforcement", value: "msaEnforcement", owner: "msaOwner" },
    ],
  },
];

export function GlobalDefaultsPage() {
  const [form, setForm] = React.useState<GlobalDefaults | null>(null);

  React.useEffect(() => {
    void settingsApi.globalDefaults().then((res) => setForm(res.data)).catch(toastApiError);
  }, []);

  async function save() {
    if (!form) return;
    const { id: _id, ...body } = form;
    try {
      const res = await settingsApi.saveGlobalDefaults(body);
      setForm(res.data);
      toastSuccess("Global defaults saved");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!form) return null;

  return (
    <SettingsFrame
      eyebrow="Settings / Global Defaults"
      title="Global Defaults"
      description="Fallback values used only when no customer, MSA or job-specific rule applies."
      breadcrumb="Settings / Global Defaults"
    >
      {GROUPS.map((group) => (
        <SettingsPanel key={group.title} className="p-5">
          <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">{group.title}</p>
          <div className="flex flex-col gap-3">
            {group.rows.map((row) => (
              <div key={row.label} className="grid items-center gap-3 md:grid-cols-[220px_1fr_180px]">
                <span className="font-sans text-[13px] text-[#FDFDFF]">{row.label}</span>
                <input className={fieldClass} value={String(form[row.value] ?? "")} onChange={(event) => setForm({ ...form, [row.value]: event.target.value })} />
                <input className={fieldClass} value={String(form[row.owner] ?? "")} onChange={(event) => setForm({ ...form, [row.owner]: event.target.value })} />
              </div>
            ))}
          </div>
        </SettingsPanel>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[0.08em] text-[#C4A35A]">Customer overrides take precedence. Hard gates require a logged exception.</p>
        <button type="button" onClick={() => void save()} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Review changes</button>
      </div>
    </SettingsFrame>
  );
}
