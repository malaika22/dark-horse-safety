"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardPanel,
  DashboardRowActionMenu,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { QUOTE_DETAIL, QUOTES_ROWS } from "./data/quotes.mock";
import { SendQuoteModal } from "./send-quote-modal";

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
      {children}
    </h2>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
        {value}
      </p>
    </div>
  );
}

export function QuoteDetailPage({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [sendOpen, setSendOpen] = React.useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const headerMenuRef = React.useRef<HTMLButtonElement>(null);
  const [lineMenuOpen, setLineMenuOpen] = React.useState(false);
  const lineMenuRef = React.useRef<HTMLButtonElement>(null);

  const row = QUOTES_ROWS.find((r) => r.id === quoteId);
  const quoteNumber = row?.quoteNumber ?? QUOTE_DETAIL.quoteNumber;
  const status = row?.sent ?? QUOTE_DETAIL.status;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
            Quote · {quoteNumber}
          </h1>
          {status ? (
            <DashboardBadge variant={status.variant} pill>
              {status.label}
            </DashboardBadge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              ref={headerMenuRef}
              type="button"
              aria-label="Quote actions"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF]"
            >
              <ChevronDownIcon />
            </button>
            <DashboardMenuPopover
              open={headerMenuOpen}
              onClose={() => setHeaderMenuOpen(false)}
              anchorRef={headerMenuRef}
              className="min-w-[220px]"
              items={[
                { id: "edit",     label: "Edit" },
                { id: "dup",      label: "Duplicate" },
                { id: "convert",  label: "Convert to Work Order" },
                { id: "won",      label: "Mark as Won" },
                { id: "lost",     label: "Mark as Lost" },
                { id: "preview",  label: "Print Preview", onSelect: () => router.push(`/crm/quotes/${quoteId}/preview`) },
                { id: "history",  label: "View Change History" },
                { id: "delete",   label: "Delete Draft", destructive: true },
              ]}
            />
          </div>
          <DashboardToolbarButton onClick={() => router.push(`/crm/quotes/${quoteId}/preview`)}>
            Download PDF
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => setSendOpen(true)}>
            Send to Customer
          </DashboardToolbarButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <PanelHeading>Customer & Contact</PanelHeading>
          </div>
          <div className="divider-line-full w-full" aria-hidden />
          <div className="space-y-5 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QUOTE_DETAIL.contact.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="font-sans text-[13px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                  {QUOTE_DETAIL.contact.name}
                </p>
                <p className="mt-0.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {QUOTE_DETAIL.contact.role}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailPair label="Company" value={QUOTE_DETAIL.contact.company} />
              <DetailPair label="Email" value={QUOTE_DETAIL.contact.email} />
              <DetailPair label="Phone" value={QUOTE_DETAIL.contact.phone} />
            </div>
            <DetailPair label="Billing Address" value={QUOTE_DETAIL.contact.billingAddress} />
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <PanelHeading>Quote Details</PanelHeading>
          </div>
          <div className="divider-line-full w-full" aria-hidden />
          <div className="space-y-3 p-4">
            {QUOTE_DETAIL.details.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  {item.label}
                </span>
                <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <PanelHeading>Line Items</PanelHeading>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                ref={lineMenuRef}
                type="button"
                aria-label="Line item actions"
                onClick={() => setLineMenuOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF]"
              >
                <ChevronDownIcon />
              </button>
              <DashboardMenuPopover
                open={lineMenuOpen}
                onClose={() => setLineMenuOpen(false)}
                anchorRef={lineMenuRef}
                items={[
                  { id: "edit",   label: "Edit" },
                  { id: "dup",    label: "Duplicate" },
                  { id: "reorder",label: "Reorder" },
                  { id: "delete", label: "Delete Draft", destructive: true },
                ]}
              />
            </div>
            <DashboardToolbarButton variant="primary">+ Add Line Item</DashboardToolbarButton>
          </div>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-divider text-left">
                {["Item", "Qty", "Rate", "Amount", ""].map((h) => (
                  <th
                    key={h || "actions"}
                    className="pb-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUOTE_DETAIL.lineItems.map((line) => (
                <tr key={line.id} className="border-b border-divider/60">
                  <td className="py-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                    {line.item}
                  </td>
                  <td className="py-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                    {line.qty}
                  </td>
                  <td className="py-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                    {line.rate}
                  </td>
                  <td className="py-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {line.amount}
                  </td>
                  <td className="w-10 py-3">
                    <DashboardRowActionMenu
                      items={[
                        { id: "edit",    label: "Edit" },
                        { id: "dup",     label: "Duplicate" },
                        { id: "reorder", label: "Reorder" },
                        { id: "delete",  label: "Delete Draft", destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-2">
            {QUOTE_DETAIL.totals.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  {item.label}
                </span>
                <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel>
        <div className="px-4 pt-4 pb-3">
          <PanelHeading>Quote Terms</PanelHeading>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-3 p-4">
          {QUOTE_DETAIL.terms.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                {item.label}
              </span>
              <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <SendQuoteModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
