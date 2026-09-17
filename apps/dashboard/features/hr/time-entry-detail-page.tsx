"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi, type HrTimeEntry } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "success" as const;
  if (s === "PENDING" || s === "MISSING_CO" || s === "DUE") return "warning" as const;
  if (s === "REJECTED" || s === "MISSING") return "offline" as const;
  return "offline" as const;
}

function statusLabel(status: string) {
  if (status === "MISSING_CO") return "MISSING C.O";
  return status.replaceAll("_", " ");
}

function impactTone(impact: string) {
  const i = impact.toUpperCase();
  if (i.includes("PAYROLL")) return "border-[#FF6B6B]/40 text-[#FF6B6B]";
  if (i.includes("BILLING")) return "border-[#F59E0B]/40 text-[#F59E0B]";
  return "border-[#22C55E]/40 text-[#22C55E]";
}

function docStatusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "SUBMITTED") return "border-[#22C55E]/40 text-[#22C55E]";
  if (s === "DUE") return "border-[#E8C47C]/40 text-[#E8C47C]";
  return "border-[#FF6B6B]/40 text-[#FF6B6B]";
}

function Panel({
  title,
  meta,
  badge,
  children,
  className,
}: {
  title: string;
  meta?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
          {badge}
        </div>
        {meta ? (
          <span className="shrink-0 font-sans text-[10px] uppercase text-[#959597]">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="px-4 pb-4 pt-2 sm:px-5">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </p>
      <p className="mt-1 font-sans text-[16px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6B]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function GpsMap({
  job,
  clockIn,
  clockOut,
}: {
  job: { lat: number; lng: number };
  clockIn: { lat: number; lng: number };
  clockOut: { lat: number; lng: number };
}) {
  const pts = [job, clockIn, clockOut];
  const minLat = Math.min(...pts.map((p) => p.lat));
  const maxLat = Math.max(...pts.map((p) => p.lat));
  const minLng = Math.min(...pts.map((p) => p.lng));
  const maxLng = Math.max(...pts.map((p) => p.lng));
  const pad = 0.002;
  const toX = (lng: number) =>
    ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
  const toY = (lat: number) =>
    (1 - (lat - (minLat - pad)) / (maxLat - minLat + pad * 2)) * 100;

  return (
    <div className="relative h-44 overflow-hidden rounded-lg border border-[#2D2D30] bg-[#141414]">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#2A2A2A"
              strokeWidth="0.4"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <circle cx={toX(job.lng)} cy={toY(job.lat)} r="2.2" fill="#E8C47C" />
        <circle cx={toX(clockIn.lng)} cy={toY(clockIn.lat)} r="2.2" fill="#22C55E" />
        <circle
          cx={toX(clockOut.lng)}
          cy={toY(clockOut.lat)}
          r="2.2"
          fill="#F59E0B"
        />
      </svg>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
        <span className="rounded bg-black/60 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#E8C47C]">
          Job
        </span>
        <span className="rounded bg-black/60 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#22C55E]">
          Clock In
        </span>
        <span className="rounded bg-black/60 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#F59E0B]">
          Clock Out
        </span>
      </div>
    </div>
  );
}

const NB_REASONS = [
  "ANY / SELECT",
  "TRAVEL",
  "TRAINING",
  "STANDBY",
  "WEATHER",
  "OTHER",
];

export function TimeEntryDetailPage({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { askPrompt, askConfirm, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entry, setEntry] = React.useState<HrTimeEntry | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [adminNote, setAdminNote] = React.useState("");
  const [nbReason, setNbReason] = React.useState("ANY / SELECT");
  const [nbHours, setNbHours] = React.useState("");
  const [nbContext, setNbContext] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editHours, setEditHours] = React.useState("");
  const [editReason, setEditReason] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await hrApi.getTimeEntry(entryId);
        if (cancelled) return;
        setEntry(res.data);
        setAdminNote(res.data.adminNote ?? "");
        setNbReason(res.data.nonBillableReason || "ANY / SELECT");
        setNbHours(
          res.data.nonBillableHours != null
            ? String(res.data.nonBillableHours)
            : "",
        );
        setNbContext(res.data.nonBillableContext ?? "");
        setEditHours(String(res.data.hours));
        setEditReason(res.data.correctionReason ?? "");
      } catch (err) {
        if (!cancelled) {
          setEntry(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, reloadKey]);

  useSetHeaderBreadcrumb(
    entry
      ? `Time Entries / ${entry.technician.name} · ${entry.dateLabel}`
      : "Time Entries / Detail",
  );

  const onApprove = React.useCallback(() => {
    if (!entry) return;
    void (async () => {
      const ok = await askConfirm({
        title: "Approve time entry?",
        description: `Approve ${entry.hours}H for ${entry.technician.name}?`,
        confirmLabel: "Approve",
      });
      if (!ok) return;
      setBusy(true);
      try {
        const res = await hrApi.approveTimeEntry(entry.id);
        setEntry(res.data);
        toastSuccess("Time entry approved");
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, [askConfirm, entry]);

  const onReject = React.useCallback(() => {
    if (!entry) return;
    void (async () => {
      const reason = await askPrompt({
        title: "Reject time entry",
        label: "Reason",
        placeholder: "Why is this entry rejected?",
        confirmLabel: "Reject",
      });
      if (reason == null) return;
      setBusy(true);
      try {
        const res = await hrApi.rejectTimeEntry(
          entry.id,
          reason.trim() || undefined,
        );
        setEntry(res.data);
        toastSuccess("Time entry rejected");
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, [askPrompt, entry]);

  useSetHeaderActions(
    entry ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DashboardToolbarButton
          disabled={busy || entry.locked}
          onClick={() => setEditOpen((o) => !o)}
        >
          Edit as Admin
        </DashboardToolbarButton>
        <DashboardToolbarButton
          disabled={busy || entry.locked}
          onClick={onReject}
        >
          Reject
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={busy || entry.locked || entry.status === "APPROVED"}
          onClick={onApprove}
        >
          Approve
        </DashboardToolbarButton>
      </div>
    ) : null,
    [entry?.id, entry?.status, entry?.locked, busy, onApprove, onReject],
  );

  const dash = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  return (
    <>
      <CrmDetailStateGate
        loading={loading}
        error={error}
        missing={!loading && !entry}
        missingTitle="Time Entry Not Found"
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {entry ? (
          <div className="space-y-4 bg-shell p-3 sm:p-5">
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-panel px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                    {Number(entry.hours).toFixed(1)}H · {entry.technician.name}
                  </h1>
                  <DashboardBadge variant={statusVariant(entry.status)}>
                    {statusLabel(entry.status)}
                  </DashboardBadge>
                  {entry.missingDocs ? (
                    <DashboardBadge variant="offline">Missing Docs</DashboardBadge>
                  ) : null}
                </div>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {[
                    entry.workOrderCode,
                    entry.customerName,
                    entry.jobLocation?.split(" - ").pop(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Link
                  href={`/hr/employees/${entry.technician.id}`}
                  className="mt-2 inline-flex font-sans text-[10px] uppercase text-[#60A5FA] underline"
                >
                  {entry.technician.code} · View employee
                </Link>
              </div>
              <DashboardToolbarButton
                onClick={() => router.push("/hr/time-entries")}
              >
                Back to List
              </DashboardToolbarButton>
            </div>

            {editOpen ? (
              <Panel title="Edit as Admin">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                      Approved Hours
                    </span>
                    <input
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                      Correction Reason
                    </span>
                    <input
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <DashboardToolbarButton onClick={() => setEditOpen(false)}>
                    Cancel
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    variant="primary"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        try {
                          const res = await hrApi.updateTimeEntryAdmin(
                            entry.id,
                            {
                              hours: Number(editHours) || entry.hours,
                              payrollHours: Number(editHours) || entry.hours,
                              correctionApplied: true,
                              correctionReason: editReason.trim() || undefined,
                            },
                          );
                          setEntry(res.data);
                          setEditOpen(false);
                          toastSuccess("Entry updated");
                        } catch (err) {
                          toastApiError(err);
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Save Edit
                  </DashboardToolbarButton>
                </div>
              </Panel>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Clock vs GPS Decision">
                <div className="grid grid-cols-2 gap-4">
                  <Metric
                    label="System Suggested"
                    value={`${Number(entry.systemSuggestedHours ?? entry.hours).toFixed(1)}H`}
                  />
                  <Metric
                    label="Admin Approved"
                    value={`${Number(entry.hours).toFixed(1)}H`}
                  />
                </div>
                <div className="mt-4 space-y-1 border-t border-[#2D2D30] pt-3">
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Correction Applied:{" "}
                    <span className="text-[#FDFDFF]">
                      {entry.correctionApplied ? "Yes" : "No"}
                    </span>
                  </p>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Correction Reason:{" "}
                    <span className="text-[#FDFDFF]">
                      {dash(entry.correctionReason)}
                    </span>
                  </p>
                </div>
              </Panel>

              <Panel title="Job Details">
                <div className="space-y-2">
                  <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                    Job ID · {dash(entry.workOrderCode)}
                  </p>
                  <p className="font-sans text-[11px] uppercase text-[#959597]">
                    Location · {dash(entry.jobLocation)}
                  </p>
                  <p className="font-sans text-[11px] uppercase text-[#959597]">
                    Job Type · {dash(entry.jobType)}
                  </p>
                  <p className="font-sans text-[11px] uppercase text-[#60A5FA]">
                    {dash(entry.salesTicketId ?? entry.workOrderShort)}
                  </p>
                </div>
              </Panel>

              <Panel title="Compliance">
                <Metric
                  label="Documents Submitted"
                  value={`${entry.docsSubmitted ?? 0} / ${entry.docsRequired ?? 0}`}
                />
                <p className="mt-3 font-sans text-[11px] uppercase text-[#F59E0B]">
                  Payroll-Block List {entry.payrollBlockCount ?? 0}/
                  {entry.docsRequired ?? 0}
                </p>
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Panel
                  title="GPS Verification"
                  badge={
                    <span className="rounded-full border border-[#22C55E]/40 px-2 py-0.5 font-sans text-[9px] uppercase text-[#22C55E]">
                      {dash(entry.gpsStatusLabel ?? entry.gpsLabel)}
                    </span>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Clock-In
                      </p>
                      <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {dash(entry.clockIn)}
                      </p>
                      <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {entry.clockInLat != null
                          ? `${entry.clockInLat.toFixed(4)}°N, ${Math.abs(entry.clockInLng ?? 0).toFixed(4)}°W`
                          : "—"}
                      </p>
                      <p className="font-sans text-[10px] uppercase text-[#22C55E]">
                        {entry.clockInDistanceMi != null
                          ? `${entry.clockInDistanceMi} mi from job`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Clock-Out
                      </p>
                      <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {dash(entry.clockOut)}
                      </p>
                      <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {entry.clockOutLat != null
                          ? `${entry.clockOutLat.toFixed(4)}°N, ${Math.abs(entry.clockOutLng ?? 0).toFixed(4)}°W`
                          : "—"}
                      </p>
                      <p className="font-sans text-[10px] uppercase text-[#F59E0B]">
                        {entry.clockOutDistanceMi != null
                          ? `${entry.clockOutDistanceMi} mi from job`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {entry.jobLat != null &&
                  entry.clockInLat != null &&
                  entry.clockOutLat != null ? (
                    <div className="mt-3">
                      <GpsMap
                        job={{ lat: entry.jobLat, lng: entry.jobLng ?? 0 }}
                        clockIn={{
                          lat: entry.clockInLat,
                          lng: entry.clockInLng ?? 0,
                        }}
                        clockOut={{
                          lat: entry.clockOutLat,
                          lng: entry.clockOutLng ?? 0,
                        }}
                      />
                      <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
                        {dash(entry.jobSiteLabel)} ·{" "}
                        {entry.jobLat.toFixed(4)}°N,{" "}
                        {Math.abs(entry.jobLng ?? 0).toFixed(4)}°W
                      </p>
                    </div>
                  ) : null}
                </Panel>

                <Panel
                  title="Required Documents"
                  meta={`${entry.docsSubmitted ?? 0} of ${entry.docsRequired ?? 0} submitted`}
                >
                  {(entry.requiredDocuments ?? []).length === 0 ? (
                    <p className="py-4 text-center font-sans text-[11px] uppercase text-[#959597]">
                      No required documents
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(entry.requiredDocuments ?? []).map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2"
                        >
                          <span className="min-w-0 font-sans text-[11px] uppercase text-[#FDFDFF]">
                            {doc.name}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase",
                                impactTone(doc.impact),
                              )}
                            >
                              {doc.impact.replaceAll("_", "-")}
                            </span>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase",
                                docStatusTone(doc.status),
                              )}
                            >
                              {doc.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Edit & Approval History">
                  {(entry.editHistory ?? []).length === 0 ? (
                    <p className="py-4 text-center font-sans text-[11px] uppercase text-[#959597]">
                      No history yet
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {(entry.editHistory ?? []).map((h) => (
                        <li key={h.id}>
                          <p className="font-sans text-[10px] uppercase text-[#959597]">
                            {new Date(h.at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                            {h.label}
                          </p>
                          {h.detail ? (
                            <p className="font-sans text-[10px] uppercase text-[#6B6B6B]">
                              {h.detail}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel title="Billing Comparison">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric
                      label="Payroll"
                      value={`${Number(entry.payrollHours ?? entry.hours).toFixed(1)}H`}
                      hint="What we pay the tech"
                    />
                    <Metric
                      label="Billable"
                      value={`${Number(entry.billableHours ?? entry.workHours ?? entry.hours).toFixed(1)}H`}
                      hint="Customer-billable only"
                    />
                  </div>
                  <DashboardToolbarButton
                    className="mt-4 w-full"
                    onClick={() =>
                      toastSuccess("Billing detail opens in payroll review")
                    }
                  >
                    Open Billing Detail
                  </DashboardToolbarButton>
                </Panel>

                <Panel title="Non-Billable Reason">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                        Reason
                      </span>
                      <select
                        value={nbReason}
                        onChange={(e) => setNbReason(e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                      >
                        {NB_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                        Hours
                      </span>
                      <input
                        value={nbHours}
                        onChange={(e) => setNbHours(e.target.value)}
                        placeholder="0.0"
                        className="h-9 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                        Add Context (Optional)
                      </span>
                      <textarea
                        value={nbContext}
                        onChange={(e) => setNbContext(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                      />
                    </label>
                    <DashboardToolbarButton
                      variant="primary"
                      className="w-full"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          try {
                            const res = await hrApi.requestTimeEntryCorrection(
                              entry.id,
                              {
                                nonBillableReason:
                                  nbReason === "ANY / SELECT"
                                    ? undefined
                                    : nbReason,
                                nonBillableHours: nbHours
                                  ? Number(nbHours)
                                  : undefined,
                                nonBillableContext: nbContext.trim() || undefined,
                                reason: nbContext.trim() || nbReason,
                              },
                            );
                            setEntry(res.data);
                            toastSuccess("Correction requested");
                          } catch (err) {
                            toastApiError(err);
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Request Correction
                    </DashboardToolbarButton>
                  </div>
                </Panel>

                <Panel title="Admin Note">
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                  />
                  <DashboardToolbarButton
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        try {
                          const res = await hrApi.saveTimeEntryAdminNote(
                            entry.id,
                            adminNote,
                          );
                          setEntry(res.data);
                          toastSuccess("Admin note saved");
                        } catch (err) {
                          toastApiError(err);
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Save Note
                  </DashboardToolbarButton>
                </Panel>
              </div>
            </div>
          </div>
        ) : null}
      </CrmDetailStateGate>
      {dialogs}
    </>
  );
}
