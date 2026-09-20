"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";
import { safetyApi, type SafetyFormPreview } from "@/lib/safety-api";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  OpsDetailStateGate,
} from "@/features/operations/operations-states";

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[9px] uppercase tracking-[0.04em] text-[#6F6F72]">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-[12px] font-medium uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  const left = rows.filter((_, i) => i % 2 === 0);
  const right = rows.filter((_, i) => i % 2 === 1);
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1F1F1F] p-4">
      <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          {left.map((r) => (
            <MetaCell key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
        <div className="space-y-3">
          {right.map((r) => (
            <MetaCell key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SafetyFormPrintPreviewPage({ formId }: { formId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<SafetyFormPreview | null>(null);

  useSetHeaderBreadcrumb(
    preview?.printTitle
      ? `Safety & Compliance / Forms / ${preview.printTitle}`
      : "Safety & Compliance / Forms / Print Preview",
  );

  useSetHeaderActions(
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#959597] hover:bg-[#2A2A2A] hover:text-[#FDFDFF]"
        aria-label="Print"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M6 14h12v7H6v-7z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <Link
        href={`/safety/forms/${formId}`}
        className="rounded-lg border border-[#3E3E3E] px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#2A2A2A]"
      >
        ✕ Close
      </Link>
    </div>,
    [formId],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safetyApi.previewForm(formId);
      setPreview(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const meta = preview?.submission.meta;
  const locked =
    preview?.submission.status === "LOCKED" || meta?.footer?.locked;

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void load()}
    >
      {preview && meta ? (
        <div className="mx-auto max-w-3xl bg-shell p-3 sm:p-5">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2A2A2A] pb-5">
              <div className="flex gap-3">
                <div className="h-12 w-12 shrink-0 rounded-md bg-[#FDFDFF]" />
                <div>
                  <p className="font-sans text-[13px] font-semibold uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {meta.company?.name ?? "DARK HORSE DISPLAY"}
                  </p>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    {meta.company?.address}
                  </p>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    {meta.company?.phone} · {meta.company?.website}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {meta.formLabel ?? "SAFETY FORM"}
                </p>
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {preview.form.version}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  {meta.formDate ?? preview.previewDate}
                </p>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-b border-[#2A2A2A] pb-4 sm:grid-cols-4">
              <MetaCell
                label="Work Order"
                value={meta.workOrder ?? preview.submission.workOrderCode ?? "—"}
              />
              <MetaCell
                label="Customer"
                value={meta.customer ?? preview.submission.customerName ?? "—"}
              />
              <MetaCell
                label="Location"
                value={
                  meta.location ?? preview.submission.locationLabel ?? "—"
                }
              />
              <MetaCell
                label="Submitted"
                value={
                  meta.submittedLabel ??
                  preview.submission.submittedAt ??
                  "—"
                }
              />
            </div>

            <div className="mt-4 space-y-3">
              <InfoBlock
                title="Employee Information"
                rows={[
                  {
                    label: "Employee Name",
                    value: meta.employee?.name ?? "—",
                  },
                  {
                    label: "Employee ID",
                    value: meta.employee?.id ?? "—",
                  },
                  {
                    label: "Date of Inspection",
                    value: meta.employee?.inspectionDate ?? "—",
                  },
                  {
                    label: "Crew / Team",
                    value: meta.employee?.crew ?? "—",
                  },
                ]}
              />
              <InfoBlock
                title="Company Information"
                rows={[
                  {
                    label: "Company Name",
                    value: meta.companyInfo?.name ?? "—",
                  },
                  {
                    label: "Contact",
                    value: meta.companyInfo?.contact ?? "—",
                  },
                  {
                    label: "Contact Phone",
                    value: meta.companyInfo?.phone ?? "—",
                  },
                  {
                    label: "Site Address",
                    value: meta.companyInfo?.siteAddress ?? "—",
                  },
                ]}
              />
              <InfoBlock
                title="Equipment Information"
                rows={[
                  {
                    label: "Equipment Type",
                    value: meta.equipment?.type ?? "—",
                  },
                  {
                    label: "Serial Number",
                    value: meta.equipment?.serial ?? "—",
                  },
                  {
                    label: "Last Calibrated",
                    value: meta.equipment?.lastCalibrated ?? "—",
                  },
                  {
                    label: "Condition",
                    value: meta.equipment?.condition ?? "—",
                  },
                ]}
              />
            </div>

            {/* Signature */}
            <div className="mt-4">
              <p className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {meta.signature?.title ?? "Title Name — Signature"}
              </p>
              <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#121212]">
                <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  {meta.signature?.onFile
                    ? "[SIGNATURE ON FILE]"
                    : "No signature"}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetaCell
                  label="Signed By"
                  value={meta.signature?.signedBy ?? "—"}
                />
                <MetaCell
                  label="Signed At"
                  value={meta.signature?.signedAt ?? "—"}
                />
                <MetaCell label="GPS" value={meta.signature?.gps ?? "—"} />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[#2A2A2A] pt-4">
              <div className="space-y-1">
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Submission ID:{" "}
                  <span className="text-[#959597]">
                    {meta.footer?.submissionId ?? preview.submission.code}
                  </span>
                </p>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Submitted By:{" "}
                  <span className="text-[#959597]">
                    {meta.footer?.submittedBy ??
                      preview.submission.submittedByName}
                  </span>
                </p>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Submitted At:{" "}
                  <span className="text-[#959597]">
                    {meta.footer?.submittedAt ?? meta.submittedLabel}
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-4 py-2 font-sans text-[11px] uppercase tracking-[-0.02em]",
                  locked
                    ? "border-[#3B82F6] text-[#3B82F6]"
                    : "border-[#3E3E3E] text-[#959597]",
                )}
              >
                {locked ? "Locked Submission" : preview.submission.status}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
