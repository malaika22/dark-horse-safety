"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type FormRule } from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";
import { FormsShell } from "./forms-shell";

const WINDOWS = ["ACTIVE", "CURRENT", "FUTURE"];

export function FormRulesPage() {
  useSetHeaderBreadcrumb("Settings / Forms / Required Rules");
  const [query, setQuery] = React.useState("");
  const [windows, setWindows] = React.useState(WINDOWS);
  const [items, setItems] = React.useState<FormRule[]>([]);

  React.useEffect(() => {
    void settingsApi.formRules({ q: query || undefined, windows: windows.join(",") }).then((res) => setItems(res.data.items)).catch(toastApiError);
  }, [query, windows]);

  function toggle(window: string) {
    setWindows((current) => current.includes(window) ? current.filter((item) => item !== window) : [...current, window]);
  }

  function exportCsv() {
    const header = "Rule,Applies to,Required forms,Payroll block,Billing,Active,Updated";
    const lines = items.map((row) => [row.name, row.appliesTo, row.forms, row.payrollBloc, row.billing, row.active, row.updatedLabel].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "required-form-rules.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FormsShell tab="rules">
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search critical dates" className={`${fieldClass} max-w-sm`} />
        <span className="ml-auto font-sans text-[11px] uppercase text-[#959597]">Sort: notice start (nearest)</span>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Export</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {WINDOWS.map((window) => (
          <button key={window} type="button" onClick={() => toggle(window)} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", windows.includes(window) ? "border-white bg-white text-black" : "border-white/15 text-[#959597]")}>{window}{windows.includes(window) ? " ×" : ""}</button>
        ))}
        <button type="button" onClick={() => setWindows(WINDOWS)} className="font-sans text-[10px] uppercase text-[#959597]">× Clear all</button>
      </div>
      <SettingsPanel className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[1.2fr_1.2fr_1.6fr_90px_80px_80px_80px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Rule name</span><span>Applies to</span><span>Required forms</span><span>Payroll bloc</span><span>Billing</span><span>Active</span><span>Updated</span>
        </div>
        {items.map((row) => (
          <div key={row.id} className="grid min-w-[980px] grid-cols-[1.2fr_1.2fr_1.6fr_90px_80px_80px_80px] items-center gap-2 border-b border-white/5 px-4 py-3 font-sans text-[11px] uppercase text-[#C8C8CC]">
            <span className="text-[#FDFDFF]">{row.name}</span>
            <span>{row.appliesTo}</span>
            <span className="flex flex-wrap gap-1">{row.forms.split(",").map((form) => <span key={form} className="rounded-full bg-[#3A3A3C] px-2 py-1 text-[10px]">{form.trim()}</span>)}</span>
            <YesNo value={row.payrollBloc} />
            <YesNo value={row.billing} />
            <span className={cn("w-fit rounded-full px-2 py-1 text-[10px]", row.active === "ACTIVE" ? "bg-[#14532D] text-[#86EFAC]" : "bg-[#3A3A3C] text-[#C8C8CC]")}>{row.active}</span>
            <span>{row.updatedLabel}</span>
          </div>
        ))}
      </SettingsPanel>
    </FormsShell>
  );
}

function YesNo({ value }: { value: string }) {
  return <span className={cn("w-fit rounded-full px-2 py-1 text-[10px]", value === "YES" ? "bg-[#14532D] text-[#86EFAC]" : "bg-[#3A2A22] text-[#D6B08A]")}>{value}</span>;
}
