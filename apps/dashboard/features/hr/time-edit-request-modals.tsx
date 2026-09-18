"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import type { HrTimeEditRequest } from "@/lib/hr-api";

function metaLine(req: HrTimeEditRequest, extra?: string) {
  return [
    req.technician.name,
    req.workOrderCode,
    req.dateLabel,
    req.customerName,
    extra ?? req.typeLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatRange(clockIn?: string | null, clockOut?: string | null) {
  return `${clockIn ?? "—"} → ${clockOut ?? "—"}`;
}

function hoursLabel(n?: number | null) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}H`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
      {children}
    </p>
  );
}

function AlertBox({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "info"
      ? "border-[#1E3A5F] bg-[#0F1B2D] text-[#93C5FD]"
      : tone === "warning"
        ? "border-[#5C4A1F] bg-[#2A2210] text-[#E8C47C]"
        : "border-[#7F1D1D] bg-[#2A1212] text-[#F87171]";
  return (
    <div className={`rounded-lg border px-3 py-3 ${styles}`}>
      {title ? (
        <p className="mb-1.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] opacity-80">
          {title}
        </p>
      ) : null}
      <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]">
        {children}
      </p>
    </div>
  );
}

/** Same contextual alerts as the detail pane — GPS / audit where they belong. */
function RequestContextAlerts({ request }: { request: HrTimeEditRequest }) {
  const locked = Boolean(request.lockedCycle) || request.type === "ADMIN_OVERRIDE";
  return (
    <div className="space-y-3">
      {locked && request.auditWarning ? (
        <AlertBox tone="danger" title="Audit Warning">
          {request.auditWarning}
        </AlertBox>
      ) : null}
      {!locked && request.gpsContext ? (
        <AlertBox tone="info" title="GPS Context">
          {request.gpsContext}
        </AlertBox>
      ) : null}
    </div>
  );
}

export function ClarifyRequestModal({
  open,
  request,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  request: HrTimeEditRequest | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (question: string) => void;
}) {
  const [question, setQuestion] = React.useState("");

  React.useEffect(() => {
    if (open) setQuestion("");
  }, [open, request?.id]);

  if (!request) return null;

  const clockFocus =
    request.type === "CLOCK_OUT_CHANGE"
      ? {
          original: request.originalClockOut ?? "—",
          requested: request.requestedClockOut ?? "—",
          originalHint: "Clock-Out",
          requestedHint: request.deltaLabel,
        }
      : {
          original: request.originalClockIn ?? "—",
          requested: request.requestedClockIn ?? "—",
          originalHint: "Clock-In",
          requestedHint: request.deltaLabel,
        };

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Request Clarification"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || !question.trim()}
            onClick={() => onConfirm(question.trim())}
          >
            Send Request
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {metaLine(request)}
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Original
            </p>
            <p className="mt-1.5 font-sans text-[20px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
              {clockFocus.original}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {clockFocus.originalHint}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Requested
            </p>
            <p className="mt-1.5 font-sans text-[20px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
              {clockFocus.requested}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {clockFocus.requestedHint}
            </p>
          </div>
        </div>

        <RequestContextAlerts request={request} />

        <div>
          <FieldLabel>Question for Technician (Required)</FieldLabel>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="E.G. CAN YOU CONFIRM WHAT TIME THE BBS FORM WAS COMPLETED?"
            className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
          />
        </div>

        <AlertBox tone="warning">
          This will pause the request and notify the technician to provide more
          detail before it can be approved or rejected.
        </AlertBox>
      </div>
    </DashboardModal>
  );
}

export function ApproveRequestModal({
  open,
  request,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  request: HrTimeEditRequest | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (adminNote: string) => void;
}) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) setNote("");
  }, [open, request?.id]);

  if (!request) return null;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Approve Request"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy}
            onClick={() => onConfirm(note.trim())}
          >
            Approve {request.deltaLabel}
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {metaLine(request)}
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Original
            </p>
            <p className="mt-1.5 font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {formatRange(request.originalClockIn, request.originalClockOut)}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {hoursLabel(request.originalHours)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Requested
            </p>
            <p className="mt-1.5 font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {formatRange(request.requestedClockIn, request.requestedClockOut)}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {hoursLabel(request.requestedHours)} ({request.deltaLabel})
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Difference
            </p>
            <p className="mt-1.5 font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
              {request.deltaLabel}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {request.differenceKind}
            </p>
          </div>
        </div>

        {request.technicianReason ? (
          <div>
            <FieldLabel>Reason from Technician</FieldLabel>
            <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
              <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                {request.technicianReason}
              </p>
            </div>
          </div>
        ) : null}

        <RequestContextAlerts request={request} />

        <div>
          <FieldLabel>Admin Note (Optional)</FieldLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="INTERNAL NOTE FOR THIS APPROVAL..."
            className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
          />
        </div>

        <AlertBox tone="info">
          Approving will update the technician&apos;s payroll hours for this pay
          cycle. This action is logged in the audit history.
        </AlertBox>
      </div>
    </DashboardModal>
  );
}

export function RejectRequestModal({
  open,
  request,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  request: HrTimeEditRequest | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open, request?.id]);

  if (!request) return null;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Reject Request"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-white transition-opacity disabled:opacity-50"
          >
            Reject Request
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {metaLine(request)}
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Original
            </p>
            <p className="mt-1.5 font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {formatRange(request.originalClockIn, request.originalClockOut)}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {hoursLabel(request.originalHours)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Requested
            </p>
            <p className="mt-1.5 font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {formatRange(request.requestedClockIn, request.requestedClockOut)}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
              {hoursLabel(request.requestedHours)} ({request.deltaLabel})
            </p>
          </div>
        </div>

        <RequestContextAlerts request={request} />

        <div>
          <FieldLabel>Reason for Rejection (Required)</FieldLabel>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="EXPLAIN WHY THIS CORRECTION IS BEING REJECTED..."
            className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
          />
        </div>

        <AlertBox tone="danger">
          Rejecting will close this request without changing hours. The
          technician will be notified and can resubmit with more detail.
        </AlertBox>
      </div>
    </DashboardModal>
  );
}

export function OverrideConfirmModal({
  open,
  request,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  request: HrTimeEditRequest | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!request) return null;

  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Locked-Cycle Override Confirmation"
      widthClassName="max-w-2xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-white transition-opacity disabled:opacity-50"
          >
            Confirm Override
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {[
            request.technician.name,
            request.workOrderCode,
            request.dateLabel,
            request.customerName,
            request.payrollCycleLabel
              ? `${request.payrollCycleLabel} (Closed)`
              : "Locked cycle",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <AlertBox tone="danger" title="This override cannot be undone">
          {request.auditWarning ??
            "This cycle is closed and payroll was already exported. Approving reopens the entry and processes it as an off-cycle adjustment. The override will be permanently logged to the audit trail."}
        </AlertBox>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Original Hours
            </p>
            <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
              {hoursLabel(request.originalHours)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              New Hours
            </p>
            <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
              {hoursLabel(request.requestedHours)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Dollar Delta
            </p>
            <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
              {request.dollarDeltaLabel ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Who Approved
            </p>
            <p className="mt-1 font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              Ryan Crawford (CEO)
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Timestamp
            </p>
            <p className="mt-1 font-sans text-[12px] font-[510] text-[#FDFDFF]">
              {timestamp}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Off-Cycle Adjustment Run
            </p>
            <p className="mt-1 font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              {request.offCycleRunLabel ?? "Off-cycle adjustment"}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Audit Impact
            </p>
            <p className="mt-1 font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              Logged permanently · Flagged for payroll review
            </p>
          </div>
        </div>
      </div>
    </DashboardModal>
  );
}

export function typeBadgeClass(type: string) {
  const t = type.toUpperCase();
  if (t.includes("ADMIN"))
    return "border border-[#3B82F6] bg-transparent text-[#60A5FA]";
  return "bg-[#3F2E14] text-[#F5C15B]";
}

export function isLockedOverride(req: HrTimeEditRequest) {
  return Boolean(req.lockedCycle) || req.type === "ADMIN_OVERRIDE";
}

export { formatRange, hoursLabel };
