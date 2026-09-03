"use client";

import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  CRM_CUSTOMERS,
  PRICING_FORM,
} from "./data/crm-forms.mock";

export function PricingRuleFormPage() {
  return (
    <CrmFormPageShell
      cancelHref="/crm/pricing-rules"
      submitLabel="Save"
      sections={[
        {
          title: "Rule Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer *"
                defaultValue="pbe"
                options={CRM_CUSTOMERS}
              />
              <DashboardSelectField
                label="Service / Item *"
                defaultValue="wireline"
                options={PRICING_FORM.services}
              />
              <DashboardSelectField
                label="Rate Type *"
                defaultValue="per-job"
                options={PRICING_FORM.rateTypes}
              />
              <DashboardTextField
                label="Rate *"
                defaultValue="$1,250"
                placeholder="$0.00"
              />
              <DashboardSelectField
                label="Unit of Measurement"
                defaultValue="job"
                options={PRICING_FORM.units}
              />
              <DashboardTextField
                label="Minimum Charge"
                defaultValue="$1,250"
                placeholder="$0.00"
              />
              <DashboardTextField
                label="Overtime Multiplier"
                defaultValue="1.5X"
                placeholder="1.0X"
              />
              <DashboardTextField
                label="Effective From *"
                defaultValue="09/01/2026"
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Effective To"
                defaultValue="12/31/2026"
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Notes/Justification *"
                defaultValue="Approved discounted rate for Q4 high-volume wireline logging contract, PE..."
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
