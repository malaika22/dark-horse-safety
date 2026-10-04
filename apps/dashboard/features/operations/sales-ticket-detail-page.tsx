"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, DashboardToolbarButton } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type SalesTicketCorrectionField,
  type SalesTicketDetail,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import {
  AdjustRateModal,
  ReturnTicketForCorrectionModal,
} from "@/features/operations/sales-ticket-modals";

function money(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Card({
  title,
  children,
  right,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4",
        className,
      )}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </h2>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[9px] uppercase tracking-[0.04em] text-[#6F6F72]">
        {label}
      </p>
      <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value ?? "—"}
      </p>
    </div>
  );
}

function Stepper({ steps, current }: { steps: string[]; current?: string | null }) {
  const idx = Math.max(
    0,
    steps.findIndex((s) => s === (current ?? "").toUpperCase()),
  );
  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={step} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-sans text-[9px] uppercase tracking-[-0.02em]",
                active
                  ? "bg-[#FDFDFF] text-[#121212]"
                  : done
                    ? "bg-[#2A2A2A] text-[#959597]"
                    : "border border-[#2A2A2A] text-[#5A5A5A]",
              )}
            >
              {step.replace(/_/g, " ")}
            </span>
            {i < steps.length - 1 ? (
              <span className="text-[#3E3E3E]">›</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SalesTicketDetailPage({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [detail, setDetail] = React.useState<SalesTicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [nsReason, setNsReason] = React.useState("");
  const [nsRef, setNsRef] = React.useState("");
  const [fields, setFields] = React.useState<SalesTicketCorrectionField[]>([]);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);

  useSetHeaderBreadcrumb(
    detail
      ? `Sales Tickets / ${detail.code.replace(/^ST-/, "")}`
      : "Sales Tickets",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, fieldsRes] = await Promise.all([
        operationsApi.getSalesTicket(ticketId),
        operationsApi.salesTicketCorrectionFields(),
      ]);
      setDetail(res.data);
      setFields(fieldsRes.data);
      setNsReason(res.data.detail?.netsuiteCorrection?.reason ?? "");
      setNsRef(res.data.detail?.netsuiteCorrection?.reference ?? "NS-CORR-");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
      setDetail(null);
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useSetHeaderActions(
    detail ? (
      <div className="flex flex-wrap gap-2">
        <DashboardToolbarButton
          onClick={() =>
            router.push(`/operations/invoices/${detail.id}`)
          }
        >
          Invoice Preview
        </DashboardToolbarButton>
        <DashboardToolbarButton
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await operationsApi.saveSalesTicket(detail.id, {
                  netsuiteReason: nsReason,
                  netsuiteReference: nsRef,
                });
                toastSuccess("Saved");
                await reload();
              } catch (err) {
                toastApiError(err);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Save
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => setAdjustOpen(true)}>
          Adjust Rate
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => setReturnOpen(true)}>
          Return for Correction
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={busy || detail.approvalStatus === "APPROVED"}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await operationsApi.acceptSalesTicket(detail.id);
                toastSuccess("Ticket accepted");
                await reload();
              } catch (err) {
                toastApiError(err);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Accept
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail?.id, detail?.approvalStatus, busy, nsReason, nsRef, router],
  );

  const d = detail?.detail;
  const stepper = d?.stepper ?? [
    "DRAFT",
    "SUBMITTED",
    "NEEDS_REVIEW",
    "APPROVED",
    "READY_FOR_NETSUITE",
    "SENT_TO_NETSUITE",
    "CORRECTION_NEEDED",
    "CLOSED",
  ];

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {detail ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
          <div>
            <Link
              href="/operations/sales-tickets"
              className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
            >
              ← Review Queue
            </Link>
            <div className="mt-3">
              <Stepper steps={stepper} current={detail.workflowStep} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Sales Ticket Detail
              </h1>
              {detail.billingFlag ? (
                <span className="rounded-md bg-[#3A1C1C] px-2.5 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                  {detail.billingFlag}
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
              {d?.summary?.ticketId ?? detail.code} ·{" "}
              {d?.summary?.customer ?? detail.customerName} ·{" "}
              {d?.summary?.location ?? detail.locationLabel} ·{" "}
              {d?.summary?.date ?? detail.jobDateLabel}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <Card title="Company Details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Company Name" value={d?.company?.name} />
                  <Field
                    label="Account Owner"
                    value={d?.company?.accountOwner}
                  />
                  <Field label="Status" value={d?.company?.status} />
                  <Field label="Phone" value={d?.company?.phone} />
                  <Field label="Email" value={d?.company?.email} />
                  <Field label="Industry" value={d?.company?.industry} />
                  <Field
                    label="Billing Address"
                    value={d?.company?.billingAddress}
                  />
                  <Field
                    label="Primary Contact"
                    value={d?.company?.primaryContact}
                  />
                  <Field
                    label="Customer Since"
                    value={d?.company?.customerSince}
                  />
                </div>
              </Card>

              <Card
                title="Line Items"
                right={
                  <span className="font-sans text-[11px] uppercase text-[#959597]">
                    {d?.summary?.paymentTerms ?? "NET 30"} — $
                    {money(d?.summary?.subtotal ?? detail.amount)} Subtotal
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        {["Item", "Qty (Hrs)", "Rate", "Amount", "WO Link"].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#6F6F72]"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(d?.lineItems ?? []).map((line, i) => (
                        <tr
                          key={`${line.item}-${i}`}
                          className="border-b border-[#222]"
                        >
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {line.item}
                          </td>
                          <td className="py-2.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {line.qty.toFixed(1)}
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
                            {detail.workOrderId ? (
                              <Link
                                href={`/operations/work-orders/${detail.workOrderId}`}
                                className="font-sans text-[11px] uppercase text-[#8B9BB4] underline"
                              >
                                {line.woLink ?? detail.workOrderCode}
                              </Link>
                            ) : (
                              <span className="font-sans text-[11px] uppercase text-[#6F6F72]">
                                {line.woLink ?? "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="space-y-1 text-right">
                    <p className="font-sans text-[11px] uppercase text-[#959597]">
                      Subtotal · ${money(d?.totals?.subtotal)}
                    </p>
                    <p className="font-sans text-[11px] uppercase text-[#959597]">
                      Tax ({d?.totals?.taxPct ?? 0}%) · $
                      {money(d?.totals?.tax)}
                    </p>
                    <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">
                      Total · ${money(d?.totals?.total ?? detail.amount)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                title="Under Billed or Over Billed"
                right={
                  <span className="rounded-md bg-[#3A1C1C] px-2 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                    {d?.variance?.deltaLabel ?? "D —"}
                  </span>
                }
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="font-sans text-[9px] uppercase text-[#6F6F72]">
                      Worked Hours
                    </p>
                    <p className="mt-1 font-sans text-[20px] font-[590] uppercase text-[#FDFDFF]">
                      {(d?.variance?.workedHours ?? detail.hours ?? 0).toFixed(
                        1,
                      )}
                      H
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[9px] uppercase text-[#6F6F72]">
                      Billed Hours
                    </p>
                    <p className="mt-1 font-sans text-[20px] font-[590] uppercase text-[#FDFDFF]">
                      {(
                        d?.variance?.billedHours ??
                        detail.billedHours ??
                        0
                      ).toFixed(1)}
                      H
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[9px] uppercase text-[#6F6F72]">
                      Variance
                    </p>
                    <p className="mt-1 font-sans text-[20px] font-[590] uppercase text-[#E86A6A]">
                      {(
                        d?.variance?.varianceHours ??
                        detail.deltaHours ??
                        0
                      ).toFixed(1)}{" "}
                      H
                    </p>
                    <p className="font-sans text-[10px] uppercase text-[#959597]">
                      {d?.variance?.unbilledLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <p className="mb-2 font-sans text-[10px] uppercase text-[#6F6F72]">
                    Linked Technician Time
                  </p>
                  <table className="w-full min-w-[420px]">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        {["Tech", "In", "Out", "Hours", "Status"].map((h) => (
                          <th
                            key={h}
                            className="pb-2 text-left font-sans text-[10px] font-normal uppercase text-[#6F6F72]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(d?.techTime ?? []).map((t) => (
                        <tr key={t.name} className="border-b border-[#222]">
                          <td className="py-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {t.name}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#C8C8C8]">
                            {t.clockIn}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#C8C8C8]">
                            {t.clockOut}
                          </td>
                          <td className="py-2 font-sans text-[12px] text-[#FDFDFF]">
                            {t.hours.toFixed(2)}
                          </td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 font-sans text-[10px] uppercase",
                                t.status === "APPROVED"
                                  ? "bg-[#1C3A2A] text-[#5ECF8E]"
                                  : "bg-[#3A3218] text-[#E8C547]",
                              )}
                            >
                              {t.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Customer Route / Mileage Check">
                <div className="space-y-2">
                  {(d?.routeCheck ?? []).map((r) => (
                    <div
                      key={r.label}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222] py-2 last:border-0"
                    >
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        {r.label}
                      </p>
                      <span
                        className={cn(
                          "font-sans text-[11px] uppercase",
                          r.tone === "success"
                            ? "text-[#5ECF8E]"
                            : r.tone === "warning"
                              ? "text-[#E8C547]"
                              : "text-[#FDFDFF]",
                          r.action ? "cursor-pointer underline" : "",
                        )}
                      >
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Vendor PO / Bill-Back Check">
                <div className="space-y-2">
                  {(d?.vendorPos?.items ?? []).map((po) => (
                    <div
                      key={po.code}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {po.code}
                      </span>
                      <span className="font-sans text-[11px] uppercase text-[#959597]">
                        {po.status}
                      </span>
                    </div>
                  ))}
                </div>
                {d?.vendorPos?.alert ? (
                  <div className="mt-3 rounded-lg border border-[#3A3218] bg-[#2A2410] px-3 py-2 font-sans text-[11px] leading-relaxed text-[#E8C547]">
                    {d.vendorPos.alert}
                  </div>
                ) : null}
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Customer & Location">
                <div className="space-y-3">
                  <Field
                    label="Address"
                    value={d?.locationCard?.address}
                  />
                  <Field
                    label="Service Date"
                    value={d?.locationCard?.serviceDate}
                  />
                  <Field
                    label="WO Number"
                    value={d?.locationCard?.woNumber}
                  />
                  <Field label="Source" value={d?.locationCard?.source} />
                  <Field
                    label="PO Number"
                    value={d?.locationCard?.poNumber}
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#3E3E3E] bg-[#141414] font-sans text-[10px] uppercase text-[#6F6F72]">
                      Map View
                    </div>
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#3E3E3E] bg-[#141414] font-sans text-[10px] uppercase text-[#6F6F72]">
                      Location Sign
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                title="NetSuite Correction"
                right={
                  <span className="rounded-md bg-[#3A1C1C] px-2 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                    {d?.netsuiteCorrection?.status ?? "NEEDED"} ·{" "}
                    {d?.netsuiteCorrection?.valueLabel}
                  </span>
                }
              >
                <label className="block space-y-1.5">
                  <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    Correction Reason
                  </span>
                  <textarea
                    className="min-h-[88px] w-full rounded-lg border border-[#3E3E3E] bg-[#141414] px-3 py-2 font-sans text-[12px] text-[#FDFDFF] outline-none"
                    value={nsReason}
                    onChange={(e) => setNsReason(e.target.value)}
                  />
                </label>
                <label className="mt-3 block space-y-1.5">
                  <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    NetSuite Reference
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#141414] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                    value={nsRef}
                    onChange={(e) => setNsRef(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="mt-3 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#333]"
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await operationsApi.saveSalesTicket(detail.id, {
                          netsuiteReason: nsReason,
                          netsuiteReference: nsRef,
                          markNetsuiteUpdated: true,
                        });
                        toastSuccess("Marked updated in NetSuite");
                        await reload();
                      } catch (err) {
                        toastApiError(err);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                >
                  Mark Updated in NetSuite
                </button>
              </Card>

              <Card title="Audit Notes">
                <div className="space-y-3">
                  {(d?.auditNotes ?? []).map((n, i) => (
                    <div
                      key={`${n.title}-${i}`}
                      className="border-l-2 border-[#3E3E3E] pl-3"
                    >
                      <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {n.title}
                      </p>
                      <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {n.when}
                        {n.detail ? ` · ${n.detail}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <AdjustRateModal
            open={adjustOpen}
            ticket={detail}
            onClose={() => setAdjustOpen(false)}
            onApplied={() => void reload()}
          />
          <ReturnTicketForCorrectionModal
            open={returnOpen}
            ticket={detail}
            fields={fields}
            onClose={() => setReturnOpen(false)}
            onReturned={() => void reload()}
          />
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
