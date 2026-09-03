"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardField,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  CONTACT_FORM,
  CRM_CUSTOMERS,
} from "./data/crm-forms.mock";

const textareaClass =
  "min-h-[80px] w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-normal tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

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
  const customerDefault = customerValueFromQuery(searchParams.get("customer"));

  return (
    <CrmFormPageShell
      cancelHref="/crm/contacts"
      submitLabel="Save"
      sections={[
        {
          title: "Details",
          content: (
            <div className="space-y-5">
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
                <DashboardField label="Notes">
                  <textarea
                    className={textareaClass}
                    defaultValue="Prefers morning calls. On-site Mon-Thu."
                    rows={3}
                  />
                </DashboardField>
              </DashboardFormGrid>
              <DashboardTextField
                label="Linked from Business Card Scan"
                defaultValue="Midland, TX"
                placeholder="Scan source"
              />
            </div>
          ),
        },
      ]}
    />
  );
}
