"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToggle,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

type Attendee = { id: string; label: string; kind: "contact" | "user" };

function nowDateTimeLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(raw: string) {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toLocalFromIso(iso?: string | null) {
  if (!iso) return nowDateTimeLocal();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowDateTimeLocal();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function parseAttendees(raw: unknown): Attendee[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const row = a as Record<string, unknown>;
      const id = String(row.id ?? "");
      const label = String(row.label ?? "");
      if (!id || !label) return null;
      const kind = row.kind === "user" ? "user" : "contact";
      return { id, label, kind } as Attendee;
    })
    .filter((a): a is Attendee => Boolean(a));
}

/**
 * Log / Edit Sales Activity — Figma layout + live API.
 */
export function LogActivityFormPage({
  mode = "create",
  activityId,
}: {
  mode?: "create" | "edit";
  activityId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const { lookups } = useCrmLookups({ includeLocations: false });
  const typeOptions = lookupOptions(lookups, "salesActivityTypes");
  const durationOptions = lookupOptions(lookups, "activityDurations");
  const outcomeOptions = lookupOptions(lookups, "activityOutcomes");

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customerOptions, setCustomerOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [contactOptions, setContactOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [locationOptions, setLocationOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [quoteOptions, setQuoteOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [attendeePool, setAttendeePool] = React.useState<Attendee[]>([]);
  const [addingAttendee, setAddingAttendee] = React.useState(false);
  const [sitesLoading, setSitesLoading] = React.useState(false);

  const [type, setType] = React.useState("CALL");
  const [activityAt, setActivityAt] = React.useState(nowDateTimeLocal);
  const [duration, setDuration] = React.useState("15 min");
  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [contactId, setContactId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [attendees, setAttendees] = React.useState<Attendee[]>([]);
  const [outcome, setOutcome] = React.useState("Positive");
  const [notes, setNotes] = React.useState("");
  const [linkedQuoteId, setLinkedQuoteId] = React.useState("");
  const [createFollowUpTask, setCreateFollowUpTask] = React.useState(false);
  const [logExpense, setLogExpense] = React.useState(false);
  const skipContactClearRef = React.useRef(isEdit);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const customers = await crmApi.lookupCustomers();
        if (cancelled) return;
        setCustomerOptions(
          customers.data.map((c) => ({ value: c.id, label: c.name })),
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
        setActivityAt(toLocalFromIso(a.activityAt));
        setDuration(a.duration || "15 min");
        setCustomerId(a.customer?.id ?? "");
        setContactId(a.contact?.id ?? "");
        setLocationId(a.locationId ?? a.location?.id ?? "");
        setAttendees(parseAttendees(a.attendees));
        setOutcome(a.outcome || "Positive");
        setNotes(a.notes ?? "");
        setLinkedQuoteId(a.linkedQuoteId ?? a.linkedQuote?.id ?? "");
        setCreateFollowUpTask(Boolean(a.createFollowUpTask || a.followUpAt));
        setLogExpense(Boolean(a.logExpense));
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
      setLocationId("");
      setLinkedQuoteId("");
      setAttendees([]);
    } else {
      skipContactClearRef.current = false;
    }
    setContactOptions([]);
    setLocationOptions([]);
    setQuoteOptions([]);
    setAttendeePool([]);
    if (!customerId) return;

    setSitesLoading(true);
    (async () => {
      try {
        const [customer, locs, quotes, reps] = await Promise.all([
          crmApi.getCustomer(customerId),
          crmApi.lookupLocations(undefined, customerId),
          crmApi.listQuotes({
            customerId,
            pageSize: 50,
            sort: "createdAt",
            direction: "desc",
          }),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;

        const contacts = (customer.data.contacts ?? []).map((c) => ({
          value: c.id,
          label: c.fullName,
        }));
        setContactOptions(contacts);
        setLocationOptions(
          (locs.data ?? []).map((l) => ({
            value: l.id,
            label: l.name,
          })),
        );
        setQuoteOptions(
          (quotes.data.items ?? []).map((q) => ({
            value: q.id,
            label: `${q.quoteNumber} · ${money(Number(q.amount) || 0)}`,
          })),
        );

        const contactAttendees: Attendee[] = contacts.map((c) => ({
          id: c.value,
          label: c.label,
          kind: "contact",
        }));
        const userAttendees: Attendee[] = reps.data.map((r) => ({
          id: r.id,
          label:
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
            r.email ||
            r.id,
          kind: "user" as const,
        }));
        setAttendeePool([...contactAttendees, ...userAttendees]);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  function addAttendee(id: string) {
    const found = attendeePool.find((a) => a.id === id);
    if (!found) return;
    setAttendees((prev) =>
      prev.some((a) => a.id === id) ? prev : [...prev, found],
    );
    setAddingAttendee(false);
  }

  function removeAttendee(id: string) {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSave(addAnother = false) {
    if (!customerId || !type || !activityAt || !outcome.trim() || !notes.trim()) {
      toastValidationError("Activity type, date, customer, outcome, and notes are required");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        contactId: contactId || undefined,
        locationId: locationId || undefined,
        type,
        outcome: outcome.trim(),
        duration: duration || undefined,
        notes: notes.trim(),
        activityAt: toIsoFromLocal(activityAt),
        linkedQuoteId: linkedQuoteId || undefined,
        createFollowUpTask,
        logExpense,
        attendees: attendees.length ? attendees : [],
        status: "COMPLETE",
      };

      if (isEdit && activityId) {
        await crmApi.updateSalesActivity(activityId, body);
        toastSuccess("Activity updated");
        router.push(`/crm/sales/${activityId}`);
      } else {
        const created = await crmApi.createSalesActivity(body);
        toastSuccess("Activity logged");
        if (addAnother) {
          setType("CALL");
          setActivityAt(nowDateTimeLocal());
          setDuration("15 min");
          setContactId("");
          setLocationId("");
          setAttendees([]);
          setOutcome("Positive");
          setNotes("");
          setLinkedQuoteId("");
          setCreateFollowUpTask(false);
          setLogExpense(false);
          setAddingAttendee(false);
        } else if (logExpense && customerId) {
          const aid = created.data?.id;
          router.push(
            `/crm/accounts/${customerId}/expenses?new=1${aid ? `&activityId=${encodeURIComponent(aid)}` : ""}`,
          );
        } else {
          router.push("/crm/sales");
        }
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

  const cancelHref =
    isEdit && activityId ? `/crm/sales/${activityId}` : "/crm/sales";
  const availableAttendees = attendeePool.filter(
    (a) => !attendees.some((x) => x.id === a.id),
  );

  return (
    <CrmFormPageShell
      cancelHref={cancelHref}
      submitLabel="Save"
      saveAndAddAnotherLabel="Save & Add Another"
      submitting={submitting}
      onSave={() => handleSave(false)}
      onSaveAndAddAnother={isEdit ? undefined : () => handleSave(true)}
      sections={[
        {
          title: "Activity Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Activity Type *"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={typeOptions}
                  placeholder="Select type"
                  emptyMessage="No activity types found"
                />
                <DashboardTextField
                  label="Date & Time *"
                  type="datetime-local"
                  value={activityAt}
                  onChange={(e) => setActivityAt(e.target.value)}
                />
              </DashboardFormGrid>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <div className="space-y-1.5">
                  <DashboardSelectField
                    label="Duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    options={durationOptions}
                    placeholder="Select duration"
                    emptyMessage="No durations found"
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Options:{" "}
                    {durationOptions.length
                      ? durationOptions.map((o) => o.label).join(" · ")
                      : "15 min · 30 min · 45 min · 1 hr · 1.5 hr · 2 hr+"}
                    .
                  </p>
                </div>
                <DashboardSelectField
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customerOptions}
                  placeholder="Select customer"
                  emptyMessage="No customers found"
                />
              </DashboardFormGrid>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Contact"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  options={contactOptions}
                  placeholder={
                    customerId ? "Select contact" : "Select customer first"
                  }
                  emptyMessage="No contacts for this customer"
                />
                <div className="space-y-1.5">
                  <DashboardSelectField
                    label="Location"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    options={locationOptions}
                    loading={sitesLoading}
                    placeholder={
                      customerId ? "Select location" : "Select customer first"
                    }
                    emptyMessage="No locations for this customer"
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    This customer&apos;s locations only.
                  </p>
                </div>
              </DashboardFormGrid>

              <div className="space-y-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Attendees
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {attendees.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                      >
                        {a.label}
                        <button
                          type="button"
                          aria-label={`Remove ${a.label}`}
                          onClick={() => removeAttendee(a.id)}
                          className="text-[#959597] hover:text-[#FDFDFF]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAddingAttendee((v) => !v)}
                      disabled={!customerId}
                      className="inline-flex items-center rounded-md border border-dashed border-[#3E3E3E] px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF] disabled:opacity-40"
                    >
                      + Add attendee
                    </button>
                  </div>
                  {addingAttendee ? (
                    <div className="flex flex-wrap gap-2">
                      {availableAttendees.length ? (
                        availableAttendees.map((a) => (
                          <button
                            key={`${a.kind}-${a.id}`}
                            type="button"
                            onClick={() => addAttendee(a.id)}
                            className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5"
                          >
                            {a.label}
                            <span className="ml-1 text-[#6F6F72]">
                              · {a.kind === "user" ? "DH" : "Customer"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                          No more attendees available for this customer.
                        </p>
                      )}
                    </div>
                  ) : null}
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Shown for meetings. Add anyone from this customer or Dark
                    Horse who was present.
                  </p>
                </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Outcome *"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  options={outcomeOptions}
                  placeholder="Select outcome"
                  emptyMessage="No outcomes found"
                />
                <DashboardTextAreaField
                  label="Notes *"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="Discussed Q4 pricing…"
                  rows={4}
                />
              </DashboardFormGrid>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Linked Quote"
                  value={linkedQuoteId}
                  onChange={(e) => setLinkedQuoteId(e.target.value)}
                  options={quoteOptions}
                  placeholder={
                    customerId ? "Select quote" : "Select customer first"
                  }
                  emptyMessage="No quotes for this customer"
                />
                <DashboardToggle
                  label="Create Follow-up Task"
                  checked={createFollowUpTask}
                  onCheckedChange={setCreateFollowUpTask}
                />
              </DashboardFormGrid>

              <div className={cn("max-w-md")}>
                <DashboardToggle
                  label="Log Expense"
                  checked={logExpense}
                  onCheckedChange={setLogExpense}
                />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
