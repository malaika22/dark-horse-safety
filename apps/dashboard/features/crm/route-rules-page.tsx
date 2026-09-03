"use client";

import * as React from "react";
import Link from "next/link";
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
  type CrmLocationCard,
  type CrmMapPin,
} from "./crm-map-split-view";
import { PlusIcon } from "./crm-list-page-shell";
import {
  ROUTE_RULES_KPI,
  ROUTE_RULES_LOCATION_CARDS,
  ROUTE_RULES_MAP_PINS,
  ROUTE_RULES_SAVED_VIEWS,
  ROUTE_RULES_SORT_OPTIONS,
} from "./data/route-rules.mock";

export function RouteRulesPage() {
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("asc");
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>(ROUTE_RULES_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>("view-1");

  const filteredCards = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTE_RULES_LOCATION_CARDS;
    return ROUTE_RULES_LOCATION_CARDS.filter((card) =>
      [card.name, card.customer, card.city].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  const mapPins: CrmMapPin[] = ROUTE_RULES_MAP_PINS.map((pin) => ({
    id: pin.id,
    label: pin.label,
    x: pin.x,
    y: pin.y,
    highlighted: pin.geofenced,
  }));

  const listCards: CrmLocationCard[] = filteredCards;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Route / GPS Rules
        </h1>
        <Link href="/crm/route-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary" leftIcon={<PlusIcon className="shrink-0" />}>
            Add Route Rule
          </DashboardToolbarButton>
        </Link>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {ROUTE_RULES_KPI.map((cell) => (
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
          >
            Filter (-)
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
              Payroll Review
            </DashboardToolbarButton>
            <DashboardExportMenu
              items={[
                { id: "view-csv", label: "Export current view • CSV" },
                { id: "all-csv",  label: "Export all • CSV" },
                { id: "pdf",      label: "Export as PDF" },
              ]}
            />
            <DashboardSortMenu
              options={ROUTE_RULES_SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
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
        />
      </div>

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
            setSavedViews((prev) => [...prev, { id, label: `${source.label} copy` }]);
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
