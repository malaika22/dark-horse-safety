import * as React from "react";
import { cn } from "../lib/cn";
import { ArrowRightIcon } from "./icons";

export interface DashboardFooterButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function DashboardFooterButton({
  children,
  className,
  ...props
}: DashboardFooterButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg bg-[#2A2A2A] px-3 py-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-[#333333] md:text-[14px]",
        className,
      )}
      {...props}
    >
      {children}
      <ArrowRightIcon className="shrink-0" />
    </button>
  );
}
