"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardFilterTabs,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrTrainingDashboard,
  type HrTrainingRecord,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  AssignTrainingModal,
  CertificateRecordModal,
} from "@/features/hr/training-modals";

type KindFilter = "ALL" | "BBS" | "FIT_TEST" | "SSE";

const EMPTY_DASH: HrTrainingDashboard = {
  kpis: {
    activeEmployees: 0,
    enrolledLabel: "All enrolled",
    recordsOnFile: 0,
    topicsLabel: "Across 0 topics",
    expiringSoon: 0,
    dueLabel: "0 due in 30d",
  },
  records: [],
  widgets: {
    completion: [],
    assignments: {
      completed: 0,
      total: 0,
      summaryLabel: "Completed this week",
      overdueLabel: "Overdue this week",
      rows: [],
    },
    certificates: [],
    expiry: [],
    quizzes: [],
  },
};

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 12h15M12 4c2.5 2.8 3.8 5.5 3.8 8s-1.3 5.2-3.8 8c-2.5-2.8-3.8-5.5-3.8-8s1.3-5.2 3.8-8z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function BlocksIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** Filled status pills used in the training records table. */
function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "bg-[#203B2C] text-[#ACEBCE]"
      : tone === "warning"
        ? "bg-[#2A2618] text-[#C4A35A]"
        : tone === "danger"
          ? "bg-[#3B2020] text-[#E8A0A0]"
          : "bg-[#2A2A2A] text-[#C8C8C8]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        cls,
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

/** Outlined chips used in bottom widgets (PLAN / RENEW / MISSING / VERIFIED). */
function OutlineChip({
  label,
  tone = "plan",
}: {
  label: string;
  tone?: "plan" | "renew" | "missing";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone === "renew" || tone === "missing"
          ? "border-[#6B3030] text-[#E8A0A0]"
          : "border-[#5A4A28] text-[#C4A35A]",
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

function verificationTone(v: string): "success" | "warning" | "danger" | "neutral" {
  const s = v.toUpperCase();
  if (s === "VERIFIED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "REJECTED" || s === "EXPIRED" || s === "MISSING") return "danger";
  return "neutral";
}

function statusTone(v: string): "success" | "warning" | "danger" | "neutral" {
  const s = v.toUpperCase();
  if (s === "COMPLETE" || s === "CURRENT") return "success";
  if (s === "PENDING" || s === "NEEDS_REVIEW" || s === "BBS_MISSING")
    return "warning";
  if (s === "EXPIRED") return "danger";
  return "neutral";
}

function certChipTone(label: string): "plan" | "renew" | "missing" {
  const s = label.toUpperCase();
  if (s === "MISSING" || s === "REJECTED") return "missing";
  return "plan";
}

function WidgetCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-[#2D2D30] bg-panel">
      <div className="border-b border-[#2A2A2A] px-4 py-3">
        <DashboardPanelTitle icon="lightning" title={title} titleClassName="text-[12px] md:text-[13px]" />
      </div>
      <div className="flex-1 px-4 py-2">{children}</div>
      {footer ? (
        <div className="border-t border-[#2A2A2A] px-4 py-3">{footer}</div>
      ) : null}
    </section>
  );
}

function WidgetRow({
  title,
  subtitle,
  subtitleTone,
  right,
}: {
  title: string;
  subtitle?: string | null;
  subtitleTone?: "muted" | "warn" | "danger";
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#222] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </p>
        {subtitle ? (
          <p
            className={cn(
              "mt-0.5 truncate font-sans text-[10px] uppercase tracking-[-0.01em]",
              subtitleTone === "warn"
                ? "text-[#C4A35A]"
                : subtitleTone === "danger"
                  ? "text-[#E8A0A0]"
                  : "text-[#959597]",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function TrainingPage() {
  const router = useRouter();
  const [dash, setDash] = React.useState<HrTrainingDashboard>(EMPTY_DASH);
  const [kind, setKind] = React.useState<KindFilter>("ALL");
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [bbsOpen, setBbsOpen] = React.useState(false);
  const [certOpen, setCertOpen] = React.useState(false);

  useSetHeaderBreadcrumb("Employees & HR / Training");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await hrApi.trainingDashboard();
        if (!cancelled) setDash(res.data);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const openNew = React.useCallback(() => {
    router.push("/hr/training/new");
  }, [router]);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      <DashboardToolbarButton
        leftIcon={<GlobeIcon />}
        onClick={() => toastSuccess("Compliance export queued")}
      >
        Export Compliance
      </DashboardToolbarButton>
      <DashboardToolbarButton onClick={() => setBbsOpen(true)}>
        BBS Retrain
      </DashboardToolbarButton>
      <DashboardToolbarButton onClick={() => setAssignOpen(true)}>
        Assign
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<BlocksIcon />}
        onClick={openNew}
      >
        New Record
      </DashboardToolbarButton>
    </div>,
    [openNew],
  );

  const records = React.useMemo(() => {
    if (kind === "ALL") return dash.records;
    return dash.records.filter((r) => r.kind === kind);
  }, [dash.records, kind]);

  const columns = React.useMemo<DashboardDataTableColumn<HrTrainingRecord>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <span className="font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
            {row.employee}
          </span>
        ),
      },
      {
        id: "user",
        header: "User",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.user}
          </span>
        ),
      },
      {
        id: "topic",
        header: "Topic",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-[11px] uppercase text-[#FDFDFF]">
              {row.topic}
            </p>
            {row.topicCode ? (
              <p className="truncate font-sans text-[10px] uppercase text-[#959597]">
                {row.topicCode}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "date",
        header: "Date",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.date || "—"}
          </span>
        ),
      },
      {
        id: "mentor",
        header: "Mentor",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.mentor || "—"}
          </span>
        ),
      },
      {
        id: "score",
        header: "Score",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.score || "—"}
          </span>
        ),
      },
      {
        id: "verification",
        header: "Verification",
        cell: (row) => (
          <StatusPill
            label={row.verification}
            tone={verificationTone(row.verification)}
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusPill label={row.status} tone={statusTone(row.status)} />
        ),
      },
    ],
    [],
  );

  if (loading && dash.records.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  const { kpis, widgets } = dash;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Active Employees"
            value={String(kpis.activeEmployees)}
            meta={kpis.enrolledLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Records on File"
            value={String(kpis.recordsOnFile)}
            meta={kpis.topicsLabel}
            icon="time"
          />
          <DashboardStatCell
            title="Expiring Soon"
            value={String(kpis.expiringSoon)}
            meta={kpis.dueLabel}
            icon="time"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle
            icon="lightning"
            title="Training Records"
            trailing={
              <DashboardFilterTabs
                tabs={[
                  { id: "ALL", label: "All" },
                  { id: "BBS", label: "BBS" },
                  { id: "FIT_TEST", label: "Fit Test" },
                  { id: "SSE", label: "SSE" },
                ]}
                value={kind}
                onChange={(id) => setKind(id as KindFilter)}
                className="w-auto shrink-0"
              />
            }
          />
        </div>
        <DashboardDataTable
          columns={columns}
          rows={records}
          getRowId={(r) => r.id}
          emptyMessage="No training records"
          embedded
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <WidgetCard title="Training Completion">
            {widgets.completion.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                subtitleTone={
                  row.action === "RENEW"
                    ? "danger"
                    : row.subtitle?.toLowerCase().includes("recert")
                      ? "warn"
                      : "muted"
                }
                right={
                  <OutlineChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>

          <WidgetCard
            title="Training Assignments"
            footer={
              <DashboardToolbarButton
                leftIcon={<GlobeIcon />}
                className="w-full justify-center"
                onClick={() => toastSuccess("Compliance export queued")}
              >
                Export Compliance
              </DashboardToolbarButton>
            }
          >
            <div className="border-b border-[#222] py-3">
              <p className="font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                {widgets.assignments.completed} / {widgets.assignments.total}
              </p>
              <p className="mt-1.5 font-sans text-[10px] uppercase text-[#959597]">
                {widgets.assignments.summaryLabel}
              </p>
            </div>
            <p className="pt-3 pb-1 font-sans text-[10px] uppercase text-[#959597]">
              {widgets.assignments.overdueLabel}
            </p>
            {widgets.assignments.rows.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.name}
                right={<OutlineChip label={row.status} tone="plan" />}
              />
            ))}
          </WidgetCard>

          <WidgetCard
            title="Certificate Documents"
            footer={
              <div className="flex flex-wrap gap-2">
                <DashboardToolbarButton
                  onClick={() => toastSuccess("Bulk download started")}
                >
                  Bulk Download for Audit
                </DashboardToolbarButton>
                <DashboardToolbarButton onClick={() => setCertOpen(true)}>
                  Add Certificate
                </DashboardToolbarButton>
              </div>
            }
          >
            {widgets.certificates.map((row) => {
              const label = row.verificationLabel || row.verification;
              return (
                <WidgetRow
                  key={row.id}
                  title={row.label}
                  subtitle={row.subtitle}
                  right={
                    <OutlineChip
                      label={label}
                      tone={certChipTone(label)}
                    />
                  }
                />
              );
            })}
          </WidgetCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WidgetCard
            title="Certification Expiry"
            footer={
              <DashboardToolbarButton
                leftIcon={<GlobeIcon />}
                className="w-full justify-center"
                onClick={() => toastSuccess("Showing all expiring certs")}
              >
                View All Expiring
              </DashboardToolbarButton>
            }
          >
            {widgets.expiry.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                subtitleTone={
                  row.action === "RENEW" ||
                  row.subtitle?.toLowerCase().startsWith("expired")
                    ? "danger"
                    : "warn"
                }
                right={
                  <OutlineChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>

          <WidgetCard title="Quizzes">
            {widgets.quizzes.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.title}
                subtitle={row.subtitle}
                right={
                  <OutlineChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>
        </div>
      </div>

      <AssignTrainingModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
      <AssignTrainingModal
        open={bbsOpen}
        onClose={() => setBbsOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        defaultReason="BBS_RETRAIN"
      />
      <CertificateRecordModal
        open={certOpen}
        onClose={() => setCertOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
