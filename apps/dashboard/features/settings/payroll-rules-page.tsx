"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { settingsApi, type PayrollRules, type PayrollRulesInput } from "@/lib/settings-api";
import { fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const CYCLE = ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY"];
const OT = ["AFTER 8H / DAY", "AFTER 40H / WEEK"];
const LONG = ["OVER 12H / SHIFT", "OVER 10H / SHIFT"];
const ROUND = ["5 MIN", "6 MIN", "15 MIN"];
const GRACE = ["1H", "2H", "4H"];
const MINIMUM = ["2H", "4H", "8H"];
const EXPORTS = ["ADP WORKFORCE NOW"];

function inputOf(rules: PayrollRules): PayrollRulesInput {
  return {
    payCycleLength: rules.payCycleLength,
    currentCycleStart: rules.currentCycleStart,
    overtimeThreshold: rules.overtimeThreshold,
    longShiftFlag: rules.longShiftFlag,
    seventhDayRule: rules.seventhDayRule,
    autoApproveClean: rules.autoApproveClean,
    roundClockEntries: rules.roundClockEntries,
    requireAdminNote: rules.requireAdminNote,
    gracePeriod: rules.gracePeriod,
    minimumShift: rules.minimumShift,
    exportTo: rules.exportTo,
  };
}

export function PayrollRulesPage() {
  useSetHeaderBreadcrumb("Settings / Payroll Rules");
  const [saved, setSaved] = React.useState<PayrollRules | null>(null);
  const [form, setForm] = React.useState<PayrollRulesInput | null>(null);

  React.useEffect(() => {
    void settingsApi.payrollRules().then((res) => {
      setSaved(res.data);
      setForm(inputOf(res.data));
    }).catch(toastApiError);
  }, []);

  const dirty = saved && form ? JSON.stringify(inputOf(saved)) !== JSON.stringify(form) : false;

  function set<K extends keyof PayrollRulesInput>(key: K, value: PayrollRulesInput[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    try {
      const res = await settingsApi.savePayrollRules(form);
      setSaved(res.data);
      setForm(inputOf(res.data));
      toastSuccess("Payroll rules saved");
    } catch (error) {
      toastApiError(error);
    }
  }

  async function exportAdp() {
    try {
      const res = await settingsApi.exportPayroll();
      setSaved(res.data);
      setForm(inputOf(res.data));
      toastSuccess("Export recorded for ADP");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!form || !saved) return null;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-6 pb-24 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Payroll Rules</p>

      <SettingsPanel className="p-5">
        <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Pay cycle & overtime</p>
        <div className="mt-4 rounded-lg border border-[#2E4A7A] bg-[#1A2744] px-4 py-3 font-sans text-[11px] uppercase tracking-[0.04em] text-[#D6E4FF]">
          Changes apply to the current and all upcoming pay cycles
          <span className="mt-1 block text-[#8EA0C4]">Past cycles are not affected</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Select label="Pay cycle length" value={form.payCycleLength} options={CYCLE} onChange={(value) => set("payCycleLength", value)} />
          <Field label="Current cycle start" value={form.currentCycleStart} onChange={(value) => set("currentCycleStart", value)} />
          <Select label="Overtime threshold" value={form.overtimeThreshold} options={OT} onChange={(value) => set("overtimeThreshold", value)} />
          <Select label="Long-shift flag" value={form.longShiftFlag} options={LONG} onChange={(value) => set("longShiftFlag", value)} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <div>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">7th-day rule</p>
            <p className="font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">Full OT rate on the 7th consecutive day</p>
          </div>
          <Toggle on={form.seventhDayRule} onClick={() => set("seventhDayRule", !form.seventhDayRule)} />
        </div>
      </SettingsPanel>

      <SettingsPanel className="p-5">
        <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Rounding & approval rules</p>
        <RuleRow title="Auto-approve clean entries" detail="No GPS/duration flags · within scheduled window">
          <Toggle on={form.autoApproveClean} onClick={() => set("autoApproveClean", !form.autoApproveClean)} />
        </RuleRow>
        <RuleRow title="Round clock entries" detail="Nearest 15 minutes">
          <Select label="" value={form.roundClockEntries} options={ROUND} onChange={(value) => set("roundClockEntries", value)} compact />
        </RuleRow>
        <RuleRow title="Require admin note on edits" detail="When admin changes a technician’s hours">
          <Toggle on={form.requireAdminNote} onClick={() => set("requireAdminNote", !form.requireAdminNote)} />
        </RuleRow>
        <RuleRow title="Grace period after cycle close" detail="Late punches and edits accepted until">
          <Select label="" value={form.gracePeriod} options={GRACE} onChange={(value) => set("gracePeriod", value)} compact />
        </RuleRow>
        <RuleRow title="Minimum shift to qualify for pay" detail="Shorter shifts are flagged for review">
          <Select label="" value={form.minimumShift} options={MINIMUM} onChange={(value) => set("minimumShift", value)} compact />
        </RuleRow>
      </SettingsPanel>

      <SettingsPanel className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Payroll export</p>
          <button type="button" onClick={() => void exportAdp()} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">
            Export to ADP
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
          <div>
            <p className={labelClass}>Export to</p>
            <p className="font-sans text-[10px] uppercase text-[#959597]">Payroll provider</p>
          </div>
          <Select label="" value={form.exportTo} options={EXPORTS} onChange={(value) => set("exportTo", value)} />
        </div>
        <Readout label="Last export" detail={saved.lastExportLabel} value={saved.lastExportDate} />
        <Readout label="Next pay period close" detail={saved.nextCloseLabel} value={saved.nextCloseDate} />
        <div className="mt-4 rounded-lg border border-[#2E4A7A] bg-[#1A2744] px-4 py-3 font-sans text-[11px] uppercase tracking-[0.04em] text-[#D6E4FF]">
          ADP is export-only. No two-way sync.
          <span className="mt-1 block text-[#8EA0C4]">Changes made in ADP don’t come back into Dark Horse</span>
        </div>
      </SettingsPanel>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-white/10 bg-[#121214]/95 px-6 py-3">
        <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          {dirty ? "Unsaved changes · applies to the current and upcoming cycles" : "Saved · applies to the current and upcoming cycles"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => saved && setForm(inputOf(saved))}
            className="rounded-lg border border-white/15 px-4 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF] disabled:opacity-40"
          >
            Discard changes
          </button>
          <button type="button" disabled={!dirty} onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black disabled:opacity-40">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={labelClass}>
      {label}
      <input className={`${fieldClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const choices = options.includes(value) ? options : [value, ...options];
  const control = (
    <select className={cn(fieldClass, compact && "w-[140px]")} value={value} onChange={(event) => onChange(event.target.value)}>
      {choices.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
  if (!label) return control;
  return (
    <label className={labelClass}>
      {label}
      <span className="mt-1 block">{control}</span>
    </label>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("relative h-6 w-11 shrink-0 rounded-full", on ? "bg-[#3DDC84]" : "bg-[#3A3A3C]")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white", on ? "left-5" : "left-0.5")} />
    </button>
  );
}

function RuleRow({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
      <div>
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{title}</p>
        <p className="font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function Readout({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 md:grid-cols-[1fr_220px] md:items-center">
      <div>
        <p className={labelClass}>{label}</p>
        <p className="font-sans text-[10px] uppercase text-[#959597]">{detail}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-[#2A2A2A] px-3 py-2 text-right font-sans text-[12px] uppercase text-[#FDFDFF]">{value}</div>
    </div>
  );
}
