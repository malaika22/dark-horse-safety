"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmJobPacketExport,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const fieldClass =
  "w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

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

/** Close rule — hold / cancel with required reason. */
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
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  async function run(kind: "hold" | "cancel") {
    if (!workOrderId) return;
    if (!reason.trim()) {
      toastApiError(new Error("Reason is required"));
      return;
    }
    setBusy(true);
    try {
      if (kind === "hold") {
        await crmApi.holdWorkOrder(workOrderId, { reason: reason.trim() });
        toastSuccess("Work order held");
      } else {
        await crmApi.cancelWorkOrder(workOrderId, { reason: reason.trim() });
        toastSuccess("Work order cancelled");
      }
      onDone?.();
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
      title="Close Rule"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryBtn disabled={busy} onClick={() => void run("hold")}>
            Hold Work Order
          </SecondaryBtn>
          <SecondaryBtn disabled={busy} onClick={() => void run("cancel")}>
            Cancle Work Order
          </SecondaryBtn>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8]">
          This WO advances to closed on sales ticket approval / submission.
          Manual cancel or hold requires a reason.
        </p>
        <label className="block space-y-2">
          <span className="font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
            Reason
          </span>
          <textarea
            rows={5}
            className={fieldClass}
            placeholder="Internal note for this request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
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
