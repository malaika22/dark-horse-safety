"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  settingsApi,
  type DeviceHistory,
  type FieldDevice,
  type MobileSyncPage,
} from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "UP_TO_DATE", label: "Up to date" },
  { value: "SYNCING", label: "Syncing" },
  { value: "QUEUED", label: "Queued" },
  { value: "ITEM_FAILED", label: "Item failed" },
  { value: "OFFLINE", label: "Offline" },
];

const SORTS = [
  { value: "ATTENTION", label: "Status (needs attention first)" },
  { value: "LAST_SYNC", label: "Last sync" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "DEVICE_ID", label: "Device ID" },
];

const STATUS_TONE: Record<string, string> = {
  OFFLINE: "bg-[#3A3A3C] text-[#FDFDFF]",
  ITEM_FAILED: "bg-[#6B2430] text-[#FFB4B4]",
  SYNCING: "bg-[#1E3A5F] text-[#9CC7FF]",
  UP_TO_DATE: "bg-[#14532D] text-[#86EFAC]",
  QUEUED: "bg-[#3F3514] text-[#F5C451]",
  FAILED: "bg-[#6B2430] text-[#FFB4B4]",
  SYNCED: "bg-[#14532D] text-[#86EFAC]",
  UPDATED: "bg-[#3F3514] text-[#F5C451]",
};

const emptyFilters = { status: "ALL", crew: "ALL", version: "ALL" };

export function MobileSyncPage() {
  useSetHeaderBreadcrumb("Settings / Integrations / Mobile Device Sync");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState(emptyFilters);
  const [draft, setDraft] = React.useState(emptyFilters);
  const [sort, setSort] = React.useState("ATTENTION");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<MobileSyncPage | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [menuId, setMenuId] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState(true);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, FieldDevice>>({});
  const [contact, setContact] = React.useState<FieldDevice | null>(null);
  const [resetting, setResetting] = React.useState<FieldDevice | null>(null);
  const [reason, setReason] = React.useState("");
  const [forcing, setForcing] = React.useState<FieldDevice | null>(null);
  const [history, setHistory] = React.useState<DeviceHistory | null>(null);

  const load = React.useCallback((nextPage = page) => {
    void settingsApi
      .mobileSync({
        q: query || undefined,
        status: filters.status === "ALL" ? undefined : filters.status,
        crew: filters.crew === "ALL" ? undefined : filters.crew,
        version: filters.version === "ALL" ? undefined : filters.version,
        page: String(nextPage),
        sort,
      })
      .then((res) => {
        setData(res.data);
        const open = new URLSearchParams(window.location.search).get("open");
        setOpenId((current) => open ?? current ?? res.data.items.find((item) => item.queueItems.length > 0)?.id ?? null);
      })
      .catch(toastApiError);
  }, [filters.crew, filters.status, filters.version, page, query, sort]);

  React.useEffect(() => {
    load(page);
  }, [load, page]);

  function refresh(message?: string) {
    if (message) toastSuccess(message);
    setMenuId(null);
    load(page);
  }

  const summary = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const selectedRows = Object.values(selected);
  const filtersOn = filters.status !== "ALL" || filters.crew !== "ALL" || filters.version !== "ALL";
  const allClear = summary ? summary.attention === 0 && summary.failed === 0 && summary.queued === 0 : false;
  const pageIds = data?.items.map((row) => row.id) ?? [];
  const pageSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);

  function toggle(row: FieldDevice) {
    setSelected((current) => {
      const next = { ...current };
      if (next[row.id]) delete next[row.id];
      else next[row.id] = row;
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = { ...current };
      if (pageSelected) pageIds.forEach((id) => delete next[id]);
      else data?.items.forEach((row) => { next[row.id] = row; });
      return next;
    });
  }

  async function exportRows(rows: FieldDevice[]) {
    const header = "Technician,Truck,Status,Failed,Queued,Last sync,App version,Device ID";
    const lines = rows.map((row) =>
      [row.technician, row.truck, row.statusLabel, row.failed, row.queued, row.lastSyncLabel, row.appVersion, row.deviceId].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mobile-device-sync.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportAll() {
    try {
      const res = await settingsApi.mobileSync({
        q: query || undefined,
        status: filters.status === "ALL" ? undefined : filters.status,
        crew: filters.crew === "ALL" ? undefined : filters.crew,
        version: filters.version === "ALL" ? undefined : filters.version,
        page: "1",
        sort,
        pageSize: "100",
      });
      await exportRows(res.data.items);
    } catch (error) {
      toastApiError(error);
    }
  }

  function askForce(row: FieldDevice) {
    setMenuId(null);
    if (row.status === "OFFLINE") {
      setForcing(row);
      return;
    }
    void settingsApi.forceSyncDevice(row.id).then((res) => {
      toastSuccess(`Sync started · ${res.data.technician} · ${res.data.deviceId}. Online devices sync right away.`);
      load(page);
    }).catch(toastApiError);
  }

  async function confirmForce() {
    if (!forcing) return;
    try {
      const res = await settingsApi.forceSyncDevice(forcing.id);
      toastSuccess(
        res.data.deferred
          ? `Force sync queued for ${res.data.technician}. Items upload when the device reconnects.`
          : `Sync started · ${res.data.technician} · ${res.data.deviceId}`,
      );
      setForcing(null);
      load(page);
    } catch (error) {
      toastApiError(error);
    }
  }

  async function confirmReset() {
    if (!resetting || !reason) return;
    try {
      await settingsApi.resetDevice(resetting.id, reason);
      toastSuccess(`${resetting.deviceId} reset · ${reason}`);
      setResetting(null);
      setReason("");
      load(page);
    } catch (error) {
      toastApiError(error);
    }
  }

  async function openHistory(row: FieldDevice) {
    setMenuId(null);
    try {
      const res = await settingsApi.deviceHistory(row.id);
      setHistory(res.data);
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Integrations / Mobile Device Sync</p>
        <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Mobile device sync</h1>
      </div>

      {banner && summary && !allClear ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#6B5420] bg-[#2A2416] px-4 py-3">
          <div>
            <p className="font-sans text-[12px] font-[590] uppercase text-[#F5C451]">Live · {summary.attention} devices need attention</p>
            <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.04em] text-[#C8B48A]">
              Only live data pipeline into the product · server last received data 1m ago
              {summary.offline ? ` · ${summary.offline} device offline > 6h` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void settingsApi.forceSyncAll().then((res) => {
                setData(res.data);
                const held = res.data.deferred.length ? ` ${res.data.deferred.length} offline device${res.data.deferred.length === 1 ? "" : "s"} will sync on reconnect.` : "";
                toastSuccess(`Sync requested.${held}`);
              }).catch(toastApiError)}
              className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]"
            >
              Force sync all →
            </button>
            <button type="button" onClick={() => setBanner(false)} className="px-2 text-[#C8C8CC]" aria-label="Dismiss">×</button>
          </div>
        </div>
      ) : null}

      {banner && summary && allClear ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#14532D] bg-[#102318] px-4 py-3">
          <div>
            <p className="font-sans text-[12px] font-[590] uppercase text-[#86EFAC]">All devices synced · last sync just now</p>
            <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.04em] text-[#86EFAC]/80">
              {summary.upToDate} of {summary.devices} devices up to date · nothing queued
            </p>
          </div>
          <button type="button" onClick={() => setBanner(false)} className="px-2 text-[#86EFAC]" aria-label="Dismiss">×</button>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-5">
          <Stat value={summary.devices} label="Registered field devices" tone="bg-[#1C1C1E]" />
          <Stat value={summary.upToDate} label="Nothing pending" tone="bg-[#14532D]" caption="Up to date" />
          <Stat value={summary.queued} label="Items waiting to upload" tone="bg-[#3F3514]" caption="Queued" />
          <Stat value={summary.failed} label="Items need action" tone="bg-[#4C1D24]" caption="Failed" />
          <Stat value={summary.offline} label={summary.offlineName || "Offline > 6h"} tone="bg-[#4C1D24]" caption="Offline > 6h" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => { setPage(1); setQuery(event.target.value); }}
          placeholder="Search technician, device or truck"
          className={`${fieldClass} max-w-sm`}
        />
        <button
          type="button"
          onClick={() => { setDraft(filters); setFilterOpen(true); }}
          className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]"
        >
          Filter {filtersOn ? "✓" : ""}
        </button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setSortOpen((open) => !open)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">
            Sort: {SORTS.find((item) => item.value === sort)?.label}
          </button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-white/10 bg-[#1C1C1E] py-1">
              {SORTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { setSort(item.value); setSortOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5"
                >
                  {item.label}
                  {sort === item.value ? <span>✓</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => void exportAll()} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">
          Export
        </button>
      </div>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1C1C1E] px-4 py-3">
          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {selectedRows.length} device{selectedRows.length === 1 ? "" : "s"} selected · {selectedRows.map((row) => row.technician).join(", ")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void settingsApi.contactTechnicians(selectedRows.map((row) => row.id)).then((res) => toastSuccess(res.data.message)).catch(toastApiError)}
              className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]"
            >
              Contact all
            </button>
            <button type="button" onClick={() => void exportRows(selectedRows)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">
              Export selected
            </button>
            <button
              type="button"
              onClick={() => void settingsApi.forceSyncAll(selectedRows.map((row) => row.id)).then((res) => {
                setData(res.data);
                setSelected({});
                toastSuccess(res.data.deferred.length ? "Offline devices will sync when they reconnect" : "Sync started for the selected devices");
              }).catch(toastApiError)}
              className="rounded-lg bg-white px-3 py-2 text-[11px] font-[590] uppercase text-black"
            >
              Force sync all
            </button>
          </div>
        </div>
      ) : null}

      <SettingsPanel>
        <div className="grid grid-cols-[28px_1.2fr_110px_56px_56px_1fr_90px_130px_28px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <input type="checkbox" checked={pageSelected} onChange={togglePage} aria-label="Select page" />
          <span>Technician</span>
          <span>Status</span>
          <span>Failed</span>
          <span>Queued</span>
          <span>Last sync</span>
          <span>App version</span>
          <span>Device ID</span>
          <span />
        </div>
        {data?.items.map((row) => (
          <DeviceRow
            key={row.id}
            row={row}
            checked={Boolean(selected[row.id])}
            open={openId === row.id}
            menu={menuId === row.id}
            latest={data.latestVersion}
            onCheck={() => toggle(row)}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            onMenu={() => setMenuId(menuId === row.id ? null : row.id)}
            onViewQueue={() => { setOpenId(row.id); setMenuId(null); }}
            onHistory={() => void openHistory(row)}
            onForce={() => askForce(row)}
            onReset={() => { setMenuId(null); setReason(""); setResetting(row); }}
            onContact={() => { setMenuId(null); setContact(row); }}
          />
        ))}
        <p className="px-4 py-3 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">
          Showing {from}–{to} of {data?.total ?? 0} devices · page {data?.page ?? 1} of {pages} · offline threshold 6h · set in settings › integrations
        </p>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Next</button>
        </div>
      </SettingsPanel>

      {filterOpen ? (
        <Drawer title="Filters" onClose={() => setFilterOpen(false)}>
          <FilterSelect label="Status" hint="Up to date · syncing · queued · item failed · offline." value={draft.status} options={STATUS_OPTIONS} onChange={(status) => setDraft({ ...draft, status })} />
          <FilterSelect label="Crew" value={draft.crew} options={[{ value: "ALL", label: "All" }, ...(data?.crews ?? []).map((crew) => ({ value: crew, label: crew }))]} onChange={(crew) => setDraft({ ...draft, crew })} />
          <FilterSelect label="App version" hint="Latest · outdated." value={draft.version} options={[{ value: "ALL", label: "All" }, { value: "LATEST", label: "Latest" }, { value: "OUTDATED", label: "Outdated" }]} onChange={(version) => setDraft({ ...draft, version })} />
          <div className="mt-auto flex justify-end gap-2 pt-8">
            <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Close</button>
            <button type="button" onClick={() => setDraft(emptyFilters)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Clear all</button>
            <button type="button" onClick={() => { setFilters(draft); setPage(1); setFilterOpen(false); }} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Apply</button>
          </div>
        </Drawer>
      ) : null}

      {history ? (
        <Drawer title={`Device history · ${history.deviceId}`} subtitle={`${history.technician} · ${history.truck} · ${history.platform ?? "IPAD"} · APP ${history.appVersion}`} onClose={() => setHistory(null)}>
          <div className="flex flex-col gap-3">
            {history.events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">{event.whenLabel}</p>
                  <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">{event.title}</p>
                  {event.detail ? <p className="font-sans text-[10px] uppercase text-[#959597]">{event.detail}</p> : null}
                </div>
                <span className={cn("rounded-full px-2 py-1 font-sans text-[10px] uppercase", STATUS_TONE[event.status] ?? STATUS_TONE.QUEUED)}>{event.status}</span>
              </div>
            ))}
            {history.events.length === 0 ? <p className="font-sans text-[11px] uppercase text-[#959597]">No history for this device.</p> : null}
          </div>
        </Drawer>
      ) : null}

      {contact ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 px-4 pt-24" onClick={() => setContact(null)}>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1C1C1E] p-4" onClick={(event) => event.stopPropagation()}>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{contact.technician} · {contact.truck}</p>
            <ContactLine label="Call" value={contact.phone ?? "—"} action="Call" href={contact.phone ? `tel:${contact.phone}` : undefined} />
            <ContactLine
              label="Message"
              value="Send in-app message"
              action="Message"
              onClick={() => void settingsApi.contactTechnician(contact.id).then((res) => { toastSuccess(res.data.message); setContact(null); }).catch(toastApiError)}
            />
            <ContactLine label="Email" value={contact.email ?? "—"} action="Email" href={contact.email ? `mailto:${contact.email}` : undefined} />
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Current status</p>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{contact.statusLabel}{contact.lastSyncDetail ? ` · ${contact.lastSyncDetail}` : ""}</p>
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">Last location</p>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{contact.lastLocation ?? "—"}</p>
          </div>
        </div>
      ) : null}

      {forcing ? (
        <Modal title={`Force sync · ${forcing.technician} · ${forcing.deviceId}`} onClose={() => setForcing(null)}>
          <p className="font-sans text-[11px] uppercase text-[#F5C451]">Device is offline{forcing.lastSyncDetail ? ` · ${forcing.lastSyncDetail}` : ""}</p>
          <p className="mt-3 font-sans text-[12px] uppercase leading-relaxed text-[#FDFDFF]">
            This will push {forcing.queued} queued item{forcing.queued === 1 ? "" : "s"} immediately. Device is currently offline — items will sync when the device reconnects.
          </p>
          <p className="mt-3 font-sans text-[11px] uppercase text-[#959597]">
            {forcing.queueItems.map((item) => item.itemType).join(" · ") || "No queued items"}
            {forcing.failed ? ` · the failed item still needs its error resolved` : ""}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setForcing(null)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
            <button type="button" onClick={() => void confirmForce()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Force sync</button>
          </div>
        </Modal>
      ) : null}

      {resetting ? (
        <Modal title={`Reset device · ${resetting.deviceId}`} onClose={() => setResetting(null)}>
          <p className="font-sans text-[11px] uppercase text-[#959597]">{resetting.technician} · {resetting.truck} · destructive</p>
          <div className="mt-3 rounded-lg border border-[#6B2430] bg-[#3A171C] px-3 py-3 font-sans text-[11px] uppercase leading-relaxed text-[#FFB4B4]">
            This clears the local app cache. Queued items not yet uploaded will be lost.
            <span className="mt-1 block">{resetting.queued} queued items on this device · {resetting.failed} failed item{resetting.failed === 1 ? "" : "s"}</span>
          </div>
          <label className="mt-4 block font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
            Reason (required)
            <select className={`${fieldClass} mt-2`} value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">Choose a reason</option>
              {(data?.resetReasons ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">Logged with your name, the reason and the device ID</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setResetting(null)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
            <button type="button" disabled={!reason} onClick={() => void confirmReset()} className="rounded-lg bg-[#8F2D2D] px-4 py-2 text-[11px] font-[590] uppercase text-white disabled:opacity-40">Reset device</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function DeviceRow({
  row, checked, open, menu, latest, onCheck, onToggle, onMenu, onViewQueue, onHistory, onForce, onReset, onContact,
}: {
  row: FieldDevice;
  checked: boolean;
  open: boolean;
  menu: boolean;
  latest: string;
  onCheck: () => void;
  onToggle: () => void;
  onMenu: () => void;
  onViewQueue: () => void;
  onHistory: () => void;
  onForce: () => void;
  onReset: () => void;
  onContact: () => void;
}) {
  return (
    <div className={cn("border-b border-white/5", row.status === "OFFLINE" && "bg-[#2A1618]")}>
      <div className="grid grid-cols-[28px_1.2fr_110px_56px_56px_1fr_90px_130px_28px] items-center gap-2 px-4 py-3">
        <input type="checkbox" checked={checked} onChange={onCheck} aria-label={`Select ${row.technician}`} />
        <button type="button" onClick={onToggle} className="text-left">
          <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">{row.technician}</p>
          <p className="font-sans text-[10px] uppercase text-[#959597]">{row.truck}</p>
        </button>
        <span className={cn("w-fit rounded-full px-2 py-1 font-sans text-[10px] uppercase", STATUS_TONE[row.status] ?? STATUS_TONE.UP_TO_DATE)}>{row.statusLabel}</span>
        <span className="font-sans text-[12px] text-[#FDFDFF]">{row.failed}</span>
        <span className="font-sans text-[12px] text-[#FDFDFF]">{row.queued}</span>
        <div>
          <p className={cn("font-sans text-[11px] uppercase", row.status === "OFFLINE" ? "text-[#FFB4B4]" : "text-[#FDFDFF]")}>{row.lastSyncLabel}</p>
          {row.lastSyncDetail ? <p className="font-sans text-[10px] uppercase text-[#F5C451]">{row.lastSyncDetail}</p> : null}
        </div>
        <div>
          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">{row.appVersion}</p>
          {row.versionNote && row.appVersion !== latest ? <p className="font-sans text-[9px] uppercase text-[#F5C451]">Update available</p> : null}
        </div>
        <span className="font-sans text-[11px] uppercase text-[#C8C8CC]">{row.deviceId}</span>
        <button type="button" aria-label={`Actions for ${row.technician}`} onClick={onMenu} className="text-[#C8C8CC]">⋮</button>
      </div>
      {menu ? (
        <div className="relative">
          <div className="absolute right-4 top-0 z-10 w-52 rounded-lg border border-white/10 bg-[#2A2A2A] py-1 text-[11px] uppercase">
            <MenuButton label="View queue" onClick={onViewQueue} />
            <MenuButton label="View device history" onClick={onHistory} />
            {row.incidents[0] ? <MenuButton label="View sync error" href={`/settings/mobile-sync/errors/${row.incidents[0].code}`} /> : null}
            <MenuButton label="Force sync" onClick={onForce} />
            <MenuButton label="Contact technician" onClick={onContact} />
            <MenuButton label="Reset device" onClick={onReset} danger />
          </div>
        </div>
      ) : null}
      {open && row.queueItems.length > 0 ? (
        <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-black/20">
          <p className="px-3 py-2 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">
            Device queue · {row.deviceId} · {row.queued} queued · {row.failed} failed · uploads when the device reconnects
          </p>
          <div className="grid grid-cols-[120px_1.4fr_80px_80px_160px] gap-2 px-3 py-1 font-sans text-[10px] uppercase text-[#6E6E73]">
            <span>Item type</span><span>Detail</span><span>Created at</span><span>Size</span><span>Status</span>
          </div>
          {row.queueItems.map((item) => (
            <div key={item.id} className="grid grid-cols-[120px_1.4fr_80px_80px_160px] gap-2 border-t border-white/5 px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
              <span>{item.itemType}</span>
              <span>{item.detail}</span>
              <span>{item.createdLabel}</span>
              <span>{item.sizeLabel}</span>
              {item.errorCode ? (
                <Link href={`/settings/mobile-sync/errors/${item.errorCode}`} className="text-[#FFB4B4] underline">
                  {item.status} · {item.errorCode}
                </Link>
              ) : (
                <span className={item.status === "FAILED" ? "text-[#FFB4B4]" : "text-[#F5C451]"}>{item.status}</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {open && row.queueItems.length === 0 ? <p className="px-4 pb-3 font-sans text-[10px] uppercase text-[#959597]">No items in the device queue.</p> : null}
    </div>
  );
}

function Stat({ value, label, tone, caption }: { value: number; label: string; tone: string; caption?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/10 px-4 py-3", tone)}>
      {caption ? <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-white/70">{caption}</p> : null}
      <p className="font-sans text-[28px] font-[590] text-[#FDFDFF]">{value}</p>
      <p className="font-sans text-[10px] uppercase tracking-[0.06em] text-white/70">{label}</p>
    </div>
  );
}

function MenuButton({ label, onClick, href, danger }: { label: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const className = cn("block w-full px-3 py-2 text-left hover:bg-white/5", danger ? "text-[#FF8A8A]" : "text-[#FDFDFF]");
  if (href) return <Link href={href} className={className}>{label}</Link>;
  return <button type="button" onClick={onClick} className={className}>{label}</button>;
}

function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#141416] p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{title}</p>
            {subtitle ? <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="text-[#C8C8CC]" aria-label="Close">×</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

function FilterSelect({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="mb-4 block font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
      {label}
      <select className={`${fieldClass} mt-2`} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {hint ? <span className="mt-1 block text-[#6E6E73]">{hint}</span> : null}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1C1C1E] p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{title}</p>
          <button type="button" onClick={onClose} className="text-[#C8C8CC]" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactLine({ label, value, action, href, onClick }: { label: string; value: string; action: string; href?: string; onClick?: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div>
        <p className="font-sans text-[10px] uppercase text-[#959597]">{label}</p>
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{value}</p>
      </div>
      {href ? (
        <a href={href} className="rounded-lg bg-white px-3 py-2 text-[11px] font-[590] uppercase text-black">{action}</a>
      ) : (
        <button type="button" onClick={onClick} className="rounded-lg bg-[#2A2A2A] px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">{action}</button>
      )}
    </div>
  );
}
