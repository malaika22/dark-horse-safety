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
import { crmApi, type CrmCustomerDetail, type CrmWorkOrder } from "@/lib/crm-api";
import { logContactChannel } from "@/lib/crm-activity-log";
import { formatKpiValue } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  CrmDetailStateGate,
  CrmEmptyTabState,
} from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import { CustomerSiteLocationPanel } from "@/features/crm/customer-site-location";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
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

/** Building / company mark for entity identity. */
function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20V8.5L12 4l8 4.5V20H4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 20v-5h6v5M9 10h.01M12 10h.01M15 10h.01M9 13.5h.01M12 13.5h.01M15 13.5h.01"
        stroke="currentColor"
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 ${className ?? ""}`}
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

function ToggleSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
      }`}
    >
      <span
        className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
          checked ? "translate-x-[18px] bg-[#1A1A1A]" : "translate-x-1 bg-[#959597]"
        }`}
      />
    </button>
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
  const { askConfirm, askPrompt, dialogs } = useCrmDialogs();
  const [detail, setDetail] = React.useState<CustomerDetail>(EMPTY_DETAIL);
  const [apiDetail, setApiDetail] = React.useState<CrmCustomerDetail | null>(null);
  const [workOrders, setWorkOrders] = React.useState<CrmWorkOrder[]>([]);
  const [woTotal, setWoTotal] = React.useState(0);
  const [woStats, setWoStats] = React.useState({ open: 0, scheduled: 0, inProgress: 0 });
  const [woPage, setWoPage] = React.useState(1);
  const [woPageSize, setWoPageSize] = React.useState(25);
  const [neighborIds, setNeighborIds] = React.useState<string[]>([]);
  const [quoteMenuOpen, setQuoteMenuOpen] = React.useState(false);
  const quoteBtnRef = React.useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
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
        if (!cancelled) {
          setApiDetail(null);
          setLoadError(err instanceof Error ? err.message : "Couldn't load customer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (customerId) void load();
    return () => {
      cancelled = true;
    };
  }, [customerId, reloadKey]);

  React.useEffect(() => {
    setWoPage(1);
  }, [customerId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listWorkOrders({
          customerId,
          page: woPage,
          pageSize: woPageSize,
          sort: "serviceDate",
          direction: "desc",
        });
        if (cancelled) return;
        setWorkOrders(res.data.items ?? []);
        setWoTotal(res.data.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          setWorkOrders([]);
          setWoTotal(0);
          toastApiError(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, woPage, woPageSize, reloadKey]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listWorkOrders({
          customerId,
          page: 1,
          pageSize: 200,
          sort: "serviceDate",
          direction: "desc",
        });
        if (cancelled) return;
        const items = res.data.items ?? [];
        const closed = new Set(["COMPLETE", "COMPLETED", "CLOSED", "CANCELLED", "CANCELED", "ARCHIVED"]);
        const scheduledSet = new Set(["SCHEDULED", "PENDING", "DRAFT", "OPEN", "NEEDS_REVIEW"]);
        let scheduled = 0;
        let inProgress = 0;
        let open = 0;
        for (const wo of items) {
          const s = (wo.status ?? "").toUpperCase();
          if (closed.has(s)) continue;
          open += 1;
          if (s === "IN_PROGRESS") inProgress += 1;
          else if (scheduledSet.has(s) || !s) scheduled += 1;
          else scheduled += 1;
        }
        setWoStats({ open, scheduled, inProgress });
      } catch {
        if (!cancelled) setWoStats({ open: 0, scheduled: 0, inProgress: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, reloadKey]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listCustomers({
          page: 1,
          pageSize: 200,
          sort: "name",
          direction: "asc",
        });
        if (cancelled) return;
        setNeighborIds((res.data.items ?? []).map((row) => row.id));
      } catch {
        if (!cancelled) setNeighborIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const ok = await askConfirm({
      title: "Archive customer",
      description: "Archive this customer? They will be removed from active lists.",
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
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
    const ok = await askConfirm({
      title: "Remove contact",
      description: `Remove ${name} from this customer?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveContact(contactId);
      toastSuccess("Contact removed");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDeactivateLocation(locationId: string) {
    const ok = await askConfirm({
      title: "Deactivate location",
      description: "Deactivate this location? It will be removed from active lists.",
      confirmLabel: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveLocation(locationId);
      toastSuccess("Location deactivated");
      await reloadCustomer();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDeletePricingRule(ruleId: string) {
    const ok = await askConfirm({
      title: "Delete pricing rule",
      description: "Delete this pricing rule? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
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
    if (
      ["ACTIVE", "COMPLETE", "COMPLETED", "SUBMITTED", "WON", "SENT", "MET", "APPROVED"].includes(
        s,
      )
    ) {
      return "success";
    }
    if (["PENDING", "NEEDS_REVIEW", "DRAFT", "OPEN", "SCHEDULED"].includes(s)) {
      return "warning";
    }
    if (["IN_PROGRESS", "BILLABLE"].includes(s)) return "offline";
    if (
      [
        "INACTIVE",
        "ARCHIVED",
        "EXPIRED",
        "LOST",
        "ON_HOLD",
        "MISSING",
        "MISSING_OUT",
        "CANCELLED",
        "CANCELED",
      ].includes(s)
    ) {
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

  function formatClock(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatHours(start?: string | null, end?: string | null) {
    if (!start || !end) return "—";
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return "—";
    return (Math.round(((b - a) / 3_600_000) * 10) / 10).toFixed(1);
  }

  async function handleToggleClockInRadius(next: boolean) {
    try {
      const radius = next
        ? (apiDetail?.clockInRadius?.trim() || detail.radiusMiles || "5 MI")
        : null;
      await crmApi.updateCustomer(customerId, { clockInRadius: radius });
      setApiDetail((prev) => (prev ? { ...prev, clockInRadius: radius } : prev));
      setDetail((prev) => ({
        ...prev,
        maxClockInRadius: next,
        radiusMiles: next ? (radius ?? prev.radiusMiles) : prev.radiusMiles,
      }));
      toastSuccess(next ? "Max clock-in radius enabled" : "Max clock-in radius disabled");
    } catch (err) {
      toastApiError(err);
    }
  }

  const c = detail;
  const neighborIndex = neighborIds.indexOf(customerId);
  const prevCustomerId =
    neighborIndex > 0 ? neighborIds[neighborIndex - 1] : null;
  const nextCustomerId =
    neighborIndex >= 0 && neighborIndex < neighborIds.length - 1
      ? neighborIds[neighborIndex + 1]
      : null;
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
  const activeLocations = locationRows.filter(
    (loc) => (loc.status ?? "").toUpperCase() === "ACTIVE",
  ).length;
  const inactiveLocations = Math.max(0, locationRows.length - activeLocations);
  const requirementRows = (apiDetail?.requirements ?? []).map((req) => ({
    id: req.id,
    title: req.name,
    detail: [
      req.requirementType,
      req.enforcementLevel ? titleCaseStatus(req.enforcementLevel) : null,
      req.status ? titleCaseStatus(req.status) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    status: req.status,
  }));
  const needsReviewReqs = requirementRows.filter((req) => {
    const s = (req.status ?? "").toUpperCase();
    return s === "NEEDS_REVIEW" || s === "PENDING" || s === "OPEN" || s === "DRAFT";
  }).length;
  const siteLocation =
    (apiDetail?.locations ?? []).find(
      (loc) => loc.latitude != null && loc.longitude != null,
    ) ?? apiDetail?.locations?.[0] ?? null;

  async function persistSiteCoords(lat: number, lng: number) {
    try {
      if (!siteLocation?.id) {
        const created = await crmApi.createLocation({
          customerId,
          name: `${apiDetail?.name ?? "Customer"} Site`,
          latitude: lat,
          longitude: lng,
          gpsRequired: true,
          geofenceRadius: apiDetail?.clockInRadius ?? undefined,
          status: "ACTIVE",
        });
        setApiDetail((prev) =>
          prev
            ? {
                ...prev,
                locations: [...(prev.locations ?? []), created.data],
              }
            : prev,
        );
        toastSuccess("Site location created");
        return;
      }
      await crmApi.updateLocation(siteLocation.id, {
        latitude: lat,
        longitude: lng,
      });
      setApiDetail((prev) => {
        if (!prev?.locations) return prev;
        return {
          ...prev,
          locations: prev.locations.map((loc) =>
            loc.id === siteLocation.id
              ? { ...loc, latitude: lat, longitude: lng }
              : loc,
          ),
        };
      });
    } catch (err) {
      toastApiError(err);
    }
  }

  async function persistSitePlace(place: {
    county?: string | null;
    state?: string | null;
  }) {
    try {
      if (!siteLocation?.id) {
        if (place.county == null && place.state == null) return;
        const created = await crmApi.createLocation({
          customerId,
          name: `${apiDetail?.name ?? "Customer"} Site`,
          county: place.county ?? undefined,
          state: place.state ?? undefined,
          gpsRequired: true,
          geofenceRadius: apiDetail?.clockInRadius ?? undefined,
          status: "ACTIVE",
        });
        setApiDetail((prev) =>
          prev
            ? {
                ...prev,
                locations: [...(prev.locations ?? []), created.data],
              }
            : prev,
        );
        return;
      }
      await crmApi.updateLocation(siteLocation.id, {
        ...(place.county != null ? { county: place.county } : {}),
        ...(place.state != null ? { state: place.state } : {}),
      });
      setApiDetail((prev) => {
        if (!prev?.locations) return prev;
        return {
          ...prev,
          locations: prev.locations.map((loc) =>
            loc.id === siteLocation.id
              ? {
                  ...loc,
                  county: place.county ?? loc.county,
                  state: place.state ?? loc.state,
                }
              : loc,
          ),
        };
      });
    } catch (err) {
      toastApiError(err);
    }
  }

  async function persistSiteRadius(miles: number, label?: string) {
    const nextLabel =
      label ?? `${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)} MI`;
    try {
      await crmApi.updateCustomer(customerId, { clockInRadius: nextLabel });
      if (siteLocation?.id) {
        await crmApi.updateLocation(siteLocation.id, {
          geofenceRadius: nextLabel,
        });
      } else {
        const created = await crmApi.createLocation({
          customerId,
          name: `${apiDetail?.name ?? "Customer"} Site`,
          geofenceRadius: nextLabel,
          gpsRequired: true,
          status: "ACTIVE",
        });
        setApiDetail((prev) =>
          prev
            ? {
                ...prev,
                clockInRadius: nextLabel,
                locations: [...(prev.locations ?? []), created.data],
              }
            : prev,
        );
        setDetail((prev) => ({
          ...prev,
          maxClockInRadius: true,
          radiusMiles: nextLabel,
        }));
        return;
      }
      setApiDetail((prev) =>
        prev
          ? {
              ...prev,
              clockInRadius: nextLabel,
              locations: prev.locations?.map((loc) =>
                siteLocation && loc.id === siteLocation.id
                  ? { ...loc, geofenceRadius: nextLabel }
                  : loc,
              ),
            }
          : prev,
      );
      setDetail((prev) => ({
        ...prev,
        maxClockInRadius: true,
        radiusMiles: nextLabel,
      }));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function persistOpsMetrics(patch: {
    clockInRadius?: string;
    minBillableBlock?: string;
    autoFlagNoShow?: string;
  }) {
    try {
      await crmApi.updateCustomer(customerId, patch);
      setApiDetail((prev) =>
        prev
          ? {
              ...prev,
              ...(patch.clockInRadius !== undefined
                ? { clockInRadius: patch.clockInRadius }
                : {}),
              ...(patch.minBillableBlock !== undefined
                ? { minBillableBlock: patch.minBillableBlock }
                : {}),
              ...(patch.autoFlagNoShow !== undefined
                ? { autoFlagNoShow: patch.autoFlagNoShow }
                : {}),
            }
          : prev,
      );
      if (patch.clockInRadius) {
        setDetail((prev) => ({
          ...prev,
          maxClockInRadius: true,
          radiusMiles: patch.clockInRadius!,
        }));
      }
    } catch (err) {
      toastApiError(err);
    }
  }

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
  const workOrderRows = workOrders.map((wo) => ({
    id: wo.id,
    serviceDate: formatDate(wo.serviceDate ?? wo.scheduledStart ?? wo.createdAt),
    woNumber: wo.workOrderNumber || wo.code || "—",
    customer: wo.customer?.name ?? c.name,
    category: {
      label: titleCaseStatus(wo.category || "Billable"),
      variant: statusVariant(wo.category || "BILLABLE"),
    },
    clockIn: formatClock(wo.scheduledStart),
    clockOut: formatClock(wo.scheduledEnd),
    hours: formatHours(wo.scheduledStart, wo.scheduledEnd),
    status: {
      label: titleCaseStatus(wo.status || "Pending"),
      variant: statusVariant(wo.status || "PENDING"),
    },
  }));
  const openJobsValue =
    apiDetail?.openJobs != null ? Number(apiDetail.openJobs) : woStats.open;
  const kpiCells: KpiCell[] = [
    {
      title: "Open Jobs",
      value: formatKpiValue(openJobsValue),
      meta: `${woStats.scheduled} Scheduled · ${woStats.inProgress} In Progress`,
      icon: "folder",
    },
    {
      title: "Locations / Wells",
      value: String(locationRows.length),
      meta: `${activeLocations} Active · ${inactiveLocations} Inactive`,
      icon: "gps",
    },
    {
      title: "Requirements",
      value: String(requirementRows.length),
      meta: `${needsReviewReqs} Need Review`,
      icon: "document",
    },
  ];

  useSetHeaderBreadcrumb(
    apiDetail?.name
      ? `CRM / Customers / ${apiDetail.name}`
      : "CRM / Customers / Detail",
  );

  useSetHeaderActions(
    apiDetail ? (
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
        <Link href="/crm/accounts" className="inline-flex shrink-0">
          <DashboardToolbarButton>Back</DashboardToolbarButton>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/operations/work-orders/new?customerId=${encodeURIComponent(customerId || c.id)}`}
            className="inline-flex shrink-0"
          >
            <DashboardToolbarButton>Create Work Order</DashboardToolbarButton>
          </Link>
          <div className="relative">
            <DashboardToolbarButton
              ref={quoteBtnRef}
              variant="primary"
              leftIcon={<QuoteGridIcon className="shrink-0" />}
              showChevron
              onClick={() => setQuoteMenuOpen((o) => !o)}
            >
              Create Quote
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={quoteMenuOpen}
              onClose={() => setQuoteMenuOpen(false)}
              anchorRef={quoteBtnRef}
              align="right"
              className="min-w-[200px]"
              items={[
                {
                  id: "new-quote",
                  label: "New Quote",
                  onSelect: () =>
                    router.push(
                      `/crm/quotes/new?customer=${encodeURIComponent(c.name)}&customerId=${encodeURIComponent(customerId || c.id)}`,
                    ),
                },
                {
                  id: "from-pricing",
                  label: "From Pricing Rules",
                  onSelect: () =>
                    router.push(
                      `/crm/quotes/new?customer=${encodeURIComponent(c.name)}&customerId=${encodeURIComponent(customerId || c.id)}`,
                    ),
                },
                {
                  id: "view-quotes",
                  label: "View All Quotes",
                  onSelect: () =>
                    router.push(
                      `/crm/quotes?customerId=${encodeURIComponent(customerId || c.id)}`,
                    ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    ) : null,
    [
      apiDetail,
      customerId,
      c.id,
      c.name,
      quoteMenuOpen,
    ],
  );

  if (loading || loadError || !apiDetail) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={loadError}
        missing={!loading && !apiDetail && !loadError}
        missingTitle="Customer Not Found"
        missingDescription="This customer could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  return (
    <div className="space-y-[18px] overflow-x-hidden bg-shell p-3 sm:p-4">

      {/* ── entity identity card ── */}
      <div className="overflow-hidden rounded-xl bg-panel">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
              <BuildingIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-sans text-[15px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[17px]">
                  {c.name}
                </h2>
                <DashboardBadge variant={c.status.variant} pill>
                  {c.status.label}
                </DashboardBadge>
              </div>
              <p className="mt-2 truncate font-sans text-[10px] uppercase leading-[1.35] tracking-[-0.01em] text-[#959597] sm:text-[11px]">
                <span>{c.code}</span>
                <span aria-hidden> · </span>
                <span>Account Owner: {c.accountOwner}</span>
                <span aria-hidden> · </span>
                <span>{c.email}</span>
                <span aria-hidden> · </span>
                <span>{c.phone}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <PageMenu
              customerId={customerId || c.id}
              netsuiteId={apiDetail.netsuiteId}
              email={apiDetail.email}
              onArchive={() => void handleArchiveCustomer()}
              onDuplicate={() => void handleDuplicateCustomer()}
            />
            <ToolbarBtn
              className={!prevCustomerId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (prevCustomerId) router.push(`/crm/accounts/${prevCustomerId}`);
              }}
            >
              Previous
            </ToolbarBtn>
            <ToolbarBtn
              className={!nextCustomerId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (nextCustomerId) router.push(`/crm/accounts/${nextCustomerId}`);
              }}
            >
              Next
            </ToolbarBtn>
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
      <SectionPanel
        icon={<LightningIcon />}
        title="Company Details"
        action={
          <button
            type="button"
            onClick={() => router.push(`/crm/accounts/${customerId || c.id}/edit`)}
            className="inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            Edit Details
          </button>
        }
      >
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
              <ToggleSwitch
                checked={c.maxClockInRadius}
                onCheckedChange={(next) => void handleToggleClockInRadius(next)}
              />
              <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Max Clock-In Radius
              </span>
            </div>
          </div>

          <div className="border-t border-divider pt-4">
            <CustomerSiteLocationPanel
              latitude={siteLocation?.latitude}
              longitude={siteLocation?.longitude}
              radiusRaw={apiDetail?.clockInRadius ?? siteLocation?.geofenceRadius}
              county={siteLocation?.county}
              state={siteLocation?.state}
              minBillableBlock={apiDetail?.minBillableBlock}
              autoFlagNoShow={apiDetail?.autoFlagNoShow}
              onCoordsChange={(coords) => persistSiteCoords(coords.lat, coords.lng)}
              onRadiusChange={(miles, label) => persistSiteRadius(miles, label)}
              onPlaceChange={(place) => persistSitePlace(place)}
              onMetricsChange={(patch) => persistOpsMetrics(patch)}
            />
          </div>
        </div>
      </SectionPanel>

      {/* ── detail cards — Figma ~18px gaps ── */}
      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">

        <SectionPanel icon={<LightningIcon />} title="Documents" meta={`${docRows.length} Documents`}>
          {docRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no documents for this customer."
              addLabel="Add Document"
              onAdd={() => router.push(`/crm/accounts/${customerId || c.id}/edit`)}
            />
          ) : (
            docRows.map((doc) => (
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
                      void (async () => {
                        const next = await askPrompt({
                          title: "Replace document URL",
                          label: "Document URL",
                          defaultValue: doc.url ?? "",
                          placeholder: "https://…",
                          confirmLabel: "Save",
                        });
                        if (next == null) return;
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
                      void (async () => {
                        const next = await askPrompt({
                          title: "Set expiry reminder",
                          label: "Expiry date (YYYY-MM-DD)",
                          defaultValue: doc.expiresAt?.slice(0, 10) ?? "",
                          placeholder: "YYYY-MM-DD",
                          confirmLabel: "Save",
                        });
                        if (next == null) return;
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
                      void (async () => {
                        const ok = await askConfirm({
                          title: "Delete document",
                          description: "Delete this document? This cannot be undone.",
                          confirmLabel: "Delete",
                          destructive: true,
                        });
                        if (!ok) return;
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
          ))
          )}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Contacts" meta={`${contactRows.length} Contacts`}>
          {contactRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no contacts for this customer."
              addLabel="Add Contact"
              onAdd={() =>
                router.push(
                  `/crm/contacts/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            contactRows.map((contact) => (
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
          ))
          )}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Locations / Wells" meta={`${locationRows.length} Locations`}>
          {locationRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no locations for this customer."
              addLabel="Add Location"
              onAdd={() =>
                router.push(
                  `/crm/locations/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            locationRows.map((loc) => (
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
          ))
          )}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Pricing"
          meta={`${pricingRows.length} Active Rules`}
        >
          {pricingRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no pricing rules for this customer."
              addLabel="Add Pricing Rule"
              onAdd={() =>
                router.push(
                  `/crm/pricing-rules/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            pricingRows.map((rule) => (
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
            ))
          )}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Required Forms"
          meta={`${formRows.length} Rules`}
        >
          {formRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no form rules for this customer."
              addLabel="Add Form Rule"
              onAdd={() =>
                router.push(
                  `/crm/form-rules/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            formRows.map((form) => (
              <DetailRow
                key={form.id}
                title={form.title}
                trailing={form.detail}
                menu={
                  <RowMenu
                    items={[
                      {
                        id: "edit",
                        label: "Edit Form Rule",
                        onSelect: () => router.push(`/crm/form-rules/${form.id}/edit`),
                      },
                      {
                        id: "open",
                        label: "View Form Rules",
                        onSelect: () => router.push("/crm/form-rules"),
                      },
                    ]}
                  />
                }
              />
            ))
          )}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Route / GPS"
          meta={`${routeRows.length} Rules`}
        >
          {routeRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no route / GPS rules for this customer."
              addLabel="Add Route Rule"
              onAdd={() =>
                router.push(
                  `/crm/route-rules/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            routeRows.map((route) => (
              <DetailRow
                key={route.id}
                title={route.name}
                trailing={route.detail}
                menu={
                  <RowMenu
                    items={[
                      {
                        id: "edit",
                        label: "Edit Route Rule",
                        onSelect: () => router.push(`/crm/route-rules/${route.id}/edit`),
                      },
                      {
                        id: "open",
                        label: "View Route Rules",
                        onSelect: () => router.push("/crm/route-rules"),
                      },
                    ]}
                  />
                }
              />
            ))
          )}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Sales Tickets"
          meta={`${ticketRows.length} Recent`}
        >
          {ticketRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no sales tickets for this customer."
              addLabel="Create Quote"
              onAdd={() =>
                router.push(
                  `/crm/quotes/new?customer=${encodeURIComponent(c.name)}&customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            ticketRows.map((t) => (
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
                menu={
                  <RowMenu
                    items={[
                      {
                        id: "view",
                        label: "Open Quote",
                        onSelect: () => router.push(`/crm/quotes/${t.id}`),
                      },
                      {
                        id: "edit",
                        label: "Edit Quote",
                        onSelect: () => router.push(`/crm/quotes/${t.id}/edit`),
                      },
                    ]}
                  />
                }
              />
            ))
          )}
        </SectionPanel>

        <SectionPanel
          icon={<LightningIcon />}
          title="Requirements"
          meta={`${requirementRows.length} Items`}
        >
          {requirementRows.length === 0 ? (
            <CrmEmptyTabState
              description="This tab has no requirements for this customer."
              addLabel="Add Requirement"
              onAdd={() =>
                router.push(
                  `/crm/requirements/new?customerId=${encodeURIComponent(customerId || c.id)}`,
                )
              }
            />
          ) : (
            requirementRows.map((req) => (
              <DetailRow
                key={req.id}
                title={req.title}
                trailing={req.detail}
                menu={
                  <RowMenu
                    items={[
                      {
                        id: "edit",
                        label: "Edit Requirement",
                        onSelect: () =>
                          router.push(`/crm/requirements/${req.id}/edit`),
                      },
                    ]}
                  />
                }
              />
            ))
          )}
        </SectionPanel>

        </div>
      </div>

      <SectionPanel
        icon={<LightningIcon />}
        title="Work Orders"
        meta={`${woTotal} Total`}
      >
        {workOrderRows.length === 0 ? (
          <CrmEmptyTabState
            description="This tab has no work orders for this customer."
            addLabel="Create Work Order"
            onAdd={() =>
              router.push(
                `/operations/work-orders/new?customerId=${encodeURIComponent(customerId || c.id)}`,
              )
            }
          />
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {[
                  { id: "date", label: "Service Date" },
                  { id: "wo", label: "W/O Number" },
                  { id: "customer", label: "Customer" },
                  { id: "category", label: "Category" },
                  { id: "clock", label: "Clock In/Out" },
                  { id: "hours", label: "Hours" },
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
              {workOrderRows.map((wo) => (
                <tr key={wo.id}>
                  <td className="max-w-[110px] px-3 py-3">
                    <span className="block truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]" title={wo.serviceDate}>
                      {wo.serviceDate}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => router.push(`/operations/work-orders/${wo.id}`)}
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
                        label: "View Work Order",
                        onSelect: () => router.push(`/operations/work-orders/${wo.id}`),
                      },
                      {
                        id: "edit",
                        label: "Edit Work Order",
                        onSelect: () => router.push(`/operations/work-orders/${wo.id}/edit`),
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
            onPageSizeChange={(size) => {
              setWoPageSize(size);
              setWoPage(1);
            }}
          />
        </div>
        </>
        )}
      </SectionPanel>

      {dialogs}
    </div>
  );
}
