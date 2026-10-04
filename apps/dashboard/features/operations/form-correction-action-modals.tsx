"use client";

import * as React from "react";
import { DashboardModal } from "@dark-horse-safety/ui";
import {
  operationsApi,
  type FormCorrectionDetail,
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

function approveContext(detail: FormCorrectionDetail) {
  const ver =
    detail.resubmission?.version ??
    `${detail.original.form} ${detail.version ?? "V2"}`;
  const label = ver.toUpperCase().includes(detail.original.form.toUpperCase())
    ? ver
    : `${detail.original.form} ${ver}`;
  return `${label} → WO ${detail.workOrderCode ?? "—"}`;
}

function rejectContext(detail: FormCorrectionDetail) {
  const tech =
    detail.resubmission?.resubmittedBy ??
    detail.original.submittedBy ??
    "TECHNICIAN";
  const ver =
    detail.resubmission?.version ??
    `${detail.original.form} ${detail.version ?? "V1"}`;
  return `${ver} → ${tech}`;
}

function requestContext(detail: FormCorrectionDetail) {
  const tech = detail.original.submittedBy ?? "TECHNICIAN";
  return `${detail.original.form} ${detail.version ?? "V1"} → ${tech}`;
}

function showActionToast(
  title: string | null,
  subtitle: string | null,
  dueBack?: string | null,
) {
  if (!title?.trim() && !dueBack?.trim()) return;
  const lines = [dueBack?.trim(), title?.trim(), subtitle?.trim()].filter(
    Boolean,
  );
  toastSuccess(lines.join("\n"));
}

type ActionPhase = "form" | "failed";

/** Approve form correction — confirm / failure+retry / success toast. */
export function ApproveFormCorrectionModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: FormCorrectionDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? approveContext(detail) : "";

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
      const res = await operationsApi.approveFormCorrection(detail.id, {
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
        "COULDN'T COMPLETE — JOB PACKET COULD NOT BE UPDATED.",
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
      title="Approve Correction"
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
            {phase === "failed" ? "Retry" : "Approve Correction"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Accept the corrected version. Both the original and corrected versions
          stay on the job packet.
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
              Simulate job packet failure
            </span>
          </label>
        )}
      </div>
    </DashboardModal>
  );
}

/** Reject / request more info — reason / failure+retry / success toast. */
export function RejectFormCorrectionModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: FormCorrectionDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [reason, setReason] = React.useState(
    "STILL MISSING CONTROLS FOR THE HAZARD",
  );
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? rejectContext(detail) : "";

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setReason("STILL MISSING CONTROLS FOR THE HAZARD");
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
      const res = await operationsApi.denyFormCorrection(detail.id, {
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
      title={phase === "failed" ? "Reject Correction" : "Reject / Request More Info"}
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
            {phase === "failed" ? "Retry" : "Send Back"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Send the correction back to the technician with a reason.
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
                placeholder="REASON"
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

/** Request form correction — form/issue/instructions / failure+retry / success toast. */
export function RequestFormCorrectionModal({
  open,
  detail,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: FormCorrectionDetail | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<ActionPhase>("form");
  const [form, setForm] = React.useState("");
  const [issue, setIssue] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [failMessage, setFailMessage] = React.useState("");
  const [savedNote, setSavedNote] = React.useState<string | null>(null);

  const contextLine = detail ? requestContext(detail) : "";

  React.useEffect(() => {
    if (!open || !detail) return;
    setPhase("form");
    setForm(
      detail.formDisplay ??
        `${detail.original.form} — ${detail.original.formTitle ?? detail.original.form}`,
    );
    setIssue(detail.issueFlagged || "H2S EXPOSURE HAZARD NOT LISTED");
    setInstructions(
      detail.correction.instruction ||
        "ADD H2S HAZARD AND CONTROLS; RESUBMIT AS ADDENDUM",
    );
    setForceFail(false);
    setFailMessage("");
    setSavedNote(null);
  }, [open, detail]);

  function handleClose() {
    setPhase("form");
    onClose();
  }

  async function submit(opts?: { forceFail?: boolean }) {
    if (!detail) return;
    if (!issue.trim() || !instructions.trim()) {
      toastApiError(new Error("Issue and instructions are required"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.moreInfoFormCorrection(detail.id, {
        form: form.trim(),
        issue: issue.trim(),
        instructions: instructions.trim(),
        forceFail: opts?.forceFail ?? forceFail,
      });
      if (!res.data.ok) {
        setFailMessage(res.data.message);
        setSavedNote(res.data.savedNote);
        setPhase("failed");
        return;
      }
      showActionToast(
        res.data.toastTitle,
        res.data.toastSubtitle,
        res.data.dueBackLabel,
      );
      onDone?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
      setFailMessage(
        "COULDN'T COMPLETE — CORRECTION REQUEST COULD NOT BE SENT.",
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
      title="Request Form Correction"
      widthClassName="max-w-[520px]"
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
            {phase === "failed" ? "Retry" : "Send To Tech"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          The original form stays locked. The technician resubmits or files an
          addendum, never edits the original.
        </p>
        {phase === "failed" ? (
          <>
            <ContextBar text={contextLine || "—"} />
            <ErrorBanner message={failMessage} savedNote={savedNote} />
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className={labelClass}>Form</span>
              <input
                className={fieldClass}
                value={form}
                onChange={(e) => setForm(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className={labelClass}>Issue</span>
              <input
                className={fieldClass}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className={labelClass}>Instructions</span>
              <input
                className={fieldClass}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
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
                Simulate send failure
              </span>
            </label>
          </>
        )}
      </div>
    </DashboardModal>
  );
}
