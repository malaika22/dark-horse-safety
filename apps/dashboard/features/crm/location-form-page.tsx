"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  CRM_CUSTOMERS,
  LOCATION_FORM,
} from "./data/crm-forms.mock";

function customerValueFromQuery(name: string | null) {
  if (!name) return "pbe";
  const match = CRM_CUSTOMERS.find(
    (c) => c.label.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.value ?? "pbe";
}

export function LocationFormPage() {
  const searchParams = useSearchParams();
  const [gpsRequired, setGpsRequired] = React.useState(false);
  const customerDefault = customerValueFromQuery(searchParams.get("customer"));

  return (
    <CrmFormPageShell
      cancelHref="/crm/locations"
      submitLabel="Save"
      sections={[
        {
          title: "Location Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Location Name *"
                defaultValue="Wolfcamp 12-4H"
                placeholder="Location name"
              />
              <DashboardTextField
                label="Well / Pad Number"
                defaultValue="WPC-1204"
                placeholder="WPC-0000"
              />
              <DashboardTextField
                label="API Number"
                defaultValue="42-329-35421"
                placeholder="API number"
              />
              <DashboardSelectField
                label="Customer *"
                defaultValue={customerDefault}
                options={CRM_CUSTOMERS}
              />
              <DashboardSelectField
                label="County *"
                defaultValue="midland"
                options={LOCATION_FORM.counties}
              />
              <DashboardSelectField
                label="State *"
                defaultValue="tx"
                options={LOCATION_FORM.states}
              />
              <DashboardTextField
                label="Coordinates *"
                defaultValue="31.8973, -102.0779"
                placeholder="Lat, Long"
              />
              <DashboardSelectField
                label="Site Type"
                defaultValue="well"
                options={LOCATION_FORM.siteTypes}
              />
              <DashboardSelectField
                label="Status"
                defaultValue="active"
                options={LOCATION_FORM.statuses}
              />
              <DashboardTextField
                label="Access Notes"
                defaultValue="Site damp by rain"
                placeholder="Access notes"
              />
              <DashboardSelectField
                label="Site Contact"
                defaultValue="active"
                options={LOCATION_FORM.siteContacts}
              />
              <DashboardTextField
                label="Geofence Radius"
                defaultValue="Gate code: 4521. Use south entrance."
                placeholder="Geofence radius"
              />
              <DashboardToggle
                label="GPS Required?"
                checked={gpsRequired}
                onCheckedChange={setGpsRequired}
              />
              <DashboardTextField
                label="Nearest Hospital"
                defaultValue="Midland Memorial Hospital"
                placeholder="Hospital name"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
