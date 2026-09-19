"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { hrApi, type HrEmployee } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

const EMPTY = {
  employeeId: "",
  courseId: "",
  issuingBody: "",
  instructor: "",
  completedAt: "",
  expiryAt: "",
  score: "",
  cost: "",
  certificateName: "",
  certificateSize: "",
  reminderLead: "",
  notes: "",
};

export function NewTrainingRecordPage() {
  const router = useRouter();
  const [form, setForm] = React.useState(EMPTY);
  const [employees, setEmployees] = React.useState<HrEmployee[]>([]);
  const [courses, setCourses] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [busy, setBusy] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useSetHeaderBreadcrumb("Employees & HR / Training / New Training Record");
  useSetHeaderActions(null, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [e, c] = await Promise.all([
          hrApi.listEmployees({ pageSize: 100 }),
          hrApi.listTrainingCourses(),
        ]);
        if (cancelled) return;
        setEmployees(e.data.items);
        setCourses(c.data.map((x) => ({ id: x.id, name: x.name })));
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

  async function submit() {
    if (!form.employeeId) {
      toastApiError(new Error("Employee is required"));
      return;
    }
    if (!form.courseId) {
      toastApiError(new Error("Course is required"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.createTrainingRecord({
        employeeId: form.employeeId,
        courseId: form.courseId,
        issuingBody: form.issuingBody.trim() || undefined,
        instructor: form.instructor.trim() || undefined,
        completedAt: form.completedAt || undefined,
        expiryAt: form.expiryAt || undefined,
        score: form.score.trim() || undefined,
        cost: form.cost.trim() || undefined,
        certificateName: form.certificateName || undefined,
        certificateSize: form.certificateSize || undefined,
        reminderLead: form.reminderLead.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toastSuccess("Training record added");
      router.push("/hr/training");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle icon="lightning" title="Training Details" />
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <DashboardSelectField
            label="Employee"
            value={form.employeeId}
            onChange={(e) =>
              setForm((f) => ({ ...f, employeeId: e.target.value }))
            }
            placeholder="S. Vance"
            loading={loadingOptions}
            options={employees.map((e) => ({
              value: e.id,
              label: e.name,
            }))}
          />
          <DashboardSelectField
            label="Course (from Course Library)"
            value={form.courseId}
            onChange={(e) =>
              setForm((f) => ({ ...f, courseId: e.target.value }))
            }
            placeholder="H2S Awareness"
            loading={loadingOptions}
            options={courses.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
          <DashboardTextField
            label="Issuing Body"
            value={form.issuingBody}
            onChange={(e) =>
              setForm((f) => ({ ...f, issuingBody: e.target.value }))
            }
            placeholder="PEC Safeland"
          />
          <DashboardTextField
            label="Instructor"
            value={form.instructor}
            onChange={(e) =>
              setForm((f) => ({ ...f, instructor: e.target.value }))
            }
            placeholder="R. Salinas"
          />
          <DashboardTextField
            label="Completion Date"
            type="date"
            value={form.completedAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, completedAt: e.target.value }))
            }
            placeholder="YYYY-MM-DD"
          />
          <DashboardTextField
            label="Expiry Date"
            type="date"
            value={form.expiryAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, expiryAt: e.target.value }))
            }
            placeholder="YYYY-MM-DD"
          />
          <DashboardTextField
            label="Score"
            value={form.score}
            onChange={(e) =>
              setForm((f) => ({ ...f, score: e.target.value }))
            }
            placeholder="94%"
          />
          <DashboardTextField
            label="Cost"
            value={form.cost}
            onChange={(e) =>
              setForm((f) => ({ ...f, cost: e.target.value }))
            }
            placeholder="$185.00"
          />
        </div>
      </section>

      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle
            icon="lightning"
            title="Certificate & Reminders"
          />
        </div>
        <div className="space-y-4 p-4">
          <div>
            <span className="mb-2 block font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Certificate Upload
            </span>
            {form.certificateName ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5">
                <p className="min-w-0 truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {form.certificateName}
                  {form.certificateSize ? (
                    <span className="ml-2 text-[#959597]">
                      {form.certificateSize}
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      certificateName: "",
                      certificateSize: "",
                    }))
                  }
                  className="shrink-0 font-sans text-[14px] text-[#959597] hover:text-[#FDFDFF]"
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
                  certificateName: file.name,
                  certificateSize: `${kb} KB`,
                }));
                e.target.value = "";
              }}
            />
            <DashboardToolbarButton onClick={() => fileRef.current?.click()}>
              + Upload Certificate
            </DashboardToolbarButton>
          </div>

          <DashboardTextField
            label="Renewal Reminder Lead Time"
            value={form.reminderLead}
            onChange={(e) =>
              setForm((f) => ({ ...f, reminderLead: e.target.value }))
            }
            placeholder="30 days before expiry"
          />

          <DashboardTextAreaField
            label="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={4}
            placeholder="Retake required if score falls below 80% on renewal."
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <DashboardToolbarButton onClick={() => router.push("/hr/training")}>
          Cancel
        </DashboardToolbarButton>
        <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
          Add Record
        </PayrollPrimaryButton>
      </div>
    </div>
  );
}
