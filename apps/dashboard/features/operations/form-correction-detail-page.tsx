"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardToolbarButton, cn } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type FormCorrectionDetail,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import {
  ApproveFormCorrectionModal,
  RejectFormCorrectionModal,
  RequestFormCorrectionModal,
} from "@/features/operations/form-correction-action-modals";

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
  if (s === "OPEN") return "border border-[#FDFDFF] text-[#FDFDFF]";
  if (s === "RESUBMITTED") return "bg-[#3A1C1C] text-[#E86A6A]";
  if (s === "APPROVED") return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s === "REJECTED") return "border border-[#B84A4A] text-[#E86A6A]";
  if (s === "NEEDS_INFO") return "bg-[#3A3218] text-[#E8C547]";
  return "border border-[#3E3E3E] text-[#959597]";
}

export function FormCorrectionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<FormCorrectionDetail | null>(null);
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);

  useSetHeaderBreadcrumb(
    detail ? `Form Corrections / ${detail.code}` : "Form Corrections / Detail",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getFormCorrection(id);
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
      else if (action === "deny") setRejectOpen(true);
      else setRequestOpen(true);
    },
    [detail],
  );

  useSetHeaderActions(
    detail ? (
      <div className="flex flex-wrap gap-2">
        <DashboardToolbarButton onClick={() => openAction("deny")}>
          Reject
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={() => openAction("more-info")}>
          Request Correction
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          onClick={() => openAction("approve")}
        >
          Approve Correction
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail, openAction],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!detail) return;
      if (approveOpen || rejectOpen || requestOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase();
      if (key === "a") openAction("approve");
      if (key === "d") openAction("deny");
      if (key === "i") openAction("more-info");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, openAction, approveOpen, rejectOpen, requestOpen]);

  function go(dir: -1 | 1) {
    if (!detail?.ids?.length) return;
    const next =
      detail.ids[(detail.index - 1 + dir + detail.ids.length) % detail.ids.length];
    if (next) router.push(`/operations/form-corrections/${next}`);
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {detail ? (
        <div className="space-y-4 bg-shell p-3 sm:p-6">
          <ApproveFormCorrectionModal
            open={approveOpen}
            detail={detail}
            onClose={() => setApproveOpen(false)}
            onDone={() => {
              void reload();
            }}
          />
          <RejectFormCorrectionModal
            open={rejectOpen}
            detail={detail}
            onClose={() => setRejectOpen(false)}
            onDone={() => {
              void reload();
            }}
          />
          <RequestFormCorrectionModal
            open={requestOpen}
            detail={detail}
            onClose={() => setRequestOpen(false)}
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
              </div>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                {detail.metaLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/operations/form-corrections"
                className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]"
              >
                ← Form Corrections
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
                          router.push(`/operations/form-corrections/${r.id}`);
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
                          router.push(`/operations/form-corrections/${r.id}`)
                        }
                        className={cn(
                          "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-[#2A2A2A]"
                            : "hover:bg-[#222222]",
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
              <Card
                title="Original Form"
                right={
                  <span className="font-sans text-[10px] uppercase text-[#E8A05C]">
                    {detail.original.lockedLabel}
                  </span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Form" value={detail.original.form} />
                  <Field
                    label="Submitted By"
                    value={detail.original.submittedBy}
                  />
                  <Field label="Submitted" value={detail.original.submitted} />
                </div>
                <p className="mt-4 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                  Issue Flagged: {detail.issueFlagged}
                </p>
              </Card>

              <Card title="Correction Requested">
                <Field
                  label="Requested By"
                  value={detail.correction.requestedBy}
                />
                <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8C8]">
                  {detail.correction.instruction}
                </p>
              </Card>

              <Card title="Resubmission">
                {detail.resubmission ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Version"
                      value={detail.resubmission.version}
                    />
                    <Field
                      label="Resubmitted By"
                      value={detail.resubmission.resubmittedBy}
                    />
                    <Field
                      label="Submitted"
                      value={detail.resubmission.submitted}
                    />
                    <Field label="Status" value={detail.resubmission.status} />
                  </div>
                ) : (
                  <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
                    No Resubmission Yet
                  </p>
                )}
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
