"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { settingsApi, type ArchivedForm } from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";
import { FormsShell } from "./forms-shell";

const WINDOWS = ["ACTIVE", "CURRENT", "FUTURE"];

export function FormArchivedPage() {
  useSetHeaderBreadcrumb("Settings / Forms / Archived GoCanvas");
  const [query, setQuery] = React.useState("");
  const [windows, setWindows] = React.useState(WINDOWS);
  const [items, setItems] = React.useState<ArchivedForm[]>([]);

  const load = React.useCallback(() => {
    void settingsApi.archivedForms({ q: query || undefined, windows: windows.join(",") }).then((res) => setItems(res.data.items)).catch(toastApiError);
  }, [query, windows]);

  React.useEffect(() => { load(); }, [load]);

  function toggle(window: string) {
    setWindows((current) => current.includes(window) ? current.filter((item) => item !== window) : [...current, window]);
  }

  async function restore(id: string) {
    try {
      const res = await settingsApi.restoreArchivedForm(id);
      setItems(res.data.items);
      toastSuccess("Form restored to the library");
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <FormsShell tab="archived">
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search critical dates" className={`${fieldClass} max-w-sm`} />
        <span className="ml-auto font-sans text-[11px] uppercase text-[#959597]">Sort: notice start (nearest)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {WINDOWS.map((window) => (
          <button key={window} type="button" onClick={() => toggle(window)} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", windows.includes(window) ? "border-white bg-white text-black" : "border-white/15 text-[#959597]")}>{window}{windows.includes(window) ? " ×" : ""}</button>
        ))}
        <button type="button" onClick={() => setWindows(WINDOWS)} className="font-sans text-[10px] uppercase text-[#959597]">× Clear all</button>
      </div>
      <SettingsPanel className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-[1.4fr_110px_90px_70px_80px_1.4fr_90px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Form name</span><span>Category</span><span>GC version</span><span>Subs</span><span>Last</span><span>Archived reason</span><span>Action</span>
        </div>
        {items.map((row) => (
          <div key={row.id} className="grid min-w-[900px] grid-cols-[1.4fr_110px_90px_70px_80px_1.4fr_90px] items-center gap-2 border-b border-white/5 px-4 py-3 font-sans text-[11px] uppercase text-[#C8C8CC]">
            <span className="text-[#FDFDFF]">{row.name}</span>
            <span>{row.category}</span>
            <span>{row.version}</span>
            <span>{row.subs}</span>
            <span>{row.lastLabel}</span>
            <span>{row.reason}</span>
            <button type="button" onClick={() => void restore(row.id)} className="rounded-lg bg-[#3A3A3C] px-3 py-1 text-[10px] text-[#FDFDFF]">Restore</button>
          </div>
        ))}
      </SettingsPanel>
    </FormsShell>
  );
}
