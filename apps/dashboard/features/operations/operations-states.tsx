"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function PlaceholderSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function FailXIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function SyncIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 00-14.2-5M4 12a8 8 0 0014.2 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5.5 4.5v4h4M18.5 19.5v-4h-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 12.5l4 4L18.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4l9 16H3L12 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export function OpsStateButton({
  children,
  onClick,
  href,
  disabled,
  variant = "muted",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "muted" | "ghost-blue";
}) {
  const className = cn(
    "inline-flex h-8 items-center justify-center rounded-lg px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] disabled:opacity-50",
    variant === "muted" &&
      "border border-[#3E3E3E] bg-[#2A2A2A] text-[#FDFDFF] hover:bg-[#333]",
    variant === "ghost-blue" && "text-[#6EA8FE] hover:underline",
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
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

function IconSquare({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "dangerSoft" | "gold" | "blue" | "muted" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        tone === "neutral" && "bg-[#2A2A2A] text-[#959597]",
        tone === "muted" && "bg-[#2A2A2A] text-[#6F6F72]",
        tone === "success" && "bg-[#203B2C] text-[#ACEBCE]",
        tone === "danger" && "rounded-full bg-[#7F1D1D] text-[#FFBBCA]",
        tone === "dangerSoft" && "rounded-full bg-[#3A2020] text-[#E8A0A0]",
        tone === "gold" && "bg-[#2A2618] text-[#C4A35A]",
        tone === "blue" && "rounded-full bg-[#152033] text-[#6EA8FE]",
      )}
    >
      {children}
    </span>
  );
}

export function OpsStatePanel({
  icon,
  title,
  description,
  actions,
  className,
  tone = "neutral",
  titleClassName,
  descriptionClassName,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger" | "gold" | "blue";
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border bg-[#161616] p-4 sm:p-5",
        tone === "neutral" && "border-[#2D2D30]",
        tone === "danger" && "border-[#2D2D30]",
        tone === "gold" && "border-[#C4A35A]/50 bg-[#1C160C]",
        tone === "blue" && "border-[#3B6EA5]/50 bg-[#101820]",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-sans text-[13px] font-[590] uppercase tracking-[-0.02em]",
              tone === "danger" && "text-[#E8A0A0]",
              tone === "gold" && "text-[#C4A35A]",
              tone === "blue" && "text-[#6EA8FE]",
              tone === "neutral" && "text-[#FDFDFF]",
              titleClassName,
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-1.5 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]",
              tone === "gold" && "text-[#C4A35A]/90",
              tone === "blue" && "text-[#6EA8FE]/90",
              tone === "danger" && "text-[#959597]",
              tone === "neutral" && "text-[#959597]",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty states                                                               */
/* -------------------------------------------------------------------------- */

export function OpsNoWorkOrdersYetState({
  onCreate,
  createHref = "/operations/work-orders/new",
  className,
}: {
  onCreate?: () => void;
  createHref?: string;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="No Work Orders Yet"
      description="Create your first work order to get started."
      actions={
        <OpsStateButton href={onCreate ? undefined : createHref} onClick={onCreate}>
          Create Work Order
        </OpsStateButton>
      }
    />
  );
}

export function OpsNothingScheduledState({
  onAssign,
  className,
}: {
  onAssign?: () => void;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="Nothing Scheduled"
      description="No dispatch jobs planned this week."
      actions={
        onAssign ? (
          <OpsStateButton onClick={onAssign}>Assign Jobs</OpsStateButton>
        ) : null
      }
    />
  );
}

export function OpsAllCaughtUpState({ className }: { className?: string }) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="All Caught Up"
      description="No tickets waiting for review."
    />
  );
}

export function OpsNoVariancesState({ className }: { className?: string }) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="No Variances This Cycle"
      description="Billing reconciled cleanly this cycle."
    />
  );
}

export function OpsNoPurchaseOrdersState({
  onAdd,
  addHref = "/operations/purchase-orders/new",
  className,
}: {
  onAdd?: () => void;
  addHref?: string;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="No POs Raised"
      description="No purchase orders for this period."
      actions={
        <OpsStateButton href={onAdd ? undefined : addHref} onClick={onAdd}>
          Add Purchase Order
        </OpsStateButton>
      }
    />
  );
}

export function OpsNothingReadyForNetsuiteState({
  className,
}: {
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="Nothing Ready for NetSuite"
      description="No records queued for export."
    />
  );
}

export function OpsNoOpenRequestsState({ className }: { className?: string }) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="No Open Requests"
      description="No pending form requests right now."
    />
  );
}

/** Closeout queue empty — success. */
export function OpsAllCloseoutsReviewedState({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border border-[#2D2D30] bg-[#161616] p-5 sm:p-6",
        className,
      )}
      role="status"
    >
      <IconSquare tone="success">
        <CheckIcon />
      </IconSquare>
      <h3 className="mt-4 font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        All Closeouts Reviewed
      </h3>
      <p className="mt-1.5 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        Nothing waiting in the queue. Nice work.
      </p>
    </div>
  );
}

/** Another reviewer already decided this closeout. */
export function OpsAlreadyActionedState({
  actionedBy,
  actionedAgo,
  className,
}: {
  actionedBy?: string;
  actionedAgo?: string;
  className?: string;
}) {
  const who = actionedBy?.trim() || "Someone";
  const when = actionedAgo?.trim() || "just now";
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border border-[#C4A35A]/50 bg-[#1C160C] p-5 sm:p-6",
        className,
      )}
      role="status"
    >
      <IconSquare tone="gold">
        <WarnTriangleIcon />
      </IconSquare>
      <h3 className="mt-4 font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#E8D5A8]">
        Already Actioned
      </h3>
      <p className="mt-1.5 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#C4A35A]">
        {who} actioned this closeout {when}.
      </p>
    </div>
  );
}

export function OpsNoWorkOrdersMatchState({
  onClearFilters,
  className,
}: {
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare>
          <PlaceholderSquareIcon />
        </IconSquare>
      }
      title="No Work Orders Match"
      description="No work orders match these filters."
      actions={
        onClearFilters ? (
          <OpsStateButton onClick={onClearFilters}>Clear Filters</OpsStateButton>
        ) : null
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

export function OpsLoadingListState({
  rows = 4,
  className,
  showLabel = true,
}: {
  rows?: number;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#2D2D30] bg-[#161616] p-4",
        className,
      )}
      aria-busy
      aria-label="Loading list"
    >
      {showLabel ? (
        <p className="mb-4 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#6F6F72]">
          Loading — List View
        </p>
      ) : null}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Bone className="h-8 w-8 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-2.5 w-[78%]" />
              <Bone className="h-2.5 w-[62%]" />
              <Bone className="h-2.5 w-[48%]" />
              <Bone className="h-2.5 w-[36%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OpsLoadingJobPacketState({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#2D2D30] bg-[#161616] p-4",
        className,
      )}
      aria-busy
      aria-label="Loading job packet"
    >
      {showLabel ? (
        <p className="mb-4 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#6F6F72]">
          Loading — Job Packet
        </p>
      ) : null}
      <div className="space-y-3">
        <Bone className="h-16 w-full rounded-lg" />
        <div className="border-t border-[#2A2A2A] pt-3">
          <Bone className="h-8 w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Bone className="h-14 w-full rounded-lg" />
          <Bone className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error & status                                                             */
/* -------------------------------------------------------------------------- */

export function OpsSaveFailedState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      tone="danger"
      icon={
        <IconSquare tone="danger">
          <FailXIcon />
        </IconSquare>
      }
      title="Save Failed"
      description="Couldn't save changes. Your entries are preserved."
      actions={
        onRetry ? <OpsStateButton onClick={onRetry}>Retry</OpsStateButton> : null
      }
    />
  );
}

export function OpsLoadFailedState({
  description = "Couldn't load this work order.",
  onRetry,
  className,
}: {
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      tone="danger"
      icon={
        <IconSquare tone="danger">
          <FailXIcon />
        </IconSquare>
      }
      title="Load Failed"
      description={description}
      actions={
        onRetry ? <OpsStateButton onClick={onRetry}>Retry</OpsStateButton> : null
      }
    />
  );
}

export function OpsPermissionDeniedState({
  description = "You don't have access to billing.",
  className,
}: {
  description?: string;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      tone="danger"
      icon={
        <IconSquare tone="dangerSoft">
          <FailXIcon />
        </IconSquare>
      }
      title="Permission Denied"
      description={description}
    />
  );
}

export function OpsWorkOrderCancelledState({
  description = "Cancelled · Customer cancelled",
  className,
}: {
  description?: string;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      icon={
        <IconSquare tone="muted">
          <FailXIcon />
        </IconSquare>
      }
      title="Work Order Cancelled"
      description={description}
    />
  );
}

export function OpsPayCycleLockedState({
  cycleLabel = "Cycle locked",
  lockedOn,
  className,
}: {
  cycleLabel?: string;
  lockedOn?: string;
  className?: string;
}) {
  const detail = lockedOn
    ? `${cycleLabel} locked ${lockedOn}. Changes require an admin unlock.`
    : `${cycleLabel}. Changes require an admin unlock.`;
  return (
    <OpsStatePanel
      className={className}
      tone="gold"
      icon={
        <IconSquare tone="gold">
          <LockIcon />
        </IconSquare>
      }
      title="Pay Cycle Locked"
      description={detail}
    />
  );
}

export function OpsMobileUnsyncedState({
  submissions = 0,
  devices = 0,
  onViewDevices,
  className,
}: {
  submissions?: number;
  devices?: number;
  onViewDevices?: () => void;
  className?: string;
}) {
  return (
    <OpsStatePanel
      className={className}
      tone="blue"
      icon={
        <IconSquare tone="blue">
          <SyncIcon />
        </IconSquare>
      }
      title="Mobile Records Unsynced"
      description={`${submissions} submission${submissions === 1 ? "" : "s"} waiting to sync from ${devices} device${devices === 1 ? "" : "s"}.`}
      actions={
        onViewDevices ? (
          <OpsStateButton variant="ghost-blue" onClick={onViewDevices}>
            View Devices
          </OpsStateButton>
        ) : null
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Smart helpers / gates                                                      */
/* -------------------------------------------------------------------------- */

export function OpsWorkOrdersEmptyState({
  query,
  filtersActive,
  onClearFilters,
  onCreate,
  createHref,
  className,
}: {
  query?: string;
  filtersActive?: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
  createHref?: string;
  className?: string;
}) {
  if (query?.trim() || filtersActive) {
    return (
      <OpsNoWorkOrdersMatchState
        onClearFilters={onClearFilters}
        className={cn("border-0 bg-transparent px-2 py-4", className)}
      />
    );
  }
  return (
    <OpsNoWorkOrdersYetState
      onCreate={onCreate}
      createHref={createHref}
      className={cn("border-0 bg-transparent px-2 py-4", className)}
    />
  );
}

export function OpsDetailStateGate({
  loading,
  error,
  cancelled,
  cancelledDescription,
  onRetry,
  children,
  className,
}: {
  loading?: boolean;
  error?: string | null;
  cancelled?: boolean;
  cancelledDescription?: string;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("bg-shell p-3 sm:p-5", className)}>
        <OpsLoadingJobPacketState />
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("bg-shell p-3 sm:p-5", className)}>
        <OpsLoadFailedState description={error} onRetry={onRetry} />
      </div>
    );
  }
  return (
    <div className={className}>
      {cancelled ? (
        <div className="mb-4 px-3 sm:px-5 sm:pt-5">
          <OpsWorkOrderCancelledState description={cancelledDescription} />
        </div>
      ) : null}
      {children}
    </div>
  );
}
