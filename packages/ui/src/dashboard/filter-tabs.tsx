"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface DashboardFilterTab {
  id: string;
  label: string;
}

export interface DashboardFilterTabsProps {
  tabs: DashboardFilterTab[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function DashboardFilterTabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className,
}: DashboardFilterTabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0]?.id ?? "");
  const active = value ?? internal;

  const select = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-[3.5px] rounded-[8px] bg-[#2A2A2A] p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => select(tab.id)}
            className={cn(
              "inline-flex h-[24.5px] items-center justify-center px-[8.75px] py-[7px] font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] transition-colors",
              isActive
                ? "rounded-[5.25px] border-[0.88px] border-white bg-white text-[#09090B]"
                : "rounded-[5.25px] border-[0.88px] border-transparent text-[#959597] hover:text-[#FDFDFF]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
