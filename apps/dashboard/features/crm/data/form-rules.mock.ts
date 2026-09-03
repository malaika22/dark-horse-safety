import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const FORM_RULES_KPI = [
  { title: "Active Rules",          value: "11", meta: "+1 This Month",        icon: "customers" as StatIconName },
  { title: "Customers Configured",  value: "27", meta: "Per Tech Avg 31.1H",   icon: "time"      as StatIconName },
  { title: "Hard-Gate Forms",       value: "19", meta: "3 Edits · 2 Time Off", icon: "edit"      as StatIconName },
  { title: "Missing Rules",         value: "2",  meta: "BBS Missing",           icon: "wrench"    as StatIconName },
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
  { id: "1", customer: "Permian Basin Energy", code: "FR-5501", formTemplate: "JSA",                  status: { label: "Active",    variant: "success" }, trigger: "On Dispatch", hardGate: "Yes", appliesTo: "All Jobs",    version: "V3", owner: "R. Crawford" },
  { id: "2", customer: "Lonestar Oilfield",    code: "FR-5502", formTemplate: "Permit to Work",       status: { label: "Active",    variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "Well Sites",  version: "V2", owner: "M. Ellis"    },
  { id: "3", customer: "Cactus Well Services",  code: "FR-5503", formTemplate: "BBS Stop Card",       status: { label: "Active",    variant: "success" }, trigger: "Per Shift",   hardGate: "No",  appliesTo: "All Jobs",    version: "V1", owner: "S. Nguyen"   },
  { id: "4", customer: "Rio Grande Resources",  code: "FR-5504", formTemplate: "Equipment Inspection",status: { label: "Inactive",  variant: "warning" }, trigger: "On Dispatch", hardGate: "No",  appliesTo: "Fleet Jobs",  version: "V2", owner: "R. Crawford" },
  { id: "5", customer: "Delaware Basin Co.",     code: "FR-5505", formTemplate: "JSA",                 status: { label: "Active",    variant: "success" }, trigger: "On Dispatch", hardGate: "Yes", appliesTo: "All Jobs",    version: "V3", owner: "M. Ellis"    },
  { id: "6", customer: "Frontier Energy LLC",   code: "FR-5506", formTemplate: "Air Quality Test",    status: { label: "Active",    variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "H2S Sites",   version: "V1", owner: "S. Nguyen"   },
  { id: "7", customer: "Summit Production",     code: "FR-5507", formTemplate: "Permit to Work",      status: { label: "Active",    variant: "success" }, trigger: "On Start",    hardGate: "Yes", appliesTo: "Well Sites",  version: "V2", owner: "R. Crawford" },
  { id: "8", customer: "Vaquero Oil & Gas",     code: "FR-5508", formTemplate: "BBS Stop Card",       status: { label: "Draft",     variant: "offline" }, trigger: "Per Shift",   hardGate: "No",  appliesTo: "All Jobs",    version: "V1", owner: "M. Ellis"    },
];

export const FORM_RULES_ROWS: FormRuleRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_FORM_RULES[i % BASE_FORM_RULES.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `FR-${5500 + n}`,
    customer: i < BASE_FORM_RULES.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_FORM_RULES.length) + 1}`,
  };
});

export const FORM_RULES_SORT_OPTIONS = [
  { id: "customer",      label: "Customer" },
  { id: "formTemplate",  label: "Form Template" },
  { id: "status",        label: "Status" },
  { id: "trigger",       label: "Trigger" },
  { id: "hardGate",      label: "Hard-Gate" },
  { id: "appliesTo",     label: "Applies To" },
  { id: "version",       label: "Version" },
  { id: "owner",         label: "Owner" },
];

export const FORM_RULES_SAVED_VIEWS = [
  { id: "view-1", label: "All Rules" },
  { id: "view-2", label: "Active Only" },
  { id: "view-3", label: "Hard-Gate Only" },
];
