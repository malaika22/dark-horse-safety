"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrEmployeeDetail,
  type HrEmployeeFilterOptions,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
      {children}
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]",
          disabled && "opacity-50",
        )}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value || o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-10 items-center gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
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
        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {checked ? "Enabled" : "Disabled"}
        </span>
      </div>
    </div>
  );
}

function TagMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-2 py-1.5">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2A2A2A] px-2 py-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#FDFDFF]"
          >
            {v}
            <span aria-hidden className="text-[#959597]">
              ×
            </span>
          </button>
        ))}
        <select
          value=""
          onChange={(e) => {
            const next = e.target.value;
            if (!next || values.includes(next)) return;
            onChange([...values, next]);
          }}
          className="h-7 min-w-[120px] flex-1 appearance-none border-0 bg-transparent font-sans text-[11px] uppercase text-[#959597] outline-none"
        >
          <option value="">Add…</option>
          {options
            .filter((o) => !values.includes(o))
            .map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#2D2D30] bg-[#161616] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-[#FDFDFF]">
          <LightningIcon />
        </span>
        <h2 className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

type FormState = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  homeAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dateOfBirth: string;
  jobTitle: string;
  roleTitle: string;
  crew: string;
  supervisorId: string;
  hireDate: string;
  employmentType: string;
  payRate: string;
  payType: string;
  overtimeEligible: boolean;
  adpEmployeeId: string;
  defaultTimeCategory: string;
  status: string;
  statusChangeReason: string;
  statusEffectiveDate: string;
  newSupervisorId: string;
  supervisorEffectiveDate: string;
  newPayRate: string;
  payRateEffectiveDate: string;
  certificationHeld: string;
  certIssueDate: string;
  certExpiryDate: string;
  certIssuingBody: string;
  certReminderLeadDays: string;
  certFileName: string;
  assignedTruck: string;
  assignedEquipment: string[];
  companyCreditCard: boolean;
  cardLast4: string;
  ppeIssued: string[];
  roleTemplate: string;
  moduleOverrides: string;
  mobileAppAccess: boolean;
  sendInvite: boolean;
  sseEnabled: boolean;
  sseMentorId: string;
  ssePeriodDays: string;
  sseEvaluationSchedule: string;
};

function fromDetail(d: HrEmployeeDetail): FormState {
  return {
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    displayName: d.displayName ?? d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    homeAddress: d.homeAddress ?? "",
    emergencyContactName: d.emergencyContactName ?? "",
    emergencyContactPhone: d.emergencyContactPhone ?? "",
    dateOfBirth: d.dateOfBirth ?? "",
    jobTitle: d.jobTitle ?? "",
    roleTitle: d.roleTitle ?? "TECHNICIAN",
    crew: d.crew ?? "",
    supervisorId: d.supervisor?.id ?? "",
    hireDate: d.hireDate ?? "",
    employmentType: d.employmentType ?? "FULL-TIME",
    payRate: d.payRate != null ? String(d.payRate) : "",
    payType: d.payType ?? "HOURLY",
    overtimeEligible: d.overtimeEligible ?? true,
    adpEmployeeId: d.adpEmployeeId ?? "",
    defaultTimeCategory: d.defaultTimeCategory ?? "REGULAR",
    status: d.status ?? "ACTIVE",
    statusChangeReason: "",
    statusEffectiveDate: "",
    newSupervisorId: d.supervisor?.id ?? "",
    supervisorEffectiveDate: "",
    newPayRate: "",
    payRateEffectiveDate: "",
    certificationHeld: d.certificationHeld ?? "H2S AWARENESS",
    certIssueDate: d.certIssueDate ?? "",
    certExpiryDate: d.certExpiryDate ?? "",
    certIssuingBody: d.certIssuingBody ?? "",
    certReminderLeadDays: String(d.certReminderLeadDays ?? 30),
    certFileName: "",
    assignedTruck: d.assignedTruck ?? "",
    assignedEquipment: d.assignedEquipment ?? [],
    companyCreditCard: d.companyCreditCard ?? false,
    cardLast4: d.cardLast4 ?? "",
    ppeIssued: d.ppeIssued ?? [],
    roleTemplate: d.roleTemplate ?? "FIELD TECHNICIAN",
    moduleOverrides: d.moduleOverrides ?? "",
    mobileAppAccess: d.mobileAppAccess ?? true,
    sendInvite: d.sendInvite ?? true,
    sseEnabled: d.sseEnabled ?? false,
    sseMentorId: d.sseMentorId ?? "",
    ssePeriodDays: String(d.ssePeriodDays ?? 90),
    sseEvaluationSchedule: d.sseEvaluationSchedule ?? "WEEKLY",
  };
}

function statusBadgeVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "success" as const;
  if (s === "NEED_REVIEW") return "warning" as const;
  return "offline" as const;
}

export function EditEmployeePage({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<HrEmployeeDetail | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [options, setOptions] =
    React.useState<HrEmployeeFilterOptions | null>(null);
  const [neighborIds, setNeighborIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [one, list, opts] = await Promise.all([
        hrApi.getEmployee(employeeId),
        hrApi.listEmployees({ pageSize: 100, sort: "name", direction: "asc" }),
        hrApi.employeeFilterOptions(),
      ]);
      setDetail(one.data);
      setForm(fromDetail(one.data));
      setNeighborIds(list.data.items.map((i) => i.id));
      setOptions(opts.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setDetail(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useSetHeaderBreadcrumb(
    detail?.name ? `Employees / Edit Profile` : "Employees / Edit Profile",
  );
  useSetHeaderActions(null, []);

  const neighborIndex = neighborIds.indexOf(employeeId);
  const prevId =
    neighborIndex > 0 ? neighborIds[neighborIndex - 1] : null;
  const nextId =
    neighborIndex >= 0 && neighborIndex < neighborIds.length - 1
      ? neighborIds[neighborIndex + 1]
      : null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const payRateToSave = form.newPayRate.trim() || form.payRate;
      const supervisorToSave = form.newSupervisorId || form.supervisorId;
      const statusToSave = form.status;
      const res = await hrApi.updateEmployee(employeeId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        homeAddress: form.homeAddress.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        jobTitle: form.jobTitle.trim() || null,
        roleTitle: form.roleTitle.trim(),
        crew: form.crew || null,
        supervisorId: supervisorToSave || null,
        hireDate: form.hireDate || null,
        employmentType: form.employmentType,
        payType: form.payType,
        payRate: payRateToSave || null,
        payRateEffectiveDate: form.payRateEffectiveDate || undefined,
        overtimeEligible: form.overtimeEligible,
        adpEmployeeId: form.adpEmployeeId.trim() || null,
        defaultTimeCategory: form.defaultTimeCategory,
        status: statusToSave,
        onLeave: statusToSave === "OFFLINE" || form.statusChangeReason === "MEDICAL LEAVE",
        statusChangeReason: form.statusChangeReason || null,
        statusEffectiveDate: form.statusEffectiveDate || null,
        supervisorEffectiveDate: form.supervisorEffectiveDate || null,
        certificationHeld: form.certificationHeld || null,
        certIssueDate: form.certIssueDate || null,
        certExpiryDate: form.certExpiryDate || null,
        certIssuingBody: form.certIssuingBody.trim() || null,
        certReminderLeadDays: Number(form.certReminderLeadDays) || 30,
        assignedTruck: form.assignedTruck || null,
        assignedEquipment: form.assignedEquipment,
        ppeIssued: form.ppeIssued,
        companyCreditCard: form.companyCreditCard,
        cardLast4: form.cardLast4.trim() || null,
        roleTemplate: form.roleTemplate || null,
        moduleOverrides: form.moduleOverrides.trim() || null,
        mobileAppAccess: form.mobileAppAccess,
        sendInvite: form.sendInvite,
        sseEnabled: form.sseEnabled,
        sseMentorId: form.sseMentorId || null,
        ssePeriodDays: Number(form.ssePeriodDays) || 90,
        sseEvaluationSchedule: form.sseEvaluationSchedule || null,
      });
      setDetail(res.data);
      setForm(fromDetail(res.data));
      toastSuccess("Profile saved");
      router.push(`/hr/employees/${employeeId}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const wizard = options?.wizard;
  const supervisors = options?.supervisors.filter((s) => s.value) ?? [];

  return (
    <>
      <CrmDetailStateGate
        loading={loading}
        error={error}
        missing={!loading && !detail}
        missingTitle="Employee Not Found"
        onRetry={() => void load()}
      >
        {detail && form ? (
          <div className="space-y-4 bg-shell p-3 pb-24 sm:p-5">
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {detail.name}
                  </h1>
                  <DashboardBadge variant={statusBadgeVariant(detail.status)}>
                    {detail.status.replace("_", " ")}
                  </DashboardBadge>
                </div>
                <p className="mt-1 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {[detail.roleTitle, detail.email, detail.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DashboardToolbarButton
                  disabled={!prevId}
                  onClick={() =>
                    prevId && router.push(`/hr/employees/${prevId}/edit`)
                  }
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
                  onClick={() =>
                    nextId && router.push(`/hr/employees/${nextId}/edit`)
                  }
                >
                  Next
                </DashboardToolbarButton>
              </div>
            </div>

            <Section title="Personal">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="First Name"
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                />
                <TextInput
                  label="Last Name"
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                />
                <TextInput
                  label="Preferred Name"
                  value={form.displayName}
                  onChange={(v) => set("displayName", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                />
                <TextInput
                  label="Mobile"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                />
              </div>
              <div className="mt-4">
                <TextInput
                  label="Home Address"
                  value={form.homeAddress}
                  onChange={(v) => set("homeAddress", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Emergency Contact Name"
                  value={form.emergencyContactName}
                  onChange={(v) => set("emergencyContactName", v)}
                  placeholder="Full name"
                />
                <TextInput
                  label="Emergency Contact Phone"
                  value={form.emergencyContactPhone}
                  onChange={(v) => set("emergencyContactPhone", v)}
                  placeholder="(000) 000-0000"
                />
                <TextInput
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(v) => set("dateOfBirth", v)}
                />
              </div>
            </Section>

            <Section title="Role & Pay">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Employee ID"
                  value={detail.code}
                  onChange={() => undefined}
                  disabled
                />
                <TextInput
                  label="Job Title"
                  value={form.jobTitle}
                  onChange={(v) => set("jobTitle", v)}
                />
                <SelectInput
                  label="Role"
                  value={form.roleTitle}
                  onChange={(v) => set("roleTitle", v)}
                  options={(wizard?.roles ?? [form.roleTitle]).map((r) => ({
                    value: r,
                    label: r,
                  }))}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <SelectInput
                  label="Crew"
                  value={form.crew}
                  onChange={(v) => set("crew", v)}
                  placeholder="Select crew"
                  options={(wizard?.crews ?? []).map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
                <SelectInput
                  label="Supervisor"
                  value={form.supervisorId}
                  onChange={(v) => set("supervisorId", v)}
                  placeholder="Select supervisor"
                  options={supervisors}
                />
                <TextInput
                  label="Hire Date"
                  type="date"
                  value={form.hireDate}
                  onChange={(v) => set("hireDate", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <SelectInput
                  label="Employment Type"
                  value={form.employmentType}
                  onChange={(v) => set("employmentType", v)}
                  options={(wizard?.employmentTypes ?? ["FULL-TIME"]).map(
                    (t) => ({ value: t, label: t }),
                  )}
                />
                <TextInput
                  label="Pay Rate"
                  value={form.payRate}
                  onChange={(v) => set("payRate", v)}
                  placeholder="$00.00 / HR"
                />
                <SelectInput
                  label="Pay Type"
                  value={form.payType}
                  onChange={(v) => set("payType", v)}
                  options={(wizard?.payTypes ?? ["HOURLY"]).map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <ToggleRow
                  label="Overtime Eligible"
                  checked={form.overtimeEligible}
                  onChange={(v) => set("overtimeEligible", v)}
                />
                <TextInput
                  label="ADP Employee ID"
                  value={form.adpEmployeeId}
                  onChange={(v) => set("adpEmployeeId", v)}
                />
                <SelectInput
                  label="Default Time Category"
                  value={form.defaultTimeCategory}
                  onChange={(v) => set("defaultTimeCategory", v)}
                  options={(wizard?.timeCategories ?? ["REGULAR"]).map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              </div>
            </Section>

            <Section title="Employment Changes">
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectInput
                  label="New Status"
                  value={form.status}
                  onChange={(v) => set("status", v)}
                  options={[
                    { value: "ACTIVE", label: "ACTIVE" },
                    { value: "NEED_REVIEW", label: "NEED REVIEW" },
                    { value: "OFFLINE", label: "ON LEAVE / OFFLINE" },
                  ]}
                />
                <SelectInput
                  label="Reason"
                  value={form.statusChangeReason}
                  onChange={(v) => set("statusChangeReason", v)}
                  placeholder="Select reason"
                  options={[
                    { value: "MEDICAL LEAVE", label: "MEDICAL LEAVE" },
                    { value: "PERSONAL LEAVE", label: "PERSONAL LEAVE" },
                    { value: "ROLE CHANGE", label: "ROLE CHANGE" },
                    { value: "OTHER", label: "OTHER" },
                  ]}
                />
                <TextInput
                  label="Effective Date"
                  type="date"
                  value={form.statusEffectiveDate}
                  onChange={(v) => set("statusEffectiveDate", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectInput
                  label="New Supervisor"
                  value={form.newSupervisorId}
                  onChange={(v) => set("newSupervisorId", v)}
                  placeholder="Select supervisor"
                  options={supervisors}
                />
                <TextInput
                  label="Effective Date"
                  type="date"
                  value={form.supervisorEffectiveDate}
                  onChange={(v) => set("supervisorEffectiveDate", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="New Rate"
                  value={form.newPayRate}
                  onChange={(v) => set("newPayRate", v)}
                  placeholder="$00.00 / HR"
                />
                <TextInput
                  label="Effective Date"
                  type="date"
                  value={form.payRateEffectiveDate}
                  onChange={(v) => set("payRateEffectiveDate", v)}
                />
              </div>
              <div className="mt-5">
                <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  Pay Rate Change History
                </p>
                <div className="space-y-2">
                  {(detail.payHistory ?? []).length === 0 ? (
                    <p className="font-sans text-[11px] uppercase text-[#959597]">
                      No pay history yet.
                    </p>
                  ) : (
                    (detail.payHistory ?? []).map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2"
                      >
                        <span className="font-sans text-[11px] uppercase text-[#959597]">
                          {row.date}
                        </span>
                        <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                          {row.label}
                        </span>
                        <span className="font-sans text-[10px] uppercase text-[#959597]">
                          By {row.by ?? "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Section>

            <Section title="Certifications">
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectInput
                  label="Certification"
                  value={form.certificationHeld}
                  onChange={(v) => set("certificationHeld", v)}
                  options={(
                    wizard?.certificationTypes ?? ["H2S AWARENESS"]
                  ).map((c) => ({ value: c, label: c }))}
                />
                <TextInput
                  label="Issue Date"
                  type="date"
                  value={form.certIssueDate}
                  onChange={(v) => set("certIssueDate", v)}
                />
                <TextInput
                  label="Expiry Date"
                  type="date"
                  value={form.certExpiryDate}
                  onChange={(v) => set("certExpiryDate", v)}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Issuing Body"
                  value={form.certIssuingBody}
                  onChange={(v) => set("certIssuingBody", v)}
                />
                <div>
                  <FieldLabel>Certificate Upload</FieldLabel>
                  <div className="flex h-10 items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3">
                    <span className="truncate font-sans text-[11px] uppercase text-[#959597]">
                      {form.certFileName || "No file selected"}
                    </span>
                    <label className="cursor-pointer font-sans text-[11px] font-[510] uppercase text-[#60A5FA] hover:underline">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          set("certFileName", e.target.files?.[0]?.name ?? "")
                        }
                      />
                    </label>
                  </div>
                </div>
                <SelectInput
                  label="Reminder Lead Time"
                  value={form.certReminderLeadDays}
                  onChange={(v) => set("certReminderLeadDays", v)}
                  options={
                    wizard?.reminderLeadDays ?? [
                      { value: "30", label: "30 DAYS BEFORE EXPIRY" },
                    ]
                  }
                />
              </div>
            </Section>

            <Section title="Equipment">
              <div className="space-y-4">
                <SelectInput
                  label="Assign Truck"
                  value={form.assignedTruck}
                  onChange={(v) => set("assignedTruck", v)}
                  placeholder="Select truck"
                  options={(wizard?.trucks ?? []).map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
                <TagMultiSelect
                  label="Assign Equipment"
                  values={form.assignedEquipment}
                  options={wizard?.equipmentOptions ?? []}
                  onChange={(v) => set("assignedEquipment", v)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ToggleRow
                    label="Company Credit Card"
                    checked={form.companyCreditCard}
                    onChange={(v) => set("companyCreditCard", v)}
                  />
                  <TextInput
                    label="Card Last 4"
                    value={form.cardLast4}
                    onChange={(v) => set("cardLast4", v)}
                    placeholder="XXXX"
                    disabled={!form.companyCreditCard}
                  />
                </div>
                <TagMultiSelect
                  label="PPE Issued"
                  values={form.ppeIssued}
                  options={wizard?.ppeOptions ?? []}
                  onChange={(v) => set("ppeIssued", v)}
                />
              </div>
            </Section>

            <Section title="System Access">
              <div className="space-y-4">
                <SelectInput
                  label="Role Template"
                  value={form.roleTemplate}
                  onChange={(v) => set("roleTemplate", v)}
                  options={(
                    wizard?.roleTemplates ?? ["FIELD TECHNICIAN"]
                  ).map((t) => ({ value: t, label: t }))}
                />
                <TextInput
                  label="Per-Module Overrides"
                  value={form.moduleOverrides}
                  onChange={(v) => set("moduleOverrides", v)}
                  placeholder="None configured"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ToggleRow
                    label="Mobile App Access"
                    checked={form.mobileAppAccess}
                    onChange={(v) => set("mobileAppAccess", v)}
                  />
                  <ToggleRow
                    label="Send Invite"
                    checked={form.sendInvite}
                    onChange={(v) => set("sendInvite", v)}
                  />
                </div>
              </div>
            </Section>

            <Section title="SSE">
              <div className="grid gap-4 sm:grid-cols-2">
                <ToggleRow
                  label="Short-Service Employee"
                  checked={form.sseEnabled}
                  onChange={(v) => set("sseEnabled", v)}
                />
                <SelectInput
                  label="Assign Mentor"
                  value={form.sseMentorId}
                  onChange={(v) => set("sseMentorId", v)}
                  placeholder="Select mentor"
                  options={supervisors}
                />
                <SelectInput
                  label="SSE Period Length"
                  value={form.ssePeriodDays}
                  onChange={(v) => set("ssePeriodDays", v)}
                  options={
                    wizard?.ssePeriods ?? [
                      { value: "90", label: "90 DAYS" },
                    ]
                  }
                />
                <SelectInput
                  label="Evaluation Schedule"
                  value={form.sseEvaluationSchedule}
                  onChange={(v) => set("sseEvaluationSchedule", v)}
                  options={(wizard?.sseSchedules ?? ["WEEKLY"]).map((s) => ({
                    value: s,
                    label: s,
                  }))}
                />
              </div>
            </Section>

            <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#2D2D30] bg-shell/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOffboardOpen(true)}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[11px] font-[590] uppercase tracking-[-0.02em] text-white disabled:opacity-50"
              >
                Terminate Employee
              </button>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => router.push(`/hr/employees/${employeeId}`)}
              >
                Cancel
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                disabled={busy}
                onClick={() => void save()}
              >
                Save
              </DashboardToolbarButton>
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
        onSaved={() => void load()}
      />
      <TerminationConfirmModal
        open={terminateOpen}
        employeeId={employeeId}
        onClose={() => setTerminateOpen(false)}
        onBackToChecklist={() => {
          setTerminateOpen(false);
          setOffboardOpen(true);
        }}
        onTerminated={() => {
          void load();
          router.push("/hr/employees");
        }}
      />
    </>
  );
}
