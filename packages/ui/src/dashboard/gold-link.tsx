import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronRightIcon } from "./icons";

export interface DashboardGoldLinkProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function DashboardGoldLink({
  children,
  className,
  ...props
}: DashboardGoldLinkProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] md:text-[13px]",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="opacity-80" />
    </button>
  );
}

export interface DashboardMutedLinkProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function DashboardMutedLink({
  children,
  className,
  ...props
}: DashboardMutedLinkProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] md:text-[13px]",
        className,
      )}
      {...props}
    >
      {children}
      <span aria-hidden className="text-[12px]">↗</span>
    </button>
  );
}
