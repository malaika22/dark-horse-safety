"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import {
  crmApi,
  type CrmContact,
  type CrmQuote,
  type CrmSalesActivity,
  type CrmUserRef,
  type CrmWorkOrder,
} from "@/lib/crm-api";
import {
  CrmDetailStateGate,
  CrmEmptyListState,
  CrmEmptyTabState,
  CrmTabLoadingState,
} from "@/features/crm/crm-states";
import { toastApiError } from "@/lib/toast";
import { CONTACT_DETAIL_TABS } from "./crm-constants";

type ContactDetailTab = (typeof CONTACT_DETAIL_TABS)[number]["id"];

type ActivityTypeFilter = "ALL" | "CALL" | "EMAIL" | "VISIT" | "MEETING" | "OTHER";
type ActivityDateFilter = "30" | "90" | "365" | "all";

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlassBtn({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "inline-flex h-8 items-center rounded-full border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5";
  if (href) return <Link href={href} className={className}>{children}</Link>;
  return <button type="button" onClick={onClick} className={className}>{children}</button>;
}

function Panel({
  title,
  meta,
  hint,
  children,
  className,
  toolbar,
}: {
  title: string;
  meta?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-[#2D2D30] bg-panel ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
        <div className="min-w-0">
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
            {meta ? (
              <span className="font-[400] text-[#959597]"> · {meta}</span>
            ) : null}
          </p>
        </div>
        {hint ? (
          <p className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            {hint}
          </p>
        ) : null}
      </div>
      {toolbar ? <div className="px-4 pb-3 sm:px-5">{toolbar}</div> : null}
      <div className="flex-1 px-2 pb-3 sm:px-3">{children}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-2.5">
      <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1A1A1A]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatShortName(user?: CrmUserRef | null) {
  if (!user) return "—";
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  return (first || last || user.email || "—").toUpperCase();
}

function formatMoney(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatActivityDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatFullDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function outcomeVariant(outcome?: string | null): DashboardBadgeVariant {
  const key = (outcome ?? "").toUpperCase();
  if (["POSITIVE", "REPLIED", "ACCEPTED", "WON", "COMPLETE", "COMPLETED"].includes(key)) {
    return "success";
  }
  if (["NO ANSWER", "NO_ANSWER", "CALLBACK", "PENDING"].includes(key)) {
    return "warning";
  }
  if (["SENT", "SCHEDULED", "OPEN", "IN_PROGRESS"].includes(key)) {
    return "info";
  }
  if (["EXPIRED", "LOST", "CANCELLED", "REJECTED"].includes(key)) {
    return "error";
  }
  return "neutral";
}

function quoteStatusVariant(status?: string | null): DashboardBadgeVariant {
  const key = (status ?? "").toUpperCase();
  if (["ACCEPTED", "WON", "APPROVED", "COMPLETE"].includes(key)) return "success";
  if (["SENT", "OPEN", "PENDING"].includes(key)) return "info";
  if (["EXPIRED", "LOST", "REJECTED", "CANCELLED"].includes(key)) return "error";
  return "neutral";
}

function woStatusVariant(status?: string | null): DashboardBadgeVariant {
  const key = (status ?? "").toUpperCase();
  if (["COMPLETE", "COMPLETED", "CLOSED"].includes(key)) return "success";
  if (["SCHEDULED", "IN_PROGRESS", "OPEN", "ACTIVE"].includes(key)) return "info";
  return "neutral";
}

function statusLabel(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ").toUpperCase();
}

function dateRangeForFilter(filter: ActivityDateFilter): { from?: string; to?: string } {
  if (filter === "all") return {};
  const days = Number(filter);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

function TabTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-left font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]"
              >
                {col}
              </th>
            ))}
            <th className="w-8 px-2 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TabRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="group cursor-pointer border-t border-[#2D2D30] transition-colors hover:bg-white/[0.03]"
    >
      {children}
      <td className="px-2 py-3 text-[#6F6F72] group-hover:text-[#FDFDFF]">
        <ChevronRightIcon />
      </td>
    </tr>
  );
}

function Cell({
  children,
  muted,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-3 py-3 ${className ?? ""}`}>
      <span
        className={`font-sans text-[11px] uppercase tracking-[-0.02em] ${
          muted ? "text-[#959597]" : "text-[#FDFDFF]"
        }`}
      >
        {children}
      </span>
    </td>
  );
}

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<ContactDetailTab>("overview");
  const [contact, setContact] = React.useState<CrmContact | null>(null);
  const [activities, setActivities] = React.useState<CrmSalesActivity[]>([]);
  const [activityTotal, setActivityTotal] = React.useState(0);
  const [quotes, setQuotes] = React.useState<CrmQuote[]>([]);
  const [workOrders, setWorkOrders] = React.useState<CrmWorkOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [forbidden, setForbidden] = React.useState(false);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [activityType, setActivityType] = React.useState<ActivityTypeFilter>("ALL");
  const [activityDate, setActivityDate] = React.useState<ActivityDateFilter>("30");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setForbidden(false);
      try {
        const res = await crmApi.getContact(contactId);
        if (!cancelled) setContact(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setContact(null);
          if (err instanceof ApiError && err.status === 403) {
            setForbidden(true);
          } else if (err instanceof ApiError && err.status !== 404) {
            setLoadError(err.message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, reloadKey]);

  React.useEffect(() => {
    if (!contact) return;
    if (tab !== "activity" && tab !== "quotes" && tab !== "work-orders") return;

    let cancelled = false;
    (async () => {
      setTabLoading(true);
      try {
        if (tab === "activity") {
          const range = dateRangeForFilter(activityDate);
          const res = await crmApi.getContactActivities(contactId, {
            type: activityType === "ALL" ? undefined : activityType,
            from: range.from,
            to: range.to,
            pageSize: 100,
          });
          if (!cancelled) {
            setActivities(res.data.items ?? []);
            setActivityTotal(res.data.total ?? res.data.items?.length ?? 0);
          }
        } else if (tab === "quotes") {
          const res = await crmApi.getContactQuotes(contactId);
          if (!cancelled) setQuotes(res.data.items ?? []);
        } else {
          const res = await crmApi.getContactWorkOrders(contactId);
          if (!cancelled) setWorkOrders(res.data.items ?? []);
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
  }, [contact, contactId, tab, activityType, activityDate]);

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

  const quoteVersions = React.useMemo(() => {
    const sorted = [...quotes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const map = new Map<string, string>();
    sorted.forEach((q, i) => map.set(q.id, `V${i + 1}`));
    return map;
  }, [quotes]);

  return (
    <CrmDetailStateGate
      loading={loading}
      error={loadError}
      forbidden={forbidden}
      missing={!loading && !contact && !loadError && !forbidden}
      missingTitle="Contact Not Found"
      missingDescription="This contact could not be found or is no longer available."
      onRetry={() => setReloadKey((k) => k + 1)}
    >
      {contact ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <GlassBtn href="/crm/contacts">Back</GlassBtn>
            <div className="flex flex-wrap items-center gap-2">
              <GlassBtn href={`/crm/contacts/${contact.id}/edit`}>Edit</GlassBtn>
              <GlassBtn href={`/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`}>
                Log Activity
              </GlassBtn>
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
              {contact.isPrimary ? (
                <DashboardBadge variant="success" pill>
                  Primary Contact
                </DashboardBadge>
              ) : null}
            </div>
            <p className="mt-2 font-sans text-[11px] uppercase tracking-[-0.01em] text-[#959597]">
              {contact.code} · {contact.primaryCustomer?.name ?? "—"} ·{" "}
              {contact.email ?? "—"} · {contact.mobile ?? contact.officePhone ?? "—"}
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
                  className={`rounded-md px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${
                    active
                      ? "bg-[#353535] text-[#FDFDFF]"
                      : "text-[#959597] hover:text-[#FDFDFF]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" ? (
            <OverviewTab contact={contact} linkedCustomers={linkedCustomers} />
          ) : null}

          {tab === "activity" ? (
            <Panel
              title="Activity"
              meta={`Full History · ${activityTotal} Entries`}
              hint="Row Opens The Activity →"
              toolbar={
                <div className="flex flex-wrap gap-2">
                  <FilterSelect
                    label="Type"
                    value={activityType}
                    onChange={(v) => setActivityType(v as ActivityTypeFilter)}
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "CALL", label: "Call" },
                      { value: "EMAIL", label: "Email" },
                      { value: "VISIT", label: "Visit" },
                      { value: "MEETING", label: "Meeting" },
                      { value: "OTHER", label: "Other" },
                    ]}
                  />
                  <FilterSelect
                    label="Date"
                    value={activityDate}
                    onChange={(v) => setActivityDate(v as ActivityDateFilter)}
                    options={[
                      { value: "30", label: "Last 30 Days" },
                      { value: "90", label: "Last 90 Days" },
                      { value: "365", label: "Last Year" },
                      { value: "all", label: "All Time" },
                    ]}
                  />
                </div>
              }
            >
              {tabLoading ? (
                <CrmTabLoadingState />
              ) : activities.length === 0 ? (
                <CrmEmptyListState
                  title="No Activity Logged Yet"
                  description="Log a call, visit, or email to start the history for this contact."
                  createLabel="Log Activity"
                  createHref={`/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`}
                  className="border-0 bg-transparent"
                />
              ) : (
                <TabTable columns={["Date", "Type", "Rep", "Outcome", "Notes", "Linked Quote"]}>
                  {activities.map((a) => (
                    <TabRow key={a.id} href={`/crm/sales/${a.id}`}>
                      <Cell muted>{formatActivityDate(a.activityAt)}</Cell>
                      <Cell>{a.type}</Cell>
                      <Cell>{formatShortName(a.rep)}</Cell>
                      <td className="px-3 py-3">
                        <DashboardBadge variant={outcomeVariant(a.outcome)} pill>
                          {statusLabel(a.outcome) === "—" ? "—" : statusLabel(a.outcome)}
                        </DashboardBadge>
                      </td>
                      <Cell muted className="max-w-[220px]">
                        <span className="block truncate" title={a.subject ?? a.notes ?? ""}>
                          {a.subject ?? a.notes ?? "—"}
                        </span>
                      </Cell>
                      <Cell muted>
                        {a.linkedQuote ? (
                          <Link
                            href={`/crm/quotes/${a.linkedQuote.id}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.linkedQuote.quoteNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Cell>
                    </TabRow>
                  ))}
                </TabTable>
              )}
            </Panel>
          ) : null}

          {tab === "quotes" ? (
            <Panel
              title="Quotes"
              meta={`Where This Contact Is The Named Recipient · ${quotes.length}`}
            >
              {tabLoading ? (
                <CrmTabLoadingState />
              ) : quotes.length === 0 ? (
                <CrmEmptyListState
                  title="No Quotes Sent To This Contact"
                  description="Create a quote with this contact as the named recipient."
                  createLabel="Create Quote"
                  createHref={`/crm/quotes/new?customerId=${encodeURIComponent(contact.primaryCustomerId ?? "")}&contactId=${encodeURIComponent(contact.id)}`}
                  className="border-0 bg-transparent"
                />
              ) : (
                <TabTable columns={["Quote #", "Version", "Value", "Status", "Sent", "Expiry"]}>
                  {quotes.map((q) => (
                    <TabRow key={q.id} href={`/crm/quotes/${q.id}`}>
                      <Cell>{q.quoteNumber}</Cell>
                      <Cell muted>{quoteVersions.get(q.id) ?? "V1"}</Cell>
                      <Cell>{formatMoney(q.amount)}</Cell>
                      <td className="px-3 py-3">
                        <DashboardBadge variant={quoteStatusVariant(q.status)} pill>
                          {statusLabel(q.status)}
                        </DashboardBadge>
                      </td>
                      <Cell muted>{formatFullDate(q.sentAt ?? q.createdAt)}</Cell>
                      <Cell muted>{formatFullDate(q.expiresAt)}</Cell>
                    </TabRow>
                  ))}
                </TabTable>
              )}
            </Panel>
          ) : null}

          {tab === "work-orders" ? (
            <Panel
              title="Work Orders"
              meta={`Jobs At This Contact’s Sites · ${workOrders.length}`}
              hint="Read-Only — Opens Job Packet →"
            >
              {tabLoading ? (
                <CrmTabLoadingState />
              ) : workOrders.length === 0 ? (
                <CrmEmptyTabState
                  title="No Work Orders Linked"
                  description="No work orders linked to this contact."
                />
              ) : (
                <TabTable columns={["WO #", "Customer", "Location", "Date", "Status"]}>
                  {workOrders.map((wo) => (
                    <TabRow key={wo.id} href={`/operations/work-orders`}>
                      <Cell>{wo.code ?? wo.workOrderNumber ?? "—"}</Cell>
                      <Cell muted>{wo.customer?.name ?? "—"}</Cell>
                      <Cell muted>{wo.location?.name ?? wo.locationName ?? "—"}</Cell>
                      <Cell muted>
                        {formatFullDate(wo.serviceDate ?? wo.createdAt)}
                      </Cell>
                      <td className="px-3 py-3">
                        <DashboardBadge variant={woStatusVariant(wo.status)} pill>
                          {statusLabel(wo.status)}
                        </DashboardBadge>
                      </td>
                    </TabRow>
                  ))}
                </TabTable>
              )}
            </Panel>
          ) : null}

          {tab === "customers" ? (
            <Panel title="Customers" meta={`${linkedCustomers.length} Linked`}>
              {linkedCustomers.length === 0 ? (
                <CrmEmptyTabState
                  title="No Customers Linked"
                  description="This contact is not linked to any customers yet."
                  addLabel="View Customers"
                  onAdd={() => router.push("/crm/accounts")}
                />
              ) : (
                <ul className="space-y-1 px-2 pb-2">
                  {linkedCustomers.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/crm/accounts/${c.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                          {c.name}
                          {c.isPrimary ? " · Primary" : ""}
                        </span>
                        <span className="inline-flex items-center gap-2 font-sans text-[11px] uppercase text-[#959597]">
                          {c.code ?? "—"}
                          <ChevronRightIcon />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      ) : null}
    </CrmDetailStateGate>
  );
}

function OverviewTab({
  contact,
  linkedCustomers,
}: {
  contact: CrmContact;
  linkedCustomers: { id: string; name: string; code?: string; isPrimary?: boolean }[];
}) {
  const related = [
    { label: "Customer", value: contact.primaryCustomer?.name ?? "—" },
    { label: "Role", value: contact.roleTitle ?? "—" },
    { label: "Status", value: contact.status },
    { label: "Code", value: contact.code },
    {
      label: "Linked Accounts",
      value: String(linkedCustomers.length),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Contact Details">
        <div className="space-y-3 px-2 pb-2">
          <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{contact.fullName}</p>
          <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.roleTitle ?? "—"}</p>
          <p className="font-sans text-[11px] uppercase text-[#959597]">{contact.email ?? "—"}</p>
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            {contact.mobile ?? contact.officePhone ?? "—"}
          </p>
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            {contact.locationLabel ?? "—"}
          </p>
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            {contact.notes ?? "No notes"}
          </p>
        </div>
      </Panel>
      <Panel title="Related">
        <ul className="space-y-3 px-2 pb-2">
          {related.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3">
              <span className="font-sans text-[11px] uppercase text-[#959597]">{item.label}</span>
              <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">{item.value}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
