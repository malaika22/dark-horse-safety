"use client";

import * as React from "react";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { CRM_CUSTOMERS, CUSTOMER_FORM } from "./data/crm-forms.mock";

export function CustomerFormPage({
  mode,
  customerId,
}: {
  mode: "create" | "edit";
  customerId?: string;
}) {
  void customerId;
  const [taxExempt, setTaxExempt] = React.useState(false);
  const [msaOnFile, setMsaOnFile] = React.useState(true);
  const [requiresPo, setRequiresPo] = React.useState(true);

  return (
    <CrmFormPageShell
      cancelHref="/crm/accounts"
      submitLabel="Save"
      sections={[
        {
          title: "Company Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer Name *"
                defaultValue="Permian Basin Energy"
                placeholder="Customer name"
              />
              <DashboardTextField
                label="Legal Entity Name"
                defaultValue="Permian Basin Energy Holdings LLC"
                placeholder="Legal entity name"
              />
              <DashboardTextField
                label="Customer ID"
                defaultValue="CUST-004821"
                placeholder="CUST-000000"
              />
              <DashboardSelectField
                label="Status *"
                defaultValue="active"
                options={CUSTOMER_FORM.statuses}
              />
              <DashboardTextField
                label="Assigned Rep *"
                defaultValue="Sarah Mitchell"
                placeholder="Assigned rep"
              />
              <DashboardSelectField
                label="Industry"
                defaultValue="oil-gas"
                options={CUSTOMER_FORM.industries}
              />
              <DashboardTextField
                label="Website"
                defaultValue="www.permianbasinenergy.com"
                placeholder="www.example.com"
              />
              <DashboardTextField
                label="Phone"
                defaultValue="(432) 555-0184"
                placeholder="(432) 555-0000"
              />
              <DashboardTextField
                label="Billing Address *"
                defaultValue="1200 W Wall St, Midland, TX 79701"
                placeholder="Billing address"
              />
              <DashboardTextField
                label="Mailing Address"
                defaultValue="PO Box 4821, Midland, TX 79702"
                placeholder="Mailing address"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Commercial",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Payment Terms *"
                defaultValue="net-60"
                options={CUSTOMER_FORM.paymentTerms}
              />
              <DashboardTextField
                label="Credit Limit"
                defaultValue="$50,000.00"
                placeholder="$0.00"
              />
              <DashboardToggle
                label="Tax Exempt?"
                checked={taxExempt}
                onCheckedChange={setTaxExempt}
              />
              <DashboardTextField
                label="Tax ID"
                defaultValue="82-3749201"
                placeholder="Tax ID"
              />
              <DashboardSelectField
                label="Default Pricing Tier"
                defaultValue="enterprise"
                options={CUSTOMER_FORM.pricingTiers}
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Integration",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="NetSuite Customer ID"
                defaultValue="NS-829471"
                placeholder="NS-000000"
              />
              <DashboardTextField
                label="ISN ID"
                defaultValue="ISN-40058723"
                placeholder="ISN-00000000"
              />
              <DashboardTextField
                label="Veriforce ID"
                defaultValue="VF-2039185"
                placeholder="VF-0000000"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Compliance",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardToggle
                label="MSA on File?"
                checked={msaOnFile}
                onCheckedChange={setMsaOnFile}
              />
              <DashboardTextField
                label="MSA Expiry"
                defaultValue="12/31/2026"
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="COI Expiry"
                defaultValue="03/15/2027"
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="W-9 on File"
                defaultValue="$125,000.00"
                placeholder="W-9 status"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Operational Defaults",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Default Clock In Radius"
                defaultValue="CUST-007394"
                placeholder="Radius"
              />
              <DashboardToggle
                label="Requires PO Before Invoice?"
                checked={requiresPo}
                onCheckedChange={setRequiresPo}
              />
              <DashboardTextField
                label="Default Required Forms"
                defaultValue="JSA, FLRA, TBT"
                placeholder="Forms"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
