export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon:
    | "dashboard"
    | "crm"
    | "sales"
    | "hr"
    | "fleet"
    | "operations"
    | "safety"
    | "report"
    | "settings";
  children?: { id: string; label: string; href: string }[];
};

/**
 * Admin sidebar — Figma Navigation / Config Access.
 * CRM is split into CRM hub, Accounts, Sales, and Configuration sections.
 */
export const APP_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    id: "crm",
    label: "CRM / Customer",
    icon: "crm",
    children: [
      { id: "crm-dashboard", label: "Dashboard", href: "/crm" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: "crm",
    children: [
      { id: "crm-customers", label: "Customers", href: "/crm/accounts" },
      { id: "crm-contacts", label: "Contacts", href: "/crm/contacts" },
      { id: "crm-locations", label: "Locations / Wells", href: "/crm/locations" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: "sales",
    children: [
      { id: "sales-quotes", label: "Quotes", href: "/crm/quotes" },
      { id: "sales-activity", label: "Sales Activity", href: "/crm/sales" },
      { id: "sales-eod", label: "EOD Reports", href: "/crm/eod-reports" },
      {
        id: "sales-calendar",
        label: "Sales Calendar",
        href: "/crm/sales-calendar",
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: "crm",
    children: [
      { id: "crm-pricing", label: "Pricing Rules", href: "/crm/pricing-rules" },
      {
        id: "crm-requirements",
        label: "Customer Requirements",
        href: "/crm/requirements",
      },
      { id: "crm-form-rules", label: "Form Rules", href: "/crm/form-rules" },
      {
        id: "crm-route-rules",
        label: "Route / GPS Rules",
        href: "/crm/route-rules",
      },
      {
        id: "crm-ns-customer-mapping",
        label: "NetSuite Customer Mapping",
        href: "/crm/netsuite-customer-mapping",
      },
      {
        id: "crm-ns-item-mapping",
        label: "NetSuite Item Mapping",
        href: "/crm/netsuite-item-mapping",
      },
      {
        id: "crm-ns-item-rate-mapping",
        label: "Item Rate Mapping",
        href: "/crm/item-rate-mapping",
      },
    ],
  },
  {
    id: "hr",
    label: "Employees & HR",
    icon: "hr",
    children: [
      { id: "hr-dashboard", label: "HR Dashboard", href: "/hr" },
      { id: "hr-employees", label: "Employees", href: "/hr/employees" },
      { id: "hr-time-entries", label: "Time Entries", href: "/hr/time-entries" },
      { id: "hr-time-off", label: "Time Off", href: "/hr/time-off" },
      {
        id: "hr-payroll-review",
        label: "Payroll Review",
        href: "/hr/payroll-review",
      },
      {
        id: "hr-payroll-export",
        label: "Payroll Export",
        href: "/hr/payroll-export",
      },
      {
        id: "hr-supervisor",
        label: "Supervisor Routing",
        href: "/hr/supervisor-routing",
      },
      { id: "hr-training", label: "Training / SSE", href: "/hr/training" },
      { id: "hr-pay-cycle", label: "Pay Cycle Setting", href: "/hr/pay-cycle" },
    ],
  },
  {
    id: "fleet",
    label: "Fleet & Assets",
    icon: "fleet",
    children: [
      { id: "fleet-hub", label: "Fleet Hub", href: "/fleet" },
      { id: "fleet-assets", label: "Assets", href: "/fleet/assets" },
      {
        id: "fleet-calibration",
        label: "Calibration",
        href: "/fleet/calibration",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "operations",
    children: [
      { id: "ops-dashboard", label: "Ops Dashboard", href: "/operations" },
      {
        id: "ops-dispatch",
        label: "Dispatch Calender",
        href: "/operations/dispatch",
      },
      {
        id: "ops-work-order",
        label: "Work Order",
        href: "/operations/work-orders",
      },
      {
        id: "ops-sales-ticket",
        label: "Sales Ticket",
        href: "/operations/sales-tickets",
      },
      {
        id: "ops-billing",
        label: "Billing Reconciliation",
        href: "/operations/billing",
      },
      {
        id: "ops-po",
        label: "Purchase Order",
        href: "/operations/purchase-orders",
      },
      {
        id: "ops-netsuite",
        label: "NetSuite Handoff",
        href: "/operations/netsuite",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety & Compliance",
    icon: "safety",
    children: [
      { id: "safety-hub", label: "Safety Hub", href: "/safety" },
      { id: "safety-incidents", label: "Incidents", href: "/safety/incidents" },
      {
        id: "safety-certs",
        label: "Certifications",
        href: "/safety/certifications",
      },
    ],
  },
  {
    id: "report",
    label: "Report",
    icon: "report",
    children: [
      { id: "reports-hub", label: "Reports Hub", href: "/reports" },
      {
        id: "reports-payroll",
        label: "Payroll-Ready Report",
        href: "/reports/payroll-ready",
      },
    ],
  },
  {
    id: "settings",
    label: "Setting",
    icon: "settings",
    children: [
      { id: "settings-hub", label: "Settings", href: "/settings" },
      { id: "settings-users", label: "Users", href: "/settings/users" },
      {
        id: "settings-integrations",
        label: "Integrations",
        href: "/settings/integrations",
      },
    ],
  },
];
