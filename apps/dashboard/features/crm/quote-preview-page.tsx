"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardBadge, DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi, type CrmQuote } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

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

export function QuotePreviewPage({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = React.useState<CrmQuote | null>(null);
  const [loading, setLoading] = React.useState(true);

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

  if (loading) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Loading preview…</div>;
  }
  if (!quote) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Quote not found</div>;
  }

  const lines = quote.lineItems ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-x-hidden bg-shell p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-[22px] uppercase text-[#FDFDFF]">
            Quote {quote.quoteNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <DashboardBadge variant="success" pill>
              {quote.status}
            </DashboardBadge>
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              {quote.customer?.name ?? "—"}
            </span>
          </div>
        </div>
        <Link href={`/crm/quotes/${quote.id}`}>
          <DashboardToolbarButton>Back to Quote</DashboardToolbarButton>
        </Link>
      </div>

      <section className="rounded-xl bg-panel p-5 space-y-2">
        <p className="font-sans text-[11px] uppercase text-[#959597]">Bill To</p>
        <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">
          {quote.customer?.name ?? "—"}
        </p>
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {quote.contact?.fullName ?? "—"}
        </p>
      </section>

      <section className="rounded-xl bg-panel p-5">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2D2D30]">
              <th className="pb-2 font-sans text-[10px] uppercase text-[#959597]">Item</th>
              <th className="pb-2 font-sans text-[10px] uppercase text-[#959597]">Qty</th>
              <th className="pb-2 text-right font-sans text-[10px] uppercase text-[#959597]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 font-sans text-[12px] uppercase text-[#959597]">
                  No line items
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-b border-[#2D2D30]">
                  <td className="py-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
                    {line.item}
                  </td>
                  <td className="py-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
                    {line.quantity}
                  </td>
                  <td className="py-3 text-right font-sans text-[12px] uppercase text-[#FDFDFF]">
                    {money(line.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between font-sans text-[13px] uppercase text-[#FDFDFF]">
          <span>Total</span>
          <span>{money(quote.amount)}</span>
        </div>
      </section>

      {quote.terms ? (
        <section className="rounded-xl bg-panel p-5">
          <p className="font-sans text-[11px] uppercase text-[#959597]">Terms</p>
          <p className="mt-2 font-sans text-[12px] uppercase text-[#FDFDFF]">{quote.terms}</p>
        </section>
      ) : null}
    </div>
  );
}
