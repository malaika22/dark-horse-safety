"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardMenuPopover, DashboardPanel } from "@dark-horse-safety/ui";
import { QUOTE_DETAIL, QUOTES_ROWS } from "./data/quotes.mock";

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#C8C8C8] transition-colors hover:bg-white/5 hover:text-white"
    >
      {children}
    </button>
  );
}

export function QuotePreviewPage({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const row = QUOTES_ROWS.find((r) => r.id === quoteId);
  const quoteNumber = row?.quoteNumber ?? QUOTE_DETAIL.quoteNumber;
  const d = QUOTE_DETAIL;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => router.push(`/crm/quotes/${quoteId}`)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#C8C8C8] hover:bg-white/5 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" className="h-6 w-6 rounded object-cover" />
          <span className="truncate font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Quote-{quoteNumber.replace("Q-", "")} · Preview
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Print">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v6H6v-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </IconBtn>
          <IconBtn label="Download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4v12M7 12l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
          <div className="relative">
            <button
              ref={menuRef}
              type="button"
              aria-label="More"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#C8C8C8] hover:bg-white/5 hover:text-white"
            >
              <span className="text-[16px] leading-none">⋮</span>
            </button>
            <DashboardMenuPopover
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuRef}
              items={[
                { id: "edit",    label: "Edit" },
                { id: "dup",     label: "Duplicate" },
                { id: "convert", label: "Convert to Work Order" },
                { id: "won",     label: "Mark as Won" },
                { id: "lost",    label: "Mark as Lost" },
                { id: "history", label: "View Change History" },
                { id: "delete",  label: "Delete Draft", destructive: true },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="flex justify-center px-4 py-8 sm:px-8">
        <DashboardPanel className="w-full max-w-[720px] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt="" className="h-8 w-8 rounded object-cover" />
              <div>
                <p className="font-sans text-[13px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {d.preview.company}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                  {d.preview.address}
                  <br />
                  {d.preview.phone} · {d.preview.website}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Quote
              </p>
              <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                {quoteNumber}
              </p>
              <p className="mt-0.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                Jun 12, 2026
              </p>
            </div>
          </div>

          <div className="my-5 h-px bg-divider" />

          <div className="space-y-1">
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">Bill To</p>
            <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{d.preview.billToName}</p>
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">{d.preview.billToContact}</p>
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">{d.preview.billToAddress}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Quote #", value: quoteNumber },
              { label: "Date", value: "Jun 12, 2026" },
              { label: "Valid Until", value: "Jul 12, 2026" },
              { label: "Terms", value: "Net 30" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">{item.label}</p>
                <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{item.value}</p>
              </div>
            ))}
          </div>

          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr className="border-y border-divider text-left">
                {["Item", "Qty", "Rate", "Amount"].map((h) => (
                  <th
                    key={h}
                    className={`py-2 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] ${h !== "Item" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.lineItems.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{line.item}</td>
                  <td className="py-2 text-right font-sans text-[11px] uppercase text-[#C8C8C8]">{line.qty}</td>
                  <td className="py-2 text-right font-sans text-[11px] uppercase text-[#C8C8C8]">{line.rate}</td>
                  <td className="py-2 text-right font-sans text-[11px] uppercase text-[#FDFDFF]">{line.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-[220px] space-y-1.5 border-t border-divider pt-3">
            {d.totals.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <span className="font-sans text-[11px] uppercase text-[#959597]">{item.label}</span>
                <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">Terms</p>
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
              {d.preview.termsCopy}
            </p>
            <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#C8C8C8]">
              {d.preview.thankYou}
            </p>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
