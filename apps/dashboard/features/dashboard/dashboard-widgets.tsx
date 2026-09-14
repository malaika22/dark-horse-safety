import type { CSSProperties, ReactNode } from "react";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardStatList,
  DashboardWidgetHeader,
  cn,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import {
  CREW_STATUS_LEGEND,
  fleetVehicleColor,
  fleetVehicleLabel,
  type CrewStatus,
  type FleetVehicleStatus,
  type MobileSyncStatusKind,
} from "./data/overview.mock";

function crewStatusColor(status: CrewStatus) {
  return CREW_STATUS_LEGEND.find((item) => item.status === status)?.color ?? "#959597";
}

const AVATAR_GRADIENTS: [string, string][] = [
  ["#4A5568", "#2D3748"],
  ["#553C9A", "#44337A"],
  ["#2C5282", "#1A365D"],
  ["#744210", "#5F370E"],
  ["#234E52", "#1D4044"],
  ["#702459", "#521B41"],
];

function avatarGradient(initials: string): [string, string] {
  const code =
    (initials.charCodeAt(0) ?? 0) + (initials.charCodeAt(1) ?? 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]!;
}

export function DashboardCrewAvatars({
  crew,
}: {
  crew: {
    id: string;
    initials: string;
    name?: string;
    imageUrl?: string;
    status: CrewStatus;
  }[];
}) {
  return (
    <div className="flex items-start gap-2 overflow-x-auto overflow-y-visible pb-0.5 scrollbar-hidden sm:gap-3.5">
      {crew.map((member) => {
        const [from, to] = avatarGradient(member.initials);
        return (
          <div
            key={member.id}
            className="flex w-[3.25rem] shrink-0 snap-start flex-col items-center gap-1.5 sm:w-14"
          >
            <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12">
              {member.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.imageUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full font-sans text-[11px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]"
                  style={{
                    background: `linear-gradient(145deg, ${from} 0%, ${to} 100%)`,
                  }}
                >
                  {member.initials}
                </div>
              )}
              <span
                className="pointer-events-none absolute bottom-px right-px h-2.5 w-2.5 rounded-full border-2 border-[#1A1A1A]"
                style={{ backgroundColor: crewStatusColor(member.status) }}
                aria-hidden
              />
            </div>
            {member.name ? (
              <span className="w-full truncate text-center font-sans text-[9px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] sm:text-[10px]">
                {member.name}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardCrewLegend() {
  return (
    <div className="divider-section-top mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
      {CREW_STATUS_LEGEND.map((item) => (
        <span
          key={item.status}
          className="inline-flex h-4 items-center gap-1.5 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]"
        >
          <i
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TruckIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      style={style}
    >
      <path
        d="M2 9h11v8H2V9zm11 1.5h3.2l2.8 2.8V17h-6v-4.5z"
        fill="currentColor"
      />
      <circle cx="6" cy="17.5" r="1.75" fill="currentColor" />
      <circle cx="16" cy="17.5" r="1.75" fill="currentColor" />
    </svg>
  );
}

function FleetStatIcon({
  type,
}: {
  type: "truck" | "equipment" | "audit" | "unaccounted";
}) {
  const cls = "h-4 w-4 text-[#959597]";
  switch (type) {
    case "truck":
      return <TruckIcon className={cls} />;
    case "equipment":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.5 10.5L20 20M16 20h4v-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "audit":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "unaccounted":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function DashboardFleetStatList({
  items,
}: {
  items: {
    label: string;
    value: string;
    icon: "truck" | "equipment" | "audit" | "unaccounted";
  }[];
}) {
  return (
    <DashboardStatList
      className="mt-4 pt-3"
      items={items.map((item) => ({
        label: item.label,
        value: item.value,
        icon: <FleetStatIcon type={item.icon} />,
      }))}
    />
  );
}

export function DashboardFleetVehicleRow({
  vehicles,
}: {
  vehicles: { id: string; status: FleetVehicleStatus }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between sm:gap-3">
      {vehicles.map((vehicle) => {
        const color = fleetVehicleColor(vehicle.status);
        return (
          <div
            key={vehicle.id}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-1"
          >
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#1A1A1A] sm:h-12 sm:w-12"
              style={{ borderColor: color }}
            >
              <TruckIcon
                className="h-[18px] w-[18px] sm:h-5 sm:w-5"
                style={{ color }}
              />
              {vehicle.status === "off" ? (
                <span
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 42%, #959597 44%, #959597 56%, transparent 58%)",
                  }}
                />
              ) : null}
            </div>
            <span className="font-sans text-[11px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] sm:text-[12px]">
              {vehicle.id}
            </span>
            <span className="font-sans text-[8px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] sm:text-[8.5px]">
              {fleetVehicleLabel(vehicle.status)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SyncStatusIcon({
  kind,
  className,
  style,
}: {
  kind: MobileSyncStatusKind;
  className?: string;
  style?: CSSProperties;
}) {
  if (kind === "uptodate") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "failed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
        <path
          d="M10.29 3.86L1.82 18a1 1 0 0 0 .87 1.5h18.62a1 1 0 0 0 .87-1.5L13.71 3.86a1 1 0 0 0-1.72 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "queued") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M2 8.5A10.5 10.5 0 0112 3.5a10.5 10.5 0 0110 5M5 12v2a7 7 0 0014 0v-2M12 19v2M8 21h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M8 3h3l1 3-2 1a12 12 0 005 5l1-2 3 1v3a2 2 0 01-2 2C9.6 16 8 14.4 6 12s-4-6.6-4-9a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardMobileSyncStatus({
  items,
}: {
  items: {
    label: string;
    count: number;
    kind: MobileSyncStatusKind;
    color: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-1"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#1A1A1A] sm:h-12 sm:w-12"
            style={{ borderColor: item.color }}
          >
            <SyncStatusIcon
              kind={item.kind}
              className="h-[18px] w-[18px] sm:h-5 sm:w-5"
              style={{ color: item.color }}
            />
          </div>
          <span className="font-sans text-[11px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] sm:text-[12px]">
            {item.count}
          </span>
          <span className="font-sans text-[8px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] sm:text-[8.5px]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardStatusCircles({
  items,
}: {
  items: { label: string; count: number; color: string }[];
}) {
  return (
    <div className="flex flex-wrap justify-between gap-3 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[4.5rem] flex-col items-center gap-2 text-center"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#1A1A1A] font-sans text-[12px] font-[590] tabular-nums leading-none text-[#FDFDFF]"
            style={{ borderColor: item.color }}
          >
            {item.count}
          </div>
          <span className="font-sans text-[9px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[10px]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardMobileSyncList({
  rows,
}: {
  rows: { name: string; detail: string; critical?: boolean }[];
}) {
  return (
    <ul className="divider-section-top mt-4 list-none space-y-0 pt-3">
      {rows.map((row) => (
        <li
          key={row.name}
          className="flex flex-col items-start gap-1 divider-row py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        >
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2A2A2A] text-[#959597]">
              <PhoneIcon />
            </span>
            <span className="truncate font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {row.name}
            </span>
          </span>
          <span
            className="max-w-full pl-9 font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] sm:max-w-[55%] sm:shrink-0 sm:truncate sm:pl-0 sm:text-right md:text-[12px]"
            style={{ color: row.critical ? "#FF4D4D" : "#959597" }}
          >
            {row.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SafetyRecordIcon({ type }: { type: "calendar" | "chart" | "blocked" }) {
  const cls = "h-4 w-4 text-[#959597]";
  if (type === "calendar") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "chart") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
        <path d="M4 19V5M4 19h16M8 15v-4M12 15V9M16 15v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={cls}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardSafetyRecordList({
  items,
}: {
  items: { label: string; value: string; icon: "calendar" | "chart" | "blocked" }[];
}) {
  return (
    <ul className="list-none space-y-0">
      {items.map((item) => (
        <li
          key={item.label}
          className="divider-row flex items-center justify-between gap-3 py-3"
        >
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2A2A2A]">
              <SafetyRecordIcon type={item.icon} />
            </span>
            <span className="truncate font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {item.label}
            </span>
          </span>
          <span className="shrink-0 font-sans text-[20px] font-[590] uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[24px]">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardQuotePipelineSummary({
  open,
  conversion,
}: {
  open: string;
  conversion: string;
}) {
  return (
    <div className="divider-section-top mt-4 grid grid-cols-2 gap-4 pt-4 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[12px]">
      <div>
        <p className="text-[#959597]">$ open</p>
        <p className="mt-1.5 font-[590] text-[#FDFDFF]">{open}</p>
      </div>
      <div className="text-right">
        <p className="text-[#959597]">% conversion</p>
        <p className="mt-1.5 font-[590] text-[#FDFDFF]">{conversion}</p>
      </div>
    </div>
  );
}

export function DashboardReportDueRow({
  title,
  status,
  statusVariant,
  meta,
}: {
  title: string;
  status: string;
  statusVariant: DashboardBadgeVariant;
  meta: string;
}) {
  return (
    <li className="flex flex-col gap-1.5 divider-row py-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <p className="font-sans text-[12px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
          {title}
        </p>
        {status ? (
          <DashboardBadge variant={statusVariant} pill>
            {status}
          </DashboardBadge>
        ) : null}
      </div>
      <span className="shrink-0 font-sans text-[11px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[12px]">
        {meta}
      </span>
    </li>
  );
}

export function DashboardSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[14px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Figma pattern — gray section title above the panel card. */
export function DashboardWidgetSection({
  title,
  actionLabel,
  children,
  className,
}: {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <DashboardWidgetHeader title={title} actionLabel={actionLabel} />
      <DashboardPanel className="p-3.5 sm:p-4">{children}</DashboardPanel>
    </section>
  );
}
