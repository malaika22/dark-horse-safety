import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

/** Customers page KPI strip — matches Figma Customers screen. */
export const CUSTOMERS_KPI = [
  {
    title: "Active customers",
    value: "11",
    meta: "+1 this month",
    icon: "folder" as StatIconName,
  },
  {
    title: "Open jobs",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "time" as StatIconName,
  },
  {
    title: "Requirements to review",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "document" as StatIconName,
  },
  {
    title: "Pricing rules missing",
    value: "2",
    meta: "BBS missing",
    icon: "lightning" as StatIconName,
  },
];

export type CustomerRow = {
  id: string;
  name: string;
  code: string;
  accountOwner: string;
  status: { label: string; variant: DashboardBadgeVariant };
  primaryContact: string;
  openJobs: number;
  locations: number;
  requirements: { label: string; variant: DashboardBadgeVariant }[];
  routeGps: { label: string; variant: DashboardBadgeVariant }[];
  createdAt: string;
  lastActivity: string;
  msaExpiry: string;
};

const BASE_CUSTOMERS: Omit<CustomerRow, "id" | "code">[] = [
  {
    name: "Permian Basin Energy",
    accountOwner: "R. Crawford",
    status: { label: "Active", variant: "success" },
    primaryContact: "J. Martin",
    openJobs: 4,
    locations: 12,
    requirements: [
      { label: "None", variant: "success" },
      { label: "Gps outside", variant: "error" },
    ],
    routeGps: [
      { label: "Compliance", variant: "success" },
      { label: "Needs attention", variant: "review" },
    ],
    createdAt: "2024-01-12",
    lastActivity: "2026-08-28",
    msaExpiry: "2026-09-11",
  },
  {
    name: "Apex Drilling Co",
    accountOwner: "M. Ellis",
    status: { label: "Needs review", variant: "review" },
    primaryContact: "S. Kim",
    openJobs: 2,
    locations: 6,
    requirements: [{ label: "Missing c.o", variant: "error" }],
    routeGps: [{ label: "Needs attention", variant: "review" }],
    createdAt: "2024-03-02",
    lastActivity: "2026-08-20",
    msaExpiry: "2026-10-01",
  },
  {
    name: "West Pad Services",
    accountOwner: "R. Crawford",
    status: { label: "Offline", variant: "offline" },
    primaryContact: "A. Brooks",
    openJobs: 1,
    locations: 3,
    requirements: [
      { label: "Late c.o", variant: "review" },
      { label: "Long break", variant: "review" },
    ],
    routeGps: [{ label: "Not bill", variant: "error" }],
    createdAt: "2023-11-18",
    lastActivity: "2026-07-30",
    msaExpiry: "2026-11-20",
  },
  {
    name: "Eagle Ford Ops",
    accountOwner: "L. Nguyen",
    status: { label: "Active", variant: "success" },
    primaryContact: "D. Ortiz",
    openJobs: 5,
    locations: 18,
    requirements: [{ label: "None", variant: "success" }],
    routeGps: [{ label: "Compliance", variant: "success" }],
    createdAt: "2024-05-21",
    lastActivity: "2026-08-30",
    msaExpiry: "2027-01-05",
  },
  {
    name: "North Slope Partners",
    accountOwner: "M. Ellis",
    status: { label: "Active", variant: "success" },
    primaryContact: "K. Patel",
    openJobs: 0,
    locations: 2,
    requirements: [{ label: "None", variant: "success" }],
    routeGps: [{ label: "Compliance", variant: "success" }],
    createdAt: "2024-07-09",
    lastActivity: "2026-08-12",
    msaExpiry: "2026-12-15",
  },
  {
    name: "Bakken Field Services",
    accountOwner: "L. Nguyen",
    status: { label: "Active", variant: "success" },
    primaryContact: "T. Reed",
    openJobs: 3,
    locations: 9,
    requirements: [{ label: "Gps outside", variant: "error" }],
    routeGps: [{ label: "Needs attention", variant: "review" }],
    createdAt: "2024-08-14",
    lastActivity: "2026-08-25",
    msaExpiry: "2026-09-28",
  },
  {
    name: "Lonestar Operating",
    accountOwner: "S. Vance",
    status: { label: "Needs review", variant: "review" },
    primaryContact: "M. Diaz",
    openJobs: 6,
    locations: 14,
    requirements: [{ label: "Missing c.o", variant: "error" }],
    routeGps: [{ label: "Not bill", variant: "error" }],
    createdAt: "2023-09-01",
    lastActivity: "2026-08-18",
    msaExpiry: "2026-10-12",
  },
  {
    name: "Cactus Well Services",
    accountOwner: "K. Lee",
    status: { label: "Active", variant: "success" },
    primaryContact: "C. Holmes",
    openJobs: 2,
    locations: 7,
    requirements: [{ label: "None", variant: "success" }],
    routeGps: [{ label: "Compliance", variant: "success" }],
    createdAt: "2024-02-28",
    lastActivity: "2026-08-29",
    msaExpiry: "2027-02-01",
  },
];

/** Expand base set so pagination / page size feel real. */
export const CUSTOMERS_ROWS: CustomerRow[] = Array.from(
  { length: 42 },
  (_, index) => {
    const base = BASE_CUSTOMERS[index % BASE_CUSTOMERS.length]!;
    const n = index + 1;
    return {
      ...base,
      id: String(n),
      code: `CUST-${1000 + n}`,
      name: index < BASE_CUSTOMERS.length ? base.name : `${base.name} ${Math.floor(index / BASE_CUSTOMERS.length) + 1}`,
      openJobs: (base.openJobs + index) % 8,
      locations: base.locations + (index % 5),
    };
  },
);

export const CUSTOMERS_DEFAULT_CHIPS = [
  { id: "filter-1", label: "Filter 1" },
  { id: "filter-2", label: "Filter 2" },
  { id: "filter-3", label: "Filter 3" },
];

export const CUSTOMERS_SORT_OPTIONS = [
  { id: "name", label: "Customer name" },
  { id: "status", label: "Status" },
  { id: "openJobs", label: "Open jobs" },
  { id: "locations", label: "Locations" },
  { id: "msaExpiry", label: "Msa expiry" },
  { id: "lastActivity", label: "Last activity" },
  { id: "createdAt", label: "Created date" },
];

export const CUSTOMERS_SAVED_VIEWS = [
  { id: "view-1", label: "View 1" },
  { id: "view-2", label: "View 2" },
  { id: "view-3", label: "View 3" },
  { id: "view-4", label: "View 4" },
];
