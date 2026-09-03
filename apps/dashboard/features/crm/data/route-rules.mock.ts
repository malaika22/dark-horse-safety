import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const ROUTE_RULES_KPI = [
  { title: "Active Rules",          value: "11", meta: "+1 This Month",        icon: "customers" as StatIconName },
  { title: "Customers Configured",  value: "27", meta: "Per Tech Avg 31.1H",   icon: "time"      as StatIconName },
  { title: "Geofenced Sites",       value: "19", meta: "3 Edits · 2 Time Off", icon: "edit"      as StatIconName },
  { title: "Missing Rules",         value: "2",  meta: "BBS Missing",           icon: "wrench"    as StatIconName },
];

export type RouteMapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
  geofenced: boolean;
};

export type RouteLocationCard = {
  id: string;
  name: string;
  customer: string;
  city: string;
  openJobs: number;
  gpsStatus: string;
  status: { label: string; variant: DashboardBadgeVariant };
};

export const ROUTE_RULES_MAP_PINS: RouteMapPin[] = [
  { id: "1", label: "Wolfcamp 12-4H",    x: 28, y: 32, geofenced: true },
  { id: "2", label: "Bone Spring 8-2H",  x: 52, y: 22, geofenced: true },
  { id: "3", label: "Spraberry 5-1H",    x: 38, y: 48, geofenced: false },
  { id: "4", label: "Avalon 3-3H",       x: 62, y: 38, geofenced: true },
  { id: "5", label: "Reef Lease 9-1H",   x: 72, y: 55, geofenced: true },
  { id: "6", label: "Nolan 7-2H",        x: 45, y: 62, geofenced: true },
  { id: "7", label: "Woodford 10-5H",    x: 58, y: 68, geofenced: false },
  { id: "8", label: "Cotton Draw 4-1H",  x: 35, y: 72, geofenced: true },
];

export const ROUTE_RULES_LOCATION_CARDS: RouteLocationCard[] = [
  { id: "1", name: "Wolfcamp 12-4H",    customer: "Permian Basin Energy", city: "Midland, TX",  openJobs: 3, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "2", name: "Bone Spring 8-2H",  customer: "Lonestar Oilfield",    city: "Reeves, TX",   openJobs: 1, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "3", name: "Spraberry 5-1H",    customer: "Delaware Basin Co.",   city: "Midland, TX",  openJobs: 4, gpsStatus: "GPS Missing", status: { label: "Active",   variant: "success" } },
  { id: "4", name: "Avalon 3-3H",       customer: "Frontier Energy LLC",  city: "Reeves, TX",   openJobs: 2, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "5", name: "Reef Lease 9-1H",   customer: "Rio Grande Resources", city: "Winkler, TX",  openJobs: 0, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "6", name: "Nolan 7-2H",        customer: "Cactus Well Services", city: "Midland, TX",  openJobs: 1, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "7", name: "Woodford 10-5H",    customer: "Summit Production",    city: "Andrews, TX",  openJobs: 0, gpsStatus: "GPS Missing", status: { label: "Inactive", variant: "neutral" } },
  { id: "8", name: "Cotton Draw 4-1H",  customer: "Vaquero Oil & Gas",    city: "Ector, TX",    openJobs: 3, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
];

export type RouteRuleRow = {
  id: string;
  customer: string;
  code: string;
  location: string;
  status: { label: string; variant: DashboardBadgeVariant };
  route: string;
  geofence: string;
  radius: string;
  gpsRequired: string;
  owner: string;
};

const BASE_ROUTE_RULES: RouteRuleRow[] = [
  { id: "1", customer: "Permian Basin Energy", code: "RR-6601", location: "Wolfcamp 12-4H",   status: { label: "Active",   variant: "success" }, route: "Route A", geofence: "Enabled",  radius: "900 FT",   gpsRequired: "Yes", owner: "R. Crawford" },
  { id: "2", customer: "Lonestar Oilfield",    code: "RR-6602", location: "North Flare",       status: { label: "Active",   variant: "success" }, route: "Route B", geofence: "Enabled",  radius: "760 FT",   gpsRequired: "Yes", owner: "M. Ellis"    },
  { id: "3", customer: "Cactus Well Services",  code: "RR-6603", location: "East Staging",     status: { label: "Active",   variant: "success" }, route: "Route A", geofence: "Enabled",  radius: "500 FT",   gpsRequired: "Yes", owner: "S. Nguyen"   },
  { id: "4", customer: "Rio Grande Resources",  code: "RR-6604", location: "Pad 7 Central",   status: { label: "Inactive", variant: "warning" }, route: "Route C", geofence: "Disabled", radius: "—",        gpsRequired: "No",  owner: "R. Crawford" },
  { id: "5", customer: "Delaware Basin Co.",     code: "RR-6605", location: "Wolfcamp 8-2H",   status: { label: "Active",   variant: "success" }, route: "Route A", geofence: "Enabled",  radius: "1,000 FT", gpsRequired: "Yes", owner: "M. Ellis"    },
  { id: "6", customer: "Frontier Energy LLC",   code: "RR-6606", location: "H2S Zone 3",       status: { label: "Active",   variant: "success" }, route: "Route D", geofence: "Enabled",  radius: "600 FT",   gpsRequired: "Yes", owner: "S. Nguyen"   },
  { id: "7", customer: "Summit Production",     code: "RR-6607", location: "Tank Battery 12",  status: { label: "Active",   variant: "success" }, route: "Route B", geofence: "Enabled",  radius: "750 FT",   gpsRequired: "Yes", owner: "R. Crawford" },
  { id: "8", customer: "Vaquero Oil & Gas",     code: "RR-6608", location: "Boone Pad 4",      status: { label: "Draft",    variant: "offline" }, route: "Route A", geofence: "Disabled", radius: "—",        gpsRequired: "No",  owner: "M. Ellis"    },
];

export const ROUTE_RULES_ROWS: RouteRuleRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_ROUTE_RULES[i % BASE_ROUTE_RULES.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `RR-${6600 + n}`,
    customer: i < BASE_ROUTE_RULES.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_ROUTE_RULES.length) + 1}`,
  };
});

export const ROUTE_RULES_SORT_OPTIONS = [
  { id: "customer",    label: "Customer" },
  { id: "location",    label: "Location" },
  { id: "status",      label: "Status" },
  { id: "route",       label: "Route" },
  { id: "geofence",    label: "Geofence" },
  { id: "gpsRequired", label: "GPS Required" },
  { id: "owner",       label: "Owner" },
];

export const ROUTE_RULES_SAVED_VIEWS = [
  { id: "view-1", label: "All Rules" },
  { id: "view-2", label: "GPS Required" },
  { id: "view-3", label: "Geofence Enabled" },
];
