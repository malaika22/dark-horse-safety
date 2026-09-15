"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  DashboardBadge,
  DashboardToolbarButton,
  useScrollLock,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmTask } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

function userShort(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
) {
  if (!user) return "—";
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  return (last || first || user.email || "—").toUpperCase();
}

function formatDueFull(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${date} · ${h12}${mm}${am ? "A" : "P"}`;
}

function overdueByLabel(iso?: string | null, displayStatus?: string) {
  if (!iso || displayStatus !== "OVERDUE") return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  const days = Math.max(
    1,
    Math.floor((Date.now() - due.getTime()) / 86_400_000),
  );
  return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
}

function formatCreatedFrom(task: CrmTask) {
  const sa = task.salesActivity;
  if (!sa) return null;
  const parts = [sa.activityCode];
  if (sa.type) parts.push(sa.type);
  if (sa.activityAt) {
    const d = new Date(sa.activityAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d
          .toLocaleDateString("en-US", { month: "short", day: "numeric" })
          .replace(",", ""),
      );
    }
  }
  return parts.join(" · ");
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#2D2D30] py-3 last:border-b-0">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <div className="min-w-0 max-w-[65%] text-right font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {children}
      </div>
    </div>
  );
}

export function TaskDetailsDrawer({
  open,
  taskId,
  onClose,
  onCompleted,
}: {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const [task, setTask] = React.useState<CrmTask | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  useScrollLock(open);

  React.useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getTask(taskId);
        if (!cancelled) setTask(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setTask(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const status = task?.displayStatus ?? task?.status ?? "OPEN";
  const overdueHint = overdueByLabel(task?.dueAt, status);
  const createdFrom = task ? formatCreatedFrom(task) : null;
  const quoteLabel = task?.quote
    ? `${task.quote.quoteNumber}${
        task.quote.revision != null ? ` (V${task.quote.revision})` : ""
      }`
    : "—";

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close task details backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Task Details
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 scrollbar-hidden">
          {loading && !task ? (
            <p className="py-8 font-sans text-[12px] uppercase text-[#959597]">
              Loading…
            </p>
          ) : !task ? (
            <p className="py-8 font-sans text-[12px] uppercase text-[#959597]">
              Task not found
            </p>
          ) : (
            <>
              <DetailRow label="Task ID">{task.code}</DetailRow>
              <DetailRow label="Title">{task.title}</DetailRow>
              <DetailRow label="Type">{task.taskType}</DetailRow>
              <DetailRow label="Status">
                <DashboardBadge
                  variant={status === "OVERDUE" ? "error" : status === "COMPLETE" ? "success" : "neutral"}
                  pill
                >
                  {status}
                </DashboardBadge>
              </DetailRow>
              <DetailRow label="Priority">
                <DashboardBadge
                  variant={
                    task.priority === "HIGH"
                      ? "error"
                      : task.priority === "LOW"
                        ? "neutral"
                        : "warning"
                  }
                  pill
                >
                  {task.priority}
                </DashboardBadge>
              </DetailRow>
              <DetailRow label="Customer">
                {task.customer?.name ?? "—"}
              </DetailRow>
              <DetailRow label="Assigned To">
                {userShort(task.assignee)}
              </DetailRow>
              <DetailRow label="Due">
                <div className="space-y-1">
                  <p>{formatDueFull(task.dueAt)}</p>
                  {overdueHint ? (
                    <p className="font-sans text-[10px] uppercase text-[#FF6B6B]">
                      {overdueHint}
                    </p>
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Linked Quote">
                <div className="space-y-1">
                  {task.quoteId ? (
                    <Link
                      href={`/crm/quotes/${task.quoteId}`}
                      className="text-[#7EB6FF] underline underline-offset-2"
                      onClick={onClose}
                    >
                      {quoteLabel}
                    </Link>
                  ) : (
                    quoteLabel
                  )}
                  {task.quote ? (
                    <p className="font-sans text-[9px] uppercase leading-snug text-[#959597]">
                      Pinned to V{task.quote.revision ?? 1}. If the quote is
                      revised, this task keeps referencing that version unless
                      re-pinned.
                    </p>
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Reminder">{task.reminder || "—"}</DetailRow>
              <DetailRow label="Created">
                {task.createdAt
                  ? new Date(task.createdAt)
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      .toUpperCase()
                  : "—"}
              </DetailRow>
              <DetailRow label="Created From">
                {task.salesActivityId && createdFrom ? (
                  <Link
                    href={`/crm/sales/${task.salesActivityId}`}
                    className="text-[#7EB6FF] underline underline-offset-2"
                    onClick={onClose}
                  >
                    {createdFrom}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              {task.notes ? (
                <div className="border-b border-[#2D2D30] py-3 last:border-b-0">
                  <p className="mb-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    Notes
                  </p>
                  <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                    {task.notes}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            {task ? (
              <Link href={`/crm/tasks/${task.id}`} onClick={onClose}>
                <DashboardToolbarButton>Edit</DashboardToolbarButton>
              </Link>
            ) : null}
            {task && status !== "COMPLETE" ? (
              <DashboardToolbarButton
                variant="primary"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      await crmApi.completeTask(task.id);
                      toastSuccess("Task completed");
                      onCompleted?.();
                      onClose();
                    } catch (err) {
                      toastApiError(err);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Mark Complete
              </DashboardToolbarButton>
            ) : null}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
