"use client";

import * as React from "react";
import { DashboardDataTable, type DashboardDataTableColumn } from "@dark-horse-safety/ui";
import { settingsApi, type NotificationRecipient } from "@/lib/settings-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { fieldClass, SettingsFrame, SettingsPanel } from "./settings-frame";

export function RecipientsPage() {
  const [items, setItems] = React.useState<NotificationRecipient[]>([]);
  const [editing, setEditing] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await settingsApi.recipients();
    setItems(res.data.items);
  }, []);

  React.useEffect(() => {
    void load().catch(toastApiError);
  }, [load]);

  function update(id: string, key: "primary" | "ccEscalate" | "channel" | "trigger", value: string) {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  async function save() {
    try {
      const res = await settingsApi.saveRecipients(items.map(({ id, primary, ccEscalate, channel, trigger }) => ({ id, primary, ccEscalate, channel, trigger })));
      setItems(res.data.items);
      setEditing(false);
      toastSuccess("Recipients saved");
    } catch (error) {
      toastApiError(error);
    }
  }

  const cell = (row: NotificationRecipient, key: "primary" | "ccEscalate" | "channel" | "trigger") =>
    editing ? <input className={fieldClass} value={row[key]} onChange={(event) => update(row.id, key, event.target.value)} /> : row[key];

  const columns: DashboardDataTableColumn<NotificationRecipient>[] = [
    { id: "event", header: "Event", cell: (row) => row.event },
    { id: "primary", header: "Primary", cell: (row) => cell(row, "primary") },
    { id: "cc", header: "CC / escalate", cell: (row) => cell(row, "ccEscalate") },
    { id: "channel", header: "Channel", cell: (row) => cell(row, "channel") },
    { id: "trigger", header: "Trigger", cell: (row) => cell(row, "trigger") },
  ];

  return (
    <SettingsFrame
      eyebrow="Settings / Notification Recipients"
      title="Notification Recipients"
      description="Route operational alerts to named roles and customer contacts without duplicating notifications."
      breadcrumb="Settings / Notification Recipients"
    >
      <SettingsPanel className="p-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Scope · Global defaults</p>
        <p className="mt-2 font-sans text-[13px] text-[#959597]">Customer-specific recipients override these defaults and are shown in the customer record.</p>
      </SettingsPanel>
      <SettingsPanel className="p-4">
        <DashboardDataTable columns={columns} rows={items} getRowId={(row) => row.id} embedded emptyMessage="No recipient routes." />
      </SettingsPanel>
      <SettingsPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Delivery rule</p>
          <p className="mt-2 max-w-2xl font-sans text-[13px] text-[#959597]">A recipient can receive one alert per event even when they match multiple roles. Failed delivery stays visible in the notification log.</p>
        </div>
        {editing ? (
          <button type="button" onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save recipients</button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Edit recipients</button>
        )}
      </SettingsPanel>
    </SettingsFrame>
  );
}
