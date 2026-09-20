"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardModal,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type RecurringSeriesDetail,
  type RecurringSeriesFrequency,
  type RecurringSeriesOccurrence,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const FREQUENCIES: RecurringSeriesFrequency[] = [
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
];

function FieldBox({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
        {hint ? (
          <span className="text-[#6F6F72]"> · {hint}</span>
        ) : null}
      </p>
      <div className="rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </div>
    </div>
  );
}

function TemplateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#2A2A2A] py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <p className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:text-right">
        {value}
      </p>
    </div>
  );
}

function EditSeriesModal({
  open,
  detail,
  onClose,
  onSaved,
}: {
  open: boolean;
  detail: RecurringSeriesDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  type Scope = "FUTURE_ONLY" | "ALL_UNSTARTED";
  type Step = "scope" | "settings";

  const [step, setStep] = React.useState<Step>("scope");
  const [scope, setScope] = React.useState<Scope>("FUTURE_ONLY");
  const [frequency, setFrequency] = React.useState<RecurringSeriesFrequency>(
    "MONTHLY",
  );
  const [dayRule, setDayRule] = React.useState("SAME DATE - 1ST");
  const [generateAheadDays, setGenerateAheadDays] = React.useState(14);
  const [endsAfter, setEndsAfter] = React.useState(12);
  const [crewTemplate, setCrewTemplate] = React.useState("");
  const [duration, setDuration] = React.useState("10");
  const [forms, setForms] = React.useState("");
  const [equipment, setEquipment] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open || !detail) return;
    setStep("scope");
    setScope("FUTURE_ONLY");
    setFrequency(detail.frequency);
    setDayRule(detail.dayRule ?? "SAME DATE - 1ST");
    setGenerateAheadDays(detail.generateAheadDays ?? 14);
    setEndsAfter(detail.endsAfterOccurrences ?? 12);
    setCrewTemplate(detail.crewTemplate ?? "");
    setDuration(String(detail.estimatedDurationHours ?? 10));
    setForms(detail.requiredForms ?? "");
    setEquipment(detail.requiredEquipment ?? "");
  }, [open, detail]);

  function handleClose() {
    setStep("scope");
    setScope("FUTURE_ONLY");
    onClose();
  }

  async function save() {
    if (!detail || !scope) return;
    setBusy(true);
    try {
      const res = await operationsApi.updateRecurringSeries(detail.id, {
        frequency: frequency as
          | "WEEKLY"
          | "FORTNIGHTLY"
          | "MONTHLY"
          | "QUARTERLY"
          | "ANNUALLY",
        dayRule,
        generateAheadDays,
        endsAfterOccurrences: endsAfter,
        crewTemplate,
        estimatedDurationHours: Number(duration) || 0,
        requiredForms: forms,
        requiredEquipment: equipment,
        updateScope: scope,
      });
      toastSuccess(res.data.lastUpdate?.message ?? "Series updated");
      onSaved();
      handleClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return null;

  const future = detail.editScope?.futureOnly ?? {
    value: "FUTURE_ONLY" as const,
    label: "Apply to future occurrences only",
    description: `${detail.remainingCount} remaining; already generated work orders stay as they are.`,
  };
  const unstarted = detail.editScope?.allUnstarted ?? {
    value: "ALL_UNSTARTED" as const,
    label: "Apply to all unstarted occurrences",
    description:
      "Also updates Draft or Scheduled work orders; none in this series.",
  };
  const warning =
    detail.editScope?.warning ??
    "Dispatched, in-progress and closed jobs are never changed.";

  const options: Array<{
    value: Scope;
    label: string;
    description: string;
  }> = [
    {
      value: future.value,
      label: future.label,
      description: future.description,
    },
    {
      value: unstarted.value,
      label: unstarted.label,
      description: unstarted.description,
    },
  ];

  if (step === "scope") {
    return (
      <DashboardModal
        open={open}
        onClose={handleClose}
        title={`Edit Series · ${detail.code}`}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!scope || busy}
              onClick={() => setStep("settings")}
              className="btn-base inline-flex h-9 items-center justify-center rounded-lg bg-[#FDFDFF] px-5 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#111111] disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-1">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Choose which work orders receive these changes
          </p>

          <div className="space-y-3" role="radiogroup" aria-label="Edit scope">
            {options.map((opt) => {
              const selected = scope === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setScope(opt.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                    selected
                      ? "border-[#22C55E] bg-[#14261C]"
                      : "border-[#3E3E3E] bg-[#1A1A1A] hover:border-[#5A5A5A]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                      selected
                        ? "bg-[#22C55E]"
                        : "border border-[#6F6F72] bg-transparent",
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-[#052E16]" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {opt.label}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 block font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]",
                        selected ? "text-[#86EFAC]/80" : "text-[#959597]",
                      )}
                    >
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-[#5C3B1E]/80 bg-[#2A1C12] px-3.5 py-3">
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E8B86D]">
              {warning}
            </p>
          </div>
        </div>
      </DashboardModal>
    );
  }

  return (
    <DashboardModal
      open={open}
      onClose={handleClose}
      title={`Edit Series · ${detail.code}`}
      widthClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <DashboardToolbarButton
            disabled={busy}
            onClick={() => setStep("scope")}
          >
            Back
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={() => void save()}>
            Save Changes
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          Scope:{" "}
          {scope === "FUTURE_ONLY"
            ? "Future occurrences only"
            : "All unstarted occurrences"}
        </p>
        <div>
          <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
            Frequency
          </p>
          <div className="flex flex-wrap gap-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 font-sans text-[10px] uppercase",
                  frequency === f
                    ? "bg-[#FDFDFF] text-[#111]"
                    : "border border-[#3E3E3E] text-[#C8C8C8]",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="font-sans text-[10px] uppercase text-[#959597]">
            Day rule
          </span>
          <input
            className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            value={dayRule}
            onChange={(e) => setDayRule(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Generate ahead (days)
            </span>
            <input
              type="number"
              className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
              value={generateAheadDays}
              onChange={(e) =>
                setGenerateAheadDays(Number(e.target.value) || 14)
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Ends after
            </span>
            <input
              type="number"
              className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
              value={endsAfter}
              onChange={(e) => setEndsAfter(Number(e.target.value) || 12)}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="font-sans text-[10px] uppercase text-[#959597]">
            Crew template
          </span>
          <input
            className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            value={crewTemplate}
            onChange={(e) => setCrewTemplate(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="font-sans text-[10px] uppercase text-[#959597]">
            Estimated hours
          </span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="font-sans text-[10px] uppercase text-[#959597]">
            Required forms
          </span>
          <input
            className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            value={forms}
            onChange={(e) => setForms(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="font-sans text-[10px] uppercase text-[#959597]">
            Required equipment
          </span>
          <input
            className="w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          />
        </label>
      </div>
    </DashboardModal>
  );
}

function CancelSeriesModal({
  open,
  detail,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  detail: RecurringSeriesDetail | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!detail) return null;

  const preview = detail.cancelPreview ?? {
    question: "Stop generating future work orders for this series?",
    remainingHeadline: `${detail.remainingCount} remaining occurrence${detail.remainingCount === 1 ? "" : "s"} will not be generated.`,
    intactNote: `${detail.generatedCount} generated work order${detail.generatedCount === 1 ? "" : "s"} stay intact. Dispatched, in-progress and closed jobs are never changed.`,
    keepLabel: "Keep Series",
    confirmLabel: "Cancel Future Generation",
  };

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={`Cancel Series · ${detail.code}`}
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <DashboardToolbarButton disabled={busy} onClick={onClose}>
            {preview.keepLabel}
          </DashboardToolbarButton>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="btn-base inline-flex h-8 items-center justify-center rounded-lg bg-[#DC2626] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
          >
            {preview.confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {preview.question}
        </p>
        <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3.5">
          <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {preview.remainingHeadline}
          </p>
          <p className="mt-2 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
            {preview.intactNote}
          </p>
        </div>
      </div>
    </DashboardModal>
  );
}

export function RecurringSeriesDetailPage({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [detail, setDetail] = React.useState<RecurringSeriesDetail | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelBusy, setCancelBusy] = React.useState(false);

  useSetHeaderBreadcrumb(
    detail?.code
      ? `Operations / Recurring Series / ${detail.code}`
      : "Operations / Recurring Series",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.getRecurringSeries(seriesId);
      setDetail(res.data);
    } catch (err) {
      toastApiError(err);
      setDetail(null);
      setError(
        err instanceof Error ? err.message : "Failed to load series detail",
      );
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function confirmCancelSeries() {
    if (!detail) return;
    setCancelBusy(true);
    try {
      const res = await operationsApi.cancelRecurringSeries(detail.id, {
        reason: "Cancelled future generation from series detail",
      });
      toastSuccess(
        res.data.cancelResult?.message ?? "Future generation cancelled",
      );
      setCancelOpen(false);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setCancelBusy(false);
    }
  }

  useSetHeaderActions(
    detail ? (
      detail.status === "ENDED" || detail.isEnded ? (
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {detail.statusHeadline ?? "Ended · Future generation stopped"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <DashboardToolbarButton
            variant="primary"
            onClick={() => setEditOpen(true)}
          >
            Edit Series
          </DashboardToolbarButton>
          <DashboardToolbarButton
            disabled={cancelBusy}
            onClick={() => setCancelOpen(true)}
          >
            Cancel Series
          </DashboardToolbarButton>
        </div>
      )
    ) : null,
    [detail?.id, detail?.status, detail?.isEnded, detail?.statusHeadline, cancelBusy],
  );

  const occurrenceColumns = React.useMemo<
    DashboardDataTableColumn<RecurringSeriesOccurrence>[]
  >(
    () => [
      {
        id: "occ",
        header: "Occurrence",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.occurrenceLabel}
          </span>
        ),
      },
      {
        id: "wo",
        header: "Work Order",
        className: "min-w-[140px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.workOrderCode}
          </span>
        ),
      },
      {
        id: "date",
        header: "Service Date",
        className: "min-w-[120px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.serviceDateLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "crew",
        header: "Crew",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.crewLabel}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[90px]",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[12px] uppercase",
              row.status.toUpperCase() === "CLOSED" ||
                row.status.toUpperCase() === "COMPLETE"
                ? "text-[#3D8B6E]"
                : "text-[#C8C8C8]",
            )}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: "detail",
        header: "Detail",
        className: "min-w-[140px]",
        cell: (row) =>
          row.workOrderId ? (
            <button
              type="button"
              className="font-sans text-[11px] uppercase text-[#8B9BB4] hover:text-[#FDFDFF]"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/operations/work-orders/${row.workOrderId}`);
              }}
            >
              View Work Order ›
            </button>
          ) : (
            <span className="font-sans text-[11px] uppercase text-[#6F6F72]">
              View Work Order ›
            </span>
          ),
      },
    ],
    [router],
  );

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      cancelled={false}
      onRetry={() => void reload()}
    >
      {detail ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
          <div>
            <Link
              href="/operations/recurring-series"
              className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
            >
              ← Recurring Series
            </Link>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {detail.code} · {detail.jobType}
              </h1>
              {detail.status === "ENDED" || detail.isEnded ? (
                <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] lg:hidden">
                  {detail.statusHeadline ??
                    "Ended · Future generation stopped"}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 lg:hidden">
                  <DashboardToolbarButton
                    variant="primary"
                    onClick={() => setEditOpen(true)}
                  >
                    Edit Series
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    disabled={cancelBusy}
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel Series
                  </DashboardToolbarButton>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#2D2D30] bg-[#1C1C1C] p-4 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                { label: "Customer", value: detail.customerName },
                {
                  label: "Next Occurrence",
                  value:
                    detail.status === "ENDED" || detail.isEnded
                      ? "—"
                      : (detail.nextOccurrenceLongLabel ?? "—"),
                },
                { label: "Generated", value: String(detail.generatedCount) },
                {
                  label: "Remaining",
                  value: String(
                    detail.status === "ENDED" || detail.isEnded
                      ? 0
                      : detail.remainingCount,
                  ),
                },
                {
                  label: "Status",
                  value: detail.status,
                  green: detail.status === "ACTIVE",
                  muted: detail.status === "ENDED" || detail.isEnded,
                },
              ] as const
            ).map((item) => (
              <div key={item.label}>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "mt-1 font-sans text-[12px] uppercase tracking-[-0.02em]",
                    "green" in item && item.green
                      ? "text-[#3D8B6E]"
                      : "muted" in item && item.muted
                        ? "text-[#959597]"
                        : "text-[#FDFDFF]",
                  )}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="cycle" title="Series Settings" />
            <div className="mt-4">
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                Frequency
              </p>
              <div className="flex flex-wrap gap-1">
                {FREQUENCIES.map((f) => {
                  const selected = detail.frequency === f;
                  return (
                    <span
                      key={f}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 font-sans text-[10px] uppercase tracking-[-0.02em]",
                        selected
                          ? "bg-[#2A2A2A] text-[#FDFDFF] ring-1 ring-[#3E3E3E]"
                          : "text-[#6F6F72]",
                      )}
                    >
                      {f}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FieldBox
                label="Day"
                hint={detail.settings.dayRuleHint}
                value={detail.settings.dayRule.replace(/ - /g, " · ")}
              />
              <FieldBox label="Generate" value={detail.settings.generateLabel} />
              <FieldBox label="Ends" value={detail.settings.endsLabel} />
              <FieldBox
                label="Other End Options"
                value={detail.settings.otherEndLabel}
              />
            </div>
            <p
              className={cn(
                "mt-4 font-sans text-[10px] uppercase tracking-[-0.02em]",
                detail.settings.footerTone === "muted" ||
                  detail.status === "ENDED" ||
                  detail.isEnded
                  ? "text-[#6F6F72]"
                  : "text-[#C4A35A]",
              )}
            >
              {detail.settings.footerNote ??
                (detail.status === "ENDED" || detail.isEnded
                  ? "Series ended. Generated work orders remain available below."
                  : detail.settings.editScopeNote)}
            </p>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="clipboard" title="Work Order Template" />
            <div className="mt-2">
              <TemplateRow
                label="Crew Template"
                value={detail.template.crewTemplate}
              />
              <TemplateRow
                label="Estimated Duration"
                value={detail.template.estimatedDuration}
              />
              <TemplateRow
                label="Required Forms"
                value={detail.template.requiredForms}
              />
              <TemplateRow
                label="Required Equipment"
                value={detail.template.requiredEquipment}
              />
            </div>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <DashboardPanelTitle
                icon="document"
                title="Generated Work Orders"
              />
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                {detail.generatedOfLabel}
              </p>
            </div>
            <DashboardDataTable
              columns={occurrenceColumns}
              rows={detail.occurrences}
              getRowId={(r) => r.id}
              embedded
              emptyMessage="No work orders generated yet."
            />
          </DashboardPanel>

          <EditSeriesModal
            open={editOpen}
            detail={detail}
            onClose={() => setEditOpen(false)}
            onSaved={() => void reload()}
          />
          <CancelSeriesModal
            open={cancelOpen}
            detail={detail}
            busy={cancelBusy}
            onClose={() => setCancelOpen(false)}
            onConfirm={() => void confirmCancelSeries()}
          />
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
