"use client";

import * as React from "react";
import { DashboardBadge, type DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type { LocationCard } from "./crm-types";

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function gpsBadge(card: LocationCard): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  return card.gpsSet
    ? { label: "Set", variant: "success" }
    : { label: "Missing", variant: "error" };
}

function reqBadge(card: LocationCard): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  if (card.reqMet === "MET") return { label: "Met", variant: "success" };
  if (card.reqMet === "PARTIAL") return { label: "Partial", variant: "warning" };
  return { label: "Missing", variant: "error" };
}

export function CustomerSitesTable({
  rows,
  totalLabel,
  onRowClick,
}: {
  rows: LocationCard[];
  /** Override well count in header (defaults to rows.length). */
  totalLabel?: number;
  onRowClick?: (id: string) => void;
}) {
  const count = totalLabel ?? rows.length;

  return (
    <div className="overflow-hidden rounded-xl border border-[#2D2D30] bg-panel">
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
          Customer Sites
          <span aria-hidden> · </span>
          {count} Wells
          <span aria-hidden> · </span>
          Click A Row For Details
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-t border-[#2D2D30]">
              {(
                [
                  "Well Name",
                  "Customer",
                  "Open Jobs",
                  "GPS",
                  "Last Visited",
                  "Req Met",
                ] as const
              ).map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597] sm:px-5"
                >
                  {h}
                </th>
              ))}
              <th className="w-10 px-3 py-3 sm:px-4" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gps = gpsBadge(row);
              const req = reqBadge(row);
              return (
                <tr
                  key={row.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => onRowClick?.(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick?.(row.id);
                    }
                  }}
                  className="group cursor-pointer border-t border-[#2D2D30] transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                      {row.customer}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.openJobs}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <DashboardBadge variant={gps.variant} pill>
                      {gps.label}
                    </DashboardBadge>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {formatShortDate(row.lastVisited)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <DashboardBadge variant={req.variant} pill>
                      {req.label}
                    </DashboardBadge>
                  </td>
                  <td className="px-3 py-3.5 text-[#6F6F72] transition-colors group-hover:text-[#FDFDFF] sm:px-4">
                    <ChevronRightIcon />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
