import * as React from "react";
import { cn } from "../lib/cn";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";

export interface DashboardEntityMetaItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface DashboardEntityHeaderProps {
  title: string;
  status?: { label: string; variant?: DashboardBadgeVariant };
  meta?: DashboardEntityMetaItem[];
  /** Optional profile / cover image URL */
  imageUrl?: string;
  /** Right-side actions (e.g. Switch customer) */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Entity identity strip — photo + name + status + metadata + trailing action.
 * Used on customer / employee / asset detail pages.
 */
export function DashboardEntityHeader({
  title,
  status,
  meta,
  imageUrl,
  trailing,
  className,
}: DashboardEntityHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-divider bg-panel",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
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
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {meta.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="inline-flex min-w-0 items-center gap-1.5"
                    title={`${item.label}: ${item.value}`}
                  >
                    {item.icon ? (
                      <span className="inline-flex shrink-0 text-[#959597]">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="truncate font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {trailing ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
