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

export function LogActivityFormPage() {
  const router = useRouter();
  const [subjects, setSubjects] = React.useState(["quote", "call"]);
  const [customerOptions, setCustomerOptions] = React.useState<DashboardSelectOption[]>([]);
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [repId, setRepId] = React.useState("");
  const [type, setType] = React.useState("CALL");
  const [duration, setDuration] = React.useState("30");
  const [outcome, setOutcome] = React.useState("Positive");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

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

  async function handleSave() {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createSalesActivity({
        customerId,
        repId: repId || undefined,
        type,
        subject: subjects.join(", ") || undefined,
        outcome,
        durationMinutes: Number(duration) || undefined,
        notes: notes || undefined,
        activityAt: new Date().toISOString(),
        status: "COMPLETE",
      });
      toastSuccess("Activity logged");
      router.push("/crm/sales");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/crm/sales" className="inline-flex shrink-0">
          <DashboardToolbarButton leftIcon={<ArrowLeftIcon className="shrink-0" />}>
            Cancel
          </DashboardToolbarButton>
        </Link>
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Log Activity
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
              defaultValue="call"
              options={TYPE_OPTIONS}
            />
            <DashboardTextField label="Date" defaultValue="Jun 12, 2026" />
            <DashboardSelectField
              label="Customer"
              defaultValue="pbe"
              options={customerOptions}
            />
            <DashboardTextField label="Contact" defaultValue="J. Whitfield" />
            <DashboardSelectField
              label="Rep"
              defaultValue="r-crawford"
              options={repOptions}
            />
            <DashboardSelectField
              label="Duration"
              defaultValue="15"
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
              defaultValue="positive"
              options={OUTCOME_OPTIONS}
            />
            <DashboardTextField
              label="Follow-up Date"
              defaultValue="Jun 15, 2026"
            />
          </DashboardFormGrid>
          <DashboardChoiceChips
            label="Subject"
            options={SUBJECT_CHIPS}
            value={subjects}
            onChange={setSubjects}
          />
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/crm/sales" className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton variant="primary" showChevron>
          Log Activity
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
