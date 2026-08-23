export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon:
    | "dashboard"
    | "crm"
    | "hr"
    | "fleet"
    | "operations"
    | "safety"
    | "report"
    | "settings";
  children?: { id: string; label: string; href: string }[];
};

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
      { id: "crm-hub", label: "CRM Hub", href: "/crm" },
      { id: "crm-leads", label: "Leads", href: "/crm/leads" },
      { id: "crm-accounts", label: "Accounts", href: "/crm/accounts" },
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
      { id: "hr-payroll-review", label: "Payroll Review", href: "/hr/payroll-review" },
      { id: "hr-payroll-export", label: "Payroll Export", href: "/hr/payroll-export" },
      { id: "hr-supervisor", label: "Supervisor Routing", href: "/hr/supervisor-routing" },
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
      { id: "fleet-calibration", label: "Calibration", href: "/fleet/calibration" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "operations",
    children: [
      { id: "ops-dashboard", label: "Ops Dashboard", href: "/operations" },
      { id: "ops-dispatch", label: "Dispatch Calendar", href: "/operations/dispatch" },
      { id: "ops-work-order", label: "Work Order", href: "/operations/work-orders" },
      { id: "ops-sales-ticket", label: "Sales Ticket", href: "/operations/sales-tickets" },
      { id: "ops-billing", label: "Billing Reconciliation", href: "/operations/billing" },
      { id: "ops-po", label: "Purchase Order", href: "/operations/purchase-orders" },
      { id: "ops-netsuite", label: "NetSuite Handoff", href: "/operations/netsuite" },
    ],
  },
  {
    id: "safety",
    label: "Safety & Compliance",
    icon: "safety",
    children: [
      { id: "safety-hub", label: "Safety Hub", href: "/safety" },
      { id: "safety-incidents", label: "Incidents", href: "/safety/incidents" },
      { id: "safety-certs", label: "Certifications", href: "/safety/certifications" },
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
      { id: "settings-integrations", label: "Integrations", href: "/settings/integrations" },
    ],
  },
];
