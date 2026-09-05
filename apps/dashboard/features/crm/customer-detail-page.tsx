"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmCustomerDetail } from "@/lib/crm-api";
import { logContactChannel } from "@/lib/crm-activity-log";
import { formatKpiValue } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import type { CustomerDetail, KpiCell } from "./crm-types";

const EMPTY_DETAIL: CustomerDetail = {
  id: "",
  name: "",
  code: "",
  status: { label: "—", variant: "neutral" },
  accountOwner: "—",
  email: "—",
  phone: "—",
  imageUrl: "",
  industry: "—",
  billingAddress: "—",
  primaryContact: "—",
  customerSince: "—",
  maxClockInRadius: false,
  radiusMiles: "—",
};

/* ═══════════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════════ */

/** Figma entity header — filled document with dog-ear + text lines. */
function FileTextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        fill="currentColor"
      />
      <path d="M14 3v4h4" fill="#2A2A2A" />
      <path
        d="M9 11h6M9 14.5h6M9 18h4"
        stroke="#2A2A2A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma Create Quote CTA — 2×2 rounded grid. */
function QuoteGridIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect x="3.25" y="3.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="13.25" y="3.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="3.25" y="13.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="13.25" y="13.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── toolbar button ── */
function ToolbarBtn({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/* ── page-level menu ── */
function PageMenu({
  customerId,
  netsuiteId,
  email,
  onArchive,
  onDuplicate,
}: {
  customerId: string;
  netsuiteId?: string | null;
  email?: string | null;
  onArchive: () => void;
  onDuplicate: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#2D2D30] bg-[#1A1A1A] text-[#FDFDFF] transition-colors hover:bg-white/5"
      >
        <ChevronDownIcon />
      </button>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        className="min-w-[200px]"
        items={[
          {
            id: "edit",
            label: "Edit Customer",
            onSelect: () => router.push(`/crm/accounts/${customerId}/edit`),
          },
          {
            id: "add-contact",
            label: "Add Contact",
            onSelect: () => router.push("/crm/contacts/new"),
          },
          {
            id: "add-loc",
            label: "Add Location",
            onSelect: () => router.push("/crm/locations/new"),
          },
          {
            id: "add-pr1",
            label: "Add Pricing Rule",
            onSelect: () => router.push("/crm/pricing-rules/new"),
          },
          {
            id: "add-req",
            label: "Add Requirement",
            onSelect: () => router.push("/crm/requirements/new"),
          },
          {
            id: "add-form-rule",
            label: "Add Form Rule",
            onSelect: () => router.push("/crm/form-rules/new"),
          },
          {
            id: "add-route-rule",
            label: "Add Route Rule",
            onSelect: () => router.push("/crm/route-rules/new"),
          },
          {
            id: "log-activity",
            label: "Log Activity",
            onSelect: () => router.push("/crm/sales/new"),
          },
          {
            id: "dup",
            label: "Duplicate Customer",
            onSelect: onDuplicate,
          },
          {
            id: "netsuite",
            label: "View in NetSuite",
            onSelect: () => {
              const base =
                process.env.NEXT_PUBLIC_NETSUITE_CUSTOMER_URL?.trim() ||
                "https://system.netsuite.com/app/common/entity/custjob.nl?id=";
              if (netsuiteId) {
                window.open(
                  `${base}${encodeURIComponent(netsuiteId)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              } else {
                toastApiError(new Error("No NetSuite ID"));
              }
            },
          },
          {
            id: "email",
            label: "Email",
            onSelect: () => {
              void logContactChannel({
                type: "EMAIL",
                customerId,
                email: email && email !== "—" ? email : null,
                label: "Customer email",
              });
            },
          },
          {
            id: "print",
            label: "Print Summary",
            onSelect: () => window.print(),
          },
          {
            id: "archive",
            label: "Archive Customer",
            destructive: true,
            onSelect: onArchive,
          },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION PANEL
═══════════════════════════════════════════════════════════════════ */

function SectionPanel({
  icon,
  title,
  meta,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-divider bg-panel">
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
            {icon}
          </span>
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
        </div>
        {action ?? (meta ? (
          <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
            {meta}
          </span>
        ) : null)}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function DetailRow({
  title,
  trailing,
  trailingTone = "muted",
  menu,
}: {
  title: React.ReactNode;
  trailing?: React.ReactNode;
  trailingTone?: "muted" | "strong";
  menu?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-1 sm:px-5">
      <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
        {title}
      </span>
      {trailing != null ? (
        typeof trailing === "string" ? (
          <span
            className={`shrink-0 font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] ${
              trailingTone === "strong" ? "font-[510] text-[#FDFDFF]" : "text-[#959597]"
            }`}
          >
            {trailing}
          </span>
        ) : (
          <span className="shrink-0">{trailing}</span>
        )
      ) : null}
      {menu}
    </div>
  );
}

function LightningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h7l-1 8 10-14h-7l1-6z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPANY DETAILS HELPERS
═══════════════════════════════════════════════════════════════════ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
      {children}
    </p>
  );
}

function DisplayInput({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
      <span className="block truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]" title={value}>
        {value}
      </span>
    </div>
  );
}

function DisplaySelectField({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
      <span className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]" title={value}>
        {value}
      </span>
      <ChevronDownIcon className="shrink-0 text-[#959597]" />
    </div>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ${checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"}`}>
      <span className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${checked ? "translate-x-[18px] bg-[#1A1A1A]" : "translate-x-1 bg-[#959597]"}`} />
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
      <p className="mb-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">{label}</p>
      <p className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]" title={value}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROW DOT MENU WRAPPER
═══════════════════════════════════════════════════════════════════ */

function RowMenu({
  items,
}: {
  items: { id: string; label: string; destructive?: boolean; onSelect?: () => void }[];
}) {
  return (
    <DashboardRowActionMenu
      items={items}
      className="shrink-0"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [detail, setDetail] = React.useState<CustomerDetail>(EMPTY_DETAIL);
  const [apiDetail, setApiDetail] = React.useState<CrmCustomerDetail | null>(null);
  const [woPage, setWoPage] = React.useState(1);
  const [woPageSize, setWoPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await crmApi.getCustomer(customerId);
        if (cancelled) return;
        const d = res.data;
        setApiDetail(d);
        const owner = d.assignedRep
          ? [d.assignedRep.firstName, d.assignedRep.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || d.assignedRep.email || "—"
          : "—";
        const primary = d.contacts?.find((c) => c.isPrimary) ?? d.contacts?.[0];
        setDetail({
          id: d.id,
          name: d.name,
          code: d.code,
          status: {
            label: d.status
              .toLowerCase()
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            variant:
              d.status === "ACTIVE"
                ? "success"
                : d.status === "NEEDS_REVIEW"
                  ? "warning"
                  : "error",
          },
          accountOwner: owner,
          email: d.email ?? "—",
          phone: d.phone ?? "—",
          imageUrl: "",
          industry: d.industry ?? "—",
          billingAddress: d.billingAddress ?? "—",
          primaryContact: primary?.fullName ?? "—",
          customerSince: d.createdAt ? d.createdAt.slice(0, 10) : "—",
          maxClockInRadius: Boolean(d.clockInRadius),
          radiusMiles: d.clockInRadius ?? "—",
        });
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (customerId) void load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function reloadCustomer() {
    try {
      const res = await crmApi.getCustomer(customerId);
      const d = res.data;
      setApiDetail(d);
      const owner = d.assignedRep
        ? [d.assignedRep.firstName, d.assignedRep.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || d.assignedRep.email || "—"
        : "—";
      const primary = d.contacts?.find((c) => c.isPrimary) ?? d.contacts?.[0];
      setDetail((prev) => ({
        ...prev,
        id: d.id,
        name: d.name,
        code: d.code,
        accountOwner: owner,
        email: d.email ?? "—",
        phone: d.phone ?? "—",
        industry: d.industry ?? "—",
        billingAddress: d.billingAddress ?? "—",
        primaryContact: primary?.fullName ?? "—",
        maxClockInRadius: Boolean(d.clockInRadius),
        radiusMiles: d.clockInRadius ?? "—",
      }));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleArchiveCustomer() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Archive this customer?")
    ) {
      return;
    }
    try {
      await crmApi.archiveCustomer(customerId);
      toastSuccess("Customer archived");
      router.push("/crm/accounts");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDuplicateCustomer() {
    try {
      const res = await crmApi.duplicateCustomer(customerId);
      toastSuccess("Customer duplicated");
      router.push(`/crm/accounts/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleSetPrimary(contactId: string) {
    try {
      await crmApi.setContactPrimary(contactId, customerId);
      toastSuccess("Contact set as primary");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleRemoveContact(contactId: string, name: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove ${name} from this customer?`)
    ) {
      return;
    }
    try {
      await crmApi.archiveContact(contactId);
      toastSuccess("Contact removed");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDeactivateLocation(locationId: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Deactivate this location?")
    ) {
      return;
    }
    try {
      await crmApi.archiveLocation(locationId);
      toastSuccess("Location deactivated");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDeletePricingRule(ruleId: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this pricing rule?")
    ) {
      return;
    }
    try {
      await crmApi.deletePricingRule(ruleId);
      toastSuccess("Pricing rule deleted");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  function titleCaseStatus(status: string) {
    return status
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function statusVariant(
    status: string,
  ): "success" | "warning" | "error" | "neutral" | "offline" {
    const s = status.toUpperCase();
    if (["ACTIVE", "COMPLETE", "SUBMITTED", "WON", "SENT", "MET"].includes(s)) {
      return "success";
    }
    if (["PENDING", "NEEDS_REVIEW", "DRAFT", "OPEN"].includes(s)) {
      return "warning";
    }
    if (["IN_PROGRESS"].includes(s)) return "offline";
    if (["INACTIVE", "ARCHIVED", "EXPIRED", "LOST", "ON_HOLD"].includes(s)) {
      return "error";
    }
    return "neutral";
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

  function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  const c = detail;
  const contactRows = (apiDetail?.contacts ?? []).map((contact) => ({
    id: contact.id,
    name: contact.fullName,
    role: contact.roleTitle ?? "—",
    badge: contact.isPrimary ? "Primary" : "Secondary",
    email: contact.email ?? null,
  }));
  const locationRows = (apiDetail?.locations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    detail: [loc.county, loc.state].filter(Boolean).join(", ") || "—",
    status: loc.status,
  }));
  const pricingRows = (apiDetail?.pricingRules ?? []).map((rule) => ({
    id: rule.id,
    title: rule.serviceItem,
    trailing: `${formatMoney(rule.rate)}${rule.unit ? ` / ${rule.unit}` : ""}`,
  }));
  const formRows = (apiDetail?.formRules ?? []).map((form) => ({
    id: form.id,
    title: form.formTemplate,
    detail: [form.jobType, form.required ? "Required" : null, form.status]
      .filter(Boolean)
      .join(" · "),
  }));
  const routeRows = (apiDetail?.routeRules ?? []).map((route) => ({
    id: route.id,
    name: route.routeLabel ?? route.code,
    detail: [
      route.geofenceRadius ? `${route.geofenceRadius} radius` : null,
      route.gpsRequired ? "GPS Required" : null,
      route.location?.name,
    ]
      .filter(Boolean)
      .join(" · ") || "—",
  }));
  const docRows = (apiDetail?.documents ?? []).map((doc) => ({
    id: doc.id,
    title: doc.name,
    subtitle: [
      doc.kind,
      doc.expiresAt ? `Exp ${formatDate(doc.expiresAt)}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "—",
    url: doc.url ?? null,
    expiresAt: doc.expiresAt ?? null,
  }));
  const ticketRows = (apiDetail?.quotes ?? []).map((quote) => ({
    id: quote.id,
    title: quote.quoteNumber,
    subtitle: formatDate(quote.createdAt),
    amount: formatMoney(quote.amount),
    status: {
      label: titleCaseStatus(quote.status),
      variant: statusVariant(quote.status),
    },
  }));
  const activityRows = (apiDetail?.activities ?? []).map((activity) => ({
    id: activity.id,
    serviceDate: formatDate(activity.activityAt),
    woNumber: activity.activityCode,
    customer: activity.customer?.name ?? c.name,
    category: {
      label: titleCaseStatus(activity.type),
      variant: statusVariant(activity.type),
    },
    clockIn: activity.duration ?? "—",
    clockOut: activity.outcome ?? "—",
    hours: activity.subject ?? "—",
    status: {
      label: titleCaseStatus(activity.status),
      variant: statusVariant(activity.status),
    },
  }));
  const woTotal = activityRows.length;
  const activityPageRows = activityRows.slice(
    (woPage - 1) * woPageSize,
    woPage * woPageSize,
  );
  const kpiCells: KpiCell[] = [
    {
      title: "Contacts",
      value: String(contactRows.length),
      icon: "customers",
    },
    {
      title: "Locations",
      value: String(locationRows.length),
      icon: "gps",
    },
    {
      title: "Open jobs",
      value: formatKpiValue(apiDetail?.openJobs),
      icon: "time",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading customer" />
      </div>
    );
  }

  return (
    <div className="space-y-[18px] overflow-x-hidden bg-shell p-3 sm:p-4">

      {/* ── top actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/crm/accounts">
          <ToolbarBtn>Back</ToolbarBtn>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/operations/work-orders/new">
            <ToolbarBtn>Create Work Order</ToolbarBtn>
          </Link>
          <Link
            href={`/crm/quotes/new?customer=${encodeURIComponent(c.name)}`}
            className="inline-flex shrink-0"
          >
            <DashboardToolbarButton
              variant="primary"
              leftIcon={<QuoteGridIcon className="shrink-0" />}
              showChevron
              className="!rounded-full"
            >
              Create Quote
            </DashboardToolbarButton>
          </Link>
        </div>
      </div>

      {/* ── entity identity card ── */}
      <div className="overflow-hidden rounded-xl bg-panel">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
              <FileTextIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-sans text-[15px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[17px]">
                  {c.name}
                </h2>
                <DashboardBadge variant="error" pill>
                  {c.status.label}
                </DashboardBadge>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <p className="font-sans text-[10px] uppercase leading-[1.35] tracking-[-0.01em] text-[#959597] sm:text-[11px]">
                  <span className="whitespace-nowrap">{c.code}</span>
                  <span aria-hidden> · </span>
                  <span className="whitespace-nowrap">Account Owner: {c.accountOwner}</span>
                  <span aria-hidden> ·</span>
                </p>
                <p className="font-sans text-[10px] uppercase leading-[1.35] tracking-[-0.01em] text-[#959597] sm:text-[11px]">
                  <span className="whitespace-nowrap">{c.email}</span>
                  <span aria-hidden> · </span>
                  <span className="whitespace-nowrap">{c.phone}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <PageMenu
              customerId={customerId || c.id}
              netsuiteId={apiDetail?.netsuiteId}
              email={apiDetail?.email}
              onArchive={() => void handleArchiveCustomer()}
              onDuplicate={() => void handleDuplicateCustomer()}
            />
            <ToolbarBtn>Previous</ToolbarBtn>
            <ToolbarBtn>Next</ToolbarBtn>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {/* ── Company Details ── */}
      <SectionPanel icon={<LightningIcon />} title="Company Details" action={
        <button
          type="button"
          onClick={() => router.push(`/crm/accounts/${customerId || c.id}/edit`)}
          className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] transition-opacity hover:opacity-70"
        >
          Edit Details
        </button>
      }>
        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><FieldLabel>Company Name</FieldLabel><DisplayInput value={c.name} /></div>
            <div><FieldLabel>Account Owner</FieldLabel><DisplayInput value={c.accountOwner} /></div>
            <div><FieldLabel>Status</FieldLabel><DisplayInput value={c.status.label} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><FieldLabel>Phone</FieldLabel><DisplayInput value={c.phone} /></div>
            <div><FieldLabel>Email</FieldLabel><DisplayInput value={c.email} /></div>
            <div><FieldLabel>Billing Address</FieldLabel><DisplayInput value={c.billingAddress} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><FieldLabel>Industry</FieldLabel><DisplaySelectField value={c.industry} /></div>
            <div><FieldLabel>Primary Contact</FieldLabel><DisplaySelectField value={c.primaryContact} /></div>
            <div><FieldLabel>Customer Since</FieldLabel><DisplayInput value={c.customerSince} /></div>
          </div>
          <div>
            <FieldLabel>Permissions</FieldLabel>
            <div className="mt-1 flex items-center gap-2.5">
              <ToggleSwitch checked={c.maxClockInRadius} />
              <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Max Clock-In Radius
              </span>
            </div>
          </div>
          <div>
            <FieldLabel>Metrics</FieldLabel>
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricBox
                label="Max Clock-In Radius"
                value={
                  apiDetail?.clockInRadius
                    ? `${apiDetail.clockInRadius}${/mi|ft|m/i.test(apiDetail.clockInRadius) ? "" : " MI"}`
                    : "—"
                }
              />
              <MetricBox
                label="Payment Terms"
                value={apiDetail?.paymentTerms ?? "—"}
              />
              <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
                <p className="mb-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  Requires PO
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {apiDetail?.requiresPo ? "Yes" : "No"}
                  </p>
                  <ChevronDownIcon className="shrink-0 text-[#959597]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* ── detail cards — Figma ~18px gaps ── */}
      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">

        <SectionPanel icon={<LightningIcon />} title="Documents" meta={`${docRows.length} Documents`}>
          {docRows.map((doc) => (
            <DetailRow
              key={doc.id}
              title={doc.title}
              trailing={doc.subtitle}
              trailingTone="muted"
              menu={
                <RowMenu items={[
                  {
                    id: "view",
                    label: "View",
                    onSelect: () => {
                      if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
                      else toastApiError(new Error("No document URL"));
                    },
                  },
                  {
                    id: "dl",
                    label: "Download",
                    onSelect: () => {
                      if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
                      else toastApiError(new Error("No document URL"));
                    },
                  },
                  {
                    id: "replace",
                    label: "Replace URL",
                    onSelect: () => {
                      const next = window.prompt(
                        "New document URL",
                        doc.url ?? "",
                      );
                      if (next == null) return;
                      void (async () => {
                        try {
                          await crmApi.updateCustomerDocument(customerId, doc.id, {
                            url: next.trim() || null,
                          });
                          toastSuccess("Document updated");
                          await reloadCustomer();
                        } catch (err) {
                          toastApiError(err);
                        }
                      })();
                    },
                  },
                  {
                    id: "expiry",
                    label: "Set Expiry Reminder",
                    onSelect: () => {
                      const next = window.prompt(
                        "Expiry date (YYYY-MM-DD)",
                        doc.expiresAt?.slice(0, 10) ?? "",
                      );
                      if (next == null) return;
                      void (async () => {
                        try {
                          await crmApi.updateCustomerDocument(customerId, doc.id, {
                            expiresAt: next.trim()
                              ? new Date(`${next.trim()}T12:00:00`).toISOString()
                              : null,
                          });
                          toastSuccess("Expiry saved");
                          await reloadCustomer();
                        } catch (err) {
                          toastApiError(err);
                        }
                      })();
                    },
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    destructive: true,
                    onSelect: () => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm("Delete this document?")
                      ) {
                        return;
                      }
                      void (async () => {
                        try {
                          await crmApi.deleteCustomerDocument(
                            customerId,
                            doc.id,
                          );
                          toastSuccess("Document deleted");
                          await reloadCustomer();
                        } catch (err) {
                          toastApiError(err);
                        }
                      })();
                    },
                  },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Contacts" meta={`${contactRows.length} Contacts`}>
          {contactRows.map((contact) => (
            <DetailRow
              key={contact.id}
              title={
                <>
                  {contact.name}
                  <span> · {contact.role}</span>
                </>
              }
              trailing={
                <span
                  className={`font-sans text-[11px] uppercase tracking-[-0.02em] ${
                    contact.badge === "Primary" ? "font-[510] text-[#FDFDFF]" : "text-[#959597]"
                  }`}
                >
                  {contact.badge}
                </span>
              }
              menu={
                <RowMenu items={[
                  { id: "open", label: "Open Contact", onSelect: () => router.push(`/crm/contacts/${contact.id}`) },
                  { id: "edit", label: "Edit Contact", onSelect: () => router.push(`/crm/contacts/${contact.id}/edit`) },
                  {
                    id: "primary",
                    label: "Set as Primary",
                    onSelect: () => void handleSetPrimary(contact.id),
                  },
                  { id: "log", label: "Log Activity", onSelect: () => router.push("/crm/sales/new") },
                  {
                    id: "email",
                    label: "Email",
                    onSelect: () => {
                      void logContactChannel({
                        type: "EMAIL",
                        contactId: contact.id,
                        customerId: customerId || c.id,
                        email: contact.email,
                        label: contact.name,
                      });
                    },
                  },
                  {
                    id: "remove",
                    label: "Remove from Customer",
                    destructive: true,
                    onSelect: () => void handleRemoveContact(contact.id, contact.name),
                  },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Locations / Wells" meta={`${locationRows.length} Locations`}>
          {locationRows.map((loc) => (
            <DetailRow
              key={loc.id}
              title={
                <>
                  {loc.name}
                  <span> · {loc.detail}</span>
                </>
              }
              trailing={<DashboardBadge variant="success" pill>{loc.status}</DashboardBadge>}
              menu={
                <RowMenu items={[
                  { id: "open", label: "Open Location", onSelect: () => router.push("/crm/locations") },
                  { id: "edit", label: "Edit Location", onSelect: () => router.push(`/crm/locations/${loc.id}/edit`) },
                  { id: "geofence", label: "Set Geofence Radius", onSelect: () => router.push("/crm/route-rules") },
                  { id: "workorders", label: "View Work Orders Here", onSelect: () => router.push("/operations/work-orders") },
                  {
                    id: "deactivate",
                    label: "Deactivate Location",
                    destructive: true,
                    onSelect: () => void handleDeactivateLocation(loc.id),
                  },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Pricing"
          meta={`${pricingRows.length} Active Rules`}
        >
          {pricingRows.map((rule) => (
            <DetailRow
              key={rule.id}
              title={rule.title}
              trailing={rule.trailing}
              trailingTone="strong"
              menu={
                <RowMenu items={[
                  { id: "edit", label: "Edit Rate", onSelect: () => router.push(`/crm/pricing-rules/${rule.id}/edit`) },
                  { id: "duplicate", label: "Duplicate Rule", onSelect: () => router.push("/crm/pricing-rules/new") },
                  { id: "history", label: "View History", onSelect: () => router.push("/crm/pricing-rules") },
                  {
                    id: "delete",
                    label: "Delete Rule",
                    destructive: true,
                    onSelect: () => void handleDeletePricingRule(rule.id),
                  },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Required Forms"
          meta={`${formRows.length} Rules`}
        >
          {formRows.map((form) => (
            <DetailRow key={form.id} title={form.title} trailing={form.detail} />
          ))}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Route / GPS"
          meta={`${routeRows.length} Rules`}
        >
          {routeRows.map((route) => (
            <DetailRow key={route.id} title={route.name} trailing={route.detail} />
          ))}
        </SectionPanel>

        </div>

        <SectionPanel
          icon={<LightningIcon />}
          title="Quotes"
          meta={`${ticketRows.length} Recent`}
        >
          {ticketRows.map((t) => (
            <DetailRow
              key={t.id}
              title={
                <>
                  {t.title}
                  <span> · {t.subtitle}</span>
                </>
              }
              trailing={
                <span className="inline-flex items-center gap-3">
                  <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {t.amount}
                  </span>
                  <DashboardBadge variant={t.status.variant} pill>
                    {t.status.label}
                  </DashboardBadge>
                </span>
              }
            />
          ))}
        </SectionPanel>
      </div>

      <SectionPanel
        icon={<LightningIcon />}
        title="Activities"
        meta={`${woTotal} Recent`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {[
                  { id: "date", label: "Activity Date" },
                  { id: "wo", label: "Activity Code" },
                  { id: "customer", label: "Customer" },
                  { id: "category", label: "Type" },
                  { id: "clock", label: "Duration / Outcome" },
                  { id: "hours", label: "Subject" },
                  { id: "status", label: "Status" },
                  { id: "actions", label: "" },
                ].map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-3 text-left font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]"
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityPageRows.map((wo) => (
                <tr key={wo.id}>
                  <td className="max-w-[110px] px-3 py-3">
                    <span className="block truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]" title={wo.serviceDate}>
                      {wo.serviceDate}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => router.push(`/crm/sales/${wo.id}`)}
                      className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:opacity-70"
                    >
                      {wo.woNumber}
                    </button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {wo.customer}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <DashboardBadge variant={wo.category.variant} pill>
                      {wo.category.label}
                    </DashboardBadge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {wo.clockIn} · {wo.clockOut}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {wo.hours}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <DashboardBadge variant={wo.status.variant} pill>
                      {wo.status.label}
                    </DashboardBadge>
                  </td>
                  <td className="px-3 py-3">
                    <RowMenu items={[
                      {
                        id: "view",
                        label: "View Activity",
                        onSelect: () => router.push(`/crm/sales/${wo.id}`),
                      },
                      {
                        id: "edit",
                        label: "Edit Activity",
                        onSelect: () => router.push(`/crm/sales/${wo.id}/edit`),
                      },
                      {
                        id: "approve",
                        label: "Approve",
                        onSelect: () => toastSuccess(`Approve logged for ${wo.woNumber}`),
                      },
                      {
                        id: "flag",
                        label: "Flag Issue",
                        destructive: true,
                        onSelect: () => toastSuccess(`Flag logged for ${wo.woNumber}`),
                      },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-divider px-4 py-3">
          <DashboardPagination
            page={woPage}
            pageSize={woPageSize}
            total={woTotal}
            onPageChange={setWoPage}
            onPageSizeChange={setWoPageSize}
          />
        </div>
      </SectionPanel>

    </div>
  );
}
