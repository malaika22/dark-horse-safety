"use client";

import * as React from "react";
import {
  DashboardPanel,
  DashboardPanelTitle,
  DashboardRowActionMenu,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  cn,
  type DashboardMenuItem,
} from "@dark-horse-safety/ui";
import { latLngToMapPin } from "@/lib/crm-ui";

export type RouteViewMode = "split" | "list" | "map";

export type RouteMapSite = {
  id: string;
  locationId: string;
  label: string;
  customer: string;
  latitude: number | null;
  longitude: number | null;
  ruleSource: string;
  gpsMode: "required" | "optional" | "not_required";
  flagCount: number;
  radiusFt: number;
  radiusLabel: string;
  geofenceRadius: string;
};

export type RouteHierarchyItem = {
  id: string;
  name: string;
  detail: string;
  meta?: string;
  gpsTone?: "required" | "optional" | "not_required";
  locationId?: string | null;
};

export type RouteGpsFlagRow = {
  id: string;
  site: string;
  siteId: string;
  customer: string;
  technician: string;
  technicianInitials: string;
  flaggedAt: string;
  flagType: string;
  distanceOutside: string | null;
  radiusApplied: string | null;
  ruleSource: string;
  outcome: string;
  routeRuleId: string | null;
};

export type RouteRuleActions = {
  onEdit?: (id: string) => void;
  onAdjustGeofence?: (id: string) => void;
  onTestCoordinate?: (id: string) => void;
  onCopyToSite?: (id: string) => void;
  onViewGpsFlags?: (id: string, label?: string) => void;
  onResetInherited?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const SOURCE_COLOR: Record<string, string> = {
  SITE_OVERRIDE: "#3B82F6",
  CUSTOMER_DEFAULT: "#A855F7",
  SYSTEM_DEFAULT: "#6B7280",
};

const GPS_DOT: Record<string, string> = {
  required: "#4ADE80",
  optional: "#F5A623",
  not_required: "#6B6B6B",
};

function sourceLabel(source: string) {
  if (source === "SITE_OVERRIDE") return "Site override";
  if (source === "CUSTOMER_DEFAULT") return "Customer default";
  return "System default";
}

function formatFlagTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M5 3v18M5 4h10l-2 4 2 4H5" fill="currentColor" />
    </svg>
  );
}

function FilterCheckMarkIcon({ className }: { className?: string }) {
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
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isSystemVirtualId(id: string) {
  return id === "system-default" || id.startsWith("system-");
}

function resolvedRuleText(site: RouteMapSite) {
  const gps =
    site.gpsMode === "required"
      ? "GPS REQUIRED"
      : site.gpsMode === "optional"
        ? "GPS OPTIONAL"
        : "GPS NOT REQUIRED";
  return `${gps} · ${site.radiusLabel}`;
}

function hierarchyActionItems(
  item: RouteHierarchyItem,
  tone: "customer" | "site",
  actions?: RouteRuleActions,
): DashboardMenuItem[] {
  const items: DashboardMenuItem[] = [
    {
      id: "edit",
      label: "Edit Rule",
      onSelect: () => actions?.onEdit?.(item.id),
    },
    {
      id: "geofence",
      label: "Adjust Geofence on Map",
      onSelect: () => actions?.onAdjustGeofence?.(item.id),
    },
    {
      id: "test",
      label: "Test with a Sample Coordinate",
      onSelect: () => actions?.onTestCoordinate?.(item.id),
    },
    {
      id: "copy",
      label: "Copy to Another Site",
      onSelect: () => actions?.onCopyToSite?.(item.id),
    },
    {
      id: "flags",
      label: "View GPS Flags Raised Here",
      onSelect: () => actions?.onViewGpsFlags?.(item.id, item.name),
    },
  ];
  if (tone === "site") {
    items.push({
      id: "reset",
      label: "Reset to Inherited",
      onSelect: () => actions?.onResetInherited?.(item.id),
    });
  }
  items.push({
    id: "delete",
    label: "Delete Rule",
    destructive: true,
    onSelect: () => actions?.onDelete?.(item.id),
  });
  return items;
}

export function RouteViewModeToggle({
  value,
  onChange,
}: {
  value: RouteViewMode;
  onChange: (v: RouteViewMode) => void;
}) {
  const modes: { id: RouteViewMode; label: string }[] = [
    { id: "split", label: "Split" },
    { id: "list", label: "List" },
    { id: "map", label: "Map" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-[#2D2D30] bg-[#1A1A1A] p-0.5">
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            "rounded-md px-3 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors sm:px-3.5",
            value === m.id
              ? "bg-[#FDFDFF] text-[#121212]"
              : "text-[#959597] hover:text-[#FDFDFF]",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function HierarchyRow({
  item,
  tone,
  actions,
}: {
  item: RouteHierarchyItem;
  tone: "system" | "customer" | "site";
  actions?: RouteRuleActions;
}) {
  const bar =
    tone === "site"
      ? "bg-[#3B82F6]"
      : tone === "customer"
        ? "bg-[#A855F7]"
        : "bg-[#6B7280]";
  const gpsClass =
    item.gpsTone === "required"
      ? "text-[#4ADE80]"
      : item.gpsTone === "optional"
        ? "text-[#F5A623]"
        : item.gpsTone === "not_required"
          ? "text-[#959597]"
          : "text-[#FDFDFF]";

  const showMenu = tone === "customer" || tone === "site";

  return (
    <div className="flex w-full items-stretch gap-0 border-b border-[#2D2D30] text-left transition-colors last:border-b-0 hover:bg-[#1F1F1F]">
      <span className={cn("w-1 shrink-0 self-stretch", bar)} />
      <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
        <p className="truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {item.name}
        </p>
        <p
          className={cn(
            "mt-1.5 font-sans text-[10px] uppercase tracking-[-0.02em]",
            gpsClass,
          )}
        >
          {item.detail}
        </p>
        {item.meta ? (
          <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            {item.meta}
          </p>
        ) : null}
      </div>
      {showMenu ? (
        <div className="flex shrink-0 items-center pr-2 sm:pr-3">
          <DashboardRowActionMenu
            items={hierarchyActionItems(item, tone, actions)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function RouteRulesHierarchyList({
  systemDefault,
  customerDefaults,
  siteOverrides,
  compact,
  actions,
}: {
  systemDefault: RouteHierarchyItem & { appliesTo?: number };
  customerDefaults: RouteHierarchyItem[];
  siteOverrides: RouteHierarchyItem[];
  compact?: boolean;
  actions?: RouteRuleActions;
}) {
  const total = 1 + customerDefaults.length + siteOverrides.length;

  return (
    <DashboardPanel className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <DashboardPanelTitle
          icon="activity"
          title="GPS / Route Rules"
          trailing={
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              {total} Rules · Most specific wins
            </span>
          }
        />
        {!compact ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              { label: "Site Override", color: "#3B82F6" },
              { label: "Customer Default", color: "#A855F7" },
              { label: "System Default", color: "#6B7280" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="font-sans text-[9px] uppercase tracking-[-0.02em] text-[#959597]">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#2D2D30]">
        <p className="px-4 py-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] sm:px-5">
          System Default
        </p>
        <HierarchyRow
          tone="system"
          item={{
            ...systemDefault,
            meta:
              systemDefault.appliesTo != null
                ? `Applies to ${systemDefault.appliesTo} sites with no override`
                : systemDefault.meta,
          }}
        />

        <p className="px-4 py-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] sm:px-5">
          Customer Defaults · {customerDefaults.length}
        </p>
        {customerDefaults.length === 0 ? (
          <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
            No customer defaults
          </p>
        ) : (
          customerDefaults.map((item) => (
            <HierarchyRow
              key={item.id}
              tone="customer"
              item={item}
              actions={actions}
            />
          ))
        )}

        <p className="px-4 py-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] sm:px-5">
          Site Overrides · {siteOverrides.length}
        </p>
        {siteOverrides.length === 0 ? (
          <p className="px-4 py-3 font-sans text-[11px] uppercase text-[#959597] sm:px-5">
            No site overrides
          </p>
        ) : (
          siteOverrides.map((item) => (
            <HierarchyRow
              key={item.id}
              tone="site"
              item={item}
              actions={actions}
            />
          ))
        )}
      </div>
    </DashboardPanel>
  );
}

function MapPinPopover({
  site,
  x,
  y,
  onEditRule,
}: {
  site: RouteMapSite;
  x: number;
  y: number;
  onEditRule?: (ruleId: string) => void;
}) {
  const placeBelow = y < 36;
  const leftPct = Math.min(86, Math.max(14, x));
  const systemRule = isSystemVirtualId(site.id);
  const tooTight = site.flagCount >= 3 && site.radiusFt <= 600;

  return (
    <div
      className="absolute z-40 w-[260px] rounded-2xl border border-[#2D2D30] bg-[#161616] p-4 shadow-2xl"
      style={{
        left: `${leftPct}%`,
        top: `${y}%`,
        transform: placeBelow
          ? "translate(-50%, 18px)"
          : "translate(-50%, calc(-100% - 14px))",
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="font-sans text-[13px] font-[590] uppercase leading-tight tracking-[-0.02em] text-[#FDFDFF]">
        {site.label}
      </p>
      <p className="mt-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {site.customer?.trim() || "—"}
      </p>

      <div className="mt-3 space-y-2.5 border-t border-[#2D2D30] pt-3">
        <div className="flex items-start justify-between gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Resolved Rule
          </span>
          <span className="max-w-[150px] text-right font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {resolvedRuleText(site)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Source
          </span>
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  SOURCE_COLOR[site.ruleSource] ?? SOURCE_COLOR.SYSTEM_DEFAULT,
              }}
            />
            {sourceLabel(site.ruleSource)}
          </span>
        </div>
        {site.flagCount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              GPS Flags
            </span>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#F87171]">
              {tooTight
                ? `${site.flagCount} · Too tight?`
                : String(site.flagCount)}
            </span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={systemRule}
        onClick={() => {
          if (!systemRule) onEditRule?.(site.id);
        }}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-opacity",
          systemRule
            ? "cursor-not-allowed text-[#4ADE80]/40"
            : "text-[#4ADE80] hover:opacity-80",
        )}
      >
        Edit Rule
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}

export function RouteGeofenceMap({
  sites,
  selectedId,
  onSelect,
  onEditRule,
  tall,
}: {
  sites: RouteMapSite[];
  selectedId?: string | null;
  onSelect?: (locationId: string | null) => void;
  onEditRule?: (ruleId: string) => void;
  tall?: boolean;
}) {
  const pins = React.useMemo(() => {
    return sites
      .map((s) => {
        const mapped = latLngToMapPin(
          s.locationId,
          s.label,
          s.latitude,
          s.longitude,
          true,
        );
        if (!mapped) return null;
        return { ...s, x: mapped.x, y: mapped.y };
      })
      .filter((p): p is NonNullable<typeof p> => p != null);
  }, [sites]);

  const selectedPin = selectedId
    ? pins.find((p) => p.locationId === selectedId)
    : undefined;

  return (
    <DashboardPanel className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <DashboardPanelTitle
          icon="activity"
          title="Map View"
          trailing={
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              Geofenced sites and route rules
            </span>
          }
        />
      </div>
      <div
        className={cn(
          "relative border-t border-[#2D2D30] bg-[#121212]",
          tall
            ? "min-h-[520px] md:min-h-[640px]"
            : "min-h-[360px] md:min-h-[480px]",
        )}
        onClick={() => onSelect?.(null)}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {pins.map((pin) => {
          const ring =
            SOURCE_COLOR[pin.ruleSource] ?? SOURCE_COLOR.SYSTEM_DEFAULT;
          const dot = GPS_DOT[pin.gpsMode] ?? GPS_DOT.required;
          const size = Math.min(160, Math.max(56, pin.radiusFt / 8));
          const selected = selectedId === pin.locationId;
          return (
            <button
              key={pin.locationId}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                zIndex: selected ? 30 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(
                  selectedId === pin.locationId ? null : pin.locationId,
                );
              }}
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-80"
                style={{
                  width: size,
                  height: size,
                  borderColor: ring,
                  boxShadow: selected ? `0 0 0 1px ${ring}` : undefined,
                }}
              />
              <span
                className="relative z-10 block h-2.5 w-2.5 rounded-full ring-2 ring-[#121212]"
                style={{ backgroundColor: dot }}
              />
              <span className="absolute left-3 top-[-2px] whitespace-nowrap font-sans text-[9px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] sm:text-[10px]">
                {pin.label}
              </span>
              <span className="absolute left-3 top-3 whitespace-nowrap font-sans text-[8px] uppercase tracking-[-0.02em] text-[#959597]">
                {pin.radiusLabel}
              </span>
              {pin.flagCount > 0 ? (
                <span className="absolute -right-5 -top-4 inline-flex items-center gap-0.5 rounded bg-[#DC2626] px-1 py-0.5 font-sans text-[8px] font-[590] text-white">
                  <FlagIcon />
                  {pin.flagCount}
                </span>
              ) : null}
            </button>
          );
        })}

        {selectedPin ? (
          <MapPinPopover
            site={selectedPin}
            x={selectedPin.x}
            y={selectedPin.y}
            onEditRule={onEditRule}
          />
        ) : null}

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-[#2D2D30] bg-[#161616]/90 px-3 py-2 backdrop-blur-sm">
          {[
            { label: "Required", color: GPS_DOT.required },
            { label: "Optional", color: GPS_DOT.optional },
            { label: "Not Required", color: GPS_DOT.not_required },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              <span className="font-sans text-[9px] uppercase text-[#959597]">
                {l.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[#DC2626]">
            <FlagIcon />
            <span className="font-sans text-[9px] uppercase text-[#959597]">
              GPS Flags
            </span>
          </div>
          {[
            { label: "Site Override", color: SOURCE_COLOR.SITE_OVERRIDE },
            {
              label: "Customer Default",
              color: SOURCE_COLOR.CUSTOMER_DEFAULT,
            },
            { label: "System Default", color: SOURCE_COLOR.SYSTEM_DEFAULT },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full border border-dashed"
                style={{ borderColor: l.color }}
              />
              <span className="font-sans text-[9px] uppercase text-[#959597]">
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}

function flagTypeClass(type: string) {
  if (/home/i.test(type)) return "bg-[#7A5C1E] text-[#F5D78E]";
  if (/outside/i.test(type)) return "bg-[#7A3E1E] text-[#F5A623]";
  if (/unavailable/i.test(type)) return "bg-[#5C4A2A] text-[#D4B483]";
  if (/accuracy/i.test(type)) return "bg-[#6B4E1E] text-[#E8C07A]";
  return "bg-[#2A2A2A] text-[#FDFDFF]";
}

function sourcePillClass(source: string) {
  if (source === "SITE_OVERRIDE") return "bg-[#1E3A5F] text-[#93C5FD]";
  if (source === "CUSTOMER_DEFAULT") return "bg-[#3B1F5C] text-[#D8B4FE]";
  return "bg-[#2A2A2A] text-[#A1A1AA]";
}

function outcomeClass(outcome: string) {
  if (/accept/i.test(outcome)) return "text-[#4ADE80]";
  if (/reject/i.test(outcome)) return "text-[#F87171]";
  return "text-[#F5A623]";
}

export function RouteGpsFlagsSection({
  flags,
  summary,
  insight,
  groupBy,
  onGroupByChange,
  onAdjustRadius,
  onReview,
  onOpenFilters,
}: {
  flags: RouteGpsFlagRow[];
  summary: { total: number; sites: number };
  insight: { site: string; message: string; routeRuleId: string | null } | null;
  groupBy: "site" | "date";
  onGroupByChange: (v: "site" | "date") => void;
  onAdjustRadius?: (routeRuleId: string | null) => void;
  onReview?: (flagId: string) => void;
  onOpenFilters?: () => void;
}) {
  const sorted = React.useMemo(() => {
    const rows = [...flags];
    if (groupBy === "site") {
      rows.sort(
        (a, b) =>
          a.site.localeCompare(b.site) ||
          b.flaggedAt.localeCompare(a.flaggedAt),
      );
    } else {
      rows.sort((a, b) => b.flaggedAt.localeCompare(a.flaggedAt));
    }
    return rows;
  }, [flags, groupBy]);

  return (
    <DashboardPanel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 sm:px-5">
        <DashboardPanelTitle
          icon="lightning"
          title="GPS Flags — Last 30 Days"
          trailing={
            <span className="rounded bg-[#5C3A1E] px-2 py-0.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#F5A623]">
              {summary.total} Flags · {summary.sites} Sites
            </span>
          }
        />
      </div>

      {insight ? (
        <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#5C3A1E] bg-[#2A1F12] px-3 py-2.5 sm:mx-5">
          <p className="min-w-0 flex-1 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C07A]">
            {insight.message}
          </p>
          <button
            type="button"
            onClick={() => onAdjustRadius?.(insight.routeRuleId)}
            className="shrink-0 rounded-md border border-[#5C3A1E] bg-[#1A1A1A] px-3 py-1.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]"
          >
            Adjust Radius
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2D2D30] px-4 py-2.5 sm:px-5">
        <div className="inline-flex items-center gap-1 rounded-md border border-[#2D2D30] p-0.5">
          <span className="px-2 font-sans text-[10px] uppercase text-[#959597]">
            Group by
          </span>
          {(["site", "date"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGroupByChange(g)}
              className={cn(
                "rounded px-2.5 py-1 font-sans text-[10px] uppercase tracking-[-0.02em]",
                groupBy === g
                  ? "bg-[#FDFDFF] text-[#121212]"
                  : "text-[#959597] hover:text-[#FDFDFF]",
              )}
            >
              By {g}
            </button>
          ))}
        </div>
        {onOpenFilters ? (
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
            rightIcon={
              <FilterCheckMarkIcon className="shrink-0 text-[#959597]" />
            }
            onClick={onOpenFilters}
          >
            Filters
          </DashboardToolbarButton>
        ) : null}
      </div>

      <div className="overflow-x-auto border-t border-[#2D2D30]">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2D2D30]">
              {[
                "Site",
                "Technician",
                "Date / Time",
                "Flag Type",
                "Distance",
                "Rule Source",
                "Outcome",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] sm:px-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 font-sans text-[11px] uppercase text-[#959597]"
                >
                  No GPS flags in the last 30 days
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#2D2D30] last:border-b-0"
                >
                  <td className="px-3 py-3 sm:px-4">
                    <p className="font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                      {row.site}
                    </p>
                    <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                      {row.customer}
                    </p>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[9px] text-[#FDFDFF]">
                        {row.technicianInitials}
                      </span>
                      <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                        {row.technician}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-sans text-[11px] uppercase tabular-nums text-[#FDFDFF] sm:px-4">
                    {formatFlagTime(row.flaggedAt)}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase",
                        flagTypeClass(row.flagType),
                      )}
                    >
                      {row.flagType}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {row.distanceOutside ?? "—"}
                    </p>
                    {row.radiusApplied ? (
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                        radius {row.radiusApplied}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase",
                        sourcePillClass(row.ruleSource),
                      )}
                    >
                      {sourceLabel(row.ruleSource)}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 font-sans text-[11px] uppercase sm:px-4",
                      outcomeClass(row.outcome),
                    )}
                  >
                    {row.outcome.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <button
                      type="button"
                      onClick={() =>
                        row.routeRuleId
                          ? onAdjustRadius?.(row.routeRuleId)
                          : onReview?.(row.id)
                      }
                      className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#93C5FD] hover:underline"
                    >
                      {row.routeRuleId ? "Adjust radius" : "Review"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}
