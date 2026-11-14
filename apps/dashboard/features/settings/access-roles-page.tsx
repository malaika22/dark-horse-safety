"use client";

import * as React from "react";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type AccessRole, type AccessRoleInput } from "@/lib/settings-api";
import { AccessSectionLinks, fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const blank = (): AccessRoleInput => ({
  name: "",
  description: "",
  modules: "",
  dashboards: "",
  hidden: "SETTINGS, PERMISSIONS",
  accessLabel: "CUSTOM",
});

export function AccessRolesPage() {
  useSetHeaderBreadcrumb("Settings / Access Control / Roles");
  const [items, setItems] = React.useState<AccessRole[]>([]);
  const [editing, setEditing] = React.useState<AccessRole | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState<AccessRoleInput>(blank());

  const load = React.useCallback(() => {
    void settingsApi.accessRoles().then((res) => setItems(res.data.items)).catch(toastApiError);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openEdit(role: AccessRole) {
    setCreating(false);
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description,
      modules: role.modules,
      dashboards: role.dashboards,
      hidden: role.hidden,
      accessLabel: role.accessLabel,
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(blank());
    setCreating(true);
  }

  async function save() {
    if (!form.name.trim() || !form.description.trim() || !form.modules.trim()) {
      toastError("Name, description and modules are required");
      return;
    }
    try {
      const res = editing
        ? await settingsApi.saveAccessRole(editing.code, form)
        : await settingsApi.createAccessRole(form);
      setItems(res.data.items);
      setEditing(null);
      setCreating(false);
      toastSuccess(editing ? "Role saved" : "Role created");
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Access Control / Roles</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Roles</h1>
          <AccessSectionLinks current="roles" />
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">New role</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((role) => (
          <SettingsPanel key={role.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{role.name}</p>
              <span className={`rounded-full px-2 py-0.5 font-sans text-[10px] uppercase ${role.kind === "CUSTOM" ? "bg-[#3F3514] text-[#F5C451]" : "bg-[#14532D] text-[#86EFAC]"}`}>{role.kind}</span>
            </div>
            <p className="font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">{role.description}</p>
            <div className="grid grid-cols-2 gap-2 font-sans text-[10px] uppercase text-[#959597]">
              <span>Users</span><span className="text-right text-[#FDFDFF]">{role.users}</span>
              <span>Modules</span><span className="text-right text-[#FDFDFF]">{role.modules}</span>
              <span>Access</span><span className="text-right text-[#FDFDFF]">{role.accessLabel}</span>
            </div>
            <button type="button" onClick={() => openEdit(role)} className="mt-auto rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Edit role</button>
          </SettingsPanel>
        ))}
        <SettingsPanel className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">Custom role</p>
            <span className="rounded-full bg-[#3F3514] px-2 py-0.5 font-sans text-[10px] uppercase text-[#F5C451]">Custom</span>
          </div>
          <p className="font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">Build a role from scratch</p>
          <div className="grid grid-cols-2 gap-2 font-sans text-[10px] uppercase text-[#959597]">
            <span>Users</span><span className="text-right text-[#FDFDFF]">0</span>
            <span>Modules</span><span className="text-right text-[#FDFDFF]">Choose modules</span>
            <span>Access</span><span className="text-right text-[#FDFDFF]">Custom</span>
          </div>
          <button type="button" onClick={openCreate} className="mt-auto rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Create role</button>
        </SettingsPanel>
      </div>

      {editing || creating ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1C1C1E] p-5">
            <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">{editing ? "Edit role" : "New role"}</p>
            <div className="mt-4 grid gap-3">
              <label className={labelClass}>Name<input className={`${fieldClass} mt-1`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className={labelClass}>Description<input className={`${fieldClass} mt-1`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label className={labelClass}>Modules<input className={`${fieldClass} mt-1`} value={form.modules} onChange={(event) => setForm({ ...form, modules: event.target.value })} /></label>
              <label className={labelClass}>Dashboards<input className={`${fieldClass} mt-1`} value={form.dashboards} onChange={(event) => setForm({ ...form, dashboards: event.target.value })} /></label>
              <label className={labelClass}>Hidden<input className={`${fieldClass} mt-1`} value={form.hidden} onChange={(event) => setForm({ ...form, hidden: event.target.value })} /></label>
              <label className={labelClass}>Access<input className={`${fieldClass} mt-1`} value={form.accessLabel} onChange={(event) => setForm({ ...form, accessLabel: event.target.value })} /></label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setEditing(null); setCreating(false); }} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
              <button type="button" onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">{editing ? "Save role" : "Create role"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
