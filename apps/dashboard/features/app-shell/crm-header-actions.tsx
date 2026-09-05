"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import {
  DashboardToolbarButton,
  SyncIcon,
} from "@dark-horse-safety/ui";
import { CRM_SYNC_LABEL } from "../crm/crm-constants";
import { AddUserIcon } from "../crm/crm-list-page-shell";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Shared Figma header CTA — white pill + person icon. */
function AddHeaderButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="inline-flex shrink-0">
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<AddUserIcon className="shrink-0" />}
        className="!rounded-full"
      >
        {label}
      </DashboardToolbarButton>
    </Link>
  );
}

/** Figma CRM header trailing — sync + bell + run sync + add customer. */
export function CrmDashboardHeaderActions() {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-3">
      <p className="hidden shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:block md:text-[12px]">
        {CRM_SYNC_LABEL}
      </p>
      <button
        type="button"
        aria-label="Notifications"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#959597] transition-colors hover:bg-[#353535] hover:text-[#FDFDFF]"
      >
        <BellIcon />
      </button>
      <DashboardToolbarButton
        leftIcon={<SyncIcon className="shrink-0" />}
        className="!px-2.5 sm:!px-3"
      >
        <span className="hidden sm:inline">Run sync</span>
        <span className="sm:hidden">Sync</span>
      </DashboardToolbarButton>
      <Link href="/crm/accounts/new" className="inline-flex shrink-0">
        <DashboardToolbarButton
          variant="primary"
          leftIcon={<AddUserIcon className="shrink-0" />}
          className="!rounded-full !px-2.5 sm:!px-3"
        >
          <span className="hidden sm:inline">Add customer</span>
          <span className="sm:hidden">Add</span>
        </DashboardToolbarButton>
      </Link>
    </div>
  );
}

export function AddCustomerHeaderButton() {
  return <AddHeaderButton href="/crm/accounts/new" label="Add customer" />;
}

export function AddContactHeaderButton() {
  return <AddHeaderButton href="/crm/contacts/new" label="Add Contact" />;
}

export function AddLocationHeaderButton() {
  return <AddHeaderButton href="/crm/locations/new" label="Add Location" />;
}

export function AddPricingRuleHeaderButton() {
  return (
    <AddHeaderButton href="/crm/pricing-rules/new" label="Add Pricing Rule" />
  );
}

export function AddRequirementHeaderButton() {
  return (
    <AddHeaderButton href="/crm/requirements/new" label="Add Requirement" />
  );
}

export function AddFormRuleHeaderButton() {
  return <AddHeaderButton href="/crm/form-rules/new" label="Add Form Rule" />;
}

export function AddRouteRuleHeaderButton() {
  return <AddHeaderButton href="/crm/route-rules/new" label="Add Route Rule" />;
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9.5 13.5l1.5 1.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 17.5l1.5 1.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma EOD list header — Create Work Order (clipboard + chevron). */
export function CreateWorkOrderHeaderButton() {
  return (
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<ClipboardCheckIcon className="shrink-0" />}
      showChevron
      className="!rounded-full"
    >
      Create Work Order
    </DashboardToolbarButton>
  );
}

/** Listing-page header CTAs keyed by exact path (no trailing slash). */
export const CRM_LIST_HEADER_ACTIONS: Record<string, () => ReactElement> = {
  "/crm": CrmDashboardHeaderActions,
  "/crm/accounts": AddCustomerHeaderButton,
  "/crm/contacts": AddContactHeaderButton,
  "/crm/locations": AddLocationHeaderButton,
  "/crm/pricing-rules": AddPricingRuleHeaderButton,
  "/crm/requirements": AddRequirementHeaderButton,
  "/crm/form-rules": AddFormRuleHeaderButton,
  "/crm/route-rules": AddRouteRuleHeaderButton,
  "/crm/eod-reports": CreateWorkOrderHeaderButton,
};
