"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardRowActionMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
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

/* company/building icon — entity header */
function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12h2M14 12h2M8 16h2M14 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

/* ── section header icons ── */
function SvgDocuments() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgContacts() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 3.5a3.5 3.5 0 010 7M21 20c0-3-1.8-5.4-4-6.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgLocations() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function SvgPricing() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgForms() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgRoute() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7v3a2 2 0 002 2h8a2 2 0 012 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgSalesTicket() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 9a1 1 0 011-1h18a1 1 0 011 1v2a2 2 0 000 4v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a2 2 0 000-4V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function SvgWorkOrders() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14h4M8 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SvgCompanyDetails() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ── toolbar button ── */
function ToolbarBtn({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/* ── "CREATE QUOTE" split button ── */
function CreateQuoteButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="relative inline-flex">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
      >
        Create Quote
        <ChevronDownIcon />
      </button>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={[
          {
            id: "new",
            label: "New Quote",
            onSelect: () => router.push("/crm/quotes/new"),
          },
          {
            id: "template",
            label: "From Template",
            onSelect: () => router.push("/crm/quotes/new"),
          },
        ]}
      />
    </div>
  );
}

/* ── page-level three-dot menu ── */
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#2D2D30] bg-[#1A1A1A] text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
      >
        <span aria-hidden className="text-[16px] leading-none">⋮</span>
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
      {/* header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#959597]">
            {icon}
          </span>
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
          {meta ? (
            <span className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
              {meta}
            </span>
          ) : null}
        </div>
        {action ?? null}
      </div>
      {/* body */}
      <div className="border-t border-divider">{children}</div>
    </div>
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
    <div className="rounded-md border border-[#2D2D30] bg-[#0D0D0D] px-2.5 py-[7px]">
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}

function DisplaySelectField({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#2D2D30] bg-[#0D0D0D] px-2.5 py-[7px]">
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </span>
      <ChevronDownIcon className="text-[#959597]" />
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
    <div className="rounded-md border border-[#2D2D30] bg-[#0D0D0D] px-2.5 py-2">
      <p className="mb-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">{label}</p>
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{value}</p>
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

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-4">

      {/* ── breadcrumb + actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          CRM / Customers / {c.name}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/crm/accounts">
            <ToolbarBtn>Back</ToolbarBtn>
          </Link>
          <Link href="/operations/work-orders/new">
            <ToolbarBtn>Create Work Order</ToolbarBtn>
          </Link>
          <CreateQuoteButton />
          <PageMenu customerId={customerId || c.id} />
        </div>
      </div>

      {/* ── entity identity card ── */}
      <div className="overflow-hidden rounded-xl border border-divider bg-panel">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          {/* left: icon + name + meta */}
          <div className="flex min-w-0 items-center gap-3">
            {/* company square icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] text-[#FDFDFF]">
              <BuildingIcon />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-sans text-[15px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[17px]">
                  {c.name}
                </h2>
                <DashboardBadge variant="success" pill>
                  {c.status.label}
                </DashboardBadge>
              </div>
              <p className="mt-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {c.code}&nbsp;·&nbsp;Account Owner: {c.accountOwner}&nbsp;·&nbsp;{c.email}&nbsp;·&nbsp;{c.phone}
              </p>
            </div>
          </div>
          {/* right: collapse chevron */}
          <button
            type="button"
            aria-label="Collapse"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
          >
            <ChevronDownIcon />
          </button>
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
      <SectionPanel icon={<SvgCompanyDetails />} title="Company Details" action={
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
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={c.maxClockInRadius} />
              <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Max Clock-In Radius
              </span>
            </div>
          </div>
          <div>
            <FieldLabel>Metrics</FieldLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricBox label="Max Clock-In Radius" value={`${c.radiusMiles} MI`} />
              <MetricBox label="Min Billable Block" value="15 MIN" />
              <MetricBox label="Auto-Flag No-Show" value="After 30 Mins" />
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* ── 2-col detail grid ── */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">

        {/* Documents */}
        <SectionPanel icon={<SvgDocuments />} title="Documents" meta={`${CUSTOMER_DOCUMENTS.length} Documents`}>
          {CUSTOMER_DOCUMENTS.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">
                {doc.title}
              </span>
              <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {doc.subtitle}
              </span>
              <RowMenu items={[
                { id: "view",    label: "View" },
                { id: "dl",      label: "Download" },
                { id: "replace", label: "Replace" },
                { id: "expiry",  label: "Set Expiry Reminder" },
                { id: "delete",  label: "Delete", destructive: true },
              ]} />
            </div>
          ))}
        </SectionPanel>

        {/* Contacts */}
        <SectionPanel
          icon={<SvgContacts />}
          title="Contacts"
          meta={`${CUSTOMER_CONTACTS.length} Contacts`}
          action={
            <ToolbarBtn onClick={() => router.push("/crm/contacts/new")}>
              Add Contact
            </ToolbarBtn>
          }
        >
          {CUSTOMER_CONTACTS.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">
                {contact.name}
                <span className="text-[#959597]"> · {contact.role}</span>
              </span>
              <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {contact.badge}
              </span>
              <RowMenu items={[
                { id: "open",    label: "Open Contact", onSelect: () => router.push(`/crm/contacts/${contact.id}`) },
                { id: "edit",    label: "Edit Contact", onSelect: () => router.push("/crm/contacts/new") },
                { id: "primary", label: "Set as Primary" },
                { id: "log",     label: "Log Activity", onSelect: () => router.push("/crm/sales/new") },
                { id: "email",   label: "Email" },
                { id: "remove",  label: "Remove from Customer", destructive: true },
              ]} />
            </div>
          ))}
        </SectionPanel>

        {/* Locations / Wells */}
        <SectionPanel
          icon={<SvgLocations />}
          title="Locations / Wells"
          meta={`${CUSTOMER_LOCATIONS.length} Wells · ${CUSTOMER_LOCATIONS.filter((l) => l.status === "Active").length} Active`}
          action={
            <ToolbarBtn onClick={() => router.push("/crm/locations/new")}>
              Add Location
            </ToolbarBtn>
          }
        >
          {CUSTOMER_LOCATIONS.map((loc) => (
            <div key={loc.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">{loc.name}</p>
                <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">{loc.detail}</p>
              </div>
              <DashboardBadge variant="success">{loc.status}</DashboardBadge>
              <RowMenu items={[
                { id: "open",       label: "Open Location", onSelect: () => router.push("/crm/locations") },
                { id: "edit",       label: "Edit Location", onSelect: () => router.push("/crm/locations/new") },
                { id: "geofence",   label: "Set Geofence Radius", onSelect: () => router.push("/crm/route-rules") },
                { id: "workorders", label: "View Work Orders Here", onSelect: () => router.push("/operations/work-orders") },
                { id: "deactivate", label: "Deactivate Location", destructive: true },
              ]} />
            </div>
          ))}
        </SectionPanel>

        {/* Pricing */}
        <SectionPanel
          icon={<SvgPricing />}
          title="Pricing"
          meta={`${CUSTOMER_PRICING.length} Active Rules`}
          action={
            <ToolbarBtn onClick={() => router.push("/crm/pricing-rules/new")}>
              Add Rule
            </ToolbarBtn>
          }
        >
          {CUSTOMER_PRICING.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">
                {rule.title}
              </span>
              <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {rule.trailing}
              </span>
              <RowMenu items={[
                { id: "edit",      label: "Edit Rate", onSelect: () => router.push("/crm/pricing-rules/new") },
                { id: "duplicate", label: "Duplicate Rule", onSelect: () => router.push("/crm/pricing-rules/new") },
                { id: "history",   label: "View History", onSelect: () => router.push("/crm/pricing-rules") },
                { id: "delete",    label: "Delete Rule", destructive: true },
              ]} />
            </div>
          ))}
        </SectionPanel>

        {/* Required Forms */}
        <SectionPanel
          icon={<SvgForms />}
          title="Required Forms"
          meta="V3 · 3 Rules"
          action={
            <ToolbarBtn onClick={() => router.push("/crm/form-rules/new")}>
              Add Form Rule
            </ToolbarBtn>
          }
        >
          {CUSTOMER_FORMS.map((form) => (
            <div key={form.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">
                {form.title}
              </span>
              <span className="shrink-0 text-right font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {form.detail}
              </span>
            </div>
          ))}
        </SectionPanel>

        {/* Route / GPS */}
        <SectionPanel
          icon={<SvgRoute />}
          title="Route / GPS"
          meta="GPS Required · 8 Sites"
          action={
            <ToolbarBtn onClick={() => router.push("/crm/route-rules/new")}>
              Add Route Rule
            </ToolbarBtn>
          }
        >
          {CUSTOMER_ROUTE_GPS.map((route) => (
            <div key={route.id} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] truncate">
                {route.name}
              </span>
              <span className="shrink-0 text-right font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597] max-w-[55%] truncate">
                {route.detail}
              </span>
            </div>
          ))}
        </SectionPanel>

      </div>

      {/* ── Sales Tickets ── */}
      <SectionPanel icon={<SvgSalesTicket />} title="Sales Tickets" meta="3 Recent"
        action={
          <button
            type="button"
            onClick={() => router.push("/operations/sales-tickets")}
            className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:opacity-70"
          >
            View All
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <tbody>
              {CUSTOMER_SALES_TICKETS.map((t) => (
                <tr key={t.id} className="border-b border-divider last:border-b-0">
                  <td className="px-4 py-2.5 w-full">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{t.title}</span>
                    <span className="ml-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">{t.subtitle}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{t.amount}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <DashboardBadge variant={t.status.variant}>{t.status.label}</DashboardBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* ── Work Orders ── */}
      <SectionPanel
        icon={<SvgWorkOrders />}
        title="Work Orders"
        action={
          <ToolbarBtn onClick={() => router.push("/operations/work-orders/new")}>
            Create Work Order
          </ToolbarBtn>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-divider">
                {["Service Date", "WO Number", "Customer", "Category", "Clock In/Out", "Hours", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CUSTOMER_WORK_ORDERS.map((wo) => (
                <tr key={wo.id} className="border-b border-divider last:border-b-0">
                  <td className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597] whitespace-nowrap">
                    {wo.serviceDate}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="mr-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">2026</span>
                    <button
                      type="button"
                      onClick={() => router.push("/operations/work-orders")}
                      className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:opacity-70"
                    >
                      {wo.woNumber}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] whitespace-nowrap">
                    {wo.customer}
                  </td>
                  <td className="px-3 py-2.5">
                    <DashboardBadge variant={wo.category.variant}>{wo.category.label}</DashboardBadge>
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] whitespace-nowrap">
                    {wo.clockIn} – {wo.clockOut}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {wo.hours}
                  </td>
                  <td className="px-3 py-2.5">
                    <DashboardBadge variant={wo.status.variant}>{wo.status.label}</DashboardBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    <RowMenu items={[
                      { id: "view",    label: "View Work Order", onSelect: () => router.push("/operations/work-orders") },
                      { id: "edit",    label: "Edit Work Order", onSelect: () => router.push("/operations/work-orders/new") },
                      { id: "approve", label: "Approve" },
                      { id: "flag",    label: "Flag Issue", destructive: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-3">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">Showing 3 of 142</span>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">Page Size: 25</span>
            <div className="flex items-center gap-1">
              {["«", "‹", "2"].map((p) => (
                <button key={p} type="button" className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1 font-sans text-[11px] text-[#959597] hover:bg-white/5">{p}</button>
              ))}
              <button type="button" className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-[#FDFDFF] px-1 font-sans text-[11px] text-[#0D0D0D]">3</button>
              <button type="button" className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1 font-sans text-[11px] text-[#959597] hover:bg-white/5">›</button>
            </div>
          </div>
        </div>
      </SectionPanel>

    </div>
  );
}
