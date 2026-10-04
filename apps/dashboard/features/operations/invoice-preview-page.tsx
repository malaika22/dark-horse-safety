"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
  cn,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import { operationsApi, type InvoicePreview } from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import { SendInvoiceModal } from "@/features/operations/invoice-send-modals";

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function badgeVariant(tone?: string): DashboardBadgeVariant {
  if (tone === "success") return "success";
  if (tone === "error") return "error";
  if (tone === "warning") return "warning";
  return "operations";
}

export function InvoicePreviewPage({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [preview, setPreview] = React.useState<InvoicePreview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [nsRef, setNsRef] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);

  useSetHeaderBreadcrumb(
    preview
      ? `Operations / Invoice Preview / ${preview.invoiceCode}`
      : "Operations / Invoice Preview",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getInvoicePreview(ticketId);
      setPreview(res.data);
      setNotes(res.data.netsuite.invoiceNotes ?? "");
      setNsRef(res.data.netsuite.netsuiteRef ?? "NS-CORR-");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
      setPreview(null);
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useSetHeaderActions(
    preview ? (
      <div className="flex flex-wrap gap-2">
        <DashboardToolbarButton
          onClick={() =>
            router.push(`/operations/sales-tickets/${preview.ticketId}`)
          }
        >
          ← Back
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          onClick={() => setSendOpen(true)}
        >
          Send
        </DashboardToolbarButton>
      </div>
    ) : null,
    [preview?.ticketId],
  );

  async function saveSide() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await operationsApi.saveInvoice(preview.ticketId, {
        invoiceNotes: notes,
        netsuiteRef: nsRef,
      });
      setPreview(res.data);
      toastSuccess("Invoice notes saved");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendToNetsuite() {
    if (!preview) return;
    setBusy(true);
    try {
      await operationsApi.saveInvoice(preview.ticketId, {
        invoiceNotes: notes,
        netsuiteRef: nsRef,
      });
      await operationsApi.sendToNetsuite(preview.ticketId);
      toastSuccess("Queued to NetSuite");
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {preview ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Invoice Preview · {preview.invoiceCode}
                </h1>
                <DashboardBadge variant={badgeVariant(preview.badgeTone)} pill>
                  {preview.statusLabel}
                </DashboardBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {preview.stepper.map((step) => {
                  const active = step === preview.stepperCurrent;
                  return (
                    <span
                      key={step}
                      className={cn(
                        "rounded-full px-2.5 py-1 font-sans text-[9px] uppercase",
                        active
                          ? "bg-[#FDFDFF] text-[#121212]"
                          : "border border-[#2A2A2A] text-[#5A5A5A]",
                      )}
                    >
                      {step}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 font-sans text-[11px] uppercase text-[#6F6F72]">
                {preview.stepperMeta}
              </p>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                {preview.jobRef.ticketCode} · {preview.jobRef.customer} ·{" "}
                {preview.jobRef.location} · {preview.jobRef.dateRange}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                    Invoice
                  </h2>
                  <span className="font-sans text-[11px] uppercase text-[#959597]">
                    {preview.terms} · ${money(preview.subtotal)} Subtotal
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        {["Item", "Qty (Hrs)", "Rate", "Amount", "WO Link"].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 font-sans text-[10px] font-normal uppercase text-[#6F6F72]"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.lineItems.map((line, i) => (
                        <tr
                          key={`${line.item}-${i}`}
                          className="border-b border-[#222]"
                        >
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {line.item}
                            {line.note ? (
                              <span className="mt-0.5 block text-[9px] text-[#6F6F72]">
                                {line.note}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {Number(line.qty).toFixed(1)}
                            {line.qtyDelta ? (
                              <span className="ml-1 text-[#E86A6A]">
                                ({line.qtyDelta > 0 ? "+" : ""}
                                {line.qtyDelta.toFixed(1)})
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#C8C8C8]">
                            {line.rateLabel ??
                              (line.rate != null
                                ? `$${money(line.rate)}`
                                : "—")}
                          </td>
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            ${money(line.amount)}
                          </td>
                          <td className="py-2.5">
                            <Link
                              href={
                                preview.workOrderId
                                  ? `/operations/work-orders/${preview.workOrderId}`
                                  : `/operations/sales-tickets/${preview.ticketId}`
                              }
                              className="font-sans text-[11px] uppercase text-[#8B9BB4] underline"
                            >
                              {line.woLink ?? preview.workOrderCode ?? "—"}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-1 text-right">
                  <p className="font-sans text-[11px] uppercase text-[#959597]">
                    Subtotal · ${money(preview.subtotal)}
                  </p>
                  <p className="font-sans text-[11px] uppercase text-[#959597]">
                    Tax ({preview.taxPct}%) · ${money(preview.tax)}
                  </p>
                  <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">
                    Total · {preview.totalLabel}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <h2 className="mb-3 font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                  Linked Technician Time
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        {["Tech", "Date", "Clock In", "Clock Out", "Billable", "Status"].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 text-left font-sans text-[10px] font-normal uppercase text-[#6F6F72]"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.techTime.length
                        ? preview.techTime
                        : [
                            {
                              name: "T. WHITLOCK",
                              date: "JUN 15",
                              clockIn: "06:00",
                              clockOut: "18:30",
                              hours: 12.5,
                              status: "APPROVED",
                            },
                            {
                              name: "R. BRYANT",
                              date: "JUN 15",
                              clockIn: "06:15",
                              clockOut: "18:00",
                              hours: 11.75,
                              status: "NEED_REVIEW",
                            },
                          ]
                      ).map((t) => (
                        <tr key={t.name} className="border-b border-[#222]">
                          <td className="py-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {t.name}
                          </td>
                          <td className="py-2 font-sans text-[12px] uppercase text-[#C8C8C8]">
                            {t.date ?? "JUN 15"}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#C8C8C8]">
                            {t.clockIn ?? "—"}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#C8C8C8]">
                            {t.clockOut ?? "—"}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#FDFDFF]">
                            {(t.hours ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2">
                            <DashboardBadge
                              variant={
                                t.status === "APPROVED" ? "success" : "warning"
                              }
                              pill
                            >
                              {t.status.replace(/_/g, " ")}
                            </DashboardBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <h2 className="mb-3 font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                  Quote vs Invoice
                </h2>
                <div className="space-y-2">
                  <KV
                    label="Quoted"
                    value={`$${money(preview.quoteCompare.quoted)}`}
                  />
                  <KV
                    label="Invoiced"
                    value={`$${money(preview.quoteCompare.invoiced)}`}
                  />
                  <KV
                    label="Variance"
                    value={`$${money(preview.quoteCompare.variance)} (${preview.quoteCompare.variancePct}%)`}
                  />
                  <DashboardBadge variant="warning" pill>
                    {preview.quoteCompare.reason}
                  </DashboardBadge>
                </div>
              </section>

              <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                    Invoice Summary
                  </h2>
                  <span className="rounded-md bg-[#3A1C1C] px-2 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                    {preview.netsuite.statusLabel}
                  </span>
                </div>
                <label className="block space-y-1.5">
                  <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    Invoice Notes
                  </span>
                  <textarea
                    className="min-h-[90px] w-full rounded-lg border border-[#3E3E3E] bg-[#141414] px-3 py-2 font-sans text-[12px] text-[#FDFDFF] outline-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <label className="mt-3 block space-y-1.5">
                  <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    NetSuite Invoice Ref
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#141414] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                    value={nsRef}
                    onChange={(e) => setNsRef(e.target.value)}
                  />
                </label>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSide()}
                    className="rounded-lg border border-[#3E3E3E] py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                  >
                    Save Notes
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendToNetsuite()}
                    className="rounded-lg bg-[#FDFDFF] py-2.5 font-sans text-[11px] font-[590] uppercase text-[#121212]"
                  >
                    Send to NetSuite
                  </button>
                </div>
              </section>

              <Link
                href={`/operations/sales-tickets/${preview.ticketId}`}
                className="block font-sans text-[11px] uppercase text-[#8B9BB4] hover:text-[#FDFDFF]"
              >
                ← Back to Sales Ticket
              </Link>
            </div>
          </div>

          <SendInvoiceModal
            open={sendOpen}
            preview={preview}
            onClose={() => setSendOpen(false)}
            onSent={() => void reload()}
          />
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-sans text-[11px] uppercase text-[#6F6F72]">
        {label}
      </span>
      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}
