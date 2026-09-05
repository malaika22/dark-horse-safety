"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardRowActionMenu,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmContact } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { CONTACT_DETAIL_TABS } from "./crm-constants";

type ContactDetailTab = (typeof CONTACT_DETAIL_TABS)[number]["id"];

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function GlassBtn({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "inline-flex h-8 items-center rounded-full border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5";
  if (href) return <Link href={href} className={className}>{children}</Link>;
  return <button type="button" onClick={onClick} className={className}>{children}</button>;
}

function Panel({ title, children, className, footer }: { title: string; children: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl bg-panel ${className ?? ""}`}>
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">{title}</p>
      </div>
      <div className="flex-1 px-4 pb-4 sm:px-5">{children}</div>
      {footer ? <div className="flex justify-end px-4 pb-4 sm:px-5">{footer}</div> : null}
    </div>
  );
}

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<ContactDetailTab>("overview");
  const [contact, setContact] = React.useState<CrmContact | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getContact(contactId);
        if (!cancelled) setContact(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setContact(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (loading) {
    return <div className="bg-shell p-6 font-sans text-sm text-[#959597]">Loading contact…</div>;
  }
  if (!contact) {
    return <div className="bg-shell p-6 font-sans text-sm text-[#959597]">Contact not found</div>;
  }

  const related = [
    { label: "Customer", value: contact.primaryCustomer?.name ?? "—" },
    { label: "Role", value: contact.roleTitle ?? "—" },
    { label: "Status", value: contact.status },
    { label: "Code", value: contact.code },
  ];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GlassBtn href="/crm/contacts">Back</GlassBtn>
        <div className="flex flex-wrap items-center gap-2">
          <GlassBtn href={`/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`}>Log Activity</GlassBtn>
          <DashboardToolbarButton variant="primary" leftIcon={<ClipboardIcon className="shrink-0" />} onClick={() => router.push(`/crm/quotes/new?customerId=${encodeURIComponent(contact.primaryCustomerId ?? "")}`)}>
            Create Quote
          </DashboardToolbarButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-panel px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF] sm:text-[17px]">
            {contact.fullName}
          </h2>
          {contact.isPrimary ? <DashboardBadge variant="success" pill>Primary Contact</DashboardBadge> : null}
        </div>
        <p className="mt-2 font-sans text-[11px] uppercase tracking-[-0.01em] text-[#959597]">
          {contact.code} · {contact.primaryCustomer?.name ?? "—"} · {contact.email ?? "—"} · {contact.mobile ?? contact.officePhone ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTACT_DETAIL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${active ? "bg-[#353535] text-[#FDFDFF]" : "text-[#959597] hover:text-[#FDFDFF]"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Contact Details">
            <div className="space-y-3">
              <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{contact.fullName}</p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.roleTitle ?? "—"}</p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.email ?? "—"}</p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.mobile ?? contact.officePhone ?? "—"}</p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.locationLabel ?? "—"}</p>
              <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.notes ?? "No notes"}</p>
            </div>
          </Panel>
          <Panel title="Related">
            <ul className="space-y-3">
              {related.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[11px] uppercase text-[#959597]">{item.label}</span>
                  <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">{item.value}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : (
        <div className="rounded-xl bg-panel p-6 font-sans text-[12px] uppercase text-[#959597]">
          {CONTACT_DETAIL_TABS.find((t) => t.id === tab)?.label} — coming soon
        </div>
      )}
    </div>
  );
}
