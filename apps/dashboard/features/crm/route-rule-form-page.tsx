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
  ROUTE_RULE_FORM,
} from "./data/crm-forms.mock";

export function RouteRuleFormPage() {
  const [alerts, setAlerts] = React.useState(["entry", "exit"]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/route-rules"
      submitLabel="Add route rule"
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
                label="Location / well"
                defaultValue="wolfcamp"
                options={ROUTE_RULE_FORM.locations}
              />
              <DashboardTextField
                label="Route"
                defaultValue="Route A"
                placeholder="Route name"
              />
              <DashboardSelectField
                label="Owner"
                defaultValue="r-crawford"
                options={CRM_OWNERS}
              />
              <DashboardSelectField
                label="Geofence"
                defaultValue="enabled"
                options={ROUTE_RULE_FORM.geofence}
              />
              <DashboardTextField
                label="Radius (ft)"
                defaultValue="500"
                placeholder="500"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Geofence",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="GPS required"
                  defaultValue="yes"
                  options={ROUTE_RULE_FORM.gpsRequired}
                />
                <DashboardSelectField
                  label="Status"
                  defaultValue="active"
                  options={ROUTE_RULE_FORM.statuses}
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Alerts"
                options={ROUTE_RULE_FORM.alerts}
                value={alerts}
                onChange={setAlerts}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
