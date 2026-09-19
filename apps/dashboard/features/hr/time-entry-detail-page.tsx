"use client";

import * as React from "react";
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

function LightningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2L4 14h7l-1 8 10-14h-7l1-6z" fill="currentColor" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RejectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ApproveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 11l3 3L22 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  if (i.includes("PAYROLL")) return "bg-[#7F1D1D]/50 text-[#F87171]";
  if (i.includes("BILLING")) return "bg-[#78350F]/40 text-[#FBBF24]";
  return "bg-[#065F46]/50 text-[#34D399]";
}

function docStatusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "SUBMITTED") return "bg-[#065F46]/50 text-[#34D399]";
  if (s === "DUE") return "bg-[#713F12]/40 text-[#E8C47C]";
  return "bg-[#7F1D1D]/50 text-[#F87171]";
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
    <div className={cn("overflow-hidden rounded-xl bg-panel", className)}>
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
            <LightningIcon />
          </span>
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {meta ? (
            <span className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="px-4 pb-4 pt-2 sm:px-5">{children}</div>
    </div>
  );
}

function GpsMap({
  job,
  clockIn,
  clockOut,
  clockInTime,
  clockOutTime,
  footer,
}: {
  job: { lat: number; lng: number };
  clockIn: { lat: number; lng: number };
  clockOut: { lat: number; lng: number };
  clockInTime?: string | null;
  clockOutTime?: string | null;
  footer?: string;
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

  const jobX = toX(job.lng);
  const jobY = toY(job.lat);
  const inX = toX(clockIn.lng);
  const inY = toY(clockIn.lat);
  const outX = toX(clockOut.lng);
  const outY = toY(clockOut.lat);

  return (
    <div className="relative mt-4 h-52 overflow-hidden rounded-lg border border-[#2D2D30] bg-[#141414]">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <defs>
          <pattern
            id="te-gps-grid"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="#2A2A2A"
              strokeWidth="0.35"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#te-gps-grid)" />
        <path
          d={`M ${inX} ${inY} L ${jobX} ${jobY} L ${outX} ${outY}`}
          fill="none"
          stroke="#3A3A3A"
          strokeWidth="0.6"
          strokeDasharray="1.5 1.2"
        />
        <circle cx={jobX} cy={jobY} r="2.4" fill="#A78BFA" />
        <circle cx={inX} cy={inY} r="2.4" fill="#22C55E" />
        <circle cx={outX} cy={outY} r="2.4" fill="#F59E0B" />
      </svg>

      <span
        className="absolute -translate-x-1/2 -translate-y-full rounded bg-[#2A2A2A] px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-[-0.01em] text-[#C4B5FD]"
        style={{ left: `${jobX}%`, top: `${Math.max(jobY - 2, 8)}%` }}
      >
        Job Location
      </span>
      <span
        className="absolute -translate-x-1/2 rounded bg-[#2A2A2A] px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-[-0.01em] text-[#FBBF24]"
        style={{ left: `${outX}%`, top: `${Math.min(outY + 4, 88)}%` }}
      >
        Clock Out {clockOutTime ?? ""}
      </span>
      <span
        className="absolute -translate-x-1/2 rounded bg-[#2A2A2A] px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-[-0.01em] text-[#34D399]"
        style={{ left: `${inX}%`, top: `${Math.min(inY + 4, 88)}%` }}
      >
        Clock In {clockInTime ?? ""}
      </span>

      {footer ? (
        <p className="absolute bottom-2 left-3 font-sans text-[9px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
          {footer}
        </p>
      ) : null}
    </div>
  );
}

const NB_REASONS = [
  "NOT APPLICABLE",
  "TRAVEL",
  "TRAINING",
  "STANDBY",
  "WEATHER",
  "OTHER",
];

const NB_HOURS = ["0.5H", "1H", "1.5H", "2H", "2.5H", "3H", "4H"];

function formatCoord(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return "—";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lng).toFixed(4)}°${ew}`;
}

function formatHistoryAt(iso: string) {
  const d = new Date(iso);
  const date = d
    .toLocaleString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  const time = d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

export function TimeEntryDetailPage({ entryId }: { entryId: string }) {
  const { askPrompt, askConfirm, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entry, setEntry] = React.useState<HrTimeEntry | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [adminNote, setAdminNote] = React.useState("");
  const [nbReason, setNbReason] = React.useState("");
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
        setAdminNote("");
        setNbReason("");
        setNbHours("");
        setNbContext("");
        setEditHours("");
        setEditReason("");
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

  useSetHeaderActions(null, []);

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

  const dash = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  const parseHoursLabel = (label: string) => {
    const n = Number(String(label).replace(/h/gi, "").trim());
    return Number.isFinite(n) ? n : undefined;
  };

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
          <div className="space-y-4 bg-shell p-3 sm:p-6">
            <div className="flex flex-col gap-3 rounded-xl bg-panel px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-sans text-[20px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                    {Number(entry.hours).toFixed(1)}H · {entry.technician.name}
                  </h1>
                  <DashboardBadge variant={statusVariant(entry.status)}>
                    {statusLabel(entry.status)}
                  </DashboardBadge>
                  {entry.missingDocs ? (
                    <DashboardBadge variant="offline">Missing Docs</DashboardBadge>
                  ) : null}
                </div>
                <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {[
                    entry.workOrderCode,
                    entry.customerName,
                    entry.jobLocation?.split(" - ").pop(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardToolbarButton
                  disabled={busy || entry.locked}
                  onClick={() => setEditOpen((o) => !o)}
                  className="gap-1.5"
                >
                  <PencilIcon />
                  Edit as Admin
                </DashboardToolbarButton>
                <DashboardToolbarButton
                  disabled={busy || entry.locked}
                  onClick={onReject}
                  className="gap-1.5"
                >
                  <RejectIcon />
                  Reject
                </DashboardToolbarButton>
                <DashboardToolbarButton
                  variant="primary"
                  disabled={busy || entry.locked || entry.status === "APPROVED"}
                  onClick={onApprove}
                  className="gap-1.5"
                >
                  <ApproveIcon />
                  Approve
                </DashboardToolbarButton>
              </div>
            </div>

            {editOpen ? (
              <Panel title="Edit as Admin">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                      Approved Hours
                    </span>
                    <input
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                      Correction Reason
                    </span>
                    <input
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
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

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Panel title="Clock vs GPS Decision">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                          {Number(
                            entry.systemSuggestedHours ?? entry.hours,
                          ).toFixed(1)}
                          H
                        </p>
                        <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                          System Suggested Hours
                        </p>
                      </div>
                      <div>
                        <p className="font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                          {Number(entry.hours).toFixed(1)}H
                        </p>
                        <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                          Admin Approved Hours
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 border-t border-[#2D2D30] pt-3">
                      <div>
                        <p className="font-sans text-[10px] uppercase text-[#959597]">
                          Correction Applied
                        </p>
                        <p className="mt-0.5 font-sans text-[11px] uppercase text-[#FDFDFF]">
                          {entry.correctionApplied ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="font-sans text-[10px] uppercase text-[#959597]">
                          Correction Reason
                        </p>
                        <p className="mt-0.5 font-sans text-[11px] uppercase leading-snug text-[#FDFDFF]">
                          {dash(entry.correctionReason)}
                        </p>
                      </div>
                    </div>
                  </Panel>

                  <Panel title="Job">
                    <p className="font-sans text-[16px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                      {dash(entry.workOrderCode)}
                    </p>
                    <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {[entry.customerName, entry.jobLocation?.split(" - ").pop()]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <div className="mt-4 space-y-2 border-t border-[#2D2D30] pt-3">
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Job Type:{" "}
                        <span className="text-[#FDFDFF]">{dash(entry.jobType)}</span>
                      </p>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        ST:{" "}
                        <span className="text-[#FDFDFF]">
                          {dash(entry.salesTicketId ?? entry.workOrderShort)}
                        </span>
                      </p>
                    </div>
                  </Panel>

                  <Panel title="Compliance">
                    <p className="font-sans text-[22px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                      {entry.docsSubmitted ?? 0} / {entry.docsRequired ?? 0}
                    </p>
                    <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                      Documents Submitted
                    </p>
                    <div className="mt-4 border-t border-[#2D2D30] pt-3">
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Payroll-Block List
                      </p>
                      <p className="mt-0.5 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
                        {entry.payrollBlockCount ?? 0}/{entry.docsRequired ?? 0}
                      </p>
                    </div>
                  </Panel>
                </div>

                <Panel
                  title="GPS Verification"
                  badge={
                    <span className="rounded-full bg-[#065F46]/45 px-2.5 py-1 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em] text-[#34D399]">
                      {dash(entry.gpsStatusLabel ?? entry.gpsLabel)}
                    </span>
                  }
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                        Clock-In
                      </p>
                      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {dash(entry.clockIn)}
                        {entry.clockInLat != null ? (
                          <>
                            {" · "}
                            {formatCoord(entry.clockInLat, entry.clockInLng)}
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {entry.clockInDistanceMi != null
                          ? `${entry.clockInDistanceMi} mi from job`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                        Clock-Out
                      </p>
                      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {dash(entry.clockOut)}
                        {entry.clockOutLat != null ? (
                          <>
                            {" · "}
                            {formatCoord(entry.clockOutLat, entry.clockOutLng)}
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {entry.clockOutDistanceMi != null
                          ? `${entry.clockOutDistanceMi} mi from job`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {entry.jobLat != null &&
                  entry.clockInLat != null &&
                  entry.clockOutLat != null ? (
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
                      clockInTime={entry.clockIn}
                      clockOutTime={entry.clockOut}
                      footer={[
                        formatCoord(entry.jobLat, entry.jobLng),
                        entry.jobSiteLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
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
                    <ul className="divide-y divide-[#2D2D30]">
                      {(entry.requiredDocuments ?? []).map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-0"
                        >
                          <span className="min-w-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {doc.name}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em]",
                                impactTone(doc.impact),
                              )}
                            >
                              {doc.impact.replaceAll("_", "-")}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em]",
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
                    <ul className="divide-y divide-[#2D2D30]">
                      {(entry.editHistory ?? []).map((h) => (
                        <li key={h.id} className="py-3.5 first:pt-1 last:pb-0">
                          <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                            {formatHistoryAt(h.at)}
                          </p>
                          <p className="mt-1 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {h.label}
                          </p>
                          {h.detail ? (
                            <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Payroll
                      </p>
                      <p className="mt-1 font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {Number(entry.payrollHours ?? entry.hours).toFixed(1)}H
                      </p>
                      <p className="mt-1 font-sans text-[9px] uppercase text-[#6B6B6B]">
                        What we pay the tech
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Billable
                      </p>
                      <p className="mt-1 font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {Number(
                          entry.billableHours ??
                            entry.workHours ??
                            entry.hours,
                        ).toFixed(1)}
                        H
                      </p>
                      <p className="mt-1 font-sans text-[9px] uppercase text-[#6B6B6B]">
                        Customer-billable only
                      </p>
                    </div>
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
                      <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                        Reason
                      </span>
                      <div className="relative">
                        <select
                          value={nbReason}
                          onChange={(e) => setNbReason(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 pr-8 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                        >
                          <option value="">Select reason</option>
                          {NB_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#959597]">
                          <ChevronDownIcon />
                        </span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                        Hours
                      </span>
                      <div className="relative">
                        <select
                          value={nbHours}
                          onChange={(e) => setNbHours(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 pr-8 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                        >
                          <option value="">Select hours</option>
                          {NB_HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#959597]">
                          <ChevronDownIcon />
                        </span>
                      </div>
                    </label>
                    <label className="block">
                      <textarea
                        value={nbContext}
                        onChange={(e) => setNbContext(e.target.value)}
                        rows={3}
                        placeholder="ADD CONTEXT (OPTIONAL)"
                        className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
                      />
                    </label>
                    <DashboardToolbarButton
                      className="w-full"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          try {
                            const hoursVal = parseHoursLabel(nbHours);
                            const res = await hrApi.requestTimeEntryCorrection(
                              entry.id,
                              {
                                nonBillableReason:
                                  nbReason === "NOT APPLICABLE"
                                    ? undefined
                                    : nbReason,
                                nonBillableHours: hoursVal,
                                nonBillableContext:
                                  nbContext.trim() || undefined,
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
                    className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase leading-relaxed text-[#FDFDFF] outline-none"
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
