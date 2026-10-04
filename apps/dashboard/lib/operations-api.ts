import { ApiClient } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";

type ApiData<T> = { data: T };
type ApiList<T> = {
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
};

function q(params?: Record<string, string | number | undefined | null>) {
  return ApiClient.query(params as Record<string, string | number | boolean | undefined>);
}

export type DispatchStatus =
  | "TO_DISPATCH"
  | "POSTED"
  | "ACCEPTED"
  | "DECLINED"
  | "NO_RESPONSE"
  | "CONFLICT"
  | "PTO"
  | "CANCELLED"
  | "REASSIGNED"
  | string;

export type DispatchCard = {
  id: string;
  workOrderId: string | null;
  workOrderCode: string | null;
  customerName: string | null;
  locationName: string | null;
  locationMeta?: string | null;
  jobType?: string | null;
  category?: string | null;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  status: DispatchStatus;
  conflictKind?: string | null;
  conflictLabel?: string | null;
  declineReason?: string | null;
  notes?: string | null;
  postedAt?: string | null;
  acceptedAt?: string | null;
  responseMinutes?: number | null;
  employeeId?: string | null;
  employeeName: string;
  crew?: string | null;
  overrideReason?: string | null;
  overriddenAt?: string | null;
  isPto?: boolean;
  techLabel?: string;
  postedLabel?: string;
  responseLabel?: string;
  reasonLabel?: string | null;
};

export type DispatchKpi = {
  toDispatch: number;
  toDispatchMeta: string;
  postedToMobile: number;
  postedMeta: string;
  accepted: number;
  acceptedMeta: string;
  needsReassign: number;
  needsReassignMeta: string;
  noResponse: number;
  noResponseMeta: string;
  conflicts: number;
  conflictsMeta: string;
  rangeLabel: string;
  from: string;
  to: string;
};

export type DispatchBoard = {
  from: string;
  to: string;
  rangeLabel: string;
  days: Array<{
    date: string;
    label: string;
    weekday: string;
    dayNum: number;
  }>;
  rows: Array<{
    employeeId: string;
    employeeName: string;
    crew?: string | null;
    cells: Array<{ date: string; cards: DispatchCard[] }>;
  }>;
  unassigned: DispatchCard[];
};

export type DispatchEligibility = {
  workOrderId: string;
  workOrderCode: string;
  customerName: string;
  locationName: string;
  banner: string;
  blocked: boolean;
  issueCount: number;
  gates: Array<{
    key: string;
    label: string;
    status: "MET" | "BLOCKED" | "WARNING" | string;
    detail: string;
  }>;
  technicians: Array<{
    employeeId: string;
    name: string;
    eligible: boolean;
    status: string;
    detail: string;
    assignmentId?: string;
    assignmentStatus?: string;
  }>;
};

export type DispatchReassignData = {
  assignmentId: string;
  workOrderId: string;
  workOrderCode: string;
  customerName: string;
  locationName: string;
  scheduledDate: string;
  dateLabel?: string;
  jobTypeLabel?: string;
  summaryLine?: string;
  scheduleLine?: string;
  originally: string;
  currentBanner?: string;
  declineReason: string;
  eligibleCount?: number;
  blockedCount?: number;
  candidates: Array<{
    employeeId: string;
    name: string;
    eligible: boolean;
    status: string;
    detail: string;
    meta?: string;
    truck?: string | null;
    distanceMi: number | null;
    jobsThatDay: number;
  }>;
};

export type DispatchReassignResult = {
  ok: boolean;
  workOrderId: string;
  workOrderCode: string;
  message: string;
  banner: string;
  newTechnicianName?: string;
  oldTechnicianName?: string;
  technicianName?: string;
  notifiedNew?: boolean;
  notifiedOriginal?: boolean;
};

export type DispatchOverrideRequestResult = {
  ok: boolean;
  workOrderId: string;
  workOrderCode: string;
  technicianName: string;
  message: string;
  banner: string;
};

export type DispatchOptions = {
  technicians: Array<{ value: string; label: string; crew?: string | null }>;
  workOrders: Array<{
    value: string;
    label: string;
    serviceDate?: string | null;
  }>;
  crews: Array<{ value: string; label: string }>;
  customers: Array<{ value: string; label: string }>;
};

export type DispatchDeliveryPreview = {
  kind: "post" | "notify";
  jobs: number;
  technicianCount: number;
  dateLabel: string;
  scheduleDate: string;
  summaryLine: string;
  technicians: Array<{
    employeeId: string;
    name: string;
    assignmentIds: string[];
  }>;
  assignmentIds: string[];
};

export type DispatchDeliveryResult = {
  ok: boolean;
  outcome: "success" | "partial" | "failed";
  jobs: number;
  technicianCount: number;
  deliveredCount: number;
  dateLabel: string;
  message: string;
  banner: string;
  title?: string;
  summaryLine?: string;
  technicians: Array<{
    employeeId: string;
    name: string;
    status: "DELIVERED" | "NOT_RECEIVED";
    assignmentIds?: string[];
  }>;
  failedTechnicianName?: string | null;
  failedEmployeeId?: string | null;
  updated?: number;
  notified?: number;
};

export type OpsDashboardStat = {
  value: number | string;
  meta: string;
  action: string;
  href: string;
  icon: string;
};

export type OpsDashboardReviewItem = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  href: string;
};

export type OpsDashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status: string;
  statusVariant: string;
  href: string;
  at: string;
};

export type OpsDashboardOverview = {
  lastSyncAt: string;
  lastSyncLabel: string;
  stats: {
    openWorkOrders: OpsDashboardStat;
    inProgress: OpsDashboardStat;
    readyForReview: OpsDashboardStat;
    dispatched: OpsDashboardStat;
    awaitingAcceptance: OpsDashboardStat;
    multiDayJobs: OpsDashboardStat;
    missingStLink: OpsDashboardStat;
    missingReqDocs: OpsDashboardStat;
    payrollReadyWos: OpsDashboardStat;
  };
  needingReview: OpsDashboardReviewItem[];
  activity: OpsDashboardActivityItem[];
  reviewCategories: Array<{ id: string; label: string }>;
  activityTypes: Array<{ id: string; label: string }>;
};

export const operationsApi = {
  dashboardOverview: () =>
    api.get<ApiData<OpsDashboardOverview>>(`/operations/dashboard`),
  dashboardSync: () =>
    api.post<ApiData<{ syncedAt: string; lastSyncLabel: string }>>(
      `/operations/dashboard/sync`,
    ),

  dispatchKpi: (params?: { from?: string; to?: string }) =>
    api.get<ApiData<DispatchKpi>>(`/operations/dispatch/kpi${q(params)}`),

  dispatchSchedule: (params?: {
    from?: string;
    to?: string;
    crew?: string;
    customerId?: string;
    q?: string;
  }) =>
    api.get<ApiData<DispatchBoard>>(
      `/operations/dispatch/schedule${q(params)}`,
    ),

  dispatchAcceptance: (params?: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.get<ApiList<DispatchCard>>(
      `/operations/dispatch/acceptance${q(params)}`,
    ),

  dispatchOptions: () =>
    api.get<ApiData<DispatchOptions>>(`/operations/dispatch/options`),

  dispatchEligibility: (workOrderId: string) =>
    api.get<ApiData<DispatchEligibility>>(
      `/operations/dispatch/eligibility/${workOrderId}`,
    ),

  getDispatchAssignment: (id: string) =>
    api.get<ApiData<DispatchCard>>(`/operations/dispatch/${id}`),

  assignDispatchJob: (body: {
    workOrderId: string;
    employeeId: string;
    scheduledDate: string;
    jobType?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    postToMobile?: boolean;
  }) =>
    api.post<ApiData<DispatchCard>>(`/operations/dispatch/assign`, body),

  postDispatchPreview: (date?: string) =>
    api.get<ApiData<DispatchDeliveryPreview>>(
      `/operations/dispatch/post-to-mobile/preview${q({ date })}`,
    ),

  postDispatchToMobile: (body?: {
    ids?: string[];
    date?: string;
    forceFail?: boolean;
    forcePartial?: boolean;
  }) =>
    api.post<ApiData<DispatchDeliveryResult>>(
      `/operations/dispatch/post-to-mobile`,
      body ?? {},
    ),

  notifyDispatchPreview: (date?: string) =>
    api.get<ApiData<DispatchDeliveryPreview>>(
      `/operations/dispatch/notify-techs/preview${q({ date })}`,
    ),

  notifyDispatchTechs: (body?: {
    ids?: string[];
    date?: string;
    forceFail?: boolean;
    forcePartial?: boolean;
  }) =>
    api.post<ApiData<DispatchDeliveryResult>>(
      `/operations/dispatch/notify-techs`,
      body ?? {},
    ),

  rescheduleDispatch: (
    id: string,
    body: {
      employeeId?: string;
      scheduledDate?: string;
      force?: boolean;
    },
  ) =>
    api.post<
      ApiData<{
        preview?: boolean;
        jobLabel?: string;
        fromLabel?: string;
        toLabel?: string;
        conflict?: { message: string; detail: string } | null;
        assignment?: DispatchCard;
      }>
    >(`/operations/dispatch/${id}/reschedule`, body),

  reassignCandidates: (id: string) =>
    api.get<ApiData<DispatchReassignData>>(
      `/operations/dispatch/${id}/reassign-candidates`,
    ),

  reassignDispatch: (
    id: string,
    body: {
      employeeId: string;
      notifyTechnician?: boolean;
      notifyOriginal?: boolean;
      note?: string;
      forceFail?: boolean;
    },
  ) =>
    api.post<ApiData<DispatchReassignResult>>(
      `/operations/dispatch/${id}/reassign`,
      body,
    ),

  requestDispatchOverride: (
    id: string,
    body: {
      employeeId: string;
      justification: string;
      overrideByName?: string;
    },
  ) =>
    api.post<ApiData<DispatchOverrideRequestResult>>(
      `/operations/dispatch/${id}/request-override`,
      body,
    ),

  leaveDispatchUnassigned: (id: string) =>
    api.post<ApiData<DispatchCard>>(
      `/operations/dispatch/${id}/leave-unassigned`,
      {},
    ),

  overrideDispatch: (
    id: string,
    body: { reason: string; overrideByName?: string },
  ) =>
    api.post<
      ApiData<{ assignment: DispatchCard; message: string }>
    >(`/operations/dispatch/${id}/override`, body),

  cancelDispatch: (id: string) =>
    api.patch<ApiData<DispatchCard>>(`/operations/dispatch/${id}/cancel`, {}),

  billingOverview: () =>
    api.get<
      ApiData<{
        kpis: BillingKpi;
        items: BillingVarianceItem[];
      }>
    >(`/operations/billing`),

  getBillingDetail: (id: string) =>
    api.get<ApiData<BillingDetail>>(`/operations/billing/${id}`),

  markBillingReviewed: (
    id: string,
    body: {
      note?: string;
      netsuiteRef?: string;
      markNetsuiteUpdated?: boolean;
    },
  ) =>
    api.patch<ApiData<BillingDetail>>(`/operations/billing/${id}`, body),

  purchaseOrdersOverview: () =>
    api.get<
      ApiData<{
        kpis: PurchaseOrderKpi;
        items: OpsPurchaseOrderItem[];
      }>
    >(`/operations/purchase-orders`),

  purchaseOrderOptions: () =>
    api.get<
      ApiData<{
        vendors: string[];
        categories: string[];
        deliveryLocations: string[];
        receivers: string[];
        markupOptions: number[];
        workOrders: Array<{
          id: string;
          code: string;
          customerName: string;
        }>;
        salesTickets: Array<{ id: string; code: string }>;
        nextPoCode: string;
      }>
    >(`/operations/purchase-orders/options`),

  createPurchaseOrder: (body: {
    vendor: string;
    vendorContact?: string;
    orderDate?: string;
    expectedDelivery?: string;
    workOrderId?: string;
    ticketId?: string;
    category?: string;
    description: string;
    lineItems?: Array<{ item: string; qty: number; unitPrice: number }>;
    deliveryLocation?: string;
    received?: boolean;
    receivedBy?: string;
    receivedDate?: string;
    notes?: string;
    billBack?: boolean;
    markupPct?: number;
    blocksPayroll?: boolean;
  }) =>
    api.post<
      ApiData<{
        id: string;
        code: string;
        status: string;
        statusLabel: string;
        amount: number;
        amountLabel: string;
        billableAmount: number;
        billableAmountLabel: string;
        overThreshold: boolean;
        ticketId: string;
        workOrderId?: string | null;
        customerName: string;
      }>
    >(`/operations/purchase-orders`, body),

  netsuiteOverview: () =>
    api.get<
      ApiData<{
        kpis: NetsuiteKpi;
        items: NetsuiteHandoffItem[];
      }>
    >(`/operations/netsuite`),

  sendToNetsuite: (id: string) =>
    api.post<
      ApiData<{
        id: string;
        code: string;
        netsuiteStatus: string | null;
        workflowStep: string | null;
      }>
    >(`/operations/netsuite/${id}/send`, {}),

  exportReadyToNetsuite: () =>
    api.post<ApiData<{ exported: number; message: string }>>(
      `/operations/netsuite/export-ready`,
      {},
    ),

  getNetsuiteError: (id: string) =>
    api.get<ApiData<NetsuiteErrorDetail>>(`/operations/netsuite/${id}/error`),

  markNetsuiteFollowUp: (id: string) =>
    api.post<ApiData<NetsuiteErrorDetail>>(
      `/operations/netsuite/${id}/follow-up`,
      {},
    ),

  retryNetsuiteSend: (id: string) =>
    api.post<
      ApiData<
        Partial<NetsuiteErrorDetail> & {
          ok?: boolean;
          message?: string;
        }
      >
    >(`/operations/netsuite/${id}/retry`, {}),

  listFormCorrections: () =>
    api.get<
      ApiData<{
        kpis: FormCorrectionKpi;
        items: FormCorrectionItem[];
      }>
    >(`/operations/form-corrections`),

  getFormCorrection: (id: string) =>
    api.get<ApiData<FormCorrectionDetail>>(
      `/operations/form-corrections/${id}`,
    ),

  approveFormCorrection: (
    id: string,
    body?: { note?: string; forceFail?: boolean },
  ) =>
    api.post<ApiData<FormCorrectionActionResult>>(
      `/operations/form-corrections/${id}/approve`,
      body ?? {},
    ),

  denyFormCorrection: (
    id: string,
    body?: { reason?: string; note?: string; forceFail?: boolean },
  ) =>
    api.post<ApiData<FormCorrectionActionResult>>(
      `/operations/form-corrections/${id}/deny`,
      body ?? {},
    ),

  moreInfoFormCorrection: (
    id: string,
    body?: {
      form?: string;
      issue?: string;
      instructions?: string;
      message?: string;
      note?: string;
      forceFail?: boolean;
    },
  ) =>
    api.post<ApiData<FormCorrectionActionResult>>(
      `/operations/form-corrections/${id}/more-info`,
      body ?? {},
    ),

  listAdditionalFormRequests: () =>
    api.get<
      ApiData<{
        kpis: AdditionalFormKpi;
        items: AdditionalFormItem[];
        alert: string | null;
      }>
    >(`/operations/additional-form-requests`),

  getAdditionalFormRequest: (id: string) =>
    api.get<ApiData<AdditionalFormDetail>>(
      `/operations/additional-form-requests/${id}`,
    ),

  approveAdditionalFormRequest: (
    id: string,
    body?: { note?: string; forceFail?: boolean },
  ) =>
    api.post<ApiData<AdditionalFormActionResult>>(
      `/operations/additional-form-requests/${id}/approve`,
      body ?? {},
    ),

  denyAdditionalFormRequest: (
    id: string,
    body?: { reason?: string; note?: string; forceFail?: boolean },
  ) =>
    api.post<ApiData<AdditionalFormActionResult>>(
      `/operations/additional-form-requests/${id}/deny`,
      body ?? {},
    ),

  moreInfoAdditionalFormRequest: (
    id: string,
    body?: { message?: string; note?: string; forceFail?: boolean },
  ) =>
    api.post<ApiData<AdditionalFormActionResult>>(
      `/operations/additional-form-requests/${id}/more-info`,
      body ?? {},
    ),

  getInvoicePreview: (id: string) =>
    api.get<ApiData<InvoicePreview>>(`/operations/invoices/${id}/preview`),

  saveInvoice: (
    id: string,
    body: { invoiceNotes?: string; netsuiteRef?: string },
  ) =>
    api.patch<ApiData<InvoicePreview>>(`/operations/invoices/${id}`, body),

  sendInvoice: (
    id: string,
    body: {
      recipient: string;
      cc?: string;
      subject: string;
      message?: string;
      scheduleMode?: "NOW" | "LATER";
      scheduledAt?: string;
      forceFail?: boolean;
    },
  ) =>
    api.post<ApiData<InvoiceSendResult>>(
      `/operations/invoices/${id}/send`,
      body,
    ),

  listSalesTickets: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    customerId?: string;
    sort?: string;
  }) =>
    api.get<
      ApiList<SalesTicket> & {
        kpi: SalesTicketQueueKpi;
      }
    >(`/operations/sales-tickets${q(params)}`),

  getSalesTicket: (id: string) =>
    api.get<ApiData<SalesTicketDetail>>(
      `/operations/sales-tickets/${id}`,
    ),

  createSalesTicketFromWorkOrder: (body?: { workOrderId?: string }) =>
    api.post<ApiData<SalesTicket>>(
      `/operations/sales-tickets/from-work-order`,
      body ?? {},
    ),

  saveSalesTicket: (
    id: string,
    body: {
      netsuiteReason?: string;
      netsuiteReference?: string;
      markNetsuiteUpdated?: boolean;
    },
  ) =>
    api.patch<ApiData<SalesTicketDetail>>(
      `/operations/sales-tickets/${id}`,
      body,
    ),

  acceptSalesTicket: (id: string) =>
    api.post<ApiData<SalesTicketDetail>>(
      `/operations/sales-tickets/${id}/accept`,
      {},
    ),

  salesTicketCorrectionFields: () =>
    api.get<ApiData<SalesTicketCorrectionField[]>>(
      `/operations/sales-tickets/correction-fields`,
    ),

  adjustSalesTicketRate: (
    id: string,
    body: { adjustedRate: number; reason: string },
  ) =>
    api.post<ApiData<SalesTicket>>(
      `/operations/sales-tickets/${id}/adjust-rate`,
      body,
    ),

  returnSalesTicket: (
    id: string,
    body: {
      corrections: Array<{ field: string; issue: string; expected: string }>;
      note?: string;
      dueBackBy?: string;
      notifyPush?: boolean;
      notifyEmail?: boolean;
    },
  ) =>
    api.post<ApiData<SalesTicket>>(
      `/operations/sales-tickets/${id}/return-for-correction`,
      body,
    ),

  listRecurringSeries: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
  }) =>
    api.get<
      ApiList<RecurringWorkOrderSeries> & {
        summary: { total: number; active: number; label: string };
      }
    >(`/operations/recurring-series${q(params)}`),

  getRecurringSeries: (id: string) =>
    api.get<ApiData<RecurringSeriesDetail>>(
      `/operations/recurring-series/${id}`,
    ),

  recurringSeriesOptions: () =>
    api.get<ApiData<RecurringSeriesOptions>>(
      `/operations/recurring-series/options`,
    ),

  createRecurringSeries: (body: {
    customerId: string;
    jobType: string;
    frequency:
      | "WEEKLY"
      | "FORTNIGHTLY"
      | "MONTHLY"
      | "QUARTERLY"
      | "ANNUALLY";
    nextOccurrence?: string;
    generatedCount?: number;
    remainingCount?: number;
    notes?: string;
  }) =>
    api.post<ApiData<RecurringWorkOrderSeries>>(
      `/operations/recurring-series`,
      body,
    ),

  updateRecurringSeries: (
    id: string,
    body: {
      jobType?: string;
      frequency?:
        | "WEEKLY"
        | "FORTNIGHTLY"
        | "MONTHLY"
        | "QUARTERLY"
        | "ANNUALLY";
      nextOccurrence?: string | null;
      dayRule?: string;
      generateAheadDays?: number;
      endsAfterOccurrences?: number;
      endsOnDate?: string | null;
      endsNever?: boolean;
      crewTemplate?: string;
      estimatedDurationHours?: number;
      requiredForms?: string;
      requiredEquipment?: string;
      notes?: string;
      updateScope?: "FUTURE_ONLY" | "ALL_UNSTARTED";
    },
  ) =>
    api.patch<
      ApiData<
        RecurringSeriesDetail & {
          lastUpdate?: {
            scope: string;
            affectedCount: number;
            message: string;
          };
        }
      >
    >(`/operations/recurring-series/${id}`, body),

  cancelRecurringSeries: (id: string, body?: { reason?: string }) =>
    api.post<
      ApiData<
        RecurringSeriesDetail & {
          cancelResult?: {
            remainingStopped: number;
            generatedIntact: number;
            message: string;
          };
        }
      >
    >(`/operations/recurring-series/${id}/cancel`, body ?? {}),
};

export type SalesTicketStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RETURNED"
  | "ADJUSTED"
  | "APPROVED"
  | "CANCELLED"
  | string;

export type BillingKpi = {
  ticketsThisCycle: number;
  cycleLabel: string;
  matched: number;
  matchedPct: number;
  needsCorrection: number;
  needsCorrectionMeta: string;
  unbilledValue: number;
  unbilledValueLabel: string;
  unbilledMeta: string;
  readyForNetsuite: number;
  readyForNetsuiteValueLabel: string;
  variances: number;
  underbilled: number;
  overbilled: number;
  missing: number;
  underValue: number;
  underValueLabel: string;
  periodLabel: string;
};

export type BillingVarianceItem = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  workOrderYear?: string;
  customerName: string;
  locationLabel?: string | null;
  submittedBy?: string;
  employs?: string;
  employsName?: string;
  employsCompany?: string;
  reconciliation?: string | null;
  reconciliationLabel: string;
  workedHours: number;
  billedHours: number;
  deltaHours: number;
  workedLabel?: string;
  billedLabel?: string;
  differenceLabel?: string;
  netsuiteStatus?: string;
  amount: number;
  amountLabel: string;
  issueLabel?: string | null;
  approvalStatus?: string | null;
  jobDateLabel?: string | null;
  stMissing?: boolean;
};

export type BillingDetail = {
  id: string;
  code: string;
  billingFlag: string;
  statusLabel: string;
  headerBreadcrumb: string;
  title: string;
  subtitle: string;
  exceptionIndex: number;
  exceptionTotal: number;
  exceptionIds: string[];
  workOrder: {
    id?: string | null;
    code: string;
    location: string;
    serviceDate: string;
    customer: string;
    assigned: string[];
    jobStart: string;
    jobEnd: string;
  };
  salesTicket: {
    id: string;
    code: string;
    linkedLabel: string;
    hoursLabel: string;
    source: string;
    poNumber: string;
    status: string;
  };
  netsuiteCorrection: {
    status: string;
    type: string;
    action: string;
    reason: string;
    reference: string;
  };
  comparison: {
    deltaLabel: string;
    workedHours: number;
    workedLabel: string;
    workedMeta: string;
    billedHours: number;
    billedLabel: string;
    billedMeta: string;
    varianceHours: number;
    varianceLabel: string;
    varianceMeta: string;
  };
  techTime: Array<{
    name: string;
    date?: string;
    clockIn?: string;
    clockOut?: string;
    hours?: number;
    billable?: string;
    category?: string;
    status?: string;
  }>;
  compliance: {
    submittedLabel: string;
    items: Array<{ name: string; status: string }>;
  };
  adminNotes: Array<{ when: string; text: string }>;
  auditHistory: Array<{ when: string; title: string; detail: string }>;
  reviewed: boolean;
};

export type PurchaseOrderKpi = {
  total: number;
  totalAmount: number;
  totalAmountLabel: string;
  received: number;
  awaiting: number;
  billedBack: number;
  billedBackAmountLabel: string;
  missingBeforeInvoice: number;
  missingMeta: string;
  overThreshold: number;
  overThresholdMeta: string;
  notOnTicket: number;
};

export type OpsPurchaseOrderItem = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  vendor: string;
  type: string;
  employs: string;
  employsName: string;
  employsCompany: string;
  approvedBy: string;
  customerName: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  ticketId: string;
  ticketCode: string;
  amount: number;
  amountLabel: string;
  note?: string | null;
  received?: boolean;
  billBack?: boolean;
  overThreshold?: boolean;
};

export type NetsuiteKpi = {
  ready: number;
  readyValue: number;
  readyValueLabel: string;
  sent: number;
  sentValueLabel: string;
  corrected: number;
  correctedMeta: string;
  failed: number;
  failedMeta: string;
};

export type NetsuiteHandoffItem = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  workOrderYear?: string;
  customerName: string;
  locationLabel?: string | null;
  locationWell?: string;
  locationField?: string;
  serviceDate?: string;
  hoursLabel?: string;
  amount: number;
  amountLabel: string;
  netsuiteIdLabel?: string;
  approvalStatus?: string | null;
  netsuiteStatus: string;
  netsuiteLabel: string;
  exportStatus?: string;
  actionStatus?: string;
  workflowStep?: string | null;
  stMissing?: boolean;
  ready: boolean;
  failed?: boolean;
};

export type NetsuiteErrorDetail = {
  id: string;
  code: string;
  title: string;
  status: string;
  occurredLabel: string;
  salesTicket: string;
  workOrder: string;
  workOrderId?: string | null;
  customer: string;
  errorCode: string;
  message: string;
  syncLog: Array<{ when: string; text: string }>;
  affected: {
    invoice: string;
    lineItems: number;
    netsuiteResult: string;
  };
  resolution: string[];
  followUp: boolean;
  attempts: number;
};

export type FormCorrectionKpi = {
  open: number;
  openMeta: string;
  resubmitted: number;
  resubmittedMeta: string;
  approved: number;
  approvedMeta: string;
  rejected: number;
  rejectedMeta: string;
  needsInfo: number;
  needsInfoMeta: string;
};

export type FormCorrectionItem = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  customerName: string;
  formLabel: string;
  reasonShort: string;
  reasonAge: string;
  requestedBy: string;
  requestedByStatus?: string | null;
  status: string;
  statusLabel: string;
  requestedLabel: string;
  originalStatus: string;
  version: string;
};

export type FormCorrectionDetail = {
  id: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  metaLabel: string;
  index: number;
  total: number;
  ids: string[];
  requests: Array<{
    id: string;
    code: string;
    label: string;
    pendingLabel: string;
  }>;
  original: {
    form: string;
    formTitle?: string;
    submittedBy: string;
    submitted: string;
    lockedLabel: string;
  };
  workOrderCode?: string;
  version?: string;
  formDisplay?: string;
  issueFlagged: string;
  correction: {
    requestedBy: string;
    instruction: string;
  };
  resubmission: {
    version: string;
    resubmittedBy: string;
    submitted: string;
    status: string;
  } | null;
  rule: string;
};

export type FormCorrectionActionResult = {
  ok: boolean;
  id: string;
  code: string;
  status: string;
  contextLine: string;
  workOrderCode: string;
  technicianName: string;
  formLabel: string;
  version: string;
  message: string;
  savedNote: string | null;
  toastTitle: string | null;
  toastSubtitle: string | null;
  dueBackLabel: string | null;
  detail?: FormCorrectionDetail;
};

export type AdditionalFormKpi = {
  pending: number;
  pendingMeta: string;
  approved: number;
  approvedMeta: string;
  denied: number;
  deniedMeta: string;
  needsInfo: number;
  needsInfoMeta: string;
  formAdded: number;
  formAddedMeta: string;
};

export type AdditionalFormItem = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  customerName: string;
  technicianName: string;
  formRequested: string;
  reasonShort: string;
  urgency: string;
  status: string;
  statusLabel: string;
  ageLabel: string;
  reviewer: string;
};

export type AdditionalFormDetail = {
  id: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  urgency: string;
  metaLabel: string;
  index: number;
  total: number;
  ids: string[];
  requests: Array<{
    id: string;
    code: string;
    label: string;
    pendingLabel: string;
  }>;
  details: {
    workOrder: string;
    customer: string;
    location: string;
    technician: string;
    formRequested: string;
    urgency: string;
  };
  history: Array<{ when: string; text: string }>;
  reason: string;
  rule: string;
};

export type AdditionalFormActionResult = {
  ok: boolean;
  id: string;
  code: string;
  status: string;
  contextLine: string;
  workOrderCode: string;
  technicianName: string;
  formRequested: string;
  message: string;
  savedNote: string | null;
  toastTitle: string | null;
  toastSubtitle: string | null;
  detail?: AdditionalFormDetail;
};

export type InvoicePreview = {
  ticketId: string;
  ticketCode: string;
  invoiceCode: string;
  status: string;
  statusLabel: string;
  badgeTone: string;
  stepper: string[];
  stepperCurrent: string;
  stepperMeta: string;
  jobRef: {
    ticketCode: string;
    customer: string;
    location: string;
    dateRange: string;
  };
  terms: string;
  subtotal: number;
  taxPct: number;
  tax: number;
  total: number;
  totalLabel: string;
  lineItems: Array<{
    item: string;
    qty: number;
    qtyDelta?: number;
    rate?: number;
    rateLabel?: string;
    amount: number;
    woLink?: string;
    note?: string;
  }>;
  techTime: Array<{
    name: string;
    clockIn?: string;
    clockOut?: string;
    hours?: number;
    status: string;
    date?: string;
  }>;
  quoteCompare: {
    quoted: number;
    invoiced: number;
    variance: number;
    variancePct: number;
    reason: string;
  };
  netsuite: {
    statusLabel: string;
    invoiceNotes: string;
    netsuiteRef: string;
  };
  compose: {
    recipient: string;
    recipientEmail: string;
    cc: string;
    ccEmail: string;
    subject: string;
    message: string;
    signature: string;
    attachmentName: string;
    attachmentSize: string;
    scheduleDefault: string;
  };
  lastSend?: Record<string, unknown> | null;
  workOrderId?: string | null;
  workOrderCode?: string | null;
};

export type InvoiceSendResult = {
  ok: boolean;
  status: string;
  recipient: string;
  recipientEmail?: string;
  cc?: string | null;
  subject?: string;
  attachmentName: string;
  attachmentSize: string;
  sentAtLabel?: string;
  triedAtLabel?: string;
  reason?: string;
  invoiceCode: string;
  amountLabel: string;
};

export type SalesTicketQueueKpi = {
  waitingReview: number;
  returned: number;
  adjusted: number;
  total: number;
  approvedValue: number;
  approvedValueLabel: string;
  periodLabel: string;
  billedHours: number;
  billableHours: number;
  underbilledHours: number;
  matched: number;
  matchedPct: number;
  needsReview: number;
  needsReviewMeta: string;
};

export type SalesTicket = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  customerId: string;
  customerName: string;
  locationLabel?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  techName?: string | null;
  techStatus?: string | null;
  techExtraCount?: number;
  serviceItem: string;
  status: SalesTicketStatus;
  jobDateLabel?: string | null;
  hours?: number;
  billedHours?: number;
  deltaHours?: number;
  billedDeltaLabel?: string;
  reconciliation?: string | null;
  reconciliationLabel?: string;
  amount?: number;
  amountLabel?: string;
  issueLabel?: string | null;
  approvalStatus?: string | null;
  approvalLabel?: string;
  netsuiteStatus?: string | null;
  netsuiteLabel?: string;
  stMissing?: boolean;
  billingFlag?: string | null;
  workflowStep?: string | null;
  submittedRate: number;
  submittedRateLabel: string;
  submittedHours: number;
  hoursLocked: boolean;
  rateSource: string;
  submittedValue: number;
  submittedValueLabel: string;
  adjustedRate?: number | null;
  adjustedValue?: number | null;
  rateDifference?: number | null;
  rateDifferenceLabel?: string | null;
  rateAdjustReason?: string | null;
  rateAdjustedAt?: string | null;
  rateAdjustedByName?: string | null;
  corrections: Array<{ field: string; issue: string; expected: string }>;
  returnNote?: string | null;
  dueBackBy?: string | null;
  notifyPush: boolean;
  notifyEmail: boolean;
  returnedAt?: string | null;
  returnedByName?: string | null;
  headerLabel: string;
  returnHeaderLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesTicketDetail = SalesTicket & {
  detail: {
    listTech?: { name?: string; extra?: number; status?: string };
    listWoCode?: string;
    company?: {
      name?: string;
      accountOwner?: string;
      status?: string;
      phone?: string;
      email?: string;
      billingAddress?: string;
      industry?: string;
      primaryContact?: string;
      customerSince?: string;
    };
    summary?: {
      ticketId?: string;
      customer?: string;
      location?: string;
      date?: string;
      paymentTerms?: string;
      subtotal?: number;
    };
    lineItems?: Array<{
      item: string;
      qty: number;
      qtyDelta?: number;
      rate?: number;
      rateLabel?: string;
      amount: number;
      woLink?: string;
    }>;
    totals?: { subtotal: number; taxPct: number; tax: number; total: number };
    variance?: {
      deltaLabel?: string;
      workedHours?: number;
      billedHours?: number;
      varianceHours?: number;
      unbilledValue?: number;
      unbilledLabel?: string;
    };
    techTime?: Array<{
      name: string;
      clockIn: string;
      clockOut: string;
      hours: number;
      status: string;
    }>;
    routeCheck?: Array<{
      label: string;
      value: string;
      tone: string;
      action?: boolean;
    }>;
    vendorPos?: {
      items: Array<{ code: string; status: string; tone: string }>;
      alert?: string;
    };
    locationCard?: {
      address?: string;
      serviceDate?: string;
      woNumber?: string;
      source?: string;
      poNumber?: string;
      mapAttached?: boolean;
      locationSignAttached?: boolean;
    };
    netsuiteCorrection?: {
      status?: string;
      valueLabel?: string;
      reason?: string;
      reference?: string;
    };
    auditNotes?: Array<{ title: string; when: string; detail?: string }>;
    stepper?: string[];
  };
};

export type SalesTicketCorrectionField = {
  value: string;
  label: string;
};

export type RecurringSeriesStatus = "ACTIVE" | "ENDED" | string;

export type RecurringSeriesFrequency =
  | "WEEKLY"
  | "FORTNIGHTLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | string;

export type RecurringSeriesOccurrence = {
  id: string;
  occurrenceNumber: number;
  occurrenceLabel: string;
  workOrderId: string | null;
  workOrderCode: string;
  serviceDate: string;
  serviceDateLabel: string | null;
  crewLabel: string;
  status: string;
};

export type RecurringWorkOrderSeries = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  jobType: string;
  frequency: RecurringSeriesFrequency;
  nextOccurrence: string | null;
  nextOccurrenceLabel: string | null;
  nextOccurrenceLongLabel?: string | null;
  generatedCount: number;
  remainingCount: number;
  status: RecurringSeriesStatus;
  dayRule?: string;
  generateAheadDays?: number;
  endsAfterOccurrences?: number;
  endsOnDate?: string | null;
  endsNever?: boolean;
  crewTemplate?: string | null;
  estimatedDurationHours?: number | null;
  requiredForms?: string | null;
  requiredEquipment?: string | null;
  notes?: string | null;
  totalPlanned?: number;
  generatedOfLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecurringSeriesDetail = RecurringWorkOrderSeries & {
  isEnded?: boolean;
  statusHeadline?: string | null;
  settings: {
    frequency: string;
    dayRule: string;
    dayRuleHint: string;
    generateAheadDays: number;
    generateLabel: string;
    endsLabel: string;
    otherEndLabel: string;
    editScopeNote: string;
    footerNote?: string;
    footerTone?: "muted" | "warning";
  };
  template: {
    crewTemplate: string;
    estimatedDuration: string;
    requiredForms: string;
    requiredEquipment: string;
  };
  editScope: {
    futureOnly: {
      value: "FUTURE_ONLY";
      label: string;
      description: string;
    };
    allUnstarted: {
      value: "ALL_UNSTARTED";
      label: string;
      description: string;
    };
    warning: string;
    remainingCount: number;
    unstartedCount: number;
  };
  cancelPreview: {
    question: string;
    remainingHeadline: string;
    intactNote: string;
    keepLabel: string;
    confirmLabel: string;
  };
  occurrences: RecurringSeriesOccurrence[];
};

export type RecurringSeriesOptions = {
  customers: Array<{ value: string; label: string }>;
  frequencies: Array<{ value: string; label: string }>;
  jobTypes: Array<{ value: string; label: string }>;
};
