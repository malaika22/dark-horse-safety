import type { ReactNode } from "react";
import { cn } from "@dark-horse-safety/ui";

type SvgProps = { className?: string; children: ReactNode };

function Svg({ children, className }: SvgProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function NavIcon({
  name,
  className,
}: {
  name:
    | "dashboard"
    | "crm"
    | "hr"
    | "fleet"
    | "operations"
    | "safety"
    | "report"
    | "settings";
  className?: string;
}) {
  const iconSrc: Record<typeof name, string> = {
    dashboard: "/icons/menu/dashboard.png",
    crm: "/icons/menu/crm.png",
    hr: "/icons/menu/employee.png",
    fleet: "/icons/menu/fleet.png",
    operations: "/icons/menu/operations.png",
    safety: "/icons/menu/safety.png",
    report: "/icons/menu/report.png",
    settings: "/icons/menu/settings.png",
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconSrc[name]}
      alt=""
      className={cn("h-[18px] w-[18px] object-contain", className)}
    />
  );
}

export function ChevronIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
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
        d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 11V8a4 4 0 018 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SyncIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M21 12a9 9 0 01-15.5 6.4M3 12a9 9 0 0115.5-6.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3 18v-4h4M21 6v4h-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
