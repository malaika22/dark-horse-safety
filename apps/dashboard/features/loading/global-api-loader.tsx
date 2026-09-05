"use client";

import * as React from "react";
import { BrandMark } from "@dark-horse-safety/ui";
import { subscribeApiLoading } from "@/lib/api-loading";

const SHOW_DELAY_MS = 180;

/**
 * Global API activity indicator — top progress bar + floating brand mark.
 * Listing pages use full skeletons; this covers mutations and short waits.
 */
export function GlobalApiLoader() {
  const [pending, setPending] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => subscribeApiLoading(setPending), []);

  React.useEffect(() => {
    if (pending <= 0) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pending]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200]" aria-busy aria-live="polite">
      <div className="h-[2px] w-full overflow-hidden bg-[#1F1F1F]">
        <div className="dhs-global-loader-bar h-full w-1/3 bg-[#FDFDFF]/80" />
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full border border-[#2D2D30] bg-[#121212]/95 px-3 py-1.5">
        <BrandMark size={22} className="animate-pulse" />
        <span className="hidden font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] sm:inline">
          Loading
        </span>
      </div>
    </div>
  );
}
