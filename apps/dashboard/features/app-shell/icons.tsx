import type { ReactNode } from "react";

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
  switch (name) {
    case "dashboard":
      return (
        <Svg className={className}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
        </Svg>
      );
    case "crm":
      return (
        <Svg className={className}>
          <path
            d="M4 19V5M4 19h16M7 15l3-4 3 2 4-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "hr":
    case "operations":
      return (
        <Svg className={className}>
          <path
            d="M8 7V6a2 2 0 012-2h4a2 2 0 012 2v1M4 10h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="15.5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M17.2 16.2L19 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case "fleet":
      return (
        <Svg className={className}>
          <path
            d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "safety":
      return (
        <Svg className={className}>
          <path
            d="M9 5h6l1 2h3v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7h3l1-2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 13l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "report":
      return (
        <Svg className={className}>
          <path
            d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M15 4v3h3M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case "settings":
      return (
        <Svg className={className}>
          <path
            d="M4 7h10M18 7h2M12 12h8M4 12h4M4 17h8M16 17h4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="2" stroke="currentColor" strokeWidth="1.5" />
        </Svg>
      );
    default:
      return null;
  }
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
