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
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapRouteLocationCard } from "@/lib/crm-mappers";
import { kpiCellsFromApi, latLngToMapPin } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import {
  CrmHistoryModal,
  CrmPickModal,
  CrmPromptFieldsModal,
} from "./crm-action-modals";
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
  const [highlightedLocationId, setHighlightedLocationId] = React.useState<
    string | null
  >(null);
  const [copyPickOpen, setCopyPickOpen] = React.useState(false);
  const [copyRuleId, setCopyRuleId] = React.useState<string | null>(null);
  const [geofenceOpen, setGeofenceOpen] = React.useState(false);
  const [geofenceRuleId, setGeofenceRuleId] = React.useState<string | null>(null);
  const [geofenceDefault, setGeofenceDefault] = React.useState("");
  const [testCoordOpen, setTestCoordOpen] = React.useState(false);
  const [testCoordRuleId, setTestCoordRuleId] = React.useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTitle, setHistoryTitle] = React.useState("GPS Flags");
  const [historyEvents, setHistoryEvents] = React.useState<
    { id: string; at: string; label: string; detail?: string }[]
  >([]);
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

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
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

  const [mapPinsBase, setMapPinsBase] = React.useState<CrmMapPin[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.locationsMapPins();
        if (cancelled) return;
        setMapPinsBase(
          res.data.flatMap((pin) => {
            const mapped = latLngToMapPin(
              pin.id,
              pin.label ?? pin.name ?? pin.id,
              pin.latitude,
              pin.longitude,
              pin.active ?? true,
            );
            if (!mapped) return [];
            return [
              {
                id: mapped.id,
                label: mapped.label,
                x: pin.x ?? mapped.x,
                y: pin.y ?? mapped.y,
                highlighted: mapped.active,
              },
            ];
          }),
        );
      } catch (err) {
        toastApiError(err);
        setMapPinsBase([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapPins = React.useMemo(
    () =>
      mapPinsBase.map((pin) => ({
        ...pin,
        highlighted: highlightedLocationId
          ? pin.id === highlightedLocationId
          : pin.highlighted,
      })),
    [mapPinsBase, highlightedLocationId],
  );

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
      filters?: RouteFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
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

  async function handleExport() {
    try {
      const res = await crmApi.exportRouteRules({
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
      const res = await crmApi.exportRouteRules({
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
      const res = await crmApi.exportRouteRules({
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
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this route rule?")
    ) {
      return;
    }
    try {
      await crmApi.archiveRouteRule(id);
      toastSuccess("Route rule deleted");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  function openCopyPicker(id: string, customerId?: string) {
    setCopyRuleId(id);
    void reloadEntities({ customerId: customerId || undefined });
    setCopyPickOpen(true);
  }

  async function handleCopyConfirm(locationId: string) {
    if (!copyRuleId) return;
    try {
      await crmApi.copyRouteRuleToLocation(copyRuleId, locationId);
      const name =
        locations.find((l) => l.value === locationId)?.label ?? "location";
      toastSuccess(`Copied to ${name}`);
      reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  function openGeofence(card: CrmLocationCard) {
    setGeofenceRuleId(card.id);
    setGeofenceDefault(card.geofenceRadius ?? "");
    if (card.locationId) setHighlightedLocationId(card.locationId);
    setGeofenceOpen(true);
  }

  async function handleGeofenceConfirm(values: Record<string, string>) {
    if (!geofenceRuleId) return;
    const radius = values.geofenceRadius?.trim();
    if (!radius) {
      toastApiError(new Error("Geofence radius is required"));
      throw new Error("Geofence radius is required");
    }
    try {
      await crmApi.updateRouteRule(geofenceRuleId, {
        geofenceRadius: radius,
      });
      toastSuccess(`Geofence updated to ${radius}`);
      reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  function openTestCoord(id: string) {
    setTestCoordRuleId(id);
    setTestCoordOpen(true);
  }

  async function handleTestCoordConfirm(values: Record<string, string>) {
    if (!testCoordRuleId) return;
    const lat = Number(values.lat);
    const lng = Number(values.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toastApiError(new Error("Enter valid latitude and longitude"));
      throw new Error("Invalid coordinates");
    }
    try {
      const res = await crmApi.testRouteCoordinate(testCoordRuleId, lat, lng);
      const { inside, distanceFt, radiusFt, locationName } = res.data;
      toastSuccess(
        inside
          ? `Inside geofence · ${distanceFt.toFixed(0)} ft from center (${radiusFt} ft)${locationName ? ` · ${locationName}` : ""}`
          : `Outside geofence · ${distanceFt.toFixed(0)} ft from center (${radiusFt} ft)${locationName ? ` · ${locationName}` : ""}`,
      );
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleViewGpsFlags(id: string, label?: string) {
    try {
      const res = await crmApi.routeRuleGpsFlags(id);
      setHistoryTitle(label ? `GPS Flags · ${label}` : "GPS Flags");
      setHistoryEvents(
        (res.data.flags ?? []).map((f) => ({
          id: f.id,
          at: f.at,
          label: f.message,
          detail: f.severity,
        })),
      );
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  const copyLocationOptions = React.useMemo(
    () => locations.map((l) => ({ value: l.value, label: l.label })),
    [locations],
  );

  const geofenceFields = React.useMemo(
    () => [
      {
        key: "geofenceRadius",
        label: "Geofence Radius (ft)",
        placeholder: "e.g. 500",
        defaultValue: geofenceDefault,
      },
    ],
    [geofenceDefault],
  );

  const testCoordFields = React.useMemo(
    () => [
      { key: "lat", label: "Latitude", placeholder: "e.g. 31.8457" },
      { key: "lng", label: "Longitude", placeholder: "e.g. -102.3676" },
    ],
    [],
  );

  void total;
  const listCards: CrmLocationCard[] = rows;

  return (
    <CrmListLoadGate loading={loading} hasData={!initialLoading} kpiCount={4}>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
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
                {
                  id: "geofence",
                  label: "Adjust Geofence on Map",
                  onSelect: () => openGeofence(card),
                },
                {
                  id: "test",
                  label: "Test with a Sample Coordinate",
                  onSelect: () => openTestCoord(card.id),
                },
                {
                  id: "copy",
                  label: "Copy to Another Site",
                  onSelect: () =>
                    openCopyPicker(card.id, card.customerId),
                },
                {
                  id: "flags",
                  label: "View GPS Flags Raised Here",
                  onSelect: () => void handleViewGpsFlags(card.id, card.name),
                },
                {
                  id: "delete",
                  label: "Delete Rule",
                  destructive: true,
                  onSelect: () => void handleArchive(card.id),
                },
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

      <CrmPickModal
        open={copyPickOpen}
        title="Copy Rule to Another Site"
        label="Location"
        options={copyLocationOptions}
        confirmLabel="Copy"
        onClose={() => {
          setCopyPickOpen(false);
          setCopyRuleId(null);
        }}
        onConfirm={handleCopyConfirm}
      />

      <CrmPromptFieldsModal
        open={geofenceOpen}
        title="Adjust Geofence"
        fields={geofenceFields}
        confirmLabel="Update"
        onClose={() => {
          setGeofenceOpen(false);
          setGeofenceRuleId(null);
        }}
        onConfirm={handleGeofenceConfirm}
      />

      <CrmPromptFieldsModal
        open={testCoordOpen}
        title="Test Sample Coordinate"
        fields={testCoordFields}
        confirmLabel="Run test"
        onClose={() => {
          setTestCoordOpen(false);
          setTestCoordRuleId(null);
        }}
        onConfirm={handleTestCoordConfirm}
      />

      <CrmHistoryModal
        open={historyOpen}
        title={historyTitle}
        events={historyEvents}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
    </CrmListLoadGate>
  );
}
