"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn, useScrollLock } from "@dark-horse-safety/ui";
import { APP_NAV } from "./nav";
import { AppHeader, AppPageToolbar } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { CRM_LIST_HEADER_ACTIONS } from "./crm-header-actions";
import {
  HeaderActionsProvider,
  useHeaderActionsSlot,
} from "./header-actions-context";
import { SessionProvider, useSession } from "./session-context";
import { BrandLoader } from "@/features/loading/brand-loader";

export type HeaderMeta = {
  breadcrumb: string;
  /** Null on detail pages — bottom row is actions-only. */
  pageTitle: string | null;
};

/** Figma app-header titles — longest prefix wins for nested `/new` routes. */
const HEADER_TITLES: { path: string; breadcrumb: string; pageTitle: string | null }[] = [
  { path: "/dashboard", breadcrumb: "Dashboard", pageTitle: null },
  { path: "/crm/accounts/new", breadcrumb: "CRM / Customers", pageTitle: "Add Customer" },
  { path: "/crm/contacts/new", breadcrumb: "CRM / Contacts", pageTitle: "Add Contact" },
  {
    path: "/crm/requirements/new",
    breadcrumb: "CRM / Customer Requests",
    pageTitle: "Add Requirement",
  },
  {
    path: "/crm/pricing-rules/new",
    breadcrumb: "CRM / Pricing Rules",
    pageTitle: "Add Pricing Rule",
  },
  {
    path: "/crm/form-rules/new",
    breadcrumb: "CRM / Form Rules",
    pageTitle: "Add Form Rule",
  },
  {
    path: "/crm/route-rules/new",
    breadcrumb: "CRM / Route / GPS Rules",
    pageTitle: "Add Route Rule",
  },
  {
    path: "/crm/locations/new",
    breadcrumb: "CRM / Locations / Wells",
    pageTitle: "Add Location",
  },
  { path: "/crm/accounts", breadcrumb: "CRM / Customer", pageTitle: "Customers" },
  { path: "/crm/contacts", breadcrumb: "CRM / Contacts", pageTitle: "Contacts" },
  {
    path: "/crm/requirements",
    breadcrumb: "CRM / Customer Requests",
    pageTitle: "Customer Requests",
  },
  {
    path: "/crm/pricing-rules",
    breadcrumb: "CRM / Pricing Rules",
    pageTitle: "Pricing Rules",
  },
  {
    path: "/crm/form-rules",
    breadcrumb: "CRM / Required Form Rules",
    pageTitle: "Required Form Rules",
  },
  {
    path: "/crm/route-rules",
    breadcrumb: "CRM / Route / GPS Rules",
    pageTitle: "Route / GPS Rules",
  },
  {
    path: "/crm/locations",
    breadcrumb: "CRM / Locations / Wells",
    pageTitle: "Customer Sites",
  },
  { path: "/crm/eod-reports", breadcrumb: "Sales / EOD Reports", pageTitle: "EOD Reports" },
  {
    path: "/crm/quotes/new",
    breadcrumb: "Sales / Quotes",
    pageTitle: "Create Quote",
  },
  { path: "/crm/quotes", breadcrumb: "Sales / Quotes", pageTitle: "Quotes" },
  { path: "/crm/sales/new", breadcrumb: "Sales / Sales Activity", pageTitle: "Log Activity" },
  { path: "/crm/sales", breadcrumb: "Sales / Sales Activity", pageTitle: "Sales Activity" },
  {
    path: "/crm/sales-calendar",
    breadcrumb: "Sales / Sales Calendar",
    pageTitle: "Sales Calendar",
  },
  {
    path: "/crm/sales-summary",
    breadcrumb: "Sales / Sales Summary",
    pageTitle: null,
  },
  { path: "/crm", breadcrumb: "CRM / CRM Dashboard", pageTitle: null },
  {
    path: "/crm/rep-dashboard",
    breadcrumb: "Sales / My Dashboard",
    pageTitle: null,
  },
  {
    path: "/hr/pay-cycle",
    breadcrumb: "Employees & HR",
    pageTitle: "Pay Cycle Setting",
  },
  {
    path: "/hr/payroll-export",
    breadcrumb: "Employees & HR",
    pageTitle: "Payroll Export",
  },
  {
    path: "/hr/payroll-review",
    breadcrumb: "Employees & HR",
    pageTitle: "Payroll Review",
  },
  {
    path: "/hr/supervisor-routing",
    breadcrumb: "Employees & HR",
    pageTitle: "Supervisor Routing",
  },
  {
    path: "/hr/training",
    breadcrumb: "Employees & HR",
    pageTitle: "Training / SSE",
  },
  {
    path: "/hr/time-entries",
    breadcrumb: "Employees & HR",
    pageTitle: "Time Entries",
  },
  { path: "/hr/time-off", breadcrumb: "Employees & HR", pageTitle: "Time Off" },
  { path: "/hr/employees", breadcrumb: "Employees & HR", pageTitle: "Employees" },
  { path: "/hr", breadcrumb: "Employees & HR", pageTitle: "HR Dashboard" },
  {
    path: "/fleet/calibration",
    breadcrumb: "Fleet & Assets",
    pageTitle: "Calibration",
  },
  { path: "/fleet/assets", breadcrumb: "Fleet & Assets", pageTitle: "Assets" },
  { path: "/fleet", breadcrumb: "Fleet & Assets", pageTitle: "Fleet Hub" },
  {
    path: "/operations/netsuite",
    breadcrumb: "Operations",
    pageTitle: "NetSuite Handoff",
  },
  {
    path: "/operations/purchase-orders",
    breadcrumb: "Operations",
    pageTitle: "Purchase Order",
  },
  {
    path: "/operations/billing",
    breadcrumb: "Operations",
    pageTitle: "Billing Reconciliation",
  },
  {
    path: "/operations/sales-tickets",
    breadcrumb: "Operations",
    pageTitle: "Sales Ticket",
  },
  {
    path: "/operations/work-orders/new",
    breadcrumb: "Operations / Work Order",
    pageTitle: "Create Work Order",
  },
  {
    path: "/operations/work-orders",
    breadcrumb: "Operations",
    pageTitle: "Work Order",
  },
  {
    path: "/operations/dispatch",
    breadcrumb: "Operations",
    pageTitle: "Dispatch Calender",
  },
  { path: "/operations", breadcrumb: "Operations", pageTitle: "Ops Dashboard" },
  {
    path: "/safety/certifications",
    breadcrumb: "Safety & Comp.",
    pageTitle: "Certifications",
  },
  {
    path: "/safety/incidents",
    breadcrumb: "Safety & Comp.",
    pageTitle: "Incidents",
  },
  { path: "/safety", breadcrumb: "Safety & Comp.", pageTitle: "Safety Hub" },
  {
    path: "/reports/payroll-ready",
    breadcrumb: "Report",
    pageTitle: "Payroll-Ready Report",
  },
  { path: "/reports", breadcrumb: "Report", pageTitle: "Reports Hub" },
  {
    path: "/settings/integrations",
    breadcrumb: "Setting",
    pageTitle: "Integrations",
  },
  { path: "/settings/users", breadcrumb: "Setting", pageTitle: "Users" },
  { path: "/settings", breadcrumb: "Setting", pageTitle: "Settings" },
];

function splitLegacyTitle(title: string): HeaderMeta {
  const parts = title
    .split(/\s*(?:>|\/)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { breadcrumb: title, pageTitle: title || null };
  }
  return {
    breadcrumb: parts.slice(0, -1).join(" / "),
    pageTitle: parts[parts.length - 1] ?? null,
  };
}

function headerMetaForPath(pathname: string): HeaderMeta {
  if (pathname === "/dashboard") {
    return { breadcrumb: "Dashboard", pageTitle: null };
  }

  // Edit routes — keep page title
  if (/^\/crm\/accounts\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Customers", pageTitle: "Edit Customer" };
  }
  if (/^\/crm\/locations\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Locations / Wells", pageTitle: "Edit Location" };
  }
  if (/^\/crm\/pricing-rules\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Pricing Rules", pageTitle: "Edit Pricing Rule" };
  }
  if (/^\/crm\/requirements\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Customer Requests", pageTitle: "Edit Requirement" };
  }
  if (/^\/crm\/form-rules\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Form Rules", pageTitle: "Edit Form Rule" };
  }
  if (/^\/crm\/route-rules\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Route / GPS Rules", pageTitle: "Edit Route Rule" };
  }
  if (/^\/crm\/quotes\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes", pageTitle: "Edit Quote" };
  }
  if (/^\/crm\/sales\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Sales / Sales Activity", pageTitle: "Edit Activity" };
  }
  if (/^\/crm\/contacts\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "CRM / Contacts", pageTitle: "Edit Contact" };
  }

  // Detail routes — breadcrumb only; actions live in row 2 via context
  if (/^\/crm\/accounts\/[^/]+$/.test(pathname) && pathname !== "/crm/accounts/new") {
    return { breadcrumb: "CRM / Customers / Detail", pageTitle: null };
  }
  if (/^\/crm\/eod-reports\/[^/]+$/.test(pathname)) {
    return { breadcrumb: "Sales / EOD Reports / Detail", pageTitle: null };
  }
  if (/^\/crm\/quotes\/[^/]+\/preview$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes", pageTitle: "Quote Preview" };
  }
  if (/^\/crm\/quotes\/[^/]+$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes / Detail", pageTitle: null };
  }
  if (/^\/crm\/sales\/[^/]+$/.test(pathname) && pathname !== "/crm/sales/new") {
    return { breadcrumb: "Sales / Sales Activity / Detail", pageTitle: null };
  }
  if (/^\/crm\/contacts\/[^/]+$/.test(pathname) && pathname !== "/crm/contacts/new") {
    return { breadcrumb: "CRM / Customer / Contacts", pageTitle: null };
  }
  if (
    /^\/operations\/work-orders\/[^/]+$/.test(pathname) &&
    pathname !== "/operations/work-orders/new"
  ) {
    return { breadcrumb: "Operations / Work Order / Detail", pageTitle: null };
  }

  const exact = HEADER_TITLES.find((entry) => entry.path === pathname);
  if (exact) {
    return { breadcrumb: exact.breadcrumb, pageTitle: exact.pageTitle };
  }

  const prefixed = [...HEADER_TITLES]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (entry) =>
        pathname === entry.path || pathname.startsWith(`${entry.path}/`),
    );
  if (prefixed) {
    return { breadcrumb: prefixed.breadcrumb, pageTitle: prefixed.pageTitle };
  }

  for (const item of APP_NAV) {
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return { breadcrumb: item.label, pageTitle: item.label };
    }
    for (const child of item.children ?? []) {
      if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
        const section = item.label.includes(" / ")
          ? item.label.split(" / ")[0]!
          : item.label;
        return { breadcrumb: `${section}`, pageTitle: child.label };
      }
    }
  }

  return splitLegacyTitle("Dark Horse Display");
}

function staticHeaderActions(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const Action = CRM_LIST_HEADER_ACTIONS[path];
  return Action ? <Action /> : null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useSession();
  const { actionsOverride, breadcrumbOverride } = useHeaderActionsSlot();
  const [mobileMenuPath, setMobileMenuPath] = React.useState<string | null>(null);
  const mobileOpen = mobileMenuPath === pathname;

  React.useEffect(() => {
    setMobileMenuPath(null);
  }, [pathname]);

  useScrollLock(mobileOpen);

  React.useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuPath(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const meta = headerMetaForPath(pathname);
  const breadcrumb = breadcrumbOverride ?? meta.breadcrumb;
  const actions =
    actionsOverride !== undefined
      ? actionsOverride
      : staticHeaderActions(pathname);
  const hasPageToolbar = Boolean(meta.pageTitle) || Boolean(actions);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-shell text-foreground">
      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileMenuPath(null)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          breadcrumb={breadcrumb}
          menuOpen={mobileOpen}
          onMenuClick={() =>
            setMobileMenuPath((prev) => (prev === pathname ? null : pathname))
          }
        />
        <main
          data-scroll-lock-root
          className={cn(
            "min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-shell scrollbar-hidden",
            // Title/actions own equal py — don't add extra page top padding under them
            hasPageToolbar && "[&>*:last-child]:!pt-0",
          )}
        >
          <AppPageToolbar pageTitle={meta.pageTitle} actions={actions} />
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeaderActionsProvider>
        <AppShellInner>{children}</AppShellInner>
      </HeaderActionsProvider>
    </SessionProvider>
  );
}
