import * as React from "react";
import { cn } from "./lib/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

function DividerLine({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("divider-line h-0 flex-1 border-0", className)}
      style={{
        borderTop: "1px solid var(--dhs-divider, #2D2D30)",
        boxShadow: "var(--dhs-divider-shadow, 0px -1px 0px 0px #000000)",
      }}
    />
  );
}

export function Divider({ label, className, ...props }: DividerProps) {
  if (!label) {
    return (
      <div
        className={cn("w-full", className)}
        role="separator"
        {...props}
      >
        <DividerLine className="w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn("flex w-full items-center gap-3", className)}
      role="separator"
      {...props}
    >
      <DividerLine />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-subtle">
        {label}
      </span>
      <DividerLine />
    </div>
  );
}
