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
  { path: "/crm/accounts/new", breadcrumb: "Accounts / Customers / Add Customer", pageTitle: null },
  { path: "/crm/contacts/new", breadcrumb: "Accounts / Contacts / Add Contact", pageTitle: null },
  {
    path: "/crm/requirements/new",
    breadcrumb: "Configuration / Customer Requirements / Add Requirement",
    pageTitle: null,
  },
  {
    path: "/crm/pricing-rules/new",
    breadcrumb: "Configuration / Pricing Rules / Add Pricing Rule",
    pageTitle: null,
  },
  {
    path: "/crm/form-rules/new",
    breadcrumb: "Configuration / Form Rules / Add Form Rule",
    pageTitle: null,
  },
  {
    path: "/crm/route-rules/new",
    breadcrumb: "Configuration / Route / GPS Rules / Add Route Rule",
    pageTitle: null,
  },
  {
    path: "/crm/locations/new",
    breadcrumb: "Accounts / Locations / Add Location",
    pageTitle: null,
  },
  { path: "/crm/accounts", breadcrumb: "Accounts / Customers", pageTitle: "Customers" },
  { path: "/crm/contacts", breadcrumb: "Accounts / Contacts", pageTitle: "Contacts" },
  {
    path: "/crm/requirements",
    breadcrumb: "Configuration / Customer Requirements",
    pageTitle: "Customer Requirements",
  },
  {
    path: "/crm/pricing-rules",
    breadcrumb: "Configuration / Pricing Rules",
    pageTitle: "Pricing Rules",
  },
  {
    path: "/crm/form-rules",
    breadcrumb: "Configuration / Form Rules",
    pageTitle: "Form Rules",
  },
  {
    path: "/crm/route-rules",
    breadcrumb: "Configuration / Route / GPS Rules",
    pageTitle: "Route / GPS Rules",
  },
  {
    path: "/crm/netsuite-customer-mapping",
    breadcrumb: "CRM / Customer / NetSuite Customer Mapping",
    pageTitle: "NetSuite Customer Mapping",
  },
  {
    path: "/crm/netsuite-item-mapping",
    breadcrumb: "Configuration / NetSuite Item Mapping",
    pageTitle: "NetSuite Item Mapping",
  },
  {
    path: "/crm/item-rate-mapping",
    breadcrumb: "Configuration / Item Rate Mapping",
    pageTitle: "Item Rate Mapping",
  },
  {
    path: "/crm/locations",
    breadcrumb: "Accounts / Locations / Wells",
    pageTitle: "Customer Sites",
  },
  { path: "/crm/eod-reports", breadcrumb: "Sales / EOD Reports", pageTitle: "EOD Reports" },
  {
    path: "/crm/quotes/new",
    breadcrumb: "Sales / Quotes / Create Quote",
    pageTitle: null,
  },
  { path: "/crm/quotes", breadcrumb: "Sales / Quotes", pageTitle: "Quotes" },
  {
    path: "/crm/sales/new",
    breadcrumb: "Accounts / Customers / Log Activity",
    pageTitle: null,
  },
  { path: "/crm/sales", breadcrumb: "Sales / Sales Activity", pageTitle: "Sales Activity" },
  {
    path: "/crm/sales-calendar",
    breadcrumb: "Sales / Sales Calendar",
    pageTitle: "Sales Calendar",
  },
  {
    path: "/crm/sales-summary",
    breadcrumb: "Sales / Manager Sales Summary",
    pageTitle: "Manager Sales Summary",
  },
  { path: "/crm", breadcrumb: "CRM / Customer / Dashboard", pageTitle: null },
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
    return { breadcrumb: "Accounts / Customers / Edit Customer", pageTitle: null };
  }
  if (/^\/crm\/locations\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Accounts / Locations / Wells / Edit Location", pageTitle: null };
  }
  if (/^\/crm\/pricing-rules\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Configuration / Pricing Rules / Edit Pricing Rule", pageTitle: null };
  }
  if (/^\/crm\/requirements\/[^/]+\/edit$/.test(pathname)) {
    return {
      breadcrumb: "Configuration / Customer Requirements / Edit Requirement",
      pageTitle: null,
    };
  }
  if (/^\/crm\/form-rules\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Configuration / Form Rules / Edit Form Rule", pageTitle: null };
  }
  if (/^\/crm\/route-rules\/[^/]+\/edit$/.test(pathname)) {
    return {
      breadcrumb: "Configuration / Route / GPS Rules / Edit Route Rule",
      pageTitle: null,
    };
  }
  if (/^\/crm\/quotes\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes / Edit Quote", pageTitle: null };
  }
  if (/^\/crm\/sales\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Sales / Sales Activity / Edit Activity", pageTitle: null };
  }
  if (/^\/crm\/contacts\/[^/]+\/edit$/.test(pathname)) {
    return { breadcrumb: "Accounts / Contacts / Edit Contact", pageTitle: null };
  }

  // Expenses (customer-scoped) — before generic account detail match
  if (/^\/crm\/accounts\/[^/]+\/expenses\/new$/.test(pathname)) {
    return {
      breadcrumb: "Accounts / Customers / Expenses / Add Expense",
      pageTitle: "Expenses",
    };
  }
  if (/^\/crm\/accounts\/[^/]+\/expenses\/[^/]+$/.test(pathname)) {
    return {
      breadcrumb: "Accounts / Customers / Expenses / Edit Expense",
      pageTitle: "Expenses",
    };
  }
  if (/^\/crm\/accounts\/[^/]+\/expenses$/.test(pathname)) {
    return {
      breadcrumb: "Accounts / Customers / Expenses",
      pageTitle: "Expenses",
    };
  }
  if (/^\/crm\/accounts\/[^/]+\/card-reconciliation$/.test(pathname)) {
    return {
      breadcrumb: "Accounts / Customers / Card Reconciliation",
      pageTitle: "Card Reconciliation",
    };
  }

  // Detail routes — breadcrumb only; actions live in row 2 via context
  if (/^\/crm\/accounts\/[^/]+$/.test(pathname) && pathname !== "/crm/accounts/new") {
    return { breadcrumb: "Accounts / Customers / Detail", pageTitle: null };
  }
  if (/^\/crm\/eod-reports\/[^/]+$/.test(pathname)) {
    return { breadcrumb: "Sales / EOD Reports / Detail", pageTitle: null };
  }
  if (/^\/crm\/quotes\/[^/]+\/preview$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes / Preview", pageTitle: null };
  }
  if (/^\/crm\/quotes\/[^/]+$/.test(pathname)) {
    return { breadcrumb: "Sales / Quotes / Detail", pageTitle: null };
  }
  if (/^\/crm\/sales\/[^/]+$/.test(pathname) && pathname !== "/crm/sales/new") {
    return { breadcrumb: "Sales / Sales Activity / Detail", pageTitle: null };
  }
  if (/^\/crm\/contacts\/[^/]+$/.test(pathname) && pathname !== "/crm/contacts/new") {
    return { breadcrumb: "Accounts / Contacts / Detail", pageTitle: null };
  }
  if (
    /^\/crm\/locations\/[^/]+$/.test(pathname) &&
    pathname !== "/crm/locations/new"
  ) {
    return { breadcrumb: "Accounts / Locations / Wells", pageTitle: null };
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
  const { actionsOverride, breadcrumbOverride, pageTitleOverride } =
    useHeaderActionsSlot();
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
  const pageTitle = pageTitleOverride ?? meta.pageTitle;
  const actions =
    actionsOverride !== undefined
      ? actionsOverride
      : staticHeaderActions(pathname);
  const hasPageToolbar = Boolean(pageTitle) || Boolean(actions);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-shell p-6">
        <BrandLoader label="Redirecting" />
      </div>
    );
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
          <AppPageToolbar pageTitle={pageTitle} actions={actions} />
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
