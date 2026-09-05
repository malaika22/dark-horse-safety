"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { APP_NAV } from "./nav";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import {
  CRM_LIST_HEADER_ACTIONS,
} from "./crm-header-actions";
import { SessionProvider, useSession } from "./session-context";
import { CUSTOMERS_ROWS } from "../crm/data/customers.mock";
import { CUSTOMER_DETAIL } from "../crm/data/customer-detail.mock";
import { CONTACT_DETAIL } from "../crm/data/contacts.mock";

/** Figma app-header titles — longest prefix wins for nested `/new` routes. */
const HEADER_TITLES: { path: string; title: string }[] = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/crm/accounts/new", title: "CRM / Customers / Add Customer" },
  { path: "/crm/contacts/new", title: "Add Contact" },
  { path: "/crm/requirements/new", title: "CRM / Customer Reqs. / Add Requirement" },
  { path: "/crm/pricing-rules/new", title: "CRM / Pricing Rules / Add Pricing Rule" },
  { path: "/crm/form-rules/new", title: "CRM / Form Rules / Add Form Rule" },
  { path: "/crm/route-rules/new", title: "CRM / Route Rules / Add Route Rule" },
  { path: "/crm/locations/new", title: "CRM / Locations / Add Location" },
  { path: "/crm/accounts", title: "CRM / Customer" },
  { path: "/crm/contacts", title: "CRM / Contacts" },
  { path: "/crm/requirements", title: "CRM / Customer Reqs." },
  { path: "/crm/pricing-rules", title: "CRM / Pricing Rules" },
  { path: "/crm/form-rules", title: "CRM / Required Form Rules" },
  { path: "/crm/route-rules", title: "CRM / Route / GPS Rules" },
  { path: "/crm/locations", title: "CRM / Locations / Wells" },
  { path: "/crm/eod-reports", title: "CRM / EOD Reports" },
  { path: "/crm/quotes/new", title: "CRM / Customer / Create Quote" },
  { path: "/crm/quotes", title: "CRM / Customer / Quotes" },
  { path: "/crm/sales/new", title: "Log Activity" },
  { path: "/crm/sales", title: "CRM / Sales" },
  { path: "/crm/leads", title: "CRM / Leads" },
  { path: "/crm", title: "CRM/Customer > CRM Dashboard" },
  { path: "/hr/pay-cycle", title: "Employees & HR / Pay Cycle Setting" },
  { path: "/hr/payroll-export", title: "Employees & HR / Payroll Export" },
  { path: "/hr/payroll-review", title: "Employees & HR / Payroll Review" },
  { path: "/hr/supervisor-routing", title: "Employees & HR / Supervisor Routing" },
  { path: "/hr/training", title: "Employees & HR / Training / SSE" },
  { path: "/hr/time-entries", title: "Employees & HR / Time Entries" },
  { path: "/hr/time-off", title: "Employees & HR / Time Off" },
  { path: "/hr/employees", title: "Employees & HR / Employees" },
  { path: "/hr", title: "Employees & HR / HR Dashboard" },
  { path: "/fleet/calibration", title: "Fleet & Assets / Calibration" },
  { path: "/fleet/assets", title: "Fleet & Assets / Assets" },
  { path: "/fleet", title: "Fleet & Assets / Fleet Hub" },
  { path: "/operations/netsuite", title: "Operations / NetSuite Handoff" },
  { path: "/operations/purchase-orders", title: "Operations / Purchase Order" },
  { path: "/operations/billing", title: "Operations / Billing Reconciliation" },
  { path: "/operations/sales-tickets", title: "Operations / Sales Ticket" },
  { path: "/operations/work-orders/new", title: "Create Work Order" },
  { path: "/operations/work-orders", title: "Operations / Work Order" },
  { path: "/operations/dispatch", title: "Operations / Dispatch Calender" },
  { path: "/operations", title: "Operations / Ops Dashboard" },
  { path: "/safety/certifications", title: "Safety & Comp. / Certifications" },
  { path: "/safety/incidents", title: "Safety & Comp. / Incidents" },
  { path: "/safety", title: "Safety & Comp. / Safety Hub" },
  { path: "/reports/payroll-ready", title: "Report / Payroll-Ready Report" },
  { path: "/reports", title: "Report / Reports Hub" },
  { path: "/settings/integrations", title: "Setting / Integrations" },
  { path: "/settings/users", title: "Setting / Users" },
  { path: "/settings", title: "Setting / Settings" },
];

function titleForPath(pathname: string) {
  if (pathname === "/dashboard") return "";

  if (/^\/crm\/accounts\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Customers / Edit Customer";
  }
  if (/^\/crm\/locations\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Locations / Edit Location";
  }
  if (/^\/crm\/pricing-rules\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Pricing Rules / Edit Pricing Rule";
  }
  if (/^\/crm\/requirements\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Customer Reqs. / Edit Requirement";
  }
  if (/^\/crm\/form-rules\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Form Rules / Edit Form Rule";
  }
  if (/^\/crm\/route-rules\/[^/]+\/edit$/.test(pathname)) {
    return "CRM / Route Rules / Edit Route Rule";
  }
  if (/^\/crm\/accounts\/[^/]+$/.test(pathname)) {
    const id = pathname.split("/")[3] ?? "";
    const row = CUSTOMERS_ROWS.find((c) => c.id === id);
    const name = row?.name ?? CUSTOMER_DETAIL.name;
    return `CRM / Customers / ${name}`;
  }
  if (/^\/crm\/eod-reports\/[^/]+$/.test(pathname)) {
    return "CRM / Customer / EOD Report";
  }
  if (/^\/crm\/quotes\/[^/]+\/preview$/.test(pathname)) {
    return "Quote Preview";
  }
  if (/^\/crm\/quotes\/[^/]+$/.test(pathname)) {
    return "CRM / Customer / Quote";
  }
  if (/^\/crm\/sales\/[^/]+$/.test(pathname)) {
    return "CRM / Customer";
  }
  if (/^\/crm\/contacts\/[^/]+$/.test(pathname) && pathname !== "/crm/contacts/new") {
    return `CRM / Contacts / ${CONTACT_DETAIL.name}`;
  }

  const exact = HEADER_TITLES.find((entry) => entry.path === pathname);
  if (exact) return exact.title;

  // Nested paths (e.g. future detail routes) — match longest prefix
  const prefixed = [...HEADER_TITLES]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (entry) =>
        pathname === entry.path || pathname.startsWith(`${entry.path}/`),
    );
  if (prefixed) return prefixed.title;

  for (const item of APP_NAV) {
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return item.label;
    }
    for (const child of item.children ?? []) {
      if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
        const section = item.label.includes(" / ")
          ? item.label.split(" / ")[0]
          : item.label;
        return `${section} / ${child.label}`;
      }
    }
  }

  return "Dark Horse Display";
}

function headerTrailing(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  // Customer detail (/crm/accounts/[id]) — no top-right header actions.
  if (/^\/crm\/accounts\/[^/]+$/.test(path) && path !== "/crm/accounts/new") {
    return null;
  }
  const Action = CRM_LIST_HEADER_ACTIONS[path];
  return Action ? <Action /> : null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useSession();
  const [mobileMenuPath, setMobileMenuPath] = React.useState<string | null>(null);
  const mobileOpen = mobileMenuPath === pathname;

  React.useEffect(() => {
    setMobileMenuPath(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuPath(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-shell px-4 text-center text-xs font-semibold uppercase tracking-[0.1em] text-foreground-muted">
        Loading session…
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
          title={pathname === "/dashboard" ? "" : titleForPath(pathname)}
          menuOpen={mobileOpen}
          onMenuClick={() =>
            setMobileMenuPath((prev) => (prev === pathname ? null : pathname))
          }
          className={pathname === "/dashboard" ? "lg:hidden" : undefined}
          trailing={headerTrailing(pathname)}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShellInner>{children}</AppShellInner>
    </SessionProvider>
  );
}
