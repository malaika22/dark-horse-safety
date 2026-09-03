"use client";

import type { ReactNode } from "react";
import { cn } from "@dark-horse-safety/ui";

function PageTitle({ title }: { title: string }) {
  const parts = title.split(/\s*>\s*/);
  if (parts.length < 2) {
    return (
      <h1 className="min-w-0 flex-1 truncate font-sans text-[13px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[16px]">
        {title}
      </h1>
    );
  }

  const trail = parts.slice(0, -1).join(" > ");
  const current = parts[parts.length - 1]!;

  return (
    <h1 className="min-w-0 flex-1 truncate font-sans text-[13px] font-[510] uppercase leading-none tracking-[-0.02em] md:text-[16px]">
      <span className="text-[#959597]">{trail}</span>
      <span className="text-[#959597]"> &gt; </span>
      <span className="text-[#FDFDFF]">{current}</span>
    </h1>
  );
}

/**
 * Global page header — title + optional trailing actions.
 * Account menu lives in the sidebar footer (see app-sidebar.tsx).
 */
export function AppHeader({
  title,
  menuOpen: mobileMenuOpen = false,
  onMenuClick,
  trailing,
  className,
}: {
  title: string;
  menuOpen?: boolean;
  onMenuClick?: () => void;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "divider-edge-bottom sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-shell-header px-3 py-3 sm:gap-4 sm:px-6 sm:py-4",
        className,
      )}
    >
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
      {title ? (
        <PageTitle title={title} />
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </header>
  );
}
