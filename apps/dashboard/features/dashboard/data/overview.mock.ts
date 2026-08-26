import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type { StatIconName } from "@dark-horse-safety/ui";

export const KPI_TOP = [
  {
    title: "CRM / Customer",
    value: "98%",
    meta: "3 new leads",
    action: "Review time",
    icon: "crm" as StatIconName,
  },
  {
    title: "Employees & HR",
    value: "5",
    meta: "Payroll due Thu",
    action: "Review request",
    icon: "hr" as StatIconName,
  },
  {
    title: "Fleet & Assets",
    value: "3",
    meta: "2 calib · 1 SCBA",
    action: "View flags",
    icon: "fleet" as StatIconName,
  },
  {
    title: "Operations",
    value: "18",
    meta: "3 missing ST",
    action: "View assets",
    icon: "operations" as StatIconName,
  },
  {
    title: "Safety & Compliance",
    value: "7",
    meta: "3 missing ST",
    action: "View assets",
    icon: "safety" as StatIconName,
  },
];

export const KPI_MID = [
  {
    title: "Pending time approvals",
    value: "38",
    meta: "Across 4 technicians this cycle",
    action: "Review time",
    icon: "time" as StatIconName,
  },
  {
    title: "Time edit request",
    value: "5",
    meta: "Awaiting review",
    action: "Review request",
    icon: "edit" as StatIconName,
  },
  {
    title: "GPS & time flags",
    value: "2",
    meta: "Clock-in from home address",
    action: "View flags",
    icon: "gps" as StatIconName,
  },
];

export const KPI_EQUIPMENT = {
  title: "Equipment & calibration alerts",
  metrics: [
    { value: "2", meta: "Calibration due" },
    { value: "1", meta: "1 inspection overdue" },
  ],
  action: "View assets",
  icon: "wrench" as StatIconName,
};

export const EXCEPTION_TABS = [
  { id: "all", label: "All" },
  { id: "operation", label: "Operation" },
  { id: "employee", label: "Employee" },
  { id: "compliance", label: "Compliance" },
  { id: "assets", label: "Assets" },
  { id: "customer", label: "Customer" },
];

export const EXCEPTIONS = [
  {
    tag: "Operations",
    tagVariant: "gold" as DashboardBadgeVariant,
    text: "3 work orders missing sales ticket",
    action: "Review",
  },
  {
    tag: "Employee / HR",
    tagVariant: "gold" as DashboardBadgeVariant,
    text: "5 time edit requests pending review",
    action: "Review",
  },
  {
    tag: "Safety / Compliance",
    tagVariant: "gold" as DashboardBadgeVariant,
    text: "JSA missing · WO 46005734 · blocks payroll",
    action: "Open",
  },
  {
    tag: "Fleet / Asset",
    tagVariant: "gold" as DashboardBadgeVariant,
    text: "SCBA expired · 2 monitors need calibration",
    action: "Open",
  },
  {
    tag: "Billing",
    tagVariant: "gold" as DashboardBadgeVariant,
    text: "Unmatched work order vs sales ticket",
    action: "Review",
  },
];

export const PAYROLL_CYCLE = {
  dateRange: "Jun 1 – Jun 14, 2025",
  subtitle: "Bi-weekly · 142 active workers · 9 crews",
  completed: 13,
  total: 15,
  lockLabel: "Locks Jun 14, 11:59 PM CT",
  startLabel: "Jun 01",
  todayLabel: "Today · Day 13",
  endLabel: "Jun 14",
  stats: [
    { label: "Total payroll hours", value: "342.5h" },
    { label: "Exceptions remaining", value: "5" },
    { label: "Approved", value: "71 / 84" },
  ],
};

export const ACTIVITY_TABS = [
  { id: "all", label: "All" },
  { id: "time", label: "Time" },
  { id: "billing", label: "Billing" },
  { id: "forms", label: "Forms" },
  { id: "system", label: "System" },
  { id: "fleet", label: "Fleet" },
];

export const ACTIVITY = [
  {
    title: "Isaac submitted time edit request",
    subtitle: "2 hours ago · time edit request",
    status: "Pending",
    statusVariant: "warning" as DashboardBadgeVariant,
  },
  {
    title: "Billing discrepancy detected",
    subtitle: "3 hours ago · billing reconciliation",
    status: "Needs review",
    statusVariant: "review" as DashboardBadgeVariant,
  },
  {
    title: "Required JSA not complete",
    subtitle: "4 hours ago · compliance documents",
    status: "Missing",
    statusVariant: "error" as DashboardBadgeVariant,
  },
];

export const UNMATCHED_RECORDS = [
  {
    label: "Missing sales tickets",
    value: "02",
    tone: "green" as const,
    iconSrc: "/icons/missing-sales-tickets.png",
  },
  {
    label: "Unmatched work orders",
    value: "04",
    tone: "amber" as const,
    iconSrc: "/icons/unmatched-work-orders.png",
  },
  {
    label: "Missing required forms",
    value: "06",
    tone: "purple" as const,
    iconSrc: "/icons/missing-required-forms.png",
  },
];

export const GOCANVAS_SYNC = {
  stats: [
    { label: "Last sync", value: "Today, 7:42 AM" },
    { label: "Imported this cycle", value: "86 records" },
    { label: "Failed to parse", value: "2 records" },
    { label: "Unmatched records", value: "3 records" },
  ],
  table: [
    { label: "Work orders", synced: 24 },
    { label: "Sales tickets", synced: 22 },
    { label: "Time submissions", synced: 40 },
  ],
};

export const BILLING = {
  amount: "274k at risk",
  changePercent: "↓ 3%",
  changeLabel: "vs last pay cycle",
};

export const BILLING_LEGEND = [
  { label: "Under Billed", color: "#F4BE37", dashed: true },
  { label: "Over Billed", color: "#8C52FF" },
  { label: "Unresolved", color: "#FF4D4D" },
];
