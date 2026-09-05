import type { Paginated } from "@dark-horse-safety/types";
import { ApiClient } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";

export type ApiData<T> = { data: T };
export type ApiList<T> = ApiData<Paginated<T>>;

export type CrmListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
};

function q(params?: CrmListParams) {
  return ApiClient.query(params);
}

/** Thin CRM API surface — all routes need JWT via `api` singleton. */
export const crmApi = {
  // ── Dashboard overview ───────────────────────────────────────────────────
  dashboardOverview: () =>
    api.get<ApiData<CrmDashboardOverview>>("/crm/dashboard"),

  // ── Customers ────────────────────────────────────────────────────────────
  listCustomers: (params?: CrmListParams) =>
    api.get<ApiList<CrmCustomer>>(`/crm/customers${q(params)}`),
  customersKpi: () => api.get<ApiData<Record<string, number>>>("/crm/customers/kpi"),
  getCustomer: (id: string) =>
    api.get<ApiData<CrmCustomerDetail>>(`/crm/customers/${id}`),
  createCustomer: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmCustomer>>("/crm/customers", body),
  updateCustomer: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmCustomer>>(`/crm/customers/${id}`, body),
  archiveCustomer: (id: string) =>
    api.post<ApiData<CrmCustomer>>(`/crm/customers/${id}/archive`),
  bulkArchiveCustomers: (ids: string[]) =>
    api.post<ApiData<{ updated: number }>>("/crm/customers/bulk/archive", { ids }),
  exportCustomers: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/customers/export${q(params)}`,
    ),

  // ── Contacts ─────────────────────────────────────────────────────────────
  listContacts: (params?: CrmListParams) =>
    api.get<ApiList<CrmContact>>(`/crm/contacts${q(params)}`),
  contactsKpi: () => api.get<ApiData<Record<string, number>>>("/crm/contacts/kpi"),
  getContact: (id: string) =>
    api.get<ApiData<CrmContact>>(`/crm/contacts/${id}`),
  createContact: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmContact>>("/crm/contacts", body),
  updateContact: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmContact>>(`/crm/contacts/${id}`, body),
  archiveContact: (id: string) =>
    api.post<ApiData<CrmContact>>(`/crm/contacts/${id}/archive`),
  exportContacts: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/contacts/export${q(params)}`,
    ),

  // ── Locations ────────────────────────────────────────────────────────────
  listLocations: (params?: CrmListParams) =>
    api.get<ApiList<CrmLocation>>(`/crm/locations${q(params)}`),
  locationsKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/locations/kpi"),
  locationsMapPins: () =>
    api.get<ApiData<CrmMapPin[]>>("/crm/locations/map-pins"),
  getLocation: (id: string) =>
    api.get<ApiData<CrmLocation>>(`/crm/locations/${id}`),
  createLocation: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmLocation>>("/crm/locations", body),
  updateLocation: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmLocation>>(`/crm/locations/${id}`, body),
  archiveLocation: (id: string) =>
    api.post<ApiData<CrmLocation>>(`/crm/locations/${id}/archive`),
  exportLocations: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/locations/export${q(params)}`,
    ),

  // ── Pricing rules ────────────────────────────────────────────────────────
  listPricingRules: (params?: CrmListParams) =>
    api.get<ApiList<CrmPricingRule>>(`/crm/pricing-rules${q(params)}`),
  pricingRulesKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/pricing-rules/kpi"),
  getPricingRule: (id: string) =>
    api.get<ApiData<CrmPricingRule>>(`/crm/pricing-rules/${id}`),
  createPricingRule: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmPricingRule>>("/crm/pricing-rules", body),
  updatePricingRule: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmPricingRule>>(`/crm/pricing-rules/${id}`, body),
  duplicatePricingRule: (id: string) =>
    api.post<ApiData<CrmPricingRule>>(`/crm/pricing-rules/${id}/duplicate`),
  deletePricingRule: (id: string) =>
    api.post<ApiData<CrmPricingRule>>(`/crm/pricing-rules/${id}/archive`).catch(
      () =>
        api.post<ApiData<{ updated: number }>>("/crm/pricing-rules/bulk/delete", {
          ids: [id],
        }),
    ),
  exportPricingRules: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/pricing-rules/export${q(params)}`,
    ),

  // ── Requirements ─────────────────────────────────────────────────────────
  listRequirements: (params?: CrmListParams) =>
    api.get<ApiList<CrmRequirement>>(`/crm/requirements${q(params)}`),
  requirementsKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/requirements/kpi"),
  getRequirement: (id: string) =>
    api.get<ApiData<CrmRequirement>>(`/crm/requirements/${id}`),
  createRequirement: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmRequirement>>("/crm/requirements", body),
  updateRequirement: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmRequirement>>(`/crm/requirements/${id}`, body),
  exportRequirements: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/requirements/export${q(params)}`,
    ),

  // ── Form rules ───────────────────────────────────────────────────────────
  listFormRules: (params?: CrmListParams) =>
    api.get<ApiList<CrmFormRule>>(`/crm/form-rules${q(params)}`),
  formRulesKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/form-rules/kpi"),
  getFormRule: (id: string) =>
    api.get<ApiData<CrmFormRule>>(`/crm/form-rules/${id}`),
  createFormRule: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmFormRule>>("/crm/form-rules", body),
  updateFormRule: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmFormRule>>(`/crm/form-rules/${id}`, body),
  exportFormRules: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/form-rules/export${q(params)}`,
    ),

  // ── Route rules ──────────────────────────────────────────────────────────
  listRouteRules: (params?: CrmListParams) =>
    api.get<ApiList<CrmRouteRule>>(`/crm/route-rules${q(params)}`),
  routeRulesKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/route-rules/kpi"),
  getRouteRule: (id: string) =>
    api.get<ApiData<CrmRouteRule>>(`/crm/route-rules/${id}`),
  createRouteRule: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmRouteRule>>("/crm/route-rules", body),
  updateRouteRule: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmRouteRule>>(`/crm/route-rules/${id}`, body),
  exportRouteRules: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/route-rules/export${q(params)}`,
    ),

  // ── EOD reports ──────────────────────────────────────────────────────────
  listEodReports: (params?: CrmListParams) =>
    api.get<ApiList<CrmEodReport>>(`/crm/eod-reports${q(params)}`),
  eodReportsKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/eod-reports/kpi"),
  getEodReport: (id: string) =>
    api.get<ApiData<CrmEodReport>>(`/crm/eod-reports/${id}`),
  exportEodReports: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/eod-reports/export${q(params)}`,
    ),

  // ── Sales activities ─────────────────────────────────────────────────────
  listSalesActivities: (params?: CrmListParams) =>
    api.get<ApiList<CrmSalesActivity>>(`/crm/sales-activities${q(params)}`),
  salesActivitiesKpi: () =>
    api.get<ApiData<Record<string, number>>>("/crm/sales-activities/kpi"),
  getSalesActivity: (id: string) =>
    api.get<ApiData<CrmSalesActivity>>(`/crm/sales-activities/${id}`),
  createSalesActivity: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmSalesActivity>>("/crm/sales-activities", body),
  updateSalesActivity: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmSalesActivity>>(`/crm/sales-activities/${id}`, body),
  exportSalesActivities: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/sales-activities/export${q(params)}`,
    ),

  // ── Quotes ───────────────────────────────────────────────────────────────
  listQuotes: (params?: CrmListParams) =>
    api.get<ApiList<CrmQuote>>(`/crm/quotes${q(params)}`),
  quotesKpi: () => api.get<ApiData<Record<string, number>>>("/crm/quotes/kpi"),
  getQuote: (id: string) => api.get<ApiData<CrmQuote>>(`/crm/quotes/${id}`),
  createQuote: (body: Record<string, unknown>) =>
    api.post<ApiData<CrmQuote>>("/crm/quotes", body),
  updateQuote: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiData<CrmQuote>>(`/crm/quotes/${id}`, body),
  sendQuote: (id: string) =>
    api.post<ApiData<CrmQuote>>(`/crm/quotes/${id}/send`),
  exportQuotes: (params?: CrmListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/crm/quotes/export${q(params)}`,
    ),

  // ── Saved views ──────────────────────────────────────────────────────────
  listSavedViews: (scope: string) =>
    api.get<ApiData<CrmSavedView[]>>(
      `/crm/saved-views${q({ scope })}`,
    ),
  createSavedView: (body: {
    name: string;
    scope: string;
    payload: unknown;
    isDefault?: boolean;
  }) => api.post<ApiData<CrmSavedView>>("/crm/saved-views", body),
  deleteSavedView: (id: string) =>
    api.delete<ApiData<{ deleted: boolean }> | void>(`/crm/saved-views/${id}`),

  // ── Lookups ──────────────────────────────────────────────────────────────
  lookups: () => api.get<ApiData<CrmLookupMap>>("/crm/lookups"),
  lookupCustomers: (search?: string) =>
    api.get<ApiData<{ id: string; name: string; code: string }[]>>(
      `/crm/lookups/customers${q({ q: search })}`,
    ),
  lookupLocations: (search?: string, customerId?: string) =>
    api.get<
      ApiData<
        {
          id: string;
          name: string;
          code: string;
          customerId: string;
          county?: string | null;
        }[]
      >
    >(`/crm/lookups/locations${q({ q: search, customerId })}`),
  lookupReps: () =>
    api.get<
      ApiData<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }[]>
    >("/crm/lookups/reps"),
};

export type CrmLookupOption = { value: string; label: string };
export type CrmLookupMap = Record<string, CrmLookupOption[]>;

export type CrmUserRef = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type CrmCustomer = {
  id: string;
  code: string;
  name: string;
  status: string;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  openJobs?: number;
  msaExpiry?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  assignedRep?: CrmUserRef | null;
  _count?: { contacts?: number; locations?: number };
};

export type CrmCustomerDetail = CrmCustomer & {
  legalEntityName?: string | null;
  website?: string | null;
  billingAddress?: string | null;
  mailingAddress?: string | null;
  paymentTerms?: string | null;
  creditLimit?: string | number | null;
  taxExempt?: boolean;
  taxId?: string | null;
  pricingTier?: string | null;
  netsuiteId?: string | null;
  isnId?: string | null;
  veriforceId?: string | null;
  msaOnFile?: boolean;
  coiExpiry?: string | null;
  w9OnFile?: string | null;
  clockInRadius?: string | null;
  requiresPo?: boolean;
  defaultRequiredForms?: string | null;
  contacts?: CrmContact[];
  locations?: CrmLocation[];
};

export type CrmContact = {
  id: string;
  code: string;
  fullName: string;
  roleTitle?: string | null;
  email?: string | null;
  mobile?: string | null;
  officePhone?: string | null;
  preferredMethod?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
  linkedFromScan?: string | null;
  status: string;
  locationLabel?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  primaryCustomerId?: string | null;
  primaryCustomer?: { id: string; name: string; code?: string } | null;
  assignedRep?: CrmUserRef | null;
};

export type CrmLocation = {
  id: string;
  code: string;
  name: string;
  wellPadNumber?: string | null;
  apiNumber?: string | null;
  county?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  siteType?: string | null;
  status: string;
  accessNotes?: string | null;
  siteContact?: string | null;
  geofenceRadius?: string | null;
  gpsRequired?: boolean;
  nearestHospital?: string | null;
  openJobs?: number;
  gpsStatus?: string | null;
  city?: string | null;
  customerId: string;
  customer?: { id: string; name: string; code?: string } | null;
  createdAt: string;
};

export type CrmMapPin = {
  id: string;
  name?: string;
  label?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  customerId?: string;
  x?: number;
  y?: number;
  active?: boolean;
};

export type CrmPricingRule = {
  id: string;
  code: string;
  serviceItem: string;
  rateType?: string | null;
  rate: string | number;
  unit?: string | null;
  minimumCharge?: string | number | null;
  overtimeMultiplier?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  status: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  owner?: CrmUserRef | null;
  createdAt: string;
};

export type CrmRequirement = {
  id: string;
  code: string;
  name: string;
  requirementType?: string | null;
  appliesTo?: string | null;
  enforcementLevel?: string;
  evidenceRequired?: boolean;
  renewalPeriod?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  reviewCycle?: string | null;
  docsRequired?: boolean;
  status: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  owner?: CrmUserRef | null;
  createdAt: string;
};

export type CrmFormRule = {
  id: string;
  code: string;
  jobType?: string | null;
  formTemplate: string;
  required?: boolean;
  hardGate?: boolean;
  blocksToggle?: boolean;
  due?: string | null;
  appliesFrom?: string | null;
  trigger?: string | null;
  appliesTo?: string | null;
  version?: string | null;
  status: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  owner?: CrmUserRef | null;
  createdAt: string;
};

export type CrmRouteRule = {
  id: string;
  code: string;
  geofenceRadius?: string | null;
  gpsRequired?: boolean;
  clockInWindow?: string | null;
  routeFrom?: string | null;
  expectedTravelTime?: string | null;
  mileageRateOverride?: string | null;
  routeLabel?: string | null;
  status: string;
  customerId: string;
  locationId?: string | null;
  customer?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  owner?: CrmUserRef | null;
  createdAt: string;
};

export type CrmEodReport = {
  id: string;
  reportCode: string;
  reportDate: string;
  submittedAt?: string | null;
  activitiesCount?: number;
  callsCount?: number;
  callsDetail?: string | null;
  visitsCount?: number;
  visitsDetail?: string | null;
  meetingsCount?: number;
  meetingsNote?: string | null;
  quotesNote?: string | null;
  pipelineNote?: string | null;
  notes?: string | null;
  status: string;
  pipelineValue?: string | number | null;
  quotesSent?: number;
  closedToday?: string | number | null;
  nextDayPlan?: string | null;
  rep?: CrmUserRef | null;
  activityLines?: { id: string; summary: string }[];
  createdAt: string;
};

export type CrmSalesActivity = {
  id: string;
  activityCode: string;
  type: string;
  subject?: string | null;
  outcome?: string | null;
  duration?: string | null;
  notes?: string | null;
  followUpAt?: string | null;
  status: string;
  activityAt: string;
  customer?: { id: string; name: string } | null;
  contact?: { id: string; fullName: string } | null;
  rep?: CrmUserRef | null;
  createdAt: string;
};

export type CrmQuote = {
  id: string;
  quoteNumber: string;
  amount: string | number;
  status: string;
  approvalStatus?: string;
  expiresAt?: string | null;
  sentAt?: string | null;
  terms?: string | null;
  notes?: string | null;
  customer?: { id: string; name: string } | null;
  contact?: { id: string; fullName: string } | null;
  owner?: CrmUserRef | null;
  lineItems?: {
    id: string;
    item: string;
    quantity: string | number;
    rate: string | number;
    amount: string | number;
  }[];
  createdAt: string;
};

export type CrmSavedView = {
  id: string;
  name: string;
  scope: string;
  payload: unknown;
  isDefault?: boolean;
};

export type CrmDashboardOverview = {
  customers: {
    total: number;
    active: number;
    archived: number;
    needsReview: number;
  };
  eod: {
    today: number;
    submitted: number;
    pending: number;
    activities: number;
    pipeline: number;
  };
  sales: {
    thisWeek: number;
    calls: number;
    visits: number;
    meetings: number;
    followUps: number;
  };
  quotes: {
    draft: number;
    sent: number;
    approved: number;
    expired: number;
    converted: number;
    openPipeline: number;
  };
  recentSales: {
    id: string;
    code: string;
    type: string;
    subject: string | null;
    customer: string | null;
    contact: string | null;
    rep: string | null;
    activityAt: string;
    outcome: string | null;
    status: string;
  }[];
  syncedAt: string;
};

/** Trigger browser download for CSV export payloads. */
export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
