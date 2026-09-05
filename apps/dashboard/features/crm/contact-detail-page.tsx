"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardRowActionMenu,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import {
  CONTACT_DETAIL,
  CONTACT_RELATED,
  CONTACT_ACTIVITY,
  CONTACT_NOTES,
  CONTACT_CUSTOMERS,
  CONTACT_DETAIL_TABS,
  type ContactDetailTab,
} from "./data/contacts.mock";

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function GlassBtn({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "inline-flex h-8 items-center rounded-full border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function Panel({
  title,
  children,
  className,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl bg-panel ${className ?? ""}`}
    >
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </p>
      </div>
      <div className="flex-1 px-4 pb-4 sm:px-5">{children}</div>
      {footer ? (
        <div className="flex justify-end px-4 pb-4 sm:px-5">{footer}</div>
      ) : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 font-sans text-[10px] uppercase leading-none tracking-[-0.01em] text-[#959597]">
        {label}
      </p>
      <p
        className="truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#FDFDFF]"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function ContactDetailPage({ contactId }: { contactId: string }) {
  void contactId;
  const router = useRouter();
  const contact = CONTACT_DETAIL;
  const [tab, setTab] = React.useState<ContactDetailTab>("overview");

  return (
    <div className="space-y-[18px] overflow-x-hidden bg-shell p-3 sm:p-4">
      {/* top actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <GlassBtn>Previous Contact</GlassBtn>
          <GlassBtn>Next Contact</GlassBtn>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GlassBtn>Send Email</GlassBtn>
          <GlassBtn href={`/crm/contacts/new`}>Edit Contact</GlassBtn>
          <GlassBtn href={`/crm/quotes/new?customer=${encodeURIComponent(contact.customer)}`}>
            Create Quote
          </GlassBtn>
          <Link href="/crm/sales/new" className="inline-flex shrink-0">
            <DashboardToolbarButton
              variant="primary"
              leftIcon={<ClipboardIcon className="shrink-0" />}
              className="!rounded-full"
            >
              Log Activity
            </DashboardToolbarButton>
          </Link>
        </div>
      </div>

      {/* title */}
      <div>
        <h1 className="inline-block border-b border-[#FDFDFF] pb-1 font-sans text-[20px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[24px]">
          Contact · {contact.name}
        </h1>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {CONTACT_DETAIL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
                active
                  ? "bg-[#FDFDFF] text-[#0D0D0D]"
                  : "text-[#959597] hover:text-[#FDFDFF]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* status row */}
      <div className="flex flex-wrap items-center gap-3">
        <DashboardBadge variant="success" pill>
          {contact.badge}
        </DashboardBadge>
        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {contact.customer} · {contact.customerStatus}
        </span>
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          {/* Contact Details — spans 2 cols on large */}
          <Panel title="Contact Details" className="lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contact.avatar}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-sans text-[14px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                  {contact.fullName}
                </p>
                <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {contact.role}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
              <DetailField label="Customer" value={contact.customer} />
              <DetailField label="Email" value={contact.email} />
              <DetailField label="Phone" value={contact.phone} />
              <DetailField label="Mobile" value={contact.mobile} />
              <DetailField label="Location" value={contact.location} />
              <DetailField label="Preferred" value={contact.preferred} />
            </div>
          </Panel>

          {/* Related */}
          <Panel title="Related">
            <div className="space-y-3">
              {CONTACT_RELATED.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {r.label}
                  </span>
                  <span
                    className={`shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] ${
                      r.highlight
                        ? "font-[510] text-[#ACEBCE]"
                        : "text-[#FDFDFF]"
                    }`}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent Activity */}
          <Panel title="Recent Activity">
            <div className="space-y-2.5">
              {CONTACT_ACTIVITY.map((a) => (
                <p
                  key={a.id}
                  className="font-sans text-[11px] uppercase leading-[1.45] tracking-[-0.02em] text-[#959597]"
                >
                  {a.code}
                  {" · "}
                  {a.type}
                  {" · "}
                  {a.date}
                  {" · "}
                  {a.subject}
                  {a.status ? ` · ${a.status}` : ""}
                </p>
              ))}
              <button
                type="button"
                className="pt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-70"
              >
                + 4 More
              </button>
            </div>
          </Panel>

          {/* Notes */}
          <Panel title="Notes">
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
              {CONTACT_NOTES}
            </p>
          </Panel>

          {/* Customers */}
          <Panel
            title="Customers"
            footer={
              <GlassBtn href="/crm/accounts/new">Add New Customer</GlassBtn>
            }
          >
            <div className="space-y-1">
              {CONTACT_CUSTOMERS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/crm/accounts/${c.id}`)}
                    className="min-w-0 flex-1 truncate text-left font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-70"
                  >
                    {c.name}
                  </button>
                  {c.primary ? (
                    <DashboardBadge variant="success" pill>
                      Primary
                    </DashboardBadge>
                  ) : null}
                  <DashboardRowActionMenu
                    items={[
                      {
                        id: "open",
                        label: "Open Customer",
                        onSelect: () => router.push(`/crm/accounts/${c.id}`),
                      },
                      { id: "primary", label: "Set as Primary" },
                      {
                        id: "remove",
                        label: "Remove",
                        destructive: true,
                      },
                    ]}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : (
        <div className="rounded-xl bg-panel px-5 py-10 text-center">
          <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
            {CONTACT_DETAIL_TABS.find((t) => t.id === tab)?.label} — coming soon
          </p>
        </div>
      )}
    </div>
  );
}
