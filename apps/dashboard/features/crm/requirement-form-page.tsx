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
  REQUIREMENT_FORM,
} from "./data/crm-forms.mock";

export function RequirementFormPage() {
  const [docs, setDocs] = React.useState(["cert", "coi"]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/requirements"
      submitLabel="Add requirement"
      sections={[
        {
          title: "Requirement details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer"
                defaultValue="pbe"
                options={CRM_CUSTOMERS}
              />
              <DashboardSelectField
                label="Requirement"
                defaultValue="h2s"
                options={REQUIREMENT_FORM.requirements}
              />
              <DashboardSelectField
                label="Type"
                defaultValue="safety"
                options={REQUIREMENT_FORM.types}
              />
              <DashboardSelectField
                label="Owner"
                defaultValue="r-crawford"
                options={CRM_OWNERS}
              />
              <DashboardTextField
                label="Due date"
                type="date"
                defaultValue="2026-09-01"
              />
              <DashboardSelectField
                label="Review cycle"
                defaultValue="annual"
                options={REQUIREMENT_FORM.cycles}
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Tracking",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Status"
                  defaultValue="met"
                  options={REQUIREMENT_FORM.statuses}
                />
                <DashboardSelectField
                  label="Docs required"
                  defaultValue="yes"
                  options={REQUIREMENT_FORM.docsRequired}
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Documents"
                options={REQUIREMENT_FORM.documentChips}
                value={docs}
                onChange={setDocs}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
