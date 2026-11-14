"use client";

import * as React from "react";
import { DashboardDataTable, DashboardSearchInput, type DashboardDataTableColumn } from "@dark-horse-safety/ui";
import { settingsApi, type RuleOverride } from "@/lib/settings-api";
import { toastApiError } from "@/lib/toast";
import { SettingsFrame, SettingsPanel } from "./settings-frame";

function statusClass(status: string) {
  if (status === "DENIED") return "text-[#FF4D4D]";
  if (status === "EXPIRES") return "text-[#C4A35A]";
  return "text-[#22C55E]";
}

export function OverrideLogPage() {
  const [q, setQ] = React.useState("");
  const [domain, setDomain] = React.useState("ALL");
  const [days, setDays] = React.useState("30");
  const [domains, setDomains] = React.useState<string[]>(["ALL"]);
  const [items, setItems] = React.useState<RuleOverride[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await settingsApi.overrides({
        q: q || undefined,
        domain: domain === "ALL" ? undefined : domain,
        days,
      });
      setItems(res.data.items);
      setDomains(res.data.domains);
      setSelectedId((current) => current && res.data.items.some((row) => row.id === current) ? current : res.data.items[0]?.id ?? null);
    } catch (error) {
      toastApiError(error);
    }
  }, [q, domain, days]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = items.find((row) => row.id === selectedId) ?? null;
  const columns: DashboardDataTableColumn<RuleOverride>[] = [
    { id: "when", header: "When", cell: (row) => row.whenLabel },
    { id: "rule", header: "Rule / domain", cell: (row) => row.ruleDomain },
    { id: "record", header: "Record", cell: (row) => row.record },
    { id: "change", header: "Change", cell: (row) => row.change },
    { id: "by", header: "Approved by", cell: (row) => row.approvedBy },
    { id: "status", header: "Status", cell: (row) => <span className={statusClass(row.status)}>{row.statusLabel}</span> },
  ];

  return (
    <SettingsFrame
      eyebrow="Settings / Override Log"
      title="Override Log"
      description="Immutable audit trail for approved exceptions to blocking business rules."
      breadcrumb="Settings / Override Log"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <DashboardSearchInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search record, rule or approver" containerClassName="min-w-0 flex-1" />
        <select value={domain} onChange={(event) => setDomain(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[11px] uppercase text-[#FDFDFF]">
          {domains.map((item) => <option key={item} value={item}>{item === "ALL" ? "All domains" : item}</option>)}
        </select>
        <select value={days} onChange={(event) => setDays(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[11px] uppercase text-[#FDFDFF]">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="3650">All time</option>
        </select>
      </div>
      <SettingsPanel className="p-4">
        <DashboardDataTable columns={columns} rows={items} getRowId={(row) => row.id} embedded onRowClick={(row) => setSelectedId(row.id)} emptyMessage="No overrides in this window." />
      </SettingsPanel>
      {selected ? (
        <SettingsPanel className="p-5">
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Selected event · {selected.record}</p>
          <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">Reason</p>
          <p className="mt-1 font-sans text-[14px] text-[#FDFDFF]">{selected.reason}</p>
          <p className="mt-4 font-sans text-[12px] uppercase tracking-[0.04em] text-[#959597]">
            Requested by {selected.requestedBy} · Approved by {selected.approvedBy} · Effective {selected.effectiveLabel}
          </p>
          <p className="mt-3 font-sans text-[13px] text-[#C4A35A]">{selected.note}</p>
        </SettingsPanel>
      ) : null}
    </SettingsFrame>
  );
}
