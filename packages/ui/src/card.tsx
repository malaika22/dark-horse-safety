import * as React from "react";
import { cn } from "./lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({
  className,
  padded = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[460px] rounded-lg border border-border bg-surface",
        padded && "px-4 py-6 sm:px-8 sm:py-10 md:px-10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
