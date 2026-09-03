import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const REQUIREMENTS_KPI = [
  { title: "Total Requirements",  value: "11", meta: "+1 This Month",        icon: "customers" as StatIconName },
  { title: "Needs Review",        value: "27", meta: "Per Tech Avg 31.1H",   icon: "time"      as StatIconName },
  { title: "Expiring",            value: "19", meta: "3 Edits · 2 Time Off", icon: "edit"      as StatIconName },
  { title: "Missing Docs",        value: "2",  meta: "BBS Missing",           icon: "wrench"    as StatIconName },
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

const BASE_REQUIREMENTS: RequirementRow[] = [
  { id: "1", customer: "Permian Basin Energy", code: "REQ-4401", requirement: "H2S Certification",   status: { label: "Met",      variant: "success" }, type: "Safety",    owner: "R. Crawford", due: "2026-09-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File", variant: "success" } },
  { id: "2", customer: "Lonestar Oilfield",    code: "REQ-4402", requirement: "MSA Renewal",          status: { label: "Review",   variant: "review"  }, type: "Contract",  owner: "M. Ellis",    due: "2026-07-15", review: { label: "Pending",  variant: "warning" }, docs: { label: "On File", variant: "success" } },
  { id: "3", customer: "Cactus Well Services",  code: "REQ-4403", requirement: "COI Update",           status: { label: "Review",   variant: "review"  }, type: "Insurance", owner: "S. Nguyen",   due: "2026-08-01", review: { label: "Pending",  variant: "warning" }, docs: { label: "Missing", variant: "error"   } },
  { id: "4", customer: "Rio Grande Resources",  code: "REQ-4404", requirement: "Site Orientation",     status: { label: "Met",      variant: "success" }, type: "Safety",    owner: "R. Crawford", due: "2026-10-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File", variant: "success" } },
  { id: "5", customer: "Delaware Basin Co.",     code: "REQ-4405", requirement: "Drug Test Policy",     status: { label: "Met",      variant: "success" }, type: "HR",        owner: "M. Ellis",    due: "2026-11-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File", variant: "success" } },
  { id: "6", customer: "Frontier Energy LLC",   code: "REQ-4406", requirement: "H2S Certification",   status: { label: "Expiring", variant: "gold"    }, type: "Safety",    owner: "S. Nguyen",   due: "2026-07-20", review: { label: "Pending",  variant: "warning" }, docs: { label: "On File", variant: "success" } },
  { id: "7", customer: "Summit Production",     code: "REQ-4407", requirement: "MSA Renewal",          status: { label: "Met",      variant: "success" }, type: "Contract",  owner: "R. Crawford", due: "2026-12-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File", variant: "success" } },
  { id: "8", customer: "Vaquero Oil & Gas",     code: "REQ-4408", requirement: "COI Update",           status: { label: "Missing",  variant: "error"   }, type: "Insurance", owner: "M. Ellis",    due: "2026-07-10", review: { label: "Overdue",  variant: "error"   }, docs: { label: "Missing", variant: "error"   } },
];

export const REQUIREMENTS_ROWS: RequirementRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_REQUIREMENTS[i % BASE_REQUIREMENTS.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `REQ-${4400 + n}`,
    customer: i < BASE_REQUIREMENTS.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_REQUIREMENTS.length) + 1}`,
  };
});

export const REQUIREMENTS_SORT_OPTIONS = [
  { id: "customer",    label: "Customer" },
  { id: "requirement", label: "Requirement" },
  { id: "status",      label: "Status" },
  { id: "type",        label: "Type" },
  { id: "owner",       label: "Owner" },
  { id: "due",         label: "Due" },
  { id: "review",      label: "Review" },
];

export const REQUIREMENTS_SAVED_VIEWS = [
  { id: "view-1", label: "All Requirements" },
  { id: "view-2", label: "Needs Review" },
  { id: "view-3", label: "Missing Docs" },
];
