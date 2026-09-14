"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardModal,
  DashboardToolbarButton,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmExpense } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateLong(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function formatCapturedAt(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    })
    .toUpperCase();
  return `${date} ${time}`;
}

function formatFileSize(bytes?: number | null) {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function submittedByLabel(rep?: CrmExpense["rep"]) {
  if (!rep) return "—";
  const first = (rep.firstName ?? "").trim();
  const last = (rep.lastName ?? "").trim();
  if (first && last) {
    return `${first.charAt(0).toUpperCase()}. ${last.toUpperCase()}`;
  }
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (name) return name.toUpperCase();
  return (rep.email ?? "—").toUpperCase();
}

function reimbursableLabel(expense: CrmExpense) {
  if (expense.reimbursable) return "YES · PERSONAL";
  return "NO · COMPANY CARD";
}

function statusMeta(status: string): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const key = status.toUpperCase().replace(/\s+/g, "_");
  switch (key) {
    case "DRAFT":
      return { label: "DRAFT", variant: "neutral" };
    case "APPROVED":
      return { label: "APPROVED", variant: "success" };
    case "PENDING":
      return { label: "PENDING", variant: "gold" };
    case "UNMATCHED":
      return { label: "UNMATCHED", variant: "billing" };
    case "MISSING_RECEIPT":
      return { label: "MISSING RECEIPT", variant: "error" };
    case "NEEDS_REVIEW":
      return { label: "NEEDS REVIEW", variant: "review" };
    default:
      return {
        label: status.replace(/_/g, " ").toUpperCase(),
        variant: "neutral",
      };
  }
}

function receiptMetaLine(expense: CrmExpense) {
  const parts: string[] = [];
  const name = expense.receiptFileName?.trim();
  const size = formatFileSize(expense.receiptFileSizeBytes);
  if (name && size) parts.push(`${name} · ${size}`);
  else if (name) parts.push(name);
  else if (size) parts.push(size);
  return parts[0] ?? null;
}

function receiptCaptureLine(expense: CrmExpense) {
  const method = (expense.receiptCaptureMethod ?? "").trim().toUpperCase();
  const hasGps =
    expense.receiptLat != null &&
    expense.receiptLng != null &&
    Number.isFinite(expense.receiptLat) &&
    Number.isFinite(expense.receiptLng);
  const captured = formatCapturedAt(expense.receiptCapturedAt);
  const chunks: string[] = [];

  if (method === "CAMERA_DIRECT" || method.includes("CAMERA")) {
    chunks.push("CAPTURED ON MOBILE — CAMERA DIRECT.");
  } else if (method) {
    chunks.push(method.endsWith(".") ? method : `${method}.`);
  } else if (expense.receiptUrl || expense.receiptFileName) {
    chunks.push("RECEIPT ON FILE.");
  }

  if (hasGps) {
    chunks.push(
      `GPS ${Number(expense.receiptLat).toFixed(4)}, ${Number(expense.receiptLng).toFixed(4)}${captured ? ` · ${captured}` : ""}.`,
    );
  } else if (captured) {
    chunks.push(`${captured}.`);
  }

  if (method === "CAMERA_DIRECT" || method.includes("CAMERA")) {
    chunks.push(
      "CAMERA-ROLL UPLOADS ARE NOT ACCEPTED, MATCHING THE REQUIRED-FORM PHOTO CAPTURE PATTERN.",
    );
  }

  return chunks.length ? chunks.join(" ") : null;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <div className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {children}
      </div>
    </div>
  );
}

function ReceiptPlaceholderIcon() {
  return (
    <svg
      width="64"
      height="80"
      viewBox="0 0 64 80"
      fill="none"
      aria-hidden
      className="text-[#5A5A5E]"
    >
      <path
        d="M10 4h34l10 10v58a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M44 4v10h10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 28h32M16 36h24M16 44h28M16 52h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Expense Details modal — Figma layout + live GET / approve / flag.
 */
export function ExpenseDetailsModal({
  open,
  expenseId,
  onClose,
  onUpdated,
}: {
  open: boolean;
  expenseId: string | null;
  onClose: () => void;
  onUpdated?: (expense: CrmExpense) => void;
}) {
  const [expense, setExpense] = React.useState<CrmExpense | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<"approve" | "flag" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.getExpense(id);
      setExpense(res.data);
    } catch (err) {
      toastApiError(err);
      setError(err instanceof Error ? err.message : "Failed to load expense");
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open || !expenseId) {
      setExpense(null);
      setError(null);
      setBusy(null);
      return;
    }
    void load(expenseId);
  }, [open, expenseId, load]);

  async function handleApprove() {
    if (!expense) return;
    setBusy("approve");
    try {
      const res = await crmApi.approveExpense(expense.id);
      setExpense(res.data);
      onUpdated?.(res.data);
      toastSuccess("Expense approved");
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(null);
    }
  }

  async function handleFlag() {
    if (!expense) return;
    setBusy("flag");
    try {
      const res = await crmApi.flagExpenseForReview(expense.id);
      setExpense(res.data);
      onUpdated?.(res.data);
      toastSuccess("Flagged for review");
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(null);
    }
  }

  const status = expense ? statusMeta(expense.status) : null;
  const fileLine = expense ? receiptMetaLine(expense) : null;
  const captureLine = expense ? receiptCaptureLine(expense) : null;
  const canAct =
    expense &&
    expense.status.toUpperCase() !== "APPROVED" &&
    busy === null;
  const canFlag =
    canAct && expense.status.toUpperCase() !== "NEEDS_REVIEW";

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Expense Details"
      widthClassName="max-w-[920px]"
      footer={
        expense ? (
          <div className="flex w-full flex-col gap-4">
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
              Flag for review sends this expense to a manager for a closer look
              and pauses approval until it&apos;s resolved.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DashboardToolbarButton onClick={onClose}>
                Close
              </DashboardToolbarButton>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardToolbarButton
                  disabled={!canFlag || busy === "approve"}
                  onClick={() => void handleFlag()}
                >
                  {busy === "flag" ? "Flagging…" : "Flag for Review"}
                </DashboardToolbarButton>
                <DashboardToolbarButton
                  variant="primary"
                  disabled={!canAct || busy === "flag"}
                  onClick={() => void handleApprove()}
                >
                  {busy === "approve" ? "Approving…" : "Approve"}
                </DashboardToolbarButton>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <BrandLoader />
        </div>
      ) : error ? (
        <div className="space-y-3 py-8 text-center">
          <p className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FF6B6B]">
            {error}
          </p>
          {expenseId ? (
            <DashboardToolbarButton onClick={() => void load(expenseId)}>
              Retry
            </DashboardToolbarButton>
          ) : null}
        </div>
      ) : expense ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            <div className="flex aspect-[4/5] max-h-[420px] items-center justify-center overflow-hidden rounded-xl bg-[#1A1A1A]">
              {expense.receiptUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ReceiptPlaceholderIcon />
              )}
            </div>
            {(fileLine || captureLine) && (
              <div className="space-y-1.5">
                {fileLine ? (
                  <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {fileLine}
                  </p>
                ) : null}
                {captureLine ? (
                  <p className="font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
                    {captureLine}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <DetailRow label="Expense ID">{expense.code}</DetailRow>
            <DetailRow label="Merchant">{expense.merchant || "—"}</DetailRow>
            <DetailRow label="Category">{expense.category || "—"}</DetailRow>
            <DetailRow label="Amount">
              {formatMoney(Number(expense.amount) || 0)}
            </DetailRow>
            <DetailRow label="Date">{formatDateLong(expense.expenseDate)}</DetailRow>
            <DetailRow label="Method">
              {expense.paymentMethod || "—"}
            </DetailRow>
            <DetailRow label="Job">
              {expense.location?.name ?? "—"}
            </DetailRow>
            <DetailRow label="Status">
              {status ? (
                <DashboardBadge variant={status.variant} pill>
                  {status.label}
                </DashboardBadge>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Submitted By">
              {submittedByLabel(expense.rep)}
            </DetailRow>
            <DetailRow label="Reimbursable">
              {reimbursableLabel(expense)}
            </DetailRow>
            {expense.noReceipt || expense.missingReceiptReason ? (
              <DetailRow label="Missing Receipt Reason">
                <span className="block whitespace-pre-wrap normal-case tracking-[-0.01em]">
                  {(expense.missingReceiptReason || "—").toUpperCase()}
                </span>
              </DetailRow>
            ) : null}
            <DetailRow label="Notes">
              <span className="block whitespace-pre-wrap normal-case tracking-[-0.01em]">
                {(expense.notes || "—").toUpperCase()}
              </span>
            </DetailRow>
          </div>
        </div>
      ) : null}
    </DashboardModal>
  );
}
