"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  PayrollPrimaryButton,
} from "@/features/hr/payroll-resolve-modals";

function KvRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <span className="min-w-0 text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

function FooterCancel({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF] disabled:opacity-50"
    >
      Cancel
    </button>
  );
}

function ErrorIcon() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4D4D] text-white">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7l10 10M17 7L7 17"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function SuccessIcon() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#22C55E] text-white">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 12.5l4 4 8-9"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ExportIcon() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-white">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 16V4M8 8l4-4 4 4M5 20h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function WarnTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4l10 17H2L12 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v5M12 17.5h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConfirmPayrollExportModal({
  open,
  busy,
  payCycle,
  employeeCount,
  totalHours,
  grossTotal,
  fileFormat,
  destination,
  warning,
  onClose,
  onReviewExceptions,
  onExportNow,
}: {
  open: boolean;
  busy?: boolean;
  payCycle: string;
  employeeCount: string;
  totalHours: string;
  grossTotal: string;
  fileFormat: string;
  destination: string;
  warning?: string | null;
  onClose: () => void;
  onReviewExceptions: () => void;
  onExportNow: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Confirm Payroll Export"
      titleLeading={<ExportIcon />}
      widthClassName="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <FooterCancel onClick={onClose} disabled={busy} />
          <DashboardToolbarButton
            onClick={onReviewExceptions}
            disabled={busy}
          >
            Review Exceptions
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onExportNow}>
            Export Now
          </PayrollPrimaryButton>
        </div>
      }
    >
      {warning ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#5C4A1F] bg-[#2A2210] px-3 py-3 text-[#E8C47C]">
          <span className="mt-0.5 shrink-0">
            <WarnTriangle />
          </span>
          <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]">
            {warning}
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3">
        <KvRow label="Pay Cycle" value={payCycle} />
        <KvRow label="Employee Count" value={employeeCount} />
        <KvRow label="Total Hours" value={totalHours} />
        <KvRow label="Gross Total" value={grossTotal} />
        <KvRow label="File Format" value={fileFormat} />
        <KvRow label="Destination" value={destination} />
      </div>
    </DashboardModal>
  );
}

export function ExportCreatedModal({
  open,
  busy,
  file,
  payCycle,
  employees,
  grossTotal,
  timestamp,
  warning,
  onClose,
  onViewHistory,
  onLockCycle,
  onDownload,
}: {
  open: boolean;
  busy?: boolean;
  file: string;
  payCycle: string;
  employees: string | number;
  grossTotal: string;
  timestamp: string;
  warning?: string | null;
  onClose: () => void;
  onViewHistory: () => void;
  onLockCycle: () => void;
  onDownload: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Export Created"
      titleLeading={<SuccessIcon />}
      widthClassName="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <FooterCancel onClick={onClose} disabled={busy} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DashboardToolbarButton onClick={onViewHistory} disabled={busy}>
              View Export History
            </DashboardToolbarButton>
            <DashboardToolbarButton onClick={onLockCycle} disabled={busy}>
              Lock Cycle
            </DashboardToolbarButton>
            <PayrollPrimaryButton disabled={busy} onClick={onDownload}>
              Download File
            </PayrollPrimaryButton>
          </div>
        </div>
      }
    >
      {warning ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#5C4A1F] bg-[#2A2210] px-3 py-3 text-[#E8C47C]">
          <span className="mt-0.5 shrink-0">
            <WarnTriangle />
          </span>
          <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]">
            {warning}
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3">
        <KvRow label="File" value={file} />
        <KvRow label="Pay Cycle" value={payCycle} />
        <KvRow label="Employees" value={String(employees || "—")} />
        <KvRow label="Gross Total" value={grossTotal} />
        <KvRow label="Timestamp" value={timestamp} />
      </div>
    </DashboardModal>
  );
}

export function ExportFailedModal({
  open,
  busy,
  errorReason,
  onClose,
  onContactSupport,
  onViewLog,
  onRetry,
}: {
  open: boolean;
  busy?: boolean;
  errorReason: string;
  onClose: () => void;
  onContactSupport: () => void;
  onViewLog: () => void;
  onRetry: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Export Failed"
      titleLeading={<ErrorIcon />}
      widthClassName="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <FooterCancel onClick={onClose} disabled={busy} />
          <DashboardToolbarButton onClick={onContactSupport} disabled={busy}>
            Contact Support
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onViewLog} disabled={busy}>
            View Log
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onRetry}>
            Retry
          </PayrollPrimaryButton>
        </div>
      }
    >
      <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        Error Reason
      </p>
      <div
        className={cn(
          "rounded-lg border border-[#7F1D1D] bg-[#2A1212] px-4 py-3",
        )}
      >
        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#F87171]">
          {errorReason?.trim()
            ? errorReason
            : "Export failed. Correct the issues and retry."}
        </p>
      </div>
    </DashboardModal>
  );
}
