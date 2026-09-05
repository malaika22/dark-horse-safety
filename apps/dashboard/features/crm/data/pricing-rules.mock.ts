import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const PRICING_RULES_KPI = [
  { title: "Active Rules",     value: "8", meta: "+1 This Month",  icon: "document"  as StatIconName },
  { title: "Customers Priced", value: "8", meta: "With Rate Cards", icon: "time"      as StatIconName },
  { title: "Missing Pricing",  value: "-", meta: "Needs Review",    icon: "edit"      as StatIconName },
  { title: "Expiring Soon",    value: "1", meta: "Next 30 Days",    icon: "lightning" as StatIconName },
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

const BASE_PRICING: PricingRuleRow[] = [
  { id: "1", customer: "Permian Basin Energy", code: "PR-3301", service: "Wireline Logging", status: { label: "Active",  variant: "success" }, rate: "$1,250", unit: "Per Job", effective: "2025-01-01", expires: "2026-12-31", owner: "R. Crawford" },
  { id: "2", customer: "Lonestar Oilfield",    code: "PR-3302", service: "Pump Down",         status: { label: "Active",  variant: "success" }, rate: "$850",   unit: "Per HR",  effective: "2025-03-01", expires: "2026-12-31", owner: "M. Ellis"    },
  { id: "3", customer: "Cactus Well Services", code: "PR-3303", service: "Perforating",       status: { label: "Active",  variant: "success" }, rate: "$2,100", unit: "Per Run", effective: "2025-01-15", expires: "2026-06-30", owner: "S. Nguyen"   },
  { id: "4", customer: "Rio Grande Resources", code: "PR-3304", service: "Slickline",         status: { label: "Expired", variant: "warning" }, rate: "$675",   unit: "Per HR",  effective: "2024-01-01", expires: "2025-12-31", owner: "R. Crawford" },
  { id: "5", customer: "Delaware Basin Co.",   code: "PR-3305", service: "Wireline Logging",  status: { label: "Active",  variant: "success" }, rate: "$1,300", unit: "Per Job", effective: "2025-02-01", expires: "2026-12-31", owner: "M. Ellis"    },
  { id: "6", customer: "Frontier Energy LLC",  code: "PR-3306", service: "Pump Down",         status: { label: "Active",  variant: "success" }, rate: "$900",   unit: "Per HR",  effective: "2025-04-01", expires: "2026-12-31", owner: "S. Nguyen"   },
  { id: "7", customer: "Summit Production",    code: "PR-3307", service: "Perforating",       status: { label: "Active",  variant: "success" }, rate: "$2,050", unit: "Per Run", effective: "2025-01-01", expires: "2026-09-30", owner: "R. Crawford" },
  { id: "8", customer: "Vaquero Oil & Gas",    code: "PR-3308", service: "Slickline",         status: { label: "Pending", variant: "offline" }, rate: "$700",   unit: "Per HR",  effective: "2025-06-01", expires: "2026-12-31", owner: "M. Ellis"    },
];

export const PRICING_RULES_ROWS: PricingRuleRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_PRICING[i % BASE_PRICING.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `PR-${3300 + n}`,
    customer: i < BASE_PRICING.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_PRICING.length) + 1}`,
  };
});

export const PRICING_SORT_OPTIONS = [
  { id: "customer",  label: "Customer" },
  { id: "service",   label: "Service / Item" },
  { id: "status",    label: "Status" },
  { id: "rate",      label: "Rate" },
  { id: "effective", label: "Effective" },
  { id: "expires",   label: "Expires" },
  { id: "owner",     label: "Owner" },
];

export const PRICING_SAVED_VIEWS = [
  { id: "view-1", label: "All Rules" },
  { id: "view-2", label: "Active Only" },
  { id: "view-3", label: "Expiring" },
];

export const PRICING_RATE_CHANGES = [
  { id: "1", label: "James Whitfield — Operations Mgr", from: "$1,150", to: "$1,250" },
  { id: "2", label: "Sarah Vance — Pricing Lead",       from: "$800",   to: "$850"   },
  { id: "3", label: "Marcus Ellis — Account Owner",     from: "$2,000", to: "$2,100" },
];

export const PRICING_SCHEDULE_CHANGES = [
  { id: "1", customer: "Permian Basin Energy", effective: "2025-06-01" },
  { id: "2", customer: "Lonestar Oilfield",    effective: "2025-07-15" },
  { id: "3", customer: "Cactus Well Services", effective: "2025-08-01" },
];

export const PRICING_PERMISSION_GATES = [
  { id: "1", customer: "Permian Basin Energy", status: { label: "Active",  variant: "success" as DashboardBadgeVariant } },
  { id: "2", customer: "Rio Grande Resources", status: { label: "Expired", variant: "warning" as DashboardBadgeVariant } },
  { id: "3", customer: "Vaquero Oil & Gas",    status: { label: "Pending", variant: "offline" as DashboardBadgeVariant } },
];
