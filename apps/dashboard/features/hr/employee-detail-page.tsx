"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrEmployeeDetail,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import {
  OffboardingChecklistModal,
  TerminationConfirmModal,
} from "@/features/hr/employee-offboarding-modals";

function LightningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2L4 14h7l-1 8 10-14h-7l1-6z" fill="currentColor" />
    </svg>
  );
}

function SectionPanel({
  icon,
  title,
  meta,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
              {icon}
            </span>
          ) : null}
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </span>
        </div>
        {meta ? (
          <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="px-4 pb-4 pt-2 sm:px-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly
        className="h-9 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none opacity-90"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <select
        value={value}
        disabled
        className="h-9 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none disabled:opacity-90"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function statusBadgeVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "success" as const;
  if (s === "NEED_REVIEW") return "warning" as const;
  return "offline" as const;
}

function entryTone(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "border-[#22C55E]/50 text-[#22C55E]";
  if (s === "DUE" || s === "PENDING") return "border-[#E8C47C]/50 text-[#E8C47C]";
  return "border-[#FF6B6B]/50 text-[#FF6B6B]";
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <p className="py-3 text-center font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
      {label}
    </p>
  );
}

function formatDateLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

const EMPTY_LEAVE = {
  pto: { balance: 0, annual: 0, used: 0, scheduled: 0 },
  sick: { balance: 0, annual: 0, used: 0 },
  holiday: { balance: 0, observed: 0, taken: 0 },
};

const EMPTY_CYCLE = { rt: 0, ot: 0, pto: 0, total: 0 };

export function EmployeeDetailPage({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<HrEmployeeDetail | null>(null);
  const [neighborIds, setNeighborIds] = React.useState<string[]>([]);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const printTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    printTriggeredRef.current = false;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [one, list] = await Promise.all([
          hrApi.getEmployee(employeeId),
          hrApi.listEmployees({ pageSize: 100, sort: "name", direction: "asc" }),
        ]);
        if (cancelled) return;
        setDetail(one.data);
        setNeighborIds(list.data.items.map((i) => i.id));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, reloadKey]);

  const printProfile = React.useCallback(() => {
    window.print();
  }, []);

  React.useEffect(() => {
    const onAfterPrint = () => {
      if (searchParams.get("print") === "1") {
        router.replace(`/hr/employees/${employeeId}`);
      }
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [employeeId, router, searchParams]);

  React.useEffect(() => {
    if (!detail || loading || searchParams.get("print") !== "1") return;
    if (printTriggeredRef.current) return;
    printTriggeredRef.current = true;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [detail, loading, searchParams]);

  const neighborIndex = neighborIds.indexOf(employeeId);
  const prevId =
    neighborIndex > 0 ? neighborIds[neighborIndex - 1] : null;
  const nextId =
    neighborIndex >= 0 && neighborIndex < neighborIds.length - 1
      ? neighborIds[neighborIndex + 1]
      : null;

  useSetHeaderBreadcrumb(
    detail?.name
      ? `Employees / ${detail.name}`
      : "Employees / Detail",
  );

  useSetHeaderActions(
    detail ? (
      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-print-hide
      >
        <DashboardToolbarButton
          onClick={() => {
            void (async () => {
              const text = await askPrompt({
                title: "Add Note",
                label: "Note",
                placeholder: "Enter note…",
                confirmLabel: "Add",
              });
              if (text == null || !text.trim()) return;
              try {
                const res = await hrApi.addEmployeeNote(employeeId, text.trim());
                setDetail(res.data);
                toastSuccess("Note added");
              } catch (err) {
                toastApiError(err);
              }
            })();
          }}
        >
          Add Note
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          onClick={() => router.push(`/hr/employees/${employeeId}/edit`)}
        >
          Edit Profile
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={printProfile}>
          Print Profile
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail?.id, employeeId, printProfile],
  );

  const d = detail;
  const leave = d?.leave ?? EMPTY_LEAVE;
  const cycleTotals = d?.cycleTotals ?? EMPTY_CYCLE;
  const timeEntries = d?.timeEntries ?? [];
  const trainingCerts = d?.trainingCerts ?? [];
  const equipment = d?.equipment ?? [];
  const auditHistory = d?.auditHistory ?? [];
  const dash = (v: string | null | undefined) =>
    v && String(v).trim() ? v : "—";

  return (
    <>
      <CrmDetailStateGate
        loading={loading}
        error={error}
        missing={!loading && !detail}
        missingTitle="Employee Not Found"
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {d ? (
          <div className="space-y-4 bg-shell p-3 sm:p-5" data-print-root>
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {d.name}
                  </h1>
                  <DashboardBadge variant={statusBadgeVariant(d.status)}>
                    {d.status.replace("_", " ")}
                  </DashboardBadge>
                </div>
                <p className="mt-1 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {[d.roleTitle, d.email, d.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-2"
                data-print-hide
              >
                <DashboardToolbarButton
                  disabled={!prevId}
                  onClick={() => prevId && router.push(`/hr/employees/${prevId}`)}
                >
                  Previous
                </DashboardToolbarButton>
                <span className="font-sans text-[10px] uppercase text-[#959597]">
                  {neighborIndex >= 0
                    ? `${neighborIndex + 1} of ${neighborIds.length}`
                    : "—"}
                </span>
                <DashboardToolbarButton
                  disabled={!nextId}
                  onClick={() => nextId && router.push(`/hr/employees/${nextId}`)}
                >
                  Next
                </DashboardToolbarButton>
              </div>
            </div>

            <DashboardStatGrid>
              <DashboardStatRow>
                <DashboardStatCell
                  title="PTO Balance"
                  value={`${leave.pto.balance.toFixed(1)} H`}
                  meta={`${leave.pto.annual}H Annual · ${leave.pto.used}H Used · ${leave.pto.scheduled}H Scheduled`}
                  icon="document"
                />
                <DashboardStatCell
                  title="Sick Balance"
                  value={`${leave.sick.balance.toFixed(1)} H`}
                  meta={`${leave.sick.annual}H Annual · ${leave.sick.used}H Used`}
                  icon="time"
                />
                <DashboardStatCell
                  title="Holiday"
                  value={`${leave.holiday.balance.toFixed(1)} H`}
                  meta={`${leave.holiday.observed}H Observed · ${leave.holiday.taken}H Taken`}
                  icon="lightning"
                />
              </DashboardStatRow>
            </DashboardStatGrid>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <SectionPanel icon={<LightningIcon />} title="Profile Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="First Name" value={dash(d.firstName)} />
                    <Field label="Last Name" value={dash(d.lastName)} />
                    <Field
                      label="Display Name"
                      value={dash(d.displayName || d.name)}
                    />
                    <Field label="Phone" value={dash(d.phone)} />
                    <Field label="Email" value={dash(d.email)} />
                    <Field label="Home Address" value={dash(d.homeAddress)} />
                  </div>

                  <p className="mb-2 mt-5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    Employment Lifecycle
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role" value={dash(d.roleTitle)} />
                    <Field
                      label="Supervisor"
                      value={dash(d.supervisor?.name)}
                    />
                    <Field
                      label="Hire Date"
                      type="date"
                      value={d.hireDate ?? ""}
                    />
                    <SelectField
                      label="Employment Status"
                      value={d.status ?? "ACTIVE"}
                      options={["ACTIVE", "NEED_REVIEW", "OFFLINE"]}
                    />
                    <SelectField
                      label="Employment Type"
                      value={d.employmentType ?? "FULL-TIME"}
                      options={["FULL-TIME", "PART-TIME", "CONTRACT"]}
                    />
                    <SelectField
                      label="Pay Type"
                      value={d.payType ?? "HOURLY"}
                      options={["HOURLY", "SALARY"]}
                    />
                  </div>

                  <p className="mb-2 mt-5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    Organizational Info
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Crew" value={dash(d.crew)} />
                    <Field
                      label="Direct Reports"
                      value={String(d.directReportsCount ?? 0)}
                    />
                  </div>

                  <p className="mb-2 mt-5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    Permissions & Metrics
                  </p>
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-[#1A1A1A] px-3 py-2.5">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      Max Clock-In Radius
                    </span>
                    <Toggle checked={Boolean(d.maxClockInRadiusEnabled)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Max Clock-in Radius"
                      value={dash(d.maxClockInRadius)}
                    />
                    <Field
                      label="Min Billable Block"
                      value={dash(d.minBillableBlock)}
                    />
                    <Field
                      label="Auto-Flag No-Show"
                      value={dash(d.autoFlagNoShow)}
                    />
                  </div>
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Time"
                  meta={`${timeEntries.length} Entries`}
                >
                  {timeEntries.length === 0 ? (
                    <EmptyBlock label="No time entries yet." />
                  ) : (
                    <div className="space-y-1">
                      {timeEntries.map((te) => (
                        <div
                          key={te.id}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                            {formatDateLabel(te.date)} — {te.client} — {te.hours}H
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 font-sans text-[10px] uppercase",
                              entryTone(te.status),
                            )}
                          >
                            {te.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Time Off"
                  meta="0 Requests"
                >
                  <EmptyBlock label="No time off requests yet." />
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Training & Certs"
                  meta={`${trainingCerts.length} Items`}
                >
                  {trainingCerts.length === 0 ? (
                    <EmptyBlock label="No training records yet." />
                  ) : (
                    <div className="space-y-1">
                      {trainingCerts.map((tr) => (
                        <div
                          key={tr.id}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                            {tr.name}
                            {tr.expiresAt
                              ? ` — Exp ${formatDateLabel(tr.expiresAt)}`
                              : ""}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 font-sans text-[10px] uppercase",
                              entryTone(tr.status),
                            )}
                          >
                            {tr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="SSE"
                  meta="0 Observations"
                >
                  <EmptyBlock label="No SSE observations yet." />
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Equipment"
                  meta={`${equipment.length} Items`}
                >
                  {equipment.length === 0 ? (
                    <EmptyBlock label="No equipment assigned." />
                  ) : (
                    <div className="space-y-1">
                      {equipment.map((eq) => (
                        <div
                          key={eq.id}
                          className="flex flex-wrap items-center gap-2 py-1.5"
                        >
                          <span className="min-w-0 flex-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                            {eq.label}
                            {eq.value ? ` — ${eq.value}` : ""}
                          </span>
                          {eq.badge ? (
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 font-sans text-[10px] uppercase",
                                eq.badgeTone === "error"
                                  ? "border-[#FF6B6B]/50 text-[#FF6B6B]"
                                  : eq.badgeTone === "warning"
                                    ? "border-[#E8C47C]/50 text-[#E8C47C]"
                                    : "border-[#5A5A5A] text-[#959597]",
                              )}
                            >
                              {eq.badge}
                            </span>
                          ) : null}
                          {eq.action && eq.href ? (
                            <Link
                              href={eq.href}
                              className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#60A5FA] hover:underline"
                            >
                              {eq.action}
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Performance"
                  meta="0 Reviews"
                >
                  <EmptyBlock label="No performance reviews yet." />
                </SectionPanel>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionPanel
                    icon={<LightningIcon />}
                    title="Expenses"
                    meta="0 Items"
                  >
                    <EmptyBlock label="No expenses yet." />
                  </SectionPanel>
                  <SectionPanel
                    icon={<LightningIcon />}
                    title="Documents"
                    meta="0 Files"
                  >
                    <EmptyBlock label="No documents yet." />
                  </SectionPanel>
                </div>

                <div className="flex flex-wrap gap-2" data-print-hide>
                  <DashboardToolbarButton
                    onClick={() => setOffboardOpen(true)}
                  >
                    {d.offboardingStartedAt
                      ? "Open Offboarding"
                      : "Start Offboarding"}
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    onClick={() => {
                      void (async () => {
                        try {
                          const res = await hrApi.resetEmployeePassword(
                            employeeId,
                          );
                          toastSuccess(res.data.message);
                        } catch (err) {
                          toastApiError(err);
                        }
                      })();
                    }}
                  >
                    Reset Password
                  </DashboardToolbarButton>
                  <DashboardToolbarButton onClick={printProfile}>
                    Print Profile
                  </DashboardToolbarButton>
                </div>
              </div>

              <div className="space-y-4">
                <SectionPanel title="Cycle Totals">
                  <div className="space-y-2">
                    {(
                      [
                        ["RT", cycleTotals.rt],
                        ["OT", cycleTotals.ot],
                        ["PTO", cycleTotals.pto],
                        ["Total", cycleTotals.total],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="font-sans text-[11px] uppercase text-[#959597]">
                          {label}
                        </span>
                        <span className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                          {Number(value ?? 0).toFixed(1)}H
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                <SectionPanel title="Training Status">
                  {trainingCerts.length === 0 ? (
                    <EmptyBlock label="No training." />
                  ) : (
                    <div className="space-y-2">
                      {trainingCerts.map((tr) => (
                        <div
                          key={tr.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="min-w-0 truncate font-sans text-[11px] uppercase text-[#959597]">
                            {tr.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase",
                              entryTone(tr.status),
                            )}
                          >
                            {tr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>

                <SectionPanel title="Audit History">
                  {auditHistory.length === 0 ? (
                    <EmptyBlock label="No history yet." />
                  ) : (
                    <div className="space-y-3">
                      {auditHistory.map((a) => (
                        <div key={a.id}>
                          <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                            {a.when}
                          </p>
                          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {a.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>
              </div>
            </div>
          </div>
        ) : null}
      </CrmDetailStateGate>

      <OffboardingChecklistModal
        open={offboardOpen}
        employeeId={employeeId}
        onClose={() => setOffboardOpen(false)}
        onProceed={() => {
          setOffboardOpen(false);
          setTerminateOpen(true);
        }}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
      <TerminationConfirmModal
        open={terminateOpen}
        employeeId={employeeId}
        onClose={() => setTerminateOpen(false)}
        onBackToChecklist={() => {
          setTerminateOpen(false);
          setOffboardOpen(true);
        }}
        onTerminated={() => setReloadKey((k) => k + 1)}
      />
      {dialogs}
    </>
  );
}
