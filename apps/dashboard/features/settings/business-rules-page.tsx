"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { settingsApi, type BusinessRule } from "@/lib/settings-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { SettingsFrame, SettingsPanel } from "./settings-frame";

export function BusinessRulesPage() {
  const [q, setQ] = React.useState("");
  const [domain, setDomain] = React.useState("ALL");
  const [status, setStatus] = React.useState("ACTIVE");
  const [domains, setDomains] = React.useState<string[]>(["ALL"]);
  const [items, setItems] = React.useState<BusinessRule[]>([]);
  const [summary, setSummary] = React.useState({ activeRules: 0, hardGates: 0, customerOverrides: 0, pendingReview: 0 });
  const [editing, setEditing] = React.useState<BusinessRule | null>(null);
  const [draft, setDraft] = React.useState({ owner: "", enforcement: "", status: "ACTIVE" });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await settingsApi.businessRules({
        q: q || undefined,
        domain: domain === "ALL" ? undefined : domain,
        status: status === "ALL" ? undefined : status,
      });
      setItems(res.data.items);
      setSummary(res.data.summary);
      setDomains(res.data.domains);
    } catch (error) {
      toastApiError(error);
    }
  }, [q, domain, status]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const columns: DashboardDataTableColumn<BusinessRule>[] = [
    { id: "area", header: "Rule area", cell: (row) => row.area },
    { id: "source", header: "Source", cell: (row) => row.source },
    { id: "applies", header: "Applies to", cell: (row) => row.appliesTo },
    { id: "enforcement", header: "Enforcement", cell: (row) => row.enforcement },
    { id: "owner", header: "Owner", cell: (row) => row.owner },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span className={row.status === "REVIEW" ? "text-[#C4A35A]" : "text-[#22C55E]"}>{row.statusLabel}</span>
      ),
    },
  ];

  return (
    <SettingsFrame
      eyebrow="Settings / Business Rules"
      title="Business Rules"
      description="Global policy and customer-specific rules, with explicit enforcement and override ownership."
      breadcrumb="Settings / Business Rules"
    >
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell title="Active rules" value={String(summary.activeRules)} />
          <DashboardStatCell title="Hard gates" value={String(summary.hardGates)} />
          <DashboardStatCell title="Customer overrides" value={String(summary.customerOverrides)} />
          <DashboardStatCell title="Pending review" value={String(summary.pendingReview)} />
        </DashboardStatRow>
      </DashboardStatGrid>
      <div className="flex flex-col gap-3 sm:flex-row">
        <DashboardSearchInput
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search rules, customers or workflows"
          containerClassName="min-w-0 flex-1"
        />
        <select value={domain} onChange={(event) => setDomain(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[11px] uppercase text-[#FDFDFF]">
          {domains.map((item) => (
            <option key={item} value={item}>{item === "ALL" ? "All domains" : item}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[11px] uppercase text-[#FDFDFF]">
          <option value="ACTIVE">Active</option>
          <option value="REVIEW">Review</option>
          <option value="ALL">All statuses</option>
        </select>
      </div>
      <SettingsPanel className="p-4">
        <p className="mb-3 font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Rule registry</p>
        <DashboardDataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.id}
          embedded
          emptyMessage="No rules match these filters."
          onRowClick={(row) => {
            setEditing(row);
            setDraft({ owner: row.owner, enforcement: row.enforcement, status: row.status });
          }}
        />
      </SettingsPanel>
      {editing ? (
        <SettingsPanel className="p-5">
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Edit {editing.code}</p>
          <p className="mt-1 font-sans text-[13px] text-[#959597]">{editing.area}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-sans text-[11px] uppercase text-[#959597]">Owner</span>
              <input value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))} className="h-10 w-full rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[13px] text-[#FDFDFF]" />
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-[11px] uppercase text-[#959597]">Enforcement</span>
              <input value={draft.enforcement} onChange={(event) => setDraft((current) => ({ ...current, enforcement: event.target.value }))} className="h-10 w-full rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[13px] text-[#FDFDFF]" />
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-[11px] uppercase text-[#959597]">Status</span>
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-lg border border-white/10 bg-[#2A2A2A] px-3 text-[11px] uppercase text-[#FDFDFF]">
                <option value="ACTIVE">Active</option>
                <option value="REVIEW">Review</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                void settingsApi.updateBusinessRule(editing.id, {
                  owner: draft.owner,
                  enforcement: draft.enforcement,
                  status: draft.status,
                  statusLabel: draft.status === "REVIEW" ? "REVIEW" : "ACTIVE",
                }).then(() => {
                  toastSuccess("Business rule saved");
                  setEditing(null);
                  return load();
                }).catch(toastApiError).finally(() => setSaving(false));
              }}
              className="rounded-lg bg-white px-4 py-2 font-sans text-[11px] font-[590] uppercase text-black"
            >
              Save rule
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
          </div>
        </SettingsPanel>
      ) : null}
      <SettingsPanel className="p-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.12em] text-[#FDFDFF]">Rule precedence</p>
        <p className="mt-2 font-sans text-[13px] text-[#959597]">
          Customer-specific rule → MSA requirement → global default. Hard gates cannot be bypassed without an approved, logged override.
        </p>
        <Link href="/settings/override-log" className="mt-3 inline-block font-sans text-[12px] uppercase tracking-[0.06em] text-[#7EB6FF]">
          View business rule override log →
        </Link>
      </SettingsPanel>
    </SettingsFrame>
  );
}
