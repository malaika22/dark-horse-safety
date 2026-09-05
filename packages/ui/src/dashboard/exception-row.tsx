import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronRightIcon } from "./icons";
import { DashboardBadge, type DashboardBadgeVariant } from "./badge";

export interface DashboardExceptionRowProps {
  tag: string;
  tagVariant?: DashboardBadgeVariant;
  title: string;
  action?: string;
  onAction?: () => void;
  /** Tag above title (default), at row end, or queue style (tag left + chevron). */
  tagPosition?: "above" | "end" | "start";
  className?: string;
}

/** Highlight WO numbers in white; rest stays muted grey. */
function ExceptionTitle({ title, className }: { title: string; className?: string }) {
  const parts = title.split(/(WO\s+\d+)/i);

  return (
    <span
      className={cn(
        "font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[12px]",
        className,
      )}
    >
      {parts.map((part, index) =>
        /^WO\s+\d+$/i.test(part) ? (
          <span key={index} className="text-[#FDFDFF]">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

export function DashboardExceptionRow({
  tag,
  tagVariant = "gold",
  title,
  action,
  onAction,
  tagPosition = "above",
  className,
}: DashboardExceptionRowProps) {
  const tagBadge = (
    <DashboardBadge variant={tagVariant} pill className="shrink-0">
      {tag}
    </DashboardBadge>
  );

  if (tagPosition === "start") {
    return (
      <li
        className={cn(
          "flex items-center gap-3 divider-row py-3.5",
          className,
        )}
      >
        {tagBadge}
        <ExceptionTitle title={title} className="min-w-0 flex-1" />
        <ChevronRightIcon className="shrink-0 text-[#959597]" />
      </li>
    );
  }

  if (tagPosition === "end") {
    return (
      <li
        className={cn(
          "flex items-center gap-3 divider-row py-3.5",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <ExceptionTitle title={title} />
          {tagBadge}
        </div>
        <ChevronRightIcon className="shrink-0 text-[#959597]" />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 divider-row py-3.5 md:flex-row md:items-center md:justify-between md:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {tagBadge}
        <p className="mt-2 font-sans text-[12px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
          <ExceptionTitle title={title} className="text-[#FDFDFF] md:text-[14px] [&_span]:text-inherit" />
        </p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 self-start font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] underline decoration-[#FDFDFF]/70 underline-offset-4 transition-opacity hover:opacity-80 md:self-auto md:text-[14px]"
        >
          {action}
        </button>
      ) : null}
    </li>
  );
}

export interface DashboardStatRowItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export interface DashboardStatListProps {
  items: DashboardStatRowItem[];
  className?: string;
}

export function DashboardStatList({ items, className }: DashboardStatListProps) {
  return (
    <ul className={cn("divider-section-top list-none space-y-0 pt-3", className)}>
      {items.map((item) => (
        <li
          key={item.label}
          className="divider-row flex items-center justify-between gap-3 py-2.5"
        >
          <span className="inline-flex min-w-0 items-center gap-2.5">
            {item.icon ? (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2A2A2A]">
                {item.icon}
              </span>
            ) : null}
            <span className="truncate font-sans text-[12px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[13px]">
              {item.label}
            </span>
          </span>
          <span className="shrink-0 font-sans text-[12px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
