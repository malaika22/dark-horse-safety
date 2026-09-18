"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrOffboarding,
  type HrOffboardingTask,
  type HrTerminationPreview,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

function formatDue(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function money(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (s === "COMPLETE")
    return "bg-[#16351F] text-[#4ADE80]";
  if (s === "BLOCKED")
    return "bg-[#3B1515] text-[#FF6B6B]";
  return "bg-[#2A2A2A] text-[#959597]";
}

function cycleTaskStatus(status: string): HrOffboardingTask["status"] {
  const s = status.toUpperCase();
  if (s === "PENDING") return "COMPLETE";
  if (s === "COMPLETE") return "BLOCKED";
  return "PENDING";
}

export function OffboardingChecklistModal({
  open,
  employeeId,
  onClose,
  onProceed,
  onSaved,
}: {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
  onProceed: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<HrOffboarding | null>(null);
  const [lastDay, setLastDay] = React.useState("");

  React.useEffect(() => {
    if (!open || !employeeId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        let res: { data: HrOffboarding };
        try {
          res = await hrApi.getOffboarding(employeeId);
        } catch {
          res = await hrApi.startOffboarding(employeeId);
        }
        if (cancelled) return;
        setData(res.data);
        setLastDay("");
      } catch (err) {
        toastApiError(err);
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, employeeId, onClose]);

  async function save(closeAfter: boolean) {
    if (!employeeId || !data) return;
    setSaving(true);
    try {
      const res = await hrApi.updateOffboarding(employeeId, {
        lastDay,
        tasks: data.tasks.map((t) => ({ id: t.id, status: t.status })),
      });
      setData(res.data);
      setLastDay(res.data.lastDay);
      toastSuccess("Offboarding saved");
      onSaved?.();
      if (closeAfter) onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  function toggleTask(taskId: string) {
    setData((prev) => {
      if (!prev) return prev;
      const tasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: cycleTaskStatus(t.status) } : t,
      );
      const complete = tasks.filter((t) => t.status === "COMPLETE").length;
      const categories = prev.categories.map((c) => {
        const items = tasks.filter((t) => t.category === c.category);
        return {
          ...c,
          tasks: items,
          complete: items.filter((t) => t.status === "COMPLETE").length,
          total: items.length,
        };
      });
      return {
        ...prev,
        tasks,
        categories,
        progress: { complete, total: tasks.length },
      };
    });
  }

  const pct =
    data && data.progress.total > 0
      ? Math.round((data.progress.complete / data.progress.total) * 100)
      : 0;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Offboarding Checklist"
      widthClassName="max-w-2xl"
      footer={
        <>
          <DashboardToolbarButton
            disabled={saving || loading}
            onClick={() => void save(true)}
          >
            Save & Close
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={saving || loading || !data}
            onClick={() => {
              void (async () => {
                await save(false);
                onProceed();
              })();
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-white transition-opacity disabled:opacity-50"
          >
            Proceed to Termination
          </button>
        </>
      }
    >
      {loading || !data ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Loading checklist…
        </p>
      ) : (
        <div className="space-y-5">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {data.name} · {data.roleTitle}
          </p>

          <label className="block max-w-[200px]">
            <span className="mb-1 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
              Last Day
            </span>
            <input
              type="date"
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
              className="h-9 w-full rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] text-[#FDFDFF] outline-none"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Offboarding Progress
              </span>
              <span className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {data.progress.complete} of {data.progress.total} Complete
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full bg-[#3B82F6] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="max-h-[48vh] space-y-5 overflow-y-auto pr-1 scrollbar-hidden">
            {data.categories.map((cat) => (
              <div key={cat.category}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {cat.category}
                  </span>
                  <span className="font-sans text-[10px] uppercase text-[#959597]">
                    {cat.complete} of {cat.total}
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-[#1C1C1E] px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {task.label}
                      </span>
                      {task.blocking ? (
                        <span className="rounded bg-[#7F1D1D] px-1.5 py-0.5 font-sans text-[9px] font-[590] uppercase tracking-wide text-white">
                          Blocking
                        </span>
                      ) : null}
                      <span className="font-sans text-[10px] uppercase text-[#959597]">
                        Due {formatDue(task.dueDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-sans text-[10px] font-[510] uppercase",
                          statusPill(task.status),
                        )}
                      >
                        {task.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardModal>
  );
}

export function TerminationConfirmModal({
  open,
  employeeId,
  onClose,
  onBackToChecklist,
  onTerminated,
}: {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
  onBackToChecklist: () => void;
  onTerminated?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<HrTerminationPreview | null>(null);

  React.useEffect(() => {
    if (!open || !employeeId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await hrApi.terminationPreview(employeeId);
        if (!cancelled) setData(res.data);
      } catch (err) {
        toastApiError(err);
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, employeeId, onClose]);

  async function complete() {
    if (!employeeId) return;
    setBusy(true);
    try {
      await hrApi.terminateEmployee(employeeId);
      toastSuccess("Termination completed");
      onTerminated?.();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const termLabel = data?.lastDay
    ? formatDue(data.lastDay)
    : "—";

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Employee Termination Confirmation"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton
            disabled={busy}
            onClick={() => {
              onClose();
              onBackToChecklist();
            }}
          >
            Return to Checklist
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={busy || loading || !data}
            onClick={() => void complete()}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-white transition-opacity disabled:opacity-50"
          >
            Complete Termination
          </button>
        </>
      }
    >
      {loading || !data ? (
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Loading…
        </p>
      ) : (
        <div className="space-y-5">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {data.name} · {data.roleTitle} · Term Date: {termLabel}
          </p>

          <div className="rounded-lg border border-[#7F1D1D]/70 bg-[#2A1212] px-4 py-3">
            <p className="mb-2 font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-[#FF6B6B]">
              This Action Cannot Be Undone
            </p>
            <ul className="space-y-1">
              {data.warnings.map((w) => (
                <li
                  key={w}
                  className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#D4D4D8]"
                >
                  • {w}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
              Outstanding Items
            </p>
            <div className="space-y-2">
              {data.outstandingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-[#1C1C1E] px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-sans text-[9px] font-[590] uppercase",
                      item.badgeTone === "error"
                        ? "bg-[#3B1515] text-[#FF6B6B]"
                        : item.badgeTone === "pending"
                          ? "bg-[#3A2A12] text-[#E8C47C]"
                          : "bg-[#3A2E12] text-[#E8C47C]",
                    )}
                  >
                    {item.badge}
                  </span>
                  <span className="min-w-[72px] text-right font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                    {money(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#2D2D30] pt-3">
            <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Total Outstanding Liability
            </span>
            <span className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">
              {money(data.totalLiability)}
            </span>
          </div>
        </div>
      )}
    </DashboardModal>
  );
}
