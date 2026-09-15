"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardMenuPopover,
  DashboardPagination,
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
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
  useSetHeaderPageTitle,
} from "@/features/app-shell/header-actions-context";

type DatePreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

type SortKey =
  | "eodPct"
  | "activities"
  | "calls"
  | "visits"
  | "quotes"
  | "pipeline"
  | "name";

type FilterKey = "all" | "above" | "below" | "eod-low";

type MetricKey =
  | "activities"
  | "calls"
  | "visits"
  | "quotes"
  | "pipeline"
  | "eodPct";

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

type RepTargets = {
  activities: number;
  calls: number;
  visits: number;
  quotes: number;
  pipeline: number;
  eodPct: number;
};

const METRIC_LABEL: Record<DrillMetric, string> = {
  activities: "Activities",
  calls: "Calls",
  visits: "Visits",
  quotes: "Quotes",
  pipeline: "Pipeline",
  eod: "Eod %",
};

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "eodPct", label: "Eod %" },
  { id: "activities", label: "Activities" },
  { id: "calls", label: "Calls" },
  { id: "visits", label: "Visits" },
  { id: "quotes", label: "Quotes" },
  { id: "pipeline", label: "Pipeline" },
  { id: "name", label: "Rep" },
];

const FILTER_OPTIONS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "All reps" },
  { id: "above", label: "Meeting targets" },
  { id: "below", label: "Below targets" },
  { id: "eod-low", label: "Eod under 70%" },
];

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    return `${month} ${a.getDate()}–${b.getDate()}`;
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
    { id: "14", label: "Last 14 days", from: d(-13), to: isoDay(today) },
    { id: "7", label: "Last 7 days", from: d(-6), to: isoDay(today) },
    { id: "30", label: "Last 30 days", from: d(-29), to: isoDay(today) },
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

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function barColor(ratio: number) {
  if (ratio >= 1) return "#5EEAD4";
  if (ratio >= 0.7) return "#F5A524";
  return "#F97066";
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

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6v12M5 9l3-3 3 3M16 18V6M13 15l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
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

/** Progress bar with optional team-average marker. */
function MetricBar({
  value,
  target,
  teamAvg,
  showAvg,
}: {
  value: number;
  target: number;
  teamAvg?: number;
  showAvg?: boolean;
}) {
  const max = Math.max(target, value, teamAvg ?? 0, 1);
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  const avgLeft =
    showAvg && teamAvg != null
      ? Math.max(0, Math.min(100, (teamAvg / max) * 100))
      : null;
  const color = barColor(target > 0 ? value / target : 0);

  return (
    <div className="relative mt-2 h-[4px] w-full overflow-visible rounded-full bg-[#2A2A2A]">
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
      {avgLeft != null ? (
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[#959597]"
          style={{ left: `${avgLeft}%` }}
          title="Team average"
        />
      ) : null}
    </div>
  );
}

function ExportMenu({
  onExport,
  variant = "primary",
}: {
  onExport: () => void;
  variant?: "primary" | "default";
}) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <DashboardToolbarButton
        ref={anchorRef}
        variant={variant}
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
        align="right"
        className="min-w-[200px]"
        items={[
          { id: "csv", label: "Export summary · CSV", onSelect: onExport },
        ]}
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
    u.includes("PENDING") ||
    u.includes("LOST")
  ) {
    tone = "bg-[#3A2E1A] text-[#E8C47C]";
  } else if (u.includes("CALLBACK")) {
    tone = "border border-[#3B82F6]/50 bg-transparent text-[#93C5FD]";
  } else if (u.includes("SENT") || u.includes("OPEN") || u.includes("APPROVED")) {
    tone = "bg-[#163A3A] text-[#5EEAD4]";
  } else if (u.includes("NEUTRAL")) {
    tone = "bg-[#2A2A2A] text-[#959597]";
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

function repTargets(
  row: CrmManagerSalesSummary["reps"][number],
  fallback: RepTargets,
): RepTargets {
  return row.targets ?? fallback;
}

function meetingMostTargets(
  row: CrmManagerSalesSummary["reps"][number],
  targets: RepTargets,
) {
  const checks = [
    row.activities >= targets.activities,
    row.calls >= targets.calls,
    row.visits >= targets.visits,
    row.quotes >= targets.quotes,
    row.pipeline >= targets.pipeline,
    row.eodPct >= 90,
  ];
  return checks.filter(Boolean).length >= 4;
}

export function ManagerSalesSummaryPage() {
  const router = useRouter();
  const presets = React.useMemo(() => buildPresets(), []);
  const initial = presets[0]!;
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [compareAvg, setCompareAvg] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("eodPct");
  const [filterKey, setFilterKey] = React.useState<FilterKey>("all");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLButtonElement>(null);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<CrmManagerSalesSummary | null>(null);
  const [drill, setDrill] = React.useState<DrillState | null>(null);
  const [drillRows, setDrillRows] = React.useState<DrillRow[]>([]);
  const [drillLoading, setDrillLoading] = React.useState(false);
  const [drillPage, setDrillPage] = React.useState(1);
  const [drillPageSize, setDrillPageSize] = React.useState(25);

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
    setDrillPage(1);
    void loadDrill(drill);
  }, [drill, loadDrill]);

  const metricLabel = drill ? METRIC_LABEL[drill.metric] : "";
  const drillTitle = drill
    ? `${drill.repName} · ${metricLabel}`
    : null;

  useSetHeaderBreadcrumb(
    drill
      ? `Sales / Manager Summary / ${drill.repName}`
      : null,
  );
  useSetHeaderPageTitle(drillTitle);

  const paginatedDrillRows = React.useMemo(() => {
    const start = (drillPage - 1) * drillPageSize;
    return drillRows.slice(start, start + drillPageSize);
  }, [drillRows, drillPage, drillPageSize]);

  const targets = data?.targets ?? {
    activities: 0,
    calls: 0,
    visits: 0,
    quotes: 0,
    pipeline: 0,
    eodPct: 100,
  };
  const teamAvg = data?.teamAvg;

  const visibleReps = React.useMemo(() => {
    let rows = [...(data?.reps ?? [])];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (filterKey === "above") {
      rows = rows.filter((r) => meetingMostTargets(r, repTargets(r, targets)));
    } else if (filterKey === "below") {
      rows = rows.filter((r) => !meetingMostTargets(r, repTargets(r, targets)));
    } else if (filterKey === "eod-low") {
      rows = rows.filter((r) => r.eodPct < 70);
    }
    rows.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return rows;
  }, [data?.reps, search, filterKey, sortKey, targets]);

  function handleExportCsv() {
    if (!data) return;
    if (drill && drillRows.length > 0) {
      const header = ["Date", "Type", "Customer", "Subject", "Outcome"];
      const lines = drillRows.map((r) =>
        [
          r.date,
          r.type,
          r.customer,
          `"${r.subject.replace(/"/g, '""')}"`,
          r.outcome,
        ].join(","),
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
      "Activities Target",
      "Calls",
      "Calls Target",
      "Visits",
      "Visits Target",
      "Quotes",
      "Quotes Target",
      "Pipeline",
      "Pipeline Target",
      "EOD %",
    ];
    const lines = data.reps.map((r) => {
      const t = repTargets(r, targets);
      return [
        r.name,
        r.activities,
        t.activities,
        r.calls,
        t.calls,
        r.visits,
        t.visits,
        r.quotes,
        t.quotes,
        r.pipeline,
        t.pipeline,
        r.eodPct,
      ].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    downloadCsv(csv, `manager-sales-summary-${data.from}-${data.to}.csv`);
    toastSuccess("Export downloaded");
  }

  useSetHeaderActions(
    <ExportMenu onExport={handleExportCsv} variant="primary" />,
    [data, drill, drillRows, from, to],
  );

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

  const metricCols: {
    key: MetricKey;
    drill: DrillMetric;
    label: (row: CrmManagerSalesSummary["reps"][number], t: RepTargets) => string;
    value: (row: CrmManagerSalesSummary["reps"][number]) => number;
    target: (t: RepTargets) => number;
    avg: number;
  }[] = [
    {
      key: "activities",
      drill: "activities",
      label: (r, t) => `${r.activities}/${t.activities}`,
      value: (r) => r.activities,
      target: (t) => t.activities,
      avg: teamAvg?.activities ?? 0,
    },
    {
      key: "calls",
      drill: "calls",
      label: (r, t) => `${r.calls}/${t.calls}`,
      value: (r) => r.calls,
      target: (t) => t.calls,
      avg: teamAvg?.calls ?? 0,
    },
    {
      key: "visits",
      drill: "visits",
      label: (r, t) => `${r.visits}/${t.visits}`,
      value: (r) => r.visits,
      target: (t) => t.visits,
      avg: teamAvg?.visits ?? 0,
    },
    {
      key: "quotes",
      drill: "quotes",
      label: (r, t) => `${r.quotes}/${t.quotes}`,
      value: (r) => r.quotes,
      target: (t) => t.quotes,
      avg: teamAvg?.quotes ?? 0,
    },
    {
      key: "pipeline",
      drill: "pipeline",
      label: (r, t) =>
        `${formatPipeline(r.pipeline)}/${formatPipeline(t.pipeline)}`,
      value: (r) => r.pipeline,
      target: (t) => t.pipeline,
      avg: teamAvg?.pipeline ?? 0,
    },
    {
      key: "eodPct",
      drill: "eod",
      label: (r) => `${r.eodPct}%`,
      value: (r) => r.eodPct,
      target: (t) => t.eodPct,
      avg: teamAvg?.eodPct ?? 0,
    },
  ];

  return (
    <div className="space-y-5 overflow-x-hidden bg-shell p-3 sm:space-y-6 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Activities"
            value={String(kpis?.activities ?? 0)}
            meta={`${repCount} reps · this week`}
            icon="lightning"
          />
          <DashboardStatCell
            title="Calls"
            value={String(kpis?.calls ?? 0)}
            meta="Past 5 days"
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
            meta={drill ? "In pipeline" : `Quotes sent · ${repCount} reps`}
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

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <DateRangePicker
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
            setDrill(null);
          }}
        />
        {drill ? (
          <div className="flex-1" />
        ) : (
          <>
            <CompareToggle
              checked={compareAvg}
              onCheckedChange={setCompareAvg}
            />
            <div className="relative min-w-[180px] flex-1 sm:max-w-[280px]">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search WO, customer, loca…"
                className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A] focus:border-[#5A5A5A]"
              />
            </div>
            <div className="relative">
              <DashboardToolbarButton
                ref={filterRef}
                leftIcon={<FilterIcon />}
                showChevron
                onClick={() => setFilterOpen((o) => !o)}
              >
                Filter
                {filterKey !== "all" ? " · On" : ""}
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                anchorRef={filterRef}
                align="right"
                className="min-w-[200px]"
                items={FILTER_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                  onSelect: () => setFilterKey(o.id),
                }))}
              />
            </div>
            <div className="relative">
              <DashboardToolbarButton
                ref={sortRef}
                leftIcon={<SortIcon />}
                showChevron
                onClick={() => setSortOpen((o) => !o)}
              >
                Sort:{" "}
                {SORT_OPTIONS.find((s) => s.id === sortKey)?.label ?? "Eod %"}
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={sortOpen}
                onClose={() => setSortOpen(false)}
                anchorRef={sortRef}
                align="right"
                className="min-w-[180px]"
                items={SORT_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                  onSelect: () => setSortKey(o.id),
                }))}
              />
            </div>
            <ExportMenu onExport={handleExportCsv} variant="default" />
          </>
        )}
        {drill ? (
          <CompareToggle
            checked={compareAvg}
            onCheckedChange={setCompareAvg}
          />
        ) : null}
      </div>

      {drill ? (
        <section className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-4 sm:px-5">
            <DashboardToolbarButton
              leftIcon={<BackChevronIcon />}
              onClick={() => setDrill(null)}
            >
              Back to Summary
            </DashboardToolbarButton>
            <p className="min-w-0 flex-1 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
              {drill.repName} · {metricLabel}
              <span className="font-normal text-[#959597]">
                {" "}
                · Filtered from {metricLabel} metric ·{" "}
                {drillLoading ? "…" : `${drillRows.length} records`} ·{" "}
                {formatRangeLabel(from, to)} (Inherited from Summary)
              </span>
            </p>
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
                  {paginatedDrillRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center font-sans text-[12px] uppercase text-[#959597]"
                      >
                        No records for this metric in the selected range
                      </td>
                    </tr>
                  ) : (
                    paginatedDrillRows.map((row) => (
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

          {!drillLoading && drillRows.length > 0 ? (
            <div className="border-t border-divider px-4 py-3 sm:px-5">
              <DashboardPagination
                page={drillPage}
                pageSize={drillPageSize}
                total={drillRows.length}
                onPageChange={setDrillPage}
                onPageSizeChange={(size) => {
                  setDrillPageSize(size);
                  setDrillPage(1);
                }}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-divider bg-panel">
          <div className="space-y-2 border-b border-divider px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Rep performance{" "}
                <span className="font-normal text-[#959597]">
                  · {visibleReps.length} reps · {formatRangeShort(from, to)}
                </span>
              </p>
              <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
                Click any metric to drill into its source list →
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                Targets set per role in Settings &gt; Rep Targets.
              </p>
              {compareAvg ? (
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  <span className="text-[#FDFDFF]">|</span> = Team avg for that
                  metric
                </p>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
            <table className="w-full min-w-[900px] border-collapse text-left">
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
                      className="px-3 py-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] sm:px-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleReps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center font-sans text-[12px] uppercase text-[#959597]"
                    >
                      No rep activity in this date range
                    </td>
                  </tr>
                ) : (
                  visibleReps.map((row) => {
                    const t = repTargets(row, targets);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-divider last:border-b-0 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-4 sm:px-4">
                          <button
                            type="button"
                            onClick={() =>
                              openDrill(row.id, row.name, "activities")
                            }
                            className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-80"
                          >
                            {row.name}
                          </button>
                        </td>
                        {metricCols.map((col) => (
                          <td key={col.key} className="px-3 py-4 sm:px-4">
                            <button
                              type="button"
                              onClick={() =>
                                openDrill(row.id, row.name, col.drill)
                              }
                              className="block w-full min-w-[88px] text-left"
                            >
                              <span className="font-sans text-[12px] font-[510] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF]">
                                {col.label(row, t)}
                              </span>
                              <MetricBar
                                value={col.value(row)}
                                target={col.target(t)}
                                teamAvg={col.avg}
                                showAvg={compareAvg}
                              />
                            </button>
                          </td>
                        ))}
                        <td className="px-3 py-4 text-[#959597] sm:px-4">
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
