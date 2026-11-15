"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type DataIntegration } from "@/lib/settings-api";
import { SettingsPanel } from "./settings-frame";

export function IntegrationsPage() {
  useSetHeaderBreadcrumb("Settings / Integrations");
  const router = useRouter();
  const [items, setItems] = React.useState<DataIntegration[]>([]);

  React.useEffect(() => {
    void settingsApi.dataIntegrations().then((res) => setItems(res.data.items)).catch(toastApiError);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Settings</h1>
      <SettingsPanel className="p-4">
        <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">Data integrations</p>
        {items.map((row) => (
          <div key={row.id} className="mt-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">{row.name}</p>
              <p className="mt-1 max-w-xl font-sans text-[10px] uppercase leading-relaxed text-[#959597]">{row.summary}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-1 font-sans text-[10px] uppercase ${row.badge === "LIVE" ? "bg-[#14532D] text-[#86EFAC]" : "bg-[#3A3A3C] text-[#C8C8CC]"}`}>{row.badge}</span>
              <button type="button" onClick={() => router.push(row.href)} className="rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                {row.actionLabel}{row.actionLabel === "EXPORT SETTINGS" ? " →" : ""}
              </button>
            </div>
          </div>
        ))}
      </SettingsPanel>
    </div>
  );
}
