"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "@/features/crm/crm-form-page-shell";
import type { DashboardSelectOption } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";


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
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") ?? "";
  const customerName = searchParams.get("customer") ?? "";
  const [customerOptions, setCustomerOptions] = React.useState<DashboardSelectOption[]>([]);
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [customer, setCustomer] = React.useState(customerId);

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
        if (customerId && customerName && !opts.some((o) => o.value === customerId)) {
          opts.unshift({ value: customerId, label: customerName });
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
        if (!customer && opts[0]) setCustomer(opts[0].value);
      } catch {
        /* keep empty options */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, customerName, customer]);

  return (
    <CrmFormPageShell
      cancelHref="/operations/work-orders"
      submitLabel="Create Work Order"
      sections={[
        {
          title: "Work Order Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer *"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                options={customerOptions}
              />
              <DashboardTextField
                label="Location / Well"
                defaultValue=""
                placeholder="Location"
              />
              <DashboardSelectField
                label="Category *"
                defaultValue="site-safety"
                options={WO_CATEGORIES}
              />
              <DashboardSelectField
                label="Assigned Rep *"
                defaultValue=""
                options={repOptions}
              />
              <DashboardTextField
                label="Service Date *"
                defaultValue=""
                placeholder="MM/DD/YYYY"
              />
              <DashboardSelectField
                label="Status"
                defaultValue="draft"
                options={WO_STATUSES}
              />
              <DashboardTextField
                label="Scheduled Start"
                defaultValue=""
                placeholder="Time"
              />
              <DashboardTextField
                label="Scheduled End"
                defaultValue=""
                placeholder="Time"
              />
              <DashboardTextField
                label="Notes"
                defaultValue=""
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
