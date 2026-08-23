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
        return child.label;
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

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0c0c0c] text-xs font-semibold uppercase tracking-[0.1em] text-foreground-muted">
        Loading session…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0c0c0c] text-foreground">
      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileMenuPath(null)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={titleForPath(pathname)}
          onMenuClick={() => setMobileMenuPath(pathname)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden">
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
