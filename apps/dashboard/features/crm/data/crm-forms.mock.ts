import type { DashboardSelectOption } from "@dark-horse-safety/ui";

export const CRM_CUSTOMERS: DashboardSelectOption[] = [
  { value: "pbe", label: "Permian Energy Co." },
  { value: "apex", label: "Apex Drilling Co" },
  { value: "west", label: "West Pad Services" },
  { value: "basin", label: "Basin Flow LLC" },
];

export const CRM_OWNERS: DashboardSelectOption[] = [
  { value: "r-crawford", label: "R. Crawford" },
  { value: "m-torres", label: "M. Torres" },
  { value: "l-nguyen", label: "L. Nguyen" },
];

export const CUSTOMER_FORM = {
  statuses: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "needs-review", label: "Needs review" },
  ] as DashboardSelectOption[],
  assignedReps: [
    { value: "sarah-mitchell", label: "Sarah Mitchell" },
    { value: "r-crawford", label: "R. Crawford" },
    { value: "m-torres", label: "M. Torres" },
    { value: "l-nguyen", label: "L. Nguyen" },
  ] as DashboardSelectOption[],
  industries: [
    { value: "oil-gas", label: "Oil & Gas" },
    { value: "construction", label: "Construction" },
    { value: "utilities", label: "Utilities" },
  ] as DashboardSelectOption[],
  billingAddresses: [
    {
      value: "midland-wall",
      label: "1200 W Wall St, Midland, TX 79701",
    },
    {
      value: "odessa-main",
      label: "4500 E Main St, Odessa, TX 79762",
    },
  ] as DashboardSelectOption[],
  paymentTerms: [
    { value: "net-15", label: "Net 15" },
    { value: "net-30", label: "Net 30" },
    { value: "net-60", label: "Net 60" },
  ] as DashboardSelectOption[],
  pricingTiers: [
    { value: "standard", label: "Standard" },
    { value: "enterprise", label: "Enterprise" },
    { value: "custom", label: "Custom" },
  ] as DashboardSelectOption[],
};

/** Prefill values for Edit Customer (Figma). */
export const CUSTOMER_FORM_EDIT_DEFAULTS = {
  customerName: "Permian Basin Energy",
  legalEntityName: "Permian Basin Energy Holdings LLC",
  customerId: "CUST-004021",
  status: "active",
  assignedRep: "sarah-mitchell",
  industry: "oil-gas",
  website: "www.permianbasinenergy.com",
  phone: "(432) 555-0184",
  billingAddress: "midland-wall",
  mailingAddress: "PO Box 4821, Midland, TX 79702",
  paymentTerms: "net-60",
  creditLimit: "$50,000.00",
  taxExempt: false,
  taxId: "82-3749201",
  pricingTier: "enterprise",
  netsuiteId: "NS-829471",
  isnId: "ISN-40058723",
  veriforceId: "VF-2039185",
  msaOnFile: false,
  msaExpiry: "12/31/2026",
  coiExpiry: "03/15/2027",
  w9OnFile: "$125,000.00",
  clockInRadius: "CUST-007394",
  requiresPo: false,
  requiredForms: "JSA, FLRA, TBT",
} as const;

export const CONTACT_FORM = {
  roles: [
    { value: "ops-mgr", label: "Operations Manager" },
    { value: "site-supervisor", label: "Site Supervisor" },
    { value: "ap", label: "AP / Billing" },
    { value: "field", label: "Field Ops" },
    { value: "safety", label: "Safety Lead" },
  ] as DashboardSelectOption[],
  preferredMethods: [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "sms", label: "SMS" },
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
    { value: "certification", label: "Certification" },
    { value: "safety", label: "Safety" },
    { value: "contract", label: "Contract" },
    { value: "insurance", label: "Insurance" },
    { value: "tax", label: "Tax" },
  ] as DashboardSelectOption[],
  appliesTo: [
    { value: "all", label: "All" },
    { value: "wells", label: "Well sites" },
    { value: "field", label: "Field ops" },
  ] as DashboardSelectOption[],
  enforcementLevels: [
    { value: "hard-gate", label: "Hard Gate" },
    { value: "soft-gate", label: "Soft Gate" },
    { value: "advisory", label: "Advisory" },
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

/** Prefill values for Add / Edit Requirement (Figma). */
export const REQUIREMENT_FORM_DEFAULTS = {
  customer: "Permian Basin Energy",
  requirementType: "certification",
  requirement: "H2S Safety Certification",
  appliesTo: "all",
  enforcementLevel: "hard-gate",
  evidenceRequired: false,
  renewalPeriod: "Anually",
  notes:
    "Must be renewed within 30 days of expiration; verified by safety coordinator...",
} as const;

export const PRICING_FORM = {
  services: [
    { value: "wireline", label: "Wireline Logging" },
    { value: "h2s", label: "H2S Tech" },
    { value: "standby", label: "Standby" },
    { value: "equipment", label: "Equipment Day Rate" },
    { value: "pump-down", label: "Pump Down" },
  ] as DashboardSelectOption[],
  rateTypes: [
    { value: "per-job", label: "Per Job" },
    { value: "per-hr", label: "Per Hr" },
    { value: "per-run", label: "Per Run" },
  ] as DashboardSelectOption[],
  units: [
    { value: "job", label: "Job" },
    { value: "hr", label: "Hr" },
    { value: "run", label: "Run" },
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

/** Prefill values for Edit Pricing Rule (Figma). */
export const PRICING_FORM_EDIT_DEFAULTS = {
  customer: "Permian Basin Energy",
  service: "wireline",
  rateType: "per-job",
  rate: "$1,250",
  unit: "job",
  minimumCharge: "$1,250",
  overtimeMultiplier: "1.5X",
  effectiveFrom: "09/01/2026",
  effectiveTo: "12/31/2026",
  notes:
    "Approved discounted rate for Q4 high-volume wireline logging contract, PE...",
} as const;

export const FORM_RULE_FORM = {
  templates: [
    { value: "wireline-v2", label: "Wireline Operations V2" },
    { value: "jsa", label: "JSA" },
    { value: "ptw", label: "Permit to work" },
    { value: "tailgate", label: "Tailgate" },
    { value: "eod", label: "EOD report" },
  ] as DashboardSelectOption[],
  jobTypes: [
    { value: "jsa", label: "JSA" },
    { value: "ptw", label: "Permit to Work" },
    { value: "wireline", label: "Wireline" },
    { value: "h2s", label: "H2S" },
  ] as DashboardSelectOption[],
  dueOptions: [
    { value: "before-start", label: "Before Job Start" },
    { value: "on-dispatch", label: "On Dispatch" },
    { value: "per-shift", label: "Per Shift" },
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

/** Prefill values for Add / Edit Form Rule (Figma). */
export const FORM_RULE_FORM_DEFAULTS = {
  customer: "Permian Basin Energy",
  jobType: "jsa",
  formTemplate: "wireline-v2",
  required: false,
  hardgate: false,
  blocksToggle: false,
  due: "before-start",
  appliesFrom: "09/01/2026",
} as const;

export const ROUTE_RULE_FORM = {
  locations: [
    { value: "wolfcamp", label: "Wolfcamp 12-4H" },
    { value: "north-flare", label: "North Flare" },
    { value: "east-staging", label: "East Staging" },
  ] as DashboardSelectOption[],
  routesFrom: [
    {
      value: "midland-349",
      label: "Midland Yard – Highway 349",
    },
    {
      value: "odessa-yard",
      label: "Odessa Yard – I-20",
    },
    {
      value: "pecos-yard",
      label: "Pecos Yard – US-285",
    },
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

/** Prefill values for Add / Edit Route Rule (Figma). */
export const ROUTE_RULE_FORM_DEFAULTS = {
  customer: "Permian Basin Energy",
  site: "wolfcamp",
  geofenceRadius: "500 FT",
  gpsRequired: true,
  clockInWindow: "15 Min Before/After Shift Start",
  routeFrom: "midland-349",
  expectedTravelTime: "45 Min",
  mileageRateOverride: "$0.67/Mi",
} as const;

export const LOCATION_FORM = {
  counties: [
    { value: "midland", label: "Midland" },
    { value: "ector", label: "Ector" },
    { value: "reeves", label: "Reeves" },
  ] as DashboardSelectOption[],
  states: [
    { value: "tx", label: "TX" },
    { value: "nm", label: "NM" },
    { value: "ok", label: "OK" },
  ] as DashboardSelectOption[],
  siteTypes: [
    { value: "well", label: "Well" },
    { value: "pad", label: "Pad" },
    { value: "facility", label: "Facility" },
  ] as DashboardSelectOption[],
  siteContacts: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ] as DashboardSelectOption[],
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

/** Prefill values for Edit Location (Figma). */
export const LOCATION_FORM_EDIT_DEFAULTS = {
  locationName: "Wolfcamp 12-4H",
  wellPadNumber: "WPC-1204",
  apiNumber: "42-329-35421",
  customer: "Permian Basin Energy",
  county: "midland",
  state: "tx",
  coordinates: "31.8973, -102.0779",
  siteType: "well",
  status: "active",
  accessNotes: "Site damp by rain",
  siteContact: "active",
  geofenceRadius: "Gate code: 4521. Use south entrance.",
  gpsRequired: false,
  nearestHospital: "Midland Memorial Hospital",
} as const;
