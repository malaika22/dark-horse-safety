"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type AccessAuditEvent, type AccessAuditPage } from "@/lib/settings-api";
import { AccessSectionLinks, fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const emptyFilters = { type: "ALL", result: "ALL", severity: "ALL", actor: "ALL", range: "ALL" };

export function AccessAuditPage() {
  useSetHeaderBreadcrumb("Settings / Access Control / Audit Log");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState(emptyFilters);
  const [draft, setDraft] = React.useState(emptyFilters);
  const [chip, setChip] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<AccessAuditPage | null>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [sort, setSort] = React.useState("RECENT");
  const [selected, setSelected] = React.useState<AccessAuditPage["items"][number] | null>(null);

  const load = React.useCallback((nextPage = page) => {
    void settingsApi.accessAudit({
      q: query || undefined,
      type: filters.type,
      result: filters.result,
      severity: filters.severity,
      actor: filters.actor,
      range: filters.range,
      chip: chip === "ALL" ? undefined : chip,
      sort,
      page: String(nextPage),
    }).then((res) => setData(res.data)).catch(toastApiError);
  }, [chip, filters, page, query, sort]);

  React.useEffect(() => { load(page); }, [load, page]);

  const summary = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtersOn = Object.values(filters).some((value) => value !== "ALL");

  async function exportCsv() {
    try {
      const res = await settingsApi.accessAudit({
        q: query || undefined,
        type: filters.type,
        result: filters.result,
        severity: filters.severity,
        actor: filters.actor,
        range: filters.range,
        chip: chip === "ALL" ? undefined : chip,
        sort,
        page: "1",
        pageSize: "100",
      });
      const header = "Timestamp,Actor,Action,Target,Detail,IP,Method,Type,Result,Severity";
      const lines = res.data.items.map((row) => [row.timeLabel, row.actor, row.action, row.target, row.detail, row.ip, row.method, row.type, row.result, row.severity].join(","));
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "access-audit.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Access Control / Audit Log</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Audit log</h1>
          <AccessSectionLinks current="audit" />
        </div>
        <button type="button" onClick={() => void exportCsv()} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Export</button>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-5">
          <Stat value={summary.today} label="Changes & alerts today" caption="Today" />
          <Stat value={summary.week} label="Changes & alerts" caption="This week" />
          <Stat value={summary.permChanges} label="This week" caption="Perm changes" />
          <Stat value={summary.logins} label="Sign-ins today" caption="Logins" />
          <Stat value={summary.failed} label="This week" caption="Failed" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search actor, action or target" className={`${fieldClass} max-w-sm`} />
        <button type="button" onClick={() => { setDraft(filters); setFilterOpen(true); }} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Filter {filtersOn ? "✓" : ""}</button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setSortOpen((open) => !open)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Sort: {sort === "RECENT" ? "Recent" : sort === "NEWEST" ? "Newest" : sort === "ACTOR" ? "Actor" : "Action"}</button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-white/10 bg-[#1C1C1E] py-1">
              {[
                ["RECENT", "Recent"],
                ["NEWEST", "Newest"],
                ["ACTOR", "Actor"],
                ["ACTION", "Action"],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => { setSort(id); setPage(1); setSortOpen(false); }} className="flex w-full justify-between px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF]">
                  {label} {sort === id ? <span>✓</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => void exportCsv()} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Export</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "PERMISSION", label: `Permission changes · ${summary?.permission ?? 0}` },
          { id: "USER", label: `User changes · ${summary?.user ?? 0}` },
          { id: "LOGIN", label: `Logins · ${summary?.login ?? 0}` },
          { id: "FAILED", label: `Failed · ${summary?.failedAll ?? 0}` },
          { id: "SYSTEM", label: `System · ${summary?.system ?? 0}` },
          { id: "ALL", label: "All" },
        ].map((item) => (
          <button key={item.id} type="button" onClick={() => { setPage(1); setChip(item.id); }} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", chip === item.id ? "border-white text-white" : "border-white/15 text-[#959597]")}>
            {item.label}
          </button>
        ))}
      </div>

      <SettingsPanel className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[110px_120px_140px_130px_1.2fr_110px_80px_100px_90px_80px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <span>Timestamp</span><span>Actor</span><span>Action</span><span>Target</span><span>Detail</span><span>IP</span><span>Method</span><span>Type</span><span>Result</span><span>Severity</span>
        </div>
        {data?.items.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row)} className="grid min-w-[980px] grid-cols-[110px_120px_140px_130px_1.2fr_110px_80px_100px_90px_80px] items-center gap-2 border-b border-white/5 px-4 py-3 text-left font-sans text-[11px] uppercase text-[#C8C8CC] hover:bg-white/5">
            <span className="text-[#FDFDFF]">{row.timeLabel}</span>
            <span>{row.actor}</span>
            <span>{row.action}</span>
            <span>{row.target}</span>
            <span>{row.detail}</span>
            <span>{row.ip}</span>
            <span>{row.method}</span>
            <Tone value={row.type} />
            <Tone value={row.result} />
            <Tone value={row.severity} />
          </button>
        ))}
        <div className="flex justify-end gap-2 px-4 py-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Next</button>
        </div>
      </SettingsPanel>

      {filterOpen ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={() => setFilterOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#141416] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">Filters</p>
              <button type="button" onClick={() => setFilterOpen(false)} className="text-[#C8C8CC]">×</button>
            </div>
            <Select label="Type" hint="Permission · user · auth · system." value={draft.type} options={["ALL", "PERMISSION", "USER", "AUTH", "SYSTEM"]} onChange={(type) => setDraft({ ...draft, type })} />
            <Select label="Result" hint="Success · failed." value={draft.result} options={["ALL", "SUCCESS", "FAILED"]} onChange={(result) => setDraft({ ...draft, result })} />
            <Select label="Severity" hint="Info · warn." value={draft.severity} options={["ALL", "INFO", "WARN"]} onChange={(severity) => setDraft({ ...draft, severity })} />
            <Select label="Actor" value={draft.actor} options={["ALL", ...(data?.actors ?? [])]} onChange={(actor) => setDraft({ ...draft, actor })} />
            <Select label="Date range" value={draft.range} options={["ALL", "TODAY", "WEEK"]} onChange={(range) => setDraft({ ...draft, range })} />
            <div className="mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Close</button>
              <button type="button" onClick={() => setDraft(emptyFilters)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Clear all</button>
              <button type="button" onClick={() => { setFilters(draft); setPage(1); setFilterOpen(false); }} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Apply</button>
            </div>
          </aside>
        </div>
      ) : null}

      {selected ? <AuditDrawer event={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function AuditDrawer({ event, onClose }: { event: AccessAuditEvent; onClose: () => void }) {
  const drawer = event.drawer;
  const rows = [
    ["Actor", `${event.actor}${drawer.actorRole ? ` · ${drawer.actorRole}` : ""}`],
    ["Action", event.action],
    ["Target", `${event.target}${drawer.targetMeta ? ` · ${drawer.targetMeta}` : ""}`],
    ["Before", drawer.before],
    ["After", drawer.after],
    ["IP address", `${drawer.ip}${drawer.location ? ` · ${drawer.location}` : ""}`],
    ["Session", drawer.session],
    ["Timestamp", drawer.timestampFull],
  ];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#141416] p-5" onClick={(eventClick) => eventClick.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{event.action} · {event.target}</p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">{drawer.kind} · Event {drawer.eventCode}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#C8C8CC]">×</button>
        </div>
        <div className="mt-4">
          {rows.filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="grid grid-cols-[110px_1fr] gap-3 border-b border-white/10 py-3 font-sans text-[11px] uppercase">
              <span className="text-[#959597]">{label}</span>
              <span className="text-right text-[#F5C451]">{value}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Tone({ value }: { value: string }) {
  const tone = value === "SUCCESS" || value === "INFO"
    ? "bg-[#14532D] text-[#86EFAC]"
    : value === "FAILED"
      ? "bg-[#6B2430] text-[#FFB4B4]"
      : value === "WARN" || value === "USER"
        ? "bg-[#3F3514] text-[#F5C451]"
        : value === "PERMISSION"
          ? "bg-[#312E81] text-[#C4B5FD]"
          : "bg-[#3A3A3C] text-[#FDFDFF]";
  return <span className={cn("w-fit rounded-full px-2 py-1 font-sans text-[10px] uppercase", tone)}>{value}</span>;
}

function Stat({ value, label, caption }: { value: number; label: string; caption: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1C1C1E] px-4 py-3">
      <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{caption}</p>
      <p className="font-sans text-[28px] font-[590] text-[#FDFDFF]">{value}</p>
      <p className="font-sans text-[10px] uppercase text-[#959597]">{label}</p>
    </div>
  );
}

function Select({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={`${labelClass} mb-4`}>
      {label}
      <select className={`${fieldClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {hint ? <span className="mt-1 block font-sans text-[10px] uppercase text-[#6E6E73]">{hint}</span> : null}
    </label>
  );
}
