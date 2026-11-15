"use client";

import * as React from "react";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type NotificationPreference } from "@/lib/settings-api";
import { SettingsPanel } from "./settings-frame";

export function NotificationsPage() {
  useSetHeaderBreadcrumb("Settings / Notifications");
  const [items, setItems] = React.useState<NotificationPreference[]>([]);

  React.useEffect(() => {
    void settingsApi.notificationPreferences().then((res) => setItems(res.data.items)).catch(toastApiError);
  }, []);

  async function toggle(row: NotificationPreference, key: "inApp" | "email" | "sms") {
    const next = { ...row, [key]: !row[key] };
    setItems((current) => current.map((item) => item.code === row.code ? next : item));
    try {
      const res = await settingsApi.saveNotificationPreference(row.code, { inApp: next.inApp, email: next.email, sms: next.sms });
      setItems((current) => current.map((item) => item.code === row.code ? res.data : item));
    } catch (error) {
      setItems((current) => current.map((item) => item.code === row.code ? row : item));
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Settings</h1>
      <SettingsPanel className="p-4">
        <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">Notify me about</p>
        <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">Choose which events generate an alert and where it&apos;s delivered.</p>
        <div className="mt-4 grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-white/10 pb-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Event</span><span className="text-center">In-app</span><span className="text-center">Email</span><span className="text-center">SMS</span>
        </div>
        {items.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 border-b border-white/5 py-3">
            <div>
              <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.event}</p>
              {row.detail ? <p className="font-sans text-[10px] uppercase text-[#959597]">{row.detail}</p> : null}
            </div>
            <Channel on={row.inApp} label={`${row.event} in-app`} onClick={() => void toggle(row, "inApp")} />
            <Channel on={row.email} label={`${row.event} email`} onClick={() => void toggle(row, "email")} />
            <Channel on={row.sms} label={`${row.event} sms`} onClick={() => void toggle(row, "sms")} />
          </div>
        ))}
      </SettingsPanel>
    </div>
  );
}

function Channel({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} className={`mx-auto h-6 w-11 rounded-full ${on ? "bg-[#3DDC84]" : "bg-[#3A3A3C]"}`}>
      <span className={`block h-5 w-5 rounded-full bg-white ${on ? "ml-5" : "ml-0.5"}`} />
    </button>
  );
}
