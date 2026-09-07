"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function DocIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3.5h6.5L17.5 6.5V20.5H8V3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 3.5V6.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 10.5h4M10 13.5h4M10 16.5h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyTabIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3.5 3"
      />
    </svg>
  );
}

function ExclaimIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="6"
        y="11"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8.5 11V8.5a3.5 3.5 0 017 0V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5h16v3H4v-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5v8.5h12v-8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 14h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 0112.4-5.7M19.5 12a7.5 7.5 0 01-12.5 5.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.2 8.2l7.6 7.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#2A2A2A]", className)}
      aria-hidden
    />
  );
}

export function CrmStatePrimaryButton({
  children,
  onClick,
  href,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex h-9 items-center justify-center rounded-lg bg-[#FDFDFF] px-3.5 font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#0D0D0D] hover:opacity-90 disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

export function CrmStateSecondaryButton({
  children,
  onClick,
  href,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const className =
    "inline-flex h-9 items-center justify-center rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3.5 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#222] disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

function IconWell({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full",
        tone === "neutral" && "bg-[#2A2A2A] text-[#FDFDFF]",
        tone === "danger" && "bg-[#4B212B] text-[#FFBBCA]",
        tone === "gold" && "bg-[#2A2618] text-[#C4A35A]",
      )}
    >
      {children}
    </span>
  );
}

export function CrmStatePanel({
  icon,
  title,
  description,
  actions,
  className,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger" | "gold";
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-[#2D2D30] bg-[#121212] px-6 py-10 text-center",
        className,
      )}
      role="status"
    >
      <IconWell tone={tone}>{icon}</IconWell>
      <h3 className="mt-4 font-sans text-[14px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {title}
      </h3>
      <p className="mt-2 max-w-[28rem] font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        {description}
      </p>
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty states                                                               */
/* -------------------------------------------------------------------------- */

export function CrmEmptyListState({
  title = "No Records Yet",
  description = "Create your first customer to get started.",
  createLabel = "+ New Customer",
  createHref,
  onCreate,
  className,
}: {
  title?: string;
  description?: string;
  createLabel?: string;
  createHref?: string;
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      icon={<DocIcon />}
      title={title}
      description={description}
      actions={
        createHref || onCreate ? (
          <CrmStatePrimaryButton href={createHref} onClick={onCreate}>
            {createLabel}
          </CrmStatePrimaryButton>
        ) : null
      }
    />
  );
}

export function CrmNoFilterResultsState({
  onClearFilters,
  className,
}: {
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      icon={<FilterIcon />}
      title="No Matches"
      description="No records match the current filters."
      actions={
        onClearFilters ? (
          <CrmStateSecondaryButton onClick={onClearFilters}>
            Clear Filters
          </CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

export function CrmEmptySearchState({
  query,
  onClearSearch,
  className,
}: {
  query?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  const term = query?.trim() || "your search";
  return (
    <CrmStatePanel
      className={className}
      icon={<SearchIcon />}
      title="No Results"
      description={`Nothing matches “${term}”. Try a different term.`}
      actions={
        onClearSearch ? (
          <CrmStateSecondaryButton onClick={onClearSearch}>
            Clear Search
          </CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

export function CrmEmptyTabState({
  title = "Nothing Here Yet",
  description = "This tab has no items for this record.",
  addLabel = "Add Item",
  onAdd,
  className,
}: {
  title?: string;
  description?: string;
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      icon={<EmptyTabIcon />}
      title={title}
      description={description}
      actions={
        onAdd ? (
          <CrmStateSecondaryButton onClick={onAdd}>{addLabel}</CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeletons                                                          */
/* -------------------------------------------------------------------------- */

export function CrmLoadingListState({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#2D2D30] bg-[#121212] p-4",
        className,
      )}
      aria-busy
      aria-label="Loading list"
    >
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-2.5 w-[72%]" />
              <Bone className="h-2.5 w-[48%]" />
              <Bone className="h-2.5 w-[36%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmLoadingDetailState({
  lines = 6,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-[88%]", "w-[64%]", "w-[76%]", "w-[42%]", "w-[70%]", "w-[55%]"];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#2D2D30] bg-[#121212] p-5",
        className,
      )}
      aria-busy
      aria-label="Loading detail"
    >
      <div className="space-y-3.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bone key={i} className={cn("h-3", widths[i % widths.length])} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error & feedback                                                           */
/* -------------------------------------------------------------------------- */

export function CrmSaveFailedState({
  onDiscard,
  onRetry,
  className,
}: {
  onDiscard?: () => void;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      tone="danger"
      icon={<ExclaimIcon />}
      title="Save Failed"
      description="Your changes couldn't be saved."
      actions={
        <>
          {onDiscard ? (
            <CrmStateSecondaryButton onClick={onDiscard}>
              Discard
            </CrmStateSecondaryButton>
          ) : null}
          {onRetry ? (
            <CrmStatePrimaryButton onClick={onRetry}>Retry</CrmStatePrimaryButton>
          ) : null}
        </>
      }
    />
  );
}

export function CrmLoadFailedState({
  description = "Something went wrong loading this.",
  onRetry,
  className,
}: {
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      tone="danger"
      icon={<ExclaimIcon />}
      title="Couldn't Load"
      description={description}
      actions={
        onRetry ? (
          <CrmStatePrimaryButton onClick={onRetry}>Retry</CrmStatePrimaryButton>
        ) : null
      }
    />
  );
}

export function CrmPermissionDeniedState({
  onRequestAccess,
  className,
}: {
  onRequestAccess?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      tone="gold"
      icon={<LockIcon />}
      title="No Access"
      description="You don't have permission to view this record."
      actions={
        onRequestAccess ? (
          <CrmStateSecondaryButton onClick={onRequestAccess}>
            Request Access
          </CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

export function CrmRecordArchivedState({
  onRestore,
  className,
}: {
  onRestore?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      icon={<ArchiveIcon />}
      title="Record Archived"
      description="This record has been archived and is read-only."
      actions={
        onRestore ? (
          <CrmStateSecondaryButton onClick={onRestore}>
            Restore
          </CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

export function CrmOfflineStaleState({
  lastSyncLabel = "12 min ago",
  onRetrySync,
  className,
}: {
  lastSyncLabel?: string;
  onRetrySync?: () => void;
  className?: string;
}) {
  return (
    <CrmStatePanel
      className={className}
      tone="gold"
      icon={<OfflineIcon />}
      title="Offline — Stale Data"
      description={`Showing data from last sync · ${lastSyncLabel}.`}
      actions={
        onRetrySync ? (
          <CrmStateSecondaryButton onClick={onRetrySync}>
            Retry Sync
          </CrmStateSecondaryButton>
        ) : null
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* List empty resolver                                                        */
/* -------------------------------------------------------------------------- */

export type CrmListEmptyKind = "search" | "filters" | "empty";

export function resolveCrmListEmptyKind(options: {
  query?: string;
  filtersActive?: boolean;
}): CrmListEmptyKind {
  if (options.query?.trim()) return "search";
  if (options.filtersActive) return "filters";
  return "empty";
}

/** Smart empty content for CRM data tables. */
export function CrmListEmptyState({
  query,
  filtersActive,
  emptyDescription,
  createLabel,
  createHref,
  onCreate,
  onClearFilters,
  onClearSearch,
  className,
}: {
  query?: string;
  filtersActive?: boolean;
  emptyDescription?: string;
  createLabel?: string;
  createHref?: string;
  onCreate?: () => void;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  className?: string;
}) {
  const kind = resolveCrmListEmptyKind({ query, filtersActive });
  if (kind === "search") {
    return (
      <CrmEmptySearchState
        query={query}
        onClearSearch={onClearSearch}
        className={cn("border-0 bg-transparent px-2 py-4", className)}
      />
    );
  }
  if (kind === "filters") {
    return (
      <CrmNoFilterResultsState
        onClearFilters={onClearFilters}
        className={cn("border-0 bg-transparent px-2 py-4", className)}
      />
    );
  }
  return (
    <CrmEmptyListState
      description={emptyDescription}
      createLabel={createLabel}
      createHref={createHref}
      onCreate={onCreate}
      className={cn("border-0 bg-transparent px-2 py-4", className)}
    />
  );
}

/** Detail page loading / error / missing / forbidden / archived gate. */
export function CrmDetailStateGate({
  loading,
  error,
  missing,
  forbidden,
  archived,
  onRetry,
  onRequestAccess,
  onRestore,
  missingTitle = "Record Not Found",
  missingDescription = "This record could not be found or is no longer available.",
  children,
  className,
}: {
  loading?: boolean;
  error?: string | null;
  missing?: boolean;
  forbidden?: boolean;
  archived?: boolean;
  onRetry?: () => void;
  onRequestAccess?: () => void;
  onRestore?: () => void;
  missingTitle?: string;
  missingDescription?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("space-y-4 bg-shell p-3 sm:p-5", className)}>
        <CrmLoadingDetailState lines={6} />
        <CrmLoadingDetailState lines={4} />
      </div>
    );
  }
  if (forbidden) {
    return (
      <div className={cn("bg-shell p-3 sm:p-5", className)}>
        <CrmPermissionDeniedState onRequestAccess={onRequestAccess} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("bg-shell p-3 sm:p-5", className)}>
        <CrmLoadFailedState description={error} onRetry={onRetry} />
      </div>
    );
  }
  if (missing) {
    return (
      <div className={cn("bg-shell p-3 sm:p-5", className)}>
        <CrmStatePanel
          icon={<DocIcon />}
          title={missingTitle}
          description={missingDescription}
        />
      </div>
    );
  }
  return (
    <>
      {archived ? (
        <div className={cn("bg-shell px-3 pt-3 sm:px-5 sm:pt-5", className)}>
          <CrmRecordArchivedState onRestore={onRestore} />
        </div>
      ) : null}
      {children}
    </>
  );
}

/** Compact inline loading for nested tabs / panels. */
export function CrmTabLoadingState({ className }: { className?: string }) {
  return (
    <CrmLoadingDetailState
      lines={4}
      className={cn("border-0 bg-transparent p-0", className)}
    />
  );
}
