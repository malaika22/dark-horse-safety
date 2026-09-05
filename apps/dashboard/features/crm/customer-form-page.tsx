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
  CUSTOMER_FORM,
  CUSTOMER_FORM_EDIT_DEFAULTS,
} from "./data/crm-forms.mock";

/**
 * Shared Add / Edit Customer screen — same UI for both modes.
 * Header title (Add Customer vs Edit Customer) comes from app-shell path.
 */
export function CustomerFormPage({
  mode,
  customerId,
}: {
  mode: "create" | "edit";
  customerId?: string;
}) {
  void customerId;
  const isEdit = mode === "edit";
  const d = isEdit ? CUSTOMER_FORM_EDIT_DEFAULTS : null;

  const [taxExempt, setTaxExempt] = React.useState(d?.taxExempt ?? false);
  const [msaOnFile, setMsaOnFile] = React.useState(d?.msaOnFile ?? false);
  const [requiresPo, setRequiresPo] = React.useState(d?.requiresPo ?? false);

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
                defaultValue={d?.customerName}
                placeholder="Customer name"
              />
              <DashboardTextField
                label="Legal Entity Name"
                defaultValue={d?.legalEntityName}
                placeholder="Legal entity name"
              />
              <DashboardTextField
                label="Customer ID"
                defaultValue={d?.customerId}
                placeholder="CUST-000000"
              />
              <DashboardSelectField
                label="Status *"
                defaultValue={d?.status ?? "active"}
                options={CUSTOMER_FORM.statuses}
              />
              <DashboardSelectField
                label="Assigned Rep *"
                defaultValue={d?.assignedRep ?? "sarah-mitchell"}
                options={CUSTOMER_FORM.assignedReps}
              />
              <DashboardSelectField
                label="Industry"
                defaultValue={d?.industry ?? "oil-gas"}
                options={CUSTOMER_FORM.industries}
              />
              <DashboardTextField
                label="Website"
                defaultValue={d?.website}
                placeholder="www.example.com"
              />
              <DashboardTextField
                label="Phone"
                defaultValue={d?.phone}
                placeholder="(432) 555-0000"
              />
              <DashboardSelectField
                label="Billing Address *"
                defaultValue={d?.billingAddress ?? "midland-wall"}
                options={CUSTOMER_FORM.billingAddresses}
              />
              <DashboardTextField
                label="Mailing Address"
                defaultValue={d?.mailingAddress}
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
                defaultValue={d?.paymentTerms ?? "net-60"}
                options={CUSTOMER_FORM.paymentTerms}
              />
              <DashboardTextField
                label="Credit Limit"
                defaultValue={d?.creditLimit}
                placeholder="$0.00"
              />
              <DashboardToggle
                label="Tax Exempt?"
                checked={taxExempt}
                onCheckedChange={setTaxExempt}
              />
              <DashboardTextField
                label="Tax ID"
                defaultValue={d?.taxId}
                placeholder="Tax ID"
              />
              <DashboardSelectField
                label="Default Pricing Tier"
                defaultValue={d?.pricingTier ?? "enterprise"}
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
                defaultValue={d?.netsuiteId}
                placeholder="NS-000000"
              />
              <DashboardTextField
                label="ISN ID"
                defaultValue={d?.isnId}
                placeholder="ISN-00000000"
              />
              <DashboardTextField
                label="Veriforce ID"
                defaultValue={d?.veriforceId}
                placeholder="VF-0000000"
                containerClassName="md:col-span-2"
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
                defaultValue={d?.msaExpiry}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="COI Expiry"
                defaultValue={d?.coiExpiry}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="W-9 on File"
                defaultValue={d?.w9OnFile}
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
                defaultValue={d?.clockInRadius}
                placeholder="Radius"
              />
              <DashboardToggle
                label="Requires PO Before Invoice?"
                checked={requiresPo}
                onCheckedChange={setRequiresPo}
              />
              <DashboardTextField
                label="Default Required Forms"
                defaultValue={d?.requiredForms}
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
