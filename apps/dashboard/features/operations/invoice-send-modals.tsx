"use client";

import * as React from "react";
import { DashboardModal, cn } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type InvoicePreview,
  type InvoiceSendResult,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
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

type Phase = "compose" | "sent" | "failed";

export function SendInvoiceModal({
  open,
  preview,
  onClose,
  onSent,
}: {
  open: boolean;
  preview: InvoicePreview | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("compose");
  const [recipient, setRecipient] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [scheduleMode, setScheduleMode] = React.useState<"NOW" | "LATER">(
    "NOW",
  );
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [forceFail, setForceFail] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<InvoiceSendResult | null>(null);

  React.useEffect(() => {
    if (!open || !preview) return;
    setPhase("compose");
    setResult(null);
    setRecipient(preview.compose.recipient);
    setCc(preview.compose.cc);
    setSubject(preview.compose.subject);
    setMessage(`${preview.compose.message}\n\n${preview.compose.signature}`);
    setScheduleMode("NOW");
    setScheduledAt(preview.compose.scheduleDefault);
    setForceFail(false);
  }, [open, preview]);

  function handleClose() {
    setPhase("compose");
    setResult(null);
    onClose();
  }

  async function doSend(opts?: { forceFail?: boolean }) {
    if (!preview) return;
    if (!recipient.trim() || !subject.trim()) {
      toastApiError(new Error("Recipient and subject are required"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.sendInvoice(preview.ticketId, {
        recipient: recipient.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        message: message.trim() || undefined,
        scheduleMode,
        scheduledAt: scheduleMode === "LATER" ? scheduledAt : undefined,
        forceFail: opts?.forceFail ?? forceFail,
      });
      setResult(res.data);
      setPhase(res.data.ok ? "sent" : "failed");
      if (res.data.ok) onSent?.();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!preview) return null;

  if (phase === "sent" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Invoice Sent"
        titleLeading={
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C3A2A]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l5 5L20 7"
                stroke="#5ECF8E"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        }
        widthClassName="max-w-md"
      >
        <div className="space-y-2 rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
          <Row label="To" value={result.recipient} />
          <Row label="Cc" value={result.cc ?? "—"} />
          <Row label="Sent At" value={result.sentAtLabel ?? "—"} />
          <Row
            label="Attachment"
            value={`${result.attachmentName} (${result.attachmentSize})`}
          />
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-5 w-full rounded-lg bg-[#2A2A2A] py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#333]"
        >
          Done
        </button>
      </DashboardModal>
    );
  }

  if (phase === "failed" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Delivery Failed"
        titleLeading={
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#E86A6A] font-sans text-[14px] font-bold text-[#FDFDFF]">
            !
          </span>
        }
        widthClassName="max-w-md"
      >
        <div className="rounded-xl border border-[#5A2A2A] bg-[#2A1414] px-3 py-3">
          <p className="font-sans text-[11px] uppercase leading-relaxed text-[#F0A0A0]">
            Email not delivered to {result.recipientEmail ?? result.recipient}
          </p>
          <p className="mt-1 font-sans text-[11px] uppercase text-[#E86A6A]">
            Reason: {result.reason ?? "Delivery failed."}
          </p>
        </div>
        <div className="mt-3 space-y-2 rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
          <Row label="Tried At" value={result.triedAtLabel ?? "—"} />
          <Row
            label="Invoice"
            value={`${result.invoiceCode} · ${result.amountLabel}`}
          />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <GhostBtn onClick={handleClose}>Dismiss</GhostBtn>
          <button
            type="button"
            onClick={() => setPhase("compose")}
            className="rounded-lg bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            Edit & Resend
          </button>
          <PayrollPrimaryButton
            disabled={busy}
            onClick={() => void doSend({ forceFail: false })}
          >
            {busy ? "Retrying…" : "Retry"}
          </PayrollPrimaryButton>
        </div>
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Send Invoice"
      widthClassName="max-w-xl"
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>
            Recipient <span className="text-[#E86A6A]">*</span>
          </span>
          <input
            className={fieldClass}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Cc</span>
          <input
            className={fieldClass}
            value={cc}
            onChange={(e) => setCc(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>
            Subject <span className="text-[#E86A6A]">*</span>
          </span>
          <input
            className={fieldClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Message</span>
          <textarea
            className={cn(fieldClass, "min-h-[120px] py-2.5")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        <div>
          <p className={cn(labelClass, "mb-2")}>Attachments</p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-[#1A1A1A] font-sans text-[9px] text-[#959597]">
                PDF
              </span>
              <div>
                <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                  {preview.compose.attachmentName}
                </p>
                <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                  {preview.compose.attachmentSize}
                </p>
              </div>
            </div>
            <span className="font-sans text-[12px] text-[#6F6F72]">×</span>
          </div>
          <button
            type="button"
            className="mt-2 rounded-lg border border-[#3E3E3E] px-3 py-2 font-sans text-[11px] uppercase text-[#959597]"
          >
            + Add Attachment
          </button>
        </div>

        <div>
          <p className={cn(labelClass, "mb-2")}>Send / Schedule</p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scheduleMode === "NOW"}
                onChange={() => setScheduleMode("NOW")}
                className="accent-[#3D8B6E]"
              />
              <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                Send Now
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scheduleMode === "LATER"}
                onChange={() => setScheduleMode("LATER")}
                className="accent-[#3D8B6E]"
              />
              <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                Schedule for Later
              </span>
            </label>
            <input
              className={cn(
                fieldClass,
                "max-w-[220px]",
                scheduleMode !== "LATER" && "opacity-40",
              )}
              disabled={scheduleMode !== "LATER"}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forceFail}
            onChange={(e) => setForceFail(e.target.checked)}
            className="accent-[#E86A6A]"
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate delivery failure (demo)
          </span>
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#2A2A2A] pt-4">
          <GhostBtn onClick={handleClose} disabled={busy}>
            Cancel
          </GhostBtn>
          <button
            type="button"
            className="rounded-lg bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            onClick={() => {
              /* preview stays on page behind modal */
            }}
          >
            Preview
          </button>
          <PayrollPrimaryButton
            disabled={busy || !recipient.trim() || !subject.trim()}
            onClick={() => void doSend()}
          >
            {busy ? "Sending…" : "Send Invoice"}
          </PayrollPrimaryButton>
        </div>
      </div>
    </DashboardModal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 font-sans text-[10px] uppercase text-[#6F6F72]">
        {label}:
      </span>
      <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}
