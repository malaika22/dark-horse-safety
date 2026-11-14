"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type AccessUserInput } from "@/lib/settings-api";
import { fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const ROLES = ["ADMIN", "SUPERVISOR", "TECHNICIAN", "DISPATCHER", "BILLING"];
const REGIONS = ["MIDLAND", "ODESSA", "PECOS", "HQ"];
const MODULES = ["OPS", "HR", "FLEET", "SAFETY"];

const blank = (): AccessUserInput => ({
  name: "",
  email: "",
  phone: "",
  role: "SUPERVISOR",
  team: "CREW A",
  region: "MIDLAND",
  mobileEnabled: true,
  adminAccess: false,
  modules: [...MODULES],
});

export function AccessUserFormPage({ userId }: { userId?: string }) {
  const editing = Boolean(userId);
  useSetHeaderBreadcrumb(editing ? "Settings / Access Control / Edit User" : "Settings / Access Control / Invite User");
  const router = useRouter();
  const [form, setForm] = React.useState<AccessUserInput>(blank());
  const [teams, setTeams] = React.useState<string[]>(["CREW A"]);
  const [ready, setReady] = React.useState(!editing);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    void settingsApi.accessTeams({}).then((res) => setTeams(res.data.items.map((team) => team.name))).catch(toastApiError);
    if (!userId) return;
    void settingsApi.accessUser(userId).then((res) => {
      const row = res.data;
      setForm({
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        team: row.team,
        region: row.region,
        mobileEnabled: row.mobileEnabled,
        adminAccess: row.adminAccess,
        modules: row.modules,
      });
      setReady(true);
    }).catch(toastApiError);
  }, [userId]);

  function set<K extends keyof AccessUserInput>(key: K, value: AccessUserInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleModule(module: string) {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(module) ? current.modules.filter((item) => item !== module) : [...current.modules, module],
    }));
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toastError("Name, email and phone are required");
      return;
    }
    try {
      if (userId) {
        await settingsApi.updateAccessUser(userId, form);
        toastSuccess("User saved");
        router.push("/settings/access-control/users");
      } else {
        const created = await settingsApi.createAccessUser(form);
        setSentTo(created.data.email);
      }
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">{editing ? "Edit user" : "Invite user"}</p>
      <button type="button" onClick={() => router.push("/settings/access-control/users")} className="w-fit rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">← Cancel</button>
      <SettingsPanel className="p-5">
        <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">User details</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Full name<input className={`${fieldClass} mt-1`} value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
          <label className={labelClass}>Email<input className={`${fieldClass} mt-1 normal-case`} value={form.email} onChange={(event) => set("email", event.target.value)} /></label>
          <label className={labelClass}>Phone<input className={`${fieldClass} mt-1`} value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
          <label className={labelClass}>Team
            <select className={`${fieldClass} mt-1`} value={form.team} onChange={(event) => set("team", event.target.value)}>
              {(teams.includes(form.team) ? teams : [form.team, ...teams]).map((team) => <option key={team}>{team}</option>)}
            </select>
          </label>
          <label className={labelClass}>Role
            <select className={`${fieldClass} mt-1`} value={form.role} onChange={(event) => set("role", event.target.value)}>
              {(ROLES.includes(form.role) ? ROLES : [form.role, ...ROLES]).map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <label className={labelClass}>Region
            <select className={`${fieldClass} mt-1`} value={form.region} onChange={(event) => set("region", event.target.value)}>
              {(REGIONS.includes(form.region) ? REGIONS : [form.region, ...REGIONS]).map((region) => <option key={region}>{region}</option>)}
            </select>
          </label>
        </div>
      </SettingsPanel>
      <SettingsPanel className="p-5">
        <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Access</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Mobile app access
            <select className={`${fieldClass} mt-1`} value={form.mobileEnabled ? "ENABLED" : "DISABLED"} onChange={(event) => set("mobileEnabled", event.target.value === "ENABLED")}>
              <option value="ENABLED">ENABLED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>
          <label className={labelClass}>Admin access
            <input className={`${fieldClass} mt-1`} value={form.role === "ADMIN" || form.adminAccess ? "YES" : "NO"} readOnly />
          </label>
        </div>
        <p className={`${labelClass} mt-4`}>Modules</p>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((module) => {
            const on = form.modules.includes(module);
            return (
              <button key={module} type="button" onClick={() => toggleModule(module)} className={`rounded-full px-3 py-1 font-sans text-[11px] uppercase ${on ? "bg-[#3A3A3C] text-white" : "border border-white/15 text-[#959597]"}`}>
                {module} {on ? "▾" : ""}
              </button>
            );
          })}
        </div>
      </SettingsPanel>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/settings/access-control/users")} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
        <button type="button" onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">{editing ? "Save changes" : "Send invite"}</button>
      </div>
      {sentTo ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#2A2A2C] p-5">
            <p className="text-[#4ADE80]">✓</p>
            <p className="mt-3 font-sans text-[13px] font-[590] uppercase tracking-[0.06em] text-[#FDFDFF]">Invite sent</p>
            <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">
              An invite was emailed to {sentTo}. They&apos;ll set a password and MFA on first login.
            </p>
            <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
              <button type="button" onClick={() => router.push("/settings/access-control/users")} className="rounded-full bg-white px-4 py-2 font-sans text-[11px] font-[590] uppercase text-black">Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
