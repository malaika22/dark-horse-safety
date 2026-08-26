"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DashboardChoiceChips,
  DashboardFormGrid,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import {
  CUSTOMER_DETAIL,
  CUSTOMER_FORM_OPTIONS,
} from "./data/customer-detail.mock";

export function CustomerFormPage({
  mode,
  customerId,
}: {
  mode: "create" | "edit";
  customerId?: string;
}) {
  const isEdit = mode === "edit";
  /** Figma Add Customer screen uses the sample filled values. */
  const seed = CUSTOMER_DETAIL;
  void customerId;
  void isEdit;

  const [requirements, setRequirements] = React.useState<string[]>([
    "msa",
    "coi",
    "w9",
    "safety",
  ]);

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      {/* Top — Cancel back control (Figma) */}
      <div>
        <Link href="/crm/accounts" className="inline-flex shrink-0">
          <DashboardToolbarButton
            leftIcon={<ArrowLeftIcon className="shrink-0" />}
          >
            Cancel
          </DashboardToolbarButton>
        </Link>
      </div>

      {/* Customer details */}
      <DashboardPanel>
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Customer details" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardTextField
              label="Company name"
              defaultValue={seed.name}
              placeholder="Company name"
            />
            <DashboardSelectField
              label="Industry"
              defaultValue="oil-gas"
              options={CUSTOMER_FORM_OPTIONS.industries}
            />
            <DashboardTextField
              label="Email"
              type="email"
              defaultValue={seed.email}
              placeholder="ap@customer.com"
            />
            <DashboardTextField
              label="Phone"
              defaultValue={seed.phone}
              placeholder="(432) 555-0000"
            />
            <DashboardSelectField
              label="Account owner"
              defaultValue="r-crawford"
              options={CUSTOMER_FORM_OPTIONS.owners}
            />
            <DashboardTextField
              label="Customer since"
              type="date"
              defaultValue={seed.customerSince}
            />
          </DashboardFormGrid>
        </div>
      </DashboardPanel>

      {/* Account & billing */}
      <DashboardPanel>
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Account & billing" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-5 p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Billing terms"
              defaultValue="net-30"
              options={CUSTOMER_FORM_OPTIONS.billingTerms}
            />
            <DashboardTextField
              label="Default rate"
              defaultValue="$0.00"
              placeholder="$0.00"
            />
          </DashboardFormGrid>
          <DashboardChoiceChips
            label="Requirements on file"
            options={CUSTOMER_FORM_OPTIONS.requirementChips}
            value={requirements}
            onChange={setRequirements}
          />
        </div>
      </DashboardPanel>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/crm/accounts" className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton variant="primary">
          {mode === "edit" ? "Save customer" : "Add customer"}
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
