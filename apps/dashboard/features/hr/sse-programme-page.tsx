"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi, type HrEmployee, type HrSseDashboard } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";
import { AssignTrainingModal } from "@/features/hr/training-modals";

const EMPTY: HrSseDashboard = {
  kpis: {
    activePairings: 0,
    pairingsLabel: "Mentor-mentee",
    evaluationsThisWeek: "0/0",
    missingLabel: "0 missing",
    sseEvaluations: 0,
    cycleLabel: "Cycle —",
  },
  widgets: {
    pairings: [],
    evaluationsDue: {
      completed: 0,
      total: 0,
      summaryLabel: "Evaluations completed this cycle",
      pendingLabel: "Pending this cycle",
      rows: [],
    },
    mentorScorecard: [],
    graduation: [],
    decisions: [],
    feedback: [],
  },
};

function DocCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7l4 4V20.5H7V3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 13.5l1.5 1.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

/** PLAN / RENEW — filled chips matching Figma gold / red. */
function ActionChip({
  label,
  tone = "plan",
}: {
  label: string;
  tone?: "plan" | "renew";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone === "renew"
          ? "bg-[#3B2020] text-[#E8A0A0]"
          : "bg-[#2A2618] text-[#C4A35A]",
      )}
    >
      {label}
    </span>
  );
}

/** DUE / SUBMITTED badges on Evaluations Due. */
function EvalBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const submitted = s === "SUBMITTED";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        submitted
          ? "bg-[#203B2C] text-[#ACEBCE]"
          : "bg-[#2A2618] text-[#C4A35A]",
      )}
    >
      {s}
    </span>
  );
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
        <DashboardPanelTitle
          icon="lightning"
          title={title}
          titleClassName="text-[12px] md:text-[13px]"
        />
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
  right,
}: {
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#222] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function SseProgrammePage() {
  const [dash, setDash] = React.useState<HrSseDashboard>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [bbsOpen, setBbsOpen] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [mentorId, setMentorId] = React.useState("");
  const [menteeId, setMenteeId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  useSetHeaderBreadcrumb("Employees & HR / SSE Programme");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await hrApi.sseDashboard();
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
    setMentorId("");
    setMenteeId("");
    setNewOpen(true);
    void (async () => {
      try {
        const e = await hrApi.listEmployees({ pageSize: 100 });
        setEmployees(e.data.items);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, []);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      <DashboardToolbarButton
        leftIcon={<DocCheckIcon />}
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

  async function savePairing() {
    if (!mentorId || !menteeId) {
      toastApiError(new Error("Select mentor and mentee"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.createSsePairing({ mentorId, menteeId });
      toastSuccess("SSE pairing created");
      setNewOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && dash.widgets.pairings.length === 0) {
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
            title="Active Pairings"
            value={String(kpis.activePairings)}
            meta={kpis.pairingsLabel}
            icon="document"
          />
          <DashboardStatCell
            title="Evaluations This Week"
            value={kpis.evaluationsThisWeek}
            meta={kpis.missingLabel}
            icon="time"
          />
          <DashboardStatCell
            title="SSE Evaluations"
            value={String(kpis.sseEvaluations)}
            meta={kpis.cycleLabel}
            icon="document"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Left column — matches Figma order */}
        <div className="flex min-w-0 flex-col gap-4">
          <WidgetCard title="SSE / Mentor Pairings">
            {widgets.pairings.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.label}
                subtitle={row.status}
                right={
                  <ActionChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>

          <WidgetCard title="Mentor Scorecard">
            {widgets.mentorScorecard.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.label}
                subtitle={row.status}
                right={
                  <ActionChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>

          <WidgetCard title="Supervisor Graduation Decision">
            {widgets.decisions.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.label}
                subtitle={row.detail}
                right={
                  <ActionChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-col gap-4">
          <WidgetCard
            title="Evaluations Due"
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
              <p className="font-sans text-[22px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[24px]">
                {widgets.evaluationsDue.completed} /{" "}
                {widgets.evaluationsDue.total}
              </p>
              <p className="mt-1.5 font-sans text-[10px] uppercase text-[#959597]">
                {widgets.evaluationsDue.summaryLabel}
              </p>
            </div>
            <p className="pt-3 pb-1 font-sans text-[10px] uppercase text-[#959597]">
              {widgets.evaluationsDue.pendingLabel}
            </p>
            {widgets.evaluationsDue.rows.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.label}
                right={<EvalBadge status={row.status} />}
              />
            ))}
          </WidgetCard>

          <WidgetCard title="Graduation Status">
            {widgets.graduation.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.name}
                subtitle={row.label}
                right={
                  <ActionChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>

          <WidgetCard title="SSE Feedback About Mentor">
            {widgets.feedback.map((row) => (
              <WidgetRow
                key={row.id}
                title={row.label}
                subtitle={row.status}
                right={
                  <ActionChip
                    label={row.action}
                    tone={row.action === "RENEW" ? "renew" : "plan"}
                  />
                }
              />
            ))}
          </WidgetCard>
        </div>
      </div>

      <DashboardModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New SSE Pairing"
        widthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setNewOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => void savePairing()}
            >
              Add Record
            </PayrollPrimaryButton>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Mentor
            </span>
            <select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              <option value="">Select mentor</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Mentee
            </span>
            <select
              value={menteeId}
              onChange={(e) => setMenteeId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              <option value="">Select mentee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DashboardModal>

      <AssignTrainingModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSaved={() => {
          setAssignOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
      <AssignTrainingModal
        open={bbsOpen}
        onClose={() => setBbsOpen(false)}
        onSaved={() => {
          setBbsOpen(false);
          setReloadKey((k) => k + 1);
        }}
        defaultReason="BBS_RETRAIN"
      />
    </div>
  );
}
