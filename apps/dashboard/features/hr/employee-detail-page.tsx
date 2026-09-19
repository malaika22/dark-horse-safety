"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
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

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.25c1.6-3.1 3.9-4.5 6.5-4.5s4.9 1.4 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        "overflow-hidden rounded-xl bg-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
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
  className,
}: {
  label: string;
  value: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly
        className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  className,
}: {
  label: string;
  value: string;
  options: string[];
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          disabled
          className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none disabled:opacity-100"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#959597]">
          <ChevronDownIcon />
        </span>
      </div>
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
        "relative h-6 w-11 rounded-full transition-colors disabled:opacity-100",
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

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase().replaceAll("_", " ");
  const tone =
    s.includes("APPROVED") || s === "SUBMITTED"
      ? "bg-[#203B2C] text-[#ACEBCE]"
      : s.includes("DUE")
        ? "bg-[#C9A227] text-[#111111]"
        : s.includes("CHECKED OUT") || s.includes("PENDING")
          ? "bg-[#352E1B] text-[#CAC897]"
          : s.includes("MISSING") || s.includes("OPEN") || s.includes("REJECT")
            ? "bg-[#3A1515] text-[#FF6B6B]"
            : "bg-[#2A2A2A] text-[#959597]";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone,
      )}
    >
      {s}
    </span>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <p className="py-5 text-center font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
      {label}
    </p>
  );
}

function formatDateLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.toUpperCase();
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatExpiryLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.toUpperCase();
  return d
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}

function relativeWhen(when: string) {
  const raw = when.trim();
  if (/ago|today|yesterday/i.test(raw)) return raw.toUpperCase();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.toUpperCase();
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return "TODAY";
  if (days < 7) return `${days}D AGO`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}W AGO`;
  const months = Math.floor(days / 30);
  return `${Math.max(1, months)}MO AGO`;
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
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const headerMenuRef = React.useRef<HTMLButtonElement>(null);
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
          Edit Employee
        </DashboardToolbarButton>
        <DashboardToolbarButton onClick={printProfile}>
          Print Profile
        </DashboardToolbarButton>
      </div>
    ) : null,
    [detail?.id, employeeId, printProfile, askPrompt],
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
          <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-6" data-print-root>
            {/* Identity header */}
            <div className="flex flex-col gap-3 rounded-xl bg-panel px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
                  <PersonIcon />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:text-[18px]">
                      {d.name}
                    </h1>
                    <DashboardBadge variant={statusBadgeVariant(d.status)} pill>
                      {d.status.replaceAll("_", " ")}
                    </DashboardBadge>
                  </div>
                  <p className="mt-1.5 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                    {[d.roleTitle, d.email, d.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div
                className="flex shrink-0 flex-wrap items-center gap-2"
                data-print-hide
              >
                <div className="relative">
                  <button
                    ref={headerMenuRef}
                    type="button"
                    aria-label="Employee actions"
                    onClick={() => setHeaderMenuOpen((o) => !o)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF]"
                  >
                    <ChevronDownIcon />
                  </button>
                  <DashboardMenuPopover
                    open={headerMenuOpen}
                    onClose={() => setHeaderMenuOpen(false)}
                    anchorRef={headerMenuRef}
                    align="right"
                    className="min-w-[180px]"
                    items={[
                      {
                        id: "edit",
                        label: "Edit Employee",
                        onSelect: () =>
                          router.push(`/hr/employees/${employeeId}/edit`),
                      },
                      {
                        id: "note",
                        label: "Add Note",
                        onSelect: () => {
                          void (async () => {
                            const text = await askPrompt({
                              title: "Add Note",
                              label: "Note",
                              placeholder: "Enter note…",
                              confirmLabel: "Add",
                            });
                            if (text == null || !text.trim()) return;
                            try {
                              const res = await hrApi.addEmployeeNote(
                                employeeId,
                                text.trim(),
                              );
                              setDetail(res.data);
                              toastSuccess("Note added");
                            } catch (err) {
                              toastApiError(err);
                            }
                          })();
                        },
                      },
                      {
                        id: "print",
                        label: "Print Profile",
                        onSelect: () => printProfile(),
                      },
                      {
                        id: "offboard",
                        label: d.offboardingStartedAt
                          ? "Open Offboarding"
                          : "Start Offboarding",
                        onSelect: () => setOffboardOpen(true),
                      },
                    ]}
                  />
                </div>
                <DashboardToolbarButton
                  disabled={!prevId}
                  onClick={() => prevId && router.push(`/hr/employees/${prevId}`)}
                >
                  Previous
                </DashboardToolbarButton>
                <span className="px-1 font-sans text-[10px] uppercase text-[#959597]">
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

            {/* Leave KPIs */}
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

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              {/* Left column */}
              <div className="space-y-4">
                <SectionPanel icon={<LightningIcon />} title="Profile Details">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="First Name" value={dash(d.firstName)} />
                    <Field label="Last Name" value={dash(d.lastName)} />
                    <Field
                      label="Display"
                      value={dash(d.displayName || d.name)}
                    />
                    <Field label="Phone" value={dash(d.phone)} />
                    <Field label="Email" value={dash(d.email)} />
                    <Field label="Home Address" value={dash(d.homeAddress)} />
                  </div>
                </SectionPanel>

                <SectionPanel icon={<LightningIcon />} title="Employment Lifecycle">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SelectField
                      label="Role"
                      value={d.roleTitle || "—"}
                      options={[d.roleTitle || "—"]}
                    />
                    <SelectField
                      label="Supervisor"
                      value={d.supervisor?.name || "—"}
                      options={[d.supervisor?.name || "—"]}
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
                    <SelectField
                      label="Crew"
                      value={d.crew || "—"}
                      options={[d.crew || "—"]}
                      className="sm:col-span-2"
                    />
                    <Field
                      label="Direct Reports"
                      value={String(d.directReportsCount ?? 0)}
                    />
                  </div>
                </SectionPanel>

                <SectionPanel icon={<LightningIcon />} title="Permissions">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#1A1A1A] px-3 py-3">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      Max Clock-In Radius
                    </span>
                    <Toggle checked={Boolean(d.maxClockInRadiusEnabled)} />
                  </div>
                </SectionPanel>

                <SectionPanel icon={<LightningIcon />} title="Metrics">
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
                  meta={`${timeEntries.length} Entries This Cycle`}
                >
                  {timeEntries.length === 0 ? (
                    <EmptyBlock label="No time entries yet." />
                  ) : (
                    <ul className="divide-y divide-[#2A2A2A]">
                      {timeEntries.map((te) => (
                        <li
                          key={te.id}
                          className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                        >
                          <span className="min-w-0 flex-1 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                            {formatDateLabel(te.date)} — {te.client}
                          </span>
                          <span className="shrink-0 font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                            {Number(te.hours).toFixed(1)}H
                          </span>
                          <StatusPill status={te.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Time Off"
                  meta="0 Requests"
                >
                  <EmptyBlock label="No time off requests submitted." />
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Training & Certs"
                  meta={`${trainingCerts.length} Items`}
                >
                  {trainingCerts.length === 0 ? (
                    <EmptyBlock label="No training records yet." />
                  ) : (
                    <ul className="divide-y divide-[#2A2A2A]">
                      {trainingCerts.map((tr) => (
                        <li
                          key={tr.id}
                          className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                        >
                          <span className="min-w-0 flex-1 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                            {tr.name}
                            {tr.expiresAt
                              ? ` · Expires ${formatExpiryLabel(tr.expiresAt)}`
                              : ""}
                          </span>
                          <StatusPill status={tr.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="SSE"
                  meta="0 Observations"
                >
                  <EmptyBlock label="No SSE observations logged." />
                </SectionPanel>

                <SectionPanel
                  icon={<LightningIcon />}
                  title="Equipment"
                  meta={`${equipment.length} Items`}
                >
                  {equipment.length === 0 ? (
                    <EmptyBlock label="No equipment assigned." />
                  ) : (
                    <ul className="divide-y divide-[#2A2A2A]">
                      {equipment.map((eq) => (
                        <li
                          key={eq.id}
                          className="flex flex-wrap items-center gap-2 py-3 first:pt-1 last:pb-1"
                        >
                          <span className="min-w-0 flex-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                            {eq.label}
                            {eq.value ? ` · ${eq.value}` : ""}
                          </span>
                          {eq.action && eq.href ? (
                            <Link
                              href={eq.href}
                              className="inline-flex items-center rounded-full bg-[#2563EB]/20 px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#60A5FA]"
                            >
                              {eq.action} →
                            </Link>
                          ) : null}
                          {eq.badge ? (
                            <StatusPill status={eq.badge} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
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
                    meta="0 Submitted"
                  >
                    <EmptyBlock label="No expenses submitted." />
                  </SectionPanel>
                  <SectionPanel
                    icon={<LightningIcon />}
                    title="Documents"
                    meta="0 Uploaded"
                  >
                    <EmptyBlock label="No documents uploaded." />
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

              {/* Right column */}
              <div className="space-y-4">
                <SectionPanel icon={<LightningIcon />} title="Cycle Totals">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0">
                    {(
                      [
                        ["RT", cycleTotals.rt],
                        ["OT", cycleTotals.ot],
                        ["PTO", cycleTotals.pto],
                        ["Total", cycleTotals.total],
                      ] as const
                    ).map(([label, value], idx) => (
                      <div
                        key={label}
                        className={cn(
                          "min-w-0 py-3",
                          idx < 2 ? "border-b border-[#2A2A2A]" : "",
                        )}
                      >
                        <p className="font-sans text-[10px] uppercase text-[#959597]">
                          {label}
                        </p>
                        <p className="mt-1 font-sans text-[16px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                          {Number(value ?? 0).toFixed(1)}H
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                <SectionPanel icon={<LightningIcon />} title="Training Status">
                  {trainingCerts.length === 0 ? (
                    <EmptyBlock label="No training." />
                  ) : (
                    <ul className="divide-y divide-[#2A2A2A]">
                      {trainingCerts.map((tr) => {
                        const subtitle =
                          tr.subtitle ||
                          (tr.expiresAt
                            ? `Expires ${formatExpiryLabel(tr.expiresAt)}`
                            : "—");
                        return (
                          <li
                            key={tr.id}
                            className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-1"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                                {tr.name}
                              </p>
                              <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                                {subtitle}
                              </p>
                            </div>
                            <StatusPill status={tr.status} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SectionPanel>

                <SectionPanel icon={<LightningIcon />} title="Audit History">
                  {auditHistory.length === 0 ? (
                    <EmptyBlock label="No activity yet." />
                  ) : (
                    <ul className="divide-y divide-[#2A2A2A]">
                      {auditHistory.map((a) => (
                        <li key={a.id} className="py-3 first:pt-1 last:pb-1">
                          <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                            {relativeWhen(a.when)}
                          </p>
                          <p className="mt-1 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {a.label}
                          </p>
                          {a.detail ? (
                            <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6B6B6B]">
                              {a.detail}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
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
