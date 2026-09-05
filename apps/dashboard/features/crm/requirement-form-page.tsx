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
  REQUIREMENT_FORM,
  REQUIREMENT_FORM_DEFAULTS,
} from "./data/crm-forms.mock";

/**
 * Shared Add / Edit Requirement screen — same UI for both modes.
 * Header title (Add vs Edit) comes from app-shell path.
 */
export function RequirementFormPage({
  mode = "create",
  requirementId,
}: {
  mode?: "create" | "edit";
  requirementId?: string;
}) {
  void requirementId;
  const d = REQUIREMENT_FORM_DEFAULTS;
  const [evidenceRequired, setEvidenceRequired] = React.useState(
    d.evidenceRequired,
  );

  return (
    <CrmFormPageShell
      cancelHref="/crm/requirements"
      submitLabel="Save"
      sections={[
        {
          title: "Requirement Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer *"
                defaultValue={d.customer}
                placeholder="Customer name"
              />
              <DashboardSelectField
                label="Requirement Type *"
                defaultValue={d.requirementType}
                options={REQUIREMENT_FORM.types}
              />
              <DashboardTextField
                label="Requirement *"
                defaultValue={d.requirement}
                placeholder="Requirement name"
              />
              <DashboardSelectField
                label="Applies To"
                defaultValue={d.appliesTo}
                options={REQUIREMENT_FORM.appliesTo}
              />
              <DashboardSelectField
                label="Enforcement Level *"
                defaultValue={d.enforcementLevel}
                options={REQUIREMENT_FORM.enforcementLevels}
              />
              <DashboardToggle
                label="Evidence Required?"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
              />
              <DashboardTextField
                label="Renewal Period"
                defaultValue={d.renewalPeriod}
                placeholder="Renewal period"
              />
              <DashboardTextField
                label="Notes"
                defaultValue={d.notes}
                placeholder="Notes"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
