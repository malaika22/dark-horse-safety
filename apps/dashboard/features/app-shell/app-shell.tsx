"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { APP_NAV } from "./nav";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SessionProvider, useSession } from "./session-context";

/** Figma app-header titles — longest prefix wins for nested `/new` routes. */
const HEADER_TITLES: { path: string; title: string }[] = [
  { path: "/dashboard", title: "Dashboard Overview" },
  { path: "/crm/accounts/new", title: "Add Customer" },
  { path: "/crm/contacts/new", title: "Add Contact" },
  { path: "/crm/requirements/new", title: "Add Requirement" },
  { path: "/crm/pricing-rules/new", title: "Add Pricing Rule" },
  { path: "/crm/form-rules/new", title: "Add Form Rule" },
  { path: "/crm/route-rules/new", title: "Add Route Rule" },
  { path: "/crm/locations/new", title: "Add Location" },
  { path: "/crm/accounts", title: "CRM / Customers" },
  { path: "/crm/contacts", title: "CRM / Contacts" },
  { path: "/crm/requirements", title: "CRM / Customer Requirements" },
  { path: "/crm/pricing-rules", title: "CRM / Pricing Rules" },
  { path: "/crm/form-rules", title: "CRM / Required Form Rules" },
  { path: "/crm/route-rules", title: "CRM / Route / GPS Rules" },
  { path: "/crm/locations", title: "CRM / Locations / Wells" },
  { path: "/crm/eod-reports", title: "CRM / EOD Reports" },
  { path: "/crm/sales", title: "CRM / Sales" },
  { path: "/crm/leads", title: "CRM / Leads" },
  { path: "/crm", title: "CRM / CRM Dashboard" },
];

function titleForPath(pathname: string) {
  if (/^\/crm\/accounts\/[^/]+\/edit$/.test(pathname)) return "Edit Customer";
  if (/^\/crm\/accounts\/[^/]+$/.test(pathname)) return "CRM / Customer";

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
          title={titleForPath(pathname)}
          menuOpen={mobileOpen}
          onMenuClick={() =>
            setMobileMenuPath((prev) => (prev === pathname ? null : pathname))
          }
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
