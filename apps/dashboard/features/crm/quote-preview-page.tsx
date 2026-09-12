"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { crmApi, downloadPdf, type CrmQuote } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { QuotePreviewOverlay } from "./quote-flow-modals";

function shortName(full?: string | null) {
  if (!full?.trim()) return "—";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.toUpperCase();
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`.toUpperCase();
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
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading preview" />
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="space-y-4 bg-shell p-6">
        <p className="text-sm text-[#959597]">Quote not found</p>
        <Link href="/crm/quotes">
          <DashboardToolbarButton>Back to Quotes</DashboardToolbarButton>
        </Link>
      </div>
    );
  }

  const contactName = shortName(quote.contact?.fullName);
  const contactRole = quote.contact?.roleTitle ?? null;

  return (
    <>
      <div className="bg-shell p-4">
        <Link href={`/crm/quotes/${quote.id}`}>
          <DashboardToolbarButton>Back to Quote</DashboardToolbarButton>
        </Link>
      </div>
      <QuotePreviewOverlay
        open
        onClose={() => {
          window.history.back();
        }}
        quoteNumber={quote.quoteNumber}
        createdAt={quote.createdAt}
        expiresAt={quote.expiresAt}
        terms={quote.terms}
        amount={quote.amount}
        customerName={quote.customer?.name}
        contactName={contactName}
        contactRole={contactRole}
        billingAddress={quote.customer?.billingAddress}
        lineItems={quote.lineItems ?? []}
        onPrint={() => window.print()}
        onDownload={async () => {
          try {
            const res = await crmApi.exportQuotes({
              ids: quote.id,
              format: "pdf",
            });
            if (res.data.pdf) {
              downloadPdf(res.data.pdf, res.data.filename);
              toastSuccess("PDF downloaded");
            }
          } catch (err) {
            toastApiError(err);
          }
        }}
      />
    </>
  );
}
