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
  ROUTE_RULE_FORM,
  ROUTE_RULE_FORM_DEFAULTS,
} from "./data/crm-forms.mock";

/**
 * Shared Add / Edit Route Rule screen — same UI for both modes.
 * Header title (Add vs Edit) comes from app-shell path.
 */
export function RouteRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  void mode;
  void ruleId;
  const d = ROUTE_RULE_FORM_DEFAULTS;
  const [gpsRequired, setGpsRequired] = React.useState(d.gpsRequired);

  return (
    <CrmFormPageShell
      cancelHref="/crm/route-rules"
      submitLabel="Save"
      sections={[
        {
          title: "Rule Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer *"
                defaultValue={d.customer}
                placeholder="Customer name"
              />
              <DashboardSelectField
                label="Site *"
                defaultValue={d.site}
                options={ROUTE_RULE_FORM.locations}
              />
              <DashboardTextField
                label="Geofence Radius *"
                defaultValue={d.geofenceRadius}
                placeholder="500 FT"
              />
              <DashboardToggle
                label="GPS Required?"
                checked={gpsRequired}
                onCheckedChange={setGpsRequired}
              />
              <DashboardTextField
                label="Allowed Clock In Window"
                defaultValue={d.clockInWindow}
                placeholder="Clock in window"
              />
              <DashboardSelectField
                label="Route From"
                defaultValue={d.routeFrom}
                options={ROUTE_RULE_FORM.routesFrom}
              />
              <DashboardTextField
                label="Expected Travel Time"
                defaultValue={d.expectedTravelTime}
                placeholder="Travel time"
              />
              <DashboardTextField
                label="Mileage Rate Override"
                defaultValue={d.mileageRateOverride}
                placeholder="$0.00/Mi"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
