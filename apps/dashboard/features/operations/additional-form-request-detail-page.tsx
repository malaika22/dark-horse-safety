"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton, cn } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type AdditionalFormDetail,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import {
  ApproveAdditionalFormRequestModal,
  DenyAdditionalFormRequestModal,
  MoreInfoAdditionalFormRequestModal,
} from "@/features/operations/form-request-action-modals";

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
        <h2 className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
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

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "PENDING") return "border border-[#FDFDFF] text-[#FDFDFF]";
  if (s === "APPROVED" || s === "FORM_ADDED")
    return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s === "DENIED") return "border border-[#B84A4A] text-[#E86A6A]";
  if (s === "NEEDS_INFO") return "bg-[#3A3218] text-[#E8C547]";
  return "border border-[#3E3E3E] text-[#959597]";
}

function urgencyTone(urgency: string) {
  const s = urgency.toUpperCase();
  if (s === "HIGH") return "bg-[#3A1C1C] text-[#E86A6A]";
  if (s === "MEDIUM") return "border border-[#FDFDFF] text-[#FDFDFF]";
  if (s === "LOW") return "bg-[#2A2A2A] text-[#959597]";
  return "border border-[#3E3E3E] text-[#959597]";
}

export function AdditionalFormRequestDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AdditionalFormDetail | null>(null);
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [denyOpen, setDenyOpen] = React.useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = React.useState(false);

  useSetHeaderBreadcrumb(
    detail
      ? `Additional Form Requests / ${detail.code}`
      : "Additional Form Requests / Detail",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getAdditionalFormRequest(id);
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

  const openAction = React.useCallback(
    (action: "approve" | "deny" | "more-info") => {
      if (!detail) return;
      if (action === "approve") setApproveOpen(true);
      else if (action === "deny") setDenyOpen(true);
      else setMoreInfoOpen(true);
    },
    [detail],
  );

  useSetHeaderActions(
    detail ? (
      <div className="flex flex-wrap gap-2">
        <DashboardToolbarButton onClick={() => openAction("deny")}>
          Deny
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => openAction("more-info")}>
          Request More Info
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          onClick={() => openAction("approve")}
        >
          Approve & Add Form
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail, openAction],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!detail) return;
      if (approveOpen || denyOpen || moreInfoOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase();
      if (key === "a") openAction("approve");
      if (key === "d") openAction("deny");
      if (key === "i") openAction("more-info");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, openAction, approveOpen, denyOpen, moreInfoOpen]);

  function go(dir: -1 | 1) {
    if (!detail?.ids?.length) return;
    const next =
      detail.ids[(detail.index - 1 + dir + detail.ids.length) % detail.ids.length];
    if (next) router.push(`/operations/additional-form-requests/${next}`);
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {detail ? (
        <div className="space-y-4 bg-shell p-3 sm:p-6">
          <ApproveAdditionalFormRequestModal
            open={approveOpen}
            detail={detail}
            onClose={() => setApproveOpen(false)}
            onDone={() => {
              void reload();
            }}
          />
          <DenyAdditionalFormRequestModal
            open={denyOpen}
            detail={detail}
            onClose={() => setDenyOpen(false)}
            onDone={() => {
              void reload();
            }}
          />
          <MoreInfoAdditionalFormRequestModal
            open={moreInfoOpen}
            detail={detail}
            onClose={() => setMoreInfoOpen(false)}
            onDone={() => {
              void reload();
            }}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {detail.title}
                </h1>
                <span
                  className={cn(
                    "rounded-md px-2.5 py-1 font-sans text-[10px] uppercase",
                    statusTone(detail.status),
                  )}
                >
                  {detail.statusLabel}
                </span>
                <span
                  className={cn(
                    "rounded-md px-2.5 py-1 font-sans text-[10px] uppercase",
                    urgencyTone(detail.urgency),
                  )}
                >
                  {detail.urgency}
                </span>
              </div>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                {detail.metaLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/operations/additional-form-requests"
                className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]"
              >
                ← Additional Form Requests
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCodeOpen((v) => !v)}
                  className="rounded-lg border border-[#3E3E3E] px-3 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]"
                >
                  {detail.code} ⌄
                </button>
                {codeOpen ? (
                  <div className="absolute left-0 z-20 mt-1 max-h-56 min-w-[200px] overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-1 shadow-lg">
                    {detail.requests.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setCodeOpen(false);
                          router.push(
                            `/operations/additional-form-requests/${r.id}`,
                          );
                        }}
                        className={cn(
                          "block w-full px-3 py-2 text-left font-sans text-[11px] uppercase hover:bg-[#2A2A2A]",
                          r.id === detail.id
                            ? "text-[#FDFDFF]"
                            : "text-[#959597]",
                        )}
                      >
                        {r.code}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans text-[11px] uppercase text-[#959597]">
              <button type="button" onClick={() => go(-1)}>
                &lt;
              </button>
              <span>
                {detail.index} Of {detail.total}
              </span>
              <button type="button" onClick={() => go(1)}>
                &gt;
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Card title="Requests">
              <ul className="space-y-1">
                {detail.requests.map((r) => {
                  const active = r.id === detail.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/operations/additional-form-requests/${r.id}`,
                          )
                        }
                        className={cn(
                          "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                          active ? "bg-[#2A2A2A]" : "hover:bg-[#222222]",
                        )}
                      >
                        <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                          {r.label}
                        </p>
                        <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6F6F72]">
                          {r.pendingLabel}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <div className="space-y-4">
              <Card title="Request Details">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Work Order" value={detail.details.workOrder} />
                  <Field label="Customer" value={detail.details.customer} />
                  <Field label="Location" value={detail.details.location} />
                  <Field
                    label="Technician"
                    value={detail.details.technician}
                  />
                  <Field
                    label="Form Requested"
                    value={detail.details.formRequested}
                  />
                  <Field
                    label="Urgency"
                    value={
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5",
                          urgencyTone(detail.details.urgency),
                        )}
                      >
                        {detail.details.urgency}
                      </span>
                    }
                  />
                </div>
              </Card>

              <Card title="Request History">
                <ul className="space-y-3">
                  {detail.history.map((h, i) => (
                    <li key={i}>
                      <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {h.when}
                      </p>
                      <p className="mt-0.5 font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {h.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Reason">
                <p className="font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                  {detail.reason}
                </p>
              </Card>

              <Card title="Rule">
                <p className="font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                  {detail.rule}
                </p>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
