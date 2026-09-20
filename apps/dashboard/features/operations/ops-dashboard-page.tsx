"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardActivityRow,
  DashboardExceptionRow,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardBadgeVariant,
  type StatIconName,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type OpsDashboardActivityItem,
  type OpsDashboardOverview,
  type OpsDashboardReviewItem,
  type OpsDashboardStat,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

function CreateWoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SegmentTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-full px-3 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] transition-colors md:text-[11px]",
              active
                ? "bg-[#FDFDFF] text-[#111111]"
                : "bg-[#2A2A2A] text-[#959597] hover:bg-[#333333] hover:text-[#FDFDFF]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ViewAllButton({
  label = "View All",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-2.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:border-[#3E3E3E] hover:bg-[#222222] md:text-[12px]"
    >
      {label}
      <span aria-hidden>→</span>
    </button>
  );
}

function toIcon(name: string): StatIconName {
  const allowed: StatIconName[] = [
    "time",
    "edit",
    "gps",
    "wrench",
    "document",
    "lightning",
    "folder",
    "customers",
    "operations",
    "hr",
  ];
  return (allowed.includes(name as StatIconName)
    ? name
    : "operations") as StatIconName;
}

function StatFromApi({
  stat,
  title,
  onAction,
}: {
  stat: OpsDashboardStat;
  title: string;
  onAction: () => void;
}) {
  return (
    <DashboardStatCell
      title={title}
      value={String(stat.value)}
      meta={stat.meta}
      icon={toIcon(stat.icon)}
      action={stat.action}
      onAction={onAction}
    />
  );
}

function activityVariant(v: string): DashboardBadgeVariant {
  if (v === "error") return "error";
  if (v === "success") return "success";
  if (v === "review") return "review";
  if (v === "gold") return "gold";
  return "warning";
}

export function OpsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<OpsDashboardOverview | null>(null);
  const [reviewTab, setReviewTab] = React.useState("all");
  const [activityTab, setActivityTab] = React.useState("all");
  const [reloadKey, setReloadKey] = React.useState(0);

  useSetHeaderBreadcrumb("Operations / Operations Dashboard");
  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      {data?.lastSyncLabel ? (
        <span className="hidden font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] lg:inline">
          {data.lastSyncLabel}
        </span>
      ) : null}
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<CreateWoIcon />}
        showChevron
        onClick={() => router.push("/operations/work-orders/new")}
      >
        Create Work Order
      </DashboardToolbarButton>
    </div>,
    [router, data?.lastSyncLabel],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await operationsApi.dashboardOverview();
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
  }, [reloadKey]);

  const reviews = React.useMemo(() => {
    if (!data) return [] as OpsDashboardReviewItem[];
    if (reviewTab === "all") return data.needingReview;
    return data.needingReview.filter((r) => r.category === reviewTab);
  }, [data, reviewTab]);

  const activities = React.useMemo(() => {
    if (!data) return [] as OpsDashboardActivityItem[];
    if (activityTab === "all") return data.activity;
    return data.activity.filter((a) => a.type === activityTab);
  }, [data, activityTab]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading operations dashboard" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
        <p className="mb-3 font-sans text-[12px] uppercase text-[#959597]">
          Failed to load operations dashboard.
        </p>
        <DashboardToolbarButton onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </DashboardToolbarButton>
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] lg:hidden">
        {data.lastSyncLabel}
      </p>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          <StatFromApi
            title="Open Work Orders"
            stat={s.openWorkOrders}
            onAction={() => router.push(s.openWorkOrders.href)}
          />
          <StatFromApi
            title="In Progress"
            stat={s.inProgress}
            onAction={() => router.push(s.inProgress.href)}
          />
          <StatFromApi
            title="Ready For Review"
            stat={s.readyForReview}
            onAction={() => router.push(s.readyForReview.href)}
          />
          <StatFromApi
            title="Dispatched"
            stat={s.dispatched}
            onAction={() => router.push(s.dispatched.href)}
          />
          <StatFromApi
            title="Awaiting Acceptance"
            stat={s.awaitingAcceptance}
            onAction={() => router.push(s.awaitingAcceptance.href)}
          />
        </DashboardStatRow>
        <DashboardStatRow columns={4}>
          <StatFromApi
            title="Multi-Day Jobs"
            stat={s.multiDayJobs}
            onAction={() => router.push(s.multiDayJobs.href)}
          />
          <StatFromApi
            title="Missing ST Link"
            stat={s.missingStLink}
            onAction={() => router.push(s.missingStLink.href)}
          />
          <StatFromApi
            title="Missing Req. Docs"
            stat={s.missingReqDocs}
            onAction={() => router.push(s.missingReqDocs.href)}
          />
          <StatFromApi
            title="Payroll-Ready WOs"
            stat={s.payrollReadyWos}
            onAction={() => router.push(s.payrollReadyWos.href)}
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Needing Review"
            trailing={
              <SegmentTabs
                tabs={data.reviewCategories}
                value={reviewTab}
                onChange={setReviewTab}
              />
            }
          />
          <div className="mt-4 min-h-0 flex-1">
            {reviews.length === 0 ? (
              <p className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                Nothing needs review
              </p>
            ) : (
              <ul className="list-none space-y-0">
                {reviews.map((row) => (
                  <DashboardExceptionRow
                    key={row.id}
                    tag={row.categoryLabel}
                    tagVariant="gold"
                    title={row.title}
                    action="Review"
                    onAction={() => router.push(row.href)}
                  />
                ))}
              </ul>
            )}
          </div>
          <ViewAllButton
            onClick={() => router.push("/operations/work-orders")}
          />
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Recent Job Activity"
            trailing={
              <SegmentTabs
                tabs={data.activityTypes}
                value={activityTab}
                onChange={setActivityTab}
              />
            }
          />
          <div className="mt-4 min-h-0 flex-1">
            {activities.length === 0 ? (
              <p className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                No recent activity
              </p>
            ) : (
              <ul className="list-none space-y-0">
                {activities.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="block w-full text-left"
                    onClick={() => router.push(row.href)}
                  >
                    <DashboardActivityRow
                      title={row.title}
                      subtitle={row.subtitle}
                      status={row.status}
                      statusVariant={activityVariant(row.statusVariant)}
                    />
                  </button>
                ))}
              </ul>
            )}
          </div>
          <ViewAllButton onClick={() => router.push("/operations/dispatch")} />
        </DashboardPanel>
      </div>
    </div>
  );
}
