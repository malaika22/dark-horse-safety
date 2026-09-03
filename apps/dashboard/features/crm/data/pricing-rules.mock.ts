import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const PRICING_RULES_KPI = [
  { title: "Active Rules",      value: "11", meta: "+1 This Month",        icon: "customers" as StatIconName },
  { title: "Customers Priced",  value: "27", meta: "Per Tech Avg 31.1H",   icon: "time"      as StatIconName },
  { title: "Missing Pricing",   value: "19", meta: "3 Edits · 2 Time Off", icon: "edit"      as StatIconName },
  { title: "Expiring Soon",     value: "2",  meta: "BBS Missing",           icon: "wrench"    as StatIconName },
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
  { id: "1", customer: "Permian Basin Energy", code: "PR-3301", service: "Wireline Logging",  status: { label: "Active",  variant: "success" }, rate: "$1,250", unit: "Per Job", effective: "2025-01-01", expires: "2026-12-31", owner: "R. Crawford" },
  { id: "2", customer: "Lonestar Oilfield",    code: "PR-3302", service: "Pump Down",          status: { label: "Active",  variant: "success" }, rate: "$850",   unit: "Per HR",  effective: "2025-03-01", expires: "2026-12-31", owner: "M. Ellis"    },
  { id: "3", customer: "Cactus Well Services",  code: "PR-3303", service: "Perforating",       status: { label: "Active",  variant: "success" }, rate: "$2,100", unit: "Per Run", effective: "2025-01-15", expires: "2026-06-30", owner: "S. Nguyen"   },
  { id: "4", customer: "Rio Grande Resources",  code: "PR-3304", service: "Slickline",         status: { label: "Expired", variant: "warning" }, rate: "$675",   unit: "Per HR",  effective: "2024-01-01", expires: "2025-12-31", owner: "R. Crawford" },
  { id: "5", customer: "Delaware Basin Co.",     code: "PR-3305", service: "Wireline Logging",  status: { label: "Active",  variant: "success" }, rate: "$1,300", unit: "Per Job", effective: "2025-02-01", expires: "2026-12-31", owner: "M. Ellis"    },
  { id: "6", customer: "Frontier Energy LLC",   code: "PR-3306", service: "Pump Down",          status: { label: "Active",  variant: "success" }, rate: "$900",   unit: "Per HR",  effective: "2025-04-01", expires: "2026-12-31", owner: "S. Nguyen"   },
  { id: "7", customer: "Summit Production",     code: "PR-3307", service: "Perforating",       status: { label: "Active",  variant: "success" }, rate: "$2,050", unit: "Per Run", effective: "2025-01-01", expires: "2026-09-30", owner: "R. Crawford" },
  { id: "8", customer: "Vaquero Oil & Gas",     code: "PR-3308", service: "Slickline",         status: { label: "Pending", variant: "gold"    }, rate: "$700",   unit: "Per HR",  effective: "2025-06-01", expires: "2026-12-31", owner: "M. Ellis"    },
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
