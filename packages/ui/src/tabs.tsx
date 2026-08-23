"use client";

import * as React from "react";
import { cn } from "./lib/cn";

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full rounded-xl border border-border bg-surface p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4 sm:py-2.5 sm:text-sm",
              selected
                ? "bg-surface-elevated text-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
