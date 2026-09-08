"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmRepDashboard } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { CrmEmptyTabState, CrmLoadFailedState } from "@/features/crm/crm-states";

type DatePreset = { id: string; label: string; from: string; to: string };

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function barPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function performanceBarColor(pct: number) {
  if (pct >= 80) return "#4ADE80";
  if (pct >= 50) return "#E8C47C";
  return "#F97066";
}

function formatClock(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${h12}${mm}${am ? "A" : "P"}`;
}

function formatClockLong(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toUpperCase()
    .replace(" ", "");
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function accountStatusVariant(status: string) {
  const u = status.toUpperCase();
  if (u.includes("ACTIVE")) return "success" as const;
  if (u.includes("PROSPECT") || u.includes("NEEDS") || u.includes("PENDING"))
    return "warning" as const;
  return "neutral" as const;
}

function accountStatusLabel(status: string) {
  const u = status.toUpperCase().replace(/_/g, " ");
  if (u === "NEEDS REVIEW" || u === "INACTIVE") return "DORMANT";
  if (u === "DRAFT" || u === "PENDING") return "PROSPECT";
  return u;
}

function calendarKind(type: string, hasFollowUp: boolean) {
  if (hasFollowUp) return "FOLLOW-UP";
  const u = type.toUpperCase();
  if (u === "VISIT") return "VISIT";
  if (u === "CALL") return "CALL";
  if (u === "MEETING") return "MEETING";
  if (u === "EMAIL" || u === "OTHER") return "TASK";
  return u || "TASK";
}

function kindBadgeClass(kind: string) {
  if (kind === "FOLLOW-UP") return "bg-[#2A2618] text-[#E8C47C]";
  if (kind === "TASK") return "bg-[#122A2A] text-[#5EEAD4]";
  if (kind === "MEETING") return "bg-[#2A1A1A] text-[#F97066]";
  return "bg-[#1A2A24] text-[#4ADE80]";
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3.5h6.5L17.5 6.5V20.5H8V3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14.5 3.5V6.5h3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 11h4M10 14.5h4M10 18h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19h16M7 16V9M12 16V5M17 16v-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckDocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3.5h6.5L17.5 6.5V20.5H8V3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 13l1.5 1.5L14.5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  meta,
  icon,
  progressPct,
  progressColor = "#E8C47C",
}: {
  title: string;
  value: string;
  meta: React.ReactNode;
  icon: React.ReactNode;
  progressPct?: number;
  progressColor?: string;
}) {
  return (
    <div className="rounded-xl border border-[#2D2D30] bg-[#121212] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {title}
        </p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
          {icon}
        </span>
      </div>
      <p className="mt-5 font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF]">
        {value}
      </p>
      <div className="mt-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {meta}
      </div>
      {progressPct != null ? (
        <div className="mt-3 h-[4px] w-full overflow-hidden rounded-full bg-[#2A2A2A]">
          <div
            className="h-full rounded-full transition-[width]"
            style={{
              width: `${Math.max(0, Math.min(100, progressPct))}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  trailing,
  children,
}: {
  title: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#2D2D30] bg-[#121212]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2D30] px-4 py-3.5 sm:px-5">
        <div className="min-w-0 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </div>
        {trailing ? (
          <div className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            {trailing}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function CrmRepDashboardPage() {
  const router = useRouter();
  const presets = React.useMemo(() => buildPresets(), []);
  const [from, setFrom] = React.useState(presets[0]!.from);
  const [to, setTo] = React.useState(presets[0]!.to);
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const rangeRef = React.useRef<HTMLButtonElement>(null);
  const [data, setData] = React.useState<CrmRepDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await crmApi.repDashboard({ from, to });
        if (!cancelled) setData(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Couldn't load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  function applyPreset(p: DatePreset) {
    setFrom(p.from);
    setTo(p.to);
    setRangeOpen(false);
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading dashboard" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-shell p-3 sm:p-5">
        <CrmLoadFailedState
          description={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  if (!data) return null;

  const maxPipeline = Math.max(...data.leaderboard.map((r) => r.pipeline), 1);
  const todayLabel = new Date()
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  const pipelinePct = data.kpis.pipelinePct ?? 0;
  const expenses = data.expenses ?? {
    submittedThisCycle: 0,
    pendingApproval: 0,
    missingReceipts: 0,
  };

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="My Pipeline"
          value={formatPipeline(data.kpis.pipeline)}
          meta={
            <span>
              / {formatPipeline(data.kpis.pipelineTarget ?? 0)} Target —{" "}
              {pipelinePct}%
            </span>
          }
          icon={<LightningIcon />}
          progressPct={pipelinePct}
          progressColor="#E8C47C"
        />
        <KpiCard
          title="My Quotes Sent"
          value={String(data.kpis.quotesSent)}
          meta="This Period"
          icon={<DocIcon />}
        />
        <KpiCard
          title="My Win Rate (Quotes)"
          value={`${data.kpis.winRate}%`}
          meta={`${data.kpis.quotesWon ?? 0} Won / ${data.kpis.quotesClosed ?? 0} Closed`}
          icon={<ChartIcon />}
        />
        <KpiCard
          title="My Eod Status"
          value={data.kpis.eodStatus}
          meta={
            data.kpis.eodSubmittedAt
              ? `Submitted ${formatClock(data.kpis.eodSubmittedAt)}`
              : "Not submitted"
          }
          icon={<CheckDocIcon />}
        />
        <KpiCard
          title="My Tasks Today"
          value={String(data.kpis.tasksToday)}
          meta="Due Today"
          icon={<ListIcon />}
        />
        <KpiCard
          title="My Overdue"
          value={String(data.kpis.overdue)}
          meta="Past Due"
          icon={<LightningIcon />}
        />
      </div>

      <div className="relative inline-flex">
        <button
          ref={rangeRef}
          type="button"
          onClick={() => setRangeOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#222]"
        >
          {formatRangeLabel(from, to)}
          <ChevronDown />
        </button>
        <DashboardMenuPopover
          open={rangeOpen}
          onClose={() => setRangeOpen(false)}
          anchorRef={rangeRef}
          items={presets.map((p) => ({
            id: p.id,
            label: p.label,
            onSelect: () => applyPreset(p),
          }))}
          className="min-w-[180px]"
        />
      </div>

      <Panel
        title={
          <span>
            Team Leaderboard
            {data.rank ? (
              <span className="text-[#959597]">
                {" "}
                — You&apos;re Ranked #{data.rank}
              </span>
            ) : null}
          </span>
        }
        trailing="Other reps' rows are read-only"
      >
        {data.leaderboard.length === 0 ? (
          <div className="p-4">
            <CrmEmptyTabState description="No rep activity in this date range." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2D2D30]">
                  {[
                    "Rep",
                    "Activities",
                    "Calls",
                    "Visits",
                    "Quotes",
                    "Pipeline",
                    "Eod %",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] sm:px-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((row) => {
                  const isMe = row.id === data.me.id;
                  const pipePct = barPct(row.pipeline, maxPipeline);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-[#2D2D30] last:border-b-0",
                        isMe && "bg-[#14352C]/70",
                      )}
                    >
                      <td
                        className={cn(
                          "px-4 py-3.5 font-sans text-[12px] uppercase tracking-[-0.02em] sm:px-5",
                          isMe ? "font-[510] text-[#4ADE80]" : "text-[#FDFDFF]",
                        )}
                      >
                        {row.name}
                        {isMe ? " — You" : ""}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF] sm:px-5">
                        {row.activities}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF] sm:px-5">
                        {row.calls}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF] sm:px-5">
                        {row.visits}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF] sm:px-5">
                        {row.quotes}
                      </td>
                      <td className="min-w-[120px] px-4 py-3.5 sm:px-5">
                        <p className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {formatPipeline(row.pipeline)}
                        </p>
                        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pipePct}%`,
                              backgroundColor: performanceBarColor(pipePct),
                            }}
                          />
                        </div>
                      </td>
                      <td className="min-w-[100px] px-4 py-3.5 sm:px-5">
                        <p className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                          {row.eodPct}%
                        </p>
                        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barPct(row.eodPct, 100)}%`,
                              backgroundColor: performanceBarColor(row.eodPct),
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Panel
          title={
            <span>
              My Tasks
              <span className="text-[#959597]">
                {" "}
                — {data.kpis.tasksToday} Today — {data.kpis.overdue} Overdue
              </span>
            </span>
          }
        >
          <div className="space-y-4 p-4 sm:p-5">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                Today
              </p>
              {data.tasks.today.length === 0 ? (
                <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                  No tasks due today
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-[#2D2D30]">
                  {data.tasks.today.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/crm/sales/${t.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 transition-opacity hover:opacity-80"
                      >
                        <span className="min-w-0 truncate font-sans text-[12px] uppercase text-[#FDFDFF]">
                          {t.title}
                          {t.customer ? ` — ${t.customer}` : ""}
                        </span>
                        <span className="shrink-0 font-sans text-[11px] uppercase tabular-nums text-[#959597]">
                          {formatClock(t.dueAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FF8F9B]">
                Overdue
              </p>
              {data.tasks.overdue.length === 0 ? (
                <p className="mt-2 font-sans text-[12px] uppercase text-[#959597]">
                  No overdue tasks
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-[#2D2D30]">
                  {data.tasks.overdue.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/crm/sales/${t.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 transition-opacity hover:opacity-80"
                      >
                        <span className="min-w-0 truncate font-sans text-[12px] uppercase text-[#FF8F9B]">
                          {t.title}
                          {t.customer ? ` — ${t.customer}` : ""}
                        </span>
                        <span className="shrink-0 font-sans text-[11px] uppercase tabular-nums text-[#FF8F9B]">
                          Due {formatShortDate(t.dueAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title={
            <span>
              My Calendar
              <span className="text-[#959597]"> — Today — {todayLabel}</span>
            </span>
          }
        >
          <div className="p-4 sm:p-5">
            {data.calendar.length === 0 ? (
              <CrmEmptyTabState
                description="No activities scheduled for today."
                addLabel="Log Activity"
                onAdd={() => router.push("/crm/sales/new")}
              />
            ) : (
              <ul className="divide-y divide-[#2D2D30]">
                {data.calendar.map((item) => {
                  const kind = calendarKind(item.type, item.hasFollowUp);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/crm/sales/${item.id}`}
                        className="flex flex-wrap items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
                      >
                        <span className="w-[4.5rem] shrink-0 font-sans text-[11px] uppercase tabular-nums text-[#959597]">
                          {formatClockLong(item.activityAt)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
                            kindBadgeClass(kind),
                          )}
                        >
                          {kind}
                        </span>
                        <span className="min-w-0 truncate font-sans text-[12px] uppercase text-[#FDFDFF]">
                          {item.customer ?? item.subject ?? item.type}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="My Expenses">
          <div className="divide-y divide-[#2D2D30] px-4 sm:px-5">
            {[
              {
                label: "Submitted This Cycle",
                value: formatMoney(expenses.submittedThisCycle),
              },
              {
                label: "Pending Approval",
                value: String(expenses.pendingApproval),
              },
              {
                label: "Missing Receipts",
                value: String(expenses.missingReceipts),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
                  {row.label}
                </span>
                <span className="font-sans text-[12px] font-[510] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title={
          <span>
            My Accounts
            <span className="text-[#959597]">
              {" "}
              — {data.accounts.length} Accounts Assigned To You
            </span>
          </span>
        }
      >
        {data.accounts.length === 0 ? (
          <div className="p-4">
            <CrmEmptyTabState
              description="No accounts are assigned to you yet."
              addLabel="View Customers"
              onAdd={() => router.push("/crm/accounts")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2D2D30]">
                  {["Account", "Status", "Pipeline", "Last Activity"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] sm:px-5"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#2D2D30] last:border-b-0 hover:bg-white/[0.02]"
                    onClick={() => router.push(`/crm/accounts/${row.id}`)}
                  >
                    <td className="px-4 py-3.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:px-5">
                      {row.name}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5">
                      <DashboardBadge
                        variant={accountStatusVariant(row.status)}
                        pill
                      >
                        {accountStatusLabel(row.status)}
                      </DashboardBadge>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF] sm:px-5">
                      {formatPipeline(row.pipeline)}
                    </td>
                    <td className="px-4 py-3.5 font-sans text-[12px] uppercase tabular-nums text-[#959597] sm:px-5">
                      {formatShortDate(row.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
