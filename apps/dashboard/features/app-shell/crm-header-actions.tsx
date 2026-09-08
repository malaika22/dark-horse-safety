"use client";

import type { ReactElement } from "react";
import * as React from "react";
import Link from "next/link";
import {
  DashboardToolbarButton,
  SyncIcon,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  CRM_SYNC_LABEL_FALLBACK,
  formatCrmSyncLabel,
} from "../crm/crm-constants";
import { AddUserIcon } from "../crm/crm-list-page-shell";
import { SYNC_LABEL as DASHBOARD_SYNC_LABEL } from "../dashboard/data/overview.mock";

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

/** Figma CRM dashboard header trailing — last synced + Run sync + add customer. */
export function CrmDashboardHeaderActions() {
  const [syncLabel, setSyncLabel] = React.useState(CRM_SYNC_LABEL_FALLBACK);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const overview = await crmApi.dashboardOverview();
        if (cancelled) return;
        setSyncLabel(formatCrmSyncLabel(overview.data.syncedAt));
      } catch {
        /* keep fallback label */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDashboardSync() {
    setSyncing(true);
    try {
      const res = await crmApi.dashboardSync();
      setSyncLabel(formatCrmSyncLabel(res.data.syncedAt));
      toastSuccess(
        res.data.ok
          ? `Synced · ${formatCrmSyncLabel(res.data.syncedAt)}`
          : "Sync completed",
      );
    } catch (err) {
      toastApiError(err);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-3">
      <p className="hidden shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:block md:text-[12px]">
        {syncLabel}
      </p>
      <DashboardToolbarButton
        leftIcon={<SyncIcon className="shrink-0" />}
        className="!px-2.5 sm:!px-3"
        disabled={syncing}
        onClick={() => void handleDashboardSync()}
      >
        <span className="hidden sm:inline">
          {syncing ? "Syncing…" : "Run sync"}
        </span>
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

export function CreateQuoteHeaderButton() {
  return <AddHeaderButton href="/crm/quotes/new" label="Create Quote" />;
}

export function LogActivityHeaderButton() {
  return <AddHeaderButton href="/crm/sales/new" label="Log Activity" />;
}

/** Figma EOD list header — Create Work Order (clipboard + chevron). */
function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="m9 14 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreateWorkOrderHeaderButton() {
  return (
    <Link href="/operations/work-orders/new" className="inline-flex shrink-0">
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<ClipboardCheckIcon className="shrink-0" />}
        showChevron
        className="!rounded-full"
      >
        Create Work Order
      </DashboardToolbarButton>
    </Link>
  );
}

/** Main /dashboard header row-2 — last synced + Run sync + Generate payroll. */
export function DashboardHeaderActions() {
  const [syncLabel, setSyncLabel] = React.useState(DASHBOARD_SYNC_LABEL);
  const [syncing, setSyncing] = React.useState(false);

  async function handleRunSync() {
    setSyncing(true);
    try {
      const res = await crmApi.dashboardSync();
      setSyncLabel(formatCrmSyncLabel(res.data.syncedAt));
      toastSuccess(
        res.data.ok
          ? `Synced · ${formatCrmSyncLabel(res.data.syncedAt)}`
          : "Sync completed",
      );
    } catch (err) {
      toastApiError(err);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-3">
      <p className="hidden shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:block md:text-[12px]">
        {syncLabel}
      </p>
      <DashboardToolbarButton
        leftIcon={<SyncIcon className="shrink-0" />}
        className="!px-2.5 sm:!px-3"
        disabled={syncing}
        onClick={() => void handleRunSync()}
      >
        <span className="hidden sm:inline">
          {syncing ? "Syncing…" : "Run sync"}
        </span>
        <span className="sm:hidden">Sync</span>
      </DashboardToolbarButton>
      <Link href="/hr/payroll-export" className="inline-flex shrink-0">
        <DashboardToolbarButton variant="primary" className="!rounded-full">
          Generate payroll
        </DashboardToolbarButton>
      </Link>
    </div>
  );
}

/** Listing-page header CTAs keyed by exact path (no trailing slash). */
export const CRM_LIST_HEADER_ACTIONS: Record<string, () => ReactElement> = {
  "/dashboard": DashboardHeaderActions,
  "/crm/accounts": AddCustomerHeaderButton,
  "/crm/contacts": AddContactHeaderButton,
  "/crm/locations": AddLocationHeaderButton,
  "/crm/pricing-rules": AddPricingRuleHeaderButton,
  "/crm/requirements": AddRequirementHeaderButton,
  "/crm/form-rules": AddFormRuleHeaderButton,
  "/crm/route-rules": AddRouteRuleHeaderButton,
  "/crm/eod-reports": CreateWorkOrderHeaderButton,
  "/crm/quotes": CreateQuoteHeaderButton,
  "/crm/sales": LogActivityHeaderButton,
};
