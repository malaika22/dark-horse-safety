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
import {
  CUSTOMER_DETAIL,
  CUSTOMER_DETAIL_KPI,
  CUSTOMER_DOCUMENTS,
  CUSTOMER_CONTACTS,
  CUSTOMER_LOCATIONS,
  CUSTOMER_PRICING,
  CUSTOMER_FORMS,
  CUSTOMER_ROUTE_GPS,
  CUSTOMER_SALES_TICKETS,
  CUSTOMER_WORK_ORDERS,
} from "./data/customer-detail.mock";

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
function PageMenu({ customerId }: { customerId: string }) {
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
            onSelect: () => router.push("/crm/accounts/new"),
          },
          { id: "netsuite", label: "View in NetSuite" },
          { id: "print", label: "Print Summary" },
          { id: "archive", label: "Archive Customer", destructive: true },
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
  const c = CUSTOMER_DETAIL;
  const [woPage, setWoPage] = React.useState(1);
  const [woPageSize, setWoPageSize] = React.useState(25);
  const woTotal = 142;
  const woRows = CUSTOMER_WORK_ORDERS;

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
            <PageMenu customerId={customerId || c.id} />
            <ToolbarBtn>Previous</ToolbarBtn>
            <ToolbarBtn>Next</ToolbarBtn>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          {CUSTOMER_DETAIL_KPI.map((cell) => (
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
            <div><FieldLabel>Status</FieldLabel><DisplayInput value="Active" /></div>
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
              <MetricBox label="Max Clock-In Radius" value={`${c.radiusMiles} MI`} />
              <MetricBox label="Min Billable Block" value="15 MIN" />
              <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
                <p className="mb-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  Auto-Flag No-Show
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    After 30 Mins
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

        <SectionPanel icon={<LightningIcon />} title="Documents" meta="3 Documents">
          {CUSTOMER_DOCUMENTS.map((doc) => (
            <DetailRow
              key={doc.id}
              title={doc.title}
              trailing={doc.subtitle}
              trailingTone="muted"
              menu={
                <RowMenu items={[
                  { id: "view", label: "View" },
                  { id: "dl", label: "Download" },
                  { id: "replace", label: "Replace" },
                  { id: "expiry", label: "Set Expiry Reminder" },
                  { id: "delete", label: "Delete", destructive: true },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Contacts" meta="3 Contacts">
          {CUSTOMER_CONTACTS.map((contact) => (
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
                  { id: "edit", label: "Edit Contact", onSelect: () => router.push("/crm/contacts/new") },
                  { id: "primary", label: "Set as Primary" },
                  { id: "log", label: "Log Activity", onSelect: () => router.push("/crm/sales/new") },
                  { id: "email", label: "Email" },
                  { id: "remove", label: "Remove from Customer", destructive: true },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Locations / Wells" meta="12 Wells · 9 Active">
          {CUSTOMER_LOCATIONS.map((loc) => (
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
                  { id: "deactivate", label: "Deactivate Location", destructive: true },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Pricing" meta="3 Active Rules">
          {CUSTOMER_PRICING.map((rule) => (
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
                  { id: "delete", label: "Delete Rule", destructive: true },
                ]} />
              }
            />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Required Forms" meta="V3 · 3 Rules">
          {CUSTOMER_FORMS.map((form) => (
            <DetailRow key={form.id} title={form.title} trailing={form.detail} />
          ))}
        </SectionPanel>

        <SectionPanel icon={<LightningIcon />} title="Route / GPS" meta="GPS Required · 8 Sites">
          {CUSTOMER_ROUTE_GPS.map((route) => (
            <DetailRow key={route.id} title={route.name} trailing={route.detail} />
          ))}
        </SectionPanel>

        </div>

        <SectionPanel icon={<LightningIcon />} title="Sales Tickets" meta="3 Recent">
          {CUSTOMER_SALES_TICKETS.map((t) => (
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

      <SectionPanel icon={<LightningIcon />} title="Work Orders">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {[
                  { id: "date", label: "Service Date" },
                  { id: "wo", label: "WO Number" },
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
              {woRows.map((wo) => (
                <tr key={wo.id}>
                  <td className="max-w-[110px] px-3 py-3">
                    <span className="block truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]" title={wo.serviceDate}>
                      {wo.serviceDate}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      2026
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push("/operations/work-orders")}
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
                      {wo.clockIn} - {wo.clockOut}
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
                      { id: "view", label: "View Work Order", onSelect: () => router.push("/operations/work-orders") },
                      { id: "edit", label: "Edit Work Order", onSelect: () => router.push("/operations/work-orders/new") },
                      { id: "approve", label: "Approve" },
                      { id: "flag", label: "Flag Issue", destructive: true },
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
