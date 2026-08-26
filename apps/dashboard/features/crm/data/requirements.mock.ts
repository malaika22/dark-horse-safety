import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const REQUIREMENTS_KPI = [
  {
    title: "Total requirements",
    value: "11",
    meta: "+1 this month",
    icon: "customers" as StatIconName,
  },
  {
    title: "Needs review",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "time" as StatIconName,
  },
  {
    title: "Expiring",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "edit" as StatIconName,
  },
  {
    title: "Missing docs",
    value: "2",
    meta: "BBS missing",
    icon: "wrench" as StatIconName,
  },
];

export type RequirementRow = {
  id: string;
  customer: string;
  code: string;
  requirement: string;
  status: { label: string; variant: DashboardBadgeVariant };
  type: string;
  owner: string;
  due: string;
  review: { label: string; variant: DashboardBadgeVariant };
  docs: { label: string; variant: DashboardBadgeVariant };
};

export const REQUIREMENTS_ROWS: RequirementRow[] = [
  {
    id: "1",
    customer: "Permian Basin Energy",
    code: "REQ-4401",
    requirement: "MSA 2025",
    status: { label: "Met", variant: "success" },
    type: "Contract",
    owner: "R. Crawford",
    due: "2026-09-01",
    review: { label: "Approved", variant: "success" },
    docs: { label: "On file", variant: "success" },
  },
  {
    id: "2",
    customer: "Apex Drilling Co",
    code: "REQ-4402",
    requirement: "COI — GL",
    status: { label: "Expiring", variant: "gold" },
    type: "Insurance",
    owner: "M. Torres",
    due: "2026-07-15",
    review: { label: "Pending", variant: "review" },
    docs: { label: "On file", variant: "gold" },
  },
  {
    id: "3",
    customer: "West Pad Services",
    code: "REQ-4403",
    requirement: "W-9",
    status: { label: "Missing", variant: "offline" },
    type: "Tax",
    owner: "L. Nguyen",
    due: "2026-06-30",
    review: { label: "Review", variant: "review" },
    docs: { label: "Missing", variant: "offline" },
  },
  {
    id: "4",
    customer: "Basin Flow LLC",
    code: "REQ-4404",
    requirement: "Safety manual",
    status: { label: "Met", variant: "success" },
    type: "Safety",
    owner: "R. Crawford",
    due: "2026-12-01",
    review: { label: "Approved", variant: "success" },
    docs: { label: "On file", variant: "success" },
  },
  {
    id: "5",
    customer: "Horizon Wireline",
    code: "REQ-4405",
    requirement: "COI — Auto",
    status: { label: "Overdue", variant: "warning" },
    type: "Insurance",
    owner: "M. Torres",
    due: "2026-05-01",
    review: { label: "Pending", variant: "error" },
    docs: { label: "Missing", variant: "offline" },
  },
  {
    id: "6",
    customer: "Red Rock Energy",
    code: "REQ-4406",
    requirement: "MSA addendum",
    status: { label: "Expiring", variant: "gold" },
    type: "Contract",
    owner: "L. Nguyen",
    due: "2026-08-20",
    review: { label: "Review", variant: "review" },
    docs: { label: "On file", variant: "success" },
  },
];
