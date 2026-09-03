"use client";

import Link from "next/link";
import {
  DashboardToolbarButton,
  SyncIcon,
} from "@dark-horse-safety/ui";
import { CRM_SYNC_LABEL } from "../crm/data/overview.mock";

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

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
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
          leftIcon={<UserPlusIcon className="shrink-0" />}
          className="!px-2.5 sm:!px-3"
        >
          <span className="hidden sm:inline">Add customer</span>
          <span className="sm:hidden">Add</span>
        </DashboardToolbarButton>
      </Link>
    </div>
  );
}

export function AddCustomerHeaderButton() {
  return (
    <Link href="/crm/accounts/new" className="inline-flex shrink-0">
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<UserPlusIcon className="shrink-0" />}
      >
        Add customer
      </DashboardToolbarButton>
    </Link>
  );
}

/** Customer detail header — sync + bell + add note + edit customer. */
export function CustomerDetailHeaderActions({
  customerId,
}: {
  customerId: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      <p className="hidden shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] sm:block md:text-[12px]">
        {CRM_SYNC_LABEL}
      </p>
      <button
        type="button"
        aria-label="Notifications"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#959597] transition-colors hover:bg-[#353535] hover:text-[#FDFDFF]"
      >
        <BellIcon />
      </button>
      <DashboardToolbarButton>Add note</DashboardToolbarButton>
      <Link
        href={`/crm/accounts/${customerId}/edit`}
        className="inline-flex shrink-0"
      >
        <DashboardToolbarButton variant="primary">
          Edit customer
        </DashboardToolbarButton>
      </Link>
    </div>
  );
}
