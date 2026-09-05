"use client";

import * as React from "react";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  FORM_RULE_FORM,
  FORM_RULE_FORM_DEFAULTS,
} from "./data/crm-forms.mock";

/**
 * Shared Add / Edit Form Rule screen — same UI for both modes.
 * Header title (Add vs Edit) comes from app-shell path.
 */
export function FormRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  void mode;
  void ruleId;
  const d = FORM_RULE_FORM_DEFAULTS;
  const [required, setRequired] = React.useState(d.required);
  const [hardgate, setHardgate] = React.useState(d.hardgate);
  const [blocksToggle, setBlocksToggle] = React.useState(d.blocksToggle);

  return (
    <CrmFormPageShell
      cancelHref="/crm/form-rules"
      submitLabel="Save"
      sections={[
        {
          title: "Rule Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Customer *"
                  defaultValue={d.customer}
                  placeholder="Customer name"
                />
                <DashboardSelectField
                  label="Job Type *"
                  defaultValue={d.jobType}
                  options={FORM_RULE_FORM.jobTypes}
                />
                <DashboardSelectField
                  label="Form Template *"
                  defaultValue={d.formTemplate}
                  options={FORM_RULE_FORM.templates}
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>

              <div className="space-y-3">
                <DashboardToggle
                  label="Required? *"
                  checked={required}
                  onCheckedChange={setRequired}
                />
                <DashboardToggle
                  label="Hardgate"
                  checked={hardgate}
                  onCheckedChange={setHardgate}
                />
                <DashboardToggle
                  label="Blocks Toggle?"
                  checked={blocksToggle}
                  onCheckedChange={setBlocksToggle}
                />
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Due"
                  defaultValue={d.due}
                  options={FORM_RULE_FORM.dueOptions}
                />
                <DashboardTextField
                  label="Applies From"
                  defaultValue={d.appliesFrom}
                  placeholder="MM/DD/YYYY"
                />
              </DashboardFormGrid>
            </div>
          ),
        },
      ]}
    />
  );
}
