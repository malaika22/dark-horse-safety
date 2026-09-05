"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardRowActionMenu,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  CrmLocationsListPanel,
  CrmMapPanel,
  type CrmLocationCard,
  type CrmMapPin,
} from "./crm-map-split-view";
import { crmApi, downloadCsv } from "@/lib/crm-api";
import { mapRouteLocationCard } from "@/lib/crm-mappers";
import { kpiCellsFromApi, latLngToMapPin } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { ROUTE_RULES_KPI_SHELL, ROUTE_RULES_SORT_OPTIONS } from "./crm-constants";

type RouteFilters = {
  customer: string;
  site: string;
  gpsRequired: boolean;
  geofenceFrom: string;
  geofenceTo: string;
  routeAssigned: boolean;
};

const DEFAULT_FILTERS: RouteFilters = {
  customer: "",
  site: "",
  gpsRequired: false,
  geofenceFrom: "",
  geofenceTo: "",
  routeAssigned: false,
};

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

function ClipboardIcon({ className }: { className?: string }) {
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
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function FilterChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="relative min-w-0 max-w-[200px] flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
          <FilterChevronIcon />
        </span>
      </div>
    </div>
  );
}

function FilterToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
            checked
              ? "translate-x-[18px] bg-[#1A1A1A]"
              : "translate-x-1 bg-[#FDFDFF]"
          }`}
        />
      </button>
    </div>
  );
}

function FilterRangeRow({
  label,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          type="text"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
        <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
          -
        </span>
        <input
          type="text"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
      </div>
    </div>
  );
}

function RouteRulesFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  siteOptions,
  onCustomerChange,
}: {
  open: boolean;
  onClose: () => void;
  value: RouteFilters;
  onChange: (f: RouteFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  siteOptions: { value: string; label: string }[];
  onCustomerChange?: (customerId: string) => void;
}) {
  function patch(p: Partial<RouteFilters>) {
    onChange({ ...value, ...p });
  }

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close filters backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Filters
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <FilterSelectRow
            label="Customer"
            value={value.customer}
            options={customerOptions}
            onChange={(v) => {
              patch({ customer: v, site: "" });
              onCustomerChange?.(v);
            }}
          />
          <FilterSelectRow
            label="Site"
            value={value.site}
            options={siteOptions}
            onChange={(v) => patch({ site: v })}
          />
          <FilterToggleRow
            label="GPS Required?"
            checked={value.gpsRequired}
            onChange={(v) => patch({ gpsRequired: v })}
          />
          <FilterRangeRow
            label="Geofence Radius"
            from={value.geofenceFrom}
            to={value.geofenceTo}
            onFromChange={(v) => patch({ geofenceFrom: v })}
            onToChange={(v) => patch({ geofenceTo: v })}
          />
          <FilterToggleRow
            label="Route Assigned?"
            checked={value.routeAssigned}
            onChange={(v) => patch({ routeAssigned: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onApply();
                onClose();
              }}
            >
              Apply
            </DashboardToolbarButton>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function RouteRulesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("name");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<RouteFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<RouteFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("ROUTE_RULES");

  const { customers, locations, reloadEntities } = useCrmLookups({
    includeLocations: true,
  });

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.site) params.locationId = appliedFilters.site;
    if (appliedFilters.gpsRequired) params.gpsRequired = true;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading } = useCrmList({
    list: (p) => crmApi.listRouteRules(p),
    mapRow: mapRouteLocationCard,
    kpi: () => crmApi.routeRulesKpi(),
    q: query,
    page: 1,
    pageSize: 100,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(ROUTE_RULES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const [mapPins, setMapPins] = React.useState<CrmMapPin[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.locationsMapPins();
        if (cancelled) return;
        setMapPins(
          res.data.map((pin) => {
            const mapped = latLngToMapPin(
              pin.id,
              pin.label ?? pin.name ?? pin.id,
              pin.latitude,
              pin.longitude,
              pin.active ?? true,
            );
            return {
              id: mapped.id,
              label: mapped.label,
              x: pin.x ?? mapped.x,
              y: pin.y ?? mapped.y,
              highlighted: mapped.active,
            };
          }),
        );
      } catch (err) {
        toastApiError(err);
        setMapPins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport() {
    try {
      const res = await crmApi.exportRouteRules({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        ...extraParams,
      });
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  void total;
  const listCards: CrmLocationCard[] = rows;

  return (
    <div className={`space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5 ${loading ? "opacity-60" : ""}`}>
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search Route Rules"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
        filters={
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
            rightIcon={
              <FilterCheckMarkIcon className="shrink-0 text-[#959597]" />
            }
            onClick={() => {
              setDraftFilters(appliedFilters);
              setFiltersOpen(true);
            }}
          >
            Filter
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardSortMenu
              options={ROUTE_RULES_SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
              showDirectionInTrigger={false}
            />
            <DashboardToolbarButton
              leftIcon={<ClipboardIcon className="shrink-0" />}
              onClick={() => setSavedViewsOpen(true)}
            >
              Payroll Review
            </DashboardToolbarButton>
            <DashboardExportMenu
              items={[
                { id: "view-csv", label: "Export current view • CSV", onSelect: () => void handleExport() },
                { id: "all-csv", label: "Export all • CSV", onSelect: () => void handleExport() },
                { id: "pdf", label: "Export as PDF" },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
        <CrmMapPanel
          title="Map View"
          subtitle="Geofenced Sites and Route Rules"
          pins={mapPins}
          pinMode="geofenced"
          legend={[
            { label: "Geofenced", variant: "primary" },
            { label: "No Geofence", variant: "muted" },
          ]}
        />
        <CrmLocationsListPanel
          cards={listCards}
          countLabel={`Locations · ${listCards.length} Wells`}
          renderCardActions={(card) => (
            <DashboardRowActionMenu
              items={[
                {
                  id: "edit",
                  label: "Edit Rule",
                  onSelect: () =>
                    router.push(`/crm/route-rules/${card.id}/edit`),
                },
                { id: "geofence", label: "Adjust Geofence on Map" },
                { id: "test", label: "Test with a Sample Coordinate" },
                { id: "copy", label: "Copy to Another Site" },
                { id: "flags", label: "View GPS Flags Raised Here" },
                { id: "delete", label: "Delete Rule", destructive: true },
              ]}
            />
          )}
        />
      </div>

      <RouteRulesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setFiltersApplied(false);
          void reloadEntities();
        }}
        customerOptions={customers}
        siteOptions={locations}
        onCustomerChange={(customerId) => {
          void reloadEntities({
            customerId: customerId || undefined,
          });
        }}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) void createView(`${source.label} copy`);
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name);
        }}
      />
    </div>
  );
}
