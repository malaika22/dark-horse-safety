"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCycleKpiCard,
  DashboardCycleKpiStrip,
  DashboardExceptionRow,
  DashboardHorizontalBarChart,
  DashboardMutedLink,
  type DashboardCycleKpiItem,
  type DashboardHorizontalBarItem,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmDashboardOverview } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  DashboardSectionLabel,
  DashboardWidgetSection,
} from "./dashboard-widgets";

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function buildCycle(data: CrmDashboardOverview): DashboardCycleKpiItem[] {
  return [
    {
      title: "Open Pipeline",
      value: money(data.quotes.openPipeline),
      icon: "pipeline",
      meta: `${data.quotes.draft + data.quotes.sent + data.quotes.approved} open quotes`,
    },
    {
      title: "Sales This Week",
      value: String(data.sales.thisWeek),
      icon: "approved",
      meta: `${data.sales.calls} calls · ${data.sales.visits} visits`,
    },
    {
      title: "EOD Today",
      value: String(data.eod.today),
      icon: "payroll",
      meta: `${data.eod.submitted} submitted · ${data.eod.pending} pending`,
    },
    {
      title: "Customers",
      value: String(data.customers.active),
      icon: "unbilled",
      meta: `${data.customers.openJobs} open jobs · ${data.customers.needsReview} review`,
    },
  ];
}

function buildQuotePipeline(
  data: CrmDashboardOverview,
): DashboardHorizontalBarItem[] {
  return [
    { label: "Draft", value: data.quotes.draft, icon: "document" },
    { label: "Sent", value: data.quotes.sent, icon: "send" },
    { label: "Approved", value: data.quotes.approved, icon: "check" },
    { label: "Won", value: data.quotes.converted, icon: "won" },
    {
      label: "Expired",
      value: data.quotes.expired,
      tone: data.quotes.expired > 0 ? "critical" : "default",
      icon: "expired",
    },
  ];
}

function buildJobFlow(data: CrmDashboardOverview): DashboardHorizontalBarItem[] {
  return [
    { label: "Calls", value: data.sales.calls, icon: "posted" },
    { label: "Visits", value: data.sales.visits, icon: "truck" },
    { label: "Meetings", value: data.sales.meetings, icon: "eye" },
    {
      label: "Follow-ups",
      value: data.sales.followUps,
      tone: data.sales.followUps > 0 ? "critical" : "default",
      icon: "clock",
    },
  ];
}

export function DashboardOverview() {
  const router = useRouter();
  const [data, setData] = React.useState<CrmDashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.dashboardOverview();
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          toastApiError(err);
          setData(null);
        }
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
      <div className="flex min-h-[40vh] items-center justify-center bg-shell p-5">
        <BrandLoader label="Loading dashboard" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-shell p-5">
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Unable to load live dashboard data.
        </p>
      </div>
    );
  }

  const cycle = buildCycle(data);
  const quotePipeline = buildQuotePipeline(data);
  const jobFlow = buildJobFlow(data);
  const exceptions = [
    ...data.msaRenewals.slice(0, 4).map((m) => ({
      title: `MSA renewal · ${m.customer} · ${m.code}`,
      tag: "MSA",
      tagVariant: "warning" as const,
    })),
    ...(data.customers.needsReview > 0
      ? [
          {
            title: `${data.customers.needsReview} customers need review`,
            tag: "Accounts",
            tagVariant: "error" as const,
          },
        ]
      : []),
    ...(data.eod.pending > 0
      ? [
          {
            title: `${data.eod.pending} EOD reports pending`,
            tag: "EOD",
            tagVariant: "warning" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DashboardSectionLabel>This cycle</DashboardSectionLabel>
          <DashboardMutedLink onClick={() => router.push("/crm/sales-summary")}>
            View sales summary
          </DashboardMutedLink>
        </div>
        <DashboardCycleKpiStrip>
          {cycle.map((cell) => (
            <DashboardCycleKpiCard key={cell.title} {...cell} />
          ))}
        </DashboardCycleKpiStrip>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <DashboardWidgetSection
            title="Exception queue"
            actionLabel="View all"
            onAction={() => router.push("/crm/accounts")}
          >
            {exceptions.length === 0 ? (
              <p className="px-1 py-2 font-sans text-[11px] uppercase text-[#959597]">
                No exceptions
              </p>
            ) : (
              <ul className="list-none space-y-0">
                {exceptions.map((row) => (
                  <DashboardExceptionRow
                    key={row.title}
                    tag={row.tag}
                    tagVariant={row.tagVariant}
                    title={row.title}
                    tagPosition="end"
                  />
                ))}
              </ul>
            )}
          </DashboardWidgetSection>

          <DashboardWidgetSection
            title="Recent sales activity"
            actionLabel="View all"
            onAction={() => router.push("/crm/sales")}
          >
            {data.recentSales.length === 0 ? (
              <p className="px-1 py-2 font-sans text-[11px] uppercase text-[#959597]">
                No recent activity
              </p>
            ) : (
              <ul className="list-none divide-y divide-[#2D2D30]">
                {data.recentSales.slice(0, 6).map((row) => (
                  <li key={row.id} className="py-2.5">
                    <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.subject || row.type} · {row.customer || "—"}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                      {row.rep || "—"} · {row.code} · {row.outcome || row.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardWidgetSection>

          <DashboardWidgetSection
            title="Rep performance"
            actionLabel="View all"
            onAction={() => router.push("/crm/sales-summary")}
          >
            {data.repPerformance.length === 0 ? (
              <p className="px-1 py-2 font-sans text-[11px] uppercase text-[#959597]">
                No rep activity this week
              </p>
            ) : (
              <ul className="list-none divide-y divide-[#2D2D30]">
                {data.repPerformance.slice(0, 6).map((rep) => (
                  <li
                    key={rep.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                      {rep.name}
                    </span>
                    <span className="font-sans text-[10px] uppercase tabular-nums text-[#959597]">
                      {rep.activities} act · {rep.calls} calls · {rep.visits}{" "}
                      visits
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardWidgetSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <DashboardWidgetSection
            title="Sales activity"
            actionLabel="View sales"
            onAction={() => router.push("/crm/sales")}
          >
            <DashboardHorizontalBarChart items={jobFlow} />
          </DashboardWidgetSection>

          <DashboardWidgetSection
            title="Quote pipeline"
            actionLabel="View crm"
            onAction={() => router.push("/crm/quotes")}
          >
            <DashboardHorizontalBarChart items={quotePipeline} />
          </DashboardWidgetSection>

          <DashboardWidgetSection
            title="MSA renewals"
            actionLabel="View accounts"
            onAction={() => router.push("/crm/accounts")}
          >
            {data.msaRenewals.length === 0 ? (
              <p className="px-1 py-2 font-sans text-[11px] uppercase text-[#959597]">
                No upcoming MSA renewals
              </p>
            ) : (
              <ul className="list-none divide-y divide-[#2D2D30]">
                {data.msaRenewals.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2.5">
                    <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                      {m.customer}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                      {m.code} · {m.detail || m.status} ·{" "}
                      {m.expiresAt.slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardWidgetSection>
        </div>
      </div>
    </div>
  );
}
