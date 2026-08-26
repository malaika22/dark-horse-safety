import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

/** Customers page KPI strip — matches Figma Customers screen. */
export const CUSTOMERS_KPI = [
  {
    title: "Active customers",
    value: "11",
    meta: "+1 this month",
    icon: "customers" as StatIconName,
  },
  {
    title: "Open jobs",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "edit" as StatIconName,
  },
  {
    title: "Requirements to review",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "gps" as StatIconName,
  },
  {
    title: "Pricing rules missing",
    value: "2",
    meta: "BBS missing",
    icon: "wrench" as StatIconName,
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
};

export const CUSTOMERS_ROWS: CustomerRow[] = [
  {
    id: "1",
    name: "Permian Basin Energy",
    code: "CUST-1001",
    accountOwner: "R. Crawford",
    status: { label: "Active", variant: "success" },
    primaryContact: "J. Hale",
    openJobs: 4,
    locations: 12,
    requirements: [
      { label: "Compliance", variant: "success" },
      { label: "Need review", variant: "review" },
    ],
    routeGps: [
      { label: "None", variant: "success" },
      { label: "GPS outside", variant: "error" },
    ],
  },
  {
    id: "2",
    name: "Apex Drilling Co",
    code: "CUST-1002",
    accountOwner: "M. Torres",
    status: { label: "Active", variant: "success" },
    primaryContact: "S. Kim",
    openJobs: 2,
    locations: 6,
    requirements: [{ label: "None", variant: "success" }],
    routeGps: [{ label: "Late clock out", variant: "review" }],
  },
  {
    id: "3",
    name: "West Pad Services",
    code: "CUST-1003",
    accountOwner: "R. Crawford",
    status: { label: "Need review", variant: "review" },
    primaryContact: "A. Brooks",
    openJobs: 1,
    locations: 3,
    requirements: [
      { label: "Missing clock out", variant: "error" },
      { label: "Needed attention", variant: "review" },
    ],
    routeGps: [{ label: "Offline", variant: "offline" }],
  },
  {
    id: "4",
    name: "Eagle Ford Ops",
    code: "CUST-1004",
    accountOwner: "L. Nguyen",
    status: { label: "Active", variant: "success" },
    primaryContact: "D. Ortiz",
    openJobs: 5,
    locations: 18,
    requirements: [{ label: "Compliance", variant: "success" }],
    routeGps: [
      { label: "Long break", variant: "warning" },
      { label: "Not bill", variant: "error" },
    ],
  },
  {
    id: "5",
    name: "North Slope Partners",
    code: "CUST-1005",
    accountOwner: "M. Torres",
    status: { label: "Active", variant: "success" },
    primaryContact: "K. Patel",
    openJobs: 0,
    locations: 2,
    requirements: [{ label: "None", variant: "success" }],
    routeGps: [{ label: "None", variant: "success" }],
  },
  {
    id: "6",
    name: "Bakken Field Services",
    code: "CUST-1006",
    accountOwner: "L. Nguyen",
    status: { label: "Active", variant: "success" },
    primaryContact: "T. Reed",
    openJobs: 3,
    locations: 9,
    requirements: [{ label: "Need review", variant: "review" }],
    routeGps: [{ label: "None", variant: "success" }],
  },
];

export const CUSTOMERS_DEFAULT_CHIPS = [
  { id: "active", label: "Active" },
  { id: "current", label: "Current" },
  { id: "future", label: "Future" },
];
