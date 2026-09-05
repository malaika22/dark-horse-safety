"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "@/features/crm/crm-form-page-shell";
import type { DashboardSelectOption } from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

const WO_CATEGORIES = [
  { value: "site-safety", label: "Site Safety" },
  { value: "h2s", label: "H2S Monitoring" },
  { value: "wireline", label: "Wireline" },
  { value: "standby", label: "Standby" },
];

const WO_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

export function WorkOrderFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") ?? "";
  const customerName = searchParams.get("customer") ?? "";
  const quoteId = searchParams.get("quoteId") ?? "";
  const workOrderId = searchParams.get("workOrderId") ?? "";

  const [customerOptions, setCustomerOptions] = React.useState<DashboardSelectOption[]>([]);
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [customer, setCustomer] = React.useState(customerIdParam);
  const [location, setLocation] = React.useState("");
  const [category, setCategory] = React.useState("site-safety");
  const [assignedRep, setAssignedRep] = React.useState("");
  const [serviceDate, setServiceDate] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [scheduledStart, setScheduledStart] = React.useState("");
  const [scheduledEnd, setScheduledEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [quoteNumber, setQuoteNumber] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [customers, reps] = await Promise.all([
          crmApi.lookupCustomers(customerName || undefined),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        const opts = customers.data.map((c) => ({
          value: c.id,
          label: c.name,
        }));
        if (customerIdParam && customerName && !opts.some((o) => o.value === customerIdParam)) {
          opts.unshift({ value: customerIdParam, label: customerName });
        }
        setCustomerOptions(opts);
        setRepOptions(
          reps.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
              r.email ||
              r.id,
          })),
        );
        if (!customerIdParam && opts[0] && !quoteId) {
          setCustomer((prev) => prev || opts[0]!.value);
        }
      } catch {
        /* keep empty options */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerIdParam, customerName, quoteId]);

  React.useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getQuote(quoteId);
        if (cancelled) return;
        const quote = res.data;
        setQuoteNumber(quote.quoteNumber ?? "");
        if (quote.customer?.id) {
          setCustomer(quote.customer.id);
          setCustomerOptions((prev) => {
            if (prev.some((o) => o.value === quote.customer!.id)) return prev;
            return [
              {
                value: quote.customer!.id,
                label: quote.customer!.name,
              },
              ...prev,
            ];
          });
        }
        const noteParts = [quote.terms, quote.notes].filter(Boolean);
        if (noteParts.length) {
          setNotes(noteParts.join("\n\n"));
        }
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  async function handleSave() {
    if (!customer) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId: customer,
        locationName: location || undefined,
        category: category || undefined,
        assignedRepId: assignedRep || undefined,
        serviceDate: serviceDate || undefined,
        status: status || undefined,
        scheduledStart: scheduledStart || undefined,
        scheduledEnd: scheduledEnd || undefined,
        notes: notes || undefined,
        quoteId: quoteId || undefined,
      };

      let woId: string | undefined;

      if (
        quoteId &&
        !workOrderId &&
        typeof crmApi.convertQuoteToWorkOrder === "function"
      ) {
        try {
          const converted = await crmApi.convertQuoteToWorkOrder(quoteId);
          woId = converted.data?.id;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err;
          }
        }
      }

      if (!woId) {
        const created = await crmApi.createWorkOrder(body);
        woId = created.data?.id;
      }

      toastSuccess("Work order created");
      if (woId) {
        router.push(`/operations/work-orders/${woId}`);
      } else {
        router.push("/operations/work-orders");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CrmFormPageShell
      cancelHref="/operations/work-orders"
      submitLabel="Create Work Order"
      submitting={submitting}
      onSave={handleSave}
      sections={[
        {
          title: "Work Order Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              {quoteId ? (
                <DashboardTextField
                  label="Source Quote"
                  value={quoteNumber || quoteId}
                  readOnly
                  containerClassName="md:col-span-2"
                />
              ) : null}
              <DashboardSelectField
                label="Customer *"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                options={customerOptions}
              />
              <DashboardTextField
                label="Location / Well"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
              />
              <DashboardSelectField
                label="Category *"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={WO_CATEGORIES}
              />
              <DashboardSelectField
                label="Assigned Rep *"
                value={assignedRep}
                onChange={(e) => setAssignedRep(e.target.value)}
                options={[{ value: "", label: "Select rep" }, ...repOptions]}
              />
              <DashboardTextField
                label="Service Date *"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
              <DashboardSelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={WO_STATUSES}
              />
              <DashboardTextField
                label="Scheduled Start"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                placeholder="Time"
              />
              <DashboardTextField
                label="Scheduled End"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                placeholder="Time"
              />
              <DashboardTextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
