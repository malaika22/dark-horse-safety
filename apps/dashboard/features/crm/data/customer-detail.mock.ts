import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export type CustomerDetail = {
  id: string;
  name: string;
  code: string;
  status: { label: string; variant: DashboardBadgeVariant };
  accountOwner: string;
  email: string;
  phone: string;
  industry: string;
  billingAddress: string;
  primaryContact: string;
  customerSince: string;
  maxClockInRadius: boolean;
  radiusMiles: string;
};

export const CUSTOMER_DETAIL: CustomerDetail = {
  id: "1",
  name: "Permian Basin Energy",
  code: "CUST-1001",
  status: { label: "Active", variant: "success" },
  accountOwner: "R. Crawford",
  email: "ap@customer.com",
  phone: "(432) 555-0000",
  industry: "Oil & Gas",
  billingAddress: "1200 Midland Hwy, TX",
  primaryContact: "J. Hale",
  customerSince: "2026-06-16",
  maxClockInRadius: true,
  radiusMiles: "25",
};

export const CUSTOMER_DETAIL_KPI = [
  {
    title: "Open jobs",
    value: "7",
    meta: "3 scheduled · 4 in progress",
    icon: "time" as StatIconName,
  },
  {
    title: "Locations / wells",
    value: "12",
    meta: "9 active · 3 idle",
    icon: "gps" as StatIconName,
  },
  {
    title: "Requirements due",
    value: "3",
    meta: "1 MSA · 2 COI",
    icon: "edit" as StatIconName,
  },
];

export const CUSTOMER_ACCOUNT_SUMMARY = [
  { label: "RT hours", value: "42.5h" },
  { label: "OT hours", value: "6.0h" },
  { label: "PTO", value: "8.0h" },
  { label: "Total", value: "56.5h" },
];

export const CUSTOMER_REQUIREMENTS = [
  {
    title: "MSA 2025",
    subtitle: "Expires 2026-12-31",
    status: { label: "Approved", variant: "success" as DashboardBadgeVariant },
  },
  {
    title: "COI — general liability",
    subtitle: "Due 2026-07-01",
    status: { label: "Due", variant: "review" as DashboardBadgeVariant },
  },
  {
    title: "W-9 on file",
    subtitle: "Updated 2026-01-12",
    status: { label: "Approved", variant: "success" as DashboardBadgeVariant },
  },
];

export const CUSTOMER_AUDIT = [
  {
    title: "Status set to Active",
    subtitle: "R. Crawford updated account status",
    trailing: "2d ago",
  },
  {
    title: "MSA uploaded",
    subtitle: "Document signed and attached",
    trailing: "5d ago",
  },
  {
    title: "Primary contact changed",
    subtitle: "J. Hale assigned as primary",
    trailing: "1w ago",
  },
];

export const CUSTOMER_DOCUMENTS = [
  { title: "MSA 2025.pdf", subtitle: "Signed · Exp 2026-12-31" },
  { title: "COI.pdf", subtitle: "On file" },
  { title: "W-9.pdf", subtitle: "On file" },
];

export const CUSTOMER_CONTACTS = [
  { title: "J. Hale", subtitle: "AP / Billing", trailing: "Primary" },
  { title: "M. Soto", subtitle: "Field ops", trailing: "Secondary" },
  { title: "A. Quinn", subtitle: "Safety lead", trailing: "Secondary" },
];

export const CUSTOMER_LOCATIONS = [
  {
    title: "West Pad 12",
    status: { label: "Active", variant: "success" as DashboardBadgeVariant },
  },
  {
    title: "North Flare",
    status: { label: "Active", variant: "success" as DashboardBadgeVariant },
  },
  {
    title: "East Staging",
    status: { label: "Active", variant: "success" as DashboardBadgeVariant },
  },
];

export const CUSTOMER_PRICING = [
  { title: "Standby", trailing: "$85/hr" },
  { title: "H2S tech", trailing: "$110/hr" },
  { title: "Equipment", trailing: "$250/day" },
];

export const CUSTOMER_FORMS = [
  { title: "JSA", subtitle: "On dispatch · Hard-gate" },
  { title: "Tailgate", subtitle: "On clock-in" },
  { title: "EOD report", subtitle: "End of day" },
];

export const CUSTOMER_ROUTE_GPS = [
  { title: "West Pad 12", subtitle: "Geofence 0.25 mi" },
  { title: "North Flare", subtitle: "Geofence 0.50 mi" },
  { title: "Yard", subtitle: "Geofence 1.00 mi" },
];

export const CUSTOMER_SALES_TICKETS = [
  {
    title: "ST-44012",
    subtitle: "2026-06-12 · $4,200",
    status: { label: "Approved", variant: "success" as DashboardBadgeVariant },
  },
  {
    title: "ST-43988",
    subtitle: "2026-06-08 · $1,850",
    status: { label: "Sent to NetSuite", variant: "review" as DashboardBadgeVariant },
  },
  {
    title: "ST-43901",
    subtitle: "2026-05-28 · $920",
    status: { label: "Closed", variant: "error" as DashboardBadgeVariant },
  },
];

export type CustomerWorkOrder = {
  id: string;
  serviceDate: string;
  woNumber: string;
  customer: string;
  category: { label: string; variant: DashboardBadgeVariant };
  clockIn: string;
  clockOut: string;
  hours: string;
  status: { label: string; variant: DashboardBadgeVariant };
};

export const CUSTOMER_WORK_ORDERS: CustomerWorkOrder[] = [
  {
    id: "1",
    serviceDate: "2026-06-14",
    woNumber: "WO-46005812",
    customer: "Permian Basin Energy",
    category: { label: "Billable", variant: "success" },
    clockIn: "06:02",
    clockOut: "16:40",
    hours: "10.6",
    status: { label: "Approved", variant: "success" },
  },
  {
    id: "2",
    serviceDate: "2026-06-13",
    woNumber: "WO-46005734",
    customer: "Permian Basin Energy",
    category: { label: "Training", variant: "error" },
    clockIn: "07:10",
    clockOut: "—",
    hours: "—",
    status: { label: "Missing out", variant: "review" },
  },
  {
    id: "3",
    serviceDate: "2026-06-12",
    woNumber: "WO-46005601",
    customer: "Permian Basin Energy",
    category: { label: "Vacation", variant: "gold" },
    clockIn: "—",
    clockOut: "—",
    hours: "8.0",
    status: { label: "Pending", variant: "warning" },
  },
];

export const CUSTOMER_FORM_OPTIONS = {
  industries: [
    { value: "oil-gas", label: "Oil & Gas" },
    { value: "construction", label: "Construction" },
    { value: "utilities", label: "Utilities" },
  ],
  owners: [
    { value: "r-crawford", label: "R. Crawford" },
    { value: "m-torres", label: "M. Torres" },
    { value: "l-nguyen", label: "L. Nguyen" },
  ],
  billingTerms: [
    { value: "net-15", label: "Net 15" },
    { value: "net-30", label: "Net 30" },
    { value: "net-45", label: "Net 45" },
  ],
  requirementChips: [
    { id: "msa", label: "MSA" },
    { id: "coi", label: "COI" },
    { id: "w9", label: "W-9" },
    { id: "safety", label: "Safety manual" },
  ],
};
