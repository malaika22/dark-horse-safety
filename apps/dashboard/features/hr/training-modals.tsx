"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi, type HrEmployee } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase outline-none",
          value ? "text-[#FDFDFF]" : "text-[#5A5A5A]",
        )}
      >
        <option value="">{placeholder || "Select"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipToggle({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] transition-colors",
              active
                ? "border-[#FDFDFF] bg-[#FDFDFF] text-[#0B0B0C]"
                : "border-[#3E3E3E] bg-transparent text-[#959597]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#34C759]" : "bg-[#3E3E3E]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

const ASSIGN_EMPTY = {
  courseId: "",
  courseName: "",
  employeeIds: [] as string[],
  dueDate: "",
  reason: "",
  notify: true,
  linkedSource: "",
};

export function AssignTrainingModal({
  open,
  onClose,
  onSaved,
  defaultReason,
  defaultLinkedSource,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultReason?: string;
  defaultLinkedSource?: string;
}) {
  const [form, setForm] = React.useState(ASSIGN_EMPTY);
  const [courses, setCourses] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm({
      ...ASSIGN_EMPTY,
      reason: defaultReason || "",
      linkedSource: defaultLinkedSource || "",
      notify: true,
    });
    setPickerOpen(false);
    void (async () => {
      try {
        const [c, e] = await Promise.all([
          hrApi.listTrainingCourses(),
          hrApi.listEmployees({ pageSize: 100 }),
        ]);
        setCourses(c.data.map((x) => ({ id: x.id, name: x.name })));
        setEmployees(e.data.items);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open, defaultReason, defaultLinkedSource]);

  const selectedEmployees = employees.filter((e) =>
    form.employeeIds.includes(e.id),
  );

  async function submit() {
    if (!form.courseId && !form.courseName.trim()) {
      toastApiError(new Error("Select a course"));
      return;
    }
    if (form.employeeIds.length === 0) {
      toastApiError(new Error("Add at least one technician"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.assignTraining({
        courseId: form.courseId || undefined,
        courseName: form.courseName.trim() || undefined,
        employeeIds: form.employeeIds,
        dueDate: form.dueDate || undefined,
        reason: form.reason || undefined,
        notify: form.notify,
        linkedSource: form.linkedSource.trim() || undefined,
      });
      toastSuccess("Training assigned");
      onSaved();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Assign Training"
      widthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[11px] uppercase text-[#959597]"
          >
            Cancel
          </button>
          <PayrollPrimaryButton onClick={submit} disabled={busy}>
            Assign Training
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <SelectInput
          label="Course"
          value={form.courseId}
          onChange={(v) => {
            const c = courses.find((x) => x.id === v);
            setForm((f) => ({
              ...f,
              courseId: v,
              courseName: c?.name || "",
            }));
          }}
          placeholder="Select a course"
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
        />

        <div>
          <FieldLabel>Assign To</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            {selectedEmployees.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    employeeIds: f.employeeIds.filter((id) => id !== e.id),
                  }))
                }
                className="rounded-full bg-[#FDFDFF] px-3 py-1.5 font-sans text-[10px] font-[510] uppercase text-[#0B0B0C]"
              >
                {e.name} ×
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className={cn(
                "rounded-full border border-dashed px-3 py-1.5 font-sans text-[10px] font-[510] uppercase",
                selectedEmployees.length === 0
                  ? "border-transparent bg-[#FDFDFF] text-[#0B0B0C]"
                  : "border-[#3E3E3E] text-[#959597]",
              )}
            >
              + Add Technician
            </button>
          </div>
          {pickerOpen ? (
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-[#2D2D30] bg-[#141414]">
              {employees.map((e) => {
                const on = form.employeeIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        employeeIds: on
                          ? f.employeeIds.filter((id) => id !== e.id)
                          : [...f.employeeIds, e.id],
                      }))
                    }
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left font-sans text-[11px] uppercase",
                      on ? "bg-[#1F1F1F] text-[#FDFDFF]" : "text-[#C8C8C8]",
                    )}
                  >
                    <span>{e.name}</span>
                    <span className="text-[#959597]">{e.code}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <TextInput
          label="Due Date"
          type="date"
          value={form.dueDate}
          onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
          placeholder="Select due date"
        />

        <div>
          <FieldLabel>Reason</FieldLabel>
          <ChipToggle
            value={form.reason}
            onChange={(v) => setForm((f) => ({ ...f, reason: v }))}
            options={[
              { value: "NEW_HIRE", label: "New Hire" },
              { value: "RENEWAL", label: "Renewal" },
              { value: "BBS_RETRAIN", label: "BBS Retrain" },
            ]}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <FieldLabel>Notify Technician</FieldLabel>
          <ToggleSwitch
            checked={form.notify}
            onChange={(v) => setForm((f) => ({ ...f, notify: v }))}
          />
        </div>

        <TextInput
          label="Linked Source Record"
          value={form.linkedSource}
          onChange={(v) => setForm((f) => ({ ...f, linkedSource: v }))}
          placeholder="No linked record"
        />
      </div>
    </DashboardModal>
  );
}

const CERT_EMPTY = {
  employeeId: "",
  label: "",
  expiryAt: "",
  verification: "",
  issuingBody: "",
  fileName: "",
  fileSize: "",
  renewalReminder: true,
};

export function CertificateRecordModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState(CERT_EMPTY);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(CERT_EMPTY);
    void (async () => {
      try {
        const e = await hrApi.listEmployees({ pageSize: 100 });
        setEmployees(e.data.items);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open]);

  async function submit() {
    if (!form.employeeId) {
      toastApiError(new Error("Select who the certificate is for"));
      return;
    }
    if (!form.label.trim()) {
      toastApiError(new Error("Certificate label is required"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.createTrainingCertificate({
        employeeId: form.employeeId,
        label: form.label.trim(),
        expiryAt: form.expiryAt || undefined,
        verification: form.verification || undefined,
        issuingBody: form.issuingBody.trim() || undefined,
        fileName: form.fileName || undefined,
        fileSize: form.fileSize || undefined,
        renewalReminder: form.renewalReminder,
      });
      toastSuccess("Certificate saved");
      onSaved();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Certificate Record"
      widthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[11px] uppercase text-[#959597]"
          >
            Cancel
          </button>
          <PayrollPrimaryButton onClick={submit} disabled={busy}>
            Save Certificate
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <SelectInput
          label="Certificate For"
          value={form.employeeId}
          onChange={(v) => {
            const emp = employees.find((e) => e.id === v);
            setForm((f) => ({
              ...f,
              employeeId: v,
              label: emp
                ? `${emp.name} · Certificate`
                : f.label,
            }));
          }}
          placeholder="Select employee"
          options={employees.map((e) => ({
            value: e.id,
            label: e.name,
          }))}
        />

        <TextInput
          label="Expiry Date"
          type="date"
          value={form.expiryAt}
          onChange={(v) => setForm((f) => ({ ...f, expiryAt: v }))}
          placeholder="Select expiry date"
        />

        <div>
          <FieldLabel>Verification Status</FieldLabel>
          <ChipToggle
            value={form.verification}
            onChange={(v) => setForm((f) => ({ ...f, verification: v }))}
            options={[
              { value: "VERIFIED", label: "Verified" },
              { value: "PENDING", label: "Pending" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
        </div>

        <TextInput
          label="Issuing Body"
          value={form.issuingBody}
          onChange={(v) => setForm((f) => ({ ...f, issuingBody: v }))}
          placeholder="E.g. NIOSH, Red Cross, OSHA"
        />

        <div>
          <FieldLabel>Certificate Upload</FieldLabel>
          {form.fileName ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-sans text-[11px] uppercase text-[#FDFDFF]">
                  {form.fileName}
                </p>
                <p className="font-sans text-[10px] text-[#959597]">
                  {form.fileSize || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, fileName: "", fileSize: "" }))
                }
                className="text-[#959597]"
                aria-label="Remove file"
              >
                ×
              </button>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const kb = Math.max(1, Math.round(file.size / 1024));
              setForm((f) => ({
                ...f,
                fileName: file.name,
                fileSize: `${kb} KB`,
                label: f.label || file.name,
              }));
              e.target.value = "";
            }}
          />
          <DashboardToolbarButton
            onClick={() => fileRef.current?.click()}
          >
            + Upload Certificate
          </DashboardToolbarButton>
        </div>

        <div className="flex items-center justify-between gap-4">
          <FieldLabel>Renewal Reminder</FieldLabel>
          <ToggleSwitch
            checked={form.renewalReminder}
            onChange={(v) => setForm((f) => ({ ...f, renewalReminder: v }))}
          />
        </div>
      </div>
    </DashboardModal>
  );
}
