"use client";

import * as React from "react";
import { DashboardDataTable, type DashboardDataTableColumn } from "@dark-horse-safety/ui";
import { settingsApi, type RetentionClass } from "@/lib/settings-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { fieldClass, SettingsFrame, SettingsPanel } from "./settings-frame";

export function RetentionPage() {
  const [note, setNote] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");
  const [items, setItems] = React.useState<RetentionClass[]>([]);
  const [editing, setEditing] = React.useState<RetentionClass | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await settingsApi.retention();
    setNote(res.data.policy.note);
    setStatus(res.data.policy.status);
    setItems(res.data.items);
  }, []);

  React.useEffect(() => {
    void load().catch(toastApiError);
  }, [load]);

  async function saveClass() {
    if (!editing || editing.locked) return;
    try {
      await settingsApi.updateRetention(editing.id, {
        proposedPeriod: editing.proposedPeriod,
        afterExpiry: editing.afterExpiry,
        legalHold: editing.legalHold,
        owner: editing.owner,
      });
      toastSuccess("Retention class updated");
      setEditing(null);
      await load();
    } catch (error) {
      toastApiError(error);
    }
  }

  async function previewImpact() {
    try {
      const res = await settingsApi.previewRetention();
      setPreview(res.data.message);
    } catch (error) {
      toastApiError(error);
    }
  }

  async function publish() {
    try {
      await settingsApi.publishRetention();
      toastSuccess("Retention policy published");
      await load();
    } catch (error) {
      toastApiError(error);
    }
  }

  const columns: DashboardDataTableColumn<RetentionClass>[] = [
    { id: "class", header: "Record class", cell: (row) => row.recordClass },
    {
      id: "period",
      header: "Proposed period",
      cell: (row) => <span className={row.periodTone === "floor" ? "text-[#C4A35A]" : undefined}>{row.proposedPeriod}</span>,
    },
    { id: "after", header: "After expiry", cell: (row) => row.afterExpiry },
    { id: "hold", header: "Legal hold", cell: (row) => <span className={row.locked ? "text-[#22C55E]" : undefined}>{row.legalHold}</span> },
    { id: "owner", header: "Owner", cell: (row) => row.owner },
    {
      id: "edit",
      header: "Edit",
      cell: (row) => row.locked ? <span className="text-[#C4A35A]">Locked</span> : (
        <button type="button" className="uppercase text-[#FDFDFF]" onClick={() => setEditing(row)}>Edit</button>
      ),
    },
  ];

  return (
    <SettingsFrame
      eyebrow="Settings / Data Retention Policy"
      title="Data Retention Policy"
      description="Configure retention by record class; legal holds suspend deletion."
      breadcrumb="Settings / Data Retention"
    >
      <SettingsPanel className="p-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Draft policy · All customers · {status}</p>
        <p className="mt-2 font-sans text-[13px] text-[#959597]">{note}</p>
      </SettingsPanel>
      <SettingsPanel className="p-4">
        <DashboardDataTable columns={columns} rows={items} getRowId={(row) => row.id} embedded emptyMessage="No retention classes." />
      </SettingsPanel>
      {editing ? (
        <SettingsPanel className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="font-sans text-[11px] uppercase text-[#959597]">Proposed period
            <input className={fieldClass} value={editing.proposedPeriod} onChange={(event) => setEditing({ ...editing, proposedPeriod: event.target.value })} />
          </label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">After expiry
            <input className={fieldClass} value={editing.afterExpiry} onChange={(event) => setEditing({ ...editing, afterExpiry: event.target.value })} />
          </label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Legal hold
            <input className={fieldClass} value={editing.legalHold} onChange={(event) => setEditing({ ...editing, legalHold: event.target.value })} />
          </label>
          <label className="font-sans text-[11px] uppercase text-[#959597]">Owner
            <input className={fieldClass} value={editing.owner} onChange={(event) => setEditing({ ...editing, owner: event.target.value })} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" onClick={() => void saveClass()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save class</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
          </div>
        </SettingsPanel>
      ) : null}
      <SettingsPanel className="p-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Deletion controls</p>
        <p className="mt-2 max-w-3xl font-sans text-[13px] text-[#959597]">
          A policy change affects future expiry calculations. Records under legal hold remain locked until the hold is released. Changes require admin approval and create an audit event.
        </p>
        {preview ? <p className="mt-3 font-sans text-[13px] text-[#C4A35A]">{preview}</p> : null}
        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => void previewImpact()} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Preview impact</button>
          <button type="button" onClick={() => void publish()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save policy</button>
        </div>
      </SettingsPanel>
    </SettingsFrame>
  );
}
