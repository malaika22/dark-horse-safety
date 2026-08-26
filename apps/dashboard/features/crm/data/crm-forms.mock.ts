import type { DashboardSelectOption } from "@dark-horse-safety/ui";

export const CRM_CUSTOMERS: DashboardSelectOption[] = [
  { value: "pbe", label: "Permian Basin Energy" },
  { value: "apex", label: "Apex Drilling Co" },
  { value: "west", label: "West Pad Services" },
  { value: "basin", label: "Basin Flow LLC" },
];

export const CRM_OWNERS: DashboardSelectOption[] = [
  { value: "r-crawford", label: "R. Crawford" },
  { value: "m-torres", label: "M. Torres" },
  { value: "l-nguyen", label: "L. Nguyen" },
];

export const CONTACT_FORM = {
  roles: [
    { value: "ops-mgr", label: "Operations mgr" },
    { value: "ap", label: "AP / Billing" },
    { value: "field", label: "Field ops" },
    { value: "safety", label: "Safety lead" },
  ] as DashboardSelectOption[],
  channels: [
    { id: "email", label: "Email" },
    { id: "sms", label: "SMS" },
    { id: "call", label: "Call" },
  ],
};

export const REQUIREMENT_FORM = {
  requirements: [
    { value: "h2s", label: "H2S certification" },
    { value: "msa", label: "MSA" },
    { value: "coi", label: "COI" },
    { value: "w9", label: "W-9" },
  ] as DashboardSelectOption[],
  types: [
    { value: "safety", label: "Safety" },
    { value: "contract", label: "Contract" },
    { value: "insurance", label: "Insurance" },
    { value: "tax", label: "Tax" },
  ] as DashboardSelectOption[],
  cycles: [
    { value: "annual", label: "Annual" },
    { value: "quarterly", label: "Quarterly" },
    { value: "monthly", label: "Monthly" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "met", label: "Met" },
    { value: "expiring", label: "Expiring" },
    { value: "missing", label: "Missing" },
    { value: "overdue", label: "Overdue" },
  ] as DashboardSelectOption[],
  docsRequired: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ] as DashboardSelectOption[],
  documentChips: [
    { id: "cert", label: "Cert" },
    { id: "coi", label: "COI" },
    { id: "blank1", label: "—" },
    { id: "blank2", label: "—" },
  ],
};

export const PRICING_FORM = {
  services: [
    { value: "wireline", label: "Wireline logging" },
    { value: "h2s", label: "H2S tech" },
    { value: "standby", label: "Standby" },
    { value: "equipment", label: "Equipment day rate" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "pending", label: "Pending" },
  ] as DashboardSelectOption[],
  appliesTo: [
    { id: "all-jobs", label: "All jobs" },
    { id: "site-safety", label: "Site safety" },
  ],
};

export const FORM_RULE_FORM = {
  templates: [
    { value: "jsa", label: "JSA" },
    { value: "ptw", label: "Permit to work" },
    { value: "tailgate", label: "Tailgate" },
    { value: "eod", label: "EOD report" },
  ] as DashboardSelectOption[],
  triggers: [
    { value: "dispatch", label: "On dispatch" },
    { value: "start", label: "On start" },
    { value: "shift", label: "Per shift" },
    { value: "eod", label: "End of day" },
  ] as DashboardSelectOption[],
  appliesTo: [
    { value: "all", label: "All jobs" },
    { value: "wells", label: "Well sites" },
    { value: "field", label: "Field ops" },
  ] as DashboardSelectOption[],
  versions: [
    { value: "v3", label: "V3" },
    { value: "v2", label: "V2" },
    { value: "v1", label: "V1" },
  ] as DashboardSelectOption[],
  hardGate: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "draft", label: "Draft" },
  ] as DashboardSelectOption[],
  outputs: [
    { id: "pdf", label: "PDF" },
    { id: "locked", label: "Locked" },
    { id: "blank1", label: "—" },
    { id: "blank2", label: "—" },
  ],
};

export const ROUTE_RULE_FORM = {
  locations: [
    { value: "wolfcamp", label: "Wolfcamp 12-4H" },
    { value: "north-flare", label: "North Flare" },
    { value: "east-staging", label: "East Staging" },
  ] as DashboardSelectOption[],
  geofence: [
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
  ] as DashboardSelectOption[],
  gpsRequired: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ] as DashboardSelectOption[],
  alerts: [
    { id: "entry", label: "Entry" },
    { id: "exit", label: "Exit" },
    { id: "blank1", label: "—" },
    { id: "blank2", label: "—" },
  ],
};

export const LOCATION_FORM = {
  wellTypes: [
    { value: "horizontal", label: "Horizontal" },
    { value: "vertical", label: "Vertical" },
    { value: "directional", label: "Directional" },
  ] as DashboardSelectOption[],
  routes: [
    { value: "route-a", label: "Route A" },
    { value: "route-b", label: "Route B" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "active", label: "Active" },
    { value: "idle", label: "Idle" },
  ] as DashboardSelectOption[],
  requirements: [
    { id: "h2s", label: "H2S" },
    { id: "jsa", label: "JSA" },
    { id: "ptw", label: "PTW" },
  ],
};
