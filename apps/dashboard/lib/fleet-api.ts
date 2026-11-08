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

  inspectionFormOptions: () =>
    api.get<
      ApiData<{
        assets: Array<{
          assetCode: string;
          assetLabel: string;
          serial: string | null;
          parentTruck: string | null;
        }>;
        inspectors: string[];
        types: string[];
        sources: string[];
        checklists: Record<string, Array<{ label: string; tag?: string }>>;
        failedInspections: Array<{
          id: string;
          code: string;
          assetCode: string;
          assetLabel: string;
          serial: string | null;
          parentTruck: string | null;
          inspectorName: string | null;
          dateLabel: string | null;
          resultLabel: string;
          failedItems: string[];
        }>;
      }>
    >(`/fleet/inspections/form-options`),

  createInspectionRecord: (body: {
    assetCode: string;
    assetLabel?: string;
    serial?: string;
    parentTruck?: string;
    inspectorName: string;
    inspectedAt: string;
    type: string;
    source: string;
    checklistItems: Array<{
      label: string;
      result: string;
      note?: string;
      tag?: string;
    }>;
    findingsSummary?: string;
    photoUrls?: string[];
    createRepair?: boolean;
    markOutOfService?: boolean;
    reinspectionRequired?: boolean;
    reinspectionDueAt?: string;
    parentInspectionId?: string;
    incidentReference?: string;
  }) =>
    api.post<
      ApiData<FleetInspection & { message: string; repair: { id: string; code: string } | null }>
    >(`/fleet/inspections/records`, body),

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
    api.get<ApiData<FleetCalibrationDetail>>(`/fleet/calibration/${id}`),

  createCalibration: (body: FleetCalibrationDraft) =>
    api.post<ApiData<FleetCalibrationDetail>>(`/fleet/calibration/records`, body),

  updateCalibration: (id: string, body: FleetCalibrationDraft & { reason: string }) =>
    api.patch<ApiData<FleetCalibrationDetail>>(`/fleet/calibration/${id}`, body),

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
    api.get<ApiData<FleetRepairDetail>>(`/fleet/repair-requests/${id}`),

  updateRepair: (
    id: string,
    body: Partial<{
      vendorName: string;
      assignedName: string;
      etaLabel: string;
      purchaseOrder: string;
      status: string;
      priority: string;
      issue: string;
      location: string;
      notes: string;
      serial: string;
      category: string;
    }>,
  ) =>
    api.patch<ApiData<FleetRepairDetail>>(`/fleet/repair-requests/${id}`, body),

  cancelRepair: (id: string) =>
    api.post<ApiData<FleetRepair>>(`/fleet/repair-requests/${id}/cancel`, {}),

  resolveRepair: (id: string, body: FleetRepairResolve = {}) =>
    api.post<ApiData<FleetRepairDetail>>(`/fleet/repair-requests/${id}/resolve`, body),

  createRepair: (body: FleetRepairCreate) =>
    api.post<ApiData<FleetRepairDetail>>("/fleet/repair-requests/records", body),

  addRepairPart: (id: string, body: FleetRepairPartInput) =>
    api.post<ApiData<FleetRepairDetail>>(`/fleet/repair-requests/${id}/parts`, body),

  addRepairNote: (id: string, text: string) =>
    api.post<ApiData<FleetRepairDetail>>(`/fleet/repair-requests/${id}/notes`, { text }),

  // ── Customer-owned equipment ─────────────────────────────────────────────
  listCustomerOwned: (params?: FleetListParams) =>
    api.get<ApiList<FleetCustomerOwned>>(
      `/fleet/customer-owned${q(params)}`,
    ),

  customerOwnedKpi: () =>
    api.get<ApiData<{ cells: FleetKpiCell[] }>>(`/fleet/customer-owned/kpi`),

  getCustomerOwned: (id: string) =>
    api.get<ApiData<FleetCustomerOwned>>(`/fleet/customer-owned/${id}`),

  saveCustomerOwned: (
    body: {
      name: string;
      type: string;
      customerName: string;
      customerId?: string;
      serial?: string;
      location?: string;
      operationalStatus?: string;
      frequency?: string;
      formName?: string;
      nextDue?: string;
      lastInspected?: string;
      lastResult?: string;
      notes?: string;
      photoUrl?: string;
    },
    id?: string,
  ) =>
    id
      ? api.patch<ApiData<FleetCustomerOwned>>(`/fleet/customer-owned/${id}`, body)
      : api.post<ApiData<FleetCustomerOwned>>(`/fleet/customer-owned/records`, body),

  listInventory: () =>
    api.get<
      ApiData<{
        items: FleetInventoryLine[];
        places: Array<{ id: string; name: string; kind: string }>;
      }>
    >(`/fleet/trucks/inventory`),

  markCustomerOwnedReviewed: (ids: string[], reviewedBy?: string) =>
    api.post<ApiData<{ updated: number; items: FleetCustomerOwned[] }>>(
      `/fleet/customer-owned/bulk-review`,
      { ids, reviewedBy },
    ),

  trucksOverview: () =>
    api.get<
      ApiData<{
        cells: FleetKpiCell[];
        cards: FleetPlaceCard[];
        employees: Array<{ id: string; name: string; assignedTruck: string | null }>;
      }>
    >(`/fleet/trucks`),

  assignTruck: (employeeId: string, truckName: string) =>
    api.post<ApiData<{ id: string; truck: string; message: string }>>(
      `/fleet/trucks/assign`,
      { employeeId, truckName },
    ),

  unassignTruck: (truckName: string) =>
    api.post<ApiData<{ updated: number; message: string }>>(`/fleet/trucks/unassign`, {
      truckName,
    }),

  truckDetail: (id: string) =>
    api.get<ApiData<FleetTruckDetail>>(`/fleet/trucks/${id}`),

  addTruckDocument: (id: string, body: { name: string; url: string }) =>
    api.post<ApiData<{ id: string; name: string; url: string }>>(`/fleet/trucks/${id}/documents`, body),

  addTruckInventory: (
    id: string,
    body: { item: string; qty: number; minimum: number; sku?: string; unit?: string; preferredVendor?: string },
  ) => api.post<ApiData<FleetInventoryItem>>(`/fleet/trucks/${id}/inventory`, body),

  updateTruckInventory: (
    id: string,
    itemId: string,
    body: {
      qty?: number;
      minimum?: number;
      sku?: string;
      preferredVendor?: string;
      tracked?: boolean;
      purchaseQty?: number;
    },
  ) => api.patch<ApiData<FleetInventoryItem>>(`/fleet/trucks/${id}/inventory/${itemId}`, body),

  moveTruckInventory: (id: string, itemId: string, body: { to: string; qty: number }) =>
    api.post<ApiData<{ from: string; to: string; item: string; qty: number }>>(
      `/fleet/trucks/${id}/inventory/${itemId}/move`,
      body,
    ),

  addTruckInventoryDocument: (
    id: string,
    itemId: string,
    body: { type?: string; name: string; url?: string },
  ) => api.post<ApiData<FleetInventoryItem>>(`/fleet/trucks/${id}/inventory/${itemId}/documents`, body),

  issueTruckInventory: (id: string, itemId: string, qty = 1) =>
    api.post<ApiData<{ id: string }>>(`/fleet/trucks/${id}/inventory/${itemId}/issue`, { qty }),

  moveTruckAsset: (id: string, body: { assetCode: string; to: string; why?: string; who?: string }) =>
    api.post<ApiData<{ message: string }>>(`/fleet/trucks/${id}/move`, body),

  markTruckAssetMissing: (
    id: string,
    body: { assetCode: string; assetLabel: string; value?: number; holder?: string },
  ) => api.post<ApiData<{ message: string }>>(`/fleet/trucks/${id}/missing`, body),

  listLocations: () =>
    api.get<ApiData<{ items: FleetLocationRecord[] }>>(`/fleet/trucks/locations`),

  getLocation: (id: string) =>
    api.get<ApiData<FleetLocationRecord>>(`/fleet/trucks/locations/${id}`),

  saveLocation: (body: FleetLocationInput, id?: string) =>
    id
      ? api.patch<ApiData<FleetLocationRecord>>(`/fleet/trucks/locations/${id}`, body)
      : api.post<ApiData<FleetLocationRecord>>(`/fleet/trucks/locations`, body),

  listAssets: () =>
    api.get<ApiData<{ cells: FleetKpiCell[]; items: FleetAsset[] }>>(`/fleet/assets`),

  assetReadiness: () =>
    api.get<ApiData<{ cells: FleetKpiCell[]; items: FleetAsset[] }>>(`/fleet/assets/readiness`),

  getAsset: (code: string) =>
    api.get<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}`),

  createAsset: (body: FleetAssetDraft & { assetCode?: string }) =>
    api.post<ApiData<FleetAssetDetail>>(`/fleet/assets`, body),

  saveAsset: (code: string, body: FleetAssetDraft) =>
    api.patch<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}`, body),

  bulkAssets: (body: { codes: string[]; action: "MOVE" | "ASSIGN" | "OUT_OF_SERVICE"; to?: string }) =>
    api.post<ApiData<{ updated: number; message: string }>>(`/fleet/assets/bulk`, body),

  checkoutAsset: (
    code: string,
    body: { technician: string; due?: string; reference?: string },
  ) =>
    api.post<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}/checkout`, body),

  checkInAsset: (code: string) =>
    api.post<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}/check-in`, {}),

  retireAsset: (code: string) =>
    api.post<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}/retire`, {}),

  addAssetNote: (code: string, text: string) =>
    api.post<ApiData<FleetAssetDetail>>(`/fleet/assets/${encodeURIComponent(code)}/notes`, { text }),

  moveAsset: (
    code: string,
    body: { to: string; reason: string; newParentTruck?: string; checkedOutTo?: string; movedBy?: string; notes?: string },
  ) => api.post<ApiData<FleetAssetMoveResult>>(`/fleet/assets/${encodeURIComponent(code)}/move`, body),

  undoAssetMove: (code: string, body: { from: string; to: string }) =>
    api.post<ApiData<{ message: string }>>(`/fleet/assets/${encodeURIComponent(code)}/move/undo`, body),

  listUnaccounted: (params?: { q?: string; status?: string }) =>
    api.get<ApiData<{ items: UnaccountedAsset[] }>>(
      `/fleet/unaccounted${q(params)}`,
    ),

  unaccountedKpi: () =>
    api.get<ApiData<{ cells: FleetKpiCell[] }>>(`/fleet/unaccounted/kpi`),

  reportMissing: (body: {
    assetLabel: string;
    assetCode: string;
    replacementValue: number;
    lastTruck?: string;
    lastHolder?: string;
  }) => api.post<ApiData<UnaccountedAsset>>(`/fleet/unaccounted/report`, body),

  extendLocateWindow: (id: string, days: number) =>
    api.post<ApiData<UnaccountedAsset>>(`/fleet/unaccounted/${id}/extend`, { days }),

  markRecovered: (id: string) =>
    api.post<ApiData<UnaccountedAsset>>(`/fleet/unaccounted/${id}/recover`, {}),

  writeOffUnaccounted: (id: string) =>
    api.post<ApiData<UnaccountedAsset>>(`/fleet/unaccounted/${id}/write-off`, {}),

  chargeTechnician: (
    id: string,
    body: { method: "BONUS" | "PAY"; reason: string; notify: boolean },
  ) =>
    api.post<ApiData<UnaccountedAsset & { message?: string }>>(
      `/fleet/unaccounted/${id}/charge`,
      body,
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
  nextCode?: string;
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

export type FleetCalibrationReading = {
  gas: string;
  reading?: string;
  expected?: string;
  result?: string;
};

export type FleetCalibrationDetail = FleetCalibration & {
  daysLeft: number | null;
  frequencyLabel: string;
  method: string;
  technician: string;
  lot: string;
  lotExpiry: string;
  calType: string;
  notes: string;
  bumpGas: string;
  bumpResponse: string;
  bumpResult: string;
  certificateUrl: string;
  photoUrl: string;
  readings: FleetCalibrationReading[];
  edits: Array<{ at: string; reason: string }>;
  sensors: Array<{ gas: string; range: string; alarmLow: string; alarmHigh: string }>;
  previous: { code: string; dateLabel: string | null; resultLabel: string } | null;
  bump: { code: string; dateLabel: string | null; resultLabel: string } | null;
  linkedInspection: {
    code: string;
    dateLabel: string | null;
    resultLabel: string;
    afterCalibration: boolean;
  } | null;
  nav: { index: number; total: number; prevCode: string | null; nextCode: string | null };
};

export type FleetCalibrationDraft = {
  assetCode: string;
  assetLabel?: string;
  result?: string;
  lastCalAt?: string;
  frequencyDays?: number;
  method?: string;
  technician?: string;
  lot?: string;
  calType?: string;
  parentTruck?: string;
  serial?: string;
  model?: string;
  lotExpiry?: string;
  notes?: string;
  bumpGas?: string;
  bumpResponse?: string;
  bumpResult?: string;
  certificateUrl?: string;
  photoUrl?: string;
  overrideReason?: string;
  readings?: FleetCalibrationReading[];
  reason?: string;
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
  daysOpen?: number;
  reportedBy?: string | null;
};

export type FleetRepairPart = {
  id: string;
  name: string;
  sku?: string;
  orderedAt?: string;
  vendor?: string;
  cost?: number | null;
  po?: string;
  expectedAt?: string;
  workOrder?: string;
  customer?: string;
  billable?: boolean;
};

export type FleetRepairEvent = {
  id: string;
  label: string;
  at: string;
  by?: string;
};

export type FleetRepairDetail = FleetRepair & {
  serial: string | null;
  category: string | null;
  location: string | null;
  notes: string | null;
  photos: Array<{ id: string; url: string; name: string }>;
  parts: FleetRepairPart[];
  timeline: FleetRepairEvent[];
  resolution: string | null;
  resolvedBy: string | null;
  actualCost: number | null;
  partsUsed: string | null;
  returnTo: string | null;
  requiresReinspection: boolean;
  closeFollowUp: boolean;
  inspectionId: string | null;
  peers: string[];
};

export type FleetRepairCreate = {
  assetCode: string;
  assetLabel?: string;
  serial?: string;
  parentTruck?: string;
  location?: string;
  issue: string;
  issueType?: string;
  priority?: string;
  category?: string;
  vendorName?: string;
  assignedName?: string;
  etaLabel?: string;
  notes?: string;
  inspectionCode?: string;
  photoUrls?: string[];
  estimatedCost?: number;
  partsNeeded?: string;
  expectedDowntime?: string;
  reportedBy?: string;
};

export type FleetRepairPartInput = {
  name: string;
  sku?: string;
  vendor?: string;
  cost?: number;
  po?: string;
  expectedAt?: string;
  workOrder?: string;
  customer?: string;
  billable?: boolean;
};

export type FleetRepairResolve = {
  resolution?: string;
  resolvedBy?: string;
  actualCost?: number;
  partsUsed?: string;
  returnTo?: string;
  requiresReinspection?: boolean;
  closeFollowUp?: boolean;
};

export type FleetInventoryItem = {
  id: string;
  item: string;
  qty: number;
  minimum: number;
  sku?: string;
  unit?: string;
  preferredVendor?: string;
  tracked?: boolean;
  documents?: Array<{ id: string; type: string; name: string; url?: string }>;
  purchaseRequest?: { qty: number; vendor: string; sku: string; at: string } | null;
};

export type FleetAsset = {
  id: string;
  assetLabel: string;
  assetCode: string;
  equipmentType: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  readiness: number | null;
  calibration: string;
  calibrationTone?: string;
  repair: string;
  repairTone?: string;
  parentTruck?: string | null;
  location?: string | null;
  exceptions?: string[];
  exception?: string | null;
  exceptionLabel?: string | null;
  exceptionTone?: string | null;
  valueLabel?: string | null;
  blockingDispatch?: boolean;
  blockingLabel?: string | null;
  inspectionId: string | null;
  calibrationId?: string | null;
  repairId?: string | null;
  lastCalibration?: string | null;
  nextDue?: string | null;
  dueDays?: number | null;
  holder?: string | null;
  checkoutDue?: string | null;
  checkoutRef?: string | null;
  lastCheckInAt?: string | null;
  dailyRate?: number | null;
  rentalVendor?: string | null;
  replacementValue?: number | null;
};

export type FleetInventoryLine = {
  id: string;
  placeId: string;
  place: string;
  kind: string;
  item: string;
  sku: string;
  unit: string;
  qty: number;
  minimum: number;
  status: string;
  statusTone: string;
  vendor: string;
  docs: number;
  countedAt: string | null;
};

export type FleetAssetKind = "ASSET" | "RENTAL" | "CONSUMABLE" | "EXTINGUISHER";

export type FleetAssetClock = {
  test: string;
  lastDone: string;
  interval: string;
  nextDue: string;
  result: string;
};

export type FleetAssetDocument = {
  id: string;
  type: string;
  name: string;
  url: string;
  expiry: string;
  status: string;
};

export type FleetAssetDraft = {
  kind: FleetAssetKind;
  name: string;
  category: string;
  serial: string;
  manufacturer: string;
  model: string;
  home: string;
  technician: string;
  status: string;
  replacementValue: number | null;
  purchaseDate: string;
  purchaseOrder: string;
  vendor: string;
  warrantyExpires: string;
  rentalAgreement: string;
  rentalVendor: string;
  dailyRate: number | null;
  rentalStart: string;
  contractedReturn: string;
  quantity: number | null;
  minimum: number | null;
  unit: string;
  unitCost: number | null;
  preferredVendor: string;
  lastPurchaseOrder: string;
  condition: string;
  sizeClass: string;
  agent: string;
  clocks: FleetAssetClock[];
  photoUrl: string | null;
  documents: FleetAssetDocument[];
  notes: string;
  calibrationRequired: string;
  calibrationDate: string;
  calibrationInterval: string;
  nextCalibrationDue: string;
  bumpTestDate: string;
  bumpResult: string;
  sensors: Array<{ gas: string; range: string; alarmLow: string; alarmHigh: string }>;
  cylinderSize: string;
  cylinderMaterial: string;
};

export type FleetAssetPlace = {
  id: string;
  name: string;
  kind: string;
  unit: string;
  driver: string | null;
  assets: number;
  readiness: number | null;
};

export type FleetAssetDetail = {
  asset: FleetAssetDraft & {
    assetCode: string;
    calibration: string;
    repairCode: string | null;
    repairId: string | null;
    holder: string | null;
    equipmentType: string;
    checkedOutTo: string;
    readiness: number | null;
    exists: boolean;
    noteLog: Array<{ id: string; text: string; at: string }>;
  };
  from: FleetAssetPlace | null;
  places: FleetAssetPlace[];
  employees: Array<{ id: string; name: string }>;
  peers: string[];
  record: {
    readiness: number | null;
    weighted: number;
    health: Array<{ label: string; value: number }>;
    history: Array<{ id: string; kind: string; code: string; label: string; date: string; result: string; href: string }>;
    movements: Array<{ from: string; to: string; who: string; when: string; why: string }>;
    incidents: Array<{ id: string; code: string; severity: string; summary: string | null; date: string; href: string }>;
    clocks: FleetAssetClock[];
    bumpTestDate: string;
    bumpResult: string;
    calibrationDate: string;
    nextCalibrationDue: string;
    calibrationInterval: string;
    documents: FleetAssetDocument[];
    notes: Array<{ id: string; text: string; at: string }>;
  };
};

export type FleetAssetMoveResult = {
  message: string;
  assetCode: string;
  assetLabel: string;
  from: string;
  fromId: string | null;
  to: string;
  toId: string;
  readinessBefore: number | null;
  readinessAfter: number | null;
  repairCode: string | null;
};

export type FleetTruckDetail = {
  card: FleetPlaceCard;
  children: FleetAsset[];
  trucks: Array<{ id: string; name: string; unit: string }>;
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
  technician: string | null;
  baseLocation: string | null;
  lastInspection: string | null;
  openIssues: string;
  fleetNo: string;
  model: string | null;
  breakdown: {
    equipment: number;
    calibration: number;
    inspections: number;
    repair: number;
    inventory: number;
    weighted: number;
  };
  workOrder: { code: string; customer?: string | null; title?: string | null; status?: string | null } | null;
  services: Array<{ label: string; due: string | null; days: number; tone: string }>;
  activity: Array<{ asset: string; event: string; when: string | null; place?: string | null; who?: string | null }>;
  documents?: Array<{ id: string; name: string; url: string; at: string }>;
  inventory?: FleetInventoryItem[];
  audit?: Array<{ id: string; field: string; from: string; to: string; who: string; when: string }>;
  movements?: Array<{ id: string; asset: string; from: string; to: string; who: string; when: string; why: string }>;
  employees: Array<{ id: string; name: string; assignedTruck: string | null }>;
  location: FleetLocationRecord | null;
};

export type FleetLocationRecord = {
  id: string;
  slug?: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  responsibleName: string | null;
  accessHours: string | null;
  maxCapacity: number | null;
  bayCount: number | null;
  emergencyContact: string | null;
  status: string;
  notes: string | null;
  assets?: number;
  repairs?: number;
  lastAudit?: string | null;
  cardStatus?: string;
};

export type FleetLocationInput = {
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  responsibleName?: string;
  accessHours?: string;
  maxCapacity?: number;
  bayCount?: number;
  emergencyContact?: string;
  status?: string;
  notes?: string;
};

export type FleetPlaceCard = {
  id: string;
  kind: "TRUCK" | "LOCATION";
  name: string;
  unit: string;
  driver: string | null;
  site: string | null;
  readiness: number | null;
  assets: number;
  repairs: number;
  calibExpired: number;
  inspFailed: number;
  lastAudit: string | null;
  status: string;
  statusLabel: string;
};

export type UnaccountedAsset = {
  id: string;
  assetLabel: string;
  assetCode: string;
  replacementValue: number;
  valueLabel: string;
  lastTruck: string | null;
  lastHolder: string | null;
  markedOn: string | null;
  locateDays: number;
  daysLeft: number;
  locateLabel: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  chargeMethod: string | null;
  chargeReason: string | null;
  notifyTechnician: boolean;
  chargedAmount: number | null;
  history: Array<{ at: string; entry: string }>;
  message?: string;
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
  frequency?: string;
  formName?: string;
  notes?: string;
  photoUrl?: string;
  operationalStatus?: string;
  lastInspectionAt?: string | null;
  nextDueAt?: string | null;
};
