import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type { StatIconName } from "@dark-horse-safety/ui";

/**
 * KPI icon mapping matches Figma CRM Dashboard:
 * clock · edit · pin · wrench pattern.
 */
export const CRM_KPI_TOP = [
  {
    title: "Active customers",
    value: "142",
    meta: "+3 this month",
    action: "View customers",
    icon: "time" as StatIconName,
  },
  {
    title: "Open jobs",
    value: "27",
    meta: "Across 9 customers",
    action: "View jobs",
    icon: "edit" as StatIconName,
  },
  {
    title: "Requirements to review",
    value: "19",
    meta: "3 need review",
    action: "Review",
    icon: "gps" as StatIconName,
  },
  {
    title: "Locations / wells",
    value: "312",
    meta: "+8 this cycle",
    action: "View locations",
    icon: "wrench" as StatIconName,
  },
  {
    title: "Pricing rules missing",
    value: "4",
    meta: "Needs pricing",
    action: "Fix pricing",
    icon: "wrench" as StatIconName,
  },
];

export const CRM_KPI_MID = [
  {
    title: "Required form rules",
    value: "24",
    meta: "8 customers configured",
    action: "Manage rules",
    icon: "time" as StatIconName,
  },
  {
    title: "Route / GPS rules",
    value: "16",
    meta: "3 need setup",
    action: "Review",
    icon: "edit" as StatIconName,
  },
  {
    title: "New leads",
    value: "3",
    meta: "This month",
    action: "View leads",
    icon: "gps" as StatIconName,
  },
];

export const CRM_KPI_MSA = {
  title: "MSA renewals",
  metrics: [
    { value: "1", meta: "Due this month" },
    { value: "2", meta: "Due next 60 days" },
  ],
  action: "Review",
  icon: "wrench" as StatIconName,
};

export const CRM_REQUIREMENT_TABS = [
  { id: "all", label: "All" },
  { id: "operation", label: "Operation" },
  { id: "employee", label: "Employee" },
  { id: "customer", label: "Customer" },
];

export const CRM_REQUIREMENTS = [
  {
    tag: "Operations",
    tagVariant: "operations" as DashboardBadgeVariant,
    text: "3 work orders missing sales ticket",
    action: "Review",
  },
  {
    tag: "Employee / HR",
    tagVariant: "employee" as DashboardBadgeVariant,
    text: "5 time edit requests pending review",
    action: "Review",
  },
  {
    tag: "Safety / Compliance",
    tagVariant: "safety" as DashboardBadgeVariant,
    text: "JSA missing · WO 46005734 · blocks payroll",
    action: "Open",
  },
  {
    tag: "Fleet / Asset",
    tagVariant: "fleet" as DashboardBadgeVariant,
    text: "SCBA expired · 2 monitors need calibration",
    action: "Open",
  },
  {
    tag: "Billing",
    tagVariant: "billing" as DashboardBadgeVariant,
    text: "Unmatched work order vs sales ticket",
    action: "Review",
  },
];

export const CRM_ACTIVITY_TABS = [
  { id: "all", label: "All" },
  { id: "time", label: "Time" },
  { id: "billing", label: "Billing" },
  { id: "sync", label: "Sync" },
];

export const CRM_ACTIVITY = [
  {
    title: "Isaac submitted a time edit request for Jun 14 — missing clock-out",
    subtitle: "2 hours ago · time edit request",
    status: "Pending",
    statusVariant: "warning" as DashboardBadgeVariant,
  },
  {
    title: "Billing discrepancy on WO 46005812 · sales ticket mismatch",
    subtitle: "3 hours ago · billing reconciliation",
    status: "Needs review",
    statusVariant: "review" as DashboardBadgeVariant,
  },
  {
    title: "JSA missing for WO 46005734",
    subtitle: "4 hours ago · compliance documents",
    status: "Missing",
    statusVariant: "error" as DashboardBadgeVariant,
  },
  {
    title: "New customer lead imported from website — Apex Drilling",
    subtitle: "5 hours ago · lead sync",
    status: "Pending",
    statusVariant: "warning" as DashboardBadgeVariant,
  },
  {
    title: "Pricing rule missing for location West Pad 12",
    subtitle: "6 hours ago · pricing rules",
    status: "Needs review",
    statusVariant: "review" as DashboardBadgeVariant,
  },
];
