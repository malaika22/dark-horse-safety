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
  LOCATION_FORM,
} from "./data/crm-forms.mock";

export function LocationFormPage() {
  const [requirements, setRequirements] = React.useState([
    "h2s",
    "jsa",
    "ptw",
  ]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/locations"
      submitLabel="Add location"
      sections={[
        {
          title: "Location details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Location / well name"
                defaultValue="Wolfcamp 12-4H"
                placeholder="Well name"
              />
              <DashboardSelectField
                label="Customer"
                defaultValue="pbe"
                options={CRM_CUSTOMERS}
              />
              <DashboardTextField
                label="County / state"
                defaultValue="Midland, TX"
                placeholder="City, ST"
              />
              <DashboardSelectField
                label="Well type"
                defaultValue="horizontal"
                options={LOCATION_FORM.wellTypes}
              />
              <DashboardTextField
                label="GPS latitude"
                defaultValue="31.9973"
                placeholder="0.0000"
              />
              <DashboardTextField
                label="GPS longitude"
                defaultValue="-102.0779"
                placeholder="0.0000"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Operations",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Route rule"
                  defaultValue="route-a"
                  options={LOCATION_FORM.routes}
                />
                <DashboardSelectField
                  label="Status"
                  defaultValue="active"
                  options={LOCATION_FORM.statuses}
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Requirements"
                options={LOCATION_FORM.requirements}
                value={requirements}
                onChange={setRequirements}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
