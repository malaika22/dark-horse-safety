"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
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
import { toastApiError, toastSuccess } from "@/lib/toast";
import { logContactChannel } from "@/lib/crm-activity-log";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  sessionDisplayName,
  useSession,
} from "@/features/app-shell/session-context";
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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
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

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function GlassBtn({
  children,
  onClick,
  href,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls =
    `inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40 ${className ?? ""}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function DetailPair({
  label,
  value,
  trailing,
}: {
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <div className="mt-1.5 flex min-w-0 items-center gap-2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        <span className="min-w-0 truncate">{value}</span>
        {trailing}
      </div>
    </div>
  );
}

function RelatedRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <span
        className={`min-w-0 text-right font-sans text-[11px] uppercase tracking-[-0.02em] ${
          valueClassName ?? "text-[#FDFDFF]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[#2D2D30] bg-panel ${className ?? ""}`}
    >
      <div className="px-4 py-3.5 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
          {title}
        </p>
      </div>
      <div className="flex-1 px-4 pb-4 sm:px-5">{children}</div>
      {footer ? (
        <div className="border-t border-[#2D2D30] px-4 py-3 sm:px-5">{footer}</div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function shortDisplayName(full?: string | null) {
  if (!full?.trim()) return "—";
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.toUpperCase();
  return `${parts[0]!.charAt(0)}. ${parts[parts.length - 1]}`.toUpperCase();
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

function formatCompactMoney(value: number) {
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return formatMoney(value);
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

function formatDateNumeric(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

function relativeDaysAgo(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  if (days === 0) return "TODAY";
  if (days === 1) return "1 DAY AGO";
  return `${days} DAYS AGO`;
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

function isOpenQuote(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  return ["DRAFT", "SENT", "OPEN", "PENDING", "NEEDS_REVIEW"].includes(s);
}

function isWonQuote(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  return ["ACCEPTED", "WON", "APPROVED", "COMPLETE", "COMPLETED"].includes(s);
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
  const { user } = useSession();
  const [tab, setTab] = React.useState<ContactDetailTab>("overview");
  const [contact, setContact] = React.useState<CrmContact | null>(null);
  const [activities, setActivities] = React.useState<CrmSalesActivity[]>([]);
  const [activityTotal, setActivityTotal] = React.useState(0);
  const [quotes, setQuotes] = React.useState<CrmQuote[]>([]);
  const [workOrders, setWorkOrders] = React.useState<CrmWorkOrder[]>([]);
  const [overviewActivities, setOverviewActivities] = React.useState<CrmSalesActivity[]>([]);
  const [overviewQuotes, setOverviewQuotes] = React.useState<CrmQuote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [forbidden, setForbidden] = React.useState(false);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [activityType, setActivityType] = React.useState<ActivityTypeFilter>("ALL");
  const [activityDate, setActivityDate] = React.useState<ActivityDateFilter>("30");
  const [neighborIds, setNeighborIds] = React.useState<string[]>([]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [addingNote, setAddingNote] = React.useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = React.useState(false);
  const titleMenuRef = React.useRef<HTMLButtonElement>(null);
  const [customerMenuFor, setCustomerMenuFor] = React.useState<string | null>(null);
  const customerMenuAnchor = React.useRef<HTMLButtonElement | null>(null);
  const customerBtnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setForbidden(false);
      try {
        const res = await crmApi.getContact(contactId);
        if (!cancelled) {
          setContact(res.data);
          setNoteDraft("");
          setOverviewActivities(res.data.activities ?? []);
          setOverviewQuotes(res.data.quotes ?? []);
        }
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
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listContacts({
          page: 1,
          pageSize: 200,
          sort: "fullName",
          direction: "asc",
        });
        if (!cancelled) {
          setNeighborIds((res.data.items ?? []).map((c) => c.id));
        }
      } catch {
        if (!cancelled) setNeighborIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!contact) return;
    // Prefetch counts for tab badges
    let cancelled = false;
    (async () => {
      try {
        const [act, qts, wos] = await Promise.all([
          crmApi.getContactActivities(contactId, { pageSize: 100 }),
          crmApi.getContactQuotes(contactId),
          crmApi.getContactWorkOrders(contactId),
        ]);
        if (cancelled) return;
        setActivityTotal(act.data.total ?? act.data.items?.length ?? 0);
        setOverviewActivities(act.data.items ?? []);
        setOverviewQuotes(qts.data.items ?? []);
        setQuotes(qts.data.items ?? []);
        setWorkOrders(wos.data.items ?? []);
      } catch {
        /* keep nested getById data */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact, contactId, reloadKey]);

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
      {
        id: string;
        name: string;
        code?: string;
        openJobs?: number;
        isPrimary?: boolean;
        role?: string | null;
      }
    >();
    if (contact.primaryCustomer) {
      map.set(contact.primaryCustomer.id, {
        ...contact.primaryCustomer,
        isPrimary: true,
        role: contact.roleTitle,
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
        role: link.roleAtCustomer ?? existing?.role ?? contact.roleTitle,
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

  const neighborIndex = neighborIds.indexOf(contactId);
  const prevId = neighborIndex > 0 ? neighborIds[neighborIndex - 1] : null;
  const nextId =
    neighborIndex >= 0 && neighborIndex < neighborIds.length - 1
      ? neighborIds[neighborIndex + 1]
      : null;
  const showingLabel =
    neighborIndex >= 0
      ? `Showing ${neighborIndex + 1} of ${neighborIds.length}`
      : null;

  useSetHeaderBreadcrumb("CRM / Customer / Contacts");

  useSetHeaderActions(null, [contactId]);

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toastSuccess("Email copied");
    } catch {
      toastApiError(new Error("Couldn't copy email"));
    }
  }

  async function handleAddNote() {
    if (!contact || !noteDraft.trim()) return;
    setNoteBusy(true);
    try {
      const author = shortDisplayName(sessionDisplayName(user) || "You");
      const stamp = new Date()
        .toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toUpperCase()
        .replace(/\s/g, " ");
      const entry = `${noteDraft.trim()}\n— ${author} · ${stamp}`;
      const nextNotes = contact.notes?.trim()
        ? `${contact.notes.trim()}\n\n${entry}`
        : entry;
      const res = await crmApi.updateContact(contact.id, { notes: nextNotes });
      setContact(res.data);
      setNoteDraft("");
      setAddingNote(false);
      toastSuccess("Note added");
    } catch (err) {
      toastApiError(err);
    } finally {
      setNoteBusy(false);
    }
  }

  const openQuotes = overviewQuotes.filter((q) => isOpenQuote(q.status));
  const wonQuotes = overviewQuotes.filter((q) => isWonQuote(q.status));
  const openQuoteAmount = openQuotes.reduce(
    (sum, q) => sum + (Number(q.amount) || 0),
    0,
  );
  const lifetimeValue = wonQuotes.reduce(
    (sum, q) => sum + (Number(q.amount) || 0),
    0,
  );
  const lastActivity = overviewActivities[0] ?? contact?.activities?.[0] ?? null;
  const nextTask = overviewActivities.find((a) => a.followUpAt) ?? null;
  const recentPreview = overviewActivities.slice(0, 3);
  const moreActivityCount = Math.max(0, activityTotal - recentPreview.length);

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
          {/* Prev / Showing / Next — Figma top controls */}
          <div className="flex flex-wrap items-center gap-2">
            <GlassBtn
              className={!prevId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (prevId) router.push(`/crm/contacts/${prevId}`);
              }}
            >
              Previous Contact
            </GlassBtn>
            {showingLabel ? (
              <span className="inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {showingLabel}
              </span>
            ) : null}
            <GlassBtn
              className={!nextId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (nextId) router.push(`/crm/contacts/${nextId}`);
              }}
            >
              Next Contact
            </GlassBtn>
          </div>

          {/* Title + primary actions */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
                Contact · {shortDisplayName(contact.fullName)}
              </h1>
              <button
                ref={titleMenuRef}
                type="button"
                aria-label="Contact actions"
                onClick={() => setTitleMenuOpen((o) => !o)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
              >
                <ChevronDownIcon />
              </button>
              <DashboardMenuPopover
                open={titleMenuOpen}
                onClose={() => setTitleMenuOpen(false)}
                anchorRef={titleMenuRef}
                items={[
                  {
                    id: "edit",
                    label: "Edit Contact",
                    onSelect: () =>
                      router.push(`/crm/contacts/${contact.id}/edit`),
                  },
                  {
                    id: "log",
                    label: "Log Activity",
                    onSelect: () =>
                      router.push(
                        `/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`,
                      ),
                  },
                  {
                    id: "quote",
                    label: "Create Quote",
                    onSelect: () =>
                      router.push(
                        `/crm/quotes/new?customerId=${encodeURIComponent(contact.primaryCustomerId ?? "")}&contactId=${encodeURIComponent(contact.id)}`,
                      ),
                  },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlassBtn
                onClick={() => {
                  void logContactChannel({
                    type: "EMAIL",
                    contactId: contact.id,
                    customerId: contact.primaryCustomerId ?? undefined,
                    email: contact.email,
                    label: contact.fullName,
                  });
                }}
              >
                Send Email
              </GlassBtn>
              <GlassBtn href={`/crm/contacts/${contact.id}/edit`}>
                Edit Contact
              </GlassBtn>
              <GlassBtn
                href={`/crm/quotes/new?customerId=${encodeURIComponent(contact.primaryCustomerId ?? "")}&contactId=${encodeURIComponent(contact.id)}`}
              >
                Create Quote
              </GlassBtn>
              <DashboardToolbarButton
                variant="primary"
                leftIcon={<ClipboardIcon className="shrink-0" />}
                onClick={() =>
                  router.push(
                    `/crm/sales/new?contactId=${encodeURIComponent(contact.id)}`,
                  )
                }
              >
                Log Activity
              </DashboardToolbarButton>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {CONTACT_DETAIL_TABS.map((t) => {
              const active = tab === t.id;
              const count =
                t.id === "activity"
                  ? activityTotal
                  : t.id === "quotes"
                    ? quotes.length || overviewQuotes.length
                    : t.id === "work-orders"
                      ? workOrders.length
                      : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3.5 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
                    active
                      ? "bg-[#FDFDFF] text-[#0D0D0D]"
                      : "border border-[#2D2D30] bg-[#1A1A1A] text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
                  }`}
                >
                  {t.label}
                  {count != null && count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            {contact.isPrimary ? (
              <DashboardBadge variant="success" pill>
                Primary Contact
              </DashboardBadge>
            ) : null}
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {contact.primaryCustomer?.name ?? "—"}
              <span aria-hidden> - </span>
              {statusLabel(contact.status)}
            </p>
          </div>

          {tab === "overview" ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:gap-5">
              {/* Left column */}
              <div className="space-y-4">
                <SectionCard title="Contact Details">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[13px] font-[510] text-[#FDFDFF]">
                      {initials(contact.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {shortDisplayName(contact.fullName)}
                      </p>
                      <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                        {linkedCustomers.length > 1
                          ? `Multiple roles across ${linkedCustomers.length} customers`
                          : contact.roleTitle ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <DetailPair
                      label="Customer"
                      value={contact.primaryCustomer?.name ?? "—"}
                    />
                    <DetailPair
                      label="Email"
                      value={contact.email ?? "—"}
                      trailing={
                        contact.email ? (
                          <button
                            type="button"
                            aria-label="Copy email"
                            onClick={() => void copyEmail(contact.email!)}
                            className="text-[#959597] transition-colors hover:text-[#FDFDFF]"
                          >
                            <CopyIcon />
                          </button>
                        ) : null
                      }
                    />
                    <DetailPair
                      label="Phone"
                      value={contact.officePhone ?? "—"}
                    />
                    <DetailPair label="Mobile" value={contact.mobile ?? "—"} />
                    <DetailPair
                      label="Location"
                      value={contact.locationLabel ?? "—"}
                    />
                    <DetailPair
                      label="Preferred"
                      value={contact.preferredMethod ?? "—"}
                    />
                    <DetailPair
                      label="Job Title"
                      value={contact.roleTitle ?? "—"}
                    />
                    <DetailPair label="Time Zone" value="—" />
                    <DetailPair
                      label="Last Contacted"
                      value={
                        <>
                          {formatFullDate(contact.lastActivityAt)}
                          {relativeDaysAgo(contact.lastActivityAt) ? (
                            <span className="text-[#959597]">
                              {" "}
                              - {relativeDaysAgo(contact.lastActivityAt)}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
                  <SectionCard
                    title="Recent Activity"
                    footer={
                      moreActivityCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setTab("activity")}
                          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-70"
                        >
                          + {moreActivityCount} More
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTab("activity")}
                          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                        >
                          View Activity
                        </button>
                      )
                    }
                  >
                    {recentPreview.length === 0 ? (
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        No activity logged yet
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {recentPreview.map((a) => {
                          const bits = [
                            a.activityCode ?? null,
                            a.type,
                            formatActivityDate(a.activityAt),
                            a.subject ?? a.notes ?? null,
                            a.outcome ?? null,
                          ].filter(Boolean);
                          return (
                            <li key={a.id}>
                              <Link
                                href={`/crm/sales/${a.id}`}
                                className="block font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-opacity hover:opacity-70"
                              >
                                {bits.join(" · ")}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Notes"
                    footer={
                      addingNote ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={3}
                            autoFocus
                            placeholder="Add a note…"
                            className="w-full resize-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6F6F72] focus:border-[#5A5A5A]"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={noteBusy || !noteDraft.trim()}
                              onClick={() => void handleAddNote()}
                              className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-opacity hover:opacity-70 disabled:opacity-40"
                            >
                              Save Note
                            </button>
                            <button
                              type="button"
                              disabled={noteBusy}
                              onClick={() => {
                                setAddingNote(false);
                                setNoteDraft("");
                              }}
                              className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingNote(true)}
                          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-opacity hover:opacity-70"
                        >
                          + Add Note
                        </button>
                      )
                    }
                  >
                    <p className="whitespace-pre-wrap font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                      {contact.notes?.trim() || "No notes yet"}
                    </p>
                  </SectionCard>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <SectionCard title="Related">
                  <div className="divide-y divide-[#2D2D30]">
                    <RelatedRow
                      label="Open Quotes"
                      value={
                        openQuoteAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setTab("quotes")}
                            className="hover:underline"
                          >
                            {formatMoney(openQuoteAmount)}
                          </button>
                        ) : openQuotes.length ? (
                          <button
                            type="button"
                            onClick={() => setTab("quotes")}
                            className="hover:underline"
                          >
                            {openQuotes.length}
                          </button>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <RelatedRow
                      label="Won Deals"
                      value={
                        wonQuotes.length ? (
                          <button
                            type="button"
                            onClick={() => setTab("quotes")}
                            className="underline underline-offset-2"
                          >
                            {wonQuotes.length}
                          </button>
                        ) : (
                          "0"
                        )
                      }
                    />
                    <RelatedRow
                      label="Last Activity"
                      value={
                        lastActivity ? (
                          <Link
                            href={`/crm/sales/${lastActivity.id}`}
                            className="hover:underline"
                          >
                            {formatDateNumeric(lastActivity.activityAt)} ·{" "}
                            {lastActivity.subject ?? lastActivity.type}
                          </Link>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <RelatedRow
                      label="Next Task"
                      value={
                        nextTask?.followUpAt ? (
                          <Link
                            href={`/crm/sales/${nextTask.id}`}
                            className="underline underline-offset-2"
                          >
                            {nextTask.subject ?? "Follow up"}
                          </Link>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <RelatedRow
                      label="Lifetime Value"
                      value={
                        lifetimeValue > 0 ? formatMoney(lifetimeValue) : "—"
                      }
                      valueClassName="font-[510] text-[#4ADE80]"
                    />
                    <RelatedRow
                      label="Open Opportunities"
                      value={
                        openQuotes.length ? (
                          <button
                            type="button"
                            onClick={() => setTab("quotes")}
                            className="underline underline-offset-2"
                          >
                            {openQuotes.length} ·{" "}
                            {formatCompactMoney(openQuoteAmount)}
                          </button>
                        ) : (
                          "—"
                        )
                      }
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Customers"
                  footer={
                    <Link
                      href={`/crm/contacts/${contact.id}/edit`}
                      className="inline-flex h-9 w-full items-center justify-center rounded-md border border-[#2D2D30] bg-[#1A1A1A] font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
                    >
                      Add New Customer
                    </Link>
                  }
                >
                  {linkedCustomers.length === 0 ? (
                    <p className="font-sans text-[11px] uppercase text-[#959597]">
                      No customers linked
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {linkedCustomers.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <Link
                            href={`/crm/accounts/${c.id}`}
                            className="min-w-0 flex-1"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                                {c.name}
                              </p>
                              {c.isPrimary ? (
                                <DashboardBadge variant="success" pill>
                                  Primary
                                </DashboardBadge>
                              ) : null}
                            </div>
                            <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                              {c.role ?? contact.roleTitle ?? "—"}
                            </p>
                          </Link>
                          <button
                            ref={(node) => {
                              customerBtnRefs.current[c.id] = node;
                            }}
                            type="button"
                            aria-label={`${c.name} actions`}
                            onClick={() => {
                              customerMenuAnchor.current =
                                customerBtnRefs.current[c.id] ?? null;
                              setCustomerMenuFor((prev) =>
                                prev === c.id ? null : c.id,
                              );
                            }}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
                          >
                            <KebabIcon />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <DashboardMenuPopover
                    open={Boolean(customerMenuFor)}
                    onClose={() => setCustomerMenuFor(null)}
                    anchorRef={customerMenuAnchor}
                    items={[
                      {
                        id: "open",
                        label: "Open Customer",
                        onSelect: () => {
                          if (customerMenuFor) {
                            router.push(`/crm/accounts/${customerMenuFor}`);
                          }
                        },
                      },
                      {
                        id: "primary",
                        label: "Set as Primary",
                        onSelect: () => {
                          if (!customerMenuFor) return;
                          void (async () => {
                            try {
                              await crmApi.setContactPrimary(
                                contact.id,
                                customerMenuFor,
                              );
                              toastSuccess("Primary customer updated");
                              setReloadKey((k) => k + 1);
                            } catch (err) {
                              toastApiError(err);
                            }
                          })();
                        },
                      },
                    ]}
                  />
                </SectionCard>
              </div>
            </div>
          ) : null}

          {tab === "activity" ? (
            <SectionCard title={`Activity · ${activityTotal} Entries`}>
              <div className="mb-3 flex flex-wrap gap-2">
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
            </SectionCard>
          ) : null}

          {tab === "quotes" ? (
            <SectionCard title={`Quotes · ${quotes.length}`}>
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
            </SectionCard>
          ) : null}

          {tab === "work-orders" ? (
            <SectionCard title={`Work Orders · ${workOrders.length}`}>
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
                    <TabRow key={wo.id} href={`/operations/work-orders/${wo.id}`}>
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
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </CrmDetailStateGate>
  );
}
