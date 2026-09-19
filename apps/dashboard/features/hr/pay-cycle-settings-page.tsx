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

const ROUND_TO_OPTIONS = [
  { value: "5 MIN", label: "5 MIN" },
  { value: "10 MIN", label: "10 MIN" },
  { value: "15 MIN", label: "15 MIN" },
  { value: "30 MIN", label: "30 MIN" },
];

type OtDraft = {
  dailyOtThresholdHrs: string;
  weeklyOtThresholdHrs: string;
  otMultiplier: string;
  doubleTimeAfterHrs: string;
  minBillableBlock: string;
  roundTo: string;
};

const EMPTY_OT: OtDraft = {
  dailyOtThresholdHrs: "",
  weeklyOtThresholdHrs: "",
  otMultiplier: "",
  doubleTimeAfterHrs: "",
  minBillableBlock: "",
  roundTo: "",
};

type PtoDraft = {
  annualPtoDays: string;
  accrualRatePerPeriod: string;
  annualSickDays: string;
  carryoverCapDays: string;
  noticeRequiredDays: string;
  blackout: string;
};

const EMPTY_PTO: PtoDraft = {
  annualPtoDays: "",
  accrualRatePerPeriod: "",
  annualSickDays: "",
  carryoverCapDays: "",
  noticeRequiredDays: "",
  blackout: "",
};

type CadenceDraft = {
  cadence: string;
  cycleLengthDays: string;
  lockTime: string;
  autoApproveRules: string;
  gracePeriodDays: string;
};

const EMPTY_CADENCE: CadenceDraft = {
  cadence: "",
  cycleLengthDays: "",
  lockTime: "",
  autoApproveRules: "",
  gracePeriodDays: "",
};

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
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 pr-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 bottom-3 text-[#959597]">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
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

function parseNum(raw: string): number | undefined {
  const t = raw.trim().replace(/[^\d.]/g, "");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function PayCycleSettingsPage() {
  const { askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<HrPayCycleOverview | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [otDraft, setOtDraft] = React.useState<OtDraft>(EMPTY_OT);
  const [savingOt, setSavingOt] = React.useState(false);
  const [ptoOpen, setPtoOpen] = React.useState(false);
  const [cadenceOpen, setCadenceOpen] = React.useState(false);
  const [holidayEdit, setHolidayEdit] = React.useState<HrPayCycleHoliday | null>(
    null,
  );
  const [ptoDraft, setPtoDraft] = React.useState<PtoDraft>(EMPTY_PTO);
  const [cadenceDraft, setCadenceDraft] =
    React.useState<CadenceDraft>(EMPTY_CADENCE);
  const [holidayDraft, setHolidayDraft] = React.useState({
    name: "",
    hoursCredited: "",
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
    void (async () => {
      const body: Partial<HrPayCycleOverview["overtime"]> = {};
      const daily = parseNum(otDraft.dailyOtThresholdHrs);
      const weekly = parseNum(otDraft.weeklyOtThresholdHrs);
      const mult = parseNum(otDraft.otMultiplier);
      const dbl = parseNum(otDraft.doubleTimeAfterHrs);
      if (daily != null) body.dailyOtThresholdHrs = daily;
      if (weekly != null) body.weeklyOtThresholdHrs = weekly;
      if (mult != null) body.otMultiplier = mult;
      if (dbl != null) body.doubleTimeAfterHrs = dbl;
      if (otDraft.minBillableBlock.trim()) {
        body.minBillableBlock = otDraft.minBillableBlock.trim().toUpperCase();
      }
      if (otDraft.roundTo.trim()) {
        body.roundTo = otDraft.roundTo.trim().toUpperCase();
      }
      if (Object.keys(body).length === 0) {
        toastApiError(new Error("Enter at least one overtime rule to save"));
        return;
      }
      setSavingOt(true);
      try {
        await hrApi.updatePayCycleOvertime(body);
        toastSuccess("Overtime rules saved");
        setOtDraft(EMPTY_OT);
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
        disabled={savingOt}
        onClick={saveOvertime}
      >
        Save Rules
      </DashboardToolbarButton>
    </div>,
    [addNote, savingOt, saveOvertime],
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

  async function reopenCycle(id: string) {
    try {
      await hrApi.reopenPayCycle(id);
      toastSuccess("Cycle reopened");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  function openPtoEdit() {
    setPtoDraft(EMPTY_PTO);
    setPtoOpen(true);
  }

  function openCadenceEdit() {
    setCadenceDraft(EMPTY_CADENCE);
    setCadenceOpen(true);
  }

  function openHolidayEdit(h: HrPayCycleHoliday) {
    setHolidayEdit(h);
    setHolidayDraft({ name: "", hoursCredited: "" });
  }

  if (loading && !data) {
    return (
      <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
        <p className="font-sans text-[12px] uppercase text-[#959597]">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Failed to load pay cycle settings.
        </p>
      </div>
    );
  }

  const current = data.currentCycle;

  return (
    <>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        {data.headerSubtitle ? (
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {data.headerSubtitle}
          </p>
        ) : null}

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
                {data.cycles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-8 text-center font-sans text-[11px] uppercase text-[#959597]"
                    >
                      No pay cycles found
                    </td>
                  </tr>
                ) : (
                  data.cycles.map((row) => (
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
                  ))
                )}
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
              value={otDraft.dailyOtThresholdHrs}
              placeholder="8 HRS"
              onChange={(v) =>
                setOtDraft((d) => ({ ...d, dailyOtThresholdHrs: v }))
              }
            />
            <FieldInput
              label="Weekly Overtime Threshold"
              value={otDraft.weeklyOtThresholdHrs}
              placeholder="40 HRS"
              onChange={(v) =>
                setOtDraft((d) => ({ ...d, weeklyOtThresholdHrs: v }))
              }
            />
            <FieldInput
              label="OT Multiplier"
              value={otDraft.otMultiplier}
              placeholder="1.5X"
              onChange={(v) => setOtDraft((d) => ({ ...d, otMultiplier: v }))}
            />
            <FieldInput
              label="Double-Time After"
              value={otDraft.doubleTimeAfterHrs}
              placeholder="12 HRS"
              onChange={(v) =>
                setOtDraft((d) => ({ ...d, doubleTimeAfterHrs: v }))
              }
            />
            <FieldInput
              label="Min Billable Block"
              value={otDraft.minBillableBlock}
              placeholder="15 MIN"
              onChange={(v) =>
                setOtDraft((d) => ({ ...d, minBillableBlock: v }))
              }
            />
            <FieldSelect
              label="Round To"
              value={otDraft.roundTo}
              placeholder="Select…"
              options={ROUND_TO_OPTIONS}
              onChange={(v) => setOtDraft((d) => ({ ...d, roundTo: v }))}
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
                {data.holidays.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-8 text-center font-sans text-[11px] uppercase text-[#959597]"
                    >
                      No observed holidays
                    </td>
                  </tr>
                ) : (
                  data.holidays.map((h) => (
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
                        <DashboardToolbarButton
                          onClick={() => openHolidayEdit(h)}
                        >
                          Edit
                        </DashboardToolbarButton>
                      </td>
                    </tr>
                  ))
                )}
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
                <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {current.dateRange}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  {current.status} · {current.activeEmployees} Active Employees
                </p>
                <div className="mt-3 space-y-0.5 border-t border-[#2A2A2A] pt-3">
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
                <div className="mt-4 flex items-center justify-between gap-3">
                  <DashboardToolbarButton
                    onClick={() => {
                      const row = data.cycles.find((c) => c.id === current.id);
                      if (row) void closeCycle(row);
                    }}
                  >
                    Close Cycle
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    onClick={() => void reopenCycle(current.id)}
                  >
                    Reopen
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
                className="h-9 w-full justify-center"
                onClick={openPtoEdit}
              >
                Edit Rules
              </DashboardToolbarButton>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Cycle Cadence & Approval">
          <div className="space-y-0.5">
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
                void (async () => {
                  const body: Partial<HrPayCycleOverview["ptoRules"]> = {};
                  const annual = parseNum(ptoDraft.annualPtoDays);
                  const accrual = parseNum(ptoDraft.accrualRatePerPeriod);
                  const sick = parseNum(ptoDraft.annualSickDays);
                  const carry = parseNum(ptoDraft.carryoverCapDays);
                  const notice = parseNum(ptoDraft.noticeRequiredDays);
                  if (annual != null) body.annualPtoDays = annual;
                  if (accrual != null) body.accrualRatePerPeriod = accrual;
                  if (sick != null) body.annualSickDays = sick;
                  if (carry != null) body.carryoverCapDays = carry;
                  if (notice != null) body.noticeRequiredDays = notice;
                  if (ptoDraft.blackout.trim()) {
                    body.blackout = ptoDraft.blackout.trim().toUpperCase();
                  }
                  if (Object.keys(body).length === 0) {
                    toastApiError(
                      new Error("Enter at least one PTO rule to save"),
                    );
                    return;
                  }
                  try {
                    await hrApi.updatePayCyclePto(body);
                    toastSuccess("PTO rules saved");
                    setPtoOpen(false);
                    setPtoDraft(EMPTY_PTO);
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
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="Annual PTO (Days)"
            value={ptoDraft.annualPtoDays}
            placeholder="20"
            onChange={(v) =>
              setPtoDraft((d) => ({ ...d, annualPtoDays: v }))
            }
          />
          <FieldInput
            label="Accrual Rate / Period"
            value={ptoDraft.accrualRatePerPeriod}
            placeholder="0.77"
            onChange={(v) =>
              setPtoDraft((d) => ({ ...d, accrualRatePerPeriod: v }))
            }
          />
          <FieldInput
            label="Annual Sick (Days)"
            value={ptoDraft.annualSickDays}
            placeholder="10"
            onChange={(v) =>
              setPtoDraft((d) => ({ ...d, annualSickDays: v }))
            }
          />
          <FieldInput
            label="Carryover Cap (Days)"
            value={ptoDraft.carryoverCapDays}
            placeholder="5"
            onChange={(v) =>
              setPtoDraft((d) => ({ ...d, carryoverCapDays: v }))
            }
          />
          <FieldInput
            label="Notice Required (Days)"
            value={ptoDraft.noticeRequiredDays}
            placeholder="14"
            onChange={(v) =>
              setPtoDraft((d) => ({ ...d, noticeRequiredDays: v }))
            }
          />
          <FieldInput
            label="Blackout"
            value={ptoDraft.blackout}
            placeholder="NONE"
            onChange={(v) => setPtoDraft((d) => ({ ...d, blackout: v }))}
          />
        </div>
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
                void (async () => {
                  const body: Partial<HrPayCycleOverview["cadence"]> = {};
                  if (cadenceDraft.cadence.trim()) {
                    body.cadence = cadenceDraft.cadence.trim().toUpperCase();
                  }
                  const len = parseNum(cadenceDraft.cycleLengthDays);
                  const grace = parseNum(cadenceDraft.gracePeriodDays);
                  if (len != null) body.cycleLengthDays = len;
                  if (grace != null) body.gracePeriodDays = grace;
                  if (cadenceDraft.lockTime.trim()) {
                    body.lockTime = cadenceDraft.lockTime.trim().toUpperCase();
                  }
                  if (cadenceDraft.autoApproveRules.trim()) {
                    body.autoApproveRules =
                      cadenceDraft.autoApproveRules.trim().toUpperCase();
                  }
                  if (Object.keys(body).length === 0) {
                    toastApiError(
                      new Error("Enter at least one cadence field to save"),
                    );
                    return;
                  }
                  try {
                    await hrApi.updatePayCycleCadence(body);
                    toastSuccess("Cadence saved");
                    setCadenceOpen(false);
                    setCadenceDraft(EMPTY_CADENCE);
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
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="Cadence"
            value={cadenceDraft.cadence}
            placeholder="BI-WEEKLY"
            onChange={(v) =>
              setCadenceDraft((d) => ({ ...d, cadence: v }))
            }
          />
          <FieldInput
            label="Cycle Length (Days)"
            value={cadenceDraft.cycleLengthDays}
            placeholder="14"
            onChange={(v) =>
              setCadenceDraft((d) => ({ ...d, cycleLengthDays: v }))
            }
          />
          <FieldInput
            label="Lock Time"
            value={cadenceDraft.lockTime}
            placeholder="11:59 PM CT"
            onChange={(v) =>
              setCadenceDraft((d) => ({ ...d, lockTime: v }))
            }
          />
          <FieldInput
            label="Auto-Approve Rules"
            value={cadenceDraft.autoApproveRules}
            placeholder="NO EXCEPTIONS, AFTER 48H"
            onChange={(v) =>
              setCadenceDraft((d) => ({ ...d, autoApproveRules: v }))
            }
          />
          <FieldInput
            label="Grace Period (Days)"
            value={cadenceDraft.gracePeriodDays}
            placeholder="2"
            onChange={(v) =>
              setCadenceDraft((d) => ({ ...d, gracePeriodDays: v }))
            }
          />
        </div>
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
                  const body: { name?: string; hoursCredited?: number } = {};
                  if (holidayDraft.name.trim()) {
                    body.name = holidayDraft.name.trim().toUpperCase();
                  }
                  const hrs = parseNum(holidayDraft.hoursCredited);
                  if (hrs != null) body.hoursCredited = hrs;
                  if (Object.keys(body).length === 0) {
                    toastApiError(
                      new Error("Enter a holiday name or hours to save"),
                    );
                    return;
                  }
                  try {
                    await hrApi.updatePayCycleHoliday(holidayEdit.id, body);
                    toastSuccess("Holiday updated");
                    setHolidayEdit(null);
                    setHolidayDraft({ name: "", hoursCredited: "" });
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
            placeholder="NEW YEAR'S DAY"
            onChange={(v) => setHolidayDraft((d) => ({ ...d, name: v }))}
          />
          <FieldInput
            label="Hours Credited"
            value={holidayDraft.hoursCredited}
            placeholder="8.0"
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
