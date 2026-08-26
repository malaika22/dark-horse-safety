"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { APP_NAV } from "./nav";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SessionProvider, useSession } from "./session-context";

function titleForPath(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard Overview";

  for (const item of APP_NAV) {
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return item.label;
    }
    for (const child of item.children ?? []) {
      if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
        // Section breadcrumb (e.g. "CRM / Customer") — matches Figma header
        return item.label;
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
