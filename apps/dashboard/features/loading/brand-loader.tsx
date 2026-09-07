"use client";

import * as React from "react";
import { BrandMark, cn } from "@dark-horse-safety/ui";

/** Pulsing brand logo used for global + listing loaders. */
export function BrandLoader({
  size = "md",
  label = "Loading",
  className,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const px = size === "sm" ? 36 : size === "lg" ? 72 : 52;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute inset-[-10px] animate-ping rounded-full bg-[#FDFDFF]/[0.06]"
          aria-hidden
        />
        <span
          className="absolute inset-[-4px] animate-pulse rounded-full border border-[#3E3E3E]"
          aria-hidden
        />
        <BrandMark
          size={px}
          className="relative z-[1] animate-pulse drop-shadow-[0_0_12px_rgba(253,253,255,0.12)]"
        />
      </div>
      {size !== "sm" ? (
        <p className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
          {label}
        </p>
      ) : null}
    </div>
  );
}

/** Full-viewport / section overlay with brand loader. */
export function BrandLoaderOverlay({
  open,
  label = "Loading",
  className,
}: {
  open: boolean;
  label?: string;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-[#0C0C0C]/70 backdrop-blur-[2px]",
        className,
      )}
    >
      <BrandLoader label={label} />
    </div>
  );
}
