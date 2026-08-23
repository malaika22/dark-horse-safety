"use client";

import { LockIcon } from "./icons";
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

export function AppHeader({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick?: () => void;
}) {
  const { user, logout } = useSession();
  const name = sessionDisplayName(user);
  const role = sessionRoleLabel(user?.role);

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-[#121212] px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
          aria-label="Open menu"
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
        <h1 className="truncate text-lg font-bold uppercase tracking-[0.06em] text-foreground sm:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <span
          className="hidden text-foreground-muted sm:inline-flex"
          title="Secure session"
        >
          <LockIcon />
        </span>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface-muted text-[10px] font-bold uppercase tracking-wide text-foreground">
            {initials(name)}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-foreground">
              {name}
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
              {role || user?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
