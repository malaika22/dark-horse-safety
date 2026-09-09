"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardMenuPopover,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  downloadCsv,
  type CrmManagerSalesSummary,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

type DatePreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatRangeLabel(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${a.toLocaleDateString("en-US", opts).toUpperCase()} – ${b
    .toLocaleDateString("en-US", opts)
    .toUpperCase()}`;
}

function formatRangeShort(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  const month = a
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${month} ${a.getDate()}-${b.getDate()}`;
  }
  return `${month} ${a.getDate()} – ${b
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()}`;
}

function buildPresets(): DatePreset[] {
  const today = startOfDayLocal(new Date());
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return isoDay(x);
  };
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return [
    {
      id: "14",
      label: "Last 14 days",
      from: d(-13),
      to: isoDay(today),
    },
    {
      id: "7",
      label: "Last 7 days",
      from: d(-6),
      to: isoDay(today),
    },
    {
      id: "30",
      label: "Last 30 days",
      from: d(-29),
      to: isoDay(today),
    },
    {
      id: "month",
      label: "This month",
      from: isoDay(monthStart),
      to: isoDay(today),
    },
  ];
}

function formatPipeline(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function barPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function eodBarColor(pct: number) {
  if (pct >= 90) return "#5EEAD4";
  if (pct >= 70) return "#F5A524";
  return "#F97066";
}

function MetricBar({
  value,
  max,
  color = "#5EEAD4",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const width = barPct(value, max);
  return (
    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#2A2A2A]">
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ExportGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExportButton({ onExport }: { onExport: () => void }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <DashboardToolbarButton
        ref={anchorRef}
        variant="primary"
        leftIcon={<ExportGlyph />}
        showChevron
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Export
      </DashboardToolbarButton>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={[
          {
            id: "csv",
            label: "Export summary • CSV",
            onSelect: onExport,
          },
        ]}
        className="min-w-[200px]"
      />
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type DrillMetric =
  | "activities"
  | "calls"
  | "visits"
  | "quotes"
  | "pipeline"
  | "eod";

type DrillState = {
  repId: string;
  repName: string;
  metric: DrillMetric;
};

type DrillRow = {
  id: string;
  date: string;
  type: string;
  customer: string;
  subject: string;
  outcome: string;
  href?: string;
};

const METRIC_LABEL: Record<DrillMetric, string> = {
  activities: "Activities",
  calls: "Calls",
  visits: "Visits",
  quotes: "Quotes",
  pipeline: "Pipeline",
  eod: "Eod %",
};

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function OutcomePill({ label }: { label: string }) {
  const u = label.trim().toUpperCase() || "—";
  let tone = "bg-[#2A2A2A] text-[#959597]";
  if (
    u.includes("POSITIVE") ||
    u.includes("REPLIED") ||
    u.includes("WON") ||
    u.includes("COMPLETE") ||
    u.includes("SUBMITTED")
  ) {
    tone = "bg-[#1F3A2E] text-[#6EE7B7]";
  } else if (
    u.includes("NO ANSWER") ||
    u.includes("CALLBACK") ||
    u.includes("PENDING") ||
    u.includes("LOST")
  ) {
    tone = "bg-[#3A2E1A] text-[#E8C47C]";
  } else if (u.includes("SENT") || u.includes("OPEN") || u.includes("APPROVED")) {
    tone = "bg-[#163A3A] text-[#5EEAD4]";
  }
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
        tone,
      )}
    >
      {u}
    </span>
  );
}

async function fetchDrillRows(
  state: DrillState,
  from: string,
  to: string,
): Promise<DrillRow[]> {
  if (state.metric === "quotes" || state.metric === "pipeline") {
    const res = await crmApi.listQuotes({
      ownerId: state.repId,
      page: 1,
      pageSize: 100,
      sort: "createdAt",
      direction: "desc",
    });
    return (res.data.items ?? []).map((q) => {
      const amount = Number(q.amount ?? 0);
      return {
        id: q.id,
        date: formatShortDate(q.createdAt),
        type: "QUOTE",
        customer: (q.customer?.name ?? "—").toUpperCase(),
        subject: `${q.quoteNumber} - ${formatMoney(amount)} ${q.status}`.toUpperCase(),
        outcome: (q.status ?? "—").toUpperCase(),
        href: `/crm/quotes/${q.id}`,
      };
    });
  }

  if (state.metric === "eod") {
    const res = await crmApi.listEodReports({
      repId: state.repId,
      page: 1,
      pageSize: 100,
      sort: "reportDate",
      direction: "desc",
    });
    return (res.data.items ?? []).map((r) => ({
      id: r.id,
      date: formatShortDate(r.reportDate),
      type: "EOD",
      customer: "—",
      subject: `${r.reportCode ?? "EOD"} · ${r.activitiesCount ?? 0} activities`.toUpperCase(),
      outcome: (r.status ?? "—").toUpperCase(),
      href: `/crm/eod-reports/${r.id}`,
    }));
  }

  const type =
    state.metric === "calls"
      ? "CALL"
      : state.metric === "visits"
        ? "VISIT"
        : undefined;

  const res = await crmApi.listSalesActivities({
    repId: state.repId,
    type,
    from,
    to,
    page: 1,
    pageSize: 100,
    sort: "activityAt",
    direction: "desc",
  });

  return (res.data.items ?? []).map((a) => ({
    id: a.id,
    date: formatShortDate(a.activityAt),
    type: (a.type ?? "—").toUpperCase(),
    customer: (a.customer?.name ?? "—").toUpperCase(),
    subject: (a.subject || a.activityCode || "—").toUpperCase(),
    outcome: (a.outcome || a.status || "—").toUpperCase(),
    href: `/crm/sales/${a.id}`,
  }));
}

function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const presets = React.useMemo(() => buildPresets(), []);

  return (
    <div className="relative">
      <DashboardToolbarButton
        ref={anchorRef}
        showChevron
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {formatRangeLabel(from, to)}
      </DashboardToolbarButton>
      <DashboardMenuPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        items={presets.map((p) => ({
          id: p.id,
          label: p.label,
          onSelect: () => onChange(p.from, p.to),
        }))}
        align="left"
        className="min-w-[200px]"
      />
    </div>
  );
}

function CompareToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
        Compare to team avg
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
            checked ? "translate-x-4 bg-[#1A1A1A]" : "bg-[#959597]",
          )}
        />
      </span>
    </button>
  );
}

export function ManagerSalesSummaryPage() {
  const router = useRouter();
  const presets = React.useMemo(() => buildPresets(), []);
  const initial = presets[0]!;
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [compareAvg, setCompareAvg] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<CrmManagerSalesSummary | null>(null);
  const [drill, setDrill] = React.useState<DrillState | null>(null);
  const [drillRows, setDrillRows] = React.useState<DrillRow[]>([]);
  const [drillLoading, setDrillLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.managerSalesSummary({ from, to });
      setData(res.data);
    } catch (err) {
      toastApiError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadDrill = React.useCallback(
    async (state: DrillState) => {
      setDrillLoading(true);
      try {
        const rows = await fetchDrillRows(state, from, to);
        setDrillRows(rows);
      } catch (err) {
        toastApiError(err);
        setDrillRows([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [from, to],
  );

  React.useEffect(() => {
    if (!drill) {
      setDrillRows([]);
      return;
    }
    void loadDrill(drill);
  }, [drill, loadDrill]);

  const maxes = React.useMemo(() => {
    const reps = data?.reps ?? [];
    const team = data?.teamAvg;
    if (compareAvg && team) {
      return {
        activities: Math.max(team.activities, 1),
        calls: Math.max(team.calls, 1),
        visits: Math.max(team.visits, 1),
        quotes: Math.max(team.quotes, 1),
        pipeline: Math.max(team.pipeline, 1),
        eodPct: 100,
      };
    }
    return {
      activities: Math.max(...reps.map((r) => r.activities), 1),
      calls: Math.max(...reps.map((r) => r.calls), 1),
      visits: Math.max(...reps.map((r) => r.visits), 1),
      quotes: Math.max(...reps.map((r) => r.quotes), 1),
      pipeline: Math.max(...reps.map((r) => r.pipeline), 1),
      eodPct: 100,
    };
  }, [compareAvg, data]);

  function handleExportCsv() {
    if (!data) return;
    if (drill && drillRows.length > 0) {
      const header = ["Date", "Type", "Customer", "Subject", "Outcome"];
      const lines = drillRows.map((r) =>
        [r.date, r.type, r.customer, `"${r.subject.replace(/"/g, '""')}"`, r.outcome].join(
          ",",
        ),
      );
      const csv = [header.join(","), ...lines].join("\n");
      downloadCsv(
        csv,
        `sales-summary-${drill.repName}-${drill.metric}-${from}-${to}.csv`
          .toLowerCase()
          .replace(/\s+/g, "-"),
      );
      toastSuccess("Export downloaded");
      return;
    }
    const header = [
      "Rep",
      "Activities",
      "Calls",
      "Visits",
      "Quotes",
      "Pipeline",
      "EOD %",
    ];
    const lines = data.reps.map((r) =>
      [
        r.name,
        r.activities,
        r.calls,
        r.visits,
        r.quotes,
        r.pipeline,
        r.eodPct,
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    downloadCsv(csv, `manager-sales-summary-${data.from}-${data.to}.csv`);
    toastSuccess("Export downloaded");
  }

  function openDrill(
    repId: string,
    repName: string,
    metric: DrillMetric = "activities",
  ) {
    setDrill({ repId, repName, metric });
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading sales summary" />
      </div>
    );
  }

  const kpis = data?.kpis;
  const repCount = data?.repCount ?? 0;
  const metricLabel = drill ? METRIC_LABEL[drill.metric] : "";

  return (
    <div className="space-y-5 overflow-x-hidden bg-shell p-3 sm:space-y-6 sm:p-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ExportButton onExport={handleExportCsv} />
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Activities"
            value={String(kpis?.activities ?? 0)}
            meta={`${repCount} reps · this range`}
            icon="lightning"
          />
          <DashboardStatCell
            title="Calls"
            value={String(kpis?.calls ?? 0)}
            meta="Logged calls"
            icon="document"
          />
          <DashboardStatCell
            title="Visits"
            value={String(kpis?.visits ?? 0)}
            meta="Site visits"
            icon="customers"
          />
        </DashboardStatRow>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Quotes"
            value={String(kpis?.quotes ?? 0)}
            meta="In pipeline"
            icon="document"
          />
          <DashboardStatCell
            title="Pipeline"
            value={formatPipeline(kpis?.pipeline ?? 0)}
            meta="Open opportunities"
            icon="folder"
          />
          <DashboardStatCell
            title="Eod %"
            value={`${kpis?.eodPct ?? 0}%`}
            meta="Team avg"
            icon="lightning"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
        <CompareToggle checked={compareAvg} onCheckedChange={setCompareAvg} />
      </div>

      {drill ? (
        <section className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-4 sm:px-5">
            <button
              type="button"
              aria-label="Back to rep performance"
              onClick={() => setDrill(null)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF] transition-colors hover:bg-[#353535]"
            >
              <BackChevronIcon />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                {drill.repName} · {metricLabel}
                <span className="font-normal text-[#959597]">
                  {" "}
                  · Filtered from {metricLabel.toLowerCase()} metric ·{" "}
                  {drillLoading ? "…" : `${drillRows.length} records`}
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
            {drillLoading ? (
              <div className="flex justify-center py-16">
                <BrandLoader label="Loading records" />
              </div>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Date", "Type", "Customer", "Subject", "Outcome"].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] sm:px-5"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {drillRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center font-sans text-[12px] uppercase text-[#959597]"
                      >
                        No records for this metric in the selected range
                      </td>
                    </tr>
                  ) : (
                    drillRows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b border-divider last:border-b-0 transition-colors hover:bg-white/[0.02]"
                        onClick={() => {
                          if (row.href) router.push(row.href);
                        }}
                      >
                        <td className="px-4 py-4 font-sans text-[12px] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF] sm:px-5">
                          {row.date}
                        </td>
                        <td className="px-4 py-4 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:px-5">
                          {row.type}
                        </td>
                        <td className="px-4 py-4 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:px-5">
                          {row.customer}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-4 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:px-5">
                          {row.subject}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <OutcomePill label={row.outcome} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-4 py-4 sm:px-5">
            <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Rep performance{" "}
              <span className="font-normal text-[#959597]">
                · {repCount} reps · {formatRangeShort(from, to)}
              </span>
            </p>
            <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
              Click any metric to drill into its source list →
            </p>
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-divider">
                  {[
                    "Rep",
                    "Activities",
                    "Calls",
                    "Visits",
                    "Quotes",
                    "Pipeline",
                    "Eod %",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "actions"}
                      scope="col"
                      className={cn(
                        "px-4 py-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] sm:px-5",
                        h && h !== "Rep" && "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.reps ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center font-sans text-[12px] uppercase text-[#959597]"
                    >
                      No rep activity in this date range
                    </td>
                  </tr>
                ) : (
                  (data?.reps ?? []).map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-divider last:border-b-0 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <button
                          type="button"
                          onClick={() => openDrill(row.id, row.name, "activities")}
                          className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-80"
                        >
                          {row.name}
                        </button>
                      </td>
                      {(
                        [
                          [
                            "activities",
                            row.activities,
                            maxes.activities,
                            "#5EEAD4",
                            String(row.activities),
                          ],
                          [
                            "calls",
                            row.calls,
                            maxes.calls,
                            "#5EEAD4",
                            String(row.calls),
                          ],
                          [
                            "visits",
                            row.visits,
                            maxes.visits,
                            "#5EEAD4",
                            String(row.visits),
                          ],
                          [
                            "quotes",
                            row.quotes,
                            maxes.quotes,
                            "#5EEAD4",
                            String(row.quotes),
                          ],
                          [
                            "pipeline",
                            row.pipeline,
                            maxes.pipeline,
                            "#5EEAD4",
                            formatPipeline(row.pipeline),
                          ],
                          [
                            "eod",
                            row.eodPct,
                            maxes.eodPct,
                            eodBarColor(row.eodPct),
                            `${row.eodPct}%`,
                          ],
                        ] as const
                      ).map(([metric, value, max, color, label]) => (
                        <td key={metric} className="px-4 py-4 sm:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              openDrill(row.id, row.name, metric)
                            }
                            className="block w-full min-w-[72px] text-left"
                          >
                            <span className="font-sans text-[12px] font-[510] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF]">
                              {label}
                            </span>
                            <MetricBar value={value} max={max} color={color} />
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-4 text-[#959597] sm:px-5">
                        <button
                          type="button"
                          aria-label={`Open ${row.name}`}
                          onClick={() =>
                            openDrill(row.id, row.name, "activities")
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/5 hover:text-[#FDFDFF]"
                        >
                          <ChevronRightIcon />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
