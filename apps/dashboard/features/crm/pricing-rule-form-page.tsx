"use client";

import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  PRICING_FORM,
  PRICING_FORM_EDIT_DEFAULTS,
} from "./data/crm-forms.mock";

/**
 * Shared Add / Edit Pricing Rule screen — same UI for both modes.
 * Header title (Add vs Edit) comes from app-shell path.
 */
export function PricingRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  void ruleId;
  const isEdit = mode === "edit";
  const d = isEdit ? PRICING_FORM_EDIT_DEFAULTS : null;

  return (
    <CrmFormPageShell
      cancelHref="/crm/pricing-rules"
      submitLabel="Save"
      sections={[
        {
          title: "Rule Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer *"
                defaultValue={d?.customer}
                placeholder="Customer name"
              />
              <DashboardSelectField
                label="Service / Item *"
                defaultValue={d?.service ?? "wireline"}
                options={PRICING_FORM.services}
              />
              <DashboardSelectField
                label="Rate Type *"
                defaultValue={d?.rateType ?? "per-job"}
                options={PRICING_FORM.rateTypes}
              />
              <DashboardTextField
                label="Rate *"
                defaultValue={d?.rate}
                placeholder="$0.00"
              />
              <DashboardSelectField
                label="Unit of Measurement"
                defaultValue={d?.unit ?? "job"}
                options={PRICING_FORM.units}
              />
              <DashboardTextField
                label="Minimum Charge"
                defaultValue={d?.minimumCharge}
                placeholder="$0.00"
              />
              <DashboardTextField
                label="Overtime Multiplier"
                defaultValue={d?.overtimeMultiplier}
                placeholder="1.0X"
              />
              <DashboardTextField
                label="Effective From *"
                defaultValue={d?.effectiveFrom}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Effective To"
                defaultValue={d?.effectiveTo}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Notes/Justification *"
                defaultValue={d?.notes}
                placeholder="Notes"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
