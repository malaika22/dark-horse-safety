"use client";

import * as React from "react";
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
  const [data, setData] = React.useState<DispatchReassignData | null>(null);
  const [selected, setSelected] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !assignmentId) return;
    let cancelled = false;
    setLoading(true);
    setSelected("");
    setNote("");
    setNotify(true);
    void (async () => {
      try {
        const res = await operationsApi.reassignCandidates(assignmentId);
        if (cancelled) return;
        setData(res.data);
        const first = res.data.candidates.find((c) => c.eligible);
        if (first) setSelected(first.employeeId);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assignmentId]);

  async function reassign() {
    if (!assignmentId || !selected) {
      toastApiError(new Error("Select an eligible technician"));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.reassignDispatch(assignmentId, {
        employeeId: selected,
        notifyTechnician: notify,
        note: note.trim() || undefined,
      });
      toastSuccess("Job reassigned");
      onDone();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function leaveUnassigned() {
    if (!assignmentId) return;
    setBusy(true);
    try {
      await operationsApi.leaveDispatchUnassigned(assignmentId);
      toastSuccess("Left unassigned");
      onDone();
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
      title="Reassign After Decline"
      widthClassName="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <SecondaryBtn disabled={busy} onClick={() => void leaveUnassigned()}>
            Leave Unassigned
          </SecondaryBtn>
          <PayrollPrimaryButton disabled={busy} onClick={() => void reassign()}>
            Reassign
          </PayrollPrimaryButton>
        </div>
      }
    >
      {loading || !data ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          {loading ? "Loading…" : "No data"}
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {data.workOrderCode} · {data.customerName} · {data.locationName} ·{" "}
              {data.scheduledDate}
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              Originally: {data.originally}
            </p>
            <div className="mt-2 rounded-lg border border-[#7F1D1D]/40 bg-[#3B2020] px-3 py-2 font-sans text-[11px] uppercase text-[#E8A0A0]">
              Decline reason (from mobile): {data.declineReason}
            </div>
          </div>
          <ul className="space-y-2">
            {data.candidates.map((c) => {
              const active = selected === c.employeeId;
              return (
                <li key={c.employeeId}>
                  <button
                    type="button"
                    disabled={!c.eligible}
                    onClick={() => setSelected(c.employeeId)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      c.eligible
                        ? active
                          ? "border-[#C4A35A]/50 bg-[#2A2618]"
                          : "border-[#2D2D30] bg-[#161616] hover:bg-[#1A1A1A]"
                        : "cursor-not-allowed border-[#2A2A2A] bg-[#121212] opacity-60",
                    )}
                  >
                    <div>
                      <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {c.name}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-sans text-[10px] uppercase",
                          c.eligible ? "text-[#ACEBCE]" : "text-[#959597]",
                        )}
                      >
                        {c.eligible
                          ? `${c.status} · ${c.detail}`
                          : `Blocked — ${c.detail}`}
                      </p>
                    </div>
                    <span className={c.eligible ? "text-[#22C55E]" : "text-[#6F6F72]"}>
                      {c.eligible ? "✓" : "×"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <label className="flex items-center justify-between gap-3">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Notify New Technician
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notify}
              onClick={() => setNotify((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                notify ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  notify ? "left-5" : "left-0.5",
                )}
              />
            </button>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Note
            </span>
            <input
              className={fieldClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </label>
        </div>
      )}
    </DashboardModal>
  );
}
