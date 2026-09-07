"use client";

import * as React from "react";
import { cn } from "../lib/cn";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16.5 16.5L20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface DashboardSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  containerClassName?: string;
}

/** Shared list-page search field — magnifier + uppercase placeholder. */
export function DashboardSearchInput({
  className,
  containerClassName,
  placeholder = "Search…",
  ...props
}: DashboardSearchInputProps) {
  return (
    <label
      className={cn(
        "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[#3E3E3E] bg-[#353535] px-3",
        containerClassName,
      )}
    >
      <SearchIcon className="shrink-0 text-[#959597]" />
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-white outline-none placeholder:text-[#959597]",
          className,
        )}
        {...props}
      />
    </label>
  );
}
