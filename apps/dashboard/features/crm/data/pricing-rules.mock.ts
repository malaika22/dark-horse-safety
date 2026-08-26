import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const PRICING_RULES_KPI = [
  {
    title: "Active rules",
    value: "11",
    meta: "+1 this month",
    icon: "customers" as StatIconName,
  },
  {
    title: "Customers priced",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "time" as StatIconName,
  },
  {
    title: "Missing pricing",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "edit" as StatIconName,
  },
  {
    title: "Expiring soon",
    value: "2",
    meta: "BBS missing",
    icon: "wrench" as StatIconName,
  },
];

export type PricingRuleRow = {
  id: string;
  customer: string;
  code: string;
  service: string;
  status: { label: string; variant: DashboardBadgeVariant };
  rate: string;
  unit: string;
  effective: string;
  expires: string;
  owner: string;
};

export const PRICING_RULES_ROWS: PricingRuleRow[] = [
  {
    id: "1",
    customer: "Permian Basin Energy",
    code: "PR-3301",
    service: "Wireline logging",
    status: { label: "Active", variant: "success" },
    rate: "$1,250",
    unit: "Per job",
    effective: "2026-01-01",
    expires: "2026-12-31",
    owner: "R. Crawford",
  },
  {
    id: "2",
    customer: "Apex Drilling Co",
    code: "PR-3302",
    service: "H2S tech",
    status: { label: "Active", variant: "success" },
    rate: "$110",
    unit: "Per hour",
    effective: "2026-03-01",
    expires: "2027-03-01",
    owner: "M. Torres",
  },
  {
    id: "3",
    customer: "West Pad Services",
    code: "PR-3303",
    service: "Standby",
    status: { label: "Expired", variant: "warning" },
    rate: "$85",
    unit: "Per hour",
    effective: "2025-01-01",
    expires: "2025-12-31",
    owner: "L. Nguyen",
  },
  {
    id: "4",
    customer: "Basin Flow LLC",
    code: "PR-3304",
    service: "Equipment day rate",
    status: { label: "Pending", variant: "offline" },
    rate: "$250",
    unit: "Per day",
    effective: "2026-07-01",
    expires: "2027-07-01",
    owner: "R. Crawford",
  },
  {
    id: "5",
    customer: "Horizon Wireline",
    code: "PR-3305",
    service: "Wireline logging",
    status: { label: "Active", variant: "success" },
    rate: "$1,100",
    unit: "Per job",
    effective: "2026-02-15",
    expires: "2026-12-15",
    owner: "M. Torres",
  },
  {
    id: "6",
    customer: "Red Rock Energy",
    code: "PR-3306",
    service: "Mobilization",
    status: { label: "Expired", variant: "warning" },
    rate: "$500",
    unit: "Flat",
    effective: "2025-06-01",
    expires: "2026-05-31",
    owner: "L. Nguyen",
  },
];
