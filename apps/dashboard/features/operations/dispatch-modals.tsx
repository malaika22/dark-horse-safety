"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type DispatchCard,
  type DispatchEligibility,
  type DispatchOptions,
  type DispatchReassignData,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const fieldClass =
  "h-10 w-full appearance-none rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

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

function SecondaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <DashboardToolbarButton disabled={disabled} onClick={onClick}>
      {children}
    </DashboardToolbarButton>
  );
}

function gateTone(status: string) {
  const s = status.toUpperCase();
  if (s === "MET") return "text-[#ACEBCE]";
  if (s === "WARNING") return "text-[#C4A35A]";
  return "text-[#E8A0A0]";
}

/** Work-order detail card from schedule cell click. */
export function DispatchWorkOrderCardModal({
  open,
  card,
  onClose,
  onOpenWorkOrder,
  onReassign,
  onReschedule,
  onCancel,
}: {
  open: boolean;
  card: DispatchCard | null;
  onClose: () => void;
  onOpenWorkOrder?: (workOrderId: string) => void;
  onReassign?: (card: DispatchCard) => void;
  onReschedule?: (card: DispatchCard) => void;
  onCancel?: (card: DispatchCard) => void;
}) {
  if (!card) return null;
  const schedule = [
    card.scheduledDate,
    card.startTime && card.endTime
      ? `${card.startTime}–${card.endTime}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const location = [card.locationName, card.locationMeta]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={card.workOrderCode || "Work Order"}
      widthClassName="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          {card.workOrderId ? (
            <SecondaryBtn onClick={() => onOpenWorkOrder?.(card.workOrderId!)}>
              Open Work Order
            </SecondaryBtn>
          ) : null}
          <SecondaryBtn onClick={() => onReassign?.(card)}>Reassign</SecondaryBtn>
          <PayrollPrimaryButton onClick={() => onReschedule?.(card)}>
            Reschedule
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {card.customerName || "—"}
            </p>
            <p className="mt-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
              {schedule || "—"}
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#C8C8C8]">
              {location || "—"}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-[#203B2C] px-2.5 py-1 font-sans text-[10px] font-[510] uppercase text-[#ACEBCE]">
            {card.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-[#2A2A2A] pt-3">
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]">
            {card.employeeName}
            <span className="text-[#22C55E]">✓</span>
          </span>
        </div>
        {card.conflictLabel ? (
          <p className="font-sans text-[11px] uppercase text-[#E8A0A0]">
            {card.conflictLabel}
          </p>
        ) : null}
        {onCancel ? (
          <GhostBtn onClick={() => onCancel(card)}>Cancel Assignment</GhostBtn>
        ) : null}
      </div>
    </DashboardModal>
  );
}

export function EligibilityCheckModal({
  open,
  workOrderId,
  onClose,
  onResolve,
  onDispatchAnyway,
}: {
  open: boolean;
  workOrderId: string | null;
  onClose: () => void;
  onResolve?: (data: DispatchEligibility) => void;
  onDispatchAnyway?: (data: DispatchEligibility) => void;
}) {
  const [data, setData] = React.useState<DispatchEligibility | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !workOrderId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await operationsApi.dispatchEligibility(workOrderId);
        if (!cancelled) setData(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workOrderId]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Eligibility Check"
      widthClassName="max-w-xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <SecondaryBtn
            disabled={!data}
            onClick={() => data && onDispatchAnyway?.(data)}
          >
            Dispatch Anyway
          </SecondaryBtn>
          <PayrollPrimaryButton
            disabled={!data}
            onClick={() => data && onResolve?.(data)}
          >
            Resolve Issues
          </PayrollPrimaryButton>
        </div>
      }
    >
      {loading || !data ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {loading ? "Loading…" : "No eligibility data"}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {data.workOrderCode} · {data.customerName} · {data.locationName}
          </p>
          <div className="rounded-lg bg-[#2A2A2A] px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {data.banner}
          </div>
          <div>
            <p className="mb-2 font-sans text-[11px] font-[510] uppercase text-[#959597]">
              Gates
            </p>
            <ul className="space-y-2">
              {data.gates.map((g) => (
                <li
                  key={g.key}
                  className="flex items-center justify-between gap-3 font-sans text-[12px] uppercase"
                >
                  <span className="text-[#C8C8C8]">{g.label}</span>
                  <span className={cn("font-[510]", gateTone(g.status))}>
                    {g.status === "MET" ? "Met" : g.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-sans text-[11px] font-[510] uppercase text-[#959597]">
              Technician Eligibility
            </p>
            <ul className="space-y-2">
              {data.technicians.length === 0 ? (
                <li className="font-sans text-[12px] uppercase text-[#959597]">
                  No technicians assigned
                </li>
              ) : (
                data.technicians.map((t) => (
                  <li
                    key={t.employeeId}
                    className="flex items-center justify-between gap-3 font-sans text-[12px] uppercase"
                  >
                    <span className="text-[#FDFDFF]">{t.name}</span>
                    <span
                      className={cn(
                        "font-[510]",
                        t.eligible ? "text-[#ACEBCE]" : "text-[#E8A0A0]",
                      )}
                    >
                      {t.eligible ? "Eligible" : `Blocked · ${t.detail}`}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </DashboardModal>
  );
}

export function HardGateOverrideModal({
  open,
  techName,
  requirement,
  onClose,
  onConfirm,
}: {
  open: boolean;
  techName: string;
  requirement: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  async function submit() {
    if (!reason.trim()) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
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
      title="Hard Gate Override"
      widthClassName="max-w-md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="btn-base inline-flex h-8 items-center justify-center rounded-lg bg-[#FF4D4D] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-white disabled:opacity-50"
          >
            Override and Dispatch
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#7F1D1D] bg-[#3B2020] px-3 py-3 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
          Overriding dispatches <strong>{techName}</strong> without the{" "}
          <strong>{requirement}</strong>. The job will be flagged non-compliant
          and this override recorded against your name.
        </div>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Reason *
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this override is necessary"
            className={cn(fieldClass, "h-auto min-h-[80px] py-2")}
          />
        </label>
      </div>
    </DashboardModal>
  );
}

export function ConfirmRescheduleModal({
  open,
  jobLabel,
  fromLabel,
  toLabel,
  conflictMessage,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  jobLabel: string;
  fromLabel: string;
  toLabel: string;
  conflictMessage?: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Confirm Reschedule"
      widthClassName="max-w-md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PayrollPrimaryButton disabled={busy} onClick={onConfirm}>
            Confirm Reschedule
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="font-sans text-[10px] uppercase text-[#959597]">Job</p>
          <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
            {jobLabel}
          </p>
        </div>
        <div>
          <p className="font-sans text-[10px] uppercase text-[#959597]">From</p>
          <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
            {fromLabel}
          </p>
        </div>
        <div>
          <p className="font-sans text-[10px] uppercase text-[#959597]">To</p>
          <p className="mt-1 font-sans text-[12px] uppercase text-[#FDFDFF]">
            {toLabel}
          </p>
        </div>
        {conflictMessage ? (
          <div className="rounded-lg border border-[#C4A35A]/40 bg-[#2A2618] px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C4A35A]">
            {conflictMessage}
          </div>
        ) : null}
      </div>
    </DashboardModal>
  );
}

export function AssignJobModal({
  open,
  options,
  defaults,
  onClose,
  onAssigned,
}: {
  open: boolean;
  options: DispatchOptions | null;
  defaults?: {
    employeeId?: string;
    scheduledDate?: string;
  };
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [employeeId, setEmployeeId] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [jobType, setJobType] = React.useState("VISIT");
  const [workOrderId, setWorkOrderId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmployeeId(defaults?.employeeId ?? "");
    setScheduledDate(defaults?.scheduledDate ?? "");
    setJobType("VISIT");
    setWorkOrderId("");
    setNotes("");
  }, [open, defaults?.employeeId, defaults?.scheduledDate]);

  async function submit() {
    if (!employeeId || !workOrderId || !scheduledDate) {
      toastApiError(new Error("Technician, work order, and date are required"));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.assignDispatchJob({
        employeeId,
        workOrderId,
        scheduledDate,
        jobType,
        notes: notes.trim() || undefined,
      });
      toastSuccess("Job assigned");
      onAssigned();
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
      title="Assign Job"
      widthClassName="max-w-md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
            Assign Job
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Technician
          </span>
          <select
            className={fieldClass}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select technician</option>
            {(options?.technicians ?? []).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Date
          </span>
          <input
            type="date"
            className={fieldClass}
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </label>
        <div>
          <p className="mb-2 font-sans text-[11px] uppercase text-[#959597]">
            Job Type
          </p>
          <div className="flex flex-wrap gap-2">
            {["VISIT", "CALL", "TASK"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setJobType(t)}
                className={cn(
                  "rounded-lg px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]",
                  jobType === t
                    ? "bg-[#FDFDFF] text-[#111111]"
                    : "bg-[#2A2A2A] text-[#FDFDFF]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Work Order
          </span>
          <select
            className={fieldClass}
            value={workOrderId}
            onChange={(e) => setWorkOrderId(e.target.value)}
          >
            <option value="">Select work order</option>
            {(options?.workOrders ?? []).map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Notes
          </span>
          <textarea
            rows={3}
            className={cn(fieldClass, "h-auto min-h-[72px] py-2")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </label>
      </div>
    </DashboardModal>
  );
}

export function ReassignAfterDeclineModal({
  open,
  assignmentId,
  onClose,
  onDone,
}: {
  open: boolean;
  assignmentId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  type Phase =
    | "form"
    | "noEligible"
    | "override"
    | "overrideRequested"
    | "success"
    | "failed";

  const [phase, setPhase] = React.useState<Phase>("form");
  const [data, setData] = React.useState<DispatchReassignData | null>(null);
  const [selected, setSelected] = React.useState("");
  const [notifyNew, setNotifyNew] = React.useState(true);
  const [notifyOld, setNotifyOld] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [forceFail, setForceFail] = React.useState(false);
  const [overrideTechId, setOverrideTechId] = React.useState("");
  const [justification, setJustification] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    message: string;
    banner: string;
    workOrderId?: string;
    workOrderCode?: string;
  } | null>(null);

  const load = React.useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const res = await operationsApi.reassignCandidates(assignmentId);
      setData(res.data);
      const first = res.data.candidates.find((c) => c.eligible);
      setSelected(first?.employeeId ?? "");
      setOverrideTechId(res.data.candidates.find((c) => !c.eligible)?.employeeId ?? "");
      setPhase((res.data.eligibleCount ?? 0) === 0 ? "noEligible" : "form");
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  React.useEffect(() => {
    if (!open || !assignmentId) return;
    setNote("");
    setNotifyNew(true);
    setNotifyOld(true);
    setForceFail(false);
    setJustification("");
    setResult(null);
    void load();
  }, [open, assignmentId, load]);

  function handleClose() {
    setPhase("form");
    setResult(null);
    onClose();
  }

  function viewWo() {
    const id = result?.workOrderId ?? data?.workOrderId;
    if (id) router.push(`/operations/work-orders/${id}`);
    handleClose();
  }

  async function reassign() {
    if (!assignmentId || !selected) {
      toastApiError(new Error("Select an eligible technician"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.reassignDispatch(assignmentId, {
        employeeId: selected,
        notifyTechnician: notifyNew,
        notifyOriginal: notifyOld,
        note: note.trim() || undefined,
        forceFail,
      });
      setResult({
        message: res.data.message,
        banner: res.data.banner,
        workOrderId: res.data.workOrderId,
        workOrderCode: res.data.workOrderCode,
      });
      if (res.data.ok === false) {
        setPhase("failed");
      } else {
        setPhase("success");
        onDone();
      }
    } catch (err) {
      toastApiError(err);
      setResult({
        message: "NO TECHNICIAN WAS REASSIGNED.",
        banner: "RECHECK CANDIDATES",
        workOrderId: data?.workOrderId,
        workOrderCode: data?.workOrderCode,
      });
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitOverride() {
    if (!assignmentId || !overrideTechId) {
      toastApiError(new Error("Select a blocked technician"));
      return;
    }
    if (!justification.trim()) {
      toastApiError(new Error("Justification is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await operationsApi.requestDispatchOverride(assignmentId, {
        employeeId: overrideTechId,
        justification: justification.trim(),
      });
      setResult({
        message: res.data.message,
        banner: res.data.banner,
        workOrderId: res.data.workOrderId,
        workOrderCode: res.data.workOrderCode,
      });
      setPhase("overrideRequested");
      onDone();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const eligible = data?.candidates.filter((c) => c.eligible) ?? [];
  const blocked = data?.candidates.filter((c) => !c.eligible) ?? [];
  const countsLabel = `${data?.eligibleCount ?? eligible.length} ELIGIBLE · ${data?.blockedCount ?? blocked.length} BLOCKED`;

  if (phase === "success" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Technician Reassigned"
        titleLeading={<span className="text-[#5ECF8E]">✓</span>}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase text-[#5ECF8E]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "failed" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Reassignment Failed"
        titleLeading={<span className="text-[#E86A6A]">✕</span>}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn onClick={handleClose}>Cancel</GhostBtn>
            <div className="flex flex-wrap gap-2">
              <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
              <PayrollPrimaryButton
                disabled={busy}
                onClick={() => {
                  setForceFail(false);
                  setPhase(
                    (data?.eligibleCount ?? 0) === 0 ? "noEligible" : "form",
                  );
                }}
              >
                Retry
              </PayrollPrimaryButton>
            </div>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#3A1C1C] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase text-[#E86A6A]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "overrideRequested" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Override Requested"
        titleLeading={<span className="text-[#E8C547]">!</span>}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#5A4A1A] bg-[#2A2410] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase text-[#E8C547]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "override") {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Eligibility Override"
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn
              disabled={busy}
              onClick={() =>
                setPhase(
                  (data?.eligibleCount ?? 0) === 0 ? "noEligible" : "form",
                )
              }
            >
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => void submitOverride()}
            >
              Request Override
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="mb-4 font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
          Admin or supervisor only. Select a blocked technician and document the
          exception for approval.
        </p>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Technician
            </span>
            <select
              className={fieldClass}
              value={overrideTechId}
              onChange={(e) => setOverrideTechId(e.target.value)}
            >
              <option value="">Select blocked technician</option>
              {blocked.map((c) => (
                <option key={c.employeeId} value={c.employeeId}>
                  {c.name.toUpperCase()} — {c.detail}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Justification <span className="text-[#E86A6A]">*</span>
            </span>
            <textarea
              rows={3}
              className={cn(fieldClass, "h-auto min-h-[80px] py-2")}
              placeholder="Document override reason"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </label>
          <p className="font-sans text-[11px] uppercase text-[#E8C547]">
            No assignment changes until override is approved.
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "noEligible") {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Reassign Technician"
        widthClassName="max-w-[560px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn onClick={handleClose}>Cancel</GhostBtn>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => setPhase("override")}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#C4A35A] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#C4A35A] disabled:opacity-50"
            >
              Override · Admin
            </button>
          </div>
        }
      >
        {loading || !data ? (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            Loading…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                  {data.summaryLine}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                  {data.scheduleLine}
                </p>
              </div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                {countsLabel}
              </p>
            </div>

            <div className="rounded-lg border border-[#7F1D1D]/40 bg-[#3B2020] px-3 py-2.5">
              <p className="font-sans text-[11px] uppercase text-[#E8A0A0]">
                {data.currentBanner}
              </p>
              <p className="mt-1 font-sans text-[10px] uppercase text-[#E8A0A0]/80">
                Reason: &apos;{data.declineReason}&apos;
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Eligibility Result
              </p>
              <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Recheck Or Request Override
              </p>
            </div>
            <div className="rounded-lg border border-[#5A4A1A] bg-[#2A2410] px-3 py-3">
              <p className="font-sans text-[11px] uppercase text-[#E8C547]">
                No technician meets the requirements for this job.
              </p>
              <p className="mt-1 font-sans text-[10px] uppercase text-[#C4A35A]">
                Review blocking reasons below. Override requires admin
                permission.
              </p>
            </div>

            <div>
              <p className="mb-2 font-sans text-[10px] uppercase text-[#6F6F72]">
                Not Eligible · Shown With Blocking Reason
              </p>
              <ul className="space-y-1">
                {blocked.map((c) => (
                  <li
                    key={c.employeeId}
                    className="flex items-start gap-2 rounded-lg bg-[#161616] px-3 py-2.5"
                  >
                    <span className="text-[#E86A6A]">✕</span>
                    <div>
                      <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {c.name}
                      </p>
                      <p className="mt-0.5 font-sans text-[10px] uppercase text-[#E86A6A]">
                        {c.meta ?? c.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Reassign Technician"
      widthClassName="max-w-[560px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <GhostBtn onClick={handleClose}>Cancel</GhostBtn>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => setPhase("override")}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#C4A35A] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#C4A35A] disabled:opacity-50"
            >
              Override · Admin
            </button>
            <PayrollPrimaryButton
              disabled={busy || !selected}
              onClick={() => void reassign()}
            >
              Reassign
            </PayrollPrimaryButton>
          </div>
        </div>
      }
    >
      {loading || !data ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Loading…
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                {data.summaryLine}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                {data.scheduleLine}
              </p>
            </div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              {countsLabel}
            </p>
          </div>

          <div className="rounded-lg border border-[#7F1D1D]/40 bg-[#3B2020] px-3 py-2.5">
            <p className="font-sans text-[11px] uppercase text-[#E8A0A0]">
              {data.currentBanner}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#E8A0A0]/80">
              Reason: &apos;{data.declineReason}&apos;
            </p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Eligible
              </p>
              <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                Certified · Available · Equipment Ready
              </p>
            </div>
            <ul className="space-y-1">
              {eligible.map((c) => {
                const active = selected === c.employeeId;
                return (
                  <li key={c.employeeId}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.employeeId)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active
                          ? "bg-[#1C3A2A]"
                          : "bg-[#161616] hover:bg-[#1A1A1A]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                          active
                            ? "border-[#5ECF8E] bg-[#5ECF8E]"
                            : "border-[#6F6F72]",
                        )}
                      >
                        {active ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
                        ) : null}
                      </span>
                      <div>
                        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                          {c.name}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 font-sans text-[10px] uppercase",
                            active ? "text-[#5ECF8E]" : "text-[#959597]",
                          )}
                        >
                          {c.meta ?? c.detail}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-sans text-[10px] uppercase text-[#6F6F72]">
              Not Eligible · Shown With Blocking Reason
            </p>
            <ul className="space-y-1">
              {blocked.map((c) => (
                <li
                  key={c.employeeId}
                  className="flex items-start gap-2 rounded-lg bg-[#161616] px-3 py-2.5 opacity-80"
                >
                  <span className="text-[#E86A6A]">✕</span>
                  <div>
                    <p className="font-sans text-[12px] uppercase text-[#959597]">
                      {c.name}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase text-[#E86A6A]">
                      {c.meta ?? c.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyNew}
                onChange={(e) => setNotifyNew(e.target.checked)}
                className="accent-[#5ECF8E]"
              />
              <span className="font-sans text-[10px] uppercase text-[#C8C8C8]">
                Notify New Technician
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyOld}
                onChange={(e) => setNotifyOld(e.target.checked)}
                className="accent-[#5ECF8E]"
              />
              <span className="font-sans text-[10px] uppercase text-[#C8C8C8]">
                Notify {data.originally} Of Removal
              </span>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Note To New Technician
            </span>
            <input
              className={fieldClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add note..."
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forceFail}
              onChange={(e) => setForceFail(e.target.checked)}
            />
            <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
              Simulate reassignment failure
            </span>
          </label>
        </div>
      )}
    </DashboardModal>
  );
}

type DeliveryPhase = "confirm" | "success" | "partial" | "failed";

function DeliveryTechList({
  technicians,
}: {
  technicians: Array<{ name: string; status: "DELIVERED" | "NOT_RECEIVED" }>;
}) {
  return (
    <ul className="divide-y divide-[#2A2A2A]">
      {technicians.map((t) => {
        const ok = t.status === "DELIVERED";
        return (
          <li
            key={t.name}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  ok ? "bg-[#5ECF8E]" : "bg-[#E86A6A]",
                )}
              />
              <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                {t.name}
              </span>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 font-sans text-[10px] uppercase",
                ok
                  ? "bg-[#1C3A2A] text-[#5ECF8E]"
                  : "bg-[#3A1C1C] text-[#E86A6A]",
              )}
            >
              {ok ? "Delivered" : "Not Received"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Post schedule to mobile — confirm / success / partial / fail. */
export function PostScheduleModal({
  open,
  scheduleDate,
  onClose,
  onDone,
}: {
  open: boolean;
  scheduleDate?: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<DeliveryPhase>("confirm");
  const [preview, setPreview] = React.useState<
    import("@/lib/operations-api").DispatchDeliveryPreview | null
  >(null);
  const [result, setResult] = React.useState<
    import("@/lib/operations-api").DispatchDeliveryResult | null
  >(null);
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [forcePartial, setForcePartial] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPhase("confirm");
    setResult(null);
    setForceFail(false);
    setForcePartial(false);
    void (async () => {
      try {
        const res = await operationsApi.postDispatchPreview(
          scheduleDate ?? undefined,
        );
        setPreview(res.data);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open, scheduleDate]);

  function handleClose() {
    setPhase("confirm");
    onClose();
  }

  async function submit(opts?: {
    forceFail?: boolean;
    forcePartial?: boolean;
    retryEmployeeId?: string;
  }) {
    setBusy(true);
    try {
      const res = await operationsApi.postDispatchToMobile({
        ids: preview?.assignmentIds,
        date: scheduleDate ?? preview?.scheduleDate,
        forceFail: opts?.forceFail ?? forceFail,
        forcePartial: opts?.forcePartial ?? forcePartial,
      });
      setResult(res.data);
      setPhase(res.data.outcome);
      if (res.data.outcome === "success") onDone?.();
      else if (res.data.outcome === "partial") onDone?.();
    } catch (err) {
      toastApiError(err);
      setResult({
        ok: false,
        outcome: "failed",
        jobs: preview?.jobs ?? 0,
        technicianCount: preview?.technicianCount ?? 0,
        deliveredCount: 0,
        dateLabel: preview?.dateLabel ?? "",
        message: "SCHEDULE UNCHANGED. NO TECHNICIANS WERE NOTIFIED.",
        banner: `ERROR: PUSH SERVICE UNREACHABLE · ${preview?.dateLabel ?? ""} SCHEDULE`,
        title: "COULD NOT POST SCHEDULE",
        technicians: (preview?.technicians ?? []).map((t) => ({
          ...t,
          status: "NOT_RECEIVED" as const,
        })),
      });
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Schedule Posted"}
        titleLeading={<span className="text-[#5ECF8E]">✓</span>}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex justify-end">
            <PayrollPrimaryButton onClick={handleClose}>
              View Dispatch
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#1C3A2A] bg-[#14241C] px-3 py-2.5">
          <p className="font-sans text-[11px] uppercase text-[#5ECF8E]">
            {result.banner}
          </p>
        </div>
        <div className="mt-3">
          <DeliveryTechList technicians={result.technicians} />
        </div>
      </DashboardModal>
    );
  }

  if (phase === "partial" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Posted Partial"}
        titleLeading={<span className="text-[#E8C547]">⚠</span>}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={handleClose}>Continue</GhostBtn>
            <SecondaryBtn
              onClick={() =>
                toastSuccess(
                  `Calling ${result.failedTechnicianName ?? "technician"}…`,
                )
              }
            >
              Call Technician
            </SecondaryBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() =>
                void submit({ forceFail: false, forcePartial: false })
              }
            >
              Retry For {result.failedTechnicianName ?? "Tech"}
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#5A4A1A] bg-[#2A2410] px-3 py-2.5">
          <p className="font-sans text-[11px] uppercase text-[#E8C547]">
            {result.banner}
          </p>
        </div>
        <div className="mt-3">
          <DeliveryTechList technicians={result.technicians} />
        </div>
      </DashboardModal>
    );
  }

  if (phase === "failed" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Could Not Post Schedule"}
        titleLeading={<span className="text-[#E86A6A]">✕</span>}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={handleClose}>Dismiss</GhostBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() =>
                void submit({ forceFail: false, forcePartial: false })
              }
            >
              Retry
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#3A1C1C] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase text-[#E86A6A]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Post Schedule To Mobile?"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy || !preview}
            onClick={() => void submit()}
          >
            Post Schedule
          </PayrollPrimaryButton>
        </div>
      }
    >
      <p className="font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
        This posts the assigned jobs to the technicians&apos; mobile apps for
        the selected day. Techs can then accept or decline.
      </p>
      <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
          {preview?.summaryLine ?? "Loading…"}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forcePartial}
            onChange={(e) => {
              setForcePartial(e.target.checked);
              if (e.target.checked) setForceFail(false);
            }}
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate partial failure
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forceFail}
            onChange={(e) => {
              setForceFail(e.target.checked);
              if (e.target.checked) setForcePartial(false);
            }}
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate total failure
          </span>
        </label>
      </div>
    </DashboardModal>
  );
}

/** Notify technicians — confirm / success / partial / fail. */
export function NotifyTechsModal({
  open,
  scheduleDate,
  onClose,
  onDone,
}: {
  open: boolean;
  scheduleDate?: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [phase, setPhase] = React.useState<DeliveryPhase>("confirm");
  const [preview, setPreview] = React.useState<
    import("@/lib/operations-api").DispatchDeliveryPreview | null
  >(null);
  const [result, setResult] = React.useState<
    import("@/lib/operations-api").DispatchDeliveryResult | null
  >(null);
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [forcePartial, setForcePartial] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPhase("confirm");
    setResult(null);
    setForceFail(false);
    setForcePartial(false);
    void (async () => {
      try {
        const res = await operationsApi.notifyDispatchPreview(
          scheduleDate ?? undefined,
        );
        setPreview(res.data);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open, scheduleDate]);

  function handleClose() {
    setPhase("confirm");
    onClose();
  }

  async function submit(opts?: {
    forceFail?: boolean;
    forcePartial?: boolean;
  }) {
    setBusy(true);
    try {
      const res = await operationsApi.notifyDispatchTechs({
        ids: preview?.assignmentIds,
        date: scheduleDate ?? preview?.scheduleDate,
        forceFail: opts?.forceFail ?? forceFail,
        forcePartial: opts?.forcePartial ?? forcePartial,
      });
      setResult(res.data);
      setPhase(res.data.outcome);
      if (res.data.outcome !== "failed") onDone?.();
    } catch (err) {
      toastApiError(err);
      setResult({
        ok: false,
        outcome: "failed",
        jobs: preview?.jobs ?? 0,
        technicianCount: preview?.technicianCount ?? 0,
        deliveredCount: 0,
        dateLabel: preview?.dateLabel ?? "",
        message:
          "PUSH NOTIFICATION COULD NOT BE DELIVERED. TECHNICIANS HAVE NOT BEEN NOTIFIED.",
        banner: `ERROR: PUSH SERVICE UNAVAILABLE · ${preview?.dateLabel ?? ""} SCHEDULE UNCHANGED`,
        title: "NOTIFICATION FAILED",
        technicians: (preview?.technicians ?? []).map((t) => ({
          ...t,
          status: "NOT_RECEIVED" as const,
        })),
      });
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Notifications Sent"}
        titleLeading={<span className="text-[#5ECF8E]">✓</span>}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex justify-end">
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#1C3A2A] bg-[#14241C] px-3 py-2.5">
          <p className="font-sans text-[11px] uppercase text-[#5ECF8E]">
            {result.banner}
          </p>
        </div>
        <div className="mt-3">
          <DeliveryTechList technicians={result.technicians} />
        </div>
      </DashboardModal>
    );
  }

  if (phase === "partial" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Sent Partial"}
        titleLeading={<span className="text-[#E8C547]">⚠</span>}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={handleClose}>Continue</GhostBtn>
            <SecondaryBtn
              onClick={() =>
                toastSuccess(
                  `Calling ${result.failedTechnicianName ?? "technician"}…`,
                )
              }
            >
              Call Technician
            </SecondaryBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() =>
                void submit({ forceFail: false, forcePartial: false })
              }
            >
              Retry For {result.failedTechnicianName ?? "Tech"}
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#5A4A1A] bg-[#2A2410] px-3 py-2.5">
          <p className="font-sans text-[11px] uppercase text-[#E8C547]">
            {result.banner}
          </p>
        </div>
        <div className="mt-3">
          <DeliveryTechList technicians={result.technicians} />
        </div>
      </DashboardModal>
    );
  }

  if (phase === "failed" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={result.title ?? "Notification Failed"}
        titleLeading={<span className="text-[#E86A6A]">✕</span>}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={handleClose}>Dismiss</GhostBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() =>
                void submit({ forceFail: false, forcePartial: false })
              }
            >
              Retry
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#3A1C1C] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase text-[#E86A6A]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="Notify Technicians?"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy || !preview}
            onClick={() => void submit()}
          >
            Send Notification
          </PayrollPrimaryButton>
        </div>
      }
    >
      <p className="font-sans text-[12px] uppercase leading-relaxed text-[#959597]">
        Send a push notification to the assigned technicians about their
        schedule and any changes.
      </p>
      <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
          {preview?.summaryLine ?? "Loading…"}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forcePartial}
            onChange={(e) => {
              setForcePartial(e.target.checked);
              if (e.target.checked) setForceFail(false);
            }}
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate partial failure
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forceFail}
            onChange={(e) => {
              setForceFail(e.target.checked);
              if (e.target.checked) setForcePartial(false);
            }}
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate total failure
          </span>
        </label>
      </div>
    </DashboardModal>
  );
}
