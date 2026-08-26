import * as React from "react";
import { cn } from "../lib/cn";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";

export interface DashboardEntityMetaItem {
  label: string;
  value: string;
}

export interface DashboardEntityHeaderProps {
  title: string;
  status?: { label: string; variant?: DashboardBadgeVariant };
  meta?: DashboardEntityMetaItem[];
  className?: string;
}

/**
 * Entity identity strip — name + status badge + key metadata row.
 * Used on customer / employee / asset detail pages.
 */
export function DashboardEntityHeader({
  title,
  status,
  meta,
  className,
}: DashboardEntityHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-4">
        <h3 className="font-sans text-[16px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[20px]">
          {title}
        </h3>
        {status ? (
          <DashboardBadge variant={status.variant ?? "success"} pill>
            {status.label}
          </DashboardBadge>
        ) : null}
      </div>
      {meta?.length ? (
        <>
          <div className="divider-line-full w-full" aria-hidden />
          <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 py-4">
            {meta.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </p>
                <p className="mt-1.5 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
