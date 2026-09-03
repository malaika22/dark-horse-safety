"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardMenuPopover,
} from "@dark-horse-safety/ui";
import {
  CONTACT_DETAIL,
  CONTACT_RELATED,
  CONTACT_ACTIVITY,
  CONTACT_NOTES,
} from "./data/contacts.mock";

/* ── chevron ── */
function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── primary action button ── */
function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-[#2D2D30] bg-[#1A1A1A] py-2.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
    >
      {children}
    </button>
  );
}

/* ── CREATE WORK ORDER split button ── */
function CreateWOButton() {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-[#2D2D30] bg-[#1A1A1A]">
      <button type="button" className="px-3 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        Create Work Order
      </button>
      <button
        ref={anchorRef}
        type="button"
        aria-label="More options"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center border-l border-[#2D2D30] px-2 text-[#959597]"
      >
        <ChevronDownIcon />
      </button>
      <DashboardMenuPopover
        open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}
        items={[
          { id: "wo",    label: "Work Order" },
          { id: "quote", label: "Create Quote" },
        ]}
      />
    </div>
  );
}

/* ── detail field ── */
function DetailField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">{label}</p>
      <p className={`font-sans text-[11px] uppercase tracking-[-0.02em] ${muted ? "text-[#959597]" : "text-[#FDFDFF]"}`}>
        {value}
      </p>
    </div>
  );
}

/* ── page ── */
export function ContactDetailPage({ contactId }: { contactId: string }) {
  void contactId;
  const contact = CONTACT_DETAIL;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-4">

      {/* breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          CRM / Customer / Contacts
        </p>
        <CreateWOButton />
      </div>

      {/* title + badge */}
      <div>
        <h1 className="font-sans text-[22px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[26px]">
          Contact · {contact.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <DashboardBadge variant="neutral" pill={false} className="rounded-sm !border-[#2D2D30] !bg-transparent !text-[#FDFDFF] px-2 py-1">
            {contact.badge}
          </DashboardBadge>
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {contact.customer} · {contact.customerStatus}
          </span>
        </div>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_280px]">

        {/* left — Contact Details */}
        <div className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="px-4 py-4 sm:px-5">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Contact Details
            </p>
            {/* avatar + name */}
            <div className="mb-5 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contact.avatar}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="font-sans text-[13px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                  {contact.fullName}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  {contact.role}
                </p>
              </div>
            </div>
            {/* fields grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailField label="Customer" value={contact.customer} />
              <DetailField label="Email"    value={contact.email} />
              <DetailField label="Phone"    value={contact.phone} />
              <DetailField label="Mobile"   value={contact.mobile} />
              <DetailField label="Location" value={contact.location} />
              <DetailField label="Preferred" value={contact.preferred} />
            </div>
          </div>

          <div className="border-t border-divider">
            {/* Recent Activity */}
            <div className="px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Recent Activity
                </p>
                <Link href="#" className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597] hover:opacity-70">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {CONTACT_ACTIVITY.map((a) => (
                  <p key={a.id} className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    <span className="text-[#959597]">{a.code}</span>
                    {" · "}
                    {a.type}
                    {" · "}
                    <span className="text-[#959597]">{a.date}</span>
                    {" · "}
                    {a.note}
                  </p>
                ))}
                <button type="button" className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:opacity-70">
                  + 4 More
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-divider">
            {/* Notes */}
            <div className="px-4 py-4 sm:px-5">
              <p className="mb-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Notes
              </p>
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] leading-relaxed">
                {CONTACT_NOTES}
              </p>
            </div>
          </div>
        </div>

        {/* right — Related + Actions */}
        <div className="flex flex-col gap-4">

          {/* Related */}
          <div className="overflow-hidden rounded-xl border border-divider bg-panel px-4 py-4">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Related
            </p>
            <div className="space-y-3">
              {CONTACT_RELATED.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {r.label}
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="overflow-hidden rounded-xl border border-divider bg-panel px-4 py-4">
            <p className="mb-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Actions
            </p>
            <div className="space-y-2">
              <ActionBtn>Log Activity</ActionBtn>
              <ActionBtn>Create Quote</ActionBtn>
              <ActionBtn>Edit Contact</ActionBtn>
              <ActionBtn>Send Email</ActionBtn>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
