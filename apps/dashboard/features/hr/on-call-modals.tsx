"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardSelectField,
  DashboardTextField,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrOnCallAssignment,
  type HrOnCallGenerateBody,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

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
              "rounded-full border px-3 py-1.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
      {children}
    </span>
  );
}

const STEPS = [
  "Period",
  "Pool",
  "Pattern",
  "Constraints",
  "Preview",
  "Confirm",
] as const;

const PATTERN_NOTES: Record<string, string> = {
  ROUND_ROBIN:
    "Round robin cycles technicians in order, starting from the last person on the previous rotation.",
  WEIGHTED_SENIORITY:
    "Weighted by seniority assigns more shifts to senior technicians while keeping coverage balanced.",
  MANUAL_ORDER:
    "Manual order follows the technician list you arrange in the pool step.",
};

export function SwapRequestModal({
  open,
  onClose,
  assignment,
  technicians,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  assignment: HrOnCallAssignment | null;
  technicians: Array<{ id: string; name: string }>;
  onSaved: () => void;
}) {
  const [toEmployeeId, setToEmployeeId] = React.useState("");
  const [swapType, setSwapType] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setToEmployeeId("");
    setSwapType("");
    setReason("");
  }, [open]);

  async function submit() {
    if (!assignment) return;
    if (!toEmployeeId) {
      toastApiError(new Error("Select a technician to swap with"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.createOnCallSwap({
        assignmentId: assignment.id,
        toEmployeeId,
        swapType: swapType || undefined,
        reason: reason.trim() || undefined,
      });
      toastSuccess("Swap request submitted");
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
      title="Swap Request"
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
          <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
            Submit Swap Request
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Current Assignee"
          value=""
          readOnly
          placeholder={
            assignment
              ? `${assignment.employeeName || "Unassigned"} · ${assignment.dateLabel}`
              : "Select assignment"
          }
        />
        <DashboardTextField
          label="Shift Date"
          value=""
          readOnly
          placeholder={assignment?.dateLabel || "Select date"}
        />
        <div>
          <FieldLabel>Swap Type</FieldLabel>
          <ChipToggle
            value={swapType}
            onChange={setSwapType}
            options={[
              { value: "FULL_SHIFT", label: "Full Shift" },
              { value: "PARTIAL_SHIFT", label: "Partial Shift" },
            ]}
          />
        </div>
        <DashboardSelectField
          label="Swap With"
          value={toEmployeeId}
          onChange={(e) => setToEmployeeId(e.target.value)}
          placeholder="Select technician"
          options={technicians.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />
        <DashboardTextField
          label="Reason for Swap"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g. medical appointment, family conflict"
        />
      </div>
    </DashboardModal>
  );
}

export function AssignmentDetailModal({
  open,
  onClose,
  assignment,
  technicians,
  onRequestSwap,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  assignment: HrOnCallAssignment | null;
  technicians: Array<{ id: string; name: string }>;
  onRequestSwap: () => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = React.useState("");
  const [zone, setZone] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [backupId, setBackupId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // Empty form — placeholders only (design values are placeholders)
    setEmployeeId("");
    setZone("");
    setStatus("");
    setBackupId("");
    setNotes("");
  }, [open, assignment?.id]);

  async function save() {
    if (!assignment) return;
    const hasChanges =
      Boolean(employeeId) ||
      Boolean(backupId) ||
      Boolean(zone) ||
      Boolean(status) ||
      Boolean(notes.trim());
    if (!hasChanges) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await hrApi.updateOnCallAssignment(assignment.id, {
        employeeId: employeeId || undefined,
        backupId: backupId || undefined,
        zone: zone || undefined,
        status: status || undefined,
        notes: notes.trim() || undefined,
      });
      toastSuccess("Assignment updated");
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
      title={
        assignment
          ? `On-Call — ${assignment.dateLabel}`
          : "On-Call Assignment"
      }
      widthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onRequestSwap}
            className="font-sans text-[11px] uppercase text-[#959597]"
          >
            Request Swap
          </button>
          <PayrollPrimaryButton disabled={busy} onClick={() => void save()}>
            Close
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardSelectField
          label="Assigned Technician"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder={assignment?.employeeName || "S. Mitchell"}
          options={technicians.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />
        <DashboardSelectField
          label="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder={assignment?.zone || "Central"}
          options={[
            { value: "NORTH", label: "North" },
            { value: "SOUTH", label: "South" },
            { value: "CENTRAL", label: "Central" },
          ]}
        />
        <div>
          <FieldLabel>Status</FieldLabel>
          <ChipToggle
            value={status}
            onChange={setStatus}
            options={[
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "PENDING_SWAP", label: "Pending Swap" },
            ]}
          />
        </div>
        <DashboardSelectField
          label="Backup Technician"
          value={backupId}
          onChange={(e) => setBackupId(e.target.value)}
          placeholder={assignment?.backupName || "S. Nguyen"}
          options={technicians.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />
        <DashboardTextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="No notes for this shift"
        />
      </div>
    </DashboardModal>
  );
}

export function GenerateRotationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = React.useState(0);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [coverage, setCoverage] = React.useState("");
  const [technicians, setTechnicians] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [certs, setCerts] = React.useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = React.useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = React.useState<string[]>([]);
  const [pattern, setPattern] = React.useState("");
  const [maxConsecutive, setMaxConsecutive] = React.useState("");
  const [minGap, setMinGap] = React.useState("");
  const [respectTimeOff, setRespectTimeOff] = React.useState(true);
  const [respectDispatch, setRespectDispatch] = React.useState(true);
  const [notify, setNotify] = React.useState(true);
  const [preview, setPreview] = React.useState<{
    assignments: Array<{
      date: string;
      dateLabel: string;
      name: string | null;
      zone: string | null;
      status: "OK" | "CONFLICT";
    }>;
    summary: { generated: number; conflicts: number; label: string };
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setFromDate("");
    setToDate("");
    setCoverage("");
    setSelectedTechs([]);
    setSelectedCerts([]);
    setPattern("");
    setMaxConsecutive("");
    setMinGap("");
    setRespectTimeOff(true);
    setRespectDispatch(true);
    setNotify(true);
    setPreview(null);
    void (async () => {
      try {
        const pool = await hrApi.onCallPool();
        setTechnicians(pool.data.technicians);
        setCerts(pool.data.certifications);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open]);

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function buildBody(): HrOnCallGenerateBody {
    return {
      fromDate: fromDate || "2026-07-01",
      toDate: toDate || "2026-07-31",
      coverage: coverage || undefined,
      technicianIds:
        selectedTechs.length > 0
          ? selectedTechs
          : technicians.slice(0, 4).map((t) => t.id),
      certifications: selectedCerts.length ? selectedCerts : undefined,
      pattern: pattern || undefined,
      maxConsecutive: maxConsecutive ? Number(maxConsecutive) : undefined,
      minGap: minGap ? Number(minGap.replace(/\D/g, "")) || undefined : undefined,
      respectTimeOff,
      respectDispatch,
      notify,
    };
  }

  async function goNext() {
    if (step === 4 && !preview) {
      setBusy(true);
      try {
        const res = await hrApi.previewOnCallGenerate(buildBody());
        setPreview(res.data);
        setStep(4);
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 3) {
      setBusy(true);
      try {
        const res = await hrApi.previewOnCallGenerate(buildBody());
        setPreview(res.data);
        setStep(4);
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step >= 5) {
      setBusy(true);
      try {
        await hrApi.generateOnCall(buildBody());
        toastSuccess("Rotation created");
        onCreated();
        onClose();
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  const stepLabel = `Step ${step + 1} of 6 — ${STEPS[step]}`;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Generate Rotation"
      widthClassName="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          {step === 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-[11px] uppercase text-[#959597]"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="font-sans text-[11px] uppercase text-[#959597]"
            >
              Back
            </button>
          )}
          <PayrollPrimaryButton disabled={busy} onClick={() => void goNext()}>
            {step >= 5 ? "Create Assignments & Notify" : "Next"}
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
            {stepLabel}
          </p>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={STEPS[i]}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= step ? "bg-[#FDFDFF]" : "bg-[#2A2A2A]",
                )}
              />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <DashboardTextField
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="Jul 01, 2026"
            />
            <DashboardTextField
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="Jul 31, 2026"
            />
            <div>
              <FieldLabel>Coverage</FieldLabel>
              <ChipToggle
                value={coverage}
                onChange={setCoverage}
                options={[
                  { value: "WEEKENDS", label: "Weekends" },
                  { value: "WEEKNIGHTS", label: "Weeknights" },
                  { value: "BOTH", label: "Both" },
                ]}
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>Eligible Technicians</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {technicians.map((t) => {
                  const on = selectedTechs.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setSelectedTechs((list) => toggleId(list, t.id))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 font-sans text-[10px] font-[510] uppercase",
                        on
                          ? "bg-[#FDFDFF] text-[#0B0B0C] ring-1 ring-[#FDFDFF]"
                          : "bg-[#2A2A2A] text-[#C8C8C8]",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <FieldLabel>Required Certifications</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {certs.map((c) => {
                  const on = selectedCerts.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setSelectedCerts((list) => toggleId(list, c))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 font-sans text-[10px] font-[510] uppercase",
                        on
                          ? "bg-[#FDFDFF] text-[#0B0B0C] ring-1 ring-[#FDFDFF]"
                          : "bg-[#2A2A2A] text-[#C8C8C8]",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>Rotation Pattern</FieldLabel>
              <ChipToggle
                value={pattern}
                onChange={setPattern}
                options={[
                  { value: "ROUND_ROBIN", label: "Round Robin" },
                  {
                    value: "WEIGHTED_SENIORITY",
                    label: "Weighted by Seniority",
                  },
                  { value: "MANUAL_ORDER", label: "Manual Order" },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3 font-sans text-[11px] uppercase leading-relaxed text-[#959597]">
                {PATTERN_NOTES[pattern] ||
                  "Select a rotation pattern to see how assignments will be generated."}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <DashboardTextField
              label="Max Consecutive Periods"
              value={maxConsecutive}
              onChange={(e) => setMaxConsecutive(e.target.value)}
              placeholder="3"
            />
            <DashboardTextField
              label="Minimum Gap Between Periods"
              value={minGap}
              onChange={(e) => setMinGap(e.target.value)}
              placeholder="2 periods"
            />
            <div className="flex items-center justify-between gap-4">
              <FieldLabel>Respect Time Off</FieldLabel>
              <ToggleSwitch
                checked={respectTimeOff}
                onChange={setRespectTimeOff}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <FieldLabel>Respect Dispatch Schedule</FieldLabel>
              <ToggleSwitch
                checked={respectDispatch}
                onChange={setRespectDispatch}
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            {preview ? (
              <>
                <p className="font-sans text-[11px] uppercase text-[#D88C51]">
                  {preview.summary.label}
                </p>
                <div className="max-h-64 overflow-auto rounded-xl border border-[#2D2D30] bg-[#1A1A1A]">
                  {preview.assignments.slice(0, 12).map((row) => (
                    <div
                      key={row.date}
                      className="flex items-center gap-3 border-b border-[#222] px-3 py-2.5 last:border-b-0"
                    >
                      <span className="w-14 shrink-0 font-sans text-[11px] uppercase text-[#C8C8C8]">
                        {row.dateLabel}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-sans text-[11px] uppercase",
                          row.status === "CONFLICT"
                            ? "text-[#5A5A5A]"
                            : "text-[#FDFDFF]",
                        )}
                      >
                        {row.name || "—"}
                      </span>
                      <span className="w-16 shrink-0 font-sans text-[10px] uppercase text-[#959597]">
                        {row.zone || "—"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase",
                          row.status === "OK"
                            ? "bg-[#203B2C] text-[#ACEBCE]"
                            : "bg-[#3B2020] text-[#E8A0A0]",
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-sans text-[11px] uppercase text-[#959597]">
                Loading preview…
              </p>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3">
              {[
                {
                  label: "Period",
                  value:
                    fromDate && toDate
                      ? `${fromDate} – ${toDate}${coverage ? ` · ${coverage.replace(/_/g, " ")}` : ""}`
                      : "[Start Date] – [End Date]",
                },
                {
                  label: "Technicians",
                  value:
                    selectedTechs.length > 0
                      ? technicians
                          .filter((t) => selectedTechs.includes(t.id))
                          .map((t) => t.name)
                          .join(", ")
                      : technicians
                          .slice(0, 4)
                          .map((t) => t.name)
                          .join(", ") || "[Technician Names]",
                },
                {
                  label: "Pattern",
                  value: pattern
                    ? pattern.replace(/_/g, " ")
                    : "[Pattern]",
                },
                {
                  label: "Assignments",
                  value: preview
                    ? `${preview.summary.generated} created · ${preview.summary.conflicts} conflicts to resolve before publish`
                    : "[Assignments]",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="shrink-0 font-sans text-[10px] uppercase text-[#959597]">
                    {row.label}
                  </span>
                  <span className="min-w-0 text-right font-sans text-[11px] uppercase text-[#FDFDFF]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                Notify technicians on publish
              </span>
              <ToggleSwitch checked={notify} onChange={setNotify} />
            </div>
          </div>
        ) : null}
      </div>
    </DashboardModal>
  );
}
