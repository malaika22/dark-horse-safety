"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type SyncIncident } from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";

export function MobileSyncErrorPage({ code }: { code: string }) {
  useSetHeaderBreadcrumb("Settings / Integrations / Mobile Device Sync / Error");
  const [incident, setIncident] = React.useState<SyncIncident | null>(null);
  const [advanced, setAdvanced] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [contactOpen, setContactOpen] = React.useState(false);

  const load = React.useCallback(() => {
    void settingsApi.syncIncident(code).then((res) => setIncident(res.data)).catch(toastApiError);
  }, [code]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function toggleStep(stepId: string, done: boolean) {
    try {
      const res = await settingsApi.setIncidentStep(code, stepId, done);
      setIncident(res.data);
    } catch (error) {
      toastApiError(error);
    }
  }

  async function retry() {
    try {
      const res = await settingsApi.retryIncident(code);
      setIncident(res.data);
      toastSuccess(res.data.device.status === "OFFLINE" ? "Retry queued until the device reconnects" : "Retry requested");
    } catch (error) {
      toastApiError(error);
    }
  }

  async function discard() {
    if (!reason.trim()) {
      toastError("A reason is required to discard this item");
      return;
    }
    try {
      const res = await settingsApi.discardIncident(code, reason.trim());
      setIncident(res.data);
      setAdvanced(false);
      toastSuccess("Item discarded");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!incident) return null;
  const device = incident.device;
  const waiting = incident.retryMode === "WAITING";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Integrations / Mobile Device Sync / Error</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
            Mobile sync error · {device.technician} · {device.deviceId}
          </h1>
          <p className="mt-2 font-sans text-[11px] uppercase text-[#FFB4B4]">
            <span className="mr-2 rounded-full bg-[#6B2430] px-2 py-1">{incident.discarded ? "DISCARDED" : "FAILED"}</span>
            {incident.occurredLabel} · {incident.statusNote}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setContactOpen(true)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Contact technician</button>
          <button
            type="button"
            onClick={() => void settingsApi.forceSyncDevice(device.id).then((res) => {
              toastSuccess(res.data.deferred ? `Force sync queued for ${res.data.deviceId}` : `Sync started · ${res.data.technician} · ${res.data.deviceId}`);
            }).catch(toastApiError)}
            className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]"
          >
            Retry sync
          </button>
          <button
            type="button"
            disabled={waiting || incident.discarded}
            onClick={() => void retry()}
            className="rounded-lg bg-white px-3 py-2 text-[11px] font-[590] uppercase text-black disabled:bg-[#2A2A2A] disabled:text-[#959597]"
          >
            {waiting ? "Waiting for sign-in" : "Retry this item"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="flex flex-col gap-4">
          <SettingsPanel className="p-5">
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Error details</p>
            <Detail label="Error code" value={`${incident.code} · ${incident.cases.find((item) => item.code === incident.code)?.title ?? ""}`} danger />
            <Detail label="Message" value={incident.message} />
            <Detail label="Technician" value={`${device.technician} · ${device.truck}`} />
            <Detail label="Device" value={incident.deviceLine} />
            <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">Affected items</p>
            {incident.items.map((item) => (
              <div key={item.id} className="mt-2 flex items-center justify-between rounded-lg border border-[#6B2430]/60 bg-[#2A1618] px-3 py-2">
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.itemType} <span className="text-[#C8C8CC]">{item.detail}</span></p>
                <p className="font-sans text-[11px] uppercase text-[#959597]">{item.createdLabel} · {item.sizeLabel}</p>
              </div>
            ))}
          </SettingsPanel>

          <SettingsPanel className="p-5">
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Resolution steps</p>
            <div className="mt-3 flex flex-col gap-2">
              {incident.steps.map((step) => (
                <label key={step.id} className={cn("flex gap-3 rounded-lg border border-white/10 px-3 py-3", step.done && "border-[#14532D]")}>
                  <input type="checkbox" checked={step.done} onChange={(event) => void toggleStep(step.id, event.target.checked)} className="mt-1" />
                  <span className="font-sans text-[12px] uppercase leading-relaxed text-[#FDFDFF]"><span className="mr-2 text-[#959597]">{step.number}</span>{step.text}</span>
                </label>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel className="p-5">
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Error cases · mobile sync</p>
            <div className="mt-3">
              {incident.cases.map((item) => {
                const current = item.code === incident.code;
                return (
                  <Link key={item.code} href={`/settings/mobile-sync/errors/${item.code}`} className={cn("grid grid-cols-[90px_1fr_1.2fr_90px] gap-2 border-t border-white/5 px-2 py-3", current && "bg-white/[0.04]")}>
                    <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.code}</span>
                    <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.title}</span>
                    <span className="font-sans text-[11px] uppercase text-[#959597]">{item.guidance}</span>
                    <span className="text-right font-sans text-[10px] uppercase text-[#7DD3FC]">{current ? "This error" : ""}</span>
                  </Link>
                );
              })}
            </div>
          </SettingsPanel>
        </div>

        <div className="flex flex-col gap-4">
          <SettingsPanel className="p-5">
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Attempt log</p>
            <div className="mt-3 flex flex-col gap-3">
              {incident.attempts.map((attempt) => (
                <div key={attempt.id}>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">{attempt.timeLabel}</p>
                  <p className={cn("font-sans text-[12px] uppercase", attempt.tone === "danger" ? "text-[#FFB4B4]" : "text-[#FDFDFF]")}>{attempt.message}</p>
                </div>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel className="p-5">
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Related records</p>
            <Detail label="Work order" value={`${incident.workOrder}${incident.workOrderNote ? ` · ${incident.workOrderNote}` : ""}`} href="/operations/work-orders" />
            <Detail label="Queued with it" value={incident.queuedWith} />
            <Detail label="Device" value={`${device.deviceId} · view queue`} href={`/settings/mobile-sync?open=${device.id}`} />
            <Detail label="Technician" value={`${device.technician} · contact`} onClick={() => setContactOpen(true)} />
          </SettingsPanel>

          <SettingsPanel className="p-5">
            <button type="button" onClick={() => setAdvanced((open) => !open)} className="font-sans text-[12px] uppercase text-[#FDFDFF]">▸ Advanced · admin only</button>
            <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">Discard item · reason required · collapsed by default</p>
            {advanced ? (
              <div className="mt-3">
                <textarea className={`${fieldClass} h-20 py-2 normal-case`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
                <button type="button" onClick={() => void discard()} className="mt-3 rounded-lg bg-[#8F2D2D] px-3 py-2 text-[11px] uppercase text-white">Discard item</button>
                {incident.discardReason ? <p className="mt-2 font-sans text-[10px] uppercase text-[#FFB4B4]">Last reason · {incident.discardReason}</p> : null}
              </div>
            ) : null}
          </SettingsPanel>
        </div>
      </div>

      {contactOpen ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 px-4 pt-24" onClick={() => setContactOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1C1C1E] p-4" onClick={(event) => event.stopPropagation()}>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{device.technician} · {device.truck}</p>
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Call</p>
            <a href={device.phone ? `tel:${device.phone}` : undefined} className="font-sans text-[12px] uppercase text-[#FDFDFF]">{device.phone ?? "—"}</a>
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Email</p>
            <a href={device.email ? `mailto:${device.email}` : undefined} className="font-sans text-[12px] uppercase text-[#FDFDFF]">{device.email ?? "—"}</a>
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Last location</p>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{device.lastLocation ?? "—"}</p>
            <button
              type="button"
              onClick={() => void settingsApi.contactTechnician(device.id).then((res) => { toastSuccess(res.data.message); setContactOpen(false); }).catch(toastApiError)}
              className="mt-4 rounded-lg bg-white px-3 py-2 text-[11px] font-[590] uppercase text-black"
            >
              Message
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value, danger, href, onClick }: { label: string; value: string; danger?: boolean; href?: string; onClick?: () => void }) {
  const text = href ? (
    <Link href={href} className="text-[#7DD3FC]">{value} →</Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className="text-[#7DD3FC]">{value} →</button>
  ) : (
    <span className={danger ? "text-[#FFB4B4]" : "text-[#FDFDFF]"}>{value}</span>
  );
  return (
    <div className="mt-3 grid grid-cols-[120px_1fr] gap-3">
      <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{label}</p>
      <p className="font-sans text-[12px] uppercase">{text}</p>
    </div>
  );
}
