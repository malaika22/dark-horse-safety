"use client";

import * as React from "react";
import { DashboardModal } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type AdditionalFormDetail,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const fieldClass =
  "w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

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

function FailCircle() {
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B84A4A] font-sans text-[10px] font-bold text-white"
    >
      X
    </span>
  );
}

function ContextBar({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-3">
      <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {text}
      </p>
    </div>
  );
}

function ErrorBanner({
  message,
  savedNote,
}: {
  message: string;
  savedNote?: string | null;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#B84A4A]/60 bg-[#2A1212] px-4 py-3">
      <FailCircle />
      <div className="min-w-0 space-y-1">
        <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#E86A6A]">
          {message}
        </p>
        {savedNote ? (
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {savedNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function contextFromDetail(detail: AdditionalFormDetail) {
  return `${detail.details.formRequested} → ${detail.details.technician}`;
}

function showActionToast(title: string | null, subtitle: string | null) {
  if (!title?.trim()) return;
  const msg = subtitle?.trim() ? `${title.trim()}\n${subtitle.trim()}` : title.trim();
  toastSuccess(msg);
}

type ActionPhase = "form" | "failed";

/** Approve additional form request — confirm / failure+retry / success toast. */
export function ApproveAdditionalFormRequestModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: AdditionalFormDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? contextFromDetail(detail) : "";
  const woCode = detail?.details.workOrder ?? "";

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setForceFail(false);
    setFailMessage("");
    setSavedNote(null);
  }, [open, detail?.id]);

  function handleClose() {
    setPhase("form");
    onClose();
  }

  async function submit(opts?: { forceFail?: boolean }) {
    if (!detail) return;
    setBusy(true);
    try {
      const res = await operationsApi.approveAdditionalFormRequest(detail.id, {
        forceFail: opts?.forceFail ?? forceFail,
      });
      if (!res.data.ok) {
        setFailMessage(res.data.message);
        setSavedNote(res.data.savedNote);
        setPhase("failed");
        return;
      }
      showActionToast(res.data.toastTitle, res.data.toastSubtitle);
      onDone?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
      setFailMessage(
        "COULDN'T COMPLETE — FORM COULD NOT BE ATTACHED TO WORK ORDER.",
      );
      setSavedNote("YOUR ENTRIES ARE SAVED.");
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Approve Additional Form Request"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy || !detail}
            onClick={() =>
              void submit(
                phase === "failed" ? { forceFail: false } : undefined,
              )
            }
          >
            {phase === "failed" ? "Retry" : "Approve & Add Form"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          This adds the requested form to {woCode || "the work order"} and
          notifies the technician.
        </p>
        <ContextBar text={contextLine || "—"} />
        {phase === "failed" ? (
          <ErrorBanner message={failMessage} savedNote={savedNote} />
        ) : (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forceFail}
              onChange={(e) => setForceFail(e.target.checked)}
              className="rounded border-[#3E3E3E]"
            />
            <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
              Simulate attach failure
            </span>
          </label>
        )}
      </div>
    </DashboardModal>
  );
}

/** Deny additional form request — reason / failure+retry / success toast. */
export function DenyAdditionalFormRequestModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: AdditionalFormDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [reason, setReason] = React.useState(
    "COVERED BY EXISTING CONFINED SPACE PERMIT",
  );
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? contextFromDetail(detail) : "";

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setReason("COVERED BY EXISTING CONFINED SPACE PERMIT");
    setForceFail(false);
    setFailMessage("");
    setSavedNote(null);
  }, [open, detail?.id]);

  function handleClose() {
    setPhase("form");
    onClose();
  }

  async function submit(opts?: { forceFail?: boolean }) {
    if (!detail) return;
    if (!reason.trim()) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.denyAdditionalFormRequest(detail.id, {
        reason: reason.trim(),
        forceFail: opts?.forceFail ?? forceFail,
      });
      if (!res.data.ok) {
        setFailMessage(res.data.message);
        setSavedNote(res.data.savedNote);
        setPhase("failed");
        return;
      }
      showActionToast(res.data.toastTitle, res.data.toastSubtitle);
      onDone?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
      setFailMessage(
        "COULDN'T COMPLETE — NOTIFICATION COULD NOT BE DELIVERED.",
      );
      setSavedNote("YOUR ENTRIES ARE SAVED.");
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Deny Request"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy || !detail}
            onClick={() =>
              void submit(
                phase === "failed" ? { forceFail: false } : undefined,
              )
            }
          >
            {phase === "failed" ? "Retry" : "Deny"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Deny this additional form request. The technician is notified with
          your reason.
        </p>
        {phase === "failed" ? (
          <>
            <ContextBar text={contextLine || "—"} />
            <ErrorBanner message={failMessage} savedNote={savedNote} />
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className={labelClass}>Reason</span>
              <input
                className={fieldClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="REASON FOR DENIAL"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={forceFail}
                onChange={(e) => setForceFail(e.target.checked)}
                className="rounded border-[#3E3E3E]"
              />
              <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Simulate notification failure
              </span>
            </label>
          </>
        )}
      </div>
    </DashboardModal>
  );
}

/** Request more information — message / failure+retry / success toast. */
export function MoreInfoAdditionalFormRequestModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: AdditionalFormDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [message, setMessage] = React.useState(
    "WHAT SPECIFICALLY CHANGED ON SITE?",
  );
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? contextFromDetail(detail) : "";

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setMessage("WHAT SPECIFICALLY CHANGED ON SITE?");
    setForceFail(false);
    setFailMessage("");
    setSavedNote(null);
  }, [open, detail?.id]);

  function handleClose() {
    setPhase("form");
    onClose();
  }

  async function submit(opts?: { forceFail?: boolean }) {
    if (!detail) return;
    if (!message.trim()) {
      toastApiError(new Error("Message is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.moreInfoAdditionalFormRequest(detail.id, {
        message: message.trim(),
        forceFail: opts?.forceFail ?? forceFail,
      });
      if (!res.data.ok) {
        setFailMessage(res.data.message);
        setSavedNote(res.data.savedNote);
        setPhase("failed");
        return;
      }
      showActionToast(res.data.toastTitle, res.data.toastSubtitle);
      onDone?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
      setFailMessage(
        "COULDN'T COMPLETE — MESSAGE COULD NOT BE DELIVERED.",
      );
      setSavedNote("YOUR ENTRIES ARE SAVED.");
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Request More Information"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy || !detail}
            onClick={() =>
              void submit(
                phase === "failed" ? { forceFail: false } : undefined,
              )
            }
          >
            {phase === "failed" ? "Retry" : "Send"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Send this request back to the technician for more detail before
          deciding.
        </p>
        {phase === "failed" ? (
          <>
            <ContextBar text={contextLine || "—"} />
            <ErrorBanner message={failMessage} savedNote={savedNote} />
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className={labelClass}>Message</span>
              <input
                className={fieldClass}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="WHAT SPECIFICALLY CHANGED ON SITE?"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={forceFail}
                onChange={(e) => setForceFail(e.target.checked)}
                className="rounded border-[#3E3E3E]"
              />
              <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Simulate delivery failure
              </span>
            </label>
          </>
        )}
      </div>
    </DashboardModal>
  );
}

