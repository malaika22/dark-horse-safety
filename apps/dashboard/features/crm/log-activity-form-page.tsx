"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DashboardChoiceChips,
  DashboardFormGrid,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import type { DashboardSelectOption } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS: DashboardSelectOption[] = [
  { value: "CALL", label: "Call" },
  { value: "VISIT", label: "Visit" },
  { value: "MEETING", label: "Meeting" },
  { value: "EMAIL", label: "Email" },
];
const DURATION_OPTIONS: DashboardSelectOption[] = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "60 min" },
];
const OUTCOME_OPTIONS: DashboardSelectOption[] = [
  { value: "Positive", label: "Positive" },
  { value: "Neutral", label: "Neutral" },
  { value: "No Answer", label: "No Answer" },
];
const SUBJECT_CHIPS = [
  { id: "quote", label: "Quote" },
  { id: "call", label: "Call" },
  { id: "follow-up", label: "Follow-up" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseDurationMinutes(duration?: string | null) {
  if (!duration) return "30";
  const match = String(duration).match(/\d+/);
  return match?.[0] ?? "30";
}

function parseSubjectChips(subject?: string | null) {
  if (!subject?.trim()) return ["quote", "call"];
  const parts = subject.split(/[,/|]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ids = SUBJECT_CHIPS.map((c) => c.id);
  const matched = parts
    .map((p) => ids.find((id) => id === p || SUBJECT_CHIPS.find((c) => c.id === id)?.label.toLowerCase() === p))
    .filter((id): id is string => Boolean(id));
  return matched.length ? [...new Set(matched)] : ["quote", "call"];
}

/**
 * Shared Log / Edit Sales Activity screen — same UI for both modes.
 */
export function LogActivityFormPage({
  mode = "create",
  activityId,
}: {
  mode?: "create" | "edit";
  activityId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [subjects, setSubjects] = React.useState(["quote", "call"]);
  const [customerOptions, setCustomerOptions] = React.useState<DashboardSelectOption[]>([]);
  const [contactOptions, setContactOptions] = React.useState<DashboardSelectOption[]>([]);
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [contactId, setContactId] = React.useState("");
  const [repId, setRepId] = React.useState("");
  const [type, setType] = React.useState("CALL");
  const [activityDate, setActivityDate] = React.useState(todayInputValue);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [duration, setDuration] = React.useState("30");
  const [outcome, setOutcome] = React.useState("Positive");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const skipContactClearRef = React.useRef(isEdit);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [customers, reps] = await Promise.all([
          crmApi.lookupCustomers(),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        setCustomerOptions(customers.data.map((c) => ({ value: c.id, label: c.name })));
        setRepOptions(
          reps.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
              r.email ||
              r.id,
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !activityId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getSalesActivity(activityId);
        if (cancelled) return;
        const a = res.data;
        skipContactClearRef.current = true;
        setType(a.type || "CALL");
        setActivityDate(a.activityAt ? a.activityAt.slice(0, 10) : todayInputValue());
        setFollowUpDate(a.followUpAt ? a.followUpAt.slice(0, 10) : "");
        setDuration(parseDurationMinutes(a.duration));
        setOutcome(a.outcome || "Positive");
        setNotes(a.notes ?? "");
        setSubjects(parseSubjectChips(a.subject));
        setCustomerId(a.customer?.id ?? "");
        setContactId(a.contact?.id ?? "");
        setRepId(a.rep?.id ?? "");
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, activityId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!skipContactClearRef.current) {
      setContactId("");
    } else {
      skipContactClearRef.current = false;
    }
    setContactOptions([]);
    if (!customerId) return;
    (async () => {
      try {
        const res = await crmApi.getCustomer(customerId);
        if (cancelled) return;
        setContactOptions(
          (res.data.contacts ?? []).map((c) => ({
            value: c.id,
            label: c.fullName,
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function handleSave() {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const activityAt = activityDate
        ? new Date(`${activityDate}T12:00:00`).toISOString()
        : new Date().toISOString();
      const body = {
        customerId,
        contactId: contactId || undefined,
        repId: repId || undefined,
        type,
        subject: subjects.join(", ") || undefined,
        outcome,
        duration: `${duration} min`,
        notes: notes || undefined,
        activityAt,
        followUpAt: followUpDate
          ? new Date(`${followUpDate}T12:00:00`).toISOString()
          : undefined,
        status: "COMPLETE",
      };
      if (isEdit && activityId) {
        await crmApi.updateSalesActivity(activityId, body);
        toastSuccess("Activity updated");
        router.push(`/crm/sales/${activityId}`);
      } else {
        await crmApi.createSalesActivity(body);
        toastSuccess("Activity logged");
        router.push("/crm/sales");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading activity…
      </div>
    );
  }

  const cancelHref = isEdit && activityId ? `/crm/sales/${activityId}` : "/crm/sales";

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton leftIcon={<ArrowLeftIcon className="shrink-0" />}>
            Cancel
          </DashboardToolbarButton>
        </Link>
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          {isEdit ? "Edit Activity" : "Log Activity"}
        </h1>
        <span className="w-[88px]" aria-hidden />
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Activity Details" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={TYPE_OPTIONS}
            />
            <DashboardTextField
              label="Date"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
            <DashboardSelectField
              label="Customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={[{ value: "", label: "Select customer" }, ...customerOptions]}
            />
            <DashboardSelectField
              label="Contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              options={[{ value: "", label: "Optional" }, ...contactOptions]}
            />
            <DashboardSelectField
              label="Rep"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              options={[{ value: "", label: "Optional" }, ...repOptions]}
            />
            <DashboardSelectField
              label="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              options={DURATION_OPTIONS}
            />
          </DashboardFormGrid>
        </div>
      </DashboardPanel>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Outcome & Follow-up" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-5 p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              options={OUTCOME_OPTIONS}
            />
            <DashboardTextField
              label="Follow-up Date"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </DashboardFormGrid>
          <DashboardChoiceChips
            label="Subject"
            options={SUBJECT_CHIPS}
            value={subjects}
            onChange={setSubjects}
          />
          <DashboardTextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton
          variant="primary"
          showChevron
          disabled={submitting}
          onClick={() => void handleSave()}
        >
          {submitting
            ? "Saving…"
            : isEdit
              ? "Save Activity"
              : "Log Activity"}
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
