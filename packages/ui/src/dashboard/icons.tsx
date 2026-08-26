import type { ReactNode } from "react";

export function ChevronRightIcon({ className }: { className?: string }) {
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
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Right arrow with shaft — KPI card footer action */
export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Left arrow with shaft — back / cancel controls */
export function ArrowLeftIcon({ className }: { className?: string }) {
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
        d="M20 12H6M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M20.5 12a8.5 8.5 0 01-14.55 6.05"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3.5 12A8.5 8.5 0 0118.05 5.95"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M20.5 7.5V12H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 16.5V12H8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export type StatIconName =
  | "crm"
  | "hr"
  | "fleet"
  | "operations"
  | "safety"
  | "time"
  | "edit"
  | "gps"
  | "equipment"
  | "wrench"
  | "customers";

/** Full Figma assets (include rounded bg) — skip the KPI wrapper fill. */
export const STAT_ICON_SRC: Partial<Record<StatIconName, string>> = {
  customers: "/icons/customers-icon.png",
};

export function isAssetStatIcon(name: StatIconName) {
  return Boolean(STAT_ICON_SRC[name]);
}

export function StatIcon({
  name,
  className,
}: {
  name: StatIconName;
  className?: string;
}) {
  const assetSrc = STAT_ICON_SRC[name];
  if (assetSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assetSrc}
        alt=""
        className={className ?? "h-8 w-8 rounded-[8px] object-cover"}
      />
    );
  }

  switch (name) {
    case "crm":
    case "time":
      /* Clock — filled white face, dark L hands */
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="8" fill="currentColor" />
          <path
            d="M12 8v4h3"
            stroke="#1A1A1A"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </Svg>
      );
    case "hr":
      /* Price / luggage tag */
      return (
        <Svg className={className}>
          <path
            d="M5.5 14.5l8.2-8.2a2 2 0 012.8 0l1.2 1.2a2 2 0 010 2.8l-8.2 8.2a1.5 1.5 0 01-1.1.4H6.5a1 1 0 01-1-1v-2.9c0-.4.15-.8.4-1.1z"
            fill="currentColor"
          />
          <circle cx="16.2" cy="7.8" r="1.25" fill="#1A1A1A" />
          <path
            d="M7 18.5h5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "fleet":
    case "gps":
      /* Location pin */
      return (
        <Svg className={className}>
          <path
            d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
            fill="currentColor"
          />
          <circle cx="12" cy="10" r="2.5" fill="#1A1A1A" />
        </Svg>
      );
    case "operations":
    case "safety":
    case "wrench":
    case "equipment":
      /* Diagonal wrench */
      return (
        <Svg className={className}>
          <path
            d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
            fill="currentColor"
          />
        </Svg>
      );
    case "edit":
      return (
        <Svg className={className}>
          <path
            d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}
