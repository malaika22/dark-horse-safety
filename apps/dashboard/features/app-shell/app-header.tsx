"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Fragment } from "react";
import Link from "next/link";
import {
  cn,
  DashboardModal,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import {
  sessionDisplayName,
  sessionRoleLabel,
  useSession,
} from "./session-context";

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

function ChevronDownIcon({ className }: { className?: string }) {
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
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function BreadcrumbTrail({ breadcrumb }: { breadcrumb: string }) {
  const parts = breadcrumb
    .split(/\s*(?:>|\/)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className="min-w-0 truncate font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
      {parts.map((part, i) => (
        <Fragment key={`${part}-${i}`}>
          {i > 0 ? <span className="text-[#FDFDFF]"> / </span> : null}
          <span className="text-[#FDFDFF]">{part}</span>
        </Fragment>
      ))}
    </p>
  );
}

type NotificationItem = { id: string; title: string; href: string };

function HeaderNotifications() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.dashboardNotifications();
        if (cancelled) return;
        setCount(res.data.count ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openNotifications() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await crmApi.dashboardNotifications();
      setItems(res.data.items ?? []);
      setCount(res.data.count ?? 0);
    } catch (err) {
      toastApiError(err);
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => void openNotifications()}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF] transition-colors hover:bg-[#353535]"
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FFBBCA]" />
        ) : null}
      </button>

      <DashboardModal
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        widthClassName="max-w-lg"
        footer={
          <DashboardToolbarButton onClick={() => setOpen(false)}>
            Close
          </DashboardToolbarButton>
        }
      >
        {loading ? (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="font-sans text-[12px] uppercase text-[#959597]">
            No notifications
          </p>
        ) : (
          <ul className="max-h-[360px] space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:border-[#5A5A5A]"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardModal>
    </>
  );
}

function HeaderUserMenu() {
  const { user, logout } = useSession();
  const name = sessionDisplayName(user);
  const role = sessionRoleLabel(user?.role);
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[200px] items-center gap-2.5 rounded-lg py-1 pl-0.5 pr-1 text-left transition-colors hover:bg-white/[0.05] sm:max-w-[240px]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#2A2A2A] font-sans text-[10px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {initials(name)}
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
            {name}
          </p>
          {role ? (
            <p className="mt-1 truncate font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
              {role}
            </p>
          ) : null}
        </div>
        <ChevronDownIcon className="hidden shrink-0 text-[#959597] sm:block" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] overflow-hidden rounded-lg border border-divider bg-[#1A1A1A] py-1 shadow-lg"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full px-3 py-2.5 text-left font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/[0.06]"
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full px-3 py-2.5 text-left font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/[0.06]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sticky chrome only — breadcrumb · bell · profile.
 * Page title + actions render in the body via AppPageToolbar.
 */
export function AppHeader({
  breadcrumb,
  menuOpen: mobileMenuOpen = false,
  onMenuClick,
  className,
}: {
  breadcrumb: string;
  menuOpen?: boolean;
  onMenuClick?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 shrink-0 bg-black",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-white/[0.05] lg:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          onClick={onMenuClick}
        >
          <span className="sr-only">Menu</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          {breadcrumb ? <BreadcrumbTrail breadcrumb={breadcrumb} /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <HeaderNotifications />
          <HeaderUserMenu />
        </div>
      </div>
      <div className="divider-line-full w-full" aria-hidden />
    </header>
  );
}

/**
 * Body-level title + actions row — same shell background as page content.
 */
export function AppPageToolbar({
  pageTitle,
  actions,
}: {
  pageTitle: string | null;
  actions?: ReactNode;
}) {
  if (!pageTitle && !actions) return null;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 bg-shell px-3 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
      {pageTitle ? (
        <h1 className="min-w-0 flex-1 font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          {pageTitle}
        </h1>
      ) : null}
      {pageTitle ? (
        actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null
      ) : (
        actions
      )}
    </div>
  );
}
