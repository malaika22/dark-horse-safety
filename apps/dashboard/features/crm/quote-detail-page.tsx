"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmQuote } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { SendQuoteModal } from "./send-quote-modal";

function DetailPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase text-[#959597]">{label}</p>
      <div className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">{value}</div>
    </div>
  );
}

function money(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function QuoteDetailPage({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = React.useState<CrmQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sendOpen, setSendOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getQuote(quoteId);
        if (!cancelled) setQuote(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  async function handleSend() {
    try {
      const res = await crmApi.sendQuote(quoteId);
      setQuote(res.data);
      toastSuccess("Quote sent");
      setSendOpen(false);
    } catch (err) {
      toastApiError(err);
    }
  }

  if (loading) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Loading quote…</div>;
  }
  if (!quote) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Quote not found</div>;
  }

  const lines = quote.lineItems ?? [];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-sans text-[18px] uppercase text-[#FDFDFF] md:text-[24px]">
            Quote · {quote.quoteNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge variant="success" pill>
              {quote.status}
            </DashboardBadge>
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              {money(quote.amount)} · {quote.customer?.name ?? "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/crm/quotes/${quote.id}/preview`}>
            <DashboardToolbarButton>Preview</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            variant="primary"
            onClick={() => setSendOpen(true)}
          >
            Send Quote
          </DashboardToolbarButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel className="p-4 space-y-3">
          <DetailPair label="Customer" value={quote.customer?.name ?? "—"} />
          <DetailPair label="Contact" value={quote.contact?.fullName ?? "—"} />
          <DetailPair label="Expires" value={quote.expiresAt?.slice(0, 10) ?? "—"} />
          <DetailPair label="Terms" value={quote.terms ?? "—"} />
          <DetailPair label="Notes" value={quote.notes ?? "—"} />
        </DashboardPanel>
        <DashboardPanel className="p-4">
          <p className="mb-3 font-sans text-[11px] uppercase text-[#959597]">Line Items</p>
          {lines.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">No line items</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-3 font-sans text-[11px] uppercase text-[#FDFDFF]"
                >
                  <span className="truncate">
                    {line.item} × {line.quantity}
                  </span>
                  <span>{money(line.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-between border-t border-[#2D2D30] pt-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
            <span>Total</span>
            <span>{money(quote.amount)}</span>
          </div>
        </DashboardPanel>
      </div>

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onConfirm={() => void handleSend()}
      />
    </div>
  );
}
