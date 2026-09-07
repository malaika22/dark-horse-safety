import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const WORK_ORDERS_KPI = [
  {
    title: "Open work orders",
    value: "27",
    meta: "8 starting today",
    icon: "folder" as StatIconName,
  },
  {
    title: "In progress",
    value: "11",
    meta: "Avg 6.2h on site",
    icon: "time" as StatIconName,
  },
  {
    title: "Pending approval",
    value: "6",
    meta: "2 flagged",
    icon: "document" as StatIconName,
  },
  {
    title: "Completed (7d)",
    value: "48",
    meta: "+6 vs last week",
    icon: "lightning" as StatIconName,
  },
];

export type WorkOrderRow = {
  id: string;
  woNumber: string;
  serviceDate: string;
  customer: string;
  customerId: string;
  location: string;
  category: { label: string; variant: DashboardBadgeVariant };
  hours: string;
  status: { label: string; variant: DashboardBadgeVariant };
  rep: string;
};

export const WORK_ORDERS_ROWS: WorkOrderRow[] = [
  { id: "1", woNumber: "46005950", serviceDate: "Jun 12", customer: "Permian Basin Energy", customerId: "1", location: "Wolfcamp 12-4H", category: { label: "Billable", variant: "success" }, hours: "8.5H", status: { label: "Approved", variant: "success" }, rep: "R. Crawford" },
  { id: "2", woNumber: "46005951", serviceDate: "Jun 12", customer: "Lonestar Oilfield", customerId: "2", location: "Midland Hub", category: { label: "Billable", variant: "success" }, hours: "8.5H", status: { label: "Missing Out", variant: "review" }, rep: "M. Ellis" },
  { id: "3", woNumber: "46005952", serviceDate: "Jun 12", customer: "Cactus Well Services", customerId: "3", location: "Pad 7", category: { label: "Training", variant: "error" }, hours: "8.5H", status: { label: "Approved", variant: "success" }, rep: "S. Nguyen" },
  { id: "4", woNumber: "46005953", serviceDate: "Jun 17", customer: "Permian Basin Energy", customerId: "1", location: "Bone Spring 3", category: { label: "Billable", variant: "success" }, hours: "7.7H", status: { label: "Pending", variant: "warning" }, rep: "R. Crawford" },
  { id: "5", woNumber: "46005954", serviceDate: "Jun 12", customer: "Permian Basin Energy", customerId: "1", location: "Wolfcamp 9-2H", category: { label: "Billable", variant: "success" }, hours: "8.8H", status: { label: "Approved", variant: "success" }, rep: "R. Crawford" },
  { id: "6", woNumber: "46005955", serviceDate: "Jun 11", customer: "Rio Grande Resources", customerId: "4", location: "Eagle Ford A", category: { label: "Billable", variant: "success" }, hours: "8.5H", status: { label: "In Progress", variant: "info" }, rep: "M. Ellis" },
  { id: "7", woNumber: "46005956", serviceDate: "Jun 11", customer: "Delaware Basin Co.", customerId: "5", location: "DB-14", category: { label: "Standby", variant: "gold" }, hours: "4.0H", status: { label: "Pending", variant: "warning" }, rep: "S. Nguyen" },
  { id: "8", woNumber: "46005957", serviceDate: "Jun 10", customer: "Frontier Energy LLC", customerId: "6", location: "North Yard", category: { label: "Training", variant: "error" }, hours: "8.8H", status: { label: "Pending", variant: "warning" }, rep: "R. Crawford" },
];

export const WORK_ORDERS_SORT_OPTIONS = [
  { id: "woNumber", label: "Work order #" },
  { id: "serviceDate", label: "Service date" },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "hours", label: "Hours" },
];
