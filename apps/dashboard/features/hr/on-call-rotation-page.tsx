"use client";

import * as React from "react";
import {
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrOnCallAssignment,
  type HrOnCallMonth,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  AssignmentDetailModal,
  GenerateRotationModal,
  SwapRequestModal,
} from "@/features/hr/on-call-modals";

const EMPTY: HrOnCallMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  monthLabel: "",
  kpis: {
    onCallToday: "—",
    onCallTodayMeta: "—",
    unassignedDays: 0,
    unassignedMeta: "This month",
    swapRequests: 0,
    swapMeta: "Pending review",
  },
  calendar: {
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    cells: [],
  },
  techCounts: [],
};

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 12h15M12 4c2.5 2.8 3.8 5.5 3.8 8s-1.3 5.2-3.8 8c-2.5-2.8-3.8-5.5-3.8-8s1.3-5.2 3.8-8z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 8a3 3 0 11.2 5.9M20.5 19c0-2.2-1.6-4-3.8-4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Zone badges — saturated fills matching Figma. */
function ZonePill({ zone }: { zone: string }) {
  const z = zone.toUpperCase();
  const tone =
    z === "NORTH"
      ? "bg-[#2563EB] text-white"
      : z === "SOUTH"
        ? "bg-[#16A34A] text-white"
        : "bg-[#D97706] text-white";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 font-sans text-[9px] font-[590] uppercase tracking-[-0.01em]",
        tone,
      )}
    >
      {z}
    </span>
  );
}

export function OnCallRotationPage() {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [data, setData] = React.useState<HrOnCallMonth>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [technicians, setTechnicians] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [swapOpen, setSwapOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<HrOnCallAssignment | null>(
    null,
  );

  useSetHeaderBreadcrumb("Employees & HR / On-Call Rotation");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [monthRes, poolRes] = await Promise.all([
          hrApi.onCallMonth({ year, month }),
          hrApi.onCallPool(),
        ]);
        if (cancelled) return;
        setData(monthRes.data);
        setTechnicians(poolRes.data.technicians);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, reloadKey]);

  const openGenerate = React.useCallback(() => setGenerateOpen(true), []);
  const publish = React.useCallback(async () => {
    try {
      const res = await hrApi.publishOnCall({ year, month });
      toastSuccess(`Published ${res.data.published} assignments`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }, [year, month]);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      <DashboardToolbarButton
        leftIcon={<GlobeIcon />}
        onClick={() => void publish()}
      >
        Publish to Mobile
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<PeopleIcon />}
        onClick={openGenerate}
      >
        Generate Rotation
      </DashboardToolbarButton>
    </div>,
    [openGenerate, publish],
  );

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  }

  function openCell(assignment: HrOnCallAssignment | null) {
    if (!assignment) return;
    setSelected(assignment);
    setDetailOpen(true);
  }

  const monthShort =
    data.monthLabel.split(" ")[0]?.toUpperCase() ||
    new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
      month: "long",
      timeZone: "UTC",
    });

  if (loading && data.calendar.cells.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="On-Call Today"
            value={data.kpis.onCallToday}
            meta={data.kpis.onCallTodayMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Unassigned Days"
            value={String(data.kpis.unassignedDays)}
            meta={data.kpis.unassignedMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Swap Requests"
            value={String(data.kpis.swapRequests)}
            meta={data.kpis.swapMeta}
            icon="time"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <section className="overflow-hidden rounded-xl border border-[#2D2D30] bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle
            icon="lightning"
            title={`On-Call Rotation — ${data.monthLabel}`}
            titleClassName="text-[12px] md:text-[13px]"
          />
          {/* Design: ‹  MONTH  › */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] bg-transparent font-sans text-[16px] text-[#FDFDFF] hover:bg-[#1A1A1A]"
              aria-label="Previous month"
            >
              ‹
            </button>
            <DashboardToolbarButton
              variant="primary"
              showChevron
              className="min-w-[88px]"
            >
              Month
            </DashboardToolbarButton>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] bg-transparent font-sans text-[16px] text-[#FDFDFF] hover:bg-[#1A1A1A]"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-[#2A2A2A] bg-[#161616]">
          {data.calendar.weekdays.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#8B9BB4]"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {data.calendar.cells.map((cell, idx) => {
            const a = cell.assignment;
            const unassigned = Boolean(cell.inMonth && a?.unassigned);
            const assigned = Boolean(cell.inMonth && a && !a.unassigned);
            return (
              <button
                key={`${cell.iso ?? "x"}-${idx}`}
                type="button"
                disabled={!cell.inMonth || !a}
                onClick={() => openCell(a)}
                className={cn(
                  "relative flex min-h-[108px] flex-col border-b border-r border-[#2A2A2A] p-2.5 text-left transition-colors last:border-r-0",
                  !cell.inMonth && "bg-[#0C0C0C]",
                  assigned && "bg-panel hover:bg-[#1A1A1A]",
                  unassigned &&
                    "border border-[#EF4444] bg-[#451A1A] hover:bg-[#521F1F]",
                )}
              >
                <span
                  className={cn(
                    "mb-1.5 font-sans text-[11px] font-[510] leading-none",
                    cell.inMonth ? "text-[#959597]" : "text-[#3A3A3A]",
                  )}
                >
                  {cell.day}
                </span>

                {unassigned ? (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="font-sans text-[10px] font-[590] uppercase tracking-[-0.01em] text-[#FDFDFF]">
                      Unassigned
                    </span>
                  </div>
                ) : null}

                {assigned && a ? (
                  <div className="mt-0.5 flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {a.employeeName}
                    </p>
                    {a.zone ? <ZonePill zone={a.zone} /> : null}
                    <p className="mt-auto truncate font-sans text-[9px] uppercase tracking-[-0.01em] text-[#6F6F72]">
                      {a.backupName ? `Backup: ${a.backupName}` : "Backup: —"}
                    </p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle
            icon="lightning"
            title={`Technician Assignment Counts — ${monthShort}`}
            titleClassName="text-[12px] md:text-[13px]"
          />
        </div>
        <div className="space-y-4 px-4 py-5">
          {data.techCounts.map((t) => (
            <div key={t.id} className="flex items-center gap-4">
              <span className="w-32 shrink-0 truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {t.name}
              </span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    t.barTone === "orange"
                      ? "bg-[#E8A070]"
                      : t.barTone === "blue"
                        ? "bg-[#5B8DEF]"
                        : "bg-[#6B6B6B]",
                  )}
                  style={{ width: `${Math.max(t.pct, 8)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]">
                {t.days} days
              </span>
            </div>
          ))}
          {data.techCounts.length === 0 ? (
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              No assignments this month
            </p>
          ) : null}
        </div>
      </section>

      <GenerateRotationModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onCreated={() => setReloadKey((k) => k + 1)}
      />
      <AssignmentDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        assignment={selected}
        technicians={technicians}
        onRequestSwap={() => {
          setDetailOpen(false);
          setSwapOpen(true);
        }}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
      <SwapRequestModal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        assignment={selected}
        technicians={technicians}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
