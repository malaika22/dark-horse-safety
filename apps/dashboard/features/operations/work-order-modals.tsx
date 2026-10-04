"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmJobPacketExport,
  type WorkOrderCancelPreview,
  type WorkOrderPoStatus,
} from "@/lib/crm-api";
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
        "rounded-lg px-3 py-2 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] disabled:opacity-50",
        className,
      )}
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

function SuccessCheck() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 items-center justify-center text-[#5ECF8E]"
    >
      ✓
    </span>
  );
}

function FailX() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 items-center justify-center text-[#E86A6A]"
    >
      ✕
    </span>
  );
}

type HoldPhase = "form" | "success" | "failed";

/** Close / Hold work order — reason form + success / fail outcomes. */
export function CloseRuleModal({
  open,
  workOrderId,
  onClose,
  onDone,
}: {
  open: boolean;
  workOrderId: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<HoldPhase>("form");
  const [reason, setReason] = React.useState("HOLD — AWAITING PARTS");
  const [note, setNote] = React.useState(
    "WAITING ON CUSTOMER PO BEFORE CLOSEOUT",
  );
  const [busy, setBusy] = React.useState(false);
  const [forceFail, setForceFail] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [result, setResult] = React.useState<{
    code: string;
    reason: string;
    message: string;
    banner: string;
  } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setReason("HOLD — AWAITING PARTS");
    setNote("WAITING ON CUSTOMER PO BEFORE CLOSEOUT");
    setForceFail(false);
    setResult(null);
    setCancelOpen(false);
  }, [open]);

  function handleClose() {
    setPhase("form");
    setResult(null);
    setCancelOpen(false);
    onClose();
  }

  async function confirmHold(opts?: { forceFail?: boolean }) {
    if (!workOrderId) return;
    if (!reason.trim()) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await crmApi.holdWorkOrder(workOrderId, {
        reason: reason.trim(),
        note: note.trim() || undefined,
        forceFail: opts?.forceFail ?? forceFail,
      });
      setResult({
        code: res.data.code,
        reason: res.data.reason,
        message: res.data.message,
        banner: res.data.banner,
      });
      if (res.data.ok === false) {
        setPhase("failed");
      } else {
        setPhase("success");
        onDone?.();
      }
    } catch (err) {
      toastApiError(err);
      setResult({
        code: "WO",
        reason: reason.trim(),
        message:
          "WORK ORDER WAS NOT CHANGED. LOGGED TIME AND ASSIGNMENTS REMAIN INTACT.",
        banner: "HOLD NOT SAVED · RETRY OR RETURN TO WORK ORDER",
      });
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelInstead() {
    setCancelOpen(true);
  }

  function viewWo() {
    if (workOrderId) {
      router.push(`/operations/work-orders/${workOrderId}`);
    }
    handleClose();
  }

  if (cancelOpen) {
    return (
      <CancelWorkOrderModal
        open={open}
        workOrderId={workOrderId}
        onClose={() => {
          setCancelOpen(false);
          handleClose();
        }}
        onDone={() => {
          onDone?.();
          handleClose();
        }}
      />
    );
  }

  if (phase === "success" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Work Order On Hold"
        titleLeading={<SuccessCheck />}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#5ECF8E]">
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
        title="Could Not Put Work Order On Hold"
        titleLeading={<FailX />}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn disabled={busy} onClick={handleClose}>
              Cancel
            </GhostBtn>
            <div className="flex flex-wrap gap-2">
              <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
              <PayrollPrimaryButton
                disabled={busy}
                onClick={() => void confirmHold({ forceFail: false })}
              >
                Retry
              </PayrollPrimaryButton>
            </div>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E86A6A]">
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
      title="Close / Hold Work Order"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <PayrollPrimaryButton
            disabled={busy}
            onClick={() => void confirmHold()}
          >
            Confirm
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          Work orders close only through sales ticket approval / billing. Hold
          or cancel require a reason.
        </p>
        <label className="block space-y-2">
          <span className={labelClass}>Reason</span>
          <input
            className={fieldClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className={labelClass}>Note</span>
          <textarea
            rows={3}
            className={fieldClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void cancelInstead()}
          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#E86A6A] hover:underline disabled:opacity-50"
        >
          Cancel Work Order Instead
        </button>
        <label className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={forceFail}
            onChange={(e) => setForceFail(e.target.checked)}
            className="rounded border-[#3E3E3E]"
          />
          <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
            Simulate hold failure
          </span>
        </label>
      </div>
    </DashboardModal>
  );
}

type CancelPhase = "form" | "success" | "blocked";

/** Cancel work order — form / success / blocked-by-sales-ticket. */
export function CancelWorkOrderModal({
  open,
  workOrderId,
  onClose,
  onDone,
}: {
  open: boolean;
  workOrderId: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<CancelPhase>("form");
  const [preview, setPreview] = React.useState<WorkOrderCancelPreview | null>(
    null,
  );
  const [reason, setReason] = React.useState("CUSTOMER CANCELLED");
  const [timeHandling, setTimeHandling] = React.useState<
    "KEEP_BILLABLE" | "KEEP_NON_BILLABLE" | "VOID"
  >("KEEP_BILLABLE");
  const [poActions, setPoActions] = React.useState<
    Record<string, "KEEP" | "CANCEL">
  >({});
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{
    code: string;
    message: string;
    banner: string;
    salesTicketId?: string | null;
    salesTicketCode?: string | null;
  } | null>(null);

  const load = React.useCallback(async () => {
    if (!workOrderId) return;
    try {
      const res = await crmApi.getWorkOrderCancelPreview(workOrderId);
      setPreview(res.data);
      setReason(res.data.reasonOptions[0] ?? "CUSTOMER CANCELLED");
      const actions: Record<string, "KEEP" | "CANCEL"> = {};
      for (const po of res.data.purchaseOrders) {
        actions[po.code] = "KEEP";
      }
      setPoActions(actions);
      setNotify(true);
      setTimeHandling("KEEP_BILLABLE");
      if (res.data.blocked) {
        setResult({
          code: res.data.code,
          message: res.data.blockedMessage ?? "CANCELLATION IS BLOCKED.",
          banner: res.data.blockedBanner,
          salesTicketId: res.data.salesTicketId,
          salesTicketCode: res.data.salesTicketCode,
        });
        setPhase("blocked");
      } else {
        setPhase("form");
      }
    } catch (err) {
      toastApiError(err);
    }
  }, [workOrderId]);

  React.useEffect(() => {
    if (!open || !workOrderId) return;
    setResult(null);
    void load();
  }, [open, workOrderId, load]);

  function handleClose() {
    setPhase("form");
    setResult(null);
    onClose();
  }

  function viewWo() {
    if (workOrderId) {
      router.push(`/operations/work-orders/${workOrderId}`);
    }
    handleClose();
  }

  function viewTicket() {
    const tid = result?.salesTicketId ?? preview?.salesTicketId;
    if (tid) {
      router.push(`/operations/sales-tickets/${tid}`);
    }
    handleClose();
  }

  async function confirmCancel() {
    if (!workOrderId) return;
    if (!reason.trim()) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      const res = await crmApi.cancelWorkOrder(workOrderId, {
        reason: reason.trim(),
        timeHandling,
        poActions,
        notifyTechnicians: notify,
      });
      setResult({
        code: res.data.code,
        message: res.data.message,
        banner: res.data.banner,
        salesTicketId: res.data.salesTicketId,
        salesTicketCode: res.data.salesTicketCode,
      });
      if (res.data.blocked || res.data.ok === false) {
        setPhase("blocked");
      } else {
        setPhase("success");
        onDone?.();
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Work Order Cancelled"
        titleLeading={<SuccessCheck />}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={viewWo}>View Work Order</GhostBtn>
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#5ECF8E]">
            {result.banner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "blocked" && result) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Cannot Cancel Work Order"
        titleLeading={<FailX />}
        widthClassName="max-w-[480px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn onClick={handleClose}>Cancel</GhostBtn>
            <div className="flex flex-wrap gap-2">
              <SecondaryBtn onClick={viewWo}>View Work Order</SecondaryBtn>
              <PayrollPrimaryButton onClick={viewTicket}>
                View Sales Ticket
              </PayrollPrimaryButton>
            </div>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          {result.message}
        </p>
        <div className="mt-4 rounded-lg border border-[#3A1C1C] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E86A6A]">
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
      title="Cancel Work Order"
      widthClassName="max-w-[560px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Keep Open
          </GhostBtn>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void confirmCancel()}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#8B2E2E] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] disabled:opacity-50"
          >
            Cancel Work Order
          </button>
        </div>
      }
    >
      <p className="mb-4 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
        {preview?.subtitle ?? "Loading…"}
      </p>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>
            Reason <span className="text-[#E86A6A]">*</span>
          </span>
          <select
            className={fieldClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {(preview?.reasonOptions ?? ["CUSTOMER CANCELLED"]).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-3 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3">
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            What Happens To Logged Work
          </p>

          <div className="space-y-2">
            <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              {preview?.hoursRowLabel ?? "Time Entries"}
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["KEEP_BILLABLE", "Keep Billable"],
                  ["KEEP_NON_BILLABLE", "Keep Non-Billable"],
                  ["VOID", "Void"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="timeHandling"
                    checked={timeHandling === value}
                    onChange={() => setTimeHandling(value)}
                  />
                  <span className="font-sans text-[10px] uppercase text-[#C8C8C8]">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2A2A2A] pt-3">
            <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Forms
            </p>
            <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
              {preview?.formsLabel ?? "RETAINED · LOCKED · READ-ONLY"}
            </p>
          </div>

          <div className="space-y-2 border-t border-[#2A2A2A] pt-3">
            <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Purchase Orders
            </p>
            {(preview?.purchaseOrders ?? []).map((po) => (
              <div
                key={po.code}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <p className="font-sans text-[11px] uppercase text-[#C8C8C8]">
                  {po.code} · {po.vendor} · {po.amountLabel}
                </p>
                <div className="flex gap-3">
                  {(["KEEP", "CANCEL"] as const).map((action) => (
                    <label
                      key={action}
                      className="flex cursor-pointer items-center gap-1.5"
                    >
                      <input
                        type="radio"
                        name={`po-${po.code}`}
                        checked={(poActions[po.code] ?? "KEEP") === action}
                        onChange={() =>
                          setPoActions((prev) => ({
                            ...prev,
                            [po.code]: action,
                          }))
                        }
                      />
                      <span className="font-sans text-[10px] uppercase text-[#C8C8C8]">
                        {action === "KEEP" ? "Keep" : "Cancel"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="accent-[#5ECF8E]"
          />
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {preview?.notifyLabel ?? "Notify And Unassign Technicians"}
          </span>
        </label>

        <div className="rounded-lg border border-[#5A4A1A] bg-[#2A2410] px-3 py-3">
          <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C547]">
            ⚠ {preview?.warningLabel ?? "Technicians have logged time."}
          </p>
        </div>

        <p className="text-center font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          {preview?.ruleLabel ??
            "Cancellation is blocked after a sales ticket is submitted."}
        </p>
      </div>
    </DashboardModal>
  );
}

type PoPhase = "blocker" | "request" | "sent";

/** PO required gate before NetSuite send — blocker / request / sent. */
export function PoRequiredGateModal({
  open,
  workOrderId,
  onClose,
  onCleared,
}: {
  open: boolean;
  workOrderId: string | null;
  onClose: () => void;
  onCleared?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<PoPhase>("blocker");
  const [status, setStatus] = React.useState<WorkOrderPoStatus | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [neededBy, setNeededBy] = React.useState("");
  const [sentBanner, setSentBanner] = React.useState("");
  const [sentTo, setSentTo] = React.useState("");

  const load = React.useCallback(async () => {
    if (!workOrderId) return;
    try {
      const res = await crmApi.getWorkOrderPoStatus(workOrderId);
      setStatus(res.data);
      setTo(res.data.compose.to);
      setCc(res.data.compose.cc);
      setSubject(res.data.compose.subject);
      setMessage(res.data.compose.message);
      setNeededBy(res.data.compose.neededBy);
    } catch (err) {
      toastApiError(err);
    }
  }, [workOrderId]);

  React.useEffect(() => {
    if (!open || !workOrderId) return;
    setPhase("blocker");
    setSentBanner("");
    setSentTo("");
    void load();
  }, [open, workOrderId, load]);

  function handleClose() {
    setPhase("blocker");
    onClose();
  }

  function viewWo() {
    if (workOrderId) {
      router.push(`/operations/work-orders/${workOrderId}`);
    }
    handleClose();
  }

  async function markReceived() {
    if (!workOrderId) return;
    setBusy(true);
    try {
      await crmApi.markWorkOrderPoReceived(workOrderId);
      toastSuccess("PO marked received");
      onCleared?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function attachPo() {
    if (!workOrderId) return;
    setBusy(true);
    try {
      const res = await crmApi.attachWorkOrderPo(workOrderId, {});
      toastSuccess(res.data.message ?? "PO attached");
      onCleared?.();
      handleClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendRequest() {
    if (!workOrderId) return;
    if (!to.trim() || !subject.trim()) {
      toastApiError(new Error("To and subject are required"));
      return;
    }
    setBusy(true);
    try {
      const res = await crmApi.requestWorkOrderPo(workOrderId, {
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        message: message.trim() || undefined,
        neededBy: neededBy.trim() || undefined,
      });
      setSentTo(res.data.to);
      setSentBanner(res.data.banner);
      setPhase("sent");
      toastSuccess("PO request sent");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "sent") {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="PO Request Sent"
        titleLeading={<SuccessCheck />}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <GhostBtn onClick={viewWo}>View Work Order</GhostBtn>
            <PayrollPrimaryButton onClick={handleClose}>Done</PayrollPrimaryButton>
          </div>
        }
      >
        <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
          Sent to {sentTo}.
        </p>
        <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#5ECF8E]">
            {sentBanner}
          </p>
        </div>
      </DashboardModal>
    );
  }

  if (phase === "request" && status) {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title="Request Purchase Order"
        widthClassName="max-w-[560px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <GhostBtn disabled={busy} onClick={() => setPhase("blocker")}>
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => void sendRequest()}
            >
              Send Request
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="mb-4 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
          {status.customerName} · {status.code}
        </p>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className={labelClass}>To</span>
            <input
              className={fieldClass}
              value={to}
              onChange={(e) => setTo(e.target.value)}
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
            <span className={labelClass}>Subject</span>
            <input
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Message</span>
            <textarea
              rows={6}
              className={fieldClass}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Needed By · Before Cycle Lock</span>
            <input
              className={fieldClass}
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </label>
        </div>
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title="PO Required Before NetSuite Send"
      widthClassName="max-w-[560px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <GhostBtn disabled={busy} onClick={handleClose}>
            Cancel
          </GhostBtn>
          <div className="flex flex-wrap gap-2">
            <SecondaryBtn
              disabled={busy || !status}
              onClick={() => setPhase("request")}
            >
              Request PO
            </SecondaryBtn>
            <SecondaryBtn disabled={busy} onClick={() => void markReceived()}>
              Mark PO Received
            </SecondaryBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => void attachPo()}
            >
              Attach PO
            </PayrollPrimaryButton>
          </div>
        </div>
      }
    >
      <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        This customer requires a purchase order before invoice / NetSuite
        handoff. Attach a PO or mark it received before continuing.
      </p>
      <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
        <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {status?.summaryLine ?? "Loading…"}
        </p>
      </div>
    </DashboardModal>
  );
}

const PACKET_INCLUDE_DEFAULTS = [
  "JOB_DETAILS",
  "COMPLIANCE_FORMS",
  "SIGNATURES",
  "SALES_TICKET",
  "CORRECTIONS",
  "TIME_SUMMARY",
  "PHOTOS",
  "GPS_TRAIL",
];

/** Export job packet include + watermark picker. */
export function ExportJobPacketModal({
  open,
  workOrderId,
  formCount = 6,
  photoCount = 6,
  onClose,
  onPreview,
}: {
  open: boolean;
  workOrderId: string | null;
  formCount?: number;
  photoCount?: number;
  onClose: () => void;
  onPreview?: (payload: CrmJobPacketExport) => void;
}) {
  const [include, setInclude] = React.useState<string[]>(PACKET_INCLUDE_DEFAULTS);
  const [watermark, setWatermark] = React.useState<"NONE" | "DRAFT" | "FINAL">(
    "DRAFT",
  );
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setInclude(PACKET_INCLUDE_DEFAULTS);
      setWatermark("DRAFT");
    }
  }, [open]);

  function toggle(key: string) {
    setInclude((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function preview() {
    if (!workOrderId) return;
    setBusy(true);
    try {
      const res = await crmApi.exportJobPacket(workOrderId, {
        include,
        watermark,
      });
      onPreview?.(res.data);
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const leftChecks = [
    { key: "JOB_DETAILS", label: "Job Details" },
    { key: "COMPLIANCE_FORMS", label: `Compliance Forms (${formCount})` },
    { key: "SIGNATURES", label: "Signatures" },
    { key: "SALES_TICKET", label: "Sales Ticket" },
    { key: "CORRECTIONS", label: "Corrections and Addenda" },
  ];
  const rightChecks = [
    { key: "TIME_SUMMARY", label: "Time Summary" },
    { key: "PHOTOS", label: `Photos (${photoCount})` },
    { key: "GPS_TRAIL", label: "GPS Trail" },
    { key: "PURCHASE_ORDERS", label: "Purchase Orders" },
    {
      key: "INTERNAL_NOTES",
      label: "Internal Notes (Default Off)",
      gold: true,
    },
  ];

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Export Job Packet"
      widthClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <PayrollPrimaryButton disabled={busy} onClick={() => void preview()}>
            Preview
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-5 px-1">
        <div>
          <p className="mb-3 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Include
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[...leftChecks, ...rightChecks].map((item) => {
              const checked = include.includes(item.key);
              return (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-[3px] border",
                      checked
                        ? "border-[#3B82F6] bg-[#3B82F6]"
                        : "border-[#3E3E3E] bg-transparent",
                    )}
                  >
                    {checked ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12.5l5 5L19 7"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggle(item.key)}
                  />
                  <span
                    className={cn(
                      "font-sans text-[11px] uppercase tracking-[-0.02em]",
                      "gold" in item && item.gold
                        ? "text-[#C4A35A]"
                        : "text-[#FDFDFF]",
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Watermark
          </p>
          <div className="flex flex-wrap gap-4">
            {(["NONE", "DRAFT", "FINAL"] as const).map((w) => (
              <label key={w} className="flex cursor-pointer items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                    watermark === w ? "border-[#FDFDFF]" : "border-[#959597]",
                  )}
                >
                  {watermark === w ? (
                    <span className="h-2 w-2 rounded-full bg-[#FDFDFF]" />
                  ) : null}
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  checked={watermark === w}
                  onChange={() => setWatermark(w)}
                />
                <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                  {w}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </DashboardModal>
  );
}

/** Full-screen-ish print preview for job packet. */
export function JobPacketPrintPreview({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: CrmJobPacketExport | null;
  onClose: () => void;
}) {
  if (!open || !payload) return null;
  const p = payload.preview;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0A0A0A]">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-[#FDFDFF] hover:opacity-80"
          >
            ✕
          </button>
          <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Print Preview — Job Packet
          </p>
        </div>
        <div className="flex items-center gap-3 text-[#FDFDFF]">
          <button type="button" className="opacity-80 hover:opacity-100" title="Print" onClick={() => window.print()}>
            ⎙
          </button>
          <span className="opacity-50">⬇</span>
          <span className="opacity-50">✉</span>
          <span className="opacity-50">⋮</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-[#2D2D30] bg-[#1C1C1C] p-5 sm:p-8">
          {payload.watermark !== "NONE" ? (
            <p className="mb-4 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-[#C4A35A]">
              {payload.watermark}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-6 w-6 rounded-sm bg-[#E31C23]" />
              <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                {p.brand}
              </p>
            </div>
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                {p.workOrderLabel}
              </p>
              <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                {p.workOrderCode}
              </p>
              <p className="mt-1 font-sans text-[10px] uppercase text-[#6F6F72]">
                {p.locationLine}
              </p>
            </div>
          </div>

          <h1 className="mt-6 font-sans text-[28px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {p.title}
          </h1>
          <p className="mt-2 max-w-xl font-sans text-[11px] uppercase leading-relaxed text-[#959597]">
            {p.subtitle}
          </p>

          <div className="my-5 h-px bg-[#2A2A2A]" />

          <div className="space-y-3">
            {p.sections.map((s) => (
              <div
                key={s.key}
                className="rounded-lg bg-[#262626] px-4 py-3"
              >
                <p className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                  {s.title}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase leading-relaxed text-[#959597]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-[#2A2A2A]" />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              {p.footerLeft.map((line) => (
                <p
                  key={line}
                  className="font-sans text-[10px] uppercase text-[#6F6F72]"
                >
                  {line}
                </p>
              ))}
            </div>
            <div className="text-right">
              <p className="font-sans text-[16px] font-[590] uppercase text-[#FDFDFF]">
                {p.approvedBy}
              </p>
              <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                Approved By
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Request a missing document. */
export function RequestDocumentModal({
  open,
  workOrderId,
  documentName,
  documentStatus = "Not Submitted",
  badge = "Link Missing",
  onClose,
  onSent,
}: {
  open: boolean;
  workOrderId: string | null;
  documentName: string;
  documentStatus?: string;
  badge?: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setDescription("");
  }, [open]);

  async function send() {
    if (!workOrderId) return;
    setBusy(true);
    try {
      const res = await crmApi.requestWorkOrderDocument(workOrderId, {
        documentName,
        description: description.trim() || undefined,
      });
      toastSuccess(res.data.message);
      onSent?.();
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
      title="Request Document"
      widthClassName="max-w-[440px]"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <SecondaryBtn disabled={busy} onClick={() => void send()}>
            Send Request
          </SecondaryBtn>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[13px] font-[510] uppercase text-[#FDFDFF]">
              {documentName}
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              {documentStatus}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-[#3A1515] px-2.5 py-1 font-sans text-[10px] uppercase text-[#FF6B6B]">
            {badge}
          </span>
        </div>
        <label className="block space-y-2">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Descripton
          </span>
          <textarea
            rows={5}
            className={fieldClass}
            placeholder="Write description for this request..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
    </DashboardModal>
  );
}
