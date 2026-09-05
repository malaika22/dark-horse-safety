"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";

export type CrmFormSection = {
  title: string;
  content: React.ReactNode;
};

/**
 * Shared Add / Edit form shell — same layout as Add Customer:
 * ← Cancel · titled panels with divider · footer Cancel + optional extras + Save & Add Another + Save
 */
export function CrmFormPageShell({
  cancelHref,
  submitLabel = "Save",
  saveAndAddAnotherLabel = "Save & Add Another",
  extraFooterActions,
  sections,
  onSave,
  onSaveAndAddAnother,
  submitting = false,
}: {
  cancelHref: string;
  submitLabel?: string;
  saveAndAddAnotherLabel?: string;
  /** Extra footer buttons between Cancel and Save & Add Another (e.g. Link to Existing). */
  extraFooterActions?: React.ReactNode;
  sections: CrmFormSection[];
  onSave?: () => void | Promise<void>;
  onSaveAndAddAnother?: () => void | Promise<void>;
  submitting?: boolean;
}) {
  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <div>
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton
            leftIcon={<ArrowLeftIcon className="shrink-0" />}
          >
            Cancel
          </DashboardToolbarButton>
        </Link>
      </div>

      {sections.map((section) => (
        <DashboardPanel key={section.title} className="overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <DashboardPanelTitle icon="lightning" title={section.title} />
          </div>
          <div className="divider-line-full w-full" aria-hidden />
          <div className="p-4">{section.content}</div>
        </DashboardPanel>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        {extraFooterActions}
        <DashboardToolbarButton
          disabled={submitting}
          onClick={() => void onSaveAndAddAnother?.()}
        >
          {saveAndAddAnotherLabel}
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={submitting}
          onClick={() => void onSave?.()}
        >
          {submitting ? "Saving…" : submitLabel}
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
