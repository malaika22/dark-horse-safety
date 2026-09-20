"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DashboardDrawer,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  reportsApi,
  type QuoteVarianceOptions,
  type QuoteVarianceReport,
} from "@/lib/reports-api";
import { toastApiError } from "@/lib/toast";
import {
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

type Filters = {
  customerId: string;
  repId: string;
  from: string;
  to: string;
  varianceThreshold: string;
};

const EMPTY_FILTERS: Filters = {
  customerId: "",
  repId: "",
  from: "",
  to: "",
  varianceThreshold: "",
};

const fieldClass =
  "h-9 w-full min-w-[140px] appearance-none rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";

function FilterCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 12.5l4 4L18.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function toneClass(tone: string) {
  if (tone === "neg") return "text-[#E8A0A0]";
  if (tone === "pos") return "text-[#ACEBCE]";
  return "text-[#FDFDFF]";
}

function QuoteVarianceFiltersDrawer({
  open,
  onClose,
  draft,
  onChange,
  options,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  draft: Filters;
  onChange: (next: Filters) => void;
  options: QuoteVarianceOptions | null;
  onApply: () => void;
  onClearAll: () => void;
}) {
  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      widthClassName="max-w-[380px]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
            </DashboardToolbarButton>
            <PayrollPrimaryButton onClick={onApply}>Apply</PayrollPrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <label className="flex items-center justify-between gap-3">
          <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            Customer
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.customerId}
            onChange={(e) =>
              onChange({ ...draft, customerId: e.target.value })
            }
          >
            {(options?.customers ?? [{ value: "", label: "Any" }]).map((o) => (
              <option key={o.value || "any"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            Rep
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.repId}
            onChange={(e) => onChange({ ...draft, repId: e.target.value })}
          >
            {(options?.reps ?? [{ value: "", label: "Any" }]).map((o) => (
              <option key={o.value || "any"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 pt-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            Date Range
          </span>
          <div className="flex w-full max-w-[220px] flex-col gap-2">
            <input
              type="date"
              className={fieldClass}
              value={draft.from}
              onChange={(e) => onChange({ ...draft, from: e.target.value })}
            />
            <input
              type="date"
              className={fieldClass}
              value={draft.to}
              onChange={(e) => onChange({ ...draft, to: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="max-w-[120px] shrink-0 font-sans text-[11px] font-[510] uppercase leading-snug tracking-[-0.02em] text-[#959597]">
            Variance Above Threshold
          </span>
          <select
            className={cn(fieldClass, "max-w-[220px]")}
            value={draft.varianceThreshold}
            onChange={(e) =>
              onChange({ ...draft, varianceThreshold: e.target.value })
            }
          >
            {(
              options?.varianceThresholds ?? [{ value: "", label: "Any" }]
            ).map((o) => (
              <option key={o.value || "any"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </DashboardDrawer>
  );
}

export function QuoteVarianceReportPage() {
  const router = useRouter();
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [options, setOptions] = React.useState<QuoteVarianceOptions | null>(
    null,
  );
  const [report, setReport] = React.useState<QuoteVarianceReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  useSetHeaderBreadcrumb("Report / Quote Variance");

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await reportsApi.quoteVarianceOptions();
        if (!cancelled) setOptions(res.data);
      } catch (err) {
        if (!cancelled) toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await reportsApi.quoteVariance({
          customerId: filters.customerId || undefined,
          repId: filters.repId || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          varianceThreshold: filters.varianceThreshold
            ? Number(filters.varianceThreshold)
            : undefined,
        });
        if (!cancelled) setReport(res.data);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load quote variance report.");
          setReport(null);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  const filtersActive = Boolean(
    filters.customerId ||
      filters.repId ||
      filters.from ||
      filters.to ||
      filters.varianceThreshold,
  );

  if (loading && !report) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadingListState rows={6} />
      </div>
    );
  }

  if (loadError && !report) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadFailedState description={loadError} onRetry={() => refresh()} />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-xl border border-[#2D2D30] bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <DashboardToolbarButton onClick={() => router.push("/reports")}>
            Cancel
          </DashboardToolbarButton>
          <DashboardToolbarButton
            onClick={() => {
              setDraft(filters);
              setFilterOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              {filtersActive ? <FilterCheckIcon /> : null}
              Filter
            </span>
          </DashboardToolbarButton>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Image
                src="/brand/logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                {report.meta.brand}
              </p>
            </div>
            <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[28px]">
              {report.meta.title}
            </h1>
            <p className="mt-2 max-w-xl font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
              {report.meta.subtitle}
            </p>
          </div>
          <div className="space-y-1 text-left lg:text-right">
            <p className="font-sans text-[11px] uppercase text-[#C8C8C8]">
              Pay Cycle: {report.meta.payCycleLabel}
            </p>
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              Generated {report.meta.generatedAtLabel} ·{" "}
              {report.meta.generatedBy}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-y border-[#2A2A2A] py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                {report.kpis.quotesConverted}
              </p>
              <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
                {report.kpis.quotesConvertedMeta}
              </p>
            </div>
            <div>
              <p className="font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                {report.kpis.totalQuotedLabel}
              </p>
              <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
                {report.kpis.totalQuotedMeta}
              </p>
            </div>
            <div>
              <p className="font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                {report.kpis.totalInvoicedLabel}
              </p>
              <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
                {report.kpis.totalInvoicedMeta}
              </p>
            </div>
            <div>
              <p
                className={cn(
                  "font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em]",
                  report.kpis.avgVariancePct < 0
                    ? "text-[#E8A0A0]"
                    : report.kpis.avgVariancePct > 0
                      ? "text-[#ACEBCE]"
                      : "text-[#FDFDFF]",
                )}
              >
                {report.kpis.avgVarianceLabel}
              </p>
              <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">
                {report.kpis.avgVarianceMeta}
              </p>
            </div>
          </div>
          {report.kpis.underBilledCount > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#7F1D1D] bg-[#3B2020] px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#E8A0A0]">
              ⚠ {report.kpis.alertLabel}
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="mb-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            Variance Distribution
          </p>
          <div className="flex h-40 items-end gap-3 sm:gap-5">
            {report.distribution.map((b) => (
              <div
                key={b.key}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span className="font-sans text-[10px] uppercase text-[#C8C8C8]">
                  {b.count}
                </span>
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-[48px] rounded-t-md",
                      b.tone === "neg" ? "bg-[#B45454]" : "bg-[#3D8B6E]",
                    )}
                    style={{
                      height: `${Math.max(b.count > 0 ? 12 : 2, b.heightPct)}%`,
                    }}
                  />
                </div>
                <span className="text-center font-sans text-[9px] uppercase leading-tight text-[#6F6F72]">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8A0A0]">
            {report.insight}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {[
                  "Customer",
                  "Quote",
                  "Quoted",
                  "Invoiced",
                  "Variance $",
                  "Variance %",
                  "Reason",
                  "Rep",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-left font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#6F6F72]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.id} className="border-b border-[#2A2A2A]">
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF]">
                    {row.customerName}
                  </td>
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#8B9BB4]">
                    {row.quoteNumber}
                  </td>
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#C8C8C8]">
                    {row.quotedLabel}
                  </td>
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#C8C8C8]">
                    {row.invoicedLabel}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 font-sans text-[11px] uppercase",
                      toneClass(row.tone),
                    )}
                  >
                    {row.varianceAmountLabel}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 font-sans text-[11px] uppercase",
                      toneClass(row.tone),
                    )}
                  >
                    {row.variancePctLabel}
                  </td>
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#C8C8C8]">
                    {row.reason}
                  </td>
                  <td className="px-2 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF]">
                    {row.repName}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#3E3E3E]">
                <td className="px-2 py-3 font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                  {report.totals.quoteCountLabel}
                </td>
                <td className="px-2 py-3" />
                <td className="px-2 py-3 font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                  {report.totals.quotedLabel}
                </td>
                <td className="px-2 py-3 font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                  {report.totals.invoicedLabel}
                </td>
                <td
                  className={cn(
                    "px-2 py-3 font-sans text-[11px] font-[510] uppercase",
                    toneClass(report.totals.tone),
                  )}
                >
                  {report.totals.varianceAmountLabel}
                </td>
                <td
                  className={cn(
                    "px-2 py-3 font-sans text-[11px] font-[510] uppercase",
                    toneClass(report.totals.tone),
                  )}
                >
                  {report.totals.variancePctLabel}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#2A2A2A] pt-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
            {report.footerNote}
          </p>
          <div className="text-left sm:text-right">
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {report.approvedBy}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
              Approved By
            </p>
          </div>
        </div>
      </div>

      <QuoteVarianceFiltersDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        draft={draft}
        onChange={setDraft}
        options={options}
        onApply={() => {
          setFilters(draft);
          setFilterOpen(false);
        }}
        onClearAll={() => {
          setDraft(EMPTY_FILTERS);
          setFilters(EMPTY_FILTERS);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}
