"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardMenuPopover,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmSalesActivity } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  EventDetailPopover,
  NewActivityModal,
  RescheduleConfirmModal,
  RescheduleHintBar,
  type EventPopoverData,
  type NewActivityPrefill,
} from "./sales-calendar-overlays";

type CalView = "day" | "week" | "month";
type TabId = "training" | "calendar" | "activities";

type CalEvent = {
  id: string;
  repId: string;
  repName: string;
  dayKey: string;
  hour: number;
  label: string;
  kind: "CALL" | "VISIT" | "MEETING" | "FOLLOW_UP" | "TASK" | "OTHER";
  href: string;
  customer: string;
  subject: string;
  status: string;
  activityAt: string;
  type: string;
  duration?: string | null;
};

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

const KIND_STYLE: Record<
  CalEvent["kind"],
  { bg: string; border: string; label: string }
> = {
  CALL: { bg: "#1F3A2E", border: "#22C55E", label: "Call" },
  VISIT: { bg: "#3A2E1A", border: "#E8C47C", label: "Visit" },
  MEETING: { bg: "#3A1515", border: "#FF6B6B", label: "Meeting" },
  FOLLOW_UP: { bg: "#2A2A2A", border: "#959597", label: "Follow-up" },
  TASK: { bg: "transparent", border: "#38BDF8", label: "Task" },
  OTHER: { bg: "#2A2A2A", border: "#3E3E3E", label: "Other" },
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
  return d.toISOString().slice(0, 10);
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

function formatHour(h: number) {
  if (h === 0) return "12AM";
  if (h === 12) return "12PM";
  if (h < 12) return `${h}AM`;
  return `${h - 12}PM`;
}

function shortRepName(first?: string | null, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f && l) return `${f.charAt(0)}. ${l}`.toUpperCase();
  return (l || f || "Unknown").toUpperCase();
}

function activityKind(a: CrmSalesActivity): CalEvent["kind"] {
  if (a.followUpAt) return "FOLLOW_UP";
  const t = (a.type ?? "").toUpperCase();
  if (t === "CALL" || t === "VISIT" || t === "MEETING") return t;
  if (t === "EMAIL" || t === "OTHER") return "TASK";
  return "OTHER";
}

function formatEventTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${h12}${mm}${am ? "A" : "P"}`;
}

function formatHourAm(h: number, m = 0) {
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${h12}${mm}${am ? "A" : "P"}`;
}

function formatSlotLabel(day: string, hour: number) {
  const d = new Date(`${day}T12:00:00`);
  const wd = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const md = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }).toUpperCase();
  return `${wd}, ${md} · ${formatHourAm(hour)} · Empty slot`;
}

function formatWhenRange(iso: string, duration?: string | null) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const wd = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const md = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  const start = formatHourAm(d.getHours(), d.getMinutes());
  let endH = d.getHours() + 1;
  let endM = d.getMinutes();
  const dur = (duration ?? "").toUpperCase();
  if (dur.includes("15")) endM += 15;
  else if (dur.includes("30")) endM += 30;
  else if (dur.includes("2")) endH += 2;
  else endH += 1;
  if (endM >= 60) {
    endH += 1;
    endM -= 60;
  }
  const end = formatHourAm(endH % 24, endM);
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

function mapActivity(a: CrmSalesActivity): CalEvent | null {
  const when = new Date(a.activityAt);
  if (Number.isNaN(when.getTime())) return null;
  const repId = a.rep?.id ?? "unassigned";
  const repName = shortRepName(a.rep?.firstName, a.rep?.lastName);
  const kind = activityKind(a);
  const customer = (a.customer?.name ?? "Activity").toUpperCase();
  const time = formatEventTime(a.activityAt);
  const typeLabel =
    kind === "FOLLOW_UP"
      ? "FOLLOW-UP"
      : kind === "TASK"
        ? "TASK"
        : kind;
  return {
    id: a.id,
    repId,
    repName: repId === "unassigned" ? "UNASSIGNED" : repName,
    dayKey: dayKey(when),
    hour: when.getHours(),
    label: `${customer} · ${typeLabel}${time ? ` · ${time}` : ""}`,
    kind,
    href: `/crm/sales/${a.id}`,
    customer,
    subject: (a.subject ?? a.notes ?? "—").toUpperCase(),
    status: (a.status ?? "SCHEDULED").toUpperCase(),
    activityAt: a.activityAt,
    type: a.type ?? "CALL",
    duration: a.duration,
  };
}

function hourBucket(hour: number) {
  let best = HOURS[0]!;
  for (const h of HOURS) {
    if (hour >= h) best = h;
  }
  return best;
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
        const from = new Date(rangeFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(rangeTo);
        to.setHours(23, 59, 59, 999);
        const res = await crmApi.listSalesActivities({
          from: dayKey(from),
          to: dayKey(to),
          page: 1,
          pageSize: 200,
          sort: "activityAt",
          direction: "asc",
        });
        if (cancelled) return;
        const mapped = (res.data.items ?? [])
          .map(mapActivity)
          .filter((e): e is CalEvent => Boolean(e));
        setEvents(mapped);
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
    setAnchor(view === "month" ? startOfMonth(today) : view === "week" ? startOfWeek(today) : today);
  }

  function eventsAt(repId: string, day: string, hour: number) {
    return visibleEvents.filter(
      (e) =>
        e.repId === repId && e.dayKey === day && hourBucket(e.hour) === hour,
    );
  }

  function openEventDetail(ev: CalEvent) {
    const style = KIND_STYLE[ev.kind];
    setActiveEvent(ev);
    setEventData({
      id: ev.id,
      customer: ev.customer,
      subtitle: `${style.label} · ${ev.subject}`,
      when: formatWhenRange(ev.activityAt, ev.duration),
      rep: ev.repName,
      status: ev.status,
      href: ev.href,
      kindLabel: style.label,
      fromLabel: formatMoveLabel(ev.activityAt),
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

  async function handleCreate(payload: {
    type: string;
    customerId: string;
    repId: string;
    date: string;
    time: string;
    duration: string;
    notes: string;
    file?: File | null;
  }) {
    setCreating(true);
    try {
      const activityAt = new Date(
        `${payload.date}T${payload.time}:00`,
      ).toISOString();
      await crmApi.createSalesActivity({
        type: payload.type,
        customerId: payload.customerId,
        repId: payload.repId || undefined,
        activityAt,
        duration: payload.duration,
        notes: payload.notes || undefined,
        status: "COMPLETE",
        subject: payload.notes?.slice(0, 120) || payload.type,
      });
      toastSuccess("Activity created");
      setNewOpen(false);
      setNewPrefill(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmReschedule() {
    if (!reschedulePick || !rescheduleConfirm) return;
    setRescheduling(true);
    try {
      const hh = String(rescheduleConfirm.hour).padStart(2, "0");
      const activityAt = new Date(
        `${rescheduleConfirm.dayKey}T${hh}:00:00`,
      ).toISOString();
      await crmApi.updateSalesActivity(reschedulePick.id, { activityAt });
      toastSuccess("Activity rescheduled");
      setRescheduleConfirm(null);
      setReschedulePick(null);
      setActiveEvent(null);
      setEventData(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setRescheduling(false);
    }
  }

  const rescheduleDescription = React.useMemo(() => {
    if (!reschedulePick || !rescheduleConfirm) return "";
    const hh = String(rescheduleConfirm.hour).padStart(2, "0");
    const toIso = `${rescheduleConfirm.dayKey}T${hh}:00:00`;
    const kind = KIND_STYLE[reschedulePick.kind].label;
    return `Move ${reschedulePick.customer} (${kind}) from ${formatMoveLabel(reschedulePick.activityAt)} to ${formatMoveLabel(toIso)}.`;
  }, [reschedulePick, rescheduleConfirm]);

  const leftTabs: { id: TabId; label: string }[] = [
    { id: "training", label: "Training" },
  ];
  const rightTabs: { id: TabId; label: string }[] = [
    { id: "calendar", label: "Calendar" },
    { id: "activities", label: "Activities" },
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
        {[...leftTabs, ...rightTabs].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === "activities") {
                router.push("/crm/sales");
                return;
              }
              setTab(t.id);
            }}
            className={cn(
              "rounded-lg px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] transition-colors",
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
              Training / Follow-ups
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Follow-up activities in this range
            </p>
          </div>
          <div className="divide-y divide-divider">
            {visibleEvents.filter((e) => e.kind === "FOLLOW_UP" || e.kind === "TASK").length ===
            0 ? (
              <p className="px-4 py-10 text-center font-sans text-[12px] uppercase text-[#959597]">
                No training or follow-up items in this range
              </p>
            ) : (
              visibleEvents
                .filter((e) => e.kind === "FOLLOW_UP" || e.kind === "TASK")
                .map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openEventDetail(ev)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {ev.customer}
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
              className="min-w-[640px] md:min-w-[880px]"
              style={{
                display: "grid",
                gridTemplateColumns: `120px repeat(${days.length}, minmax(140px, 1fr))`,
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
                  style={{ gridColumn: `1 / -1` }}
                >
                  No sales activity in this range
                </div>
              ) : (
                visibleReps.map((rep) => (
                  <React.Fragment key={rep.id}>
                    <div className="border-b border-divider bg-[#121212] px-3 py-2">
                      <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {rep.name}
                      </p>
                    </div>
                    {days.map((d) => (
                      <div
                        key={`${rep.id}-${dayKey(d)}-label`}
                        className="border-b border-l border-divider bg-[#121212]"
                      />
                    ))}

                    {(["all", ...HOURS] as const).map((slot) => (
                      <React.Fragment key={`${rep.id}-${slot}`}>
                        <div className="border-b border-divider px-3 py-2 font-sans text-[10px] uppercase tabular-nums text-[#959597]">
                          {slot === "all" ? "All day" : formatHour(slot)}
                        </div>
                        {days.map((d) => {
                          const key = dayKey(d);
                          const cellEvents =
                            slot === "all"
                              ? []
                              : eventsAt(rep.id, key, slot);
                          return (
                            <div
                              key={`${rep.id}-${key}-${slot}`}
                              role={
                                slot !== "all" && cellEvents.length === 0
                                  ? "button"
                                  : undefined
                              }
                              tabIndex={
                                slot !== "all" && cellEvents.length === 0
                                  ? 0
                                  : undefined
                              }
                              onClick={() => {
                                if (slot === "all" || cellEvents.length > 0)
                                  return;
                                handleEmptySlot(key, slot, rep.id, rep.name);
                              }}
                              onKeyDown={(e) => {
                                if (slot === "all" || cellEvents.length > 0)
                                  return;
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleEmptySlot(key, slot, rep.id, rep.name);
                                }
                              }}
                              className={cn(
                                "min-h-[44px] space-y-1 border-b border-l border-divider p-1.5",
                                slot !== "all" &&
                                  cellEvents.length === 0 &&
                                  "cursor-pointer hover:bg-white/[0.02]",
                                reschedulePick &&
                                  slot !== "all" &&
                                  cellEvents.length === 0 &&
                                  "hover:bg-[#E8C47C]/10",
                              )}
                            >
                              {cellEvents.map((ev) => {
                                const style = KIND_STYLE[ev.kind];
                                return (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEventDetail(ev);
                                    }}
                                    className={cn(
                                      "block w-full truncate rounded-md px-2 py-1 text-left font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FDFDFF]",
                                      ev.kind === "TASK" &&
                                        "border border-dashed",
                                    )}
                                    style={{
                                      backgroundColor: style.bg,
                                      borderColor: style.border,
                                      boxShadow:
                                        ev.kind === "TASK"
                                          ? undefined
                                          : `inset 0 0 0 1px ${style.border}33`,
                                    }}
                                  >
                                    {ev.label}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-divider px-4 py-3 sm:px-5">
            {(
              [
                "CALL",
                "VISIT",
                "MEETING",
                "FOLLOW_UP",
                "TASK",
              ] as CalEvent["kind"][]
            ).map((kind) => {
              const style = KIND_STYLE[kind];
              return (
                <div key={kind} className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block h-3 w-3 rounded-sm",
                      kind === "TASK" && "border border-dashed bg-transparent",
                    )}
                    style={{
                      backgroundColor:
                        kind === "TASK" ? "transparent" : style.border,
                      borderColor: style.border,
                    }}
                  />
                  <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                    {style.label}
                  </span>
                </div>
              );
            })}
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
          if (activeEvent) setReschedulePick(activeEvent);
          setEventOpen(false);
        }}
        onOpen={() => {
          if (eventData?.href) router.push(eventData.href);
        }}
      />

      <RescheduleConfirmModal
        open={Boolean(rescheduleConfirm)}
        description={rescheduleDescription}
        busy={rescheduling}
        onClose={() => setRescheduleConfirm(null)}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
}
