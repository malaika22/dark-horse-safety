"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardPanel,
  cn,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";

export type CrmMapPinStatus = "active" | "inactive" | "gps-missing";

export type CrmMapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
  status?: CrmMapPinStatus;
  /** Show blue dashed geofence ring around pin */
  geofenced?: boolean;
  selected?: boolean;
  /** Popover fields (Locations map pin card) */
  customer?: string;
  openJobs?: number;
  gpsSet?: boolean;
  geofenceRadius?: string | null;
  /** @deprecated use status */
  highlighted?: boolean;
};

export type CrmLocationCard = {
  id: string;
  name: string;
  customer: string;
  customerId?: string;
  locationId?: string;
  geofenceRadius?: string;
  city: string;
  openJobs: number;
  gpsStatus: string;
  status: { label: string; variant: DashboardBadgeVariant };
};

type LegendItem = {
  label: string;
  tone: "active" | "inactive" | "gps-missing";
};

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" fill="currentColor" />
    </svg>
  );
}

function pinTone(pin: CrmMapPin): CrmMapPinStatus {
  if (pin.status) return pin.status;
  if (pin.highlighted === false) return "inactive";
  return "active";
}

function MapLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={
              item.tone === "active"
                ? "h-2.5 w-2.5 rounded-full bg-[#4ADE80]"
                : item.tone === "gps-missing"
                  ? "h-2.5 w-2.5 rounded-full bg-[#F87171]"
                  : "h-2.5 w-2.5 rounded-full bg-[#6B6B6B]"
            }
          />
          <span className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function MapPinPopover({
  pin,
  onOpenSite,
}: {
  pin: CrmMapPin;
  onOpenSite?: (id: string) => void;
}) {
  const gpsSet = pin.gpsSet ?? pin.status === "active";
  /** Keep card inside the map canvas — flip below when pin is near the top. */
  const placeBelow = pin.y < 36;
  const leftPct = Math.min(86, Math.max(14, pin.x));

  return (
    <div
      className="absolute z-40 w-[240px] rounded-2xl border border-[#2D2D30] bg-[#161616] p-4 shadow-2xl"
      style={{
        left: `${leftPct}%`,
        top: placeBelow ? `${pin.y}%` : `${pin.y}%`,
        transform: placeBelow
          ? "translate(-50%, 18px)"
          : "translate(-50%, calc(-100% - 14px))",
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="font-sans text-[13px] font-[590] uppercase leading-tight tracking-[-0.02em] text-[#FDFDFF]">
        {pin.label}
      </p>
      <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {pin.customer?.trim() || "—"}
      </p>

      <div className="mt-3 space-y-2.5 border-t border-[#2D2D30] pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Open Jobs
          </span>
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {pin.openJobs ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            GPS Status
          </span>
          <DashboardBadge variant={gpsSet ? "success" : "error"} pill>
            {gpsSet ? "Set" : "Missing"}
          </DashboardBadge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Geofence Radius
          </span>
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {pin.geofenceRadius?.trim() || "—"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenSite?.(pin.id)}
        className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#4ADE80] transition-opacity hover:opacity-80"
      >
        Open Site
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}

export function CrmMapPanel({
  title,
  subtitle,
  pins,
  legend,
  selectedId,
  onPinClick,
  onOpenSite,
  className,
  size = "default",
  /** When true, every ACTIVE pin gets a blue dashed ring (Locations map design). */
  ringActive = false,
}: {
  title: string;
  subtitle: string;
  pins: CrmMapPin[];
  legend?: LegendItem[];
  selectedId?: string | null;
  onPinClick?: (id: string) => void;
  /** Pin popover “Open Site” action */
  onOpenSite?: (id: string) => void;
  /** @deprecated ignored — status comes from each pin */
  pinMode?: "active" | "geofenced";
  className?: string;
  size?: "default" | "full";
  ringActive?: boolean;
}) {
  const legendItems: LegendItem[] = legend ?? [
    { label: "Active", tone: "active" },
    { label: "Inactive", tone: "inactive" },
    { label: "GPS Missing", tone: "gps-missing" },
  ];

  const mapMinH =
    size === "full"
      ? "min-h-[520px] md:min-h-[640px]"
      : "min-h-[400px] md:min-h-[520px]";

  const selectedPin = selectedId
    ? pins.find((p) => p.id === selectedId)
    : undefined;

  return (
    <DashboardPanel className={cn("overflow-visible", className)}>
      <div className="relative z-10 px-4 pt-4 pb-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-white">
            <MapPinIcon />
          </span>
          <div>
            <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {title}
            </h2>
            <p className="mt-1.5 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[11px]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div
        className={`relative z-20 overflow-visible border-t border-divider bg-[#121212] p-4 ${mapMinH}`}
        onClick={() => onPinClick?.("")}
      >
        <div
          className="absolute inset-4 rounded-sm opacity-[0.28]"
          style={{
            backgroundImage:
              "linear-gradient(#3E3E3E 1px, transparent 1px), linear-gradient(90deg, #3E3E3E 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
          aria-hidden
        />

        {pins.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              No wells with coordinates to plot
            </p>
          </div>
        ) : (
          pins.map((pin) => {
            const tone = pinTone(pin);
            const selected = selectedId
              ? selectedId === pin.id
              : Boolean(pin.selected);
            const showRing =
              Boolean(pin.geofenced) ||
              selected ||
              (ringActive && tone === "active");
            const dotClass =
              tone === "active"
                ? "bg-[#4ADE80] ring-[#4ADE80]/40"
                : tone === "gps-missing"
                  ? "bg-[#F87171] ring-[#F87171]/40"
                  : "bg-[#6B6B6B] ring-[#6B6B6B]/35";
            return (
              <button
                key={pin.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPinClick?.(pin.id);
                }}
                title={pin.label}
                className="absolute flex items-center gap-2 text-left transition-transform hover:scale-[1.03]"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: selected ? 20 : 10,
                }}
              >
                <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {showRing ? (
                    <span
                      className={`absolute rounded-full border border-dashed border-[#60A5FA]/95 ${
                        selected ? "h-9 w-9" : "h-8 w-8"
                      }`}
                    />
                  ) : null}
                  <span
                    className={`relative h-2.5 w-2.5 rounded-full ring-2 ${dotClass} ${
                      selected ? "h-3 w-3" : ""
                    }`}
                  />
                </span>
                <span
                  className={`whitespace-nowrap font-sans text-[9px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[10px] ${
                    selected ? "text-[#FDFDFF]" : "text-[#D4D4D4]"
                  }`}
                >
                  {pin.label}
                </span>
              </button>
            );
          })
        )}

        {selectedPin ? (
          <MapPinPopover pin={selectedPin} onOpenSite={onOpenSite} />
        ) : null}

        <div className="pointer-events-none absolute bottom-4 left-4">
          <MapLegend items={legendItems} />
        </div>
      </div>
    </DashboardPanel>
  );
}

export function CrmLocationsListPanel({
  cards,
  countLabel,
  className,
  selectedId,
  onCardClick,
  renderCardActions,
}: {
  cards: CrmLocationCard[];
  countLabel: string;
  className?: string;
  selectedId?: string | null;
  onCardClick?: (id: string) => void;
  renderCardActions?: (card: CrmLocationCard) => React.ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <p className="mb-3 font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
        {countLabel}
      </p>
      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-0.5 md:max-h-[560px]">
        {cards.map((card) => {
          const selected = selectedId === card.id;
          return (
            <div
              key={card.id}
              role={onCardClick ? "button" : undefined}
              tabIndex={onCardClick ? 0 : undefined}
              onClick={() => onCardClick?.(card.id)}
              onKeyDown={(e) => {
                if (!onCardClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick(card.id);
                }
              }}
              className={`flex w-full items-start justify-between gap-3 rounded-[12px] border px-4 py-3.5 text-left transition-colors ${
                selected
                  ? "border-[#FDFDFF]/35 bg-[#242424]"
                  : "border-[#3E3E3E] bg-[#1E1E1E] hover:bg-[#2A2A2A]/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[13px] font-[510] uppercase leading-tight tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                  {card.name}
                </p>
                <p className="mt-1.5 font-sans text-[10px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[11px]">
                  {card.customer} · {card.city}
                </p>
                <p className="mt-1 font-sans text-[10px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[11px]">
                  {card.openJobs} Open Jobs · {card.gpsStatus}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <DashboardBadge
                  variant={card.status.variant}
                  pill
                  className="max-w-full"
                >
                  {card.status.label}
                </DashboardBadge>
                {renderCardActions?.(card)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CrmViewModeToggle({
  value,
  onChange,
}: {
  value: "list" | "map" | "split";
  onChange: (v: "list" | "map" | "split") => void;
}) {
  const modes: { id: "list" | "map" | "split"; label: string }[] = [
    { id: "split", label: "Split" },
    { id: "list", label: "List" },
    { id: "map", label: "Map" },
  ];
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[#3E3E3E]">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={`px-4 py-2.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors md:text-[12px] ${
            value === mode.id
              ? "bg-[#FDFDFF] text-[#0D0D0D]"
              : "bg-transparent text-[#959597] hover:text-[#FDFDFF]"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
