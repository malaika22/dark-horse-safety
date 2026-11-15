"use client";

import * as React from "react";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { settingsApi, type OnCallRules } from "@/lib/settings-api";
import { SettingsPanel } from "./settings-frame";

const RULES: { key: keyof OnCallRules; label: string }[] = [
  { key: "balanceEvenly", label: "Balance assignments evenly (fairness algorithm)" },
  { key: "autoPublish", label: "Auto-publish rotation to mobile app" },
  { key: "requireBackup", label: "Require backup technician for every shift" },
  { key: "sameZoneSwaps", label: "Allow same-zone swap requests only" },
  { key: "notifyBeforeShift", label: "Notify technician 24h before shift start" },
];

export function OnCallRulesPage() {
  useSetHeaderBreadcrumb("Settings / On-Call Rules");
  const [form, setForm] = React.useState<OnCallRules | null>(null);

  React.useEffect(() => {
    void settingsApi.onCallRules().then((res) => setForm(pickRules(res.data))).catch(toastApiError);
  }, []);

  async function save() {
    if (!form) return;
    try {
      const res = await settingsApi.saveOnCallRules(form);
      setForm(pickRules(res.data));
      toastSuccess("On-call rules saved");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!form) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / On-Call Rules</p>
      <h1 className="font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">On-call rules</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberCard label="Max consecutive on-call days" unit="days" value={form.maxConsecutiveDays} onChange={(maxConsecutiveDays) => setForm({ ...form, maxConsecutiveDays })} />
        <NumberCard label="Min rest days between rotations" unit="days" value={form.minRestDays} onChange={(minRestDays) => setForm({ ...form, minRestDays })} />
        <NumberCard label="Notification lead time" unit="hours before shift" value={form.leadHours} onChange={(leadHours) => setForm({ ...form, leadHours })} />
      </div>
      <SettingsPanel className="p-4">
        <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">On-call rules</p>
        <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">Configure rotation constraints and mobile publishing behavior.</p>
        <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Rule</span><span>Enabled</span>
        </div>
        {RULES.map((rule) => {
          const on = Boolean(form[rule.key]);
          return (
            <div key={rule.key} className="flex items-center justify-between border-b border-white/5 py-3">
              <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{rule.label}</span>
              <button type="button" aria-pressed={on} onClick={() => setForm({ ...form, [rule.key]: !on })} className={`h-6 w-11 rounded-full ${on ? "bg-white" : "bg-[#3A3A3C]"}`}>
                <span className={`block h-5 w-5 rounded-full ${on ? "ml-5 bg-black" : "ml-0.5 bg-[#C8C8CC]"}`} />
              </button>
            </div>
          );
        })}
      </SettingsPanel>
      <div className="flex justify-end">
        <button type="button" onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save changes</button>
      </div>
    </div>
  );
}

function pickRules(row: OnCallRules): OnCallRules {
  return {
    maxConsecutiveDays: row.maxConsecutiveDays,
    minRestDays: row.minRestDays,
    leadHours: row.leadHours,
    balanceEvenly: row.balanceEvenly,
    autoPublish: row.autoPublish,
    requireBackup: row.requireBackup,
    sameZoneSwaps: row.sameZoneSwaps,
    notifyBeforeShift: row.notifyBeforeShift,
  };
}

function NumberCard({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rounded-xl border border-white/10 bg-[#1C1C1E] px-4 py-3">
      <span className="font-sans text-[10px] uppercase text-[#959597]">{label}</span>
      <input type="number" min={0} className="mt-1 w-full bg-transparent font-sans text-[28px] font-[590] text-[#FDFDFF] outline-none" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="font-sans text-[10px] uppercase text-[#959597]">{unit}</span>
    </label>
  );
}
