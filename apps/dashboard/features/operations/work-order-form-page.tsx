"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "@/features/crm/crm-form-page-shell";
import {
  CRM_CUSTOMERS,
  CRM_OWNERS,
} from "@/features/crm/data/crm-forms.mock";

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

function customerValueFromQuery(name: string | null) {
  if (!name) return "pbe";
  const match = CRM_CUSTOMERS.find(
    (c) => c.label.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.value ?? "pbe";
}

export function WorkOrderFormPage() {
  const searchParams = useSearchParams();
  const customerDefault = customerValueFromQuery(searchParams.get("customer"));

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
                defaultValue={customerDefault}
                options={CRM_CUSTOMERS}
              />
              <DashboardTextField
                label="Location / Well"
                defaultValue="Wolfcamp 12-4H"
                placeholder="Location"
              />
              <DashboardSelectField
                label="Category *"
                defaultValue="site-safety"
                options={WO_CATEGORIES}
              />
              <DashboardSelectField
                label="Assigned Rep *"
                defaultValue="r-crawford"
                options={CRM_OWNERS}
              />
              <DashboardTextField
                label="Service Date *"
                defaultValue="06/12/2026"
                placeholder="MM/DD/YYYY"
              />
              <DashboardSelectField
                label="Status"
                defaultValue="draft"
                options={WO_STATUSES}
              />
              <DashboardTextField
                label="Scheduled Start"
                defaultValue="07:00A"
                placeholder="Time"
              />
              <DashboardTextField
                label="Scheduled End"
                defaultValue="05:00P"
                placeholder="Time"
              />
              <DashboardTextField
                label="Notes"
                defaultValue="Customer requested H2S package on site."
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
