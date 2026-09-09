"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  CrmLoadFailedState,
  CrmLoadingListState,
  CrmOfflineStaleState,
} from "@/features/crm/crm-states";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#2A2A2A]", className)}
      aria-hidden
    />
  );
}

/** KPI strip skeleton for CRM listing pages. */
export function CrmKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-xl border border-[#2D2D30] bg-[#2D2D30]"
      style={{
        gridTemplateColumns: `repeat(${Math.min(count, 5)}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#121212] p-4">
          <div className="flex items-center justify-between gap-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-8 rounded-[8px]" />
          </div>
          <Bone className="mt-5 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Table body skeleton rows (avatar + bars — matches CRM state reference). */
export function CrmTableSkeleton({
  rows = 8,
}: {
  rows?: number;
  /** @deprecated ignored — list skeleton uses avatar layout */
  cols?: number;
}) {
  return <CrmLoadingListState rows={rows} />;
}

/**
 * Full listing loading state — KPI + toolbar + list skeleton with centered
 * brand logo.
 */
export function CrmListSkeleton({
  kpiCount = 4,
  className,
}: {
  kpiCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5",
        className,
      )}
      aria-busy
      aria-label="Loading list"
    >
      <CrmKpiSkeleton count={kpiCount} />
      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-9 w-full max-w-sm rounded-lg" />
        <Bone className="h-9 w-28 rounded-lg" />
        <Bone className="h-9 w-28 rounded-lg" />
        <Bone className="ml-auto h-9 w-32 rounded-lg" />
      </div>
      <div className="relative min-h-[320px]">
        <CrmLoadingListState rows={6} />
        <div className="absolute inset-0 flex items-center justify-center bg-[#0C0C0C]/45">
          <BrandLoader label="Loading data" />
        </div>
      </div>
    </div>
  );
}

/**
 * When `initialLoading`, show skeleton. When refreshing with existing rows,
 * keep children and overlay a small brand loader. When load fails with no data,
 * show the shared load-failed state.
 */
export function CrmListLoadGate({
  loading,
  hasData,
  error,
  onRetry,
  kpiCount = 4,
  children,
  className,
  staleSinceLabel,
}: {
  loading: boolean;
  hasData: boolean;
  error?: string | null;
  onRetry?: () => void;
  kpiCount?: number;
  children: React.ReactNode;
  className?: string;
  /** When set (or browser is offline), show the shared stale/offline banner. */
  staleSinceLabel?: string | null;
}) {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    function sync() {
      setOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (error && !hasData && !loading) {
    return (
      <div
        className={cn(
          "overflow-x-hidden bg-shell p-3 sm:p-5",
          className,
        )}
      >
        <CrmLoadFailedState
          description={error || "Something went wrong loading this."}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (loading && !hasData) {
    return <CrmListSkeleton kpiCount={kpiCount} className={className} />;
  }

  const showStale = offline || Boolean(staleSinceLabel);

  return (
    <div className={cn("relative", className)}>
      {showStale ? (
        <div className="mb-4">
          <CrmOfflineStaleState
            lastSyncLabel={staleSinceLabel || "just now"}
            onRetrySync={onRetry}
          />
        </div>
      ) : null}
      {children}
      {loading && hasData ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0C0C0C]/35">
          <BrandLoader size="sm" label="Updating" />
        </div>
      ) : null}
    </div>
  );
}
