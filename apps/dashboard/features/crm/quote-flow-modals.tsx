"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  DashboardBadge,
  DashboardField,
  DashboardModal,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
  useScrollLock,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import type {
  CrmQuoteConvertEligibility,
  CrmQuoteConvertEligibilityCheck,
  CrmQuoteConvertResult,
} from "@/lib/crm-api";

const textareaClass =
  "min-h-[96px] w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-normal tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtShort(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function fmtConvertedOn(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
  return `${date} · ${time}`;
}

function CloseTextBtn({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
    >
      {label}
    </button>
  );
}

function WarningTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5 14.5 13.5h-13L8 1.5Z"
        stroke="#E8C07A"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M8 6v3.5M8 11.5h.01"
        stroke="#E8C07A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SuccessCheckIcon() {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#203B2C] text-[13px] text-[#4ADE80]"
      aria-hidden
    >
      ✓
    </span>
  );
}

function ErrorXIcon() {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3A1515] text-[14px] leading-none text-[#FF6B6B]"
      aria-hidden
    >
      ×
    </span>
  );
}

export type ResendQuotePayload = {
  recipient: string;
  versionLabel: string;
  message: string;
  attachPdf: boolean;
};

export function ResendQuoteModal({
  open,
  onClose,
  onSend,
  onPreview,
  defaultRecipient = "",
  versionLabel = "Quote V1",
  warning,
  defaultMessage = "",
}: {
  open: boolean;
  onClose: () => void;
  onSend?: (payload: ResendQuotePayload) => void | Promise<void>;
  onPreview?: () => void;
  defaultRecipient?: string;
  versionLabel?: string;
  warning?: string | null;
  defaultMessage?: string;
}) {
  const [recipient, setRecipient] = React.useState(defaultRecipient);
  const [version, setVersion] = React.useState(versionLabel);
  const [message, setMessage] = React.useState(defaultMessage);
  const [attachPdf, setAttachPdf] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setRecipient(defaultRecipient);
    setVersion(versionLabel);
    setMessage(defaultMessage);
    setAttachPdf(false);
    setSubmitting(false);
  }, [open, defaultRecipient, versionLabel, defaultMessage]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Re-Send Quote"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton onClick={() => onPreview?.()}>
            Preview
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !recipient.trim()}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onSend?.({
                    recipient: recipient.trim(),
                    versionLabel: version.trim(),
                    message,
                    attachPdf,
                  });
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Send Now
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        {warning ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-[#8B6914]/60 bg-[#1C160C] px-3 py-2.5">
            <span className="mt-0.5 text-[#E8C07A]" aria-hidden>
              âš 
            </span>
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C07A]">
              {warning}
            </p>
          </div>
        ) : null}
        <DashboardTextField
          label="Recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="email@company.com"
        />
        <DashboardTextField
          label="Version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        />
        <DashboardField label="Message">
          <textarea
            className={textareaClass}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </DashboardField>
        <DashboardToggle
          label="Attach PDF Copy"
          checked={attachPdf}
          onCheckedChange={setAttachPdf}
        />
      </div>
    </DashboardModal>
  );
}

export type QuoteVersionListItem = {
  id: string;
  revision: number;
  label: string;
  badge: "CURRENT" | "SUPERSEDED" | "DRAFT";
  amount: number;
  sentAt?: string | null;
  createdAt: string;
  author: string;
  status: string;
  isCurrent?: boolean;
};

export function QuoteVersionHistoryModal({
  open,
  onClose,
  quoteNumber,
  customer,
  versions,
  onCompare,
  onOpenCurrent,
}: {
  open: boolean;
  onClose: () => void;
  quoteNumber: string;
  customer: string;
  versions: QuoteVersionListItem[];
  onCompare?: () => void;
  onOpenCurrent?: () => void;
}) {
  const current = versions.find((v) => v.badge === "CURRENT") ?? versions[0];
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Quote Version History"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} />
          <DashboardToolbarButton onClick={() => onCompare?.()}>
            Compare Versions
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => onOpenCurrent?.()}>
            Open {current?.label ?? "Current"}
          </DashboardToolbarButton>
        </>
      }
    >
      <p className="-mt-2 mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        Quote {quoteNumber} Â· {customer}
      </p>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {v.label}
              </p>
              <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                {v.status === "DRAFT" ? "Draft" : "Sent"}{" "}
                {fmtShort(v.sentAt ?? v.createdAt)} Â· {v.author}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                {money(v.amount)}
              </span>
              <DashboardBadge
                variant={
                  v.badge === "CURRENT"
                    ? "success"
                    : v.badge === "DRAFT"
                      ? "warning"
                      : "neutral"
                }
                pill
              >
                {v.badge === "CURRENT"
                  ? "Current"
                  : v.badge === "DRAFT"
                    ? "Draft"
                    : "Superseded"}
              </DashboardBadge>
            </div>
          </li>
        ))}
      </ul>
    </DashboardModal>
  );
}

export type CompareVersionRow = {
  field: string;
  left: string | null;
  right: string | null;
  change: "same" | "changed" | "added" | "removed";
};

export function QuoteCompareVersionsModal({
  open,
  onClose,
  leftLabel,
  rightLabel,
  rows,
  onKeepLeft,
  onSendRight,
}: {
  open: boolean;
  onClose: () => void;
  leftLabel: string;
  rightLabel: string;
  rows: CompareVersionRow[];
  onKeepLeft?: () => void;
  onSendRight?: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Compare Versions"
      widthClassName="max-w-xl"
      footer={
        <>
          <CloseTextBtn onClick={onClose} />
          <DashboardToolbarButton onClick={() => onKeepLeft?.()}>
            Keep {leftLabel.split("Â·")[0]?.trim() || "V2"}
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => onSendRight?.()}>
            Send {rightLabel.split("Â·")[0]?.trim() || "V3"}
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#2A2A2A] px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#C8C8C8]">
          {leftLabel}
        </span>
        <span className="text-[#959597]" aria-hidden>
          â†’
        </span>
        <span className="rounded-full bg-[#203B2C] px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#ACEBCE]">
          {rightLabel}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#2D2D30]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2D2D30]">
              {["Field", leftLabel.split("Â·")[0]?.trim() || "V2", rightLabel.split("Â·")[0]?.trim() || "V3"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isTotal = /total/i.test(row.field);
              const rightClass =
                row.change === "added"
                  ? "text-[#4ADE80]"
                  : row.change === "changed"
                    ? "text-[#E8C07A]"
                    : isTotal
                      ? "text-[#FDFDFF]"
                      : "text-[#C8C8C8]";
              return (
                <tr key={row.field} className="border-b border-[#2D2D30] last:border-b-0">
                  <td
                    className={`px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] ${
                      isTotal ? "font-[510] text-[#FDFDFF]" : "text-[#959597]"
                    }`}
                  >
                    {row.field}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {row.left ?? "â€”"}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] ${rightClass} ${
                      isTotal ? "font-[510]" : ""
                    }`}
                  >
                    {row.right ?? "â€”"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardModal>
  );
}

export type ConvertQuotePayload = {
  jobType: string;
  locationId: string;
  serviceDate: string;
  overrideReason?: string;
};

export function ConvertQuoteToWorkOrderModal({
  open,
  onClose,
  onConvert,
  quoteNumber,
  customerName,
  amount,
  jobTypeOptions,
  siteOptions,
  sitesLoading,
  defaultJobType = "",
  defaultSiteId = "",
  defaultServiceDate = "",
}: {
  open: boolean;
  onClose: () => void;
  onConvert: (payload: ConvertQuotePayload) => void | Promise<void>;
  quoteNumber: string;
  customerName: string;
  amount: number;
  jobTypeOptions: DashboardSelectOption[];
  siteOptions: DashboardSelectOption[];
  sitesLoading?: boolean;
  defaultJobType?: string;
  defaultSiteId?: string;
  defaultServiceDate?: string;
}) {
  const [jobType, setJobType] = React.useState(defaultJobType);
  const [siteId, setSiteId] = React.useState(defaultSiteId);
  const [serviceDate, setServiceDate] = React.useState(defaultServiceDate);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setJobType(defaultJobType);
    setSiteId(defaultSiteId);
    setServiceDate(
      defaultServiceDate ||
        new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    );
    setSubmitting(false);
  }, [open, defaultJobType, defaultSiteId, defaultServiceDate]);

  const canSubmit =
    Boolean(jobType.trim()) &&
    Boolean(siteId.trim()) &&
    Boolean(serviceDate.trim()) &&
    !submitting;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Convert Quote to Work Order?"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onConvert({
                    jobType: jobType.trim(),
                    locationId: siteId.trim(),
                    serviceDate,
                  });
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            {submitting ? "Converting…" : "Convert to Work Order"}
          </DashboardToolbarButton>
        </>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        This creates a work order from the approved quote and carries over the
        customer, location, line items, and pricing. The quote is marked
        converted.
      </p>
      <div className="mb-4 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8CA]">
        {quoteNumber} → New Work Order · {customerName || "—"} ·{" "}
        {money(amount)}
      </div>
      <div className="space-y-3">
        <DashboardSelectField
          label="Job Type *"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          options={jobTypeOptions}
          placeholder="Select job type"
          emptyMessage="No job types found"
        />
        <div>
          <DashboardSelectField
            label="Site *"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={siteOptions}
            placeholder="Select site"
            loading={sitesLoading}
            emptyMessage="No sites for this customer"
          />
          <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#707074]">
            This customer&apos;s locations only.
          </p>
        </div>
        <DashboardTextField
          label="Service Date *"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />
      </div>
      <p className="mt-4 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#707074]">
        Carried over: customer · line items · pricing. Once converted, this
        quote becomes read-only.
      </p>
    </DashboardModal>
  );
}

export function CannotConvertQuoteModal({
  open,
  onClose,
  onViewCustomer,
  onOverride,
  eligibility,
}: {
  open: boolean;
  onClose: () => void;
  onViewCustomer?: () => void;
  onOverride?: (reason: string) => void | Promise<void>;
  eligibility: CrmQuoteConvertEligibility | null;
}) {
  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setOverrideOpen(false);
    setReason("");
    setSubmitting(false);
  }, [open]);

  const checks: CrmQuoteConvertEligibilityCheck[] =
    eligibility?.checks ?? [];
  const canOverride = Boolean(eligibility?.canOverride && onOverride);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Cannot Convert"
      titleLeading={<WarningTriangleIcon />}
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton onClick={() => onViewCustomer?.()}>
            View Customer
          </DashboardToolbarButton>
          {canOverride ? (
            <DashboardToolbarButton
              variant="primary"
              disabled={submitting}
              onClick={() => {
                if (!overrideOpen) {
                  setOverrideOpen(true);
                  return;
                }
                if (!reason.trim()) return;
                void (async () => {
                  setSubmitting(true);
                  try {
                    await onOverride?.(reason.trim());
                  } finally {
                    setSubmitting(false);
                  }
                })();
              }}
            >
              {overrideOpen
                ? submitting
                  ? "Overriding…"
                  : "Confirm Override"
                : "Override"}
            </DashboardToolbarButton>
          ) : null}
        </>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C07A]">
        {eligibility?.blockerMessage ??
          "Resolve eligibility issues before converting, or override with a reason."}
      </p>
      <div className="space-y-2.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3">
        {checks.map((c) => (
          <div
            key={c.key}
            className="flex items-start justify-between gap-3"
          >
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              {c.label}
            </span>
            <span
              className={`text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${
                c.ok ? "text-[#FDFDFF]" : "text-[#E8C07A]"
              }`}
            >
              {c.detail}
            </span>
          </div>
        ))}
      </div>
      {overrideOpen ? (
        <div className="mt-4">
          <DashboardField label="Override Reason *">
            <textarea
              className={textareaClass}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required. Logged with the conversion."
            />
          </DashboardField>
        </div>
      ) : null}
      <p className="mt-4 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#707074]">
        Override is shown only to permitted roles. A reason is required and is
        logged.
      </p>
    </DashboardModal>
  );
}

export function ConversionFailedModal({
  open,
  onClose,
  onRetry,
  quoteNumber,
  customerName,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
  quoteNumber: string;
  customerName: string;
  reason: string;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Conversion Failed"
      titleLeading={<ErrorXIcon />}
      widthClassName="max-w-md"
      footer={
        <>
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => onRetry?.()}>
            Retry
          </DashboardToolbarButton>
        </>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        Something went wrong creating the work order. The quote is unchanged —
        nothing was lost.
      </p>
      <div className="space-y-2.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3">
        {[
          ["Quote", `${quoteNumber} · unchanged`],
          ["Reason", reason || "Unknown error"],
          ["Customer", customerName || "—"],
        ].map(([label, valueText]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              {label}
            </span>
            <span
              className={`max-w-[70%] text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] ${
                label === "Reason" ? "text-[#FDFDFF]" : "text-[#C8C8CA]"
              }`}
            >
              {valueText}
            </span>
          </div>
        ))}
      </div>
    </DashboardModal>
  );
}

export function WorkOrderCreatedModal({
  open,
  onClose,
  result,
  quoteNumber,
  workOrderCode,
  customer,
  value,
  scheduled,
  createdBy,
  quoteId,
  workOrderId,
  locationLabel,
  lineItemsSummary,
  convertedBy,
  convertedOn,
  stillRequired,
}: {
  open: boolean;
  onClose: () => void;
  result?: CrmQuoteConvertResult | null;
  quoteNumber?: string;
  workOrderCode?: string;
  customer?: string;
  value?: string;
  scheduled?: string;
  createdBy?: string;
  quoteId?: string;
  workOrderId?: string;
  locationLabel?: string;
  lineItemsSummary?: string;
  convertedBy?: string;
  convertedOn?: string;
  stillRequired?: string[];
}) {
  const woCode =
    result?.code ?? result?.workOrderNumber ?? workOrderCode ?? "—";
  const woId = result?.id ?? workOrderId;
  const qId = result?.quoteId ?? quoteId;
  const qNum = result?.quoteNumber ?? quoteNumber ?? "—";
  const cust = result?.customer?.name ?? customer ?? "—";
  const loc =
    result?.locationLabel ??
    locationLabel ??
    result?.location?.name ??
    "—";
  const lines =
    result?.lineItemsSummary ??
    lineItemsSummary ??
    (value ? `Quoted · ${value}` : "—");
  const by =
    result?.convertedBy ?? result?.createdBy ?? convertedBy ?? createdBy ?? "—";
  const on =
    convertedOn ??
    (result?.convertedOn ? fmtConvertedOn(result.convertedOn) : null) ??
    scheduled ??
    "—";
  const required =
    result?.stillRequiredBeforeDispatch ??
    stillRequired ??
    [];
  const outcomeLabel = (result?.outcome ?? "WON").replace(/_/g, " ");
  const statusLabel = (result?.quoteStatus ?? "CONVERTED").replace(/_/g, " ");

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Work Order Created"
      titleLeading={<SuccessCheckIcon />}
      widthClassName="max-w-lg"
      footer={
        <>
          <DashboardToolbarButton onClick={onClose}>
            Continue in CRM
          </DashboardToolbarButton>
          {woId ? (
            <Link href={`/operations/work-orders/${woId}`}>
              <DashboardToolbarButton variant="primary">
                Complete Work Order
              </DashboardToolbarButton>
            </Link>
          ) : (
            <DashboardToolbarButton variant="primary" disabled>
              Complete Work Order
            </DashboardToolbarButton>
          )}
        </>
      }
    >
      <p className="mb-3 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        Carried over: customer · location · line items · pricing. Job type and
        service date were set during conversion.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <DashboardBadge variant="success">
          Outcome: {outcomeLabel}
        </DashboardBadge>
        <DashboardBadge variant="success">
          Status: {statusLabel}
        </DashboardBadge>
      </div>
      {required.length > 0 ? (
        <div className="mb-4 rounded-lg border border-[#8B6914]/50 bg-[#1C160C] px-3.5 py-3">
          <p className="mb-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#E8C07A]">
            Still Required Before Dispatch
          </p>
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8CA]">
            {required.join(" · ")}
          </p>
        </div>
      ) : null}
      <div className="space-y-2.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3">
        {(
          [
            ["Work Order #", woCode],
            ["Customer", cust],
            ["Location", loc],
            [
              "Source Quote",
              qId ? (
                <Link
                  key="sq"
                  href={`/crm/quotes/${qId}`}
                  className="text-[#7EB6FF] hover:underline"
                >
                  {qNum}
                </Link>
              ) : (
                qNum
              ),
            ],
            ["Line Items & Pricing", lines],
            ["Converted By", by],
            ["Converted On", on],
          ] as [string, React.ReactNode][]
        ).map(([label, valueText]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              {label}
            </span>
            <span className="max-w-[70%] text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {valueText}
            </span>
          </div>
        ))}
      </div>
    </DashboardModal>
  );
}

function StatusDot({ tone }: { tone: "success" | "error" }) {
  return tone === "success" ? <SuccessCheckIcon /> : <ErrorXIcon />;
}

function fmtStamp(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(",", " ·")
    .toUpperCase();
}

export function QuoteSentSuccessModal({
  open,
  onClose,
  recipient,
  versionLabel,
  sentAt,
  supersedeWarning,
  quoteId,
  onLogFollowUp,
  onCopyLink,
  onViewQuote,
}: {
  open: boolean;
  onClose: () => void;
  recipient: string;
  versionLabel: string;
  sentAt?: string | Date | null;
  supersedeWarning?: string | null;
  quoteId?: string;
  onLogFollowUp?: () => void;
  onCopyLink?: () => void;
  onViewQuote?: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Quote Sent"
      titleLeading={<StatusDot tone="success" />}
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton onClick={() => onLogFollowUp?.()}>
            Log Follow Up Task
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={() => onCopyLink?.()}>
            Copy Link
          </DashboardToolbarButton>
          {quoteId ? (
            <Link href={`/crm/quotes/${quoteId}`}>
              <DashboardToolbarButton variant="primary" onClick={onClose}>
                View Quote
              </DashboardToolbarButton>
            </Link>
          ) : (
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onViewQuote?.();
                onClose();
              }}
            >
              View Quote
            </DashboardToolbarButton>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {supersedeWarning ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-[#8B6914]/60 bg-[#1C160C] px-3 py-2.5">
            <span className="mt-0.5 text-[#E8C07A]" aria-hidden>
              âš 
            </span>
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C07A]">
              {supersedeWarning}
            </p>
          </div>
        ) : null}
        <div className="space-y-2.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3">
          {[
            ["Recipient", recipient || "â€”"],
            ["Version Sent", versionLabel || "â€”"],
            ["Timestamp", fmtStamp(sentAt ?? new Date())],
          ].map(([label, valueText]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                {label}
              </span>
              <span className="max-w-[65%] truncate text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {valueText}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardModal>
  );
}

export function QuoteSendFailedModal({
  open,
  onClose,
  errorReason,
  onDownloadManual,
  onEditRecipient,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  errorReason: string;
  onDownloadManual?: () => void;
  onEditRecipient?: () => void;
  onRetry?: () => void;
}) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Quote Failed To Send"
      titleLeading={<StatusDot tone="error" />}
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton onClick={() => onDownloadManual?.()}>
            Download & Send Manually
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={() => onEditRecipient?.()}>
            Edit Recipient
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={() => onRetry?.()}>
            Retry
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-2">
        <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
          Error Reason
        </p>
        <div className="rounded-lg border border-[#5C1F1F] bg-[#1A1010] px-3.5 py-3">
          <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FF6B6B]">
            {errorReason ||
              "Delivery failed â€” the recipient's mail server rejected the message. Check the address and try again."}
          </p>
        </div>
      </div>
    </DashboardModal>
  );
}

export type MarkAcceptedPayload = {
  acceptedBy: string;
  dateAccepted: string;
  how: "EMAIL" | "VERBAL" | "SIGNED_PDF" | "CUSTOMER_PORTAL";
  reference: string;
  note: string;
};

export function MarkAsAcceptedModal({
  open,
  onClose,
  onConfirm,
  defaultAcceptedBy = "",
  defaultDate = "",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: MarkAcceptedPayload) => void | Promise<void>;
  defaultAcceptedBy?: string;
  defaultDate?: string;
}) {
  const [acceptedBy, setAcceptedBy] = React.useState(defaultAcceptedBy);
  const [dateAccepted, setDateAccepted] = React.useState(defaultDate);
  const [how, setHow] = React.useState<MarkAcceptedPayload["how"]>("EMAIL");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setAcceptedBy(defaultAcceptedBy);
    setDateAccepted(
      defaultDate ||
        new Date()
          .toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          .toUpperCase(),
    );
    setHow("EMAIL");
    setReference("");
    setNote("");
    setFileName(null);
    setFileSize(null);
    setSubmitting(false);
  }, [open, defaultAcceptedBy, defaultDate]);

  const howOptions: { id: MarkAcceptedPayload["how"]; label: string }[] = [
    { id: "EMAIL", label: "Email" },
    { id: "VERBAL", label: "Verbal" },
    { id: "SIGNED_PDF", label: "Signed Pdf" },
    { id: "CUSTOMER_PORTAL", label: "Customer Portal" },
  ];

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Mark As Accepted"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} label="Cancel" />
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !acceptedBy.trim()}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onConfirm?.({
                    acceptedBy: acceptedBy.trim(),
                    dateAccepted,
                    how,
                    reference: reference.trim(),
                    note: note.trim(),
                  });
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Mark As Accepted
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Accepted By"
          value={acceptedBy}
          onChange={(e) => setAcceptedBy(e.target.value)}
        />
        <DashboardTextField
          label="Date Accepted"
          value={dateAccepted}
          onChange={(e) => setDateAccepted(e.target.value)}
        />
        <div className="space-y-2">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            How
          </p>
          <div className="flex flex-wrap gap-2">
            {howOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setHow(opt.id)}
                className={`inline-flex h-8 items-center rounded-lg px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
                  how === opt.id
                    ? "bg-[#FDFDFF] text-[#121212]"
                    : "border border-[#2D2D30] bg-[#1A1A1A] text-[#959597] hover:text-[#FDFDFF]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <DashboardTextField
          label="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Optional â€” PO number or email subject"
        />
        <div className="space-y-2">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Attachment (Optional)
          </p>
          {fileName ? (
            <div className="flex items-center gap-3 rounded-lg bg-[#2A2A2A] px-3 py-2.5">
              <span className="text-[#959597]" aria-hidden>
                â–£
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[12px] uppercase text-[#FDFDFF]">
                  {fileName}
                </p>
                {fileSize ? (
                  <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                    {fileSize}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => {
                  setFileName(null);
                  setFileSize(null);
                }}
                className="text-[#959597] hover:text-[#FDFDFF]"
              >
                Ã—
              </button>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFileName(f.name);
              setFileSize(
                f.size < 1024 * 1024
                  ? `${Math.round(f.size / 1024)} KB`
                  : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
              );
              e.target.value = "";
            }}
          />
          <DashboardToolbarButton onClick={() => fileRef.current?.click()}>
            + Add Signed Copy
          </DashboardToolbarButton>
        </div>
        <DashboardTextField
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
        />
      </div>
    </DashboardModal>
  );
}

/** Fullscreen quote PDF-style preview overlay — matches Figma document layout. */
export function QuotePreviewOverlay({
  open,
  onClose,
  quoteNumber,
  createdAt,
  expiresAt,
  terms,
  amount,
  customerName,
  contactName,
  contactRole,
  billingAddress,
  companyAddress = "1450 Oilfield Rd, Midland, TX 79701",
  companyPhone = "(432) 555-0100 · darkhorsesafety.com",
  lineItems,
  onPrint,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  quoteNumber: string;
  createdAt?: string | null;
  expiresAt?: string | null;
  terms?: string | null;
  amount?: string | number | null;
  customerName?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  billingAddress?: string | null;
  companyAddress?: string;
  companyPhone?: string;
  lineItems: {
    id: string;
    item: string;
    quantity: string | number;
    rate: string | number;
    amount: string | number;
  }[];
  onPrint?: () => void;
  onDownload?: () => void;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  useScrollLock(open);

  React.useEffect(() => {
    if (!open) setMoreOpen(false);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const subtotal = lineItems.reduce((s, l) => s + Number(l.amount || 0), 0);
  const total = Number(amount) || subtotal;
  const previewTitle = `Quote-${quoteNumber.replace(/^Q-?/i, "")} · Preview`;
  const billAddress = formatPreviewAddress(billingAddress);
  const termsBody =
    terms?.trim() && !/^net\s*\d+/i.test(terms.trim())
      ? terms.trim()
      : "Quote valid for 30 days from the date above. Prices subject to change after expiry. Work scheduled upon signed acceptance.";
  const termsLabel = /^net\s*\d+/i.test(terms?.trim() ?? "")
    ? terms!.trim().toUpperCase()
    : "Net 30";

  const moneyFmt = (v: string | number | null | undefined) => {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  const cleanItem = (item: string) =>
    item
      .replace(/\s*[·•|\-–—]?\s*manual\s*override\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#0A0A0A]/95 backdrop-blur-[2px]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] bg-[#121212] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#FDFDFF] hover:bg-white/5"
          >
            <CloseXIcon />
          </button>
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-[#E5484D] text-[8px] font-[590] leading-none text-white">
            PDF
          </span>
          <p className="truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:text-[13px]">
            {previewTitle}
          </p>
        </div>
        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Print"
            onClick={() => onPrint?.()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] hover:bg-white/5"
          >
            <PrintIcon />
          </button>
          <button
            type="button"
            aria-label="Download"
            onClick={() => onDownload?.()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] hover:bg-white/5"
          >
            <DownloadIcon />
          </button>
          <button
            type="button"
            aria-label="More"
            onClick={() => setMoreOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] hover:bg-white/5"
          >
            <MoreDotsIcon />
          </button>
          {moreOpen ? (
            <div className="absolute top-full right-0 z-10 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-[#2D2D30] bg-[#1A1A1A] py-1 shadow-xl">
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-white/5"
                onClick={() => {
                  setMoreOpen(false);
                  onPrint?.();
                }}
              >
                Print
              </button>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-white/5"
                onClick={() => {
                  setMoreOpen(false);
                  onDownload?.();
                }}
              >
                Download Pdf
              </button>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-white/5"
                onClick={() => {
                  setMoreOpen(false);
                  onClose();
                }}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-10">
        <article className="mx-auto w-full max-w-[720px] rounded-xl border border-[#2D2D30] bg-[#161616] px-5 py-7 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-[280px]">
              <div className="flex items-center gap-2.5">
                <DarkHorseMark />
                <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Dark Horse Safety
                </p>
              </div>
              <p className="mt-3 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                {companyAddress}
              </p>
              <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                {companyPhone}
              </p>
            </div>
            <div className="text-right">
              <p className="font-sans text-[22px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[26px]">
                Quote
              </p>
              <p className="mt-2 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {quoteNumber}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {fmtShort(createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-[#2D2D30] pt-6">
            <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
              Bill To
            </p>
            <p className="mt-2 font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {customerName ?? "—"}
            </p>
            <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
              {[contactName, contactRole].filter(Boolean).join(" · ") || "—"}
            </p>
            {billAddress !== "—" ? (
              <p className="mt-1 whitespace-pre-line font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {billAddress}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[#2D2D30] py-4 sm:grid-cols-4">
            {[
              ["Quote #", quoteNumber],
              ["Date", fmtShort(createdAt)],
              ["Valid Until", fmtShort(expiresAt)],
              ["Terms", termsLabel],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  {label}
                </p>
                <p className="mt-1.5 truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <table className="mt-6 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#2D2D30]">
                <th className="pb-2.5 pr-3 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                  Item
                </th>
                <th className="w-14 pb-2.5 px-2 text-center font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                  Qty
                </th>
                <th className="w-[100px] pb-2.5 pl-2 text-right font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                  Rate
                </th>
                <th className="w-[110px] pb-2.5 pl-2 text-right font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-5 font-sans text-[12px] uppercase text-[#959597]"
                  >
                    No line items
                  </td>
                </tr>
              ) : (
                lineItems.map((line) => (
                  <tr
                    key={line.id}
                    className="border-b border-[#2D2D30]/60 last:border-b-0"
                  >
                    <td className="py-3 pr-3 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {cleanItem(line.item) || line.item}
                    </td>
                    <td className="px-2 py-3 text-center font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                      {line.quantity}
                    </td>
                    <td className="py-3 pl-2 text-right font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                      {moneyFmt(line.rate)}
                    </td>
                    <td className="py-3 pl-2 text-right font-sans text-[12px] font-[510] uppercase tabular-nums text-[#FDFDFF]">
                      {moneyFmt(line.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-5 flex justify-end border-t border-[#2D2D30] pt-4">
            <div className="w-full max-w-[220px] space-y-2">
              <div className="flex items-center justify-between gap-8 font-sans text-[11px] uppercase tracking-[-0.02em]">
                <span className="text-[#959597]">Subtotal</span>
                <span className="tabular-nums text-[#FDFDFF]">
                  {moneyFmt(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-8 font-sans text-[11px] uppercase tracking-[-0.02em]">
                <span className="text-[#959597]">Tax (0%)</span>
                <span className="tabular-nums text-[#FDFDFF]">{moneyFmt(0)}</span>
              </div>
              <div className="flex items-center justify-between gap-8 font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                <span>Total</span>
                <span className="tabular-nums">{moneyFmt(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#2D2D30] pt-5">
            <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
              Terms
            </p>
            <p className="mt-2.5 max-w-xl font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8]">
              {termsBody}
            </p>
            <p className="mt-8 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Thank you for the opportunity to serve {customerName ?? "you"}.
            </p>
          </div>
        </article>
      </div>
    </div>,
    document.body,
  );
}

function formatPreviewAddress(raw?: string | null) {
  if (!raw?.trim()) return "—";
  try {
    const parsed = JSON.parse(raw) as {
      street?: string;
      suite?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    if (parsed && typeof parsed === "object" && "street" in parsed) {
      const line1 = [parsed.street, parsed.suite].filter(Boolean).join(", ");
      const line2 = [parsed.city, parsed.state, parsed.zip]
        .filter(Boolean)
        .join(", ");
      return [line1, line2].filter(Boolean).join(", ") || "—";
    }
  } catch {
    /* plain */
  }
  return raw.trim();
}

function CloseXIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 8V4h10v4M7 16H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13h10v7H7v-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10m0 0l-4-4m4 4l4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreDotsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}

function DarkHorseMark() {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E5484D]"
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 18c2-6 4.5-10 8.5-12 1.5 2.5 2 5 1.5 8 2-.5 3.5-1 5-2-.5 4-2.5 7-6 9H5z"
          fill="#0D0D0D"
        />
        <path
          d="M9 8c1.2-.8 2.2-1 3.2-1"
          stroke="#FDFDFF"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
