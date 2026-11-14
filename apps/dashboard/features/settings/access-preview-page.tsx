"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type AccessRole } from "@/lib/settings-api";
import { SettingsPanel } from "./settings-frame";

export function AccessPreviewPage() {
  useSetHeaderBreadcrumb("Settings / Access Control / Preview as Role");
  const router = useRouter();
  const params = useSearchParams();
  const requested = (params.get("role") || "SUPERVISOR").toUpperCase();
  const [roles, setRoles] = React.useState<AccessRole[]>([]);
  const [selected, setSelected] = React.useState(requested);

  React.useEffect(() => {
    void settingsApi.accessRoles().then((res) => {
      setRoles(res.data.items);
      setSelected((current) => res.data.items.some((role) => role.name === current) ? current : (res.data.items[0]?.name ?? current));
    }).catch(toastApiError);
  }, []);

  React.useEffect(() => { setSelected(requested); }, [requested]);

  const role = roles.find((item) => item.name === selected) ?? roles[0];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Access Control / Preview as Role</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Preview as role</h1>
        </div>
        <button type="button" onClick={() => router.push("/settings/access-control/users")} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Exit preview</button>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#2A2A2C] px-4 py-3 font-sans text-[11px] uppercase tracking-[0.04em] text-[#FDFDFF]">
        ! Preview mode — you are viewing the app as a {role?.name ?? selected}. Admin-only screens and actions are hidden.
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <SettingsPanel className="p-4">
          <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Preview as</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(roles.length ? roles : [{ id: selected, name: selected }]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.name)}
                className={cn("rounded-full px-3 py-1 font-sans text-[11px] uppercase", item.name === (role?.name ?? selected) ? "bg-white text-black" : "bg-[#3A3A3C] text-[#FDFDFF]")}
              >
                {item.name}
              </button>
            ))}
          </div>
        </SettingsPanel>
        <SettingsPanel className="p-4">
          <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Note</p>
          <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">
            Preview shows the app exactly as this role sees it — hidden modules, disabled actions, and role-limited dashboards. No changes are made while previewing.
          </p>
          <button type="button" onClick={() => router.push("/settings/access-control/users")} className="mt-4 rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Exit preview</button>
        </SettingsPanel>
      </div>

      {role ? (
        <SettingsPanel className="p-4">
          <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Visible to {role.name}</p>
          <div className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 font-sans text-[11px] uppercase">
            <span className="text-[#959597]">Modules</span><span className="text-right text-[#FDFDFF]">{role.modules}</span>
            <span className="text-[#959597]">Dashboards</span><span className="text-right text-[#FDFDFF]">{role.dashboards}</span>
            <span className="text-[#959597]">Hidden</span><span className="text-right text-[#FDFDFF]">{role.hidden}</span>
          </div>
        </SettingsPanel>
      ) : null}
    </div>
  );
}
