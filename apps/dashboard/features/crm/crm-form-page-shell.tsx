"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { CrmSaveFailedState } from "@/features/crm/crm-states";

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
  topTrailing,
  showTopCancel = true,
  sections,
  onSave,
  onSaveAndAddAnother,
  submitting = false,
  saveError = null,
  onRetrySave,
  onDiscardSave,
}: {
  cancelHref: string;
  submitLabel?: string;
  saveAndAddAnotherLabel?: string;
  /** Extra footer buttons between Cancel and Save & Add Another (e.g. Link to Existing). */
  extraFooterActions?: React.ReactNode;
  /** Optional actions aligned top-right (e.g. Link to Existing Contact on Add Contact). */
  topTrailing?: React.ReactNode;
  /** When false, hides the top ← Cancel row (footer Cancel remains). */
  showTopCancel?: boolean;
  sections: CrmFormSection[];
  onSave?: () => void | Promise<void>;
  onSaveAndAddAnother?: () => void | Promise<void>;
  submitting?: boolean;
  /** When set, shows the shared Save Failed state above the form. */
  saveError?: string | null;
  onRetrySave?: () => void;
  onDiscardSave?: () => void;
}) {
  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      {showTopCancel || topTrailing ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showTopCancel ? (
            <Link href={cancelHref} className="inline-flex shrink-0">
              <DashboardToolbarButton
                leftIcon={<ArrowLeftIcon className="shrink-0" />}
              >
                Cancel
              </DashboardToolbarButton>
            </Link>
          ) : (
            <span />
          )}
          {topTrailing ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {topTrailing}
            </div>
          ) : null}
        </div>
      ) : null}

      {saveError ? (
        <CrmSaveFailedState
          onDiscard={onDiscardSave}
          onRetry={onRetrySave ?? (() => void onSave?.())}
        />
      ) : null}

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
        {onSaveAndAddAnother ? (
          <DashboardToolbarButton
            disabled={submitting}
            onClick={() => void onSaveAndAddAnother()}
          >
            {saveAndAddAnotherLabel}
          </DashboardToolbarButton>
        ) : null}
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
