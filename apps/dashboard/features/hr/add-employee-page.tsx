"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type CreateEmployeeBody,
  type HrEmployeeFilterOptions,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

const STEPS = [
  "Personal",
  "Role & Pay",
  "Certifications",
  "Equipment",
  "System Access",
  "SSE",
  "Review",
] as const;

type StepId = (typeof STEPS)[number];

type WizardState = {
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

const INITIAL: WizardState = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  phone: "",
  homeAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  dateOfBirth: "",
  jobTitle: "",
  roleTitle: "",
  crew: "",
  supervisorId: "",
  hireDate: "",
  employmentType: "",
  payRate: "",
  payType: "",
  overtimeEligible: false,
  adpEmployeeId: "",
  defaultTimeCategory: "",
  certificationHeld: "",
  certIssueDate: "",
  certExpiryDate: "",
  certIssuingBody: "",
  certReminderLeadDays: "",
  certFileName: "",
  assignedTruck: "",
  assignedEquipment: [],
  companyCreditCard: false,
  cardLast4: "",
  ppeIssued: [],
  roleTemplate: "",
  moduleOverrides: "",
  mobileAppAccess: false,
  sendInvite: false,
  sseEnabled: false,
  sseMentorId: "",
  ssePeriodDays: "",
  sseEvaluationSchedule: "",
};

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
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
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
  enabledLabel = "Enabled",
  disabledLabel = "Disabled",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
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
          {checked ? enabledLabel : disabledLabel}
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

function Stepper({
  step,
  maxReached,
  onJump,
}: {
  step: number;
  maxReached: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="mb-8 grid w-full grid-cols-7 gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        const clickable = i <= maxReached;
        return (
          <li key={label} className="flex min-w-0 justify-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(i)}
              className={cn(
                "flex w-full max-w-[120px] flex-col items-center gap-2.5 disabled:cursor-default",
                !clickable && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-[12px] font-[590] leading-none",
                  done && "bg-[#1B3D2F] text-[#FDFDFF]",
                  active && "bg-[#FDFDFF] text-[#121212]",
                  !done &&
                    !active &&
                    "border border-[#3E3E3E] bg-transparent text-[#666666]",
                )}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12.5 9.5 17 19 7.5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "w-full text-center font-sans text-[10px] font-[510] uppercase leading-tight tracking-[-0.02em]",
                  active ? "text-[#FDFDFF]" : "text-[#666666]",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SectionCard({
  title,
  children,
  editAction,
  review,
}: {
  title: string;
  children: React.ReactNode;
  editAction?: () => void;
  review?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 sm:p-5",
        review
          ? "bg-[#141414]"
          : "border border-[#2D2D30] bg-[#161616]",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
        {editAction ? (
          <button
            type="button"
            onClick={editAction}
            className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#60A5FA] hover:underline"
          >
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </p>
      <p className="mt-1 font-sans text-[13px] font-[510] uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF]">
        {value || "—"}
      </p>
    </div>
  );
}

function formatPayRate(rate: string) {
  const raw = rate.trim();
  if (!raw) return "$00.00 / HR";
  if (raw.includes("$") || /hr/i.test(raw)) return raw.toUpperCase();
  const n = Number(raw);
  if (Number.isFinite(n)) return `$${n.toFixed(2)} / HR`;
  return raw;
}

function displayOrDash(v: string) {
  return v.trim() ? v : "—";
}

export function AddEmployeePage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [maxReached, setMaxReached] = React.useState(0);
  const [form, setForm] = React.useState<WizardState>(INITIAL);
  const [options, setOptions] =
    React.useState<HrEmployeeFilterOptions | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void hrApi
      .employeeFilterOptions()
      .then((res) => setOptions(res.data))
      .catch(() => undefined);
  }, []);

  useSetHeaderBreadcrumb("Employees / Add Employee");
  useSetHeaderActions(null, []);

  const wizard = options?.wizard;
  const supervisors =
    options?.supervisors.filter((s) => s.value) ?? [];

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (
        (key === "firstName" || key === "lastName") &&
        !prev.displayName.trim()
      ) {
        const f = key === "firstName" ? String(value) : prev.firstName;
        const l = key === "lastName" ? String(value) : prev.lastName;
        if (f && l) next.displayName = `${f.charAt(0)}. ${l}`.toUpperCase();
      }
      return next;
    });
  }

  function goNext() {
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toastApiError(new Error("First name and last name are required"));
        return;
      }
    }
    if (step === 1) {
      if (!form.roleTitle.trim() && !form.jobTitle.trim()) {
        toastApiError(new Error("Job title or role is required"));
        return;
      }
    }
    if (step >= STEPS.length - 1) return;
    const next = step + 1;
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function cancel() {
    router.push("/hr/employees");
  }

  async function create() {
    setBusy(true);
    try {
      const body: CreateEmployeeBody = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim() || undefined,
        roleTitle: (form.roleTitle || form.jobTitle || "Technician").trim(),
        jobTitle: (form.jobTitle || form.roleTitle).trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        homeAddress: form.homeAddress.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        crew: form.crew || undefined,
        supervisorId: form.supervisorId || undefined,
        hireDate: form.hireDate || undefined,
        employmentType: form.employmentType || undefined,
        payType: form.payType || undefined,
        payRate: form.payRate || undefined,
        overtimeEligible: form.overtimeEligible,
        adpEmployeeId: form.adpEmployeeId.trim() || undefined,
        defaultTimeCategory: form.defaultTimeCategory || undefined,
        certificationHeld: form.certificationHeld || undefined,
        certIssueDate: form.certIssueDate || undefined,
        certExpiryDate: form.certExpiryDate || undefined,
        certIssuingBody: form.certIssuingBody.trim() || undefined,
        certReminderLeadDays: Number(form.certReminderLeadDays) || 30,
        assignedTruck: form.assignedTruck || undefined,
        assignedEquipment: form.assignedEquipment,
        ppeIssued: form.ppeIssued,
        companyCreditCard: form.companyCreditCard,
        cardLast4: form.cardLast4.trim() || undefined,
        roleTemplate: form.roleTemplate || undefined,
        moduleOverrides: form.moduleOverrides.trim() || undefined,
        mobileAppAccess: form.mobileAppAccess,
        sendInvite: form.sendInvite,
        sseEnabled: form.sseEnabled,
        sseMentorId: form.sseMentorId || undefined,
        ssePeriodDays: Number(form.ssePeriodDays) || 90,
        sseEvaluationSchedule: form.sseEvaluationSchedule || undefined,
      };
      const res = await hrApi.createEmployee(body);
      toastSuccess(`Employee ${res.data.code} created`);
      router.push(`/hr/employees/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const supervisorName =
    supervisors.find((s) => s.value === form.supervisorId)?.label ??
    "Not selected";
  const mentorName =
    supervisors.find((s) => s.value === form.sseMentorId)?.label ??
    "Not selected";

  return (
    <div className="bg-shell p-3 sm:p-6">
      {step < STEPS.length - 1 ? (
        <Stepper
          step={step}
          maxReached={maxReached}
          onJump={(i) => setStep(i)}
        />
      ) : (
        <div className="mb-6">
          <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF] sm:text-[28px]">
            Review & Create
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Confirm the details below before creating this employee record.
          </p>
        </div>
      )}

      {step === 0 ? (
        <SectionCard title="Personal">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="First Name"
              value={form.firstName}
              onChange={(v) => set("firstName", v)}
              placeholder="Jose"
            />
            <TextInput
              label="Last Name"
              value={form.lastName}
              onChange={(v) => set("lastName", v)}
              placeholder="Martinez"
            />
            <TextInput
              label="Preferred Name"
              value={form.displayName}
              onChange={(v) => set("displayName", v)}
              placeholder="J. Martinez"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Email"
              value={form.email}
              onChange={(v) => set("email", v)}
              placeholder="name@darkhorsesafety.com"
            />
            <TextInput
              label="Mobile"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              placeholder="(432) 555-0000"
            />
          </div>
          <div className="mt-4">
            <TextInput
              label="Home Address"
              value={form.homeAddress}
              onChange={(v) => set("homeAddress", v)}
              placeholder="221 4th Ave N, Watford City, ND"
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
              placeholder="YYYY-MM-DD"
            />
          </div>
        </SectionCard>
      ) : null}

      {step === 1 ? (
        <SectionCard title="Role & Pay">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Employee ID"
              value="AUTO-GENERATED"
              onChange={() => undefined}
              disabled
            />
            <TextInput
              label="Job Title"
              value={form.jobTitle}
              onChange={(v) => set("jobTitle", v)}
              placeholder="E.g. Field Technician"
            />
            <SelectInput
              label="Role"
              value={form.roleTitle}
              onChange={(v) => set("roleTitle", v)}
              placeholder="Select role"
              options={(wizard?.roles ?? ["TECHNICIAN"]).map((r) => ({
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
              placeholder="Select type"
              options={(wizard?.employmentTypes ?? ["FULL-TIME"]).map((t) => ({
                value: t,
                label: t,
              }))}
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
              placeholder="Select pay type"
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
              placeholder="ADP ID"
            />
            <SelectInput
              label="Default Time Category"
              value={form.defaultTimeCategory}
              onChange={(v) => set("defaultTimeCategory", v)}
              placeholder="Select category"
              options={(wizard?.timeCategories ?? ["REGULAR"]).map((t) => ({
                value: t,
                label: t,
              }))}
            />
          </div>
        </SectionCard>
      ) : null}

      {step === 2 ? (
        <SectionCard title="Certifications">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectInput
              label="Certification"
              value={form.certificationHeld}
              onChange={(v) => set("certificationHeld", v)}
              placeholder="Select certification"
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
              placeholder="E.g. National Safety Council"
              className="sm:col-span-1"
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
                      set(
                        "certFileName",
                        e.target.files?.[0]?.name ?? "",
                      )
                    }
                  />
                </label>
              </div>
            </div>
            <SelectInput
              label="Reminder Lead Time"
              value={form.certReminderLeadDays}
              onChange={(v) => set("certReminderLeadDays", v)}
              placeholder="Select reminder"
              options={
                wizard?.reminderLeadDays ?? [
                  { value: "30", label: "30 DAYS BEFORE EXPIRY" },
                ]
              }
            />
          </div>
        </SectionCard>
      ) : null}

      {step === 3 ? (
        <SectionCard title="Equipment">
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
        </SectionCard>
      ) : null}

      {step === 4 ? (
        <SectionCard title="System Access">
          <div className="space-y-4">
            <SelectInput
              label="Role Template"
              value={form.roleTemplate}
              onChange={(v) => set("roleTemplate", v)}
              placeholder="Select template"
              options={(wizard?.roleTemplates ?? ["FIELD TECHNICIAN"]).map(
                (t) => ({ value: t, label: t }),
              )}
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
        </SectionCard>
      ) : null}

      {step === 5 ? (
        <SectionCard title="SSE">
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
              placeholder="Select period"
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
              placeholder="Select schedule"
              options={(wizard?.sseSchedules ?? ["WEEKLY"]).map((s) => ({
                value: s,
                label: s,
              }))}
            />
          </div>
        </SectionCard>
      ) : null}

      {step === 6 ? (
        <div className="space-y-3 sm:space-y-4">
          <SectionCard review title="Personal" editAction={() => setStep(0)}>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow label="First Name" value={form.firstName} />
              <ReviewRow label="Last Name" value={form.lastName} />
              <ReviewRow label="Preferred Name" value={form.displayName} />
              <ReviewRow label="Email" value={displayOrDash(form.email)} />
              <ReviewRow label="Mobile" value={displayOrDash(form.phone)} />
              <ReviewRow
                label="Date of Birth"
                value={displayOrDash(form.dateOfBirth)}
              />
            </div>
          </SectionCard>
          <SectionCard review title="Role & Pay" editAction={() => setStep(1)}>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow
                label="Job Title"
                value={displayOrDash(form.jobTitle || form.roleTitle)}
              />
              <ReviewRow
                label="Role"
                value={displayOrDash(form.roleTitle || form.jobTitle)}
              />
              <ReviewRow label="Crew" value={displayOrDash(form.crew)} />
              <ReviewRow label="Supervisor" value={supervisorName} />
              <ReviewRow
                label="Hire Date"
                value={displayOrDash(form.hireDate)}
              />
              <ReviewRow
                label="Employment Type"
                value={displayOrDash(form.employmentType)}
              />
              <ReviewRow
                label="Pay Rate"
                value={formatPayRate(form.payRate)}
              />
              <ReviewRow
                label="Pay Type"
                value={displayOrDash(form.payType)}
              />
              <ReviewRow
                label="Overtime Eligible"
                value={form.overtimeEligible ? "Enabled" : "Disabled"}
              />
            </div>
          </SectionCard>
          <SectionCard
            review
            title="Certifications"
            editAction={() => setStep(2)}
          >
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow
                label="Certification"
                value={displayOrDash(form.certificationHeld)}
              />
              <ReviewRow
                label="Issue Date"
                value={displayOrDash(form.certIssueDate)}
              />
              <ReviewRow
                label="Expiry Date"
                value={displayOrDash(form.certExpiryDate)}
              />
            </div>
          </SectionCard>
          <SectionCard review title="Equipment" editAction={() => setStep(3)}>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow
                label="Assign Truck"
                value={form.assignedTruck || "Not Selected"}
              />
              <ReviewRow
                label="Assign Equipment"
                value={
                  form.assignedEquipment.length
                    ? form.assignedEquipment.join(", ")
                    : "—"
                }
              />
              <ReviewRow
                label="Company Credit Card"
                value={form.companyCreditCard ? "Enabled" : "Disabled"}
              />
            </div>
          </SectionCard>
          <SectionCard
            review
            title="System Access"
            editAction={() => setStep(4)}
          >
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow
                label="Role Template"
                value={displayOrDash(form.roleTemplate)}
              />
              <ReviewRow
                label="Mobile App Access"
                value={form.mobileAppAccess ? "Enabled" : "Disabled"}
              />
              <ReviewRow
                label="Send Invite"
                value={form.sendInvite ? "Enabled" : "Disabled"}
              />
            </div>
          </SectionCard>
          <SectionCard review title="SSE" editAction={() => setStep(5)}>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <ReviewRow
                label="Short-Service Employee"
                value={form.sseEnabled ? "Enabled" : "Disabled"}
              />
              <ReviewRow
                label="Assign Mentor"
                value={form.sseMentorId ? mentorName : "Not Selected"}
              />
              <ReviewRow
                label="SSE Period Length"
                value={
                  form.ssePeriodDays ? `${form.ssePeriodDays} Days` : "—"
                }
              />
            </div>
          </SectionCard>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
        {step > 0 ? (
          <DashboardToolbarButton onClick={goBack} disabled={busy}>
            Back
          </DashboardToolbarButton>
        ) : null}
        <DashboardToolbarButton onClick={cancel} disabled={busy}>
          Cancel
        </DashboardToolbarButton>
        {step < STEPS.length - 1 ? (
          <DashboardToolbarButton variant="primary" onClick={goNext}>
            Next
          </DashboardToolbarButton>
        ) : (
          <DashboardToolbarButton
            variant="primary"
            disabled={busy}
            onClick={() => void create()}
          >
            Create Employee
          </DashboardToolbarButton>
        )}
      </div>
    </div>
  );
}
