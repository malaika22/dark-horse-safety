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
  FORM_RULE_FORM,
} from "./data/crm-forms.mock";

export function FormRuleFormPage() {
  const [outputs, setOutputs] = React.useState(["pdf", "locked"]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/form-rules"
      submitLabel="Add form rule"
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
                label="Form template"
                defaultValue="jsa"
                options={FORM_RULE_FORM.templates}
              />
              <DashboardSelectField
                label="Trigger"
                defaultValue="dispatch"
                options={FORM_RULE_FORM.triggers}
              />
              <DashboardSelectField
                label="Applies to"
                defaultValue="all"
                options={FORM_RULE_FORM.appliesTo}
              />
              <DashboardSelectField
                label="Version"
                defaultValue="v3"
                options={FORM_RULE_FORM.versions}
              />
              <DashboardSelectField
                label="Owner"
                defaultValue="r-crawford"
                options={CRM_OWNERS}
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Behavior",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Hard-gate"
                  defaultValue="yes"
                  options={FORM_RULE_FORM.hardGate}
                />
                <DashboardSelectField
                  label="Status"
                  defaultValue="active"
                  options={FORM_RULE_FORM.statuses}
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Output"
                options={FORM_RULE_FORM.outputs}
                value={outputs}
                onChange={setOutputs}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
