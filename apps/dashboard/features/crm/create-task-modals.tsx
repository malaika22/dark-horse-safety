"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardModal,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import type { CrmTask } from "@/lib/crm-api";

function SuccessCheckIcon() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1F3D2A] text-[#4ADE80]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5l5 5L19 7"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export type CreateTaskFormPayload = {
  taskType: string;
  relatedTo: string;
  dueDate: string;
  dueTime: string;
  assignedTo: string;
  priority: string;
  notes: string;
  reminder: string;
  file?: File | null;
};

export function CreateTaskModal({
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
    assignedTo?: string;
    notes?: string;
    taskType?: string;
  };
  reps: DashboardSelectOption[];
  onCreate: (payload: CreateTaskFormPayload) => void | Promise<void>;
}) {
  const [taskType, setTaskType] = React.useState("");
  const [relatedTo, setRelatedTo] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [dueTime, setDueTime] = React.useState("");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [reminder, setReminder] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setTaskType(defaults.taskType ?? "");
    setRelatedTo(defaults.relatedTo ?? "");
    setDueDate("");
    setDueTime("");
    setAssignedTo(defaults.assignedTo ?? "");
    setPriority("");
    setNotes(defaults.notes ?? "");
    setReminder("");
    setFile(null);
  }, [open, defaults, reps]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Create Task"
      widthClassName="max-w-xl"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-2 py-2 font-sans text-[12px] font-[510] uppercase text-[#959597] hover:text-[#FDFDFF] disabled:opacity-50"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            variant="primary"
            disabled={
              busy ||
              !taskType.trim() ||
              !assignedTo ||
              !dueDate ||
              !priority
            }
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
          >
            Create Task
          </DashboardToolbarButton>
        </>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        Create a follow-up task to do in the future
      </p>
      <div className="space-y-4">
        <DashboardTextField
          label="Related To"
          value={relatedTo}
          onChange={(e) => setRelatedTo(e.target.value)}
          placeholder="Customer · Activity · Quote"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DashboardTextField
            label="Task Type"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            placeholder="e.g. Follow-up call"
          />
          <DashboardTextField
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DashboardTextField
            label="Due Time"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
          <DashboardSelectField
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: "HIGH", label: "High" },
              { value: "MEDIUM", label: "Medium" },
              { value: "LOW", label: "Low" },
            ]}
            placeholder="Select priority"
          />
        </div>
        <DashboardSelectField
          label="Assigned To"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          options={reps}
          placeholder="Select…"
        />
        <DashboardTextAreaField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add notes…"
        />
        <DashboardSelectField
          label="Reminder"
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          options={[
            { value: "1 DAY BEFORE", label: "1 Day Before" },
            { value: "2 HOURS BEFORE", label: "2 Hours Before" },
            { value: "1 HOUR BEFORE", label: "1 Hour Before" },
            { value: "NONE", label: "None" },
          ]}
          placeholder="Select reminder"
        />
        <div className="space-y-1.5">
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
      </div>
    </DashboardModal>
  );
}

function formatDueLabel(iso?: string | null) {
  if (!iso) return "—";
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
  return `${date} · ${h12}${mm}${am ? "A" : "P"} CT`;
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

export function TaskCreatedSuccessModal({
  open,
  onClose,
  task,
  onCreateAnother,
}: {
  open: boolean;
  onClose: () => void;
  task: CrmTask | null;
  onCreateAnother?: () => void;
}) {
  if (!task) return null;
  const assignee = userShort(task.assignee);
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Task Created"
      titleLeading={<SuccessCheckIcon />}
      widthClassName="max-w-lg"
      footer={
        <>
          <DashboardToolbarButton
            onClick={() => {
              onClose();
              onCreateAnother?.();
            }}
          >
            Create Another
          </DashboardToolbarButton>
          <Link href={`/crm/tasks/${task.id}`} onClick={onClose}>
            <DashboardToolbarButton variant="primary">
              View Task
            </DashboardToolbarButton>
          </Link>
        </>
      }
    >
      <p className="mb-4 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        {task.code} has been created and assigned to {assignee}.
      </p>
      <div className="space-y-2.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 py-3">
        {[
          ["Related To", task.relatedLabel || "—"],
          ["Due", formatDueLabel(task.dueAt)],
          ["Assigned To", assignee],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              {label}
            </span>
            <span className="max-w-[65%] text-right font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </DashboardModal>
  );
}
