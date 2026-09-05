import type { KpiCell, SortOption } from "./crm-types";

export const CRM_SYNC_LABEL = "Last synced — live";

/** KPI chrome only — values filled from API via `kpiCellsFromApi`. */
export const CUSTOMERS_KPI_SHELL: KpiCell[] = [
  { title: "Active customers", value: "—", meta: "From API", icon: "folder" },
  { title: "Open jobs", value: "—", meta: "From API", icon: "time" },
  { title: "Needs review", value: "—", meta: "From API", icon: "document" },
  { title: "Archived", value: "—", meta: "From API", icon: "lightning" },
];

export const CONTACTS_KPI_SHELL: KpiCell[] = [
  { title: "Total Contacts", value: "—", meta: "From API", icon: "customers" },
  { title: "Primary Contacts", value: "—", meta: "From API", icon: "time" },
  { title: "Missing Email", value: "—", meta: "From API", icon: "edit" },
  { title: "Missing Phone", value: "—", meta: "From API", icon: "wrench" },
];

export const LOCATIONS_KPI_SHELL: KpiCell[] = [
  { title: "Total Locations", value: "—", meta: "From API", icon: "customers" },
  { title: "Active Wells", value: "—", meta: "From API", icon: "time" },
  { title: "Inactive", value: "—", meta: "From API", icon: "edit" },
  { title: "Missing GPS", value: "—", meta: "From API", icon: "wrench" },
];

export const PRICING_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", meta: "From API", icon: "document" },
  { title: "Customers Priced", value: "—", meta: "From API", icon: "time" },
  { title: "Missing Pricing", value: "—", meta: "From API", icon: "edit" },
  { title: "Expiring Soon", value: "—", meta: "From API", icon: "lightning" },
];

export const REQUIREMENTS_KPI_SHELL: KpiCell[] = [
  { title: "Total Requirements", value: "—", meta: "From API", icon: "document" },
  { title: "Needs Review", value: "—", meta: "From API", icon: "edit" },
  { title: "Expiring", value: "—", meta: "From API", icon: "time" },
  { title: "Missing Docs", value: "—", meta: "From API", icon: "lightning" },
];

export const FORM_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", meta: "From API", icon: "document" },
  { title: "Customers Configured", value: "—", meta: "From API", icon: "customers" },
  { title: "Hard-Gate Forms", value: "—", meta: "From API", icon: "edit" },
  { title: "Missing Rules", value: "—", meta: "From API", icon: "lightning" },
];

export const ROUTE_RULES_KPI_SHELL: KpiCell[] = [
  { title: "Active Rules", value: "—", meta: "From API", icon: "document" },
  { title: "Customers Configured", value: "—", meta: "From API", icon: "time" },
  { title: "Geofenced Sites", value: "—", meta: "From API", icon: "customers" },
  { title: "Missing Rules", value: "—", meta: "From API", icon: "lightning" },
];

export const EOD_KPI_SHELL: KpiCell[] = [
  { title: "Today", value: "—", meta: "Reports Due", icon: "lightning" },
  { title: "Submitted", value: "—", meta: "This Week", icon: "document" },
  { title: "Pending", value: "—", meta: "Awaiting", icon: "time" },
  { title: "Team Activities", value: "—", meta: "This Week", icon: "customers" },
  { title: "Pipeline", value: "—", meta: "Open", icon: "folder" },
];

export const SALES_KPI_SHELL: KpiCell[] = [
  { title: "This Week", value: "—", meta: "Logged", icon: "lightning" },
  { title: "Calls", value: "—", meta: "From API", icon: "document" },
  { title: "Visits", value: "—", meta: "From API", icon: "gps" },
  { title: "Meetings", value: "—", meta: "From API", icon: "time" },
  { title: "Follow-Ups", value: "—", meta: "Pending", icon: "customers" },
];

export const QUOTES_KPI_SHELL: KpiCell[] = [
  { title: "Draft", value: "—", meta: "Open Drafts", icon: "lightning" },
  { title: "Sent", value: "—", meta: "Awaiting", icon: "document" },
  { title: "Approved", value: "—", meta: "Ready", icon: "folder" },
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
