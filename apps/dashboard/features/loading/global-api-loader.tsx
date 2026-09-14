"use client";

import * as React from "react";
import { subscribeApiLoading } from "@/lib/api-loading";

const SHOW_DELAY_MS = 180;

/**
 * Subtle top progress bar while API requests are in flight.
 * No floating brand chip — that sat on the notification bell.
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
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200]"
      aria-busy
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-[2px] w-full overflow-hidden bg-[#1F1F1F]">
        <div className="dhs-global-loader-bar h-full w-1/3 bg-[#FDFDFF]/80" />
      </div>
    </div>
  );
}
