import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const REQUIREMENTS_KPI = [
  { title: "Total Requirements", value: "8", meta: "+1 This Month",  icon: "document"  as StatIconName },
  { title: "Needs Review",       value: "2", meta: "Awaiting Owner", icon: "edit"      as StatIconName },
  { title: "Expiring",           value: "1", meta: "Next 30 Days",   icon: "time"      as StatIconName },
  { title: "Missing Docs",       value: "1", meta: "Needs Upload",   icon: "lightning" as StatIconName },
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
  { id: "1", customer: "Permian Basin Energy", code: "REQ-4401", requirement: "H2S Certification", status: { label: "Met",      variant: "success" }, type: "Safety",    owner: "R. Crawford", due: "2026-09-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File",  variant: "success" } },
  { id: "2", customer: "Lonestar Oilfield",    code: "REQ-4402", requirement: "MSA Renewal",        status: { label: "Review",   variant: "review"  }, type: "Contract",  owner: "M. Ellis",    due: "2026-07-15", review: { label: "Pending",  variant: "billing" }, docs: { label: "On File",  variant: "success" } },
  { id: "3", customer: "Cactus Well Services", code: "REQ-4403", requirement: "COI Update",         status: { label: "Review",   variant: "review"  }, type: "Insurance", owner: "S. Nguyen",   due: "2026-08-01", review: { label: "Pending",  variant: "billing" }, docs: { label: "Missing",  variant: "warning" } },
  { id: "4", customer: "Rio Grande Resources", code: "REQ-4404", requirement: "Site Orientation",   status: { label: "Met",      variant: "success" }, type: "Safety",    owner: "R. Crawford", due: "2026-10-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File",  variant: "success" } },
  { id: "5", customer: "Delaware Basin Co.",   code: "REQ-4405", requirement: "Drug Test Policy",   status: { label: "Met",      variant: "success" }, type: "HR",        owner: "M. Ellis",    due: "2026-11-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File",  variant: "success" } },
  { id: "6", customer: "Frontier Energy LLC",  code: "REQ-4406", requirement: "H2S Certification", status: { label: "Expiring", variant: "warning" }, type: "Safety",    owner: "S. Nguyen",   due: "2026-07-20", review: { label: "Pending",  variant: "billing" }, docs: { label: "On File",  variant: "success" } },
  { id: "7", customer: "Summit Production",    code: "REQ-4407", requirement: "MSA Renewal",        status: { label: "Met",      variant: "success" }, type: "Contract",  owner: "R. Crawford", due: "2026-12-01", review: { label: "Approved", variant: "success" }, docs: { label: "On File",  variant: "success" } },
  { id: "8", customer: "Vaquero Oil & Gas",    code: "REQ-4408", requirement: "COI Update",         status: { label: "Missing",  variant: "offline" }, type: "Insurance", owner: "M. Ellis",    due: "2026-07-10", review: { label: "Overdue",  variant: "warning" }, docs: { label: "Missing",  variant: "warning" } },
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
  { id: "customer",    label: "Notice start (nearest)" },
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

export const REQUIREMENTS_AFFECTED_TECHS = [
  { id: "1", name: "James Whitfield", role: "Primary" },
  { id: "2", name: "Sarah Vance",     role: "Secondary" },
  { id: "3", name: "Marcus Ellis",    role: "Secondary" },
];

export const REQUIREMENTS_AFFECTED_WO = [
  { id: "1", workOrder: "46065950-WO", priority: "Most" },
  { id: "2", workOrder: "46065951-WO", priority: "Normal" },
  { id: "3", workOrder: "46065952-WO", priority: "Least" },
];

export const REQUIREMENTS_STATUS_WELLS = [
  { id: "1", label: "Wolfcamp 12-4H — Midland, TX",  status: { label: "Active", variant: "success" as DashboardBadgeVariant } },
  { id: "2", label: "Bone Spring 8-2H — Reeves, TX", status: { label: "Active", variant: "success" as DashboardBadgeVariant } },
  { id: "3", label: "Spraberry 5-1H — Midland, TX",  status: { label: "Active", variant: "success" as DashboardBadgeVariant } },
];

export const REQUIREMENTS_ENFORCEMENT = [
  { id: "1", label: "Site Safety Technician", rate: "$100/HR" },
  { id: "2", label: "H2S Monitor Tech",       rate: "$85/HR" },
];

export const REQUIREMENTS_BLOCKED_BY = [
  { id: "1", name: "Ryan Crawford", initials: "RC" },
  { id: "2", name: "J. Martinez",   initials: "JM" },
  { id: "3", name: "John Doe",      initials: "JD" },
  { id: "4", name: "D. Reed",       initials: "DR" },
];

export const REQUIREMENTS_BLOCKED_PROCESSES = [
  "Dispatch",
  "Invoice",
  "Quote",
  "Payroll",
];
