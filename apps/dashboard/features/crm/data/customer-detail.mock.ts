import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export type CustomerDetail = {
  id: string;
  name: string;
  code: string;
  status: { label: string; variant: DashboardBadgeVariant };
  accountOwner: string;
  email: string;
  phone: string;
  imageUrl: string;
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
  email: "ap@permianbasin.com",
  phone: "(432) 555-0110",
  imageUrl: "https://picsum.photos/seed/dhs-permian-basin/128/128",
  industry: "Oil & Gas",
  billingAddress: "1200 Energy Plaza, Midland, TX",
  primaryContact: "J. Martinez",
  customerSince: "2023-04-12",
  maxClockInRadius: true,
  radiusMiles: "5",
};

export const CUSTOMER_DETAIL_KPI = [
  {
    title: "Open jobs",
    value: "7",
    meta: "3 scheduled · 4 in progress",
    icon: "folder" as StatIconName,
  },
  {
    title: "Locations / wells",
    value: "12",
    meta: "9 active · 3 inactive",
    icon: "time" as StatIconName,
  },
  {
    title: "Requirements",
    value: "3",
    meta: "3 need review",
    icon: "document" as StatIconName,
  },
];

export const CUSTOMER_SETUP_HEALTH = [
  { label: "Form rules", value: 16, total: 142, tone: "critical" as const },
  { label: "Route rules", value: 13, total: 16, tone: "healthy" as const },
  { label: "Pricing", value: 138, total: 142, tone: "warning" as const },
  { label: "Requirements", value: 16, total: 19, tone: "warning" as const },
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
  { id: "1", title: "MSA 2025.pdf", subtitle: "Signed · Exp 2026-12-31", emphasize: true },
  { id: "2", title: "COI 2026.pdf", subtitle: "On file", emphasize: true },
  { id: "3", title: "W-9.pdf", subtitle: "On file", emphasize: true },
];

export const CUSTOMER_CONTACTS = [
  { id: "1", name: "James Whitfield", role: "Operations Mgr", badge: "Primary" as const },
  { id: "2", name: "Sarah Delgado", role: "Safety Lead", badge: "Secondary" as const },
  { id: "3", name: "Mark Reyes", role: "Field Super", badge: "Secondary" as const },
];

export const CUSTOMER_LOCATIONS = [
  { id: "1", name: "Wolfcamp 12-4H", detail: "Midland, TX", status: "Active" as const },
  { id: "2", name: "Bone Spring 8-2H", detail: "Ector, TX", status: "Active" as const },
  { id: "3", name: "Spraberry 5-1H", detail: "Reeves, TX", status: "Active" as const },
];

export const CUSTOMER_PRICING = [
  { id: "1", title: "Site Safety Technician", trailing: "$160 / Hr" },
  { id: "2", title: "H2S Monitoring Package", trailing: "$5000" },
];

export const CUSTOMER_FORMS = [
  { id: "1", title: "JSA", detail: "On Dispatch · Hard-Gate" },
  { id: "2", title: "Permit to Work", detail: "On Start · Hard-Gate" },
  { id: "3", title: "Air Quality Test", detail: "H2S Sites" },
];

export const CUSTOMER_ROUTE_GPS = [
  { id: "1", name: "Wolfcamp 12-4H", detail: "Geofence 500 Ft · Route A" },
  { id: "2", name: "Bone Spring 8-2H", detail: "Geofence 750 Ft · Route B" },
];

export const CUSTOMER_SALES_TICKETS = [
  {
    id: "1",
    title: "ST-88119",
    subtitle: "Jun 12",
    amount: "$10,240",
    status: { label: "Approved", variant: "success" as DashboardBadgeVariant },
  },
  {
    id: "2",
    title: "ST-88104",
    subtitle: "Jun 05",
    amount: "$7,880",
    status: { label: "Sent to NetSuite", variant: "gold" as DashboardBadgeVariant },
  },
  {
    id: "3",
    title: "ST-88090",
    subtitle: "May 28",
    amount: "$9,410",
    status: { label: "Closed", variant: "billing" as DashboardBadgeVariant },
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
  { id: "1",  serviceDate: "Jun 12 2026", woNumber: "46005950-WO", customer: "Devon Energy",          category: { label: "Billable",  variant: "success" }, clockIn: "07:00", clockOut: "15:30", hours: "8.5H", status: { label: "Approved",     variant: "success" } },
  { id: "2",  serviceDate: "Jun 12 2026", woNumber: "46005951-WO", customer: "ConocoPhillips",        category: { label: "Billable",  variant: "success" }, clockIn: "06:45", clockOut: "15:15", hours: "8.5H", status: { label: "Missing Out",  variant: "gold"    } },
  { id: "3",  serviceDate: "Jun 12 2026", woNumber: "46005952-WO", customer: "Chevron, Midland",      category: { label: "Training",  variant: "billing" }, clockIn: "07:30", clockOut: "16:00", hours: "8.5H", status: { label: "Approved",     variant: "success" } },
  { id: "4",  serviceDate: "Jun 17 2026", woNumber: "46005953-WO", customer: "Permian Basin Energy",  category: { label: "Billable",  variant: "success" }, clockIn: "07:00", clockOut: "15:30", hours: "7.7H", status: { label: "Pending",      variant: "warning" } },
  { id: "5",  serviceDate: "Jun 12 2026", woNumber: "46005954-WO", customer: "Permian Basin Energy",  category: { label: "Billable",  variant: "success" }, clockIn: "07:00", clockOut: "15:30", hours: "8.8H", status: { label: "Approved",     variant: "success" } },
  { id: "6",  serviceDate: "Jun 12 2026", woNumber: "46005955-WO", customer: "Devon Energy",          category: { label: "Billable",  variant: "success" }, clockIn: "07:00", clockOut: "15:30", hours: "8.5H", status: { label: "Approved",     variant: "success" } },
  { id: "7",  serviceDate: "Jun 12 2026", woNumber: "46005956-WO", customer: "Permian Basin Energy",  category: { label: "Vacation",  variant: "gold"    }, clockIn: "07:00", clockOut: "15:30", hours: "8.5H", status: { label: "Pending",      variant: "warning" } },
  { id: "8",  serviceDate: "Jun 12 2026", woNumber: "46005957-WO", customer: "ConocoPhillips",        category: { label: "Training",  variant: "billing" }, clockIn: "07:00", clockOut: "15:30", hours: "8.8H", status: { label: "Pending",      variant: "warning" } },
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
