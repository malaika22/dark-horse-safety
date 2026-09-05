"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { BrandLoader } from "@/features/loading/brand-loader";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#2A2A2A]",
        className,
      )}
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

/** Table body skeleton rows. */
export function CrmTableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2D2D30] bg-[#121212]">
      <div className="flex gap-4 border-b border-[#2D2D30] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[#2D2D30]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Bone
                key={c}
                className={cn("h-3 flex-1", c === 0 && "max-w-[10rem]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full listing loading state — KPI + toolbar + table skeletons with centered
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
        <CrmTableSkeleton />
        <div className="absolute inset-0 flex items-center justify-center bg-[#0C0C0C]/45">
          <BrandLoader label="Loading data" />
        </div>
      </div>
    </div>
  );
}

/**
 * When `initialLoading`, show skeleton. When refreshing with existing rows,
 * keep children and overlay a small brand loader.
 */
export function CrmListLoadGate({
  loading,
  hasData,
  kpiCount = 4,
  children,
  className,
}: {
  loading: boolean;
  hasData: boolean;
  kpiCount?: number;
  children: React.ReactNode;
  className?: string;
}) {
  if (loading && !hasData) {
    return <CrmListSkeleton kpiCount={kpiCount} className={className} />;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && hasData ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-40 bg-[#0C0C0C]/35">
          <BrandLoader size="sm" label="Updating" />
        </div>
      ) : null}
    </div>
  );
}
