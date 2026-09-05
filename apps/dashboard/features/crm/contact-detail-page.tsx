"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmContact,
  type CrmQuote,
  type CrmSalesActivity,
} from "@/lib/crm-api";
import { BrandLoader } from "@/features/loading/brand-loader";
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
  const [activities, setActivities] = React.useState<CrmSalesActivity[]>([]);
  const [quotes, setQuotes] = React.useState<CrmQuote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tabLoading, setTabLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getContact(contactId);
        if (!cancelled) {
          setContact(res.data);
          setActivities(res.data.activities ?? []);
          setQuotes(res.data.quotes ?? []);
        }
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setContact(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  React.useEffect(() => {
    if (!contact || (tab !== "activity" && tab !== "quotes")) return;
    if (tab === "activity" && (contact.activities?.length ?? 0) > 0) return;
    if (tab === "quotes" && (contact.quotes?.length ?? 0) > 0) return;

    let cancelled = false;
    (async () => {
      setTabLoading(true);
      try {
        if (tab === "activity") {
          const res = await crmApi.listSalesActivities({
            contactId,
            pageSize: 50,
          });
          if (!cancelled) setActivities(res.data.items ?? []);
        } else {
          const res = await crmApi.listQuotes({
            contactId,
            pageSize: 50,
          });
          let items = res.data.items ?? [];
          if (items.length === 0 && contact.primaryCustomerId) {
            const byCustomer = await crmApi.listQuotes({
              customerId: contact.primaryCustomerId,
              pageSize: 50,
            });
            items = (byCustomer.data.items ?? []).filter(
              (q) => q.contact?.id === contactId || !q.contact,
            );
          }
          if (!cancelled) setQuotes(items);
        }
      } catch (err) {
        if (!cancelled) toastApiError(err);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact, contactId, tab]);

  const linkedCustomers = React.useMemo(() => {
    if (!contact) return [];
    const map = new Map<
      string,
      { id: string; name: string; code?: string; openJobs?: number; isPrimary?: boolean }
    >();
    if (contact.primaryCustomer) {
      map.set(contact.primaryCustomer.id, {
        ...contact.primaryCustomer,
        isPrimary: true,
      });
    }
    for (const link of contact.customers ?? []) {
      const c = link.customer;
      if (!c) continue;
      const existing = map.get(c.id);
      map.set(c.id, {
        ...c,
        isPrimary:
          existing?.isPrimary ||
          link.isPrimary ||
          c.id === contact.primaryCustomerId,
      });
    }
    return Array.from(map.values());
  }, [contact]);

  const openJobs = linkedCustomers.reduce((sum, c) => sum + (c.openJobs ?? 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading contact" />
      </div>
    );
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
          <GlassBtn href={`/crm/contacts/${contact.id}/edit`}>Edit</GlassBtn>
          <GlassBtn href={`/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`}>Log Activity</GlassBtn>
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<ClipboardIcon className="shrink-0" />}
            onClick={() =>
              router.push(
                `/crm/quotes/new?customerId=${encodeURIComponent(contact.primaryCustomerId ?? "")}&contactId=${encodeURIComponent(contact.id)}`,
              )
            }
          >
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
      ) : null}

      {tab === "activity" ? (
        <Panel title={`Activity (${activities.length})`}>
          {tabLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <BrandLoader size="sm" label="Loading" />
            </div>
          ) : activities.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">No activities</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/crm/sales/${a.id}`}
                    className="flex items-center justify-between gap-3 font-sans text-[11px] uppercase text-[#FDFDFF] hover:underline"
                  >
                    <span className="truncate">
                      {a.activityCode} · {a.type} · {a.subject ?? "—"}
                    </span>
                    <span className="shrink-0 text-[#959597]">
                      {a.activityAt?.slice(0, 10) ?? "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "quotes" ? (
        <Panel title={`Quotes (${quotes.length})`}>
          {tabLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <BrandLoader size="sm" label="Loading" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">No quotes</p>
          ) : (
            <ul className="space-y-3">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/crm/quotes/${q.id}`}
                    className="flex items-center justify-between gap-3 font-sans text-[11px] uppercase text-[#FDFDFF] hover:underline"
                  >
                    <span className="truncate">
                      {q.quoteNumber} · {q.status}
                    </span>
                    <span className="shrink-0 text-[#959597]">{String(q.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "work-orders" ? (
        <Panel title="Work Orders">
          <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            Open jobs on related customers: {openJobs}
          </p>
          <p className="mt-3 font-sans text-[11px] uppercase text-[#959597]">
            Work orders are managed in Operations.
          </p>
          <div className="mt-4">
            <Link
              href="/operations/work-orders"
              className="font-sans text-[11px] uppercase text-[#FDFDFF] underline underline-offset-2"
            >
              View work orders
            </Link>
          </div>
        </Panel>
      ) : null}

      {tab === "customers" ? (
        <Panel title={`Customers (${linkedCustomers.length})`}>
          {linkedCustomers.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">No linked customers</p>
          ) : (
            <ul className="space-y-3">
              {linkedCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/crm/accounts/${c.id}`}
                    className="font-sans text-[11px] uppercase text-[#FDFDFF] hover:underline"
                  >
                    {c.name}
                    {c.isPrimary ? " · Primary" : ""}
                  </Link>
                  <span className="font-sans text-[11px] uppercase text-[#959597]">
                    {c.code ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
