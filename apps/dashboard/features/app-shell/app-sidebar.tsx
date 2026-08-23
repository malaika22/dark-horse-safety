"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { APP_NAV } from "./nav";
import { ChevronIcon, NavIcon } from "./icons";

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionOpen(pathname: string, item: (typeof APP_NAV)[number]) {
  if (item.href && isActivePath(pathname, item.href)) return true;
  return item.children?.some((child) => isActivePath(pathname, child.href)) ?? false;
}

export function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
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
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          "divider-edge-right fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-black",
          "transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2.5 px-4 py-5">
          <Image
            src="/brand/logo.png"
            alt="Dark Horse Display"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            Dark Horse Display
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-hidden">
          <ul className="flex flex-col gap-1">
            {APP_NAV.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const open = openIds[item.id] ?? false;
              const activeTop =
                !hasChildren && isActivePath(pathname, item.href);

              return (
                <li key={item.id}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-sans text-[16px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors",
                        open || sectionOpen(pathname, item)
                          ? "text-[#FDFDFF]"
                          : "text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]",
                      )}
                    >
                      <NavIcon name={item.icon} className="shrink-0 opacity-90" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronIcon open={open} className="opacity-70" />
                    </button>
                  ) : (
                    <Link
                      href={item.href ?? "/dashboard"}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-[16px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors",
                        activeTop
                          ? "bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] text-[#FDFDFF]"
                          : "text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]",
                      )}
                    >
                      <NavIcon name={item.icon} className="shrink-0 opacity-90" />
                      <span>{item.label}</span>
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
                                "relative flex items-center rounded-md px-3 py-2 font-sans text-[16px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors",
                                active
                                  ? "bg-gradient-to-r from-[#2f2f2f] to-[#1c1c1c] text-[#FDFDFF]"
                                  : "text-[#959597] hover:text-[#FDFDFF]",
                              )}
                            >
                              {active ? (
                                <span className="absolute -left-[15px] h-1.5 w-1.5 rounded-full bg-white" />
                              ) : null}
                              {child.label}
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
      </aside>
    </>
  );
}
