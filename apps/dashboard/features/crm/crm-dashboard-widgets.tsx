"use client";

import * as React from "react";
import type { ReactNode } from "react";
import {
  DashboardHorizontalBarChart,
  DashboardPanel,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardWidgetHeader,
  DashboardWorkloadBar,
  cn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmDashboardOverview,
} from "@/lib/crm-api";
import { formatKpiValue, kpiCellsFromApi } from "@/lib/crm-ui";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  CUSTOMERS_KPI_SHELL,
  EOD_KPI_SHELL,
  QUOTES_KPI_SHELL,
  SALES_KPI_SHELL,
} from "./crm-constants";

/** Figma pattern — gray section title above the panel card. */
export function CrmWidgetSection({
  title,
  actionLabel,
  onAction,
  children,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <DashboardWidgetHeader
        title={title}
        actionLabel={actionLabel}
        onAction={onAction}
      />
      <DashboardPanel className="p-3.5 sm:p-4">{children}</DashboardPanel>
    </section>
  );
}

const DashboardCtx = React.createContext<CrmDashboardOverview | null>(null);

export function CrmDashboardDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<CrmDashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.dashboardOverview();
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading dashboard" />
      </div>
    );
  }

  return (
    <DashboardCtx.Provider value={data}>{children}</DashboardCtx.Provider>
  );
}

function useDashboard() {
  return React.useContext(DashboardCtx);
}

function dash(n: number | null | undefined) {
  return formatKpiValue(n);
}

export function CrmEodComplianceCard() {
  const data = useDashboard();
  const eod = data?.eod;
  const cells = React.useMemo(
    () =>
      kpiCellsFromApi(EOD_KPI_SHELL, {
        today: eod?.today ?? 0,
        submitted: eod?.submitted ?? 0,
        pending: eod?.pending ?? 0,
        activities: eod?.activities ?? 0,
        pipeline: eod?.pipeline ?? 0,
      }),
    [eod],
  );
  const submitted = eod?.submitted ?? 0;
  const today = eod?.today ?? 0;
  const pending = eod?.pending ?? 0;
  const hasData = submitted > 0 || today > 0 || pending > 0;
  const total = Math.max(today, submitted + pending, 1);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]">
            Compliance status
          </p>
          <p className="mt-3 font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[32px]">
            {hasData ? `${submitted}/${Math.max(today, submitted + pending)}` : "—"}
          </p>
        </div>
        <p className="shrink-0 pt-0.5 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
          Live
        </p>
      </div>
      <div className="mt-5">
        {hasData ? (
          <DashboardWorkloadBar
            segments={[
              {
                count: Math.max(submitted, 0),
                tone: "success",
                label: "Submitted",
              },
              {
                count: Math.max(pending, Math.max(0, total - submitted)),
                tone: "error",
                label: "Pending",
              },
            ]}
            total={total}
            showTotal={false}
          />
        ) : (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            No EOD data yet
          </p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cells.slice(0, 3).map((cell) => (
          <div key={cell.title} className="min-w-0">
            <p className="truncate text-[10px] uppercase text-[#959597]">
              {cell.title}
            </p>
            <p className="mt-1 text-[13px] font-[590] text-[#FDFDFF]">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmRepPerformanceTable() {
  const data = useDashboard();
  const rows = [
    {
      label: "Customers",
      a: dash(data?.customers.active),
      b: dash(data?.customers.needsReview),
      c: dash(data?.customers.archived),
    },
    {
      label: "Sales",
      a: dash(data?.sales.thisWeek),
      b: dash(data?.sales.calls),
      c: dash(data?.sales.visits),
    },
    {
      label: "Quotes",
      a: dash(data?.quotes.draft),
      b: dash(data?.quotes.sent),
      c: dash(data?.quotes.approved),
    },
  ];
  return (
    <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
      <table className="w-full min-w-0 border-collapse text-left md:min-w-[420px]">
        <thead>
          <tr className="divider-row">
            {["Metric", "A", "B", "C"].map((header) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  "pb-3 pr-2 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] last:pr-0 sm:pr-3 sm:text-[11px] md:text-[12px]",
                  header !== "Metric" && "text-right",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="divider-row">
              <td className="py-3 pr-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                {row.label}
              </td>
              <td className="py-3 pr-3 text-right font-sans text-[12px] tabular-nums text-[#FDFDFF]">
                {row.a}
              </td>
              <td className="py-3 pr-3 text-right font-sans text-[12px] tabular-nums text-[#FDFDFF]">
                {row.b}
              </td>
              <td className="py-3 text-right font-sans text-[12px] tabular-nums text-[#FDFDFF]">
                {row.c}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CrmSalesActivityList() {
  const data = useDashboard();
  const recent = data?.recentSales ?? [];

  if (recent.length === 0) {
    return (
      <p className="py-3 font-sans text-[12px] uppercase text-[#959597]">
        No recent sales activity —
      </p>
    );
  }

  return (
    <ul className="list-none space-y-0">
      {recent.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 divider-row py-3.5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-[12px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {item.subject || item.type}
            </p>
            <p className="mt-1.5 truncate font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {[item.customer, item.rep].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <span className="shrink-0 font-sans text-[12px] font-[590] uppercase tabular-nums text-[#FDFDFF]">
            {item.code || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrmMsaRenewalList() {
  const data = useDashboard();
  const cells = React.useMemo(
    () =>
      kpiCellsFromApi(CUSTOMERS_KPI_SHELL, {
        total: data?.customers.total ?? 0,
        active: data?.customers.active ?? 0,
        needsReview: data?.customers.needsReview ?? 0,
        archived: data?.customers.archived ?? 0,
      }),
    [data],
  );
  return (
    <ul className="list-none space-y-0">
      {cells.map((cell) => (
        <li
          key={cell.title}
          className="flex items-center justify-between gap-3 divider-row py-3.5"
        >
          <span className="min-w-0 truncate font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            {cell.title}
          </span>
          <span className="shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
            {cell.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrmFieldEventsWeek() {
  const data = useDashboard();
  const items = [
    { label: "Calls", count: data?.sales.calls },
    { label: "Visits", count: data?.sales.visits },
    { label: "Meetings", count: data?.sales.meetings },
    { label: "Follow-ups", count: data?.sales.followUps },
  ];
  return (
    <ul className="list-none space-y-0">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center justify-between gap-3 divider-row py-3"
        >
          <span className="font-sans text-[12px] font-normal uppercase text-[#959597]">
            {item.label}
          </span>
          <span className="font-sans text-[12px] font-[590] uppercase tabular-nums text-[#FDFDFF]">
            {dash(item.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrmQuotePipelinePanel() {
  const data = useDashboard();
  const q = data?.quotes;
  const rawItems = [
    { label: "Draft", value: q?.draft ?? 0, tone: "default" as const },
    { label: "Sent", value: q?.sent ?? 0, tone: "default" as const },
    { label: "Approved", value: q?.approved ?? 0, tone: "success" as const },
    { label: "Converted", value: q?.converted ?? 0, tone: "critical" as const },
  ];
  const hasBars = rawItems.some((i) => i.value > 0);
  const cells = React.useMemo(
    () =>
      kpiCellsFromApi(QUOTES_KPI_SHELL, {
        draft: q?.draft ?? 0,
        sent: q?.sent ?? 0,
        approved: q?.approved ?? 0,
        expired: q?.expired ?? 0,
        converted: q?.converted ?? 0,
      }),
    [q],
  );

  return (
    <div>
      {hasBars ? (
        <DashboardHorizontalBarChart items={rawItems} />
      ) : (
        <p className="py-2 font-sans text-[12px] uppercase text-[#959597]">
          No quote pipeline data —
        </p>
      )}
      <div className="divider-section-top mt-4 grid grid-cols-2 gap-4 pt-4 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[12px]">
        {cells.slice(0, 2).map((cell) => (
          <div key={cell.title}>
            <p className="text-[#959597]">{cell.title}</p>
            <p className="mt-1.5 font-[590] text-[#FDFDFF]">{cell.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmAccountSetupHealth() {
  const data = useDashboard();
  const total = data?.customers.total ?? 0;
  const items = [
    {
      label: "Active",
      value: data?.customers.active ?? 0,
      tone: "healthy" as const,
    },
    {
      label: "Needs review",
      value: data?.customers.needsReview ?? 0,
      tone: "warning" as const,
    },
    {
      label: "Archived",
      value: data?.customers.archived ?? 0,
      tone: "critical" as const,
    },
  ];
  const toneColor = {
    healthy: "#22C55E",
    warning: "#FF9500",
    critical: "#FF4D4D",
  } as const;

  if (total === 0) {
    return (
      <p className="py-2 font-sans text-[12px] uppercase text-[#959597]">
        No account setup data —
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-4">
        {items.map((row) => {
          const pct = Math.round((row.value / Math.max(total, 1)) * 100);
          return (
            <li key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-3 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[12px]">
                <span className="text-[#959597]">{row.label}</span>
                <span className="font-[590] tabular-nums text-[#FDFDFF]">
                  {dash(row.value)}/{dash(total)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${row.value === 0 ? 0 : Math.max(pct, 2)}%`,
                    backgroundColor: toneColor[row.tone],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Compact KPI strip used by overview layout when needed. */
export function CrmLiveKpiStrip() {
  const data = useDashboard();
  const cells = React.useMemo(
    () =>
      kpiCellsFromApi(CUSTOMERS_KPI_SHELL, {
        total: data?.customers.total ?? 0,
        active: data?.customers.active ?? 0,
        needsReview: data?.customers.needsReview ?? 0,
        archived: data?.customers.archived ?? 0,
      }),
    [data],
  );
  return (
    <DashboardStatGrid>
      <DashboardStatRow columns={4}>
        {cells.map((cell) => (
          <DashboardStatCell key={cell.title} {...cell} />
        ))}
      </DashboardStatRow>
    </DashboardStatGrid>
  );
}

/** @deprecated kept for imports — prefer sales recent list */
export function CrmSalesKpiFallbackList() {
  const data = useDashboard();
  const cells = React.useMemo(
    () =>
      kpiCellsFromApi(SALES_KPI_SHELL, {
        thisWeek: data?.sales.thisWeek ?? 0,
        calls: data?.sales.calls ?? 0,
        visits: data?.sales.visits ?? 0,
        meetings: data?.sales.meetings ?? 0,
        followUps: data?.sales.followUps ?? 0,
      }),
    [data],
  );
  return (
    <ul className="list-none space-y-0">
      {cells.map((cell) => (
        <li
          key={cell.title}
          className="flex items-center justify-between gap-3 divider-row py-3.5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
              {cell.title}
            </p>
          </div>
          <span className="shrink-0 font-sans text-[13px] font-[590] tabular-nums text-[#FDFDFF]">
            {cell.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
