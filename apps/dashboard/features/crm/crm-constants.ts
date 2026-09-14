import type { KpiCell, SortOption } from "./crm-types";

/** Fallback until overview/sync API returns `syncedAt`. */
export const CRM_SYNC_LABEL_FALLBACK = "Last synced —";

/** Format API `syncedAt` like the main dashboard: `Last synced 2:13 PM CT`. */
export function formatCrmSyncLabel(syncedAt?: string | null) {
  if (!syncedAt) return CRM_SYNC_LABEL_FALLBACK;
  const d = new Date(syncedAt);
  if (Number.isNaN(d.getTime())) return CRM_SYNC_LABEL_FALLBACK;
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Last synced ${time} CT`;
}

/** KPI chrome only — values filled from API via `kpiCellsFromApi`. */
export const CUSTOMERS_KPI_SHELL: KpiCell[] = [
  { title: "Active customers", value: "—", icon: "folder" },
  { title: "Open jobs", value: "—", icon: "time" },
  { title: "Needs review", value: "—", icon: "document" },
  { title: "Archived", value: "—", icon: "lightning" },
];

export const CONTACTS_KPI_SHELL: KpiCell[] = [
  { title: "Total Contacts", value: "—", icon: "customers" },
  { title: "Primary Contacts", value: "—", icon: "time" },
  { title: "Missing Email", value: "—", icon: "edit" },
  { title: "Missing Phone", value: "—", icon: "wrench" },
];

export const LOCATIONS_KPI_SHELL: KpiCell[] = [
  { title: "Total Locations", value: "—", icon: "document" },
  { title: "Active Wells", value: "—", icon: "time" },
  { title: "Inactive", value: "—", icon: "document" },
  { title: "Missing GPS", value: "—", icon: "lightning" },
];

export const PRICING_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", icon: "document" },
  { title: "Customers Priced", value: "—", icon: "time" },
  { title: "Missing Pricing", value: "—", icon: "document" },
  { title: "Expiring Soon", value: "—", icon: "lightning" },
];

export const REQUIREMENTS_KPI_SHELL: KpiCell[] = [
  { title: "Total Requirements", value: "—", icon: "document" },
  { title: "Needs Review", value: "—", icon: "time" },
  { title: "Expiring", value: "—", icon: "document" },
  { title: "Missing Docs", value: "—", icon: "lightning" },
];

export const FORM_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", icon: "document" },
  { title: "Customers Configured", value: "—", icon: "time" },
  { title: "Hard-Gate Forms", value: "—", icon: "document" },
  { title: "Missing Rules", value: "—", icon: "lightning" },
];

export const ROUTE_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Sites with a Rule", value: "—", icon: "document" },
  { title: "Using System Default", value: "—", icon: "time" },
  { title: "GPS Flags this Cycle", value: "—", icon: "document" },
  { title: "Sites with No Rule", value: "—", icon: "lightning" },
];

export const EOD_KPI_SHELL: KpiCell[] = [
  { title: "Due Today", value: "—", meta: "Reports Due", icon: "lightning" },
  { title: "Submitted", value: "—", meta: "Today", icon: "document" },
  { title: "Missing", value: "—", meta: "Not Submitted", icon: "time" },
  {
    title: "Team Activities",
    value: "—",
    meta: "Team · This Week",
    icon: "document",
  },
  { title: "Team Pipeline", value: "—", meta: "This Week", icon: "folder" },
];

export const SALES_KPI_SHELL: KpiCell[] = [
  { title: "This Week", value: "—", icon: "lightning" },
  { title: "Calls", value: "—", icon: "document" },
  { title: "Visits", value: "—", icon: "gps" },
  { title: "Meetings", value: "—", icon: "time" },
  { title: "Follow-Ups", value: "—", icon: "customers" },
];

export const QUOTES_KPI_SHELL: KpiCell[] = [
  { title: "Draft", value: "—", meta: "Open Drafts", icon: "lightning" },
  { title: "Sent", value: "—", meta: "Awaiting Response", icon: "document" },
  { title: "Approved", value: "—", meta: "Ready to Convert", icon: "folder" },
  { title: "Expired", value: "—", meta: "Need Renewal", icon: "document" },
  { title: "Converted", value: "—", meta: "Won", icon: "document" },
];

export const CUSTOMERS_SORT_OPTIONS: SortOption[] = [
  { id: "name", label: "Customer name" },
  { id: "code", label: "Customer ID" },
  { id: "createdAt", label: "Created" },
  { id: "lastActivity", label: "Last activity" },
  { id: "status", label: "Status" },
];

export const CONTACTS_SORT_OPTIONS: SortOption[] = [
  { id: "fullName", label: "Name" },
  { id: "code", label: "Code" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const LOCATIONS_SORT_OPTIONS: SortOption[] = [
  { id: "customer", label: "Customer" },
  { id: "name", label: "Well name" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const PRICING_SORT_OPTIONS: SortOption[] = [
  { id: "customer", label: "Customer" },
  { id: "serviceItem", label: "Service" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const REQUIREMENTS_SORT_OPTIONS: SortOption[] = [
  { id: "customer", label: "Customer" },
  { id: "name", label: "Requirement" },
  { id: "dueDate", label: "Due date" },
  { id: "status", label: "Status" },
  { id: "enforcementLevel", label: "Enforcement level" },
  { id: "techniciansAffected", label: "Technicians affected" },
];

export const FORM_RULES_SORT_OPTIONS: SortOption[] = [
  { id: "customer", label: "Customer" },
  { id: "formTemplate", label: "Form template" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created" },
];

export const ROUTE_RULES_SORT_OPTIONS: SortOption[] = [
  { id: "site", label: "Site" },
  { id: "customer", label: "Customer" },
  { id: "radius", label: "Radius" },
  { id: "rule", label: "Rule" },
  { id: "source", label: "Source" },
  { id: "flagRaised", label: "Flag Raised" },
  { id: "lastModified", label: "Last Modified" },
];

export const EOD_SORT_OPTIONS: SortOption[] = [
  { id: "reportDate", label: "Date" },
  { id: "rep", label: "Rep" },
  { id: "activities", label: "Activities" },
  { id: "pipelineAdded", label: "Pipeline Added" },
  { id: "status", label: "Status" },
];

export const SALES_SORT_OPTIONS: SortOption[] = [
  { id: "activityAt", label: "Date" },
  { id: "type", label: "Type" },
  { id: "status", label: "Status" },
];

export const QUOTES_SORT_OPTIONS: SortOption[] = [
  { id: "quoteNumber", label: "Quote #" },
  { id: "customer", label: "Customer" },
  { id: "amount", label: "Value" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created" },
  { id: "expiresAt", label: "Expires" },
  { id: "owner", label: "Rep" },
];

export const CONTACT_DETAIL_TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "activity" as const, label: "Activity" },
  { id: "quotes" as const, label: "Quotes" },
  { id: "work-orders" as const, label: "Work Orders" },
];

/** Preferred order of API kpi keys when filling shells. */
export const KPI_KEY_ORDER = [
  "total",
  "active",
  "openJobs",
  "needsReview",
  "archived",
  "customersConfigured",
  "primary",
  "missingEmail",
  "missingPhone",
  "sitesWithRule",
  "usingSystemDefault",
  "gpsFlagsThisCycle",
  "sitesWithNoRule",
  "inactive",
  "missingGps",
  "customersPriced",
  "hardGate",
  "missing",
  "expiring",
  "missingDocs",
  "geofenced",
  "today",
  "submitted",
  "pending",
  "activities",
  "pipeline",
  "thisWeek",
  "calls",
  "visits",
  "meetings",
  "followUps",
  "draft",
  "sent",
  "approved",
  "expired",
  "converted",
] as const;
