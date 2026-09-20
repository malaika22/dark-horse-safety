"use client";

import * as React from "react";
import {
  DashboardModal,
  cn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type SalesTicket,
  type SalesTicketCorrectionField,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const fieldClass =
  "h-10 w-full appearance-none rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

const labelClass =
  "font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]";

function GhostBtn({
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
      className="rounded-lg px-3 py-2 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function moneyFmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rounded-[3px] bg-[#3B6EA5]/80" />
      <p className="font-sans text-[11px] leading-relaxed tracking-[-0.02em] text-[#8B9BB4]">
        {children}
      </p>
    </div>
  );
}

/** Adjust submitted rate — hours stay locked. */
export function AdjustRateModal({
  open,
  ticket,
  onClose,
  onApplied,
}: {
  open: boolean;
  ticket: SalesTicket | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [rate, setRate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open || !ticket) return;
    setRate(
      ticket.adjustedRate != null
        ? String(ticket.adjustedRate)
        : String(ticket.submittedRate),
    );
    setReason(ticket.rateAdjustReason ?? "");
  }, [open, ticket]);

  if (!ticket) return null;

  const hours = ticket.submittedHours;
  const submittedValue = ticket.submittedValue;
  const adjustedRateNum = Number(rate);
  const adjustedValue =
    Number.isFinite(adjustedRateNum) && adjustedRateNum > 0
      ? Math.round(adjustedRateNum * hours * 100) / 100
      : 0;
  const difference = Math.round((adjustedValue - submittedValue) * 100) / 100;

  async function submit() {
    if (!ticket) return;
    if (!(adjustedRateNum > 0)) {
      toastApiError(new Error("Enter a valid adjusted rate"));
      return;
    }
    if (reason.trim().length < 3) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.adjustSalesTicketRate(ticket.id, {
        adjustedRate: adjustedRateNum,
        reason: reason.trim(),
      });
      toastSuccess("Rate adjustment applied");
      onApplied();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Adjust Rate"
      widthClassName="max-w-2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <GhostBtn onClick={onClose} disabled={busy}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
            Apply Adjustment
          </PayrollPrimaryButton>
        </div>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
        {ticket.headerLabel}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-[#2A2A2A] bg-[#141414] p-3">
          <p className="font-sans text-[10px] font-[510] uppercase text-[#6F6F72]">
            Submitted
          </p>
          <div>
            <p className={labelClass}>Rate</p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">
              {ticket.submittedRateLabel}
            </p>
          </div>
          <div>
            <p className={labelClass}>Source</p>
            <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
              {ticket.rateSource}
            </p>
          </div>
          <div>
            <p className={labelClass}>Hours</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">
                {hours.toFixed(1)}
              </p>
              {ticket.hoursLocked ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#C4A35A]/40 bg-[#2A2618] px-1.5 py-0.5 font-sans text-[9px] font-[510] uppercase text-[#C4A35A]">
                  <span aria-hidden>🔒</span> Locked
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <p className={labelClass}>Value</p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">
              {ticket.submittedValueLabel}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-[#2A2A2A] bg-[#141414] p-3">
          <p className="font-sans text-[10px] font-[510] uppercase text-[#6F6F72]">
            Adjusted
          </p>
          <div>
            <p className={labelClass}>Rate *</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                className={cn(fieldClass, "flex-1")}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
              <span className="shrink-0 font-sans text-[11px] uppercase text-[#959597]">
                /HR
              </span>
            </div>
          </div>
          <div>
            <p className={labelClass}>Hours</p>
            <p className="mt-1 font-sans text-[12px] uppercase text-[#C8C8C8]">
              {hours.toFixed(1)} (Unchanged)
            </p>
          </div>
          <div>
            <p className={labelClass}>Value</p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">
              ${moneyFmt(adjustedValue)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] font-[510] uppercase text-[#ACEBCE]">
              Difference
            </p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#ACEBCE]">
              {difference >= 0 ? "+" : "-"}${moneyFmt(Math.abs(difference))}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className={labelClass}>Reason *</p>
        <textarea
          className={cn(fieldClass, "mt-1 h-24 resize-none py-2")}
          placeholder="Explain why this rate is being adjusted"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="mt-4 space-y-2">
        <InfoRow>
          The technician&apos;s submitted hours cannot be changed. This records a
          rate correction on top of the original submission.
        </InfoRow>
        <InfoRow>
          This adjustment will be logged with your name, the timestamp, and the
          dollar delta.
        </InfoRow>
      </div>
    </DashboardModal>
  );
}

type CorrectionDraft = {
  key: string;
  field: string;
  issue: string;
  expected: string;
};

function defaultDueBackLocal() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Return ticket to technician with one or more corrections. */
export function ReturnTicketForCorrectionModal({
  open,
  ticket,
  fields,
  onClose,
  onReturned,
}: {
  open: boolean;
  ticket: SalesTicket | null;
  fields: SalesTicketCorrectionField[];
  onClose: () => void;
  onReturned: () => void;
}) {
  const [corrections, setCorrections] = React.useState<CorrectionDraft[]>([]);
  const [note, setNote] = React.useState("");
  const [dueBackBy, setDueBackBy] = React.useState(defaultDueBackLocal);
  const [notifyPush, setNotifyPush] = React.useState(true);
  const [notifyEmail, setNotifyEmail] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open || !ticket) return;
    const existing =
      ticket.corrections?.length > 0
        ? ticket.corrections.map((c, i) => ({
            key: `c-${i}`,
            field: c.field,
            issue: c.issue,
            expected: c.expected,
          }))
        : [
            {
              key: "c-0",
              field: fields[0]?.value ?? "MILEAGE",
              issue: "",
              expected: "",
            },
          ];
    setCorrections(existing);
    setNote(ticket.returnNote ?? "");
    setDueBackBy(defaultDueBackLocal());
    setNotifyPush(ticket.notifyPush ?? true);
    setNotifyEmail(ticket.notifyEmail ?? true);
  }, [open, ticket, fields]);

  if (!ticket) return null;

  function updateCorrection(
    key: string,
    patch: Partial<Omit<CorrectionDraft, "key">>,
  ) {
    setCorrections((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    );
  }

  async function submit() {
    if (!ticket) return;
    const cleaned = corrections
      .map((c) => ({
        field: c.field.trim(),
        issue: c.issue.trim(),
        expected: c.expected.trim(),
      }))
      .filter((c) => c.field && c.issue && c.expected);
    if (cleaned.length === 0) {
      toastApiError(new Error("Add at least one complete correction"));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.returnSalesTicket(ticket.id, {
        corrections: cleaned,
        note: note.trim() || undefined,
        dueBackBy: new Date(dueBackBy).toISOString(),
        notifyPush,
        notifyEmail,
      });
      toastSuccess("Ticket returned to technician");
      onReturned();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Return Ticket for Correction"
      widthClassName="max-w-xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <GhostBtn onClick={onClose} disabled={busy}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
            Return to Technician
          </PayrollPrimaryButton>
        </div>
      }
    >
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
        {ticket.returnHeaderLabel}
      </p>
      <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        Returning to: {ticket.employeeName || "Unassigned"}
      </p>

      <div className="mt-4 space-y-3">
        {corrections.map((c) => (
          <div
            key={c.key}
            className="relative space-y-2.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3"
          >
            {corrections.length > 1 ? (
              <button
                type="button"
                aria-label="Remove correction"
                className="absolute right-2 top-2 text-[#6F6F72] hover:text-[#FDFDFF]"
                onClick={() =>
                  setCorrections((prev) => prev.filter((x) => x.key !== c.key))
                }
              >
                ×
              </button>
            ) : null}
            <div>
              <p className={labelClass}>Field</p>
              <select
                className={cn(fieldClass, "mt-1")}
                value={c.field}
                onChange={(e) => updateCorrection(c.key, { field: e.target.value })}
              >
                {(fields.length
                  ? fields
                  : [{ value: c.field, label: c.field }]
                ).map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={labelClass}>Issue</p>
              <input
                className={cn(fieldClass, "mt-1")}
                value={c.issue}
                onChange={(e) => updateCorrection(c.key, { issue: e.target.value })}
                placeholder="Describe the issue"
              />
            </div>
            <div>
              <p className={labelClass}>Expected</p>
              <input
                className={cn(fieldClass, "mt-1")}
                value={c.expected}
                onChange={(e) =>
                  updateCorrection(c.key, { expected: e.target.value })
                }
                placeholder="What should it be"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          className="flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-[#3E3E3E] font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
          onClick={() =>
            setCorrections((prev) => [
              ...prev,
              {
                key: `c-${Date.now()}`,
                field: fields[0]?.value ?? "MILEAGE",
                issue: "",
                expected: "",
              },
            ])
          }
        >
          + Add Another Correction
        </button>
      </div>

      <div className="mt-4">
        <p className={labelClass}>Note to Technician</p>
        <input
          className={cn(fieldClass, "mt-1")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the technician (optional)"
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={labelClass}>Due Back By</p>
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            (Defaults +24 hrs)
          </span>
        </div>
        <input
          type="datetime-local"
          className={cn(fieldClass, "mt-1")}
          value={dueBackBy}
          onChange={(e) => setDueBackBy(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <p className={labelClass}>Notify</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={(e) => setNotifyPush(e.target.checked)}
              className="h-4 w-4 accent-[#3B6EA5]"
            />
            Push
          </label>
          <label className="inline-flex items-center gap-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="h-4 w-4 accent-[#3B6EA5]"
            />
            Email
          </label>
        </div>
      </div>
    </DashboardModal>
  );
}
