"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardPanel,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";

export type CrmMapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
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

type LegendItem = { label: string; variant: "primary" | "muted" };

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

function MapLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={
              item.variant === "primary"
                ? "h-2.5 w-2.5 rounded-full bg-white ring-2 ring-white/30"
                : "h-2.5 w-2.5 rounded-full bg-[#5A5A5A]"
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

export function CrmMapPanel({
  title,
  subtitle,
  pins,
  legend,
  pinMode = "active",
  className,
}: {
  title: string;
  subtitle: string;
  pins: CrmMapPin[];
  legend: LegendItem[];
  pinMode?: "active" | "geofenced";
  className?: string;
}) {
  return (
    <DashboardPanel className={className}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2A2A2A] text-white">
            <MapPinIcon />
          </span>
          <div>
            <h2 className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {title}
            </h2>
            <p className="mt-1.5 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[11px]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div className="relative min-h-[360px] border-t border-divider bg-[#1A1A1A] p-4 md:min-h-[440px]">
        <div
          className="absolute inset-4 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#3E3E3E 1px, transparent 1px), linear-gradient(90deg, #3E3E3E 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        {pins.map((pin) => {
          const highlighted = pin.highlighted ?? true;
          const isActive = pinMode === "geofenced" ? highlighted : highlighted;
          return (
            <div
              key={pin.id}
              className="absolute flex items-center gap-1.5"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <span
                className={
                  isActive
                    ? "h-3 w-3 shrink-0 rounded-full bg-white ring-2 ring-white/25"
                    : "h-3 w-3 shrink-0 rounded-full bg-[#5A5A5A]"
                }
              />
              <span className="whitespace-nowrap font-sans text-[9px] font-normal uppercase leading-none tracking-[-0.02em] text-[#C8C8C8] md:text-[10px]">
                {pin.label}
              </span>
            </div>
          );
        })}
        <div className="absolute bottom-4 left-4">
          <MapLegend items={legend} />
        </div>
      </div>
    </DashboardPanel>
  );
}

export function CrmLocationsListPanel({
  cards,
  countLabel,
  className,
  onCardClick,
  renderCardActions,
}: {
  cards: CrmLocationCard[];
  countLabel: string;
  className?: string;
  onCardClick?: (id: string) => void;
  renderCardActions?: (card: CrmLocationCard) => React.ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <p className="mb-3 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
        {countLabel}
      </p>
      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-0.5 md:max-h-[560px]">
        {cards.map((card) => (
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
            className="flex w-full items-start justify-between gap-3 rounded-[12px] border border-[#3E3E3E] bg-[#1E1E1E] px-4 py-3.5 text-left transition-colors hover:bg-[#2A2A2A]/60"
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
        ))}
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
    { id: "list", label: "List" },
    { id: "map", label: "Map" },
    { id: "split", label: "Split" },
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
