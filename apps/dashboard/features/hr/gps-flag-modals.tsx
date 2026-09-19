"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardTextAreaField,
  DashboardTextField,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi, type HrGpsFlagDetail } from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
      {children}
    </span>
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

function flagSummary(flag: HrGpsFlagDetail | null) {
  if (!flag) return "";
  const datePart =
    flag.eventAtLabel.split(" -")[0]?.trim() ||
    flag.eventAtLabel.split(" ·")[0]?.trim() ||
    "";
  return `${flag.employee} · ${flag.typeLabel} · ${datePart}`;
}

export function RequestMoreInfoModal({
  open,
  onClose,
  flag,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  flag: HrGpsFlagDetail | null;
  onSaved: () => void;
}) {
  const [notifyVia, setNotifyVia] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNotifyVia("");
    setMessage("");
  }, [open]);

  async function submit() {
    if (!flag) return;
    if (!message.trim()) {
      toastApiError(new Error("Enter a message to the technician"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.decideGpsFlag(flag.id, {
        decision: "MORE_INFO",
        notifyVia: notifyVia || undefined,
        notes: message.trim(),
      });
      toastSuccess("Request sent");
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
      title="Request More Information"
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
          <PayrollPrimaryButton
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-full px-5"
          >
            Send Request
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Flag"
          value=""
          readOnly
          placeholder={flagSummary(flag) || "Select a flag"}
        />
        <div>
          <FieldLabel>Notify Via</FieldLabel>
          <ChipToggle
            value={notifyVia}
            onChange={setNotifyVia}
            options={[
              { value: "PUSH", label: "Push Notification" },
              { value: "EMAIL", label: "Email" },
              { value: "BOTH", label: "Both" },
            ]}
          />
        </div>
        <DashboardTextAreaField
          label="Message to Technician"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="E.g. can you confirm why the clock-in location doesn't match the job site?"
        />
      </div>
    </DashboardModal>
  );
}

export function RejectGpsFlagModal({
  open,
  onClose,
  flag,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  flag: HrGpsFlagDetail | null;
  onSaved: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setReason("");
    setNotes("");
  }, [open]);

  async function submit() {
    if (!flag) return;
    if (!reason) {
      toastApiError(new Error("Select a rejection reason"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.decideGpsFlag(flag.id, {
        decision: "REJECTED",
        rejectReason: reason,
        notes: notes.trim() || undefined,
      });
      toastSuccess("Flag rejected");
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
      title="Reject GPS Flag"
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
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#D65A57] px-4 font-sans text-[11px] font-[590] uppercase text-white disabled:opacity-50"
          >
            Reject Flag
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Flag"
          value=""
          readOnly
          placeholder={flagSummary(flag) || "Select a flag"}
        />
        <div>
          <FieldLabel>Reason for Rejection</FieldLabel>
          <ChipToggle
            value={reason}
            onChange={setReason}
            options={[
              {
                value: "INSUFFICIENT_EXPLANATION",
                label: "Insufficient Explanation",
              },
              { value: "POLICY_VIOLATION", label: "Policy Violation" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </div>
        <DashboardTextAreaField
          label="Notes to Technician"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Explain what additional information or correction is needed."
        />
      </div>
    </DashboardModal>
  );
}
