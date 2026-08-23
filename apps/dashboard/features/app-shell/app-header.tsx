"use client";

import * as React from "react";
import {
  sessionDisplayName,
  sessionRoleLabel,
  useSession,
} from "./session-context";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppHeader({
  title,
  menuOpen: mobileMenuOpen = false,
  onMenuClick,
}: {
  title: string;
  menuOpen?: boolean;
  onMenuClick?: () => void;
}) {
  const { user, logout } = useSession();
  const name = sessionDisplayName(user);
  const role = sessionRoleLabel(user?.role);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!userMenuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setUserMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header className="divider-edge-bottom sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 bg-shell-header px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
        <h1 className="min-w-0 truncate font-sans text-[13px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[16px]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#2A2A2A] transition-colors hover:bg-[#333333]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/notification-icon.png"
            alt=""
            className="h-9 w-9 object-cover"
          />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-lg px-0.5 py-0.5 transition-colors hover:bg-white/[0.03] sm:gap-2.5 sm:px-1"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#2A2A2A] font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {initials(name)}
            </div>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="max-w-[140px] truncate font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:max-w-[180px]">
                {name}
              </p>
              <p className="mt-1 max-w-[140px] truncate font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:max-w-[180px]">
                {role || user?.email}
              </p>
            </div>
            <ChevronDownIcon
              className={`hidden shrink-0 text-[#FDFDFF] transition-transform sm:block ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[min(160px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-divider bg-[#1A1A1A] py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex w-full px-3 py-2.5 text-left font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/[0.06]"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
