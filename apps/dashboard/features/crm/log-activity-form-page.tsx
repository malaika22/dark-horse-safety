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
  CRM_CUSTOMERS,
  CRM_OWNERS,
} from "./data/crm-forms.mock";
import { LOG_ACTIVITY_FORM } from "./data/sales-activity.mock";

export function LogActivityFormPage() {
  const [subjects, setSubjects] = React.useState(["quote", "call"]);

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/crm/sales" className="inline-flex shrink-0">
          <DashboardToolbarButton leftIcon={<ArrowLeftIcon className="shrink-0" />}>
            Cancel
          </DashboardToolbarButton>
        </Link>
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Log Activity
        </h1>
        <span className="w-[88px]" aria-hidden />
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Activity Details" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Type"
              defaultValue="call"
              options={LOG_ACTIVITY_FORM.types}
            />
            <DashboardTextField label="Date" defaultValue="Jun 12, 2026" />
            <DashboardSelectField
              label="Customer"
              defaultValue="pbe"
              options={CRM_CUSTOMERS}
            />
            <DashboardTextField label="Contact" defaultValue="J. Whitfield" />
            <DashboardSelectField
              label="Rep"
              defaultValue="r-crawford"
              options={CRM_OWNERS}
            />
            <DashboardSelectField
              label="Duration"
              defaultValue="15"
              options={LOG_ACTIVITY_FORM.durations}
            />
          </DashboardFormGrid>
        </div>
      </DashboardPanel>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Outcome & Follow-up" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-5 p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Outcome"
              defaultValue="positive"
              options={LOG_ACTIVITY_FORM.outcomes}
            />
            <DashboardTextField
              label="Follow-up Date"
              defaultValue="Jun 15, 2026"
            />
          </DashboardFormGrid>
          <DashboardChoiceChips
            label="Subject"
            options={LOG_ACTIVITY_FORM.subjects}
            value={subjects}
            onChange={setSubjects}
          />
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/crm/sales" className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton variant="primary" showChevron>
          Log Activity
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
