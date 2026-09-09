"use client";

import * as React from "react";
import {
  DashboardExportMenu,
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
  useScrollLock,
} from "@dark-horse-safety/ui";
import {
  CrmLocationsListPanel,
  CrmMapPanel,
  CrmViewModeToggle,
  type CrmLocationCard,
  type CrmMapPin,
} from "./crm-map-split-view";
import { CustomerSitesTable } from "./location-sites-table";
import { LocationWellDetailsDrawer } from "./location-well-details-drawer";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapLocationCard } from "@/lib/crm-mappers";
import { kpiCellsFromApi, latLngToMapPin } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmListEmptyState } from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import { LOCATIONS_KPI_SHELL, LOCATIONS_SORT_OPTIONS } from "./crm-constants";

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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
        />
        <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
          -
        </span>
        <input
          type="text"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
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
  customerOptions,
  countyOptions,
  statusOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: LocationFilters;
  onChange: (f: LocationFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  countyOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}) {
  useScrollLock(open);
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-hidden">
          <FilterSelectRow
            label="Customer"
            value={value.customer}
            options={customerOptions}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterSelectRow
            label="County"
            value={value.county}
            options={countyOptions}
            onChange={(v) => patch({ county: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={statusOptions}
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
  const { askConfirm, dialogs } = useCrmDialogs();
  const [query, setQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"list" | "map" | "split">(
    "split",
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState("customer");
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
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("LOCATIONS");

  const { lookups, customers } = useCrmLookups({ includeLocations: false });
  const countyOptions = lookupOptions(lookups, "counties");
  const statusOptions = lookupOptions(lookups, "locationStatuses");

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.county) params.county = appliedFilters.county;
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.gpsRuleSet) params.gpsRequired = true;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, error, reload } = useCrmList({
    list: (p) => crmApi.listLocations(p),
    mapRow: mapLocationCard,
    kpi: () => crmApi.locationsKpi(),
    q: query,
    page: 1,
    pageSize: 100,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(() => {
    const inactiveDetail =
      typeof kpiData.inactiveDetail === "string"
        ? kpiData.inactiveDetail
        : undefined;
    const counts: Record<string, number | string> = { ...kpiData };
    delete counts.inactiveDetail;
    const cells = kpiCellsFromApi(LOCATIONS_KPI_SHELL, counts);
    if (!inactiveDetail) return cells;
    return cells.map((cell) =>
      cell.title.toLowerCase() === "inactive"
        ? { ...cell, value: "", meta: inactiveDetail.toUpperCase() }
        : cell,
    );
  }, [kpiData]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection,
      query,
      filtersApplied,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: LocationFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_LOCATION_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ??
          Object.values(nextFilters).some((v) =>
            typeof v === "boolean" ? v : Boolean(v),
          ),
      );
    } else if (typeof p.filtersApplied === "boolean") {
      setFiltersApplied(p.filtersApplied);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  const [mapPins, setMapPins] = React.useState<CrmMapPin[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.locationsMapPins();
        if (cancelled) return;
        setMapPins(
          res.data.map((pin) => {
            const label = pin.label ?? pin.name ?? pin.id;
            const mapped = latLngToMapPin(
              pin.id,
              label,
              pin.latitude,
              pin.longitude,
              pin.active ?? pin.status !== "INACTIVE",
            );
            if (!mapped) return null;
            const gpsMissing =
              pin.latitude == null ||
              pin.longitude == null ||
              /missing|not set|unset|offline/i.test(pin.gpsStatus ?? "");
            const status =
              pin.status === "INACTIVE"
                ? ("inactive" as const)
                : gpsMissing
                  ? ("gps-missing" as const)
                  : ("active" as const);
            return {
              id: mapped.id,
              label: mapped.label,
              x: pin.x ?? mapped.x,
              y: pin.y ?? mapped.y,
              status,
              geofenced: Boolean(pin.geofenceRadius) && status === "active",
              customer: pin.customer?.name ?? "",
              openJobs: pin.openJobs ?? 0,
              gpsSet: !gpsMissing,
              geofenceRadius: pin.geofenceRadius ?? null,
            };
          }).filter((pin): pin is NonNullable<typeof pin> => pin != null),
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

  const displayPins = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const enriched =
      rows.length === 0
        ? mapPins
        : mapPins.map((pin) => {
            const row = rows.find((r) => r.id === pin.id);
            if (!row) return pin;
            const gpsMissing = !row.gpsSet;
            const status =
              row.status.label.toUpperCase() === "INACTIVE"
                ? ("inactive" as const)
                : gpsMissing
                  ? ("gps-missing" as const)
                  : ("active" as const);
            return {
              ...pin,
              status,
              geofenced: Boolean(row.geofenceRadius) || pin.geofenced,
              label: row.name || pin.label,
              customer: row.customer,
              openJobs: row.openJobs,
              gpsSet: row.gpsSet,
              geofenceRadius: row.geofenceRadius ?? null,
            };
          });
    if (!q) return enriched;
    return enriched.filter((p) => p.label.toLowerCase().includes(q));
  }, [mapPins, rows, query]);

  async function handleExport() {
    try {
      const res = await crmApi.exportLocations({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        ...extraParams,
      });
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportPdf() {
    try {
      const res = await crmApi.exportLocations({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "pdf",
        ...extraParams,
      });
      if (!res.data.pdf) throw new Error("No PDF");
      downloadPdf(res.data.pdf, res.data.filename);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleExportExcel() {
    try {
      const res = await crmApi.exportLocations({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: "xlsx",
        ...extraParams,
      });
      if (!res.data.xlsx) throw new Error("No Excel file");
      downloadXlsx(res.data.xlsx, res.data.filename);
      toastSuccess("Excel downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleArchive(id: string) {
    const ok = await askConfirm({
      title: "Archive location",
      description: "Archive this location? It will be removed from active lists.",
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveLocation(id);
      toastSuccess("Location archived");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  const listCards: CrmLocationCard[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    customer: r.customer,
    customerId: r.customerId,
    city: r.city,
    openJobs: r.openJobs,
    gpsStatus: r.gpsStatus,
    geofenceRadius: r.geofenceRadius,
    status: r.status,
  }));
  const showMap = viewMode === "map" || viewMode === "split";
  const showList = viewMode === "list" || viewMode === "split";

  function openDetails(id: string) {
    setSelectedId(id);
    setDetailsId(id);
  }

  function selectLocation(id: string) {
    setSelectedId(id);
  }

  function viewOnMap(id: string) {
    setDetailsId(null);
    setSelectedId(id);
    setViewMode((prev) => (prev === "list" ? "split" : prev));
  }

  return (
    <CrmListLoadGate
      loading={loading}
      hasData={!initialLoading}
      error={error}
      onRetry={reload}
      kpiCount={4}
    >
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="space-y-3">
        <CrmViewModeToggle value={viewMode} onChange={setViewMode} />
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <DashboardSearchInput
                placeholder="Search Well"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
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
          </div>
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:justify-end">
            <DashboardSortMenu
              options={LOCATIONS_SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
              showDirectionInTrigger={false}
            />
            <DashboardExportMenu
              items={[
                {
                  id: "view-csv",
                  label: "Export current view • CSV",
                  onSelect: () => void handleExport(),
                },
                {
                  id: "all-csv",
                  label: "Export all • CSV",
                  onSelect: () => void handleExport(),
                },
                {
                  id: "xlsx",
                  label: "Export as Excel",
                  onSelect: () => void handleExportExcel(),
                },
                {
                  id: "pdf",
                  label: "Export as PDF",
                  onSelect: () => void handleExportPdf(),
                },
                {
                  id: "views",
                  label: "Saved views…",
                  onSelect: () => setSavedViewsOpen(true),
                },
              ]}
            />
          </div>
        </div>
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
            pins={displayPins}
            selectedId={selectedId}
            onPinClick={(id) => setSelectedId(id || null)}
            onOpenSite={(id) => openDetails(id)}
            size={viewMode === "map" ? "full" : "default"}
            ringActive
            className={viewMode === "map" ? "w-full" : undefined}
          />
        ) : null}
        {showList ? (
          (viewMode === "list" ? rows : listCards).length === 0 ? (
            <CrmListEmptyState
              query={query}
              filtersActive={filtersApplied}
              emptyDescription="Create your first location to get started."
              createLabel="+ New Location"
              createHref="/crm/locations/new"
              onClearFilters={() => {
                setDraftFilters(DEFAULT_LOCATION_FILTERS);
                setAppliedFilters(DEFAULT_LOCATION_FILTERS);
                setFiltersApplied(false);
              }}
              onClearSearch={() => setQuery("")}
            />
          ) : viewMode === "list" ? (
            <CustomerSitesTable
              rows={rows.filter((r) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  r.name.toLowerCase().includes(q) ||
                  r.customer.toLowerCase().includes(q) ||
                  r.city.toLowerCase().includes(q)
                );
              })}
              totalLabel={total || rows.length}
              onRowClick={openDetails}
            />
          ) : (
            <CrmLocationsListPanel
              cards={listCards.filter((c) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.customer.toLowerCase().includes(q) ||
                  c.city.toLowerCase().includes(q)
                );
              })}
              countLabel={`Locations · ${listCards.length} Wells`}
              selectedId={selectedId}
              onCardClick={selectLocation}
              renderCardActions={(card) => (
                <DashboardRowActionMenu
                  items={[
                    {
                      id: "details",
                      label: "View Details",
                      onSelect: () => openDetails(card.id),
                    },
                    {
                      id: "map",
                      label: "View on Map",
                      onSelect: () => {
                        setSelectedId(card.id);
                      },
                    },
                    {
                      id: "archive",
                      label: "Archive / Deactivate",
                      destructive: true,
                      onSelect: () => void handleArchive(card.id),
                    },
                  ]}
                />
              )}
            />
          )
        ) : null}
      </div>

      <LocationWellDetailsDrawer
        open={Boolean(detailsId)}
        locationId={detailsId}
        onClose={() => setDetailsId(null)}
        onViewOnMap={viewOnMap}
      />

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
        customerOptions={customers}
        countyOptions={countyOptions}
        statusOptions={statusOptions}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={(viewId) => {
          setActiveViewId(viewId);
          const view = savedViews.find((v) => v.id === viewId);
          if (view?.payload != null) applySavedViewPayload(view.payload);
        }}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) {
              void createView(
                `${source.label} copy`,
                (source.payload as Record<string, unknown> | undefined) ??
                  currentViewPayload(),
              );
            }
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />
      {dialogs}
    </div>
    </CrmListLoadGate>
  );
}
