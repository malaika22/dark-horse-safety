"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi, type HrTimeOffReview } from "@/lib/hr-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l10 18H2L12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DenyTimeOffModal({
  open,
  requestId,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  requestId: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [review, setReview] = React.useState<HrTimeOffReview | null>(null);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;
    setLoading(true);
    setReason("");
    setReview(null);
    void (async () => {
      try {
        const res = await hrApi.reviewTimeOff(requestId);
        if (!cancelled) setReview(res.data);
      } catch (err) {
        if (!cancelled) {
          toastApiError(err);
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, requestId, onClose]);

  const req = review?.request;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Deny Time Off Request"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy || loading} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={busy || loading || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-white transition-opacity disabled:opacity-50"
          >
            Deny Request
          </button>
        </>
      }
    >
      {loading || !req ? (
        <div className="flex justify-center py-8">
          <BrandLoader />
        </div>
      ) : (
        <div className="space-y-5">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {review?.summary}
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Requested
              </p>
              <p className="mt-1 font-sans text-[16px] font-[510] uppercase text-[#FDFDFF]">
                {Number(req.hoursRequested).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Current Balance
              </p>
              <p className="mt-1 font-sans text-[16px] font-[510] uppercase text-[#FDFDFF]">
                {Number(review?.balance.current ?? 0).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Coverage
              </p>
              <p className="mt-1 font-sans text-[16px] font-[510] uppercase text-[#FDFDFF]">
                {req.coverage === "COVERED" ? "Covered" : "Needed"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
              Reason for Denial (Required)
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="EXPLAIN WHY THIS TIME OFF REQUEST IS BEING DENIED..."
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
            />
          </div>
        </div>
      )}
    </DashboardModal>
  );
}

export function ApproveTimeOffModal({
  open,
  requestId,
  busy,
  onClose,
  onConfirm,
  onDeny,
}: {
  open: boolean;
  requestId: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (adminNote: string) => void;
  onDeny?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [review, setReview] = React.useState<HrTimeOffReview | null>(null);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;
    setLoading(true);
    setNote("");
    setReview(null);
    void (async () => {
      try {
        const res = await hrApi.reviewTimeOff(requestId);
        if (!cancelled) setReview(res.data);
      } catch (err) {
        if (!cancelled) {
          toastApiError(err);
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, requestId, onClose]);

  const conflicts = review?.conflictCount ?? 0;
  const approveLabel =
    conflicts > 0 ? "Approve Anyway" : "Approve Request";

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Approve Time Off Request"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton disabled={busy || loading} onClick={onClose}>
            Cancel
          </DashboardToolbarButton>
          {onDeny ? (
            <DashboardToolbarButton
              disabled={busy || loading}
              onClick={onDeny}
            >
              Deny
            </DashboardToolbarButton>
          ) : null}
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || loading || !review}
            onClick={() => onConfirm(note.trim())}
          >
            {approveLabel}
          </DashboardToolbarButton>
        </>
      }
    >
      {loading || !review ? (
        <div className="flex justify-center py-8">
          <BrandLoader />
        </div>
      ) : (
        <div className="space-y-5">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {review.summary}
          </p>

          {conflicts > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-[#7F1D1D] bg-[#2A1212] px-3 py-3 text-[#F87171]">
              <span className="mt-0.5 shrink-0">
                <WarningIcon />
              </span>
              <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]">
                {conflicts} conflict{conflicts === 1 ? "" : "s"} found — review
                before approving
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
              Coverage Check
            </p>
            {review.coverageChecks.length === 0 ? (
              <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
                <p className="font-sans text-[11px] uppercase text-[#34D399]">
                  No coverage conflicts detected
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {review.coverageChecks.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        {c.label}
                      </p>
                      <p className="mt-1 font-sans text-[11px] uppercase leading-snug text-[#FDFDFF]">
                        {c.detail}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 font-sans text-[9px] font-[510] uppercase",
                        c.tone === "danger"
                          ? "border-[#7F1D1D] text-[#F87171]"
                          : "border-[#854D0E] text-[#FBBF24]",
                      )}
                    >
                      {c.kind}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
              Balance Validation
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
                <div>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Current Balance
                  </p>
                  <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
                    {Number(review.balance.current).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Requested
                  </p>
                  <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
                    {Number(review.balance.requested).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Balance After
                  </p>
                  <p className="mt-1 font-sans text-[14px] font-[510] uppercase text-[#FDFDFF]">
                    {Number(review.balance.after).toFixed(1)}h
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-sans text-[9px] font-[510] uppercase",
                  review.balance.status === "SUFFICIENT"
                    ? "border-[#065F46] text-[#34D399]"
                    : "border-[#7F1D1D] text-[#F87171]",
                )}
              >
                {review.balance.status}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
              Admin Note (Optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="E.G. COORDINATED BACKUP COVERAGE WITH SUPERVISOR..."
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
            />
          </div>
        </div>
      )}
    </DashboardModal>
  );
}
