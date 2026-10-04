"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type BillingDetail,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";

function Card({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#959597]">⚡</span>
          <h2 className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </h2>
        </div>
        {right}
      </div>
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

function docTone(status: string) {
  const s = status.toUpperCase();
  if (s === "SUBMITTED") return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s === "DUE") return "bg-[#3A3218] text-[#E8C547]";
  if (s === "EXPIRING") return "bg-[#3A2818] text-[#E8A05C]";
  return "bg-[#3A1C1C] text-[#E86A6A]";
}

export function BillingReconciliationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<BillingDetail | null>(null);
  const [nsRef, setNsRef] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  useSetHeaderBreadcrumb(
    detail?.headerBreadcrumb ?? "Reconciliation / Detail",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getBillingDetail(id);
      setDetail(res.data);
      setNsRef(res.data.netsuiteCorrection.reference ?? "NS-CORR-");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setDetail(null);
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useSetHeaderActions(
    detail ? (
      <div className="flex flex-wrap gap-2">
        <DashboardToolbarButton
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await operationsApi.markBillingReviewed(detail.id, {
                  note: note || undefined,
                });
                toastSuccess("Marked reviewed");
                await reload();
              } catch (err) {
                toastApiError(err);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Mark Reviewed
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await operationsApi.markBillingReviewed(detail.id, {
                  netsuiteRef: nsRef,
                  markNetsuiteUpdated: true,
                  note: note || undefined,
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
          Mark Updated In NetSuite
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail, busy, nsRef, note, reload],
  );

  function goException(dir: -1 | 1) {
    if (!detail?.exceptionIds?.length) return;
    const next =
      detail.exceptionIds[
        (detail.exceptionIndex - 1 + dir + detail.exceptionIds.length) %
          detail.exceptionIds.length
      ];
    if (next) router.push(`/operations/billing/${next}`);
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {detail ? (
        <div className="space-y-4 bg-shell p-3 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {detail.title}
                </h1>
                <span className="rounded-md bg-[#3A1C1C] px-2.5 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                  {detail.statusLabel}
                </span>
              </div>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                {detail.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/operations/billing"
                className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]"
              >
                ← Billing Reconciliation
              </Link>
              <span className="rounded-lg border border-[#3E3E3E] px-3 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]">
                {detail.workOrder.code} ⌄
              </span>
            </div>
            <div className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#959597]">
              <button type="button" onClick={() => goException(-1)}>
                &lt;
              </button>
              <span>
                {detail.exceptionIndex} Of {detail.exceptionTotal} Exceptions
              </span>
              <button type="button" onClick={() => goException(1)}>
                &gt;
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr]">
            <Card title="Work Order">
              <p className="font-sans text-[14px] uppercase text-[#FDFDFF]">
                {detail.workOrder.code}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                {detail.workOrder.location}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Service Date" value={detail.workOrder.serviceDate} />
                <Field label="Customer" value={detail.workOrder.customer} />
                <Field
                  label="Assigned"
                  value={detail.workOrder.assigned.join(" · ")}
                />
                <Field label="Job Start" value={detail.workOrder.jobStart} />
                <Field label="Job End" value={detail.workOrder.jobEnd} />
              </div>
            </Card>

            <Card title="Sales Ticket">
              <p className="font-sans text-[14px] uppercase text-[#FDFDFF]">
                {detail.salesTicket.linkedLabel}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                {detail.salesTicket.hoursLabel}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="ST #" value={detail.salesTicket.code} />
                <Field label="Source" value={detail.salesTicket.source} />
                <Field label="PO #" value={detail.salesTicket.poNumber} />
                <Field
                  label="Status"
                  value={
                    <span className="rounded bg-[#3A1C1C] px-2 py-0.5 text-[#E86A6A]">
                      {detail.salesTicket.status}
                    </span>
                  }
                />
              </div>
              <Link
                href={`/operations/sales-tickets/${detail.salesTicket.id}`}
                className="mt-4 inline-flex rounded-lg border border-[#3E3E3E] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
              >
                Review ST
              </Link>
            </Card>

            <Card title="NetSuite Correction">
              <div className="space-y-3">
                <Field
                  label="Status"
                  value={
                    <span className="rounded bg-[#3A1C1C] px-2 py-0.5 text-[#E86A6A]">
                      {detail.netsuiteCorrection.status}
                    </span>
                  }
                />
                <Field label="Type" value={detail.netsuiteCorrection.type} />
                <Field label="Action" value={detail.netsuiteCorrection.action} />
                <div>
                  <p className="font-sans text-[9px] uppercase text-[#6F6F72]">
                    Correction Reason
                  </p>
                  <p className="mt-1 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                    {detail.netsuiteCorrection.reason}
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="font-sans text-[9px] uppercase text-[#6F6F72]">
                    NetSuite Reference
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#1F1F1F] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                    value={nsRef}
                    onChange={(e) => setNsRef(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await operationsApi.markBillingReviewed(detail.id, {
                          netsuiteRef: nsRef,
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
                  className="w-full rounded-lg border border-[#3E3E3E] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                >
                  Mark Updated In NetSuite
                </button>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <Card
                title="Site Safety Comparison"
                right={
                  <span className="font-sans text-[11px] uppercase text-[#E86A6A]">
                    {detail.comparison.deltaLabel}
                  </span>
                }
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                      Worked Hours
                    </p>
                    <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">
                      {detail.comparison.workedLabel}
                    </p>
                    <p className="mt-1 font-sans text-[10px] uppercase text-[#6F6F72]">
                      {detail.comparison.workedMeta}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                      Billed Hours
                    </p>
                    <p className="mt-1 font-sans text-[18px] uppercase text-[#FDFDFF]">
                      {detail.comparison.billedLabel}
                    </p>
                    <p className="mt-1 font-sans text-[10px] uppercase text-[#6F6F72]">
                      {detail.comparison.billedMeta}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                      Variance
                    </p>
                    <p className="mt-1 font-sans text-[18px] uppercase text-[#E86A6A]">
                      {detail.comparison.varianceLabel}
                    </p>
                    <p className="mt-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                      {detail.comparison.varianceMeta}
                    </p>
                  </div>
                </div>

                <p className="mt-5 mb-2 font-sans text-[10px] uppercase text-[#6F6F72]">
                  Selected Linked Technician Time
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-[10px] uppercase text-[#6F6F72]">
                        <th className="py-2 pr-2">Tech</th>
                        <th className="py-2 pr-2">Date</th>
                        <th className="py-2 pr-2">Clock In</th>
                        <th className="py-2 pr-2">Clock Out</th>
                        <th className="py-2 pr-2">Billable</th>
                        <th className="py-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.techTime.map((t, i) => (
                        <tr
                          key={`${t.name}-${i}`}
                          className="border-b border-[#2A2A2A] text-[12px] uppercase text-[#FDFDFF]"
                        >
                          <td className="py-2 pr-2">{t.name}</td>
                          <td className="py-2 pr-2">{t.date ?? "—"}</td>
                          <td className="py-2 pr-2">{t.clockIn ?? "—"}</td>
                          <td className="py-2 pr-2">{t.clockOut ?? "—"}</td>
                          <td className="py-2 pr-2">
                            {t.billable ??
                              (t.hours != null ? `${t.hours}H` : "—")}
                          </td>
                          <td className="py-2">{t.category ?? "REGULAR"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card
                title="Compliance Documents"
                right={
                  <span className="font-sans text-[10px] uppercase text-[#959597]">
                    {detail.compliance.submittedLabel}
                  </span>
                }
              >
                <ul className="space-y-2">
                  {detail.compliance.items.map((d) => (
                    <li
                      key={d.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {d.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 font-sans text-[10px] uppercase",
                          docTone(d.status),
                        )}
                      >
                        {d.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Admin Notes">
                {detail.adminNotes.map((n, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                      Previous Note · {n.when}
                    </p>
                    <p className="mt-1 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                      {n.text}
                    </p>
                  </div>
                ))}
                <label className="mt-2 block space-y-1">
                  <span className="font-sans text-[9px] uppercase text-[#6F6F72]">
                    Add Note
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#1F1F1F] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
                    placeholder="Add a new note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </Card>

              <Card title="Audit History">
                <ul className="space-y-3">
                  {detail.auditHistory.map((a, i) => (
                    <li key={i}>
                      <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {a.when}
                      </p>
                      <p className="mt-0.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {a.title}
                      </p>
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        {a.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
