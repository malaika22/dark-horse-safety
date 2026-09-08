"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  DashboardBadge,
  DashboardField,
  DashboardModal,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
  useScrollLock,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmSalesActivity } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

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

function formatActivityWhen(iso: string) {
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
  return `${date} · ${h12}${mm}${am ? "A" : "P"}`;
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
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
  if (u.includes("OPEN") || u.includes("COMPLETE") || u.includes("ACTIVE"))
    return "success" as const;
  if (u.includes("PENDING") || u.includes("DRAFT")) return "gold" as const;
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

function defaultFollowUpDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const [followUpDate, setFollowUpDate] = React.useState(defaultFollowUpDate);
  const [notes, setNotes] = React.useState("");
  const [createFollowUp, setCreateFollowUp] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFollowUpDate(defaultFollowUpDate());
    setNotes("");
    setCreateFollowUp(true);
    setSubmitting(false);
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Log Follow-up"
      widthClassName="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !createFollowUp}
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
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Log Follow-up
          </DashboardToolbarButton>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Client's Name"
          value={clientName ?? ""}
          onChange={() => {}}
        />
        <DashboardTextField
          label="Activity"
          value={activityLabel ?? ""}
          onChange={() => {}}
        />
        <DashboardToggle
          label="Requires Follow-up / Expenditure"
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

const fieldClass =
  "h-10 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";

function CreateTaskModal({
  open,
  onClose,
  busy,
  defaults,
  reps,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  defaults: {
    relatedTo: string;
    assignedTo: string;
    notes: string;
  };
  reps: { value: string; label: string }[];
  onCreate: (payload: {
    taskType: string;
    relatedTo: string;
    dueDate: string;
    dueTime: string;
    assignedTo: string;
    priority: string;
    notes: string;
    reminder: string;
    file?: File | null;
  }) => void | Promise<void>;
}) {
  const [taskType, setTaskType] = React.useState("FOLLOW-UP CALL");
  const [relatedTo, setRelatedTo] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [dueTime, setDueTime] = React.useState("10:00");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [priority, setPriority] = React.useState("HIGH");
  const [notes, setNotes] = React.useState("");
  const [reminder, setReminder] = React.useState("1 DAY BEFORE");
  const [file, setFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  useScrollLock(open);

  React.useEffect(() => {
    if (!open) return;
    setTaskType("FOLLOW-UP CALL");
    setRelatedTo(defaults.relatedTo);
    setDueDate(defaultFollowUpDate());
    setDueTime("10:00");
    setAssignedTo(defaults.assignedTo || reps[0]?.value || "");
    setPriority("HIGH");
    setNotes(defaults.notes);
    setReminder("1 DAY BEFORE");
    setFile(null);
  }, [open, defaults, reps]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[96] overflow-hidden">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create task"
        className="absolute left-1/2 top-1/2 max-h-[92vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl scrollbar-hidden sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Create Task
            </h2>
            <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Create a follow-up task to do in the future
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Task Type
            </span>
            <input
              className={fieldClass}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Related To
            </span>
            <input
              className={fieldClass}
              value={relatedTo}
              onChange={(e) => setRelatedTo(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Due Date
            </span>
            <input
              type="date"
              className={fieldClass}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Due Time
            </span>
            <input
              type="time"
              className={fieldClass}
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Assigned To
            </span>
            <select
              className={fieldClass}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Select…</option>
              {reps.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Priority
            </span>
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {["HIGH", "MEDIUM", "LOW"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Notes
          </span>
          <input
            className={fieldClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Reminder
          </span>
          <select
            className={fieldClass}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          >
            {["1 DAY BEFORE", "2 HOURS BEFORE", "1 HOUR BEFORE", "NONE"].map(
              (r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="mt-4 space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Upload Image or File
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#3E3E3E] bg-[#1A1A1A] px-4 py-8 text-center hover:border-[#5A5A5A]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 16V5M8 9l4-4 4 4M5 19h14"
                stroke="#FDFDFF"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
              {file ? file.name : "Drop a file or click to upload"}
            </span>
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Png · Jpg · Pdf · Max 10mb
            </span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-2 py-2 font-sans text-[12px] font-[510] uppercase text-[#959597] hover:text-[#FDFDFF] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onCreate({
                taskType,
                relatedTo,
                dueDate,
                dueTime,
                assignedTo,
                priority,
                notes,
                reminder,
                file,
              })
            }
            className="rounded-lg bg-[#FDFDFF] px-4 py-2.5 font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#0D0D0D] hover:opacity-90 disabled:opacity-50"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SalesActivityDetailPage({ activityId }: { activityId: string }) {
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskBusy, setTaskBusy] = React.useState(false);
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
            label: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || r.id,
          })),
        );
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setDetail(null);
          setLoadError(err instanceof Error ? err.message : "Couldn't load activity");
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
    if (!payload.createFollowUp) return;
    const followUpAt = payload.followUpDate
      ? new Date(`${payload.followUpDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    try {
      await crmApi.followUpSalesActivity(activityId, {
        followUpAt,
        notes: payload.notes.trim() || undefined,
      });
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
      const merged = detail.notes?.trim()
        ? `${detail.notes.trim()}\n\n[${stamp}] ${newNote.trim()}`
        : `[${stamp}] ${newNote.trim()}`;
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

  async function handleCreateTask(payload: {
    taskType: string;
    relatedTo: string;
    dueDate: string;
    dueTime: string;
    assignedTo: string;
    priority: string;
    notes: string;
    reminder: string;
    file?: File | null;
  }) {
    setTaskBusy(true);
    try {
      const followUpAt = new Date(
        `${payload.dueDate}T${payload.dueTime || "10:00"}:00`,
      ).toISOString();
      await crmApi.createSalesActivity({
        type: "OTHER",
        subject: `${payload.taskType} · ${payload.priority}`,
        customerId: detail?.customer?.id,
        repId: payload.assignedTo || detail?.rep?.id,
        followUpAt,
        notes: [
          payload.notes,
          `Related to: ${payload.relatedTo}`,
          `Reminder: ${payload.reminder}`,
          payload.file ? `Attachment: ${payload.file.name}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        activityAt: new Date().toISOString(),
        status: "PENDING",
      });
      toastSuccess("Task created");
      setTaskOpen(false);
    } catch (err) {
      toastApiError(err);
    } finally {
      setTaskBusy(false);
    }
  }

  useSetHeaderBreadcrumb(
    detail?.activityCode
      ? `CRM / Sales / ${detail.activityCode}`
      : "CRM / Sales / Activity",
  );

  useSetHeaderActions(
    detail ? (
      <>
        <Link href={`/crm/sales/${activityId}/edit`}>
          <DashboardToolbarButton>Edit</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton onClick={() => setFollowUpOpen(true)}>
          Log Follow Up
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          leftIcon={<TaskIcon />}
          showChevron
          onClick={() => setTaskOpen(true)}
        >
          Create Task
        </DashboardToolbarButton>
      </>
    ) : null,
    [detail, activityId],
  );

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

  const whenLabel = formatActivityWhen(detail.activityAt);
  const meta = `${detail.activityCode} · ${detail.type} · ${whenLabel}`;
  const nextAction =
    detail.subject?.toUpperCase().includes("QUOTE")
      ? "Send revised quote"
      : detail.followUpAt
        ? "Complete follow-up"
        : "—";
  const quote = detail.linkedQuote;
  const opportunity = quote?.amount != null ? money(Number(quote.amount)) : "—";

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardBadge variant={statusVariant(detail.status)} pill>
          {detail.status === "COMPLETE" ? "OPEN" : detail.status}
        </DashboardBadge>
        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
          {meta}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
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
                  <p className="truncate font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {detail.customer?.name ?? "—"}
                  </p>
                  <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {detail.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DetailPair
                  label="Contact"
                  value={shortName(detail.contact?.fullName)}
                />
                <DetailPair label="Rep" value={userShort(detail.rep)} />
                <DetailPair label="Date" value={whenLabel} />
                <DetailPair
                  label="Duration"
                  value={detail.duration ?? "—"}
                />
                <DetailPair
                  label="Subject"
                  value={detail.subject ?? "—"}
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
              <DashboardPanelTitle icon="lightning" title="Notes" />
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-5 p-4 sm:p-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    Previous Note
                  </p>
                  <p className="font-sans text-[11px] uppercase tabular-nums text-[#959597]">
                    {formatShortDate(detail.activityAt)}
                  </p>
                </div>
                <p className="mt-2 font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                  {detail.notes?.trim() || "No notes yet"}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  Add Note
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note"
                    className="h-10 min-w-0 flex-1 rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddNote();
                    }}
                  />
                  <DashboardToolbarButton
                    disabled={savingNote || !newNote.trim()}
                    onClick={() => void handleAddNote()}
                  >
                    Save
                  </DashboardToolbarButton>
                </div>
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
                    <p className="mt-1 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {quote.notes || quote.terms || "Linked quote"}
                    </p>
                  </div>
                  <DashboardBadge
                    variant={statusVariant(quote.status)}
                    pill
                  >
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
            <div className="px-4 sm:px-5">
              <RowKV label="Opportunity" value={opportunity} />
              <RowKV
                label="Stage"
                value={
                  quote
                    ? quote.status === "SENT" || quote.status === "OPEN"
                      ? "Proposal"
                      : quote.status ?? "—"
                    : "—"
                }
              />
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
          relatedTo: detail.customer?.name ?? "",
          assignedTo: detail.rep?.id ?? "",
          notes: detail.subject
            ? `Follow up on ${detail.subject}`
            : "Confirm next steps and send update.",
        }}
        reps={reps}
        onCreate={handleCreateTask}
      />
    </div>
  );
}
