import type { Paginated } from "@dark-horse-safety/types";
import { api } from "@/lib/api";

type ApiData<T> = { data: T };
type ApiList<T> = ApiData<Paginated<T>>;

function q(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type EquipmentRuleOverride = {
  customerId: string;
  customerName: string;
  qty: number;
  standardQty: number;
};

export type EquipmentRule = {
  id: string;
  code: string;
  equipment: string;
  qty: number;
  per: string;
  perLabel: string;
  enforcement: string;
  enforcementLabel: string;
  enforcementTone: string;
  substitutes: string | null;
  appliesTo: string;
  condition: string | null;
  jobType: string;
  status: string;
  statusLabel: string;
  hasOverride: boolean;
  overrides: EquipmentRuleOverride[];
};

export type EquipmentRuleGroup = {
  jobType: string;
  count: number;
  rules: EquipmentRule[];
};

export type EquipmentRulesKpiCell = {
  title: string;
  value: string;
  meta: string;
};

export type EquipmentRulesInsights = {
  currentlyBlocking: {
    count: number;
    items: Array<{
      id: string;
      code: string;
      customerName: string;
      missing: string;
      dateLabel: string;
    }>;
    inventoryNote: string | null;
  };
  coverageGaps: {
    count: number;
    items: Array<{ jobType: string; message: string }>;
  };
  mostMissed: {
    title: string;
    items: Array<{
      truck: string;
      driver: string;
      items: Array<{ equipment: string; absences: number }>;
    }>;
  };
};

export type FleetDashboardStat = {
  title: string;
  value: string;
  meta: string;
  icon: string;
};

export type FleetDashboardOverview = {
  updatedAtLabel: string;
  stats: FleetDashboardStat[];
  openRepairs: Array<{
    id: string;
    code: string;
    assetLabel: string;
    truck: string;
    ageLabel: string;
    priority: string;
    priorityLabel: string;
    priorityTone: string;
  }>;
  calibrationExpiring: Array<{
    id: string;
    assetLabel: string;
    assetCode: string;
    status: string;
    statusLabel: string;
    statusTone: string;
  }>;
  failedInspections: Array<{
    id: string;
    code: string;
    assetLabel: string;
    truck: string;
    type: string;
    ageLabel: string;
    result: string;
    resultLabel: string;
    resultTone: string;
  }>;
  truckReadiness: Array<{
    truck: string;
    driver: string;
    percent: number;
    tone: "success" | "warning" | "error";
  }>;
  recentMovement: Array<{
    id: string;
    text: string;
    meta: string;
    when: string;
  }>;
  lowInventory: Array<{
    id: string;
    name: string;
    location: string;
    stockLabel: string;
    tone: string;
  }>;
  assetHealth: Array<{
    id: string;
    label: string;
    value: string;
    badge: string;
    tone: string;
  }>;
};

export const fleetApi = {
  dashboardOverview: () =>
    api.get<ApiData<FleetDashboardOverview>>(`/fleet/dashboard`),

  listEquipmentRules: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    jobType?: string;
    enforcement?: string;
    status?: string;
    sort?: string;
  }) =>
    api.get<
      ApiList<EquipmentRule> & {
        data: Paginated<EquipmentRule> & { groups: EquipmentRuleGroup[] };
      }
    >(`/fleet/equipment-rules${q(params)}`),

  equipmentRulesKpi: () =>
    api.get<ApiData<{ cells: EquipmentRulesKpiCell[] }>>(
      `/fleet/equipment-rules/kpi`,
    ),

  equipmentRulesInsights: () =>
    api.get<ApiData<EquipmentRulesInsights>>(`/fleet/equipment-rules/insights`),

  getEquipmentRule: (id: string) =>
    api.get<ApiData<EquipmentRule>>(`/fleet/equipment-rules/${id}`),

  createEquipmentRule: (body: {
    equipment: string;
    jobType: string;
    qty?: number;
    per?: string;
    enforcement?: string;
    substitutes?: string;
    appliesTo?: string;
    condition?: string;
  }) => api.post<ApiData<EquipmentRule>>(`/fleet/equipment-rules`, body),

  updateEquipmentRule: (
    id: string,
    body: Partial<{
      equipment: string;
      jobType: string;
      qty: number;
      per: string;
      enforcement: string;
      substitutes: string;
      appliesTo: string;
      condition: string;
      status: string;
    }>,
  ) => api.patch<ApiData<EquipmentRule>>(`/fleet/equipment-rules/${id}`, body),

  deactivateEquipmentRule: (id: string) =>
    api.post<ApiData<EquipmentRule>>(
      `/fleet/equipment-rules/${id}/deactivate`,
      {},
    ),

  copyEquipmentRule: (id: string, jobType: string) =>
    api.post<ApiData<EquipmentRule>>(`/fleet/equipment-rules/${id}/copy`, {
      jobType,
    }),

  addCustomerOverride: (
    id: string,
    body: { customerId: string; qty?: number },
  ) =>
    api.post<ApiData<EquipmentRule>>(
      `/fleet/equipment-rules/${id}/overrides`,
      body,
    ),

  affectedWorkOrders: (id: string) =>
    api.get<
      ApiData<{
        ruleId: string;
        equipment: string;
        jobType: string;
        items: Array<{
          id: string;
          code: string;
          customerName: string;
          title: string;
          status: string;
        }>;
      }>
    >(`/fleet/equipment-rules/${id}/affected-work-orders`),

  testEquipmentRule: (id: string, workOrderId: string) =>
    api.post<
      ApiData<{
        ok: boolean;
        workOrderCode: string;
        customerName: string;
        equipment: string;
        enforcement: string;
        result: string;
      }>
    >(`/fleet/equipment-rules/${id}/test`, { workOrderId }),

  // ── Inspections ──────────────────────────────────────────────────────────
  listInspections: (params?: FleetListParams) =>
    api.get<ApiList<FleetInspection>>(`/fleet/inspections${q(params)}`),

  inspectionsKpi: () =>
    api.get<
      ApiData<{
        cells: FleetKpiCell[];
        emptyHints?: Record<string, FleetEmptyHint>;
      }>
    >(`/fleet/inspections/kpi`),

  getInspection: (id: string) =>
    api.get<ApiData<FleetInspectionDetail>>(`/fleet/inspections/${id}`),

  markInspectionsReviewed: (ids: string[], reviewedBy?: string) =>
    api.post<ApiData<{ updated: number; items: FleetInspection[] }>>(
      `/fleet/inspections/bulk-review`,
      { ids, reviewedBy },
    ),

  createCorrectiveAction: (
    id: string,
    body: {
      rootCause: string;
      description: string;
      assignedTo: string;
      dueAt?: string;
      priority?: string;
      findings?: string[];
    },
  ) =>
    api.post<ApiData<{ message: string; code: string }>>(
      `/fleet/inspections/${id}/corrective-action`,
      body,
    ),

  reinspect: (
    id: string,
    body: {
      recheckLabels?: string[];
      includeAll?: boolean;
      inspectorName?: string;
      dueAt?: string;
      source?: string;
      notes?: string;
    },
  ) =>
    api.post<
      ApiData<
        FleetInspection & {
          message: string;
          basedOn: {
            id: string;
            code: string;
            result: string;
            dateLabel: string | null;
          };
          recheckLabels: string[];
        }
      >
    >(`/fleet/inspections/${id}/reinspect`, body),

  editInspection: (
    id: string,
    body: {
      reason: string;
      details: string;
      result?: string;
      findingsSummary?: string;
      checklistItems?: Array<{ label: string; result?: string; note?: string }>;
      editedBy?: string;
    },
  ) =>
    api.patch<ApiData<FleetInspection & { message: string }>>(
      `/fleet/inspections/${id}`,
      body,
    ),

  createRepairFromInspection: (
    id: string,
    body?: {
      issue?: string;
      priority?: string;
      vendorName?: string;
      assignedName?: string;
    },
  ) =>
    api.post<ApiData<{ id: string; code: string; message: string }>>(
      `/fleet/inspections/${id}/repair`,
      body ?? {},
    ),

  // ── Calibration ──────────────────────────────────────────────────────────
  listCalibrations: (params?: FleetListParams) =>
    api.get<ApiList<FleetCalibration>>(`/fleet/calibration${q(params)}`),

  calibrationsKpi: () =>
    api.get<
      ApiData<{
        cells: FleetKpiCell[];
        emptyHints?: Record<string, FleetEmptyHint>;
      }>
    >(`/fleet/calibration/kpi`),

  getCalibration: (id: string) =>
    api.get<ApiData<FleetCalibration>>(`/fleet/calibration/${id}`),

  markCalibrationOutOfService: (id: string) =>
    api.post<ApiData<FleetCalibration>>(
      `/fleet/calibration/${id}/out-of-service`,
      {},
    ),

  adjustCalibrationFrequency: (id: string, frequencyDays: number) =>
    api.post<ApiData<FleetCalibration>>(
      `/fleet/calibration/${id}/adjust-frequency`,
      { frequencyDays },
    ),

  // ── Repair requests ──────────────────────────────────────────────────────
  listRepairs: (params?: FleetListParams) =>
    api.get<ApiList<FleetRepair>>(`/fleet/repair-requests${q(params)}`),

  repairsKpi: () =>
    api.get<
      ApiData<{
        cells: FleetKpiCell[];
        emptyHints?: Record<string, FleetEmptyHint>;
      }>
    >(`/fleet/repair-requests/kpi`),

  repairsWorkflow: () =>
    api.get<
      ApiData<{
        columns: Array<{
          status: string;
          statusLabel: string;
          count: number;
          items: FleetRepair[];
        }>;
      }>
    >(`/fleet/repair-requests/workflow`),

  getRepair: (id: string) =>
    api.get<ApiData<FleetRepair>>(`/fleet/repair-requests/${id}`),

  updateRepair: (
    id: string,
    body: Partial<{
      vendorName: string;
      assignedName: string;
      etaLabel: string;
      purchaseOrder: string;
      status: string;
      priority: string;
    }>,
  ) =>
    api.patch<ApiData<FleetRepair>>(`/fleet/repair-requests/${id}`, body),

  cancelRepair: (id: string) =>
    api.post<ApiData<FleetRepair>>(`/fleet/repair-requests/${id}/cancel`, {}),

  resolveRepair: (id: string) =>
    api.post<ApiData<FleetRepair>>(`/fleet/repair-requests/${id}/resolve`, {}),

  // ── Customer-owned equipment ─────────────────────────────────────────────
  listCustomerOwned: (params?: FleetListParams) =>
    api.get<ApiList<FleetCustomerOwned>>(
      `/fleet/customer-owned${q(params)}`,
    ),

  customerOwnedKpi: () =>
    api.get<ApiData<{ cells: FleetKpiCell[] }>>(`/fleet/customer-owned/kpi`),

  getCustomerOwned: (id: string) =>
    api.get<ApiData<FleetCustomerOwned>>(`/fleet/customer-owned/${id}`),

  markCustomerOwnedReviewed: (ids: string[], reviewedBy?: string) =>
    api.post<ApiData<{ updated: number; items: FleetCustomerOwned[] }>>(
      `/fleet/customer-owned/bulk-review`,
      { ids, reviewedBy },
    ),
};

export type FleetListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  direction?: string;
  status?: string;
  result?: string;
  type?: string;
  asset?: string;
  parentTruck?: string;
  inspector?: string;
  from?: string;
  to?: string;
  hasLinkedRepair?: boolean;
  payrollBlocking?: boolean;
  overdueVsEta?: boolean;
  priority?: string;
};

export type FleetKpiCell = {
  title: string;
  value: string;
  meta?: string;
  metaTone?: "muted" | "success";
  filterKey?: string;
};

export type FleetEmptyHint = {
  title: string;
  subtitle: string;
  actionLabel: string;
};

export type FleetChecklistItem = {
  label: string;
  detail: string;
  result: "PASS" | "FAIL" | string;
  note?: string;
};

export type FleetFinding = {
  label: string;
  detail?: string;
  failed?: boolean;
};

export type FleetInspection = {
  id: string;
  code: string;
  assetCode: string;
  assetLabel: string;
  parentTruck: string | null;
  inspectorName: string;
  dateLabel: string | null;
  dueLabel: string | null;
  result: string;
  resultLabel: string;
  resultTone: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  type: string | null;
  itemsFailed: number;
  itemsPassed?: number;
  checklistTotal?: number;
  findings: FleetFinding[];
  failedItems?: FleetFinding[];
  checklistItems?: FleetChecklistItem[];
  payrollBlocking: boolean;
  hasLinkedRepair: boolean;
  repairCode: string | null;
  workOrderCode: string | null;
  customerName: string | null;
  locationLabel: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  serial?: string | null;
  source?: string | null;
  sourceLabel?: string | null;
  findingsSummary?: string | null;
  photos?: Array<{
    caption?: string;
    takenAt?: string;
    gps?: string;
  }>;
  actionsTaken?: string[];
  version?: number;
  parentInspectionId?: string | null;
  reInspectionId?: string | null;
  reInspectionDueAt?: string | null;
  reInspectionDueLabel?: string | null;
  editReason?: string | null;
  editDetails?: string | null;
  editedBy?: string | null;
  editedAt?: string | null;
};

export type FleetInspectionDetail = FleetInspection & {
  correctiveActions: Array<{
    id: string;
    code: string;
    rootCause: string;
    description: string;
    assignedTo: string;
    dueAt: string | null;
    dueLabel: string | null;
    priority: string;
  }>;
  linkedRepair: {
    id: string;
    code: string;
    assetLabel: string;
    issue: string;
    status: string;
    statusLabel?: string;
    priority: string;
    vendorName?: string | null;
    etaLabel?: string | null;
  } | null;
  reInspection: {
    id: string;
    code: string;
    dueLabel: string | null;
    status: string;
    inspectorName: string;
  } | null;
  correctiveActionRaised: boolean;
  nav: {
    index: number;
    total: number;
    prevId: string | null;
    nextId: string | null;
    orderLabel: string;
  };
  lockedFields: string[];
  editReasons: string[];
};

export type FleetCalibration = {
  id: string;
  code: string;
  assetCode: string;
  assetLabel: string;
  model: string;
  serial: string | null;
  parentTruck: string | null;
  dateLabel: string | null;
  dueLabel: string | null;
  result: string;
  resultLabel: string;
  resultTone: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  frequencyDays: number;
};

export type FleetRepair = {
  id: string;
  code: string;
  assetCode: string;
  assetLabel: string;
  issue: string;
  parentTruck: string | null;
  priority: string;
  priorityLabel: string;
  priorityTone: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  vendorName: string | null;
  vendor: string | null;
  assignedName: string | null;
  etaLabel: string | null;
  dateLabel: string | null;
  overdueVsEta: boolean;
  purchaseOrder: string | null;
  contactPhone: string | null;
  inspectionCode: string | null;
};

export type FleetCustomerOwned = {
  id: string;
  code: string;
  description: string;
  customerId: string | null;
  customerName: string;
  wellSite: string;
  county: string | null;
  lastInspectionResult: string | null;
  dateLabel: string | null;
  dueLabel: string | null;
  status: string;
  statusLabel: string;
  statusTone: string;
  type: string | null;
  model: string | null;
  serial: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};
