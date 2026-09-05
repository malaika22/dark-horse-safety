"use client";

import * as React from "react";
import {
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardSavedView,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  CrmLocationsListPanel,
  CrmMapPanel,
  CrmViewModeToggle,
  type CrmLocationCard,
  type CrmMapPin,
} from "./crm-map-split-view";
import {
  LOCATIONS_CARDS,
  LOCATIONS_KPI,
  LOCATIONS_MAP_PINS,
  LOCATIONS_SAVED_VIEWS,
  LOCATIONS_SORT_OPTIONS,
} from "./data/locations.mock";

type LocationFilters = {
  customer: string;
  county: string;
  status: string;
  hasOpenJobs: boolean;
  gpsRuleSet: boolean;
  geofenceFrom: string;
  geofenceTo: string;
  lastVisitedFrom: string;
  lastVisitedTo: string;
};

const DEFAULT_LOCATION_FILTERS: LocationFilters = {
  customer: "",
  county: "",
  status: "",
  hasOpenJobs: false,
  gpsRuleSet: false,
  geofenceFrom: "",
  geofenceTo: "",
  lastVisitedFrom: "",
  lastVisitedTo: "",
};

const CUSTOMER_OPTIONS = [
  "Permian Basin Energy",
  "Lonestar Oilfield",
  "Delaware Basin Co.",
  "Frontier Energy LLC",
  "Rio Grande Resources",
  "Cactus Well Services",
  "Summit Production",
  "Vaquero Oil & Gas",
];

const COUNTY_OPTIONS = [
  "Midland",
  "Reeves",
  "Winkler",
  "Andrews",
  "Ector",
  "Loving",
];

const STATUS_OPTIONS = ["Active", "Inactive"];

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
  options: string[];
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
            <option key={o} value={o}>
              {o}
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

function LocationsFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  value: LocationFilters;
  onChange: (f: LocationFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}) {
  function patch(p: Partial<LocationFilters>) {
    onChange({ ...value, ...p });
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close filters backdrop"
        className="fixed inset-0 z-[90] bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
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
            options={CUSTOMER_OPTIONS}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterSelectRow
            label="County"
            value={value.county}
            options={COUNTY_OPTIONS}
            onChange={(v) => patch({ county: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={STATUS_OPTIONS}
            onChange={(v) => patch({ status: v })}
          />
          <FilterToggleRow
            label="Has Open Jobs?"
            checked={value.hasOpenJobs}
            onChange={(v) => patch({ hasOpenJobs: v })}
          />
          <FilterToggleRow
            label="GPS Rule Set?"
            checked={value.gpsRuleSet}
            onChange={(v) => patch({ gpsRuleSet: v })}
          />
          <FilterRangeRow
            label="Geofence Radius"
            from={value.geofenceFrom}
            to={value.geofenceTo}
            onFromChange={(v) => patch({ geofenceFrom: v })}
            onToChange={(v) => patch({ geofenceTo: v })}
          />
          <FilterRangeRow
            label="Last Visited"
            from={value.lastVisitedFrom}
            to={value.lastVisitedTo}
            onFromChange={(v) => patch({ lastVisitedFrom: v })}
            onToChange={(v) => patch({ lastVisitedTo: v })}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton
            onClick={onClose}
            className="flex-1 justify-center"
          >
            Close
          </DashboardToolbarButton>
          <DashboardToolbarButton
            onClick={onClearAll}
            className="flex-1 justify-center"
          >
            Clear All
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 justify-center"
          >
            Apply
          </DashboardToolbarButton>
        </div>
      </aside>
    </>
  );
}

export function LocationsPage() {
  const [query, setQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"list" | "map" | "split">(
    "list",
  );
  const [sortField, setSortField] = React.useState("name");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<LocationFilters>(
    DEFAULT_LOCATION_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<LocationFilters>(
    DEFAULT_LOCATION_FILTERS,
  );
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] =
    React.useState<DashboardSavedView[]>(LOCATIONS_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(
    "view-1",
  );

  const filteredCards = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let cards = LOCATIONS_CARDS;
    if (q) {
      cards = cards.filter((card) =>
        [card.name, card.customer, card.city]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filtersApplied) {
      cards = cards.filter((card) => {
        if (
          appliedFilters.customer &&
          card.customer !== appliedFilters.customer
        ) {
          return false;
        }
        if (
          appliedFilters.county &&
          !card.city.toLowerCase().includes(appliedFilters.county.toLowerCase())
        ) {
          return false;
        }
        if (
          appliedFilters.status &&
          card.status.label.toLowerCase() !==
            appliedFilters.status.toLowerCase()
        ) {
          return false;
        }
        if (appliedFilters.hasOpenJobs && card.openJobs <= 0) return false;
        if (
          appliedFilters.gpsRuleSet &&
          card.gpsStatus.toLowerCase() !== "gps set"
        ) {
          return false;
        }
        return true;
      });
    }
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...cards].sort((a, b) => {
      switch (sortField) {
        case "customer":
          return a.customer.localeCompare(b.customer) * dir;
        case "status":
          return a.status.label.localeCompare(b.status.label) * dir;
        case "openJobs":
          return (a.openJobs - b.openJobs) * dir;
        case "name":
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [query, sortField, sortDirection, appliedFilters, filtersApplied]);

  const mapPins: CrmMapPin[] = LOCATIONS_MAP_PINS.map((pin) => ({
    id: pin.id,
    label: pin.label,
    x: pin.x,
    y: pin.y,
    highlighted: pin.active,
  }));

  const listCards: CrmLocationCard[] = filteredCards;
  const showMap = viewMode === "map" || viewMode === "split";
  const showList = viewMode === "list" || viewMode === "split";

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {LOCATIONS_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="space-y-3">
        <CrmViewModeToggle value={viewMode} onChange={setViewMode} />

        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Well"
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
                options={LOCATIONS_SORT_OPTIONS}
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
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv", label: "Export all • CSV" },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
            </>
          }
        />
      </div>

      <div
        className={
          viewMode === "split"
            ? "grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]"
            : "grid grid-cols-1 gap-4"
        }
      >
        {showMap ? (
          <CrmMapPanel
            title="Map View"
            subtitle="Well Locations Across the Permian Basin"
            pins={mapPins}
            pinMode="active"
            legend={[
              { label: "Active", variant: "primary" },
              { label: "Inactive", variant: "muted" },
            ]}
          />
        ) : null}
        {showList ? (
          <CrmLocationsListPanel
            cards={listCards}
            countLabel={`Locations · ${listCards.length} Wells`}
          />
        ) : null}
      </div>

      <LocationsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_LOCATION_FILTERS);
          setAppliedFilters(DEFAULT_LOCATION_FILTERS);
          setFiltersApplied(false);
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
          if (action === "delete") {
            setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (!source) return;
            const id = `view-${Date.now()}`;
            setSavedViews((prev) => [
              ...prev,
              { id, label: `${source.label} copy` },
            ]);
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          const id = `view-${Date.now()}`;
          setSavedViews((prev) => [...prev, { id, label: name }]);
          setActiveViewId(id);
        }}
      />
    </div>
  );
}
