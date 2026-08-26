import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const FORM_RULES_KPI = [
  {
    title: "Active rules",
    value: "11",
    meta: "+1 this month",
    icon: "customers" as StatIconName,
  },
  {
    title: "Customers configured",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "time" as StatIconName,
  },
  {
    title: "Hard-gate forms",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "edit" as StatIconName,
  },
  {
    title: "Missing rules",
    value: "2",
    meta: "BBS missing",
    icon: "wrench" as StatIconName,
  },
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

export const FORM_RULES_ROWS: FormRuleRow[] = [
  {
    id: "1",
    customer: "Permian Basin Energy",
    code: "FR-5501",
    formTemplate: "JSA",
    status: { label: "Active", variant: "success" },
    trigger: "On dispatch",
    hardGate: "Yes",
    appliesTo: "All jobs",
    version: "V3",
    owner: "R. Crawford",
  },
  {
    id: "2",
    customer: "Apex Drilling Co",
    code: "FR-5502",
    formTemplate: "Permit to work",
    status: { label: "Active", variant: "success" },
    trigger: "On start",
    hardGate: "Yes",
    appliesTo: "Well sites",
    version: "V2",
    owner: "M. Torres",
  },
  {
    id: "3",
    customer: "West Pad Services",
    code: "FR-5503",
    formTemplate: "Tailgate",
    status: { label: "Inactive", variant: "warning" },
    trigger: "Per shift",
    hardGate: "No",
    appliesTo: "All jobs",
    version: "V1",
    owner: "L. Nguyen",
  },
  {
    id: "4",
    customer: "Basin Flow LLC",
    code: "FR-5504",
    formTemplate: "EOD report",
    status: { label: "Draft", variant: "offline" },
    trigger: "End of day",
    hardGate: "No",
    appliesTo: "Field ops",
    version: "V1",
    owner: "R. Crawford",
  },
  {
    id: "5",
    customer: "Horizon Wireline",
    code: "FR-5505",
    formTemplate: "JSA",
    status: { label: "Active", variant: "success" },
    trigger: "On dispatch",
    hardGate: "Yes",
    appliesTo: "All jobs",
    version: "V3",
    owner: "M. Torres",
  },
  {
    id: "6",
    customer: "Red Rock Energy",
    code: "FR-5506",
    formTemplate: "Hot work",
    status: { label: "Inactive", variant: "warning" },
    trigger: "On start",
    hardGate: "Yes",
    appliesTo: "Well sites",
    version: "V2",
    owner: "L. Nguyen",
  },
];
