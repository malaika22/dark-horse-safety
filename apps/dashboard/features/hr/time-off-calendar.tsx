"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import type { HrTimeOffCalendarEvent } from "@/lib/hr-api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function typeTone(type: string) {
  const t = type.toUpperCase();
  if (t === "SICK") return "border-[#F59E0B]/60 bg-[#3F2E14] text-[#FBBF24]";
  if (t === "UNPAID") return "border-[#6B6B6B] bg-[#2A2A2A] text-[#C4C4C4]";
  if (t === "BEREAVEMENT")
    return "border-[#22C55E]/50 bg-[#16351F] text-[#34D399]";
  return "border-[#3B82F6]/60 bg-[#0F1B2D] text-[#93C5FD]";
}

function typeDot(type: string) {
  const t = type.toUpperCase();
  if (t === "SICK") return "bg-[#F59E0B]";
  if (t === "UNPAID") return "bg-[#959597]";
  if (t === "BEREAVEMENT") return "bg-[#22C55E]";
  return "bg-[#3B82F6]";
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function spansDay(ev: HrTimeOffCalendarEvent, year: number, month: number, day: number) {
  const start = parseIso(ev.startDate);
  const end = parseIso(ev.endDate);
  const cur = Date.UTC(year, month - 1, day);
  const s = Date.UTC(start.y, start.m - 1, start.d);
  const e = Date.UTC(end.y, end.m - 1, end.d);
  return cur >= s && cur <= e;
}

export function TimeOffCalendarView({
  year,
  month,
  monthLabel,
  events,
  onEventClick,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  monthLabel: string;
  events: HrTimeOffCalendarEvent[];
  onEventClick?: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const totalDays = daysInMonth(year, month);
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDow; i += 1) cells.push({ day: null });
  for (let d = 1; d <= totalDays; d += 1) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <div className="overflow-hidden rounded-xl bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2D2D30] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] text-[#FDFDFF]"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="min-w-[140px] text-center font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] text-[#FDFDFF]"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[
            ["PTO", "PTO"],
            ["SICK", "Sick"],
            ["UNPAID", "Unpaid"],
            ["BEREAVEMENT", "Bereavement"],
          ].map(([type, label]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase text-[#959597]"
            >
              <span className={cn("h-2 w-2 rounded-full", typeDot(type))} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[#2D2D30]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center font-sans text-[10px] uppercase text-[#6B6B6B]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dayEvents =
            cell.day == null
              ? []
              : events.filter((ev) => spansDay(ev, year, month, cell.day!));
          return (
            <div
              key={idx}
              className="min-h-[96px] border-b border-r border-[#2D2D30] p-1.5 last:border-r-0"
            >
              {cell.day != null ? (
                <>
                  <p className="mb-1 font-sans text-[10px] uppercase text-[#959597]">
                    {cell.day}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={`${ev.id}-${cell.day}`}
                        type="button"
                        onClick={() => onEventClick?.(ev.id)}
                        className={cn(
                          "block w-full truncate rounded border px-1.5 py-0.5 text-left font-sans text-[9px] font-[510] uppercase tracking-[-0.01em]",
                          typeTone(ev.type),
                        )}
                        title={`${ev.employeeName} · ${ev.type}`}
                      >
                        {ev.employeeName}
                      </button>
                    ))}
                    {dayEvents.length > 3 ? (
                      <p className="px-1 font-sans text-[9px] uppercase text-[#6B6B6B]">
                        +{dayEvents.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
