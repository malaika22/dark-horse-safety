"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { CONTACT_FORM, CRM_CUSTOMERS } from "./data/crm-forms.mock";
import { LinkToExistingContactModal } from "./link-to-existing-contact-modal";

function customerValueFromQuery(name: string | null) {
  if (!name) return "pbe";
  const match = CRM_CUSTOMERS.find(
    (c) => c.label.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.value ?? "pbe";
}

export function ContactFormPage() {
  const searchParams = useSearchParams();
  const [primaryContact, setPrimaryContact] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const customerDefault = customerValueFromQuery(searchParams.get("customer"));

  return (
    <>
      <CrmFormPageShell
        cancelHref="/crm/contacts"
        submitLabel="Save"
        extraFooterActions={
          <DashboardToolbarButton onClick={() => setLinkOpen(true)}>
            Link to Existing Contact
          </DashboardToolbarButton>
        }
        sections={[
          {
            title: "Details",
            content: (
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Full Name *"
                  defaultValue="James Whitfield"
                  placeholder="Full name"
                />
                <DashboardTextField
                  label="Role / Title"
                  defaultValue="Operations Manager"
                  placeholder="Role / title"
                />
                <DashboardTextField
                  label="Email *"
                  type="email"
                  defaultValue="jwhitfield@example.com"
                  placeholder="email@company.com"
                />
                <DashboardTextField
                  label="Mobile"
                  defaultValue="(432) 555-0178"
                  placeholder="(432) 555-0000"
                />
                <DashboardTextField
                  label="Office Phone"
                  defaultValue="(432) 555-0231"
                  placeholder="(432) 555-0000"
                />
                <DashboardSelectField
                  label="Preferred Contact Method"
                  defaultValue="email"
                  options={CONTACT_FORM.preferredMethods}
                />
                <DashboardSelectField
                  label="Customers *"
                  defaultValue={customerDefault}
                  options={CRM_CUSTOMERS}
                />
                <DashboardTextField
                  label="Role at Each Customer"
                  defaultValue="Site Supervisor"
                  placeholder="Role at customer"
                />
                <DashboardToggle
                  label="Primary Contact?"
                  checked={primaryContact}
                  onCheckedChange={setPrimaryContact}
                />
                <DashboardTextField
                  label="Notes"
                  defaultValue="Prefers morning calls. On-site Mon-Thu."
                  placeholder="Notes"
                />
                <DashboardTextField
                  label="Linked from Business Card Scan"
                  defaultValue="Midland, TX"
                  placeholder="Scan source"
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>
            ),
          },
        ]}
      />

      <LinkToExistingContactModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
      />
    </>
  );
}
