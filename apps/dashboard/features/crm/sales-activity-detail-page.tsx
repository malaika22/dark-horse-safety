"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardField,
  DashboardModal,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmSalesActivity, type CrmTask } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { NewExpenseModal } from "@/features/crm/new-expense-modal";
import {
  CreateTaskModal,
  TaskCreatedSuccessModal,
  type CreateTaskFormPayload,
} from "@/features/crm/create-task-modals";
import { TaskDetailsDrawer } from "@/features/crm/task-details-drawer";

function shortName(full?: string | null) {
  if (!full?.trim()) return "—";
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.toUpperCase();
  return `${parts[0]!.charAt(0)}. ${parts[parts.length - 1]}`.toUpperCase();
}

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

function formatActivityWhen(iso: string, sep: "," | "·" = ",") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${date}${sep === "·" ? " · " : ", "}${h12}${mm}${am ? "A" : "P"}`;
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatTaskDue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  const hasTime = !(h === 0 && m === 0);
  return hasTime
    ? `Due ${date}, ${h12}${mm}${am ? "a" : "p"}`
    : `Due ${date}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function outcomeVariant(outcome?: string | null) {
  const u = (outcome ?? "").toUpperCase();
  if (u.includes("POSITIVE") || u.includes("WON")) return "success" as const;
  if (u.includes("NO ANSWER") || u.includes("CALLBACK") || u.includes("NEUTRAL"))
    return "warning" as const;
  if (u.includes("NEGATIVE") || u.includes("LOST")) return "error" as const;
  return "neutral" as const;
}

function statusVariant(status?: string | null) {
  const u = (status ?? "").toUpperCase();
  if (u.includes("OVERDUE")) return "error" as const;
  if (u.includes("OPEN") || u.includes("COMPLETE") || u.includes("ACTIVE"))
    return "success" as const;
  if (u.includes("PENDING") || u.includes("DRAFT") || u.includes("SENT"))
    return "gold" as const;
  return "neutral" as const;
}

function DetailPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
        {label}
      </p>
      <div className="mt-1.5 font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
        {value}
      </div>
    </div>
  );
}

function RowKV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-divider py-3 last:border-b-0">
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <div className="min-w-0 text-right font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 5a2 2 0 012-2h2a2 2 0 012 2v1H9V5z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 14l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type FollowUpPayload = {
  followUpDate: string;
  notes: string;
  createFollowUp: boolean;
};

export function LogFollowUpModal({
  open,
  onClose,
  onConfirm,
  clientName,
  activityLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: FollowUpPayload) => void | Promise<void>;
  clientName?: string;
  activityLabel?: string;
}) {
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [createFollowUp, setCreateFollowUp] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFollowUpDate("");
    setNotes("");
    setCreateFollowUp(false);
    setSubmitting(false);
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Log Follow-up"
      widthClassName="max-w-xl"
      footer={
        <>
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !followUpDate}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onConfirm?.({
                    followUpDate,
                    notes,
                    createFollowUp,
                  });
                  onClose();
                } catch {
                  /* toast handled by caller */
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Save Follow-up
          </DashboardToolbarButton>
        </>
      }
    >
      {(clientName || activityLabel) && (
        <p className="mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {clientName || "—"}
          {activityLabel ? ` · ${activityLabel}` : ""}
        </p>
      )}
      <div className="space-y-4">
        <DashboardToggle
          label="Create Follow-up Task"
          checked={createFollowUp}
          onCheckedChange={setCreateFollowUp}
        />
        <DashboardField label="Follow-up Date">
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
          />
        </DashboardField>
        <DashboardTextField
          label="Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </DashboardModal>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function SalesActivityDetailPage({ activityId }: { activityId: string }) {
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskBusy, setTaskBusy] = React.useState(false);
  const [createdTask, setCreatedTask] = React.useState<CrmTask | null>(null);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [taskDrawerId, setTaskDrawerId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CrmSalesActivity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [newNote, setNewNote] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);
  const [reps, setReps] = React.useState<{ value: string; label: string }[]>(
    [],
  );

  async function reload() {
    const res = await crmApi.getSalesActivity(activityId);
    setDetail(res.data);
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [res, repsRes] = await Promise.all([
          crmApi.getSalesActivity(activityId),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        setDetail(res.data);
        setReps(
          repsRes.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ") ||
              r.email ||
              r.id,
          })),
        );
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setDetail(null);
          setLoadError(
            err instanceof Error ? err.message : "Couldn't load activity",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, reloadKey]);

  async function handleFollowUpConfirm(payload: FollowUpPayload) {
    const followUpAt = payload.followUpDate
      ? new Date(`${payload.followUpDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    try {
      await crmApi.followUpSalesActivity(activityId, {
        followUpAt,
        notes: payload.notes.trim() || undefined,
      });
      if (payload.createFollowUp && detail) {
        const related = [
          detail.customer?.name,
          detail.activityCode,
          detail.linkedQuote?.quoteNumber,
        ]
          .filter(Boolean)
          .join(" · ");
        await crmApi.createTask({
          taskType: "FOLLOW-UP",
          title: payload.notes.trim() || detail.subject || "Follow-up",
          dueAt: followUpAt,
          notes: payload.notes.trim() || undefined,
          relatedLabel: related,
          salesActivityId: activityId,
          customerId: detail.customer?.id ?? detail.customerId,
          quoteId: detail.linkedQuote?.id ?? detail.linkedQuoteId,
          assigneeId: detail.rep?.id ?? detail.repId,
        });
      }
      toastSuccess("Follow-up logged");
      await reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleAddNote() {
    if (!detail || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const stamp = formatShortDate(new Date().toISOString());
      const author = userShort(detail.rep);
      const merged = detail.notes?.trim()
        ? `${detail.notes.trim()}\n\n[${stamp} · ${author}] ${newNote.trim()}`
        : `[${stamp} · ${author}] ${newNote.trim()}`;
      await crmApi.updateSalesActivity(activityId, { notes: merged });
      toastSuccess("Note added");
      setNewNote("");
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleCreateTask(payload: CreateTaskFormPayload) {
    setTaskBusy(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentFileName: string | undefined;
      if (payload.file) {
        if (payload.file.size > 10 * 1024 * 1024) {
          toastApiError("File must be 10MB or smaller");
          return;
        }
        const contentBase64 = await fileToBase64(payload.file);
        const uploaded = await crmApi.uploadFile({
          folder: "tasks",
          fileName: payload.file.name,
          mimeType: payload.file.type || undefined,
          contentBase64,
        });
        attachmentUrl = uploaded.data.url;
        attachmentFileName = uploaded.data.fileName;
      }
      const dueAt = new Date(
        `${payload.dueDate}T${payload.dueTime || "10:00"}:00`,
      ).toISOString();
      const created = await crmApi.createTask({
        taskType: payload.taskType,
        title: payload.notes.trim() || payload.taskType,
        priority: payload.priority,
        dueAt,
        reminder: payload.reminder,
        notes: payload.notes,
        relatedLabel: payload.relatedTo,
        attachmentUrl,
        attachmentFileName,
        salesActivityId: activityId,
        customerId: detail?.customer?.id ?? detail?.customerId,
        quoteId: detail?.linkedQuote?.id ?? detail?.linkedQuoteId,
        assigneeId: payload.assignedTo || detail?.rep?.id,
      });
      setCreatedTask(created.data);
      setTaskOpen(false);
      setSuccessOpen(true);
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setTaskBusy(false);
    }
  }

  useSetHeaderBreadcrumb(
    detail?.activityCode
      ? `CRM / Sales / Sales Activity / ${detail.activityCode}`
      : "CRM / Sales / Sales Activity",
  );

  useSetHeaderActions(null, [activityId]);

  if (loading || !detail || loadError) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={loadError}
        missing={!loading && !detail && !loadError}
        missingTitle="Activity Not Found"
        missingDescription="This sales activity could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  const whenLabel = formatActivityWhen(detail.activityAt, ",");
  const dateFieldLabel = formatActivityWhen(detail.activityAt, "·");
  const statusLabel =
    detail.status === "COMPLETE" || detail.status === "OPEN"
      ? "OPEN"
      : detail.status.replace(/_/g, " ");
  const nextAction =
    detail.nextAction?.trim() ||
    (detail.subject?.toUpperCase().includes("QUOTE")
      ? "Send revised quote"
      : detail.followUpAt
        ? "Complete follow-up"
        : "—");
  const quote = detail.linkedQuote;
  const tasks = detail.tasks ?? [];
  const expenses = detail.expenses ?? [];
  const relatedLabel = [
    detail.customer?.name,
    detail.activityCode,
    quote?.quoteNumber,
  ]
    .filter(Boolean)
    .join(" · ");
  const customerId = detail.customer?.id || detail.customerId;
  const quoteBlurb =
    quote?.notes?.trim() ||
    quote?.terms?.trim() ||
    (quote ? "Linked quote" : "");

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2.5">
          <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
            Sales Activity · {detail.activityCode}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge
              variant={
                statusLabel === "OPEN"
                  ? "success"
                  : statusVariant(detail.status)
              }
              pill
            >
              {statusLabel}
            </DashboardBadge>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {detail.activityCode} · {detail.type} · {whenLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/crm/sales/${activityId}/edit`}>
            <DashboardToolbarButton>Edit</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<TaskIcon />}
            onClick={() => setTaskOpen(true)}
          >
            Create Task
          </DashboardToolbarButton>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <DashboardPanel className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Activity Details
              </p>
              <Link
                href={`/crm/sales/${activityId}/edit`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
                aria-label="Edit activity"
              >
                <PencilIcon />
              </Link>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-5 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[12px] font-[510] text-[#FDFDFF]">
                  {(detail.customer?.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                    {detail.customer?.name ?? "—"}
                  </p>
                  <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {detail.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <DetailPair
                  label="Contact"
                  value={shortName(detail.contact?.fullName)}
                />
                <DetailPair label="Rep" value={userShort(detail.rep)} />
                <DetailPair label="Date" value={dateFieldLabel} />
                <DetailPair
                  label="Duration"
                  value={(detail.duration ?? "—").toUpperCase()}
                />
                <DetailPair
                  label="Subject"
                  value={(detail.subject ?? "—").toUpperCase()}
                />
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Outcome & Next Steps
              </p>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="px-4 sm:px-5">
              <RowKV
                label="Outcome"
                value={
                  detail.outcome ? (
                    <DashboardBadge
                      variant={outcomeVariant(detail.outcome)}
                      pill
                    >
                      {detail.outcome}
                    </DashboardBadge>
                  ) : (
                    "—"
                  )
                }
              />
              <RowKV
                label="Follow-up"
                value={formatShortDate(detail.followUpAt)}
              />
              <RowKV label="Next Action" value={nextAction} />
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Tasks From This Activity · {tasks.length}
              </p>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="divide-y divide-divider">
              {tasks.length === 0 ? (
                <p className="px-4 py-4 font-sans text-[12px] uppercase text-[#959597] sm:px-5">
                  No tasks yet
                </p>
              ) : (
                tasks.map((t) => {
                  const st = (t.displayStatus ?? t.status).toUpperCase();
                  const due = formatTaskDue(t.dueAt);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTaskDrawerId(t.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-80 sm:px-5"
                    >
                      <p className="min-w-0 truncate font-sans text-[12px] tracking-[-0.02em] text-[#7EB6FF] underline underline-offset-2">
                        <span className="uppercase">{t.code}</span>
                        {" · "}
                        {t.title}
                        {due ? ` · ${due}` : ""}
                      </p>
                      <DashboardBadge
                        variant={st === "OVERDUE" ? "error" : statusVariant(st)}
                        pill
                      >
                        {st}
                      </DashboardBadge>
                    </button>
                  );
                })
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <DashboardPanelTitle icon="lightning" title="Customer Notes" />
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-5 p-4 sm:p-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    Previous Note
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {userShort(detail.rep)}
                    </p>
                    <p className="font-sans text-[11px] uppercase tabular-nums tracking-[-0.02em] text-[#959597]">
                      {formatShortDate(detail.activityAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                  {detail.notes?.trim() || "No notes yet."}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  Add Note
                </p>
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note"
                  disabled={savingNote}
                  className="mt-2 h-10 w-full rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597] disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddNote();
                  }}
                />
              </div>
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-4">
          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <DashboardPanelTitle icon="lightning" title="Linked Quote" />
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="p-4 sm:p-5">
              {quote ? (
                <Link
                  href={`/crm/quotes/${quote.id}`}
                  className="flex items-start justify-between gap-3 transition-opacity hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {quote.quoteNumber}
                    </p>
                    <p className="mt-1.5 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {quoteBlurb}
                    </p>
                  </div>
                  <DashboardBadge variant={statusVariant(quote.status)} pill>
                    {quote.status ?? "Pending"}
                  </DashboardBadge>
                </Link>
              ) : (
                <div className="space-y-3">
                  <p className="font-sans text-[12px] uppercase text-[#959597]">
                    No linked quote
                  </p>
                  <Link href="/crm/quotes/new">
                    <DashboardToolbarButton>Create Quote</DashboardToolbarButton>
                  </Link>
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Related
              </p>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="p-4 sm:p-5">
              <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                No separate opportunity object in this CRM — the linked quote
                above is the deal record. Its stage is the quote&apos;s status.
              </p>
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Expense
              </p>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-3 p-4 sm:p-5">
              {expenses.length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">
                  No expense logged for this activity.
                </p>
              ) : (
                <ul className="space-y-2">
                  {expenses.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 font-sans text-[12px] uppercase text-[#FDFDFF]"
                    >
                      <span className="truncate">
                        {e.code} · {e.merchant}
                      </span>
                      <span className="text-[#959597]">
                        {money(Number(e.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {customerId ? (
                <DashboardToolbarButton onClick={() => setExpenseOpen(true)}>
                  Log Expense
                </DashboardToolbarButton>
              ) : null}
            </div>
          </DashboardPanel>
        </div>
      </div>

      <LogFollowUpModal
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onConfirm={handleFollowUpConfirm}
        clientName={detail.customer?.name ?? detail.contact?.fullName ?? ""}
        activityLabel={detail.subject ?? detail.type}
      />

      <CreateTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        busy={taskBusy}
        defaults={{
          relatedTo: relatedLabel,
          assignedTo: detail.rep?.id ?? "",
          notes: "",
        }}
        reps={reps}
        onCreate={handleCreateTask}
      />

      <TaskCreatedSuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        task={createdTask}
        onCreateAnother={() => {
          setSuccessOpen(false);
          setTaskOpen(true);
        }}
      />

      <TaskDetailsDrawer
        open={Boolean(taskDrawerId)}
        taskId={taskDrawerId}
        onClose={() => setTaskDrawerId(null)}
        onCompleted={() => setReloadKey((k) => k + 1)}
      />

      {customerId ? (
        <NewExpenseModal
          open={expenseOpen}
          onClose={() => setExpenseOpen(false)}
          customerId={customerId}
          salesActivityId={activityId}
          onCreated={() => {
            setExpenseOpen(false);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}
