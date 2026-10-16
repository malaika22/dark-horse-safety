"use client";

import * as React from "react";
import { DashboardToolbarButton, cn } from "@dark-horse-safety/ui";

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#203B2C" stroke="#22C55E" />
      <path
        d="M7.5 12.5l3 3 6-6.5"
        stroke="#22C55E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FleetFilteredEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#141414] px-6 py-12 text-center",
        className,
      )}
    >
      <CheckIcon />
      <h3 className="mt-5 font-sans text-[14px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {title}
      </h3>
      <p className="mt-2 max-w-lg font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
        {subtitle}
      </p>
      <DashboardToolbarButton className="mt-6" onClick={onAction}>
        {actionLabel}
      </DashboardToolbarButton>
    </div>
  );
}
