"use client";

import { useRouter } from "next/navigation";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shared 404 view — matches dark CRM shell (uppercase type, accent red, glass/primary buttons).
 */
export function NotFoundView({
  embedded = false,
}: {
  /** When true, fills the app shell content area instead of the full viewport. */
  embedded?: boolean;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/dashboard");
  }

  const shellClass = embedded
    ? "relative flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center overflow-hidden bg-shell px-4 py-10 sm:px-6"
    : "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-shell px-4 py-10 sm:px-6";

  return (
    <div className={shellClass}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2d2d30 1px, transparent 1px), linear-gradient(to bottom, #2d2d30 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 42%, #000 20%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[100px] sm:h-[360px] sm:w-[360px]"
      />

      <div className="relative z-[1] flex w-full max-w-lg flex-col items-center text-center">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-accent sm:text-[11px]">
          Dark Horse Force
        </p>

        <p
          className="mt-5 font-sans text-[72px] font-[590] leading-none tracking-[-0.04em] text-foreground-bright sm:text-[96px]"
          aria-hidden
        >
          <span className="text-accent">4</span>
          <span>0</span>
          <span className="text-accent">4</span>
        </p>

        <h1 className="mt-4 font-sans text-[18px] font-[510] uppercase leading-none tracking-[-0.02em] text-foreground-bright sm:text-[22px]">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm font-sans text-[11px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-foreground-muted sm:text-[12px]">
          This URL does not match any screen in the app. Go back to where you
          were, or open the dashboard.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <DashboardToolbarButton
            type="button"
            variant="primary"
            leftIcon={<BackArrowIcon />}
            onClick={handleBack}
            className="!h-10 !min-w-[140px] !px-4 !text-[12px] !text-[#0D0D0D]"
          >
            Back
          </DashboardToolbarButton>
          <DashboardToolbarButton
            type="button"
            variant="glass"
            onClick={() => router.push("/dashboard")}
            className="!h-10 !min-w-[140px] !px-4 !text-[12px]"
          >
            Dashboard
          </DashboardToolbarButton>
        </div>
      </div>
    </div>
  );
}
