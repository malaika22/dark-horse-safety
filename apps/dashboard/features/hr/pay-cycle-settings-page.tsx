"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrPayCycleHoliday,
  type HrPayCycleOverview,
  type HrPayCycleRow,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";

function LightningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2L4 14h7l-1 8 10-14h-7l1-6z" fill="currentColor" />
    </svg>
  );
}

function SectionCard({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-panel", className)}>
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
            <LightningIcon />
          </span>
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
        </div>
        {meta ? (
          <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="px-4 pb-4 pt-2 sm:px-5">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "OPEN"
      ? "bg-[#C9A227] text-[#111111]"
      : s === "UPCOMING"
        ? "bg-[#203B2C] text-[#ACEBCE]"
        : s === "CLOSED"
          ? "bg-[#3B2A55] text-[#D4C4F0]"
          : "bg-[#2A2A2A] text-[#959597]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone,
      )}
    >
      {s}
    </span>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      />
    </label>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-sans text-[10px] uppercase text-[#959597]">
        {label}
      </span>
      <span className="text-right font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function hoursLabel(n: number | null | undefined) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}H`;
}

export function PayCycleSettingsPage() {
  const { askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<HrPayCycleOverview | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [otDraft, setOtDraft] = React.useState<HrPayCycleOverview["overtime"] | null>(
    null,
  );
  const [savingOt, setSavingOt] = React.useState(false);
  const [ptoOpen, setPtoOpen] = React.useState(false);
  const [cadenceOpen, setCadenceOpen] = React.useState(false);
  const [holidayEdit, setHolidayEdit] = React.useState<HrPayCycleHoliday | null>(
    null,
  );
  const [ptoDraft, setPtoDraft] = React.useState<HrPayCycleOverview["ptoRules"] | null>(
    null,
  );
  const [cadenceDraft, setCadenceDraft] = React.useState<
    HrPayCycleOverview["cadence"] | null
  >(null);
  const [holidayDraft, setHolidayDraft] = React.useState({
    name: "",
    hoursCredited: "8",
  });

  const year = data?.year ?? new Date().getFullYear();

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await hrApi.payCycleSettings(year);
        if (cancelled) return;
        setData(res.data);
        setOtDraft(res.data.overtime);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, year]);

  useSetHeaderBreadcrumb("Employees & HR / Pay Cycle Setting");

  const addNote = React.useCallback(() => {
    void (async () => {
      const text = await askPrompt({
        title: "Add Note",
        label: "Note",
        placeholder: "Enter note…",
        confirmLabel: "Add",
      });
      if (text == null || !text.trim()) return;
      try {
        await hrApi.addPayCycleNote(text.trim());
        toastSuccess("Note added");
        setReloadKey((k) => k + 1);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [askPrompt]);

  const saveOvertime = React.useCallback(() => {
    if (!otDraft) return;
    void (async () => {
      setSavingOt(true);
      try {
        await hrApi.updatePayCycleOvertime({
          dailyOtThresholdHrs: Number(otDraft.dailyOtThresholdHrs),
          weeklyOtThresholdHrs: Number(otDraft.weeklyOtThresholdHrs),
          otMultiplier: Number(otDraft.otMultiplier),
          doubleTimeAfterHrs: Number(otDraft.doubleTimeAfterHrs),
          minBillableBlock: otDraft.minBillableBlock,
          roundTo: otDraft.roundTo,
        });
        toastSuccess("Overtime rules saved");
        setReloadKey((k) => k + 1);
      } catch (err) {
        toastApiError(err);
      } finally {
        setSavingOt(false);
      }
    })();
  }, [otDraft]);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DashboardToolbarButton onClick={addNote}>+ Add Note</DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        disabled={!otDraft || savingOt}
        onClick={saveOvertime}
      >
        Save Rules
      </DashboardToolbarButton>
    </div>,
    [addNote, otDraft, savingOt, saveOvertime],
  );

  async function closeCycle(row: HrPayCycleRow) {
    try {
      await hrApi.closePayCycle(row.id);
      toastSuccess(`Closed ${row.cycleLabel}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function resyncCycle(id: string) {
    try {
      await hrApi.resyncPayCycle(id);
      toastSuccess("Cycle resynced");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  function openPtoEdit() {
    if (!data) return;
    setPtoDraft({ ...data.ptoRules });
    setPtoOpen(true);
  }

  function openCadenceEdit() {
    if (!data) return;
    setCadenceDraft({ ...data.cadence });
    setCadenceOpen(true);
  }

  function openHolidayEdit(h: HrPayCycleHoliday) {
    setHolidayEdit(h);
    setHolidayDraft({
      name: h.name,
      hoursCredited: String(h.hoursCredited),
    });
  }

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-5">
        <p className="font-sans text-[12px] uppercase text-[#959597]">Loading…</p>
      </div>
    );
  }

  if (!data || !otDraft) {
    return (
      <div className="p-4 sm:p-5">
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Failed to load pay cycle settings.
        </p>
      </div>
    );
  }

  const current = data.currentCycle;

  return (
    <>
      <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
        <div className="flex flex-col gap-2 rounded-xl bg-panel px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:text-[18px]">
              Pay Cycle Settings
            </h1>
            <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {data.headerSubtitle}
            </p>
          </div>
        </div>

        <SectionCard
          title="Pay Cycles"
          meta={`${data.year} — ${data.cycleCount} Cycles`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left">
                  {[
                    "Cycle",
                    "Date Range",
                    "Lock Time",
                    "Status",
                    "Hours",
                    "Amount",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cycles.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-[#2A2A2A] last:border-0",
                      row.isCurrent && "bg-[#1A2744]",
                    )}
                  >
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {row.cycleLabel}
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {row.dateRange}
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#959597]">
                      {row.lockTime}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {hoursLabel(row.hours)}
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {money(row.amount)}
                    </td>
                    <td className="px-2 py-3">
                      {row.status === "OPEN" ? (
                        <DashboardToolbarButton
                          variant="primary"
                          onClick={() => void closeCycle(row)}
                        >
                          Close Cycle
                        </DashboardToolbarButton>
                      ) : (
                        <DashboardToolbarButton
                          onClick={() =>
                            toastSuccess(
                              `${row.cycleLabel}: ${row.dateRange}`,
                            )
                          }
                        >
                          View
                        </DashboardToolbarButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Time & Overtime Rules"
          meta="Applies to current & upcoming cycles"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldInput
              label="Daily Overtime Threshold"
              value={`${otDraft.dailyOtThresholdHrs} HRS`}
              onChange={(v) =>
                setOtDraft((d) =>
                  d
                    ? {
                        ...d,
                        dailyOtThresholdHrs: Number(
                          v.replace(/[^\d.]/g, ""),
                        ) || 0,
                      }
                    : d,
                )
              }
            />
            <FieldInput
              label="Weekly Overtime Threshold"
              value={`${otDraft.weeklyOtThresholdHrs} HRS`}
              onChange={(v) =>
                setOtDraft((d) =>
                  d
                    ? {
                        ...d,
                        weeklyOtThresholdHrs: Number(
                          v.replace(/[^\d.]/g, ""),
                        ) || 0,
                      }
                    : d,
                )
              }
            />
            <FieldInput
              label="OT Multiplier"
              value={`${otDraft.otMultiplier}X`}
              onChange={(v) =>
                setOtDraft((d) =>
                  d
                    ? {
                        ...d,
                        otMultiplier: Number(v.replace(/[^\d.]/g, "")) || 0,
                      }
                    : d,
                )
              }
            />
            <FieldInput
              label="Double Time After"
              value={`${otDraft.doubleTimeAfterHrs} HRS`}
              onChange={(v) =>
                setOtDraft((d) =>
                  d
                    ? {
                        ...d,
                        doubleTimeAfterHrs: Number(
                          v.replace(/[^\d.]/g, ""),
                        ) || 0,
                      }
                    : d,
                )
              }
            />
            <FieldInput
              label="Min Billable Block"
              value={otDraft.minBillableBlock}
              onChange={(v) =>
                setOtDraft((d) => (d ? { ...d, minBillableBlock: v } : d))
              }
            />
            <FieldInput
              label="Round To"
              value={otDraft.roundTo}
              onChange={(v) =>
                setOtDraft((d) => (d ? { ...d, roundTo: v } : d))
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title={`Observed Holidays — ${data.year}`}
          meta={data.holidaysMeta}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left">
                  {["Date", "Holiday", "Hours Credited", "Quick Action"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-2 py-2.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.holidays.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-[#2A2A2A] last:border-0"
                  >
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {h.dateLabel}
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {h.name}
                    </td>
                    <td className="px-2 py-3 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {hoursLabel(h.hoursCredited)}
                    </td>
                    <td className="px-2 py-3">
                      <DashboardToolbarButton onClick={() => openHolidayEdit(h)}>
                        Edit
                      </DashboardToolbarButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title={
              current
                ? `Current Cycle — ${current.code}`
                : "Current Cycle"
            }
          >
            {current ? (
              <>
                <p className="font-sans text-[11px] uppercase text-[#C8C8C8]">
                  {current.dateRange}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                  {current.status} — {current.activeEmployees} Active Employees
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#2A2A2A] pt-3">
                  <MetaRow
                    label="Days Remaining"
                    value={String(current.daysRemaining)}
                  />
                  <MetaRow
                    label="Total Hours"
                    value={hoursLabel(current.totalHours)}
                  />
                  <MetaRow
                    label="Pending Edits"
                    value={String(current.pendingEdits)}
                  />
                  <MetaRow
                    label="Locked Entries"
                    value={String(current.lockedEntries)}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <DashboardToolbarButton
                    onClick={() => {
                      const row = data.cycles.find((c) => c.id === current.id);
                      if (row) void closeCycle(row);
                    }}
                  >
                    Close Cycle
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    variant="primary"
                    onClick={() => void resyncCycle(current.id)}
                  >
                    Resync
                  </DashboardToolbarButton>
                </div>
              </>
            ) : (
              <p className="py-4 text-center font-sans text-[11px] uppercase text-[#959597]">
                No open cycle.
              </p>
            )}
          </SectionCard>

          <SectionCard title="PTO / Sick Rules">
            <div className="space-y-0.5">
              <MetaRow
                label="Annual PTO"
                value={`${data.ptoRules.annualPtoDays} Days`}
              />
              <MetaRow
                label="Accrual Rate"
                value={`${data.ptoRules.accrualRatePerPeriod} Days / Pay Period`}
              />
              <MetaRow
                label="Annual Sick"
                value={`${data.ptoRules.annualSickDays} Days`}
              />
              <MetaRow
                label="Carryover Cap"
                value={`${data.ptoRules.carryoverCapDays} Days`}
              />
              <MetaRow
                label="Notice Required"
                value={`${data.ptoRules.noticeRequiredDays} Days`}
              />
              <MetaRow label="Blackout" value={data.ptoRules.blackout} />
            </div>
            <div className="mt-4">
              <DashboardToolbarButton
                className="w-full justify-center"
                onClick={openPtoEdit}
              >
                Edit Rules
              </DashboardToolbarButton>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Cycle Cadence & Approval">
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <MetaRow label="Cadence" value={data.cadence.cadence} />
            <MetaRow
              label="Cycle Length"
              value={`${data.cadence.cycleLengthDays} Days`}
            />
            <MetaRow label="Lock Time" value={data.cadence.lockTime} />
            <MetaRow
              label="Auto-Approve Rules"
              value={data.cadence.autoApproveRules}
            />
            <MetaRow
              label="Grace Period"
              value={`${data.cadence.gracePeriodDays} Days Post Cycle-End`}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <DashboardToolbarButton onClick={openCadenceEdit}>
              Edit Cadence
            </DashboardToolbarButton>
          </div>
        </SectionCard>
      </div>

      <DashboardModal
        open={ptoOpen}
        onClose={() => setPtoOpen(false)}
        title="Edit PTO / Sick Rules"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setPtoOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                if (!ptoDraft) return;
                void (async () => {
                  try {
                    await hrApi.updatePayCyclePto(ptoDraft);
                    toastSuccess("PTO rules saved");
                    setPtoOpen(false);
                    setReloadKey((k) => k + 1);
                  } catch (err) {
                    toastApiError(err);
                  }
                })();
              }}
            >
              Save
            </DashboardToolbarButton>
          </div>
        }
      >
        {ptoDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Annual PTO (Days)"
              value={String(ptoDraft.annualPtoDays)}
              onChange={(v) =>
                setPtoDraft((d) =>
                  d ? { ...d, annualPtoDays: Number(v) || 0 } : d,
                )
              }
            />
            <FieldInput
              label="Accrual Rate / Period"
              value={String(ptoDraft.accrualRatePerPeriod)}
              onChange={(v) =>
                setPtoDraft((d) =>
                  d ? { ...d, accrualRatePerPeriod: Number(v) || 0 } : d,
                )
              }
            />
            <FieldInput
              label="Annual Sick (Days)"
              value={String(ptoDraft.annualSickDays)}
              onChange={(v) =>
                setPtoDraft((d) =>
                  d ? { ...d, annualSickDays: Number(v) || 0 } : d,
                )
              }
            />
            <FieldInput
              label="Carryover Cap (Days)"
              value={String(ptoDraft.carryoverCapDays)}
              onChange={(v) =>
                setPtoDraft((d) =>
                  d ? { ...d, carryoverCapDays: Number(v) || 0 } : d,
                )
              }
            />
            <FieldInput
              label="Notice Required (Days)"
              value={String(ptoDraft.noticeRequiredDays)}
              onChange={(v) =>
                setPtoDraft((d) =>
                  d ? { ...d, noticeRequiredDays: Number(v) || 0 } : d,
                )
              }
            />
            <FieldInput
              label="Blackout"
              value={ptoDraft.blackout}
              onChange={(v) =>
                setPtoDraft((d) => (d ? { ...d, blackout: v } : d))
              }
            />
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        open={cadenceOpen}
        onClose={() => setCadenceOpen(false)}
        title="Edit Cadence"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setCadenceOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                if (!cadenceDraft) return;
                void (async () => {
                  try {
                    await hrApi.updatePayCycleCadence(cadenceDraft);
                    toastSuccess("Cadence saved");
                    setCadenceOpen(false);
                    setReloadKey((k) => k + 1);
                  } catch (err) {
                    toastApiError(err);
                  }
                })();
              }}
            >
              Save
            </DashboardToolbarButton>
          </div>
        }
      >
        {cadenceDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Cadence"
              value={cadenceDraft.cadence}
              onChange={(v) =>
                setCadenceDraft((d) => (d ? { ...d, cadence: v } : d))
              }
            />
            <FieldInput
              label="Cycle Length (Days)"
              value={String(cadenceDraft.cycleLengthDays)}
              onChange={(v) =>
                setCadenceDraft((d) =>
                  d ? { ...d, cycleLengthDays: Number(v) || 14 } : d,
                )
              }
            />
            <FieldInput
              label="Lock Time"
              value={cadenceDraft.lockTime}
              onChange={(v) =>
                setCadenceDraft((d) => (d ? { ...d, lockTime: v } : d))
              }
            />
            <FieldInput
              label="Auto-Approve Rules"
              value={cadenceDraft.autoApproveRules}
              onChange={(v) =>
                setCadenceDraft((d) =>
                  d ? { ...d, autoApproveRules: v } : d,
                )
              }
            />
            <FieldInput
              label="Grace Period (Days)"
              value={String(cadenceDraft.gracePeriodDays)}
              onChange={(v) =>
                setCadenceDraft((d) =>
                  d ? { ...d, gracePeriodDays: Number(v) || 0 } : d,
                )
              }
            />
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        open={Boolean(holidayEdit)}
        onClose={() => setHolidayEdit(null)}
        title="Edit Holiday"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setHolidayEdit(null)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                if (!holidayEdit) return;
                void (async () => {
                  try {
                    await hrApi.updatePayCycleHoliday(holidayEdit.id, {
                      name: holidayDraft.name,
                      hoursCredited: Number(holidayDraft.hoursCredited) || 0,
                    });
                    toastSuccess("Holiday updated");
                    setHolidayEdit(null);
                    setReloadKey((k) => k + 1);
                  } catch (err) {
                    toastApiError(err);
                  }
                })();
              }}
            >
              Save
            </DashboardToolbarButton>
          </div>
        }
      >
        <div className="grid gap-3">
          <FieldInput
            label="Holiday"
            value={holidayDraft.name}
            onChange={(v) => setHolidayDraft((d) => ({ ...d, name: v }))}
          />
          <FieldInput
            label="Hours Credited"
            value={holidayDraft.hoursCredited}
            onChange={(v) =>
              setHolidayDraft((d) => ({ ...d, hoursCredited: v }))
            }
          />
        </div>
      </DashboardModal>

      {dialogs}
    </>
  );
}
