"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { APP_NAV } from "./nav";
import { ChevronIcon, NavIcon, SettingsGearIcon } from "./icons";
import { sessionDisplayName, sessionRoleLabel, useSession } from "./session-context";

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionOpen(pathname: string, item: (typeof APP_NAV)[number]) {
  if (item.href && isActivePath(pathname, item.href)) return true;
  return item.children?.some((child) => isActivePath(pathname, child.href)) ?? false;
}

function SidebarBrand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-4 lg:py-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Image
          src="/brand/logo.png"
          alt="Dark Horse Display"
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
          priority
        />
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
          Dark Horse Display
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-white/[0.05] lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Sidebar footer — avatar, name/role, settings shortcut + sign-out menu. */
function SidebarProfile() {
  const { user, logout } = useSession();
  const name = sessionDisplayName(user);
  const role = sessionRoleLabel(user?.role);
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
    <div
      ref={menuRef}
      className="divider-section-top relative mt-auto shrink-0 px-3 pb-3 pt-3"
    >
      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-3 right-3 z-50 overflow-hidden rounded-lg border border-divider bg-[#1A1A1A] py-1 shadow-lg"
        >
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

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 pl-0.5 pr-1 text-left transition-colors hover:bg-white/[0.05]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[10px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
              {name}
            </p>
            {role ? (
              <p className="mt-1 truncate font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
                {role}
              </p>
            ) : null}
          </div>
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/[0.05] hover:text-[#FDFDFF]"
        >
          <SettingsGearIcon />
        </Link>
      </div>
    </div>
  );
}

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const routeOpenIds = React.useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const item of APP_NAV) {
      if (item.children?.length) {
        next[item.id] = sectionOpen(pathname, item);
      }
    }
    return next;
  }, [pathname]);

  const [toggleOverrides, setToggleOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const [overridePath, setOverridePath] = React.useState(pathname);

  if (overridePath !== pathname) {
    setOverridePath(pathname);
    setToggleOverrides({});
  }

  const openIds = React.useMemo(
    () => ({ ...routeOpenIds, ...toggleOverrides }),
    [routeOpenIds, toggleOverrides],
  );

  const toggle = (id: string) => {
    setToggleOverrides((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? routeOpenIds[id] ?? false),
    }));
  };

  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 scrollbar-hidden">
      <ul className="flex flex-col gap-1">
        {APP_NAV.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const open = openIds[item.id] ?? false;
          const activeTop = !hasChildren && isActivePath(pathname, item.href);

          return (
            <li key={item.id}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-sans text-[14px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors md:text-[15px]",
                    open || sectionOpen(pathname, item)
                      ? "text-[#FDFDFF]"
                      : "text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]",
                  )}
                >
                  <NavIcon name={item.icon} className="shrink-0 opacity-90" />
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                    {item.label}
                  </span>
                  <ChevronIcon open={open} className="shrink-0 opacity-70" />
                </button>
              ) : (
                <Link
                  href={item.href ?? "/dashboard"}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-[14px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors md:text-[15px]",
                    activeTop
                      ? "bg-[#27272A] text-[#FDFDFF]"
                      : "text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]",
                  )}
                >
                  <NavIcon name={item.icon} className="shrink-0 opacity-90" />
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              )}

              {hasChildren && open ? (
                <ul className="relative ml-5 mt-1 space-y-0.5 border-l border-border-strong pl-3">
                  {item.children!.map((child) => {
                    const active = isActivePath(pathname, child.href);
                    return (
                      <li key={child.id}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "relative flex min-w-0 items-center rounded-md px-3 py-2 font-sans text-[13px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors md:text-[14px]",
                            active
                              ? "bg-gradient-to-r from-[#2f2f2f] to-[#1c1c1c] text-[#FDFDFF]"
                              : "text-[#959597] hover:text-[#FDFDFF]",
                          )}
                        >
                          {active ? (
                            <span className="absolute -left-[15px] h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                          <span className="truncate whitespace-nowrap">
                            {child.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      {/* Mobile drawer — must stay fixed overlay (divider-edge-right uses position:relative) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-divider bg-black transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <SidebarBrand onClose={onClose} />
        <SidebarNav onClose={onClose} />
        <SidebarProfile />
      </aside>

      {/* Desktop sidebar — in layout flow only from lg+ */}
      <aside className="divider-edge-right hidden h-full w-[260px] shrink-0 flex-col bg-black lg:flex">
        <SidebarBrand />
        <SidebarNav />
        <SidebarProfile />
      </aside>
    </>
  );
}
