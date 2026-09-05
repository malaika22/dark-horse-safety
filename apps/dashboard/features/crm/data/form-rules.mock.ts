import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const FORM_RULES_KPI = [
  { title: "Active Rules",         value: "8", meta: "+1 This Month",     icon: "document"  as StatIconName },
  { title: "Customers Configured", value: "3", meta: "With Form Rules",   icon: "customers" as StatIconName },
  { title: "Hard-Gate Forms",      value: "1", meta: "Blocking Dispatch", icon: "edit"      as StatIconName },
  { title: "Missing Rules",        value: "-", meta: "Needs Setup",       icon: "lightning" as StatIconName },
];

export type FormRuleRow = {
  id: string;
  customer: string;
  code: string;
  formTemplate: string;
  status: { label: string; variant: DashboardBadgeVariant };
  trigger: string;
  hardGate: string;
  appliesTo: string;
  version: string;
  owner: string;
};

const BASE_FORM_RULES: FormRuleRow[] = [
  { id: "1", customer: "Permian Basin Energy", code: "FR-0001", formTemplate: "JSA",                   status: { label: "Active",   variant: "success" }, trigger: "On Dispatch", hardGate: "Yes", appliesTo: "All Jobs",   version: "V3", owner: "B. Crawford" },
  { id: "2", customer: "Lonestar Oilfield",    code: "FR-0002", formTemplate: "Permit to Work",        status: { label: "Active",   variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "Well Sites", version: "V2", owner: "M. Ellis"    },
  { id: "3", customer: "Cactus Well Services", code: "FR-0003", formTemplate: "BBS Stop Card",         status: { label: "Active",   variant: "success" }, trigger: "Per Shift",   hardGate: "No",  appliesTo: "All Jobs",   version: "V1", owner: "S. Nguyen"   },
  { id: "4", customer: "Rio Grande Resources", code: "FR-0004", formTemplate: "Equipment Inspection",  status: { label: "Inactive", variant: "warning" }, trigger: "On Dispatch", hardGate: "No",  appliesTo: "Fleet Jobs", version: "V2", owner: "B. Crawford" },
  { id: "5", customer: "Delaware Basin Co.",   code: "FR-0005", formTemplate: "JSA",                   status: { label: "Active",   variant: "success" }, trigger: "On Dispatch", hardGate: "Yes", appliesTo: "All Jobs",   version: "V3", owner: "M. Ellis"    },
  { id: "6", customer: "Frontier Energy LLC",  code: "FR-0006", formTemplate: "Air Quality Test",      status: { label: "Active",   variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "H2S Sites",  version: "V1", owner: "S. Nguyen"   },
  { id: "7", customer: "Summit Production",    code: "FR-0007", formTemplate: "Permit to Work",        status: { label: "Active",   variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "Well Sites", version: "V2", owner: "B. Crawford" },
  { id: "8", customer: "Vaquero Oil & Gas",    code: "FR-0008", formTemplate: "BBS Stop Card",         status: { label: "Draft",    variant: "offline" }, trigger: "Per Shift",   hardGate: "No",  appliesTo: "All Jobs",   version: "V1", owner: "M. Ellis"    },
];

export const FORM_RULES_ROWS: FormRuleRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_FORM_RULES[i % BASE_FORM_RULES.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `FR-${String(n).padStart(4, "0")}`,
    customer: i < BASE_FORM_RULES.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_FORM_RULES.length) + 1}`,
  };
});

export const FORM_RULES_SORT_OPTIONS = [
  { id: "customer",     label: "Notice start (nearest)" },
  { id: "formTemplate", label: "Form Template" },
  { id: "status",       label: "Status" },
  { id: "trigger",      label: "Trigger" },
  { id: "hardGate",     label: "Hard-Gate" },
  { id: "appliesTo",    label: "Applies To" },
  { id: "version",      label: "Version" },
  { id: "owner",        label: "Owner" },
];

export const FORM_RULES_SAVED_VIEWS = [
  { id: "view-1", label: "All Rules" },
  { id: "view-2", label: "Active Only" },
  { id: "view-3", label: "Hard-Gate Only" },
];
