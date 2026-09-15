"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmTask } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { TaskDetailsDrawer } from "@/features/crm/task-details-drawer";

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

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const [task, setTask] = React.useState<CrmTask | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await crmApi.getTask(taskId);
        if (!cancelled) setTask(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setTask(null);
          setError(err instanceof Error ? err.message : "Couldn't load task");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, reloadKey]);

  useSetHeaderBreadcrumb(
    task?.code ? `CRM / Sales / Tasks / ${task.code}` : "CRM / Sales / Tasks",
  );

  useSetHeaderActions(
    task ? (
      <>
        <DashboardToolbarButton onClick={() => setDrawerOpen(true)}>
          Details
        </DashboardToolbarButton>
        {task.salesActivityId ? (
          <Link href={`/crm/sales/${task.salesActivityId}`}>
            <DashboardToolbarButton>View Activity</DashboardToolbarButton>
          </Link>
        ) : null}
        {task.displayStatus !== "COMPLETE" && task.status !== "COMPLETE" ? (
          <DashboardToolbarButton
            variant="primary"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await crmApi.completeTask(taskId);
                  toastSuccess("Task completed");
                  setReloadKey((k) => k + 1);
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
      </>
    ) : null,
    [task, taskId, busy],
  );

  if (loading || !task || error) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={error}
        missing={!loading && !task && !error}
        missingTitle="Task Not Found"
        missingDescription="This task could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  const status = task.displayStatus ?? task.status;
  const overdueHint = overdueByLabel(task.dueAt, status);
  const quoteLabel = task.quote
    ? `${task.quote.quoteNumber}${
        task.quote.revision != null ? ` (V${task.quote.revision})` : ""
      }`
    : "—";

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardBadge
          variant={
            status === "OVERDUE"
              ? "error"
              : status === "COMPLETE"
                ? "success"
                : "neutral"
          }
          pill
        >
          {status}
        </DashboardBadge>
        <span className="font-sans text-[11px] uppercase text-[#959597]">
          {task.code} · {task.taskType} · {task.priority}
        </span>
      </div>

      <DashboardPanel className="overflow-hidden p-4 sm:p-5">
        <h1 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {task.title}
        </h1>
        <div className="mt-5 space-y-0">
          {(
            [
              ["Task ID", task.code],
              ["Type", task.taskType],
              ["Customer", task.customer?.name || "—"],
              ["Assigned To", userShort(task.assignee)],
              ["Due", formatDueFull(task.dueAt)],
              ["Linked Quote", quoteLabel],
              ["Reminder", task.reminder || "—"],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 border-b border-divider py-3 last:border-b-0"
            >
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                {label}
              </p>
              <div className="max-w-[65%] text-right">
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                  {value}
                </p>
                {label === "Due" && overdueHint ? (
                  <p className="mt-1 font-sans text-[10px] uppercase text-[#FF6B6B]">
                    {overdueHint}
                  </p>
                ) : null}
                {label === "Linked Quote" && task.quote ? (
                  <p className="mt-1 font-sans text-[9px] uppercase leading-snug text-[#959597]">
                    Pinned to V{task.quote.revision ?? 1}. If the quote is
                    revised, this task keeps referencing that version unless
                    re-pinned.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {task.notes ? (
          <div className="mt-5">
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Notes
            </p>
            <p className="mt-1.5 font-sans text-[12px] uppercase leading-relaxed text-[#FDFDFF]">
              {task.notes}
            </p>
          </div>
        ) : null}
        {task.attachmentUrl ? (
          <div className="mt-5">
            <a
              href={task.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="font-sans text-[12px] uppercase text-[#FDFDFF] underline"
            >
              {task.attachmentFileName || "Attachment"}
            </a>
          </div>
        ) : null}
        {task.salesActivityId ? (
          <div className="mt-5">
            <p className="font-sans text-[10px] uppercase text-[#959597]">
              Created From
            </p>
            <Link
              href={`/crm/sales/${task.salesActivityId}`}
              className="mt-1.5 inline-block font-sans text-[12px] uppercase text-[#7EB6FF] underline underline-offset-2"
            >
              {task.salesActivity?.activityCode ?? "Sales Activity"}
              {task.salesActivity?.type
                ? ` · ${task.salesActivity.type}`
                : ""}
            </Link>
          </div>
        ) : null}
      </DashboardPanel>

      <TaskDetailsDrawer
        open={drawerOpen}
        taskId={taskId}
        onClose={() => setDrawerOpen(false)}
        onCompleted={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
