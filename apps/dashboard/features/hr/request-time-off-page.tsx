"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrEmployee,
  type HrTimeOffPreview,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const EMPTY = {
  employeeId: "",
  type: "",
  startDate: "",
  endDate: "",
  durationMode: "ALL_DAY" as "ALL_DAY" | "PARTIAL",
  partialHours: "",
  reason: "",
  coveragePersonId: "",
  allowOverride: false,
  overrideRoles: [] as string[],
  requireOverrideReason: false,
  notifySupervisor: true,
};

const TYPE_OPTIONS = [
  { value: "PTO", label: "Vacation" },
  { value: "SICK", label: "Sick" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "BEREAVEMENT", label: "Bereavement" },
  { value: "HOLIDAY", label: "Holiday" },
];

const ROLE_OPTIONS = ["Supervisor", "HR Manager", "Ops Manager"];

const HOUR_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} Hour${i === 0 ? "" : "s"}`,
}));

function BlueToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#3B82F6]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "",
          )}
        />
      </button>
    </div>
  );
}

function BlueCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-left"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
          checked
            ? "border-[#3B82F6] bg-[#3B82F6] text-white"
            : "border-[#3E3E3E] bg-transparent",
        )}
      >
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6.2L4.8 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
    </button>
  );
}

function RadioOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="inline-flex items-center gap-2"
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          selected ? "border-[#3B82F6]" : "border-[#3E3E3E]",
        )}
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
        ) : null}
      </span>
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
    </button>
  );
}

export function RequestTimeOffPage() {
  const router = useRouter();
  const [form, setForm] = React.useState(EMPTY);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [preview, setPreview] = React.useState<HrTimeOffPreview | null>(null);
  const [attachments, setAttachments] = React.useState<
    Array<{ name: string; size: string }>
  >([]);
  const [busy, setBusy] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useSetHeaderBreadcrumb("Employees & HR / Time Off / Request Time Off");
  useSetHeaderActions(null, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await hrApi.listEmployees({ pageSize: 100 });
        if (!cancelled) setEmployees(res.data.items);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!form.employeeId || !form.type || !form.startDate || !form.endDate) {
      setPreview(null);
      return;
    }
    if (form.durationMode === "PARTIAL" && !form.partialHours) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const cover = employees.find((e) => e.id === form.coveragePersonId);
          const res = await hrApi.previewTimeOff({
            employeeId: form.employeeId,
            type: form.type,
            startDate: form.startDate,
            endDate: form.endDate,
            durationMode: form.durationMode,
            partialHours:
              form.durationMode === "PARTIAL"
                ? Number(form.partialHours)
                : undefined,
            coveragePersonId: form.coveragePersonId || undefined,
            coveragePersonName: cover?.name,
          });
          if (!cancelled) setPreview(res.data);
        } catch {
          if (!cancelled) setPreview(null);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    form.employeeId,
    form.type,
    form.startDate,
    form.endDate,
    form.durationMode,
    form.partialHours,
    form.coveragePersonId,
    employees,
  ]);

  function addRole(role: string) {
    setForm((f) =>
      f.overrideRoles.includes(role)
        ? f
        : { ...f, overrideRoles: [...f.overrideRoles, role] },
    );
    setRoleMenuOpen(false);
  }

  function removeRole(role: string) {
    setForm((f) => ({
      ...f,
      overrideRoles: f.overrideRoles.filter((r) => r !== role),
    }));
  }

  function onPickFile(file: File | null) {
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    setAttachments((prev) => [
      ...prev,
      { name: file.name.toUpperCase(), size: `${kb} KB` },
    ]);
  }

  async function submit() {
    if (!form.employeeId) {
      toastApiError(new Error("Employee is required"));
      return;
    }
    if (!form.type) {
      toastApiError(new Error("Type is required"));
      return;
    }
    if (!form.startDate || !form.endDate) {
      toastApiError(new Error("From and To dates are required"));
      return;
    }
    if (form.durationMode === "PARTIAL" && !form.partialHours) {
      toastApiError(new Error("Enter hours for a partial day request"));
      return;
    }
    if (preview?.insufficient && !form.allowOverride) {
      toastApiError(
        new Error("Enable approved override to submit with insufficient balance"),
      );
      return;
    }
    if (
      preview?.insufficient &&
      form.allowOverride &&
      form.overrideRoles.length === 0
    ) {
      toastApiError(new Error("Add at least one override role"));
      return;
    }

    setBusy(true);
    try {
      const cover = employees.find((e) => e.id === form.coveragePersonId);
      await hrApi.createTimeOff({
        employeeId: form.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || undefined,
        durationMode: form.durationMode,
        partialHours:
          form.durationMode === "PARTIAL"
            ? Number(form.partialHours)
            : undefined,
        coveragePersonId: form.coveragePersonId || undefined,
        coveragePersonName: cover?.name,
        allowOverride: form.allowOverride,
        overrideRoles: form.overrideRoles,
        requireOverrideReason: form.requireOverrideReason,
        notifySupervisor: form.notifySupervisor,
        attachments,
      });
      toastSuccess("Time off requested");
      router.push("/hr/time-off");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const afterNegative = Boolean(preview && preview.balanceAfter < 0);

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      {/* REQUEST DETAILS */}
      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle icon="lightning" title="Request Details" />
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <DashboardSelectField
              label="Employee"
              value={form.employeeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, employeeId: e.target.value }))
              }
              placeholder="S. Mitchell"
              loading={loadingOptions}
              options={employees.map((e) => ({
                value: e.id,
                label: e.name,
              }))}
            />
          </div>
          <DashboardSelectField
            label="Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            placeholder="Vacation"
            options={TYPE_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-3 sm:col-span-1">
            <DashboardTextField
              label="From"
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              placeholder="YYYY-MM-DD"
            />
            <DashboardTextField
              label="To"
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <span className="mb-2 block font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
              All Day or Partial
            </span>
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <RadioOption
                label="All Day"
                selected={form.durationMode === "ALL_DAY"}
                onSelect={() =>
                  setForm((f) => ({
                    ...f,
                    durationMode: "ALL_DAY",
                    partialHours: "",
                  }))
                }
              />
              <RadioOption
                label="Partial"
                selected={form.durationMode === "PARTIAL"}
                onSelect={() =>
                  setForm((f) => ({ ...f, durationMode: "PARTIAL" }))
                }
              />
            </div>
          </div>
          <DashboardSelectField
            label="Hours (If Partial)"
            value={form.partialHours}
            onChange={(e) =>
              setForm((f) => ({ ...f, partialHours: e.target.value }))
            }
            placeholder="—"
            disabled={form.durationMode !== "PARTIAL"}
            options={HOUR_OPTIONS}
          />
          <div className="sm:col-span-2">
            <DashboardTextAreaField
              label="Reason"
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              rows={3}
              placeholder="Family vacation – flights already booked"
            />
          </div>
        </div>
      </section>

      {/* BALANCE */}
      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle icon="lightning" title="Balance" />
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardTextField
              label="Balance Before"
              value={preview?.balanceBeforeLabel ?? ""}
              readOnly
              placeholder="80.0 HRS"
            />
            <DashboardTextField
              label="Balance After"
              value={preview?.balanceAfterLabel ?? ""}
              readOnly
              placeholder="-4.0 HRS"
              className={
                afterNegative
                  ? "border-[#D65A57] text-[#F87171]"
                  : undefined
              }
            />
          </div>

          {preview?.insufficient && preview.insufficientMessage ? (
            <div className="rounded-lg border border-[#5A2020] bg-[#3B1515] px-4 py-3">
              <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.01em] text-[#F0A0A0]">
                {preview.insufficientMessage}
              </p>
              <button
                type="button"
                onClick={() =>
                  toastSuccess("Balance history opens from employee profile")
                }
                className="mt-3 inline-flex h-8 items-center rounded-lg border border-[#8B4040] bg-[#4A1C1C] px-3 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#FDFDFF]"
              >
                View Balance History
              </button>
            </div>
          ) : null}

          <BlueToggle
            label="Allow Approved Override"
            checked={form.allowOverride}
            onChange={(v) => setForm((f) => ({ ...f, allowOverride: v }))}
          />

          {form.allowOverride ? (
            <div>
              <span className="mb-2 block font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                Override Permitted By
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {form.overrideRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[10px] font-[510] uppercase text-[#FDFDFF]"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="text-[#959597] hover:text-white"
                      aria-label={`Remove ${role}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleMenuOpen((o) => !o)}
                    className="inline-flex h-8 items-center rounded-lg border border-dashed border-[#3E3E3E] px-3 font-sans text-[10px] uppercase text-[#959597] hover:border-[#959597] hover:text-[#FDFDFF]"
                  >
                    + Add Role
                  </button>
                  {roleMenuOpen ? (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-[#2D2D30] bg-[#1A1A1A] shadow-lg">
                      {ROLE_OPTIONS.filter(
                        (r) => !form.overrideRoles.includes(r),
                      ).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => addRole(role)}
                          className="block w-full px-3 py-2 text-left font-sans text-[10px] uppercase text-[#C8C8C8] hover:bg-[#222] hover:text-white"
                        >
                          {role}
                        </button>
                      ))}
                      {ROLE_OPTIONS.every((r) =>
                        form.overrideRoles.includes(r),
                      ) ? (
                        <p className="px-3 py-2 font-sans text-[10px] uppercase text-[#6F6F72]">
                          All roles added
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <BlueCheckbox
                  label="Require a Reason When Overriding"
                  checked={form.requireOverrideReason}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, requireOverrideReason: v }))
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* COVERAGE */}
      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle icon="lightning" title="Coverage" />
        </div>
        <div className="space-y-4 p-4">
          <DashboardSelectField
            label="Coverage Person"
            value={form.coveragePersonId}
            onChange={(e) =>
              setForm((f) => ({ ...f, coveragePersonId: e.target.value }))
            }
            placeholder="R. Salinas"
            loading={loadingOptions}
            options={employees
              .filter((e) => e.id !== form.employeeId)
              .map((e) => ({ value: e.id, label: e.name }))}
          />

          {preview?.coverageConflict ? (
            <div className="rounded-lg border border-[#5A4520] bg-[#2A2314] px-4 py-3">
              <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.01em] text-[#E8C98A]">
                {preview.coverageConflict.message}
              </p>
              <button
                type="button"
                onClick={() => router.push("/hr/time-off")}
                className="mt-3 inline-flex h-8 items-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#FDFDFF]"
              >
                View Coverage Schedule
              </button>
            </div>
          ) : null}

          <div>
            <span className="mb-2 block font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Attachment (E.G. Sick Note)
            </span>
            <div className="space-y-2">
              {attachments.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5"
                >
                  <p className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.01em] text-[#C8C8C8]">
                    {file.name}{" "}
                    <span className="text-[#6F6F72]">{file.size}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="shrink-0 text-[#959597] hover:text-white"
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  onPickFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <DashboardToolbarButton
                onClick={() => fileRef.current?.click()}
              >
                + Add Attachment
              </DashboardToolbarButton>
            </div>
          </div>

          <BlueToggle
            label="Notify Supervisor"
            checked={form.notifySupervisor}
            onChange={(v) => setForm((f) => ({ ...f, notifySupervisor: v }))}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <DashboardToolbarButton
          disabled={busy}
          onClick={() => router.push("/hr/time-off")}
        >
          Cancel
        </DashboardToolbarButton>
        <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
          Submit Request
        </PayrollPrimaryButton>
      </div>
    </div>
  );
}
