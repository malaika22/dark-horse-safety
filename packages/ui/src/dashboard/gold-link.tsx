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
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gold transition-colors hover:text-gold-hover",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="opacity-80" />
    </button>
  );
}
