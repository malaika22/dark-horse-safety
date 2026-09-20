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
  workOrderCode: string;
  customerName: string;
  locationName: string;
  scheduledDate: string;
  originally: string;
  declineReason: string;
  candidates: Array<{
    employeeId: string;
    name: string;
    eligible: boolean;
    status: string;
    detail: string;
    distanceMi: number | null;
    jobsThatDay: number;
  }>;
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

  postDispatchToMobile: (ids?: string[]) =>
    api.post<ApiData<{ updated: number; message: string }>>(
      `/operations/dispatch/post-to-mobile`,
      { ids },
    ),

  notifyDispatchTechs: (ids?: string[]) =>
    api.post<ApiData<{ notified: number; message: string }>>(
      `/operations/dispatch/notify-techs`,
      { ids },
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
      note?: string;
    },
  ) =>
    api.post<ApiData<DispatchCard>>(
      `/operations/dispatch/${id}/reassign`,
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

  purchaseOrdersOverview: () =>
    api.get<
      ApiData<{
        kpis: PurchaseOrderKpi;
        items: OpsPurchaseOrderItem[];
      }>
    >(`/operations/purchase-orders`),

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
  customerName: string;
  locationLabel?: string | null;
  reconciliation?: string | null;
  reconciliationLabel: string;
  workedHours: number;
  billedHours: number;
  deltaHours: number;
  amount: number;
  amountLabel: string;
  issueLabel?: string | null;
  approvalStatus?: string | null;
  jobDateLabel?: string | null;
};

export type PurchaseOrderKpi = {
  total: number;
  billedBack: number;
  notOnTicket: number;
  totalAmount: number;
  totalAmountLabel: string;
};

export type OpsPurchaseOrderItem = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  customerName: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  ticketId: string;
  ticketCode: string;
  amount: number;
  amountLabel: string;
  note?: string | null;
};

export type NetsuiteKpi = {
  ready: number;
  sent: number;
  corrected: number;
  readyValue: number;
  readyValueLabel: string;
};

export type NetsuiteHandoffItem = {
  id: string;
  code: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  customerName: string;
  locationLabel?: string | null;
  amount: number;
  amountLabel: string;
  approvalStatus?: string | null;
  netsuiteStatus: string;
  netsuiteLabel: string;
  workflowStep?: string | null;
  ready: boolean;
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
