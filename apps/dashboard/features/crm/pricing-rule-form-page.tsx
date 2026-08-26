"use client";

import * as React from "react";
import {
  DashboardChoiceChips,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  CRM_CUSTOMERS,
  CRM_OWNERS,
  PRICING_FORM,
} from "./data/crm-forms.mock";

export function PricingRuleFormPage() {
  const [appliesTo, setAppliesTo] = React.useState(["all-jobs", "site-safety"]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/pricing-rules"
      submitLabel="Add pricing rule"
      sections={[
        {
          title: "Rule details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer"
                defaultValue="pbe"
                options={CRM_CUSTOMERS}
              />
              <DashboardSelectField
                label="Service / item"
                defaultValue="wireline"
                options={PRICING_FORM.services}
              />
              <DashboardTextField
                label="Rate"
                defaultValue="$1,250"
                placeholder="$0.00"
              />
              <DashboardTextField
                label="Unit"
                defaultValue="Per job"
                placeholder="Per job"
              />
              <DashboardTextField
                label="Effective date"
                type="date"
                defaultValue="2025-01-01"
              />
              <DashboardTextField
                label="Expires date"
                type="date"
                defaultValue="2026-12-31"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Rate",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Owner"
                  defaultValue="r-crawford"
                  options={CRM_OWNERS}
                />
                <DashboardSelectField
                  label="Status"
                  defaultValue="active"
                  options={PRICING_FORM.statuses}
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Applies to"
                options={PRICING_FORM.appliesTo}
                value={appliesTo}
                onChange={setAppliesTo}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
