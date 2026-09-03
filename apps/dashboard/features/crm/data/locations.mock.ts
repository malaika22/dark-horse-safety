import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const LOCATIONS_KPI = [
  { title: "Total Locations", value: "11", meta: "+1 This Month",        icon: "customers" as StatIconName },
  { title: "Active Wells",    value: "27", meta: "Per Tech Avg 31.1H",   icon: "time"      as StatIconName },
  { title: "Inactive",        value: "19", meta: "3 Edits · 2 Time Off", icon: "edit"      as StatIconName },
  { title: "Missing GPS",     value: "2",  meta: "BBS Missing",           icon: "wrench"    as StatIconName },
];

export type MapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
  active: boolean;
};

export type LocationCard = {
  id: string;
  name: string;
  customer: string;
  city: string;
  openJobs: number;
  gpsStatus: string;
  status: { label: string; variant: DashboardBadgeVariant };
};

export const LOCATIONS_MAP_PINS: MapPin[] = [
  { id: "1", label: "Wolfcamp 12-4H",    x: 28, y: 32, active: true },
  { id: "2", label: "Bone Spring 8-2H",  x: 52, y: 22, active: true },
  { id: "3", label: "Spraberry 5-1H",    x: 38, y: 48, active: true },
  { id: "4", label: "Avalon 3-3H",       x: 62, y: 38, active: true },
  { id: "5", label: "Reef Lease 9-1H",   x: 72, y: 55, active: true },
  { id: "6", label: "Nolan 7-2H",        x: 45, y: 62, active: true },
  { id: "7", label: "Woodford 10-5H",    x: 58, y: 68, active: false },
  { id: "8", label: "Cotton Draw 4-1H",  x: 35, y: 72, active: true },
];

export const LOCATIONS_CARDS: LocationCard[] = [
  { id: "1", name: "Wolfcamp 12-4H",    customer: "Permian Basin Energy", city: "Midland, TX",  openJobs: 3, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "2", name: "Bone Spring 8-2H",   customer: "Lonestar Oilfield",    city: "Reeves, TX",   openJobs: 1, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "3", name: "Spraberry 5-1H",    customer: "Delaware Basin Co.",   city: "Midland, TX",  openJobs: 4, gpsStatus: "GPS Missing", status: { label: "Active",   variant: "success" } },
  { id: "4", name: "Avalon 3-3H",       customer: "Frontier Energy LLC",  city: "Reeves, TX",   openJobs: 2, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "5", name: "Reef Lease 9-1H",   customer: "Rio Grande Resources", city: "Winkler, TX",  openJobs: 0, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "6", name: "Nolan 7-2H",        customer: "Cactus Well Services", city: "Midland, TX",  openJobs: 1, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
  { id: "7", name: "Woodford 10-5H",    customer: "Summit Production",    city: "Andrews, TX",  openJobs: 0, gpsStatus: "GPS Missing", status: { label: "Inactive", variant: "neutral" } },
  { id: "8", name: "Cotton Draw 4-1H",  customer: "Vaquero Oil & Gas",    city: "Ector, TX",    openJobs: 3, gpsStatus: "GPS Set",     status: { label: "Active",   variant: "success" } },
];

export const LOCATIONS_SORT_OPTIONS = [
  { id: "name",     label: "Name" },
  { id: "customer", label: "Customer" },
  { id: "status",   label: "Status" },
  { id: "openJobs", label: "Open Jobs" },
];

export const LOCATIONS_SAVED_VIEWS = [
  { id: "view-1", label: "All Locations" },
  { id: "view-2", label: "Active Wells" },
  { id: "view-3", label: "Missing GPS" },
];
