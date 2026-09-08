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
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { SendQuoteModal, type SendQuotePayload } from "./send-quote-modal";

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

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function QuoteDetailPage({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = React.useState<CrmQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [sendOpen, setSendOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await crmApi.getQuote(quoteId);
        if (!cancelled) setQuote(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setQuote(null);
          setLoadError(err instanceof Error ? err.message : "Couldn't load quote");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, reloadKey]);

  async function handleSend(payload: SendQuotePayload) {
    try {
      const attachmentIds: string[] = [];
      for (const file of payload.files ?? []) {
        const data = await fileToBase64(file);
        const uploaded = await crmApi.uploadQuoteAttachment(quoteId, {
          fileName: file.name,
          mimeType: file.type || undefined,
          contentBase64: data,
        });
        if (uploaded.data?.id) attachmentIds.push(uploaded.data.id);
      }
      const res = await crmApi.sendQuote(quoteId, {
        to: payload.recipient,
        subject: payload.subject,
        message: payload.message,
        schedule: payload.schedule,
        attachmentIds: attachmentIds.length ? attachmentIds : undefined,
      });
      setQuote(res.data);
      toastSuccess("Quote sent");
      setSendOpen(false);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  useSetHeaderBreadcrumb(
    quote?.quoteNumber
      ? `CRM / Customer / Quotes / ${quote.quoteNumber}`
      : "CRM / Customer / Quotes / Detail",
  );

  useSetHeaderActions(
    quote ? (
      <>
        <Link href={`/crm/quotes/${quote.id}/edit`}>
          <DashboardToolbarButton>Edit</DashboardToolbarButton>
        </Link>
        <Link href={`/crm/quotes/${quote.id}/preview`}>
          <DashboardToolbarButton>Preview</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton
          variant="primary"
          onClick={() => setSendOpen(true)}
        >
          Send Quote
        </DashboardToolbarButton>
      </>
    ) : null,
    [quote, quoteId],
  );

  if (loading || !quote || loadError) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={loadError}
        missing={!loading && !quote && !loadError}
        missingTitle="Quote Not Found"
        missingDescription="This quote could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  const lines = quote.lineItems ?? [];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardBadge variant="success" pill>
          {quote.status}
        </DashboardBadge>
        <span className="font-sans text-[11px] uppercase text-[#959597]">
          {money(quote.amount)} · {quote.customer?.name ?? "—"}
        </span>
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
        defaultSubject={`Quote ${quote.quoteNumber}`}
        onConfirm={handleSend}
      />
    </div>
  );
}
