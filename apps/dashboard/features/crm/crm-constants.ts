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
  { title: "Total Locations", value: "—", icon: "customers" },
  { title: "Active Wells", value: "—", icon: "time" },
  { title: "Inactive", value: "—", icon: "edit" },
  { title: "Missing GPS", value: "—", icon: "wrench" },
];

export const PRICING_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", icon: "document" },
  { title: "Customers Priced", value: "—", icon: "time" },
  { title: "Missing Pricing", value: "—", icon: "edit" },
  { title: "Expiring Soon", value: "—", icon: "lightning" },
];

export const REQUIREMENTS_KPI_SHELL: KpiCell[] = [
  { title: "Total Requirements", value: "—", icon: "document" },
  { title: "Needs Review", value: "—", icon: "edit" },
  { title: "Expiring", value: "—", icon: "time" },
  { title: "Missing Docs", value: "—", icon: "lightning" },
];

export const FORM_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", icon: "document" },
  { title: "Customers Configured", value: "—", icon: "customers" },
  { title: "Hard-Gate Forms", value: "—", icon: "edit" },
  { title: "Missing Rules", value: "—", icon: "lightning" },
];

export const ROUTE_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", icon: "document" },
  { title: "Customers Configured", value: "—", icon: "time" },
  { title: "Geofenced Sites", value: "—", icon: "customers" },
  { title: "Missing Rules", value: "—", icon: "lightning" },
];

export const EOD_KPI_SHELL: KpiCell[] = [
  { title: "Today", value: "—", icon: "lightning" },
  { title: "Submitted", value: "—", icon: "document" },
  { title: "Pending", value: "—", icon: "time" },
  { title: "Team Activities", value: "—", icon: "customers" },
  { title: "Pipeline", value: "—", icon: "folder" },
];

export const SALES_KPI_SHELL: KpiCell[] = [
  { title: "This Week", value: "—", icon: "lightning" },
  { title: "Calls", value: "—", icon: "document" },
  { title: "Visits", value: "—", icon: "gps" },
  { title: "Meetings", value: "—", icon: "time" },
  { title: "Follow-Ups", value: "—", icon: "customers" },
];

export const QUOTES_KPI_SHELL: KpiCell[] = [
  { title: "Draft", value: "—", icon: "lightning" },
  { title: "Sent", value: "—", icon: "document" },
  { title: "Approved", value: "—", icon: "folder" },
  { title: "Expired", value: "—", icon: "document" },
  { title: "Converted", value: "—", icon: "document" },
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
  { id: "name", label: "Location name" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const PRICING_SORT_OPTIONS: SortOption[] = [
  { id: "serviceItem", label: "Service" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const REQUIREMENTS_SORT_OPTIONS: SortOption[] = [
  { id: "name", label: "Requirement" },
  { id: "dueDate", label: "Due date" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const FORM_RULES_SORT_OPTIONS: SortOption[] = [
  { id: "formTemplate", label: "Form template" },
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const ROUTE_RULES_SORT_OPTIONS: SortOption[] = [
  { id: "createdAt", label: "Created" },
  { id: "status", label: "Status" },
];

export const EOD_SORT_OPTIONS: SortOption[] = [
  { id: "reportDate", label: "Date" },
  { id: "reportCode", label: "Report ID" },
  { id: "status", label: "Status" },
];

export const SALES_SORT_OPTIONS: SortOption[] = [
  { id: "activityAt", label: "Date" },
  { id: "type", label: "Type" },
  { id: "status", label: "Status" },
];

export const QUOTES_SORT_OPTIONS: SortOption[] = [
  { id: "createdAt", label: "Created" },
  { id: "quoteNumber", label: "Quote #" },
  { id: "status", label: "Status" },
];

export const CONTACT_DETAIL_TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "activity" as const, label: "Activity" },
  { id: "quotes" as const, label: "Quotes" },
  { id: "work-orders" as const, label: "Work Orders" },
  { id: "customers" as const, label: "Customers" },
];

/** Preferred order of API kpi keys when filling shells. */
export const KPI_KEY_ORDER = [
  "total",
  "active",
  "archived",
  "needsReview",
  "primary",
  "missingEmail",
  "missingPhone",
  "inactive",
  "missingGps",
  "customersPriced",
  "missing",
  "expiring",
  "hardGate",
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
