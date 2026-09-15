"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardMenuPopover,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmSalesActivity, type CrmTask } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  EventDetailPopover,
  NewActivityModal,
  RescheduleConfirmModal,
  RescheduleFailedModal,
  RescheduleHintBar,
  SchedulingConflictModal,
  type EventPopoverData,
  type NewActivityPayload,
  type NewActivityPrefill,
} from "./sales-calendar-overlays";

type CalView = "day" | "week" | "month";
type TabId = "training" | "tab2" | "tab3" | "calendar" | "activities";

type EventKind = "CALL" | "VISIT" | "MEETING" | "TASK" | "OTHER";

type CalEvent = {
  id: string;
  source: "activity" | "task";
  repId: string;
  repName: string;
  dayKey: string;
  hour: number;
  startMs: number;
  endMs: number;
  title: string;
  kind: EventKind;
  kindLabel: string;
  timeLabel: string;
  conflict: boolean;
  external: boolean;
  href: string;
  customer: string;
  subject: string;
  status: string;
  activityAt: string;
  type: string;
  duration?: string | null;
};

const KIND_STYLE: Record<
  EventKind,
  { bg: string; border: string; label: string; solid: boolean }
> = {
  CALL: { bg: "#1F3A2E", border: "#22C55E", label: "Call", solid: true },
  VISIT: { bg: "#3A2E1A", border: "#C4A35A", label: "Visit", solid: true },
  MEETING: { bg: "#3A1515", border: "#A33B3B", label: "Meeting", solid: true },
  TASK: { bg: "transparent", border: "#38BDF8", label: "Task", solid: false },
  OTHER: { bg: "#2A2A2A", border: "#3E3E3E", label: "Other", solid: true },
};

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function formatRange(from: Date, to: Date) {
  const a = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const b = to.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${a} – ${b}`.toUpperCase();
}

function formatDayHeader(d: Date) {
  const wd = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${wd} ${d.getDate()}`;
}

function shortRepName(first?: string | null, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f && l) return `${f.charAt(0)}. ${l}`.toUpperCase();
  return (l || f || "Unknown").toUpperCase();
}

function formatHourAm(h: number, m = 0) {
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${h12}${mm}${am ? "A" : "P"}`;
}

function formatEventTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatHourAm(d.getHours(), d.getMinutes());
}

function durationMinutes(duration?: string | null) {
  const dur = (duration ?? "").toUpperCase();
  if (dur.includes("15")) return 15;
  if (dur.includes("30")) return 30;
  if (dur.includes("45")) return 45;
  if (dur.includes("2")) return 120;
  return 60;
}

function activityKind(a: CrmSalesActivity): EventKind {
  const t = (a.type ?? "").toUpperCase();
  if (t === "CALL" || t === "VISIT" || t === "MEETING") return t;
  return "OTHER";
}

function formatWhenRange(iso: string, duration?: string | null) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const wd = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const md = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  const start = formatHourAm(d.getHours(), d.getMinutes());
  const mins = durationMinutes(duration);
  const endDate = new Date(d.getTime() + mins * 60_000);
  const end = formatHourAm(endDate.getHours(), endDate.getMinutes());
  return `${wd}, ${md} · ${start}–${end}`;
}

function formatMoveLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const wd = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const md = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  return `${wd} ${md}, ${formatHourAm(d.getHours(), d.getMinutes())}`;
}

function formatSlotLabel(day: string, hour: number) {
  const d = parseDayKey(day);
  const wd = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const md = d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
  return `${wd}, ${md} · ${formatHourAm(hour)} · Empty slot`;
}

function mapActivity(a: CrmSalesActivity): CalEvent | null {
  const when = new Date(a.activityAt);
  if (Number.isNaN(when.getTime())) return null;
  const repId = a.rep?.id ?? "unassigned";
  const repName =
    repId === "unassigned"
      ? "UNASSIGNED"
      : shortRepName(a.rep?.firstName, a.rep?.lastName);
  const kind = activityKind(a);
  const customer = (a.customer?.name ?? a.subject ?? "Activity").toUpperCase();
  const time = formatEventTime(a.activityAt);
  const mins = durationMinutes(a.duration);
  const startMs = when.getTime();
  return {
    id: a.id,
    source: "activity",
    repId,
    repName,
    dayKey: dayKey(when),
    hour: when.getHours(),
    startMs,
    endMs: startMs + mins * 60_000,
    title: customer,
    kind,
    kindLabel: KIND_STYLE[kind].label.toUpperCase(),
    timeLabel: time,
    conflict: false,
    external: false,
    href: `/crm/sales/${a.id}`,
    customer,
    subject: (a.subject ?? a.notes ?? "—").toUpperCase(),
    status: (a.status ?? "SCHEDULED").toUpperCase(),
    activityAt: a.activityAt,
    type: a.type ?? "CALL",
    duration: a.duration,
  };
}

function mapTask(t: CrmTask): CalEvent | null {
  if (!t.dueAt) return null;
  const when = new Date(t.dueAt);
  if (Number.isNaN(when.getTime())) return null;
  const repId = t.assignee?.id ?? "unassigned";
  const repName =
    repId === "unassigned"
      ? "UNASSIGNED"
      : shortRepName(t.assignee?.firstName, t.assignee?.lastName);
  const title = (t.title || t.relatedLabel || "Task").toUpperCase();
  const time = formatEventTime(t.dueAt);
  const startMs = when.getTime();
  return {
    id: `task-${t.id}`,
    source: "task",
    repId,
    repName,
    dayKey: dayKey(when),
    hour: when.getHours(),
    startMs,
    endMs: startMs + 30 * 60_000,
    title,
    kind: "TASK",
    kindLabel: "TASK",
    timeLabel: time ? `DUE ${time}` : "DUE",
    conflict: false,
    external: false,
    href: `/crm/sales/tasks/${t.id}`,
    customer: (t.customer?.name ?? title).toUpperCase(),
    subject: (t.notes ?? t.taskType ?? "—").toUpperCase(),
    status: (t.displayStatus ?? t.status ?? "OPEN").toUpperCase(),
    activityAt: t.dueAt,
    type: "TASK",
    duration: "30m",
  };
}

function markConflicts(events: CalEvent[]): CalEvent[] {
  const byKey = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = `${ev.repId}|${ev.dayKey}`;
    const list = byKey.get(key) ?? [];
    list.push(ev);
    byKey.set(key, list);
  }
  const conflictIds = new Set<string>();
  for (const list of byKey.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.startMs < b.endMs && b.startMs < a.endMs) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
  }
  return events.map((ev) =>
    conflictIds.has(ev.id) ? { ...ev, conflict: true } : ev,
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden>
      <circle cx="3" cy="2" r="1.25" fill="currentColor" />
      <circle cx="7" cy="2" r="1.25" fill="currentColor" />
      <circle cx="3" cy="7" r="1.25" fill="currentColor" />
      <circle cx="7" cy="7" r="1.25" fill="currentColor" />
      <circle cx="3" cy="12" r="1.25" fill="currentColor" />
      <circle cx="7" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TaskCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EventCard({
  ev,
  onOpen,
  onDragStart,
}: {
  ev: CalEvent;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  const style = KIND_STYLE[ev.kind];
  const isTask = ev.kind === "TASK";
  const isExternal = ev.external;
  const isConflict = ev.conflict;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        "group relative block w-full rounded-lg px-2.5 py-2 text-left transition-opacity hover:opacity-95",
        isTask && !isConflict && "border border-dashed",
        isExternal && "border border-dashed border-[#FDFDFF]/70 bg-[#1A1A1A]",
        isConflict && "border border-[#EF4444] shadow-[0_0_0_1px_rgba(239,68,68,0.45)]",
      )}
      style={
        isExternal
          ? undefined
          : isConflict
            ? {
                backgroundColor: style.solid ? style.bg : "#2A1515",
                borderColor: "#EF4444",
              }
            : {
                backgroundColor: style.bg,
                borderColor: style.border,
              }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-1.5 font-sans text-[11px] font-[590] uppercase leading-tight tracking-[-0.02em] text-[#FDFDFF]">
            {isConflict ? (
              <span className="mt-0.5 shrink-0 text-[#EF4444]">
                <WarnIcon />
              </span>
            ) : null}
            {isTask && !isConflict ? (
              <span className="mt-0.5 shrink-0 text-[#38BDF8]">
                <TaskCheckIcon />
              </span>
            ) : null}
            <span className="truncate">{ev.title}</span>
          </p>
          <p className="mt-1 truncate font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FDFDFF]/80">
            {ev.kindLabel}
            {ev.timeLabel ? ` · ${ev.timeLabel}` : ""}
            {isConflict ? " · CONFLICT" : ""}
          </p>
          {isExternal ? (
            <p className="mt-1 inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#959597]">
              <LockIcon /> External · Outlook
            </p>
          ) : null}
        </div>
        {!isExternal ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Reschedule"
            title="Reschedule"
            onClick={(e) => {
              e.stopPropagation();
              onDragStart();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onDragStart();
              }
            }}
            className="mt-0.5 shrink-0 text-[#FDFDFF]/55 hover:text-[#FDFDFF]"
          >
            <DragHandleIcon />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function SalesCalendarPage() {
  const router = useRouter();
  const [anchor, setAnchor] = React.useState(() => startOfWeek(new Date()));
  const [view, setView] = React.useState<CalView>("week");
  const [tab, setTab] = React.useState<TabId>("calendar");
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<CalEvent[]>([]);
  const [allReps, setAllReps] = React.useState<{ id: string; name: string }[]>(
    [],
  );
  const [customers, setCustomers] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [selectedReps, setSelectedReps] = React.useState<string[]>([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLButtonElement>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [newOpen, setNewOpen] = React.useState(false);
  const [newPrefill, setNewPrefill] =
    React.useState<NewActivityPrefill | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [eventOpen, setEventOpen] = React.useState(false);
  const [eventData, setEventData] = React.useState<EventPopoverData | null>(
    null,
  );
  const [activeEvent, setActiveEvent] = React.useState<CalEvent | null>(null);
  const [reschedulePick, setReschedulePick] = React.useState<CalEvent | null>(
    null,
  );
  const [rescheduleConfirm, setRescheduleConfirm] = React.useState<{
    dayKey: string;
    hour: number;
  } | null>(null);
  const [rescheduling, setRescheduling] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [conflictMessage, setConflictMessage] = React.useState("");
  const [conflictMode, setConflictMode] = React.useState<
    "reschedule" | "create"
  >("reschedule");
  const [pendingCreate, setPendingCreate] =
    React.useState<NewActivityPayload | null>(null);
  const [failedOpen, setFailedOpen] = React.useState(false);
  const [failedMessage, setFailedMessage] = React.useState("");

  const days = React.useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "month") {
      const start = startOfMonth(anchor);
      const count = daysInMonth(anchor);
      return Array.from({ length: count }, (_, i) => addDays(start, i));
    }
    return Array.from({ length: 5 }, (_, i) =>
      addDays(startOfWeek(anchor), i),
    );
  }, [anchor, view]);

  const rangeFrom = days[0]!;
  const rangeTo = days[days.length - 1]!;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [repsRes, custRes] = await Promise.all([
          crmApi.lookupReps(),
          crmApi.lookupCustomers(),
        ]);
        if (cancelled) return;
        setAllReps(
          (repsRes.data ?? []).map((r) => ({
            id: r.id,
            name: shortRepName(r.firstName, r.lastName),
          })),
        );
        setCustomers(
          (custRes.data ?? []).map((c) => ({
            value: c.id,
            label: (c.name ?? c.code ?? "").toUpperCase(),
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const from = dayKey(rangeFrom);
        const to = dayKey(rangeTo);
        const [actRes, taskRes] = await Promise.all([
          crmApi.listSalesActivities({
            from,
            to,
            page: 1,
            pageSize: 200,
            sort: "activityAt",
            direction: "asc",
          }),
          crmApi.listTasks({
            page: 1,
            pageSize: 200,
            sort: "dueAt",
            direction: "asc",
            status: "OPEN",
          }),
        ]);
        if (cancelled) return;
        const activities = (actRes.data.items ?? [])
          .map(mapActivity)
          .filter((e): e is CalEvent => Boolean(e));
        const fromMs = parseDayKey(from).setHours(0, 0, 0, 0);
        const toMs = parseDayKey(to).setHours(23, 59, 59, 999);
        const tasks = (taskRes.data.items ?? [])
          .map(mapTask)
          .filter((e): e is CalEvent => Boolean(e))
          .filter((e) => e.startMs >= fromMs && e.startMs <= toMs);
        setEvents(markConflicts([...activities, ...tasks]));
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeFrom, rangeTo, reloadKey]);

  const reps = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allReps) map.set(r.id, r.name);
    for (const e of events) map.set(e.repId, e.repName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allReps, events]);

  const visibleReps = React.useMemo(() => {
    if (selectedReps.length === 0) return reps;
    return reps.filter((r) => selectedReps.includes(r.id));
  }, [reps, selectedReps]);

  const visibleEvents = React.useMemo(() => {
    if (selectedReps.length === 0) return events;
    return events.filter((e) => selectedReps.includes(e.repId));
  }, [events, selectedReps]);

  const weekCountByRep = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of visibleEvents) {
      map.set(e.repId, (map.get(e.repId) ?? 0) + 1);
    }
    return map;
  }, [visibleEvents]);

  const modalReps = React.useMemo(
    () => reps.map((r) => ({ value: r.id, label: r.name })),
    [reps],
  );

  function shift(dir: -1 | 1) {
    if (view === "day") {
      setAnchor((prev) => addDays(prev, dir));
      return;
    }
    if (view === "month") {
      setAnchor((prev) => {
        const next = startOfMonth(prev);
        next.setMonth(next.getMonth() + dir);
        return next;
      });
      return;
    }
    setAnchor((prev) => addDays(prev, dir * 7));
  }

  function goToday() {
    const today = new Date();
    setAnchor(
      view === "month"
        ? startOfMonth(today)
        : view === "week"
          ? startOfWeek(today)
          : today,
    );
  }

  function eventsForCell(repId: string, day: string) {
    return visibleEvents
      .filter((e) => e.repId === repId && e.dayKey === day)
      .sort((a, b) => a.startMs - b.startMs);
  }

  function openEventDetail(ev: CalEvent) {
    const style = KIND_STYLE[ev.kind];
    setActiveEvent(ev);
    setEventData({
      id: ev.id,
      customer: ev.customer,
      subtitle: `${style.label.toUpperCase()} · ${ev.subject}`,
      when: formatWhenRange(ev.activityAt, ev.duration),
      rep: ev.repName,
      status: ev.conflict
        ? "CONFLICT"
        : ev.external
          ? "EXTERNAL"
          : ev.status,
      href: ev.href,
      kindLabel: style.label,
      fromLabel: formatMoveLabel(ev.activityAt),
      openLabel: ev.source === "task" ? "Open Task" : "Open Activity",
    });
    setEventOpen(true);
  }

  function handleEmptySlot(
    day: string,
    hour: number,
    repId: string,
    repName: string,
  ) {
    if (reschedulePick) {
      if (reschedulePick.source === "task") {
        toastApiError(new Error("Tasks cannot be rescheduled on the calendar"));
        return;
      }
      setRescheduleConfirm({ dayKey: day, hour });
      return;
    }
    setNewPrefill({
      dayKey: day,
      hour,
      repId,
      repName,
      slotLabel: formatSlotLabel(day, hour),
    });
    setNewOpen(true);
  }

  function startReschedule(ev: CalEvent) {
    if (ev.external) return;
    if (ev.source === "task") {
      toastApiError(new Error("Open the task to change its due date"));
      return;
    }
    setReschedulePick(ev);
    setEventOpen(false);
  }

  function findConflict(
    repId: string,
    day: string,
    startMs: number,
    endMs: number,
    excludeId?: string,
  ) {
    return events.find(
      (e) =>
        e.repId === repId &&
        e.dayKey === day &&
        e.id !== excludeId &&
        e.startMs < endMs &&
        startMs < e.endMs,
    );
  }

  function conflictCopy(conflict: CalEvent) {
    const when = new Date(conflict.activityAt);
    const time = formatHourAm(when.getHours(), when.getMinutes());
    const day = when
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
    return `${conflict.repName} already has a ${KIND_STYLE[conflict.kind].label} at ${time} on ${day}.`;
  }

  function proposedRescheduleIso() {
    if (!reschedulePick || !rescheduleConfirm) return null;
    const prev = new Date(reschedulePick.activityAt);
    const mins = Number.isNaN(prev.getTime()) ? 0 : prev.getMinutes();
    const hh = String(rescheduleConfirm.hour).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    return `${rescheduleConfirm.dayKey}T${hh}:${mm}:00`;
  }

  async function persistCreate(payload: NewActivityPayload) {
    setCreating(true);
    try {
      let notes = payload.notes || "";
      if (payload.recurring && payload.recurring !== "DOES NOT REPEAT") {
        notes = notes
          ? `${notes}\nRecurring: ${payload.recurring}`
          : `Recurring: ${payload.recurring}`;
      }
      if (payload.file) {
        const buf = await payload.file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]!);
        }
        const uploaded = await crmApi.uploadFile({
          folder: "sales-activities",
          fileName: payload.file.name,
          mimeType: payload.file.type || undefined,
          contentBase64: btoa(binary),
        });
        const url = uploaded.data.url;
        notes = notes ? `${notes}\nAttachment: ${url}` : `Attachment: ${url}`;
      }
      const activityAt = new Date(
        `${payload.date}T${payload.time}:00`,
      ).toISOString();
      await crmApi.createSalesActivity({
        type: payload.type,
        customerId: payload.customerId,
        contactId: payload.contactId,
        locationId: payload.locationId,
        repId: payload.repId || undefined,
        activityAt,
        duration: payload.duration || undefined,
        notes: notes || undefined,
        status: "COMPLETE",
        subject:
          payload.subject?.trim() ||
          payload.notes?.slice(0, 120) ||
          payload.type,
      });
      toastSuccess("Activity created");
      setNewOpen(false);
      setNewPrefill(null);
      setPendingCreate(null);
      setConflictOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreate(payload: NewActivityPayload) {
    if (!payload.force) {
      const start = new Date(`${payload.date}T${payload.time}:00`);
      const startMs = start.getTime();
      const endMs = startMs + durationMinutes(payload.duration) * 60_000;
      const conflict = findConflict(
        payload.repId,
        payload.date,
        startMs,
        endMs,
      );
      if (conflict) {
        setPendingCreate(payload);
        setConflictMode("create");
        setConflictMessage(conflictCopy(conflict));
        setConflictOpen(true);
        return;
      }
    }
    await persistCreate(payload);
  }

  async function persistReschedule() {
    if (!reschedulePick || !rescheduleConfirm) return;
    if (reschedulePick.source === "task") return;
    const toIso = proposedRescheduleIso();
    if (!toIso) return;
    setRescheduling(true);
    setConflictOpen(false);
    try {
      await crmApi.updateSalesActivity(reschedulePick.id, {
        activityAt: new Date(toIso).toISOString(),
      });
      toastSuccess("Activity rescheduled");
      setRescheduleConfirm(null);
      setReschedulePick(null);
      setActiveEvent(null);
      setEventData(null);
      setFailedOpen(false);
      setReloadKey((k) => k + 1);
    } catch {
      setFailedMessage(
        `Something went wrong saving this change. The activity is still on ${formatMoveLabel(reschedulePick.activityAt)} — nothing was lost.`,
      );
      setFailedOpen(true);
    } finally {
      setRescheduling(false);
    }
  }

  async function handleConfirmReschedule() {
    if (!reschedulePick || !rescheduleConfirm) return;
    if (reschedulePick.source === "task") return;
    const toIso = proposedRescheduleIso();
    if (!toIso) return;
    const start = new Date(toIso);
    const startMs = start.getTime();
    const endMs =
      startMs + durationMinutes(reschedulePick.duration) * 60_000;
    const conflict = findConflict(
      reschedulePick.repId,
      rescheduleConfirm.dayKey,
      startMs,
      endMs,
      reschedulePick.id,
    );
    if (conflict) {
      setConflictMode("reschedule");
      setConflictMessage(conflictCopy(conflict));
      setConflictOpen(true);
      return;
    }
    await persistReschedule();
  }

  const rescheduleDescription = React.useMemo(() => {
    if (!reschedulePick || !rescheduleConfirm) return "";
    const toIso = proposedRescheduleIso();
    if (!toIso) return "";
    const kind = KIND_STYLE[reschedulePick.kind].label.toUpperCase();
    const customer = reschedulePick.customer.replace(/\s+ENERGY$/i, "").trim();
    return `Move ${kind} · ${customer} from ${formatMoveLabel(reschedulePick.activityAt)} to ${formatMoveLabel(toIso)}?`;
  }, [reschedulePick, rescheduleConfirm]);

  const tabs: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: "training", label: "Training" },
    { id: "tab2", label: "Tab 2", disabled: true },
    { id: "tab3", label: "Tab 3", disabled: true },
    { id: "calendar", label: "Calendar" },
    { id: "activities", label: "Activities" },
  ];

  const legendItems: {
    key: string;
    label: string;
    bg?: string;
    border: string;
    dashed?: boolean;
  }[] = [
    { key: "call", label: "Call", bg: "#22C55E", border: "#22C55E" },
    { key: "visit", label: "Visit", bg: "#C4A35A", border: "#C4A35A" },
    { key: "meeting", label: "Meeting", bg: "#A33B3B", border: "#A33B3B" },
    {
      key: "task",
      label: "Task",
      border: "#38BDF8",
      dashed: true,
    },
    { key: "conflict", label: "Conflict", border: "#EF4444" },
    {
      key: "external",
      label: "External (Read-Only)",
      border: "#FDFDFF",
      dashed: true,
    },
  ];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-[#3E3E3E]">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => shift(-1)}
              className="inline-flex h-9 w-9 items-center justify-center bg-[#2A2A2A] text-[#FDFDFF] hover:bg-[#353535]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-9 border-x border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#353535]"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => shift(1)}
              className="inline-flex h-9 w-9 items-center justify-center bg-[#2A2A2A] text-[#FDFDFF] hover:bg-[#353535]"
            >
              ›
            </button>
          </div>
          <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {formatRange(rangeFrom, rangeTo)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] p-0.5">
            {(["day", "week", "month"] as CalView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  if (v === "week") setAnchor(startOfWeek(anchor));
                  if (v === "month") setAnchor(startOfMonth(anchor));
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] transition-colors",
                  view === v
                    ? "bg-[#FDFDFF] text-[#0D0D0D]"
                    : "text-[#959597] hover:text-[#FDFDFF]",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="relative">
            <DashboardToolbarButton
              ref={filterRef}
              leftIcon={<FilterIcon />}
              showChevron
              onClick={() => setFilterOpen((o) => !o)}
            >
              Filter Reps
              {selectedReps.length ? ` (${selectedReps.length})` : ""}
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              anchorRef={filterRef}
              items={[]}
              align="right"
              className="min-w-[220px] px-0 py-2"
            >
              <div className="max-h-64 space-y-1 overflow-y-auto px-2 py-1">
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5"
                  onClick={() => setSelectedReps([])}
                >
                  All reps
                </button>
                {reps.map((r) => {
                  const on = selectedReps.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-sans text-[11px] uppercase hover:bg-white/5",
                        on ? "text-[#FDFDFF]" : "text-[#959597]",
                      )}
                      onClick={() =>
                        setSelectedReps((prev) =>
                          on
                            ? prev.filter((id) => id !== r.id)
                            : [...prev, r.id],
                        )
                      }
                    >
                      <span>{r.name}</span>
                      {on ? <span>✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </DashboardMenuPopover>
          </div>
        </div>
      </div>

      <RescheduleHintBar
        active={Boolean(reschedulePick)}
        onCancel={() => {
          setReschedulePick(null);
          setRescheduleConfirm(null);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={() => {
              if (t.disabled) return;
              if (t.id === "activities") {
                router.push("/crm/sales");
                return;
              }
              setTab(t.id);
            }}
            className={cn(
              "rounded-lg px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              tab === t.id
                ? "bg-[#FDFDFF] text-[#0D0D0D]"
                : "bg-[#2A2A2A] text-[#959597] hover:text-[#FDFDFF]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <BrandLoader label="Loading calendar" />
        </div>
      ) : tab === "training" ? (
        <div className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="border-b border-divider px-4 py-3">
            <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Training / Tasks
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Open tasks and follow-up items in this range
            </p>
          </div>
          <div className="divide-y divide-divider">
            {visibleEvents.filter((e) => e.kind === "TASK").length === 0 ? (
              <p className="px-4 py-10 text-center font-sans text-[12px] uppercase text-[#959597]">
                No training or task items in this range
              </p>
            ) : (
              visibleEvents
                .filter((e) => e.kind === "TASK")
                .map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openEventDetail(ev)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {ev.title}
                      </p>
                      <p className="mt-0.5 truncate font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                        {ev.subject} · {ev.repName}
                      </p>
                    </div>
                    <span className="shrink-0 font-sans text-[10px] uppercase tabular-nums text-[#959597]">
                      {formatMoveLabel(ev.activityAt)}
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
            <div
              className="min-w-[640px] md:min-w-[900px]"
              style={{
                display: "grid",
                gridTemplateColumns: `132px repeat(${days.length}, minmax(150px, 1fr))`,
              }}
            >
              <div className="border-b border-divider bg-[#161618] px-3 py-3" />
              {days.map((d) => (
                <div
                  key={dayKey(d)}
                  className="border-b border-l border-divider bg-[#161618] px-3 py-3 text-center font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]"
                >
                  {formatDayHeader(d)}
                </div>
              ))}

              {visibleReps.length === 0 ? (
                <div
                  className="col-span-full px-5 py-12 text-center font-sans text-[12px] uppercase text-[#959597]"
                  style={{ gridColumn: "1 / -1" }}
                >
                  No sales activity in this range
                </div>
              ) : (
                visibleReps.map((rep) => {
                  const count = weekCountByRep.get(rep.id) ?? 0;
                  return (
                    <React.Fragment key={rep.id}>
                      <div className="border-b border-divider bg-[#121212] px-3 py-3">
                        <p className="font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                          {rep.name}
                        </p>
                        <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                          {count} This Week
                        </p>
                      </div>
                      {days.map((d) => {
                        const key = dayKey(d);
                        const cellEvents = eventsForCell(rep.id, key);
                        return (
                          <div
                            key={`${rep.id}-${key}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              handleEmptySlot(
                                key,
                                reschedulePick?.hour ?? 9,
                                rep.id,
                                rep.name,
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              handleEmptySlot(
                                key,
                                reschedulePick?.hour ?? 9,
                                rep.id,
                                rep.name,
                              );
                            }}
                            className={cn(
                              "min-h-[96px] cursor-pointer space-y-1.5 border-b border-l border-divider p-1.5 align-top hover:bg-white/[0.02]",
                              reschedulePick && "hover:bg-[#E8C47C]/10",
                            )}
                          >
                            {cellEvents.map((ev) => (
                              <EventCard
                                key={ev.id}
                                ev={ev}
                                onOpen={() => openEventDetail(ev)}
                                onDragStart={() => startReschedule(ev)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-divider px-4 py-3 sm:px-5">
            {legendItems.map((item) => (
              <div key={item.key} className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-sm",
                    item.dashed && "border border-dashed bg-transparent",
                    !item.dashed && item.key === "conflict" && "border-2 bg-transparent",
                  )}
                  style={{
                    backgroundColor: item.dashed
                      ? "transparent"
                      : item.key === "conflict"
                        ? "transparent"
                        : item.bg,
                    borderColor: item.border,
                  }}
                />
                <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewActivityModal
        open={newOpen}
        prefill={newPrefill}
        customers={customers}
        reps={modalReps}
        busy={creating}
        onClose={() => {
          setNewOpen(false);
          setNewPrefill(null);
          setPendingCreate(null);
        }}
        onCreate={handleCreate}
      />

      <EventDetailPopover
        open={eventOpen}
        data={eventData}
        onClose={() => {
          setEventOpen(false);
        }}
        onReschedule={() => {
          if (activeEvent) startReschedule(activeEvent);
        }}
        onOpen={() => {
          if (eventData?.href) router.push(eventData.href);
        }}
      />

      <RescheduleConfirmModal
        open={Boolean(rescheduleConfirm) && !conflictOpen && !failedOpen}
        description={rescheduleDescription}
        busy={rescheduling}
        onClose={() => setRescheduleConfirm(null)}
        onConfirm={handleConfirmReschedule}
      />

      <SchedulingConflictModal
        open={conflictOpen}
        message={conflictMessage}
        busy={rescheduling || creating}
        primaryLabel={
          conflictMode === "create" ? "Create Anyway" : "Reschedule Anyway"
        }
        onClose={() => {
          setConflictOpen(false);
          setPendingCreate(null);
          if (conflictMode === "reschedule") {
            setRescheduleConfirm(null);
            setReschedulePick(null);
          }
        }}
        onPickAnotherTime={() => {
          setConflictOpen(false);
          setPendingCreate(null);
          if (conflictMode === "reschedule") {
            setRescheduleConfirm(null);
          }
        }}
        onForce={async () => {
          if (conflictMode === "create" && pendingCreate) {
            await persistCreate({ ...pendingCreate, force: true });
            return;
          }
          await persistReschedule();
        }}
      />

      <RescheduleFailedModal
        open={failedOpen}
        message={failedMessage}
        busy={rescheduling}
        onClose={() => {
          setFailedOpen(false);
          setReschedulePick(null);
          setRescheduleConfirm(null);
        }}
        onRetry={() => void persistReschedule()}
      />
    </div>
  );
}
