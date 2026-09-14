"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";

function CloseTextBtn({ onClick, label = "Cancel" }: { onClick: () => void; label?: string }) {
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

function GreenCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
        checked
          ? "border-[#22C55E] bg-[#22C55E] text-[#0D0D0D]"
          : "border-[#6F6F72] bg-transparent",
      )}
      aria-hidden
    >
      {checked ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

export type EodAttentionItem = {
  id: string;
  kind: "missing" | "late";
  repName: string;
  dateLabel: string;
  detail: string;
  selectedByDefault?: boolean;
};

export type SendReminderPayload = {
  ids: string[];
  message: string;
  viaPush: boolean;
  viaEmail: boolean;
};

const DEFAULT_REMIND_MESSAGE =
  "Your EOD report is missing or late. Please submit it as soon as possible — reach out if you're blocked.";

export function EodSendReminderModal({
  open,
  onClose,
  items,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  items: EodAttentionItem[];
  onSend: (payload: SendReminderPayload) => void | Promise<void>;
}) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [message, setMessage] = React.useState(DEFAULT_REMIND_MESSAGE);
  const [viaPush, setViaPush] = React.useState(true);
  const [viaEmail, setViaEmail] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, boolean> = {};
    for (const item of items) {
      next[item.id] = item.selectedByDefault !== false;
    }
    setSelected(next);
    setMessage(DEFAULT_REMIND_MESSAGE);
    setViaPush(true);
    setViaEmail(true);
    setBusy(false);
  }, [open, items]);

  const selectedIds = items.filter((i) => selected[i.id]).map((i) => i.id);
  const count = selectedIds.length;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Send Reminder"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} />
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || count === 0 || (!viaPush && !viaEmail)}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onSend({
                    ids: selectedIds,
                    message,
                    viaPush,
                    viaEmail,
                  });
                  onClose();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Send To {count} Rep{count === 1 ? "" : "s"}
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            These Reps Have A Missing Or Late Report:
          </p>
          <ul className="overflow-hidden rounded-lg border border-[#2D2D30]">
            {items.length === 0 ? (
              <li className="px-3.5 py-3 font-sans text-[11px] uppercase text-[#959597]">
                No missing or late reports
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2.5 border-b border-[#2D2D30] px-3.5 py-2.5 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((s) => ({ ...s, [item.id]: !s[item.id] }))
                    }
                    className="inline-flex items-center gap-2.5"
                  >
                    <GreenCheck checked={Boolean(selected[item.id])} />
                    <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {item.repName}
                    </span>
                  </button>
                  <DashboardBadge
                    variant={item.kind === "missing" ? "error" : "warning"}
                    pill
                  >
                    {item.kind === "missing" ? "Missing" : "Late"}
                  </DashboardBadge>
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {item.dateLabel} · {item.detail}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Message
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="min-h-[96px] w-full rounded-lg border-0 bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Send Via
          </span>
          <button
            type="button"
            onClick={() => setViaPush((v) => !v)}
            className="inline-flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            <GreenCheck checked={viaPush} />
            In-app
          </button>
          <button
            type="button"
            onClick={() => setViaEmail((v) => !v)}
            className="inline-flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            <GreenCheck checked={viaEmail} />
            Email
          </button>
        </div>
      </div>
    </DashboardModal>
  );
}

export type RequestDetailPayload = {
  missing: string[];
  note: string;
  dueBackBy: string;
  viaPush: boolean;
  viaEmail: boolean;
};

const MISSING_OPTIONS_FALLBACK = [
  { id: "ACTIVITY_OUTCOMES", label: "Activity Outcomes" },
  { id: "NEXT_STEPS", label: "Next Steps" },
  { id: "PIPELINE_FIGURES", label: "Pipeline Figures" },
  { id: "OTHER", label: "Other → Free Text" },
];

const DUE_OPTIONS_FALLBACK = [
  { value: "tomorrow-9", label: "Tomorrow · 9:00 AM" },
  { value: "tomorrow-17", label: "Tomorrow · 5:00 PM" },
  { value: "in-2-days", label: "In 2 Days · 9:00 AM" },
  { value: "end-of-week", label: "End Of Week · 5:00 PM" },
];

function dueIso(key: string) {
  const d = new Date();
  if (key === "tomorrow-9") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (key === "tomorrow-17") {
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
  } else if (key === "in-2-days") {
    d.setDate(d.getDate() + 2);
    d.setHours(9, 0, 0, 0);
  } else {
    const day = d.getDay();
    const toFri = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + toFri);
    d.setHours(17, 0, 0, 0);
  }
  return d.toISOString();
}

export function EodRequestDetailModal({
  open,
  onClose,
  onSend,
  reportCode,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (payload: RequestDetailPayload) => void | Promise<void>;
  reportCode?: string;
}) {
  const { lookups } = useCrmLookups({ includeLocations: false });
  const missingOptions = (
    lookupOptions(lookups, "eodMissingFields").length
      ? lookupOptions(lookups, "eodMissingFields")
      : MISSING_OPTIONS_FALLBACK.map((o) => ({
          value: o.id,
          label: o.label,
        }))
  ).map((o) => ({ id: o.value, label: o.label }));
  const dueOptions =
    lookupOptions(lookups, "eodDuePresets").length > 0
      ? lookupOptions(lookups, "eodDuePresets")
      : DUE_OPTIONS_FALLBACK;

  const defaultMissingId = missingOptions[0]?.id ?? "ACTIVITY_OUTCOMES";
  const defaultDueKey = dueOptions[0]?.value ?? "tomorrow-9";

  const [missing, setMissing] = React.useState<Record<string, boolean>>({
    [defaultMissingId]: true,
  });
  const [note, setNote] = React.useState("");
  const [dueKey, setDueKey] = React.useState<string>(defaultDueKey);
  const [viaPush, setViaPush] = React.useState(true);
  const [viaEmail, setViaEmail] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMissing({ [defaultMissingId]: true });
    setNote("");
    setDueKey(defaultDueKey);
    setViaPush(true);
    setViaEmail(true);
    setBusy(false);
  }, [open, reportCode, defaultMissingId, defaultDueKey]);

  const selectedMissing = missingOptions.filter((o) => missing[o.id]).map(
    (o) => o.id,
  );

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Request More Detail"
      widthClassName="max-w-lg"
      footer={
        <>
          <CloseTextBtn onClick={onClose} />
          <DashboardToolbarButton
            variant="primary"
            disabled={
              busy ||
              selectedMissing.length === 0 ||
              (!viaPush && !viaEmail)
            }
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onSend({
                    missing: selectedMissing,
                    note,
                    dueBackBy: dueIso(dueKey),
                    viaPush,
                    viaEmail,
                  });
                  onClose();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Send Request
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            What&apos;s Missing?
          </p>
          <ul className="overflow-hidden rounded-lg border border-[#2D2D30]">
            {missingOptions.map((opt) => (
              <li key={opt.id} className="border-b border-[#2D2D30] last:border-b-0">
                <button
                  type="button"
                  onClick={() =>
                    setMissing((m) => ({ ...m, [opt.id]: !m[opt.id] }))
                  }
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                >
                  <GreenCheck checked={Boolean(missing[opt.id])} />
                  <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {opt.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Note To Rep
          </p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context on what you need (optional)"
            className="h-10 w-full rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
          />
        </div>

        <div className="space-y-1.5">
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Due Back By
          </p>
          <div className="relative">
            <select
              value={dueKey}
              onChange={(e) => setDueKey(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 pr-8 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
            >
              {dueOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#FDFDFF]">
              ▾
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Notify Via
          </span>
          <button
            type="button"
            onClick={() => setViaPush((v) => !v)}
            className="inline-flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            <GreenCheck checked={viaPush} />
            In-app
          </button>
          <button
            type="button"
            onClick={() => setViaEmail((v) => !v)}
            className="inline-flex items-center gap-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            <GreenCheck checked={viaEmail} />
            Email
          </button>
        </div>
      </div>
    </DashboardModal>
  );
}
