"use client";

import type { ReactElement } from "react";
import * as React from "react";
import Link from "next/link";
import {
  DashboardModal,
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
        d="M13.73 21a2 2 0 0 1-3.46 0"
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

type NotificationItem = { id: string; title: string; href: string };

/** Figma CRM header trailing — last synced + bell + Run sync + add customer. */
export function CrmDashboardHeaderActions() {
  const [syncLabel, setSyncLabel] = React.useState(CRM_SYNC_LABEL_FALLBACK);
  const [syncing, setSyncing] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [notifCount, setNotifCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overview, notifs] = await Promise.all([
          crmApi.dashboardOverview(),
          crmApi.dashboardNotifications(),
        ]);
        if (cancelled) return;
        setSyncLabel(formatCrmSyncLabel(overview.data.syncedAt));
        setNotifCount(notifs.data.count ?? 0);
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

  async function openNotifications() {
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const res = await crmApi.dashboardNotifications();
      setNotifications(res.data.items ?? []);
      setNotifCount(res.data.count ?? 0);
    } catch (err) {
      toastApiError(err);
      setNotifications([]);
      setNotifCount(0);
    } finally {
      setNotifLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-3">
      <p className="hidden shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:block md:text-[12px]">
        {syncLabel}
      </p>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => void openNotifications()}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#959597] transition-colors hover:bg-[#353535] hover:text-[#FDFDFF]"
      >
        <BellIcon />
        {notifCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FFBBCA]" />
        ) : null}
      </button>
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

      <DashboardModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notifications"
        widthClassName="max-w-lg"
        footer={
          <DashboardToolbarButton onClick={() => setNotifOpen(false)}>
            Close
          </DashboardToolbarButton>
        }
      >
        {notifLoading ? (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            Loading…
          </p>
        ) : notifications.length === 0 ? (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            No notifications
          </p>
        ) : (
          <ul className="max-h-[360px] space-y-2 overflow-y-auto">
            {notifications.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setNotifOpen(false)}
                  className="block rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:border-[#5A5A5A]"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardModal>
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
  "/crm/quotes": CreateQuoteHeaderButton,
  "/crm/sales": LogActivityHeaderButton,
};
