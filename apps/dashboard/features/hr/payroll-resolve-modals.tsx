"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";

export type ResolveKind =
  | "clock-out"
  | "edit"
  | "docs"
  | "form"
  | "gps"
  | "locked";

function KvRow({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) {
  const show = value?.trim() ? value : placeholder || "—";
  const muted = !value?.trim();
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]",
          muted ? "text-[#5A5A5A]" : "text-[#FDFDFF]",
        )}
      >
        {show}
      </span>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3">
      {children}
    </div>
  );
}

function MetaLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
      {children || "—"}
    </p>
  );
}

function FooterRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
  );
}

/** White primary CTA matching Figma payroll resolve modals. */
export function PayrollPrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "btn-base inline-flex h-8 items-center justify-center rounded-lg bg-[#FDFDFF] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#111111] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PayrollDangerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="btn-base inline-flex h-8 items-center justify-center rounded-lg bg-[#FF4D4D] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function PayrollWarnButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="btn-base inline-flex h-8 items-center justify-center rounded-lg bg-[#C9A227] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#111111] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ResolveClockOutModal({
  open,
  busy,
  metaLine,
  issue,
  clockIn,
  clockOutDisplay,
  onClose,
  onAskEmployee,
  onEnterClockOut,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  issue: string;
  clockIn: string;
  clockOutDisplay: string;
  onClose: () => void;
  onAskEmployee: () => void;
  onEnterClockOut: (clockOut: string) => void;
}) {
  const [clockOut, setClockOut] = React.useState("");
  const [entering, setEntering] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setClockOut("");
      setEntering(false);
    }
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: Employee Time Issue"
      widthClassName="max-w-lg"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onAskEmployee} disabled={busy}>
            Ask Employee
          </DashboardToolbarButton>
          {entering ? (
            <PayrollPrimaryButton
              disabled={busy || !clockOut.trim()}
              onClick={() => onEnterClockOut(clockOut.trim())}
            >
              Save Clock-Out
            </PayrollPrimaryButton>
          ) : (
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => setEntering(true)}
            >
              Enter Clock-Out
            </PayrollPrimaryButton>
          )}
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow label="Issue" value={issue} placeholder="—" />
        <KvRow label="Clock-In" value={clockIn} placeholder="—" />
        <KvRow
          label="Clock-Out"
          value={clockOutDisplay}
          placeholder="— Not Recorded"
        />
      </InfoBox>
      {entering ? (
        <label className="mt-4 block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Enter Clock-Out
          </span>
          <input
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            placeholder="05:00 PM CT"
            className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
          />
        </label>
      ) : null}
    </DashboardModal>
  );
}

export function ResolveEditRequestModal({
  open,
  busy,
  metaLine,
  original,
  requested,
  difference,
  approveLabel,
  onClose,
  onClarify,
  onReject,
  onApprove,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  original: string;
  requested: string;
  difference: string;
  approveLabel: string;
  onClose: () => void;
  onClarify: () => void;
  onReject: () => void;
  onApprove: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: Time Edit Request"
      widthClassName="max-w-xl"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onClarify} disabled={busy}>
            Ask for Clarification
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onReject} disabled={busy}>
            Reject
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onApprove}>
            {approveLabel || "Approve"}
          </PayrollPrimaryButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow label="Original" value={original} placeholder="—" />
        <KvRow label="Requested" value={requested} placeholder="—" />
        <KvRow label="Difference" value={difference} placeholder="—" />
      </InfoBox>
    </DashboardModal>
  );
}

export function ResolveDocsModal({
  open,
  busy,
  metaLine,
  missingDocuments,
  outstanding,
  impact,
  onClose,
  onUpload,
  onMarkResolved,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  missingDocuments: string;
  outstanding: string;
  impact: string;
  onClose: () => void;
  onUpload: () => void;
  onMarkResolved: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: Missing Document"
      widthClassName="max-w-lg"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onMarkResolved}>
            Mark Resolved
          </PayrollPrimaryButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow
          label="Missing Documents"
          value={missingDocuments}
          placeholder="—"
        />
        <KvRow label="Outstanding" value={outstanding} placeholder="—" />
        <KvRow label="Impact" value={impact} placeholder="—" />
      </InfoBox>
      <button
        type="button"
        onClick={onUpload}
        className="mt-4 flex w-full items-center justify-between rounded-lg bg-[#2A2A2A] px-4 py-3 font-sans text-[11px] uppercase tracking-[-0.02em]"
      >
        <span className="text-[#8BA3C7]">Upload Missing Documents</span>
        <span className="text-[#6B9EFF]">Upload →</span>
      </button>
    </DashboardModal>
  );
}

export function ResolveFormModal({
  open,
  busy,
  metaLine,
  form,
  status,
  impact,
  onClose,
  onNotify,
  onMarkComplete,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  form: string;
  status: string;
  impact: string;
  onClose: () => void;
  onNotify: () => void;
  onMarkComplete: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: Required Form Issue"
      widthClassName="max-w-lg"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onNotify} disabled={busy}>
            Notify Employee
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onMarkComplete}>
            Mark Complete
          </PayrollPrimaryButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow label="Form" value={form} placeholder="—" />
        <KvRow label="Status" value={status} placeholder="—" />
        <KvRow label="Impact" value={impact} placeholder="—" />
      </InfoBox>
    </DashboardModal>
  );
}

export function ResolveGpsModal({
  open,
  busy,
  metaLine,
  location,
  jobSite,
  flagReason,
  onClose,
  onMarkError,
  onConfirm,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  location: string;
  jobSite: string;
  flagReason: string;
  onClose: () => void;
  onMarkError: () => void;
  onConfirm: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: GPS Flag"
      widthClassName="max-w-lg"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onMarkError} disabled={busy}>
            Mark as GPS Error
          </DashboardToolbarButton>
          <PayrollWarnButton disabled={busy} onClick={onConfirm}>
            Confirm Flag
          </PayrollWarnButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow label="Location" value={location} placeholder="—" />
        <KvRow label="Job Site" value={jobSite} placeholder="—" />
        <KvRow label="Flag Reason" value={flagReason} placeholder="—" />
      </InfoBox>
    </DashboardModal>
  );
}

export function ResolveLockedEntryModal({
  open,
  busy,
  metaLine,
  lockedOn,
  payrollExported,
  impact,
  onClose,
  onRequestUnlock,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  lockedOn: string;
  payrollExported: string;
  impact: string;
  onClose: () => void;
  onRequestUnlock: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Resolve: Locked Entry"
      widthClassName="max-w-lg"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Return to Payroll Review
          </DashboardToolbarButton>
          <PayrollWarnButton disabled={busy} onClick={onRequestUnlock}>
            Request Unlock
          </PayrollWarnButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <InfoBox>
        <KvRow label="Locked On" value={lockedOn} placeholder="—" />
        <KvRow
          label="Payroll Exported"
          value={payrollExported}
          placeholder="—"
        />
        <KvRow label="Impact" value={impact} placeholder="—" />
      </InfoBox>
    </DashboardModal>
  );
}

export function RequestCycleUnlockModal({
  open,
  busy,
  metaLine,
  lockedOn,
  lockedBy,
  payrollExported,
  exportedBadge,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy?: boolean;
  metaLine: string;
  lockedOn: string;
  lockedBy: string;
  payrollExported: string;
  exportedBadge: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Request Cycle Unlock"
      widthClassName="max-w-xl"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Cancel
          </DashboardToolbarButton>
          <PayrollPrimaryButton
            disabled={busy || !reason.trim()}
            onClick={() => onSubmit(reason.trim())}
          >
            Submit Unlock Request
          </PayrollPrimaryButton>
        </FooterRow>
      }
    >
      <MetaLine>{metaLine}</MetaLine>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-sans text-[10px] uppercase text-[#959597]">
            Locked On
          </p>
          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {lockedOn || "—"}
          </p>
        </div>
        <div>
          <p className="mb-1 font-sans text-[10px] uppercase text-[#959597]">
            Locked By
          </p>
          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {lockedBy || "—"}
          </p>
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3">
        <div className="min-w-0">
          <p className="font-sans text-[10px] uppercase text-[#959597]">
            Payroll Exported
          </p>
          <p className="mt-1 font-sans text-[11px] uppercase text-[#FDFDFF]">
            {payrollExported || "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#3A1515] px-2.5 py-1 font-sans text-[10px] uppercase text-[#FF6B6B]">
          {exportedBadge || "—"}
        </span>
      </div>
      <label className="mb-4 block">
        <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
          Reason for Unlock (Required)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain why this locked cycle needs to be reopened…"
          className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
        />
      </label>
      <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1B2D] px-4 py-3 text-[#93C5FD]">
        <p className="mb-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]">
          What Will Be Audited
        </p>
        <ul className="list-disc space-y-1 pl-4 font-sans text-[10px] uppercase leading-relaxed">
          <li>Who unlocked and submitted the request</li>
          <li>Timestamp of the unlock</li>
          <li>Original vs. new hours for every changed entry</li>
          <li>Dollar delta per entry</li>
          <li>The off-cycle adjustment run it lands in</li>
        </ul>
      </div>
    </DashboardModal>
  );
}

export function LockPayCycleModal({
  open,
  busy,
  cycle,
  dateRange,
  employees,
  totalHours,
  grossTotal,
  unresolved,
  warning,
  onClose,
  onViewException,
  onLock,
}: {
  open: boolean;
  busy?: boolean;
  cycle: string;
  dateRange: string;
  employees: string;
  totalHours: string;
  grossTotal: string;
  unresolved: Array<{
    id: string;
    label: string;
    count: number;
    tone: string;
  }>;
  warning: string;
  onClose: () => void;
  onViewException: (id: string) => void;
  onLock: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Lock Pay Cycle"
      widthClassName="max-w-xl"
      footer={
        <FooterRow>
          <DashboardToolbarButton onClick={onClose} disabled={busy}>
            Cancel
          </DashboardToolbarButton>
          <PayrollDangerButton disabled={busy} onClick={onLock}>
            Lock Cycle
          </PayrollDangerButton>
        </FooterRow>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Cycle", cycle],
          ["Date Range", dateRange],
          ["Employees", employees],
          ["Total Hours", totalHours],
          ["Gross Total", grossTotal],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="mb-1 font-sans text-[10px] uppercase text-[#959597]">
              {label}
            </p>
            <p className="font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
              {value || "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        Unresolved Exceptions
      </p>
      <div className="mb-4 space-y-2">
        {unresolved.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5"
          >
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              {u.label}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewException(u.id)}
                className="font-sans text-[10px] uppercase text-[#6B9EFF]"
              >
                View →
              </button>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-sans text-[10px] uppercase",
                  u.tone === "danger"
                    ? "bg-[#3A1515] text-[#FF6B6B]"
                    : "bg-[#2A2618] text-[#C4A35A]",
                )}
              >
                Unresolved
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#7F1D1D] bg-[#2A1212] px-4 py-3">
        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#F87171]">
          {warning ||
            "Locking this cycle finalizes hours for payroll export."}
        </p>
      </div>
    </DashboardModal>
  );
}
