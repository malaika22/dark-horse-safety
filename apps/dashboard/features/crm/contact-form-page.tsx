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
  CONTACT_FORM,
  CRM_CUSTOMERS,
} from "./data/crm-forms.mock";

export function ContactFormPage() {
  const [channels, setChannels] = React.useState(["email", "sms", "call"]);

  return (
    <CrmFormPageShell
      cancelHref="/crm/contacts"
      submitLabel="Add contact"
      sections={[
        {
          title: "Contact details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Full name"
                  defaultValue="James Whitfield"
                  placeholder="Full name"
                />
                <DashboardSelectField
                  label="Role / title"
                  defaultValue="ops-mgr"
                  options={CONTACT_FORM.roles}
                />
                <DashboardTextField
                  label="Email"
                  type="email"
                  defaultValue="j.whitfield@pbe.com"
                  placeholder="email@company.com"
                />
                <DashboardTextField
                  label="Phone"
                  defaultValue="(432) 555-0101"
                  placeholder="(432) 555-0000"
                />
                <DashboardSelectField
                  label="Customer"
                  defaultValue="pbe"
                  options={CRM_CUSTOMERS}
                />
                <DashboardTextField
                  label="Location"
                  defaultValue="Midland, TX"
                  placeholder="City, ST"
                />
              </DashboardFormGrid>
              <DashboardChoiceChips
                label="Preferred channels"
                options={CONTACT_FORM.channels}
                value={channels}
                onChange={setChannels}
              />
            </div>
          ),
        },
        {
          title: "Other contacts",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Secondary name"
                defaultValue="Marcus Soto"
                placeholder="Name"
              />
              <DashboardTextField
                label="Secondary role"
                defaultValue="Field ops"
                placeholder="Role"
              />
              <DashboardTextField
                label="Secondary email"
                type="email"
                defaultValue="m.soto@westpad.com"
                placeholder="email@company.com"
              />
              <DashboardTextField
                label="Secondary phone"
                defaultValue="(432) 555-0190"
                placeholder="(432) 555-0000"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
