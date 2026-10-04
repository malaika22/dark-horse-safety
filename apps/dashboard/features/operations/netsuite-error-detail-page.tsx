"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardToolbarButton, cn } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type NetsuiteErrorDetail,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";

function Card({
  title,
  children,
  className,
}: {
  title: string;
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
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[#959597]">⚡</span>
        <h2 className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
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

export function NetsuiteErrorDetailPage({ id }: { id: string }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<NetsuiteErrorDetail | null>(null);
  const [busy, setBusy] = React.useState(false);

  useSetHeaderBreadcrumb("Jobs / Operations / NetSuite Error");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getNetsuiteError(id);
      setDetail(res.data);
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
          disabled={busy || detail.followUp}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await operationsApi.markNetsuiteFollowUp(detail.id);
                toastSuccess("Marked for follow-up");
                await reload();
              } catch (err) {
                toastApiError(err);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {detail.followUp ? "Follow-Up Marked" : "Mark For Follow-Up"}
        </DashboardToolbarButton>
        <Link href="/settings/integrations">
          <DashboardToolbarButton>Open NetSuite Settings</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton
          variant="primary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                const res = await operationsApi.retryNetsuiteSend(detail.id);
                toastSuccess(
                  res.data.message ??
                    (res.data.ok === false
                      ? "Retry failed"
                      : "Retry complete"),
                );
                await reload();
              } catch (err) {
                toastApiError(err);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Retry Send
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail, busy, reload],
  );

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
                  {detail.title.includes("·")
                    ? detail.title
                    : `NETSUITE ERROR · ${detail.code}`}
                </h1>
                <span className="rounded-md bg-[#3A1C1C] px-2.5 py-1 font-sans text-[10px] uppercase text-[#E86A6A]">
                  {detail.status}
                </span>
              </div>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                {detail.occurredLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/operations/netsuite"
              className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]"
            >
              ← NetSuite Handoff
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Error Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ST" value={detail.salesTicket} />
                <Field
                  label="WO"
                  value={
                    detail.workOrderId ? (
                      <Link
                        href={`/operations/work-orders/${detail.workOrderId}`}
                        className="text-[#8B9BB4] underline"
                      >
                        {detail.workOrder}
                      </Link>
                    ) : (
                      detail.workOrder
                    )
                  }
                />
                <Field label="Customer" value={detail.customer} />
                <Field label="Error Code" value={detail.errorCode} />
              </div>
              <div className="mt-4">
                <p className="font-sans text-[9px] uppercase text-[#6F6F72]">
                  Message
                </p>
                <p className="mt-1 font-sans text-[12px] uppercase leading-relaxed text-[#E86A6A]">
                  {detail.message}
                </p>
              </div>
            </Card>

            <Card title="Sync Log">
              <ul className="space-y-3">
                {detail.syncLog.map((entry, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 font-sans text-[10px] uppercase text-[#6F6F72]">
                      {entry.when}
                    </span>
                    <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                      {entry.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Affected Records">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Invoice" value={detail.affected.invoice} />
                <Field
                  label="Line Items"
                  value={String(detail.affected.lineItems)}
                />
                <Field
                  label="NetSuite Result"
                  value={
                    <span className="rounded bg-[#3A1C1C] px-2 py-0.5 text-[#E86A6A]">
                      {detail.affected.netsuiteResult}
                    </span>
                  }
                />
              </div>
            </Card>

            <Card title="Resolution Steps">
              <ol className="list-decimal space-y-2 pl-4">
                {detail.resolution.map((step, i) => (
                  <li
                    key={i}
                    className="font-sans text-[12px] uppercase leading-relaxed text-[#C8C8C8]"
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
