import type { Paginated } from "@dark-horse-safety/types";
import { ApiClient } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";

export type ApiData<T> = { data: T };
export type ApiList<T> = ApiData<Paginated<T>>;

export type HrListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
};

function q(params?: HrListParams) {
  return ApiClient.query(params);
}

export type HrEmployee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  name: string;
  roleTitle: string;
  status: "ACTIVE" | "NEED_REVIEW" | "OFFLINE" | string;
  assignedTruck?: string | null;
  hoursThisCycle: number;
  certExpiringLabel: string;
  certExpiringTone: string;
  bbsThisWeek: string;
  crew?: string | null;
  certificationHeld?: string | null;
  hasOpenTimeEdit: boolean;
  missingBbs: boolean;
  onLeave: boolean;
  supervisor?: { id: string; code: string; name: string } | null;
};

export type HrEmployeeDetail = HrEmployee & {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  homeAddress?: string | null;
  hireDate?: string | null;
  employmentType: string;
  payType: string;
  directReportsCount: number;
  maxClockInRadiusEnabled: boolean;
  maxClockInRadius?: string | null;
  minBillableBlock?: string | null;
  autoFlagNoShow?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  jobTitle?: string | null;
  payRate?: number | null;
  overtimeEligible?: boolean;
  adpEmployeeId?: string | null;
  defaultTimeCategory?: string | null;
  roleTemplate?: string | null;
  moduleOverrides?: string | null;
  mobileAppAccess?: boolean;
  sendInvite?: boolean;
  sseEnabled?: boolean;
  sseMentorId?: string | null;
  ssePeriodDays?: number | null;
  sseEvaluationSchedule?: string | null;
  companyCreditCard?: boolean;
  cardLast4?: string | null;
  assignedEquipment?: string[];
  ppeIssued?: string[];
  certReminderLeadDays?: number | null;
  certIssuingBody?: string | null;
  certIssueDate?: string | null;
  certExpiryDate?: string | null;
  payHistory?: Array<{
    id: string;
    date: string;
    from?: number | null;
    to?: number | null;
    by?: string;
    label: string;
  }>;
  leave: {
    pto: { balance: number; annual: number; used: number; scheduled: number };
    sick: { balance: number; annual: number; used: number };
    holiday: { balance: number; observed: number; taken: number };
  };
  cycleTotals: { rt: number; ot: number; pto: number; total: number };
  lastDay?: string | null;
  terminatedAt?: string | null;
  offboardingStartedAt?: string | null;
  timeEntries: Array<{
    id: string;
    date: string;
    client: string;
    hours: number;
    status: string;
  }>;
  trainingCerts: Array<{
    id: string;
    name: string;
    expiresAt?: string | null;
    subtitle?: string | null;
    status: string;
  }>;
  equipment: Array<{
    id: string;
    label: string;
    value?: string;
    action?: string;
    href?: string;
    badge?: string;
    badgeTone?: string;
  }>;
  auditHistory: Array<{
    id: string;
    when: string;
    label: string;
    detail?: string | null;
  }>;
  notes: Array<{ id: string; text: string; createdAt: string }>;
};

export type HrOffboardingTask = {
  id: string;
  category: string;
  label: string;
  blocking: boolean;
  dueDate: string;
  status: "PENDING" | "COMPLETE" | "BLOCKED" | string;
};

export type HrOffboarding = {
  employeeId: string;
  name: string;
  roleTitle: string;
  lastDay: string;
  startedAt?: string | null;
  progress: { complete: number; total: number };
  categories: Array<{
    category: string;
    complete: number;
    total: number;
    tasks: HrOffboardingTask[];
  }>;
  tasks: HrOffboardingTask[];
  outstandingItems: Array<{
    id: string;
    label: string;
    badge: string;
    badgeTone: string;
    amount: number | null;
  }>;
};

export type HrTerminationPreview = HrOffboarding & {
  totalLiability: number;
  warnings: string[];
};

export type HrEmployeeKpi = {
  active: number;
  activeDelta: number;
  hoursThisCycle: number;
  hoursAvg: number;
  pendingRequests: number;
  pendingEdits: number;
  pendingTimeOff: number;
  trainingFlags: number;
  trainingFlagsMeta: string;
};

export type HrEmployeeFilterOptions = {
  statuses: { value: string; label: string }[];
  roles: { value: string; label: string }[];
  crews: { value: string; label: string }[];
  trucks: { value: string; label: string }[];
  certifications: { value: string; label: string }[];
  supervisors: { value: string; label: string }[];
  wizard?: {
    roles: string[];
    employmentTypes: string[];
    payTypes: string[];
    timeCategories: string[];
    roleTemplates: string[];
    certificationTypes: string[];
    reminderLeadDays: { value: string; label: string }[];
    equipmentOptions: string[];
    ppeOptions: string[];
    trucks: string[];
    crews: string[];
    ssePeriods: { value: string; label: string }[];
    sseSchedules: string[];
  };
};

export type HrTimeEntryDoc = {
  id: string;
  name: string;
  impact: string;
  status: string;
};

export type HrTimeEntryHistory = {
  id: string;
  at: string;
  label: string;
  detail?: string;
};

export type HrTimeEntry = {
  id: string;
  date: string;
  dateLabel: string;
  cycleLabel: string;
  technician: { id: string; code: string; name: string };
  workOrderShort?: string | null;
  workOrderCode?: string | null;
  category: string;
  clockIn?: string | null;
  clockOut?: string | null;
  source: string;
  hours: number;
  workHours?: number | null;
  travelHours?: number | null;
  billable: boolean;
  gpsFlagged: boolean;
  gpsLabel: string;
  status: string;
  locked: boolean;
  correctionRequested: boolean;
  systemSuggestedHours?: number;
  correctionApplied?: boolean;
  correctionReason?: string | null;
  jobLocation?: string | null;
  jobType?: string | null;
  salesTicketId?: string | null;
  customerName?: string | null;
  missingDocs?: boolean;
  docsSubmitted?: number;
  docsRequired?: number;
  payrollBlockCount?: number;
  gpsStatusLabel?: string | null;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockInDistanceMi?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockOutDistanceMi?: number | null;
  jobLat?: number | null;
  jobLng?: number | null;
  jobSiteLabel?: string | null;
  payrollHours?: number;
  billableHours?: number;
  nonBillableReason?: string | null;
  nonBillableHours?: number | null;
  nonBillableContext?: string | null;
  adminNote?: string | null;
  requiredDocuments?: HrTimeEntryDoc[];
  editHistory?: HrTimeEntryHistory[];
  notes?: Array<{ id: string; text: string; createdAt: string }>;
  gpsTrail?: Array<{ at: string; lat: number; lng: number }>;
};

export type HrTimeEntryKpi = {
  totalEntries: number;
  techCount: number;
  pending: number;
  missingClockOut: number;
  approved: number;
  approvedPct: number;
  locked: number;
  gpsFlagged: number;
  gpsFlaggedToday: number;
  editRequests: number;
};

export type HrTimeEntryFilterOptions = {
  statuses: Array<{ value: string; label: string }>;
  categories: Array<{ value: string; label: string }>;
  billable: Array<{ value: string; label: string }>;
  locked: Array<{ value: string; label: string }>;
  technicians: Array<{ value: string; label: string }>;
};

export type HrTimeEditRequest = {
  id: string;
  employeeId: string;
  technician: { id: string; code: string; name: string };
  timeEntryId?: string | null;
  workDate: string;
  dateLabel: string;
  cycleLabel: string;
  workOrderCode?: string | null;
  customerName?: string | null;
  type: string;
  typeLabel: string;
  status: string;
  deltaHours: number;
  deltaLabel: string;
  differenceKind: string;
  relativeTime?: string | null;
  originalClockIn?: string | null;
  originalClockOut?: string | null;
  originalHours?: number | null;
  requestedClockIn?: string | null;
  requestedClockOut?: string | null;
  requestedHours?: number | null;
  technicianReason?: string | null;
  gpsContext?: string | null;
  adminNote?: string | null;
  needsClarification: boolean;
  lockedCycle?: boolean;
  payrollCycleLabel?: string | null;
  cycleClosedLabel?: string | null;
  dollarDelta?: number | null;
  dollarDeltaLabel?: string | null;
  auditWarning?: string | null;
  offCycleRunLabel?: string | null;
  overrideByName?: string | null;
  overrideAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HrTimeEditRequestKpi = {
  pending: number;
  needsClarification: number;
  approvedCycle: number;
  avgTurnaroundHours: number;
  rejectedCycle: number;
  lockedCycle: boolean;
  cycleLabel: string;
};

export type HrTimeOffRequest = {
  id: string;
  employeeId: string;
  employee: { id: string; code: string; name: string; crew?: string | null };
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  startLabel: string;
  endLabel: string;
  dayCount: number;
  hoursRequested: number;
  balanceAfter?: number | null;
  coverage: string;
  durationMode?: string;
  partialHours?: number | null;
  coveragePersonId?: string | null;
  coveragePersonName?: string | null;
  allowOverride?: boolean;
  overrideRoles?: string[];
  requireOverrideReason?: boolean;
  notifySupervisor?: boolean;
  attachments?: Array<{ name: string; size?: string }>;
  requestedAt: string;
  requestedLabel: string;
  reason?: string | null;
  adminNote?: string | null;
  crossesPayCycle: boolean;
  onCallDates?: string[];
  assignedJobs?: Array<{ code: string; date: string; label?: string }>;
  createdAt: string;
  updatedAt: string;
};

export type HrTimeOffPreview = {
  dayCount: number;
  hoursRequested: number;
  durationMode: string;
  balanceBefore: number;
  balanceAfter: number;
  shortfall: number;
  insufficient: boolean;
  balanceBeforeLabel: string;
  balanceAfterLabel: string;
  insufficientMessage: string | null;
  coverageConflict: {
    message: string;
    personName: string;
    rangeLabel: string;
  } | null;
};

export type HrTimeOffCoverageCheck = {
  id: string;
  kind: "OVERLAP" | "CONFLICT";
  label: string;
  detail: string;
  tone: "warning" | "danger";
};

export type HrTimeOffReview = {
  request: HrTimeOffRequest;
  summary: string;
  conflictCount: number;
  coverageChecks: HrTimeOffCoverageCheck[];
  balance: {
    current: number;
    requested: number;
    after: number;
    status: "SUFFICIENT" | "INSUFFICIENT";
  };
};

export type HrTimeOffCalendarEvent = {
  id: string;
  employeeName: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  startLabel: string;
  endLabel: string;
  coverage: string;
};

export type HrTimeOffCalendar = {
  year: number;
  month: number;
  monthLabel: string;
  events: HrTimeOffCalendarEvent[];
};

export type HrTimeOffKpi = {
  pending: number;
  pendingMeta: string;
  approved: number;
  approvedMeta: string;
  denied: number;
  deniedMeta: string;
  upcoming: number;
  upcomingMeta: string;
  coverageNeeded: number;
  coverageNeededMeta: string;
};

export type HrPayCycleRow = {
  id: string;
  code: string;
  cycleLabel: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  lockTime: string;
  status: "CLOSED" | "OPEN" | "UPCOMING" | string;
  hours: number | null;
  amount: number | null;
  isCurrent: boolean;
};

export type HrPayCycleHoliday = {
  id: string;
  dateLabel: string;
  observedOn: string;
  name: string;
  hoursCredited: number;
};

export type HrPayCycleOverview = {
  year: number;
  cycleCount: number;
  headerSubtitle: string;
  cycles: HrPayCycleRow[];
  overtime: {
    dailyOtThresholdHrs: number;
    weeklyOtThresholdHrs: number;
    otMultiplier: number;
    doubleTimeAfterHrs: number;
    minBillableBlock: string;
    roundTo: string;
  };
  holidays: HrPayCycleHoliday[];
  holidaysMeta: string;
  currentCycle: {
    id: string;
    code: string;
    dateRange: string;
    status: string;
    activeEmployees: number;
    daysRemaining: number;
    totalHours: number;
    pendingEdits: number;
    lockedEntries: number;
  } | null;
  ptoRules: {
    annualPtoDays: number;
    accrualRatePerPeriod: number;
    annualSickDays: number;
    carryoverCapDays: number;
    noticeRequiredDays: number;
    blackout: string;
  };
  cadence: {
    cadence: string;
    cycleLengthDays: number;
    lockTime: string;
    autoApproveRules: string;
    gracePeriodDays: number;
  };
  notes?: string | null;
};

export type HrPayrollException = {
  id: string;
  label: string;
  tone: "warn" | "danger" | "info";
  kind?:
    | "clock-out"
    | "edit"
    | "gps"
    | "docs"
    | "form"
    | "locked"
    | string;
  targetId?: string;
  href?: string;
};

export type HrPayrollReviewRow = {
  id: string;
  employeeId: string;
  name: string;
  code: string;
  rtHours: number;
  otHours: number;
  holidayHours: number;
  sickHours: number;
  vacationHours: number;
  totalHours: number;
  gross: number;
  exceptions: HrPayrollException[];
  status: "READY" | "REVIEW" | "BLOCK" | string;
};

export type HrPayrollReviewKpi = {
  cycleId: string;
  cycleCode: string;
  cycleLabel: string;
  dateRange: string;
  payrollApprovedAt: string | null;
  banner: string;
  regularTimeTotal: string;
  regularTimeMeta: string;
  overTimeTotal: string;
  overTimeMeta: string;
  leaveTotal: string;
  leaveMeta: string;
  totalGross: string;
  totalGrossMeta: string;
  exceptions: number;
  exceptionsMeta: string;
};

export type CreateEmployeeBody = {
  firstName: string;
  lastName: string;
  roleTitle: string;
  displayName?: string;
  status?: string;
  supervisorId?: string;
  assignedTruck?: string;
  crew?: string;
  email?: string;
  phone?: string;
  homeAddress?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  jobTitle?: string;
  hireDate?: string;
  employmentType?: string;
  payType?: string;
  payRate?: string;
  overtimeEligible?: boolean;
  adpEmployeeId?: string;
  defaultTimeCategory?: string;
  certificationHeld?: string;
  certIssueDate?: string;
  certExpiryDate?: string;
  certIssuingBody?: string;
  certReminderLeadDays?: number;
  assignedEquipment?: string[];
  ppeIssued?: string[];
  companyCreditCard?: boolean;
  cardLast4?: string;
  roleTemplate?: string;
  moduleOverrides?: string;
  mobileAppAccess?: boolean;
  sendInvite?: boolean;
  sseEnabled?: boolean;
  sseMentorId?: string;
  ssePeriodDays?: number;
  sseEvaluationSchedule?: string;
};

export const hrApi = {
  employeesKpi: () =>
    api.get<ApiData<HrEmployeeKpi>>("/hr/employees/kpi"),
  listEmployees: (params?: HrListParams) =>
    api.get<ApiList<HrEmployee>>(`/hr/employees${q(params)}`),
  employeeFilterOptions: () =>
    api.get<ApiData<HrEmployeeFilterOptions>>("/hr/employees/filter-options"),
  getEmployee: (id: string) =>
    api.get<ApiData<HrEmployeeDetail>>(`/hr/employees/${id}`),
  createEmployee: (body: CreateEmployeeBody) =>
    api.post<ApiData<HrEmployee>>("/hr/employees", body),
  updateEmployee: (
    id: string,
    body: {
      [K in keyof CreateEmployeeBody]?: CreateEmployeeBody[K] | null;
    } & {
      onLeave?: boolean;
      bbsThisWeek?: string | null;
      missingBbs?: boolean;
      maxClockInRadiusEnabled?: boolean;
      maxClockInRadius?: string | null;
      minBillableBlock?: string | null;
      autoFlagNoShow?: string | null;
      statusChangeReason?: string | null;
      statusEffectiveDate?: string | null;
      payRateEffectiveDate?: string | null;
      supervisorEffectiveDate?: string | null;
    },
  ) => api.patch<ApiData<HrEmployeeDetail>>(`/hr/employees/${id}`, body),
  bulkAssignEmployees: (body: {
    ids: string[];
    supervisorId?: string;
    crew?: string;
    trainingLabel?: string;
  }) =>
    api.patch<ApiData<{ updated: number }>>(
      "/hr/employees/bulk-assign",
      body,
    ),
  addEmployeeNote: (id: string, text: string) =>
    api.post<ApiData<HrEmployeeDetail>>(`/hr/employees/${id}/notes`, { text }),
  addEmployeeTraining: (
    id: string,
    body: { name: string; expiresAt?: string; status?: string },
  ) =>
    api.post<ApiData<HrEmployeeDetail>>(`/hr/employees/${id}/training`, body),
  resetEmployeePassword: (id: string) =>
    api.post<ApiData<{ message: string; email: string }>>(
      `/hr/employees/${id}/reset-password`,
      {},
    ),
  startOffboarding: (id: string, body?: { lastDay?: string }) =>
    api.post<ApiData<HrOffboarding>>(
      `/hr/employees/${id}/offboarding/start`,
      body ?? {},
    ),
  getOffboarding: (id: string) =>
    api.get<ApiData<HrOffboarding>>(`/hr/employees/${id}/offboarding`),
  updateOffboarding: (
    id: string,
    body: {
      lastDay?: string;
      tasks?: Array<{ id: string; status?: string }>;
    },
  ) =>
    api.patch<ApiData<HrOffboarding>>(
      `/hr/employees/${id}/offboarding`,
      body,
    ),
  terminationPreview: (id: string) =>
    api.get<ApiData<HrTerminationPreview>>(
      `/hr/employees/${id}/termination-preview`,
    ),
  terminateEmployee: (id: string) =>
    api.post<ApiData<HrEmployeeDetail>>(`/hr/employees/${id}/terminate`, {}),

  timeEntriesKpi: () =>
    api.get<ApiData<HrTimeEntryKpi>>("/hr/time-entries/kpi"),
  listTimeEntries: (params?: HrListParams) =>
    api.get<ApiList<HrTimeEntry>>(`/hr/time-entries${q(params)}`),
  timeEntryFilterOptions: () =>
    api.get<ApiData<HrTimeEntryFilterOptions>>(
      "/hr/time-entries/filter-options",
    ),
  getTimeEntry: (id: string) =>
    api.get<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}`),
  importGoCanvasTimesheets: () =>
    api.post<ApiData<{ imported: number; message: string }>>(
      "/hr/time-entries/import-gocanvas",
      {},
    ),
  approveAllCleanTimeEntries: () =>
    api.post<ApiData<{ updated: number; message: string }>>(
      "/hr/time-entries/approve-all-clean",
      {},
    ),
  bulkApproveTimeEntries: (ids: string[]) =>
    api.patch<ApiData<{ updated: number; message: string }>>(
      "/hr/time-entries/bulk-approve",
      { ids },
    ),
  requestTimeEntryCorrection: (
    id: string,
    body?: {
      reason?: string;
      nonBillableReason?: string;
      nonBillableHours?: number;
      nonBillableContext?: string;
    },
  ) =>
    api.post<ApiData<HrTimeEntry>>(
      `/hr/time-entries/${id}/request-correction`,
      body ?? {},
    ),
  addTimeEntryNote: (id: string, text: string) =>
    api.post<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}/notes`, { text }),
  approveTimeEntry: (id: string) =>
    api.post<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}/approve`, {}),
  rejectTimeEntry: (id: string, reason?: string) =>
    api.post<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}/reject`, {
      reason,
    }),
  saveTimeEntryAdminNote: (id: string, adminNote: string) =>
    api.post<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}/admin-note`, {
      adminNote,
    }),
  updateTimeEntryAdmin: (
    id: string,
    body: {
      hours?: number;
      payrollHours?: number;
      billableHours?: number;
      correctionApplied?: boolean;
      correctionReason?: string;
      clockIn?: string;
      clockOut?: string;
      adminNote?: string;
      nonBillableReason?: string;
      nonBillableHours?: number;
      nonBillableContext?: string;
    },
  ) => api.patch<ApiData<HrTimeEntry>>(`/hr/time-entries/${id}`, body),

  timeEditRequestsKpi: () =>
    api.get<ApiData<HrTimeEditRequestKpi>>("/hr/time-edit-requests/kpi"),
  listTimeEditRequests: (params?: HrListParams) =>
    api.get<ApiList<HrTimeEditRequest>>(
      `/hr/time-edit-requests${q(params)}`,
    ),
  getTimeEditRequest: (id: string) =>
    api.get<ApiData<HrTimeEditRequest>>(`/hr/time-edit-requests/${id}`),
  approveTimeEditRequest: (id: string, adminNote?: string) =>
    api.post<ApiData<HrTimeEditRequest>>(
      `/hr/time-edit-requests/${id}/approve`,
      { adminNote },
    ),
  adminOverrideTimeEditRequest: (
    id: string,
    body?: { adminNote?: string; overrideByName?: string },
  ) =>
    api.post<ApiData<HrTimeEditRequest>>(
      `/hr/time-edit-requests/${id}/admin-override`,
      body ?? {},
    ),
  rejectTimeEditRequest: (id: string, reason?: string) =>
    api.post<ApiData<HrTimeEditRequest>>(
      `/hr/time-edit-requests/${id}/reject`,
      { reason },
    ),
  clarifyTimeEditRequest: (id: string, message?: string) =>
    api.post<ApiData<HrTimeEditRequest>>(
      `/hr/time-edit-requests/${id}/clarify`,
      { message },
    ),
  saveTimeEditAdminNote: (id: string, adminNote: string) =>
    api.post<ApiData<HrTimeEditRequest>>(
      `/hr/time-edit-requests/${id}/admin-note`,
      { adminNote },
    ),
  addTimeEditNote: (text: string, requestId?: string) =>
    api.post<ApiData<HrTimeEditRequest>>(`/hr/time-edit-requests/add-note`, {
      text,
      requestId,
    }),
  exportTimeEditRequests: () =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      "/hr/time-edit-requests/export",
    ),

  timeOffKpi: () => api.get<ApiData<HrTimeOffKpi>>("/hr/time-off/kpi"),
  listTimeOff: (params?: HrListParams) =>
    api.get<ApiList<HrTimeOffRequest>>(`/hr/time-off${q(params)}`),
  getTimeOff: (id: string) =>
    api.get<ApiData<HrTimeOffRequest>>(`/hr/time-off/${id}`),
  reviewTimeOff: (id: string) =>
    api.get<ApiData<HrTimeOffReview>>(`/hr/time-off/${id}/review`),
  timeOffCalendar: (params?: {
    year?: number;
    month?: number;
    status?: string;
    type?: string;
    q?: string;
  }) =>
    api.get<ApiData<HrTimeOffCalendar>>(
      `/hr/time-off/calendar${q(params)}`,
    ),
  createTimeOff: (body: {
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
    durationMode?: string;
    partialHours?: number;
    coveragePersonId?: string;
    coveragePersonName?: string;
    allowOverride?: boolean;
    overrideRoles?: string[];
    requireOverrideReason?: boolean;
    notifySupervisor?: boolean;
    attachments?: Array<{ name: string; size?: string }>;
  }) => api.post<ApiData<HrTimeOffRequest>>("/hr/time-off", body),
  previewTimeOff: (body: {
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    durationMode?: string;
    partialHours?: number;
    coveragePersonId?: string;
    coveragePersonName?: string;
  }) => api.post<ApiData<HrTimeOffPreview>>("/hr/time-off/preview", body),
  approveTimeOff: (id: string, adminNote?: string) =>
    api.post<ApiData<HrTimeOffRequest>>(`/hr/time-off/${id}/approve`, {
      adminNote,
    }),
  denyTimeOff: (id: string, reason?: string) =>
    api.post<ApiData<HrTimeOffRequest>>(`/hr/time-off/${id}/deny`, {
      reason,
    }),
  exportTimeOff: (params?: HrListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/hr/time-off/export${q(params)}`,
    ),

  payCycleSettings: (year?: number) =>
    api.get<ApiData<HrPayCycleOverview>>(
      `/hr/pay-cycle${q(year ? { year } : undefined)}`,
    ),
  closePayCycle: (id: string) =>
    api.post<ApiData<{ id: string; status: string }>>(
      `/hr/pay-cycle/${id}/close`,
    ),
  reopenPayCycle: (id: string) =>
    api.post<ApiData<{ id: string; status: string }>>(
      `/hr/pay-cycle/${id}/reopen`,
    ),
  resyncPayCycle: (id: string) =>
    api.post<ApiData<{ id: string; hours: number; amount: number }>>(
      `/hr/pay-cycle/${id}/resync`,
    ),
  updatePayCycleOvertime: (body: Partial<HrPayCycleOverview["overtime"]>) =>
    api.patch<ApiData<unknown>>(`/hr/pay-cycle/settings/overtime`, body),
  updatePayCyclePto: (body: Partial<HrPayCycleOverview["ptoRules"]>) =>
    api.patch<ApiData<unknown>>(`/hr/pay-cycle/settings/pto`, body),
  updatePayCycleCadence: (body: Partial<HrPayCycleOverview["cadence"]>) =>
    api.patch<ApiData<unknown>>(`/hr/pay-cycle/settings/cadence`, body),
  updatePayCycleHoliday: (
    id: string,
    body: { name?: string; hoursCredited?: number; observedOn?: string },
  ) =>
    api.patch<ApiData<HrPayCycleHoliday>>(
      `/hr/pay-cycle/holidays/${id}`,
      body,
    ),
  addPayCycleNote: (text: string) =>
    api.post<ApiData<{ notes: string | null }>>(`/hr/pay-cycle/notes`, {
      text,
    }),

  payrollReviewKpi: (cycleId?: string) =>
    api.get<ApiData<HrPayrollReviewKpi>>(
      `/hr/payroll-review/kpi${q(cycleId ? { cycleId } : undefined)}`,
    ),
  listPayrollReview: (params?: HrListParams) =>
    api.get<ApiList<HrPayrollReviewRow>>(
      `/hr/payroll-review${q(params)}`,
    ),
  approvePayrollReview: (cycleId?: string) =>
    api.post<ApiData<{ id: string; payrollApprovedAt: string | null; message: string }>>(
      `/hr/payroll-review/approve${q(cycleId ? { cycleId } : undefined)}`,
      {},
    ),
  generatePayrollReport: (cycleId?: string) =>
    api.get<ApiData<{ csv: string; filename: string; cycleId: string; cycleCode: string }>>(
      `/hr/payroll-review/report${q(cycleId ? { cycleId } : undefined)}`,
    ),
  exportPayrollReview: (params?: HrListParams) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/hr/payroll-review/export${q(params)}`,
    ),

  payrollResolveContext: (kind: string, targetId: string) =>
    api.get<ApiData<Record<string, unknown>>>(
      `/hr/payroll-review/resolve/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
    ),
  payrollResolveClockOut: (id: string, clockOut: string) =>
    api.post<ApiData<{ id: string; clockOut: string | null; message: string }>>(
      `/hr/payroll-review/resolve/clock-out/${id}`,
      { clockOut },
    ),
  payrollAskEmployee: (id: string, message?: string) =>
    api.post<ApiData<{ message: string }>>(
      `/hr/payroll-review/resolve/ask/${id}`,
      { message },
    ),
  payrollResolveDocs: (employeeId: string) =>
    api.post<ApiData<{ message: string }>>(
      `/hr/payroll-review/resolve/docs/${employeeId}`,
      {},
    ),
  payrollResolveForm: (id: string) =>
    api.post<ApiData<{ message: string }>>(
      `/hr/payroll-review/resolve/form/${id}`,
      {},
    ),
  payrollResolveGps: (id: string, action: "confirm" | "error") =>
    api.post<ApiData<{ message: string }>>(
      `/hr/payroll-review/resolve/gps/${id}`,
      { action },
    ),
  payrollLockPreview: (cycleId?: string) =>
    api.get<
      ApiData<{
        cycleId: string;
        cycle: string;
        dateRange: string;
        employees: string;
        totalHours: string;
        grossTotal: string;
        unresolved: Array<{
          id: string;
          label: string;
          count: number;
          tone: string;
        }>;
        warning: string;
      }>
    >(`/hr/payroll-review/lock-preview${q(cycleId ? { cycleId } : undefined)}`),
  payrollLockCycle: (cycleId?: string) =>
    api.post<ApiData<{ id: string; status: string; message: string }>>(
      `/hr/payroll-review/lock${q(cycleId ? { cycleId } : undefined)}`,
      {},
    ),
  payrollUnlockPreview: (cycleId?: string) =>
    api.get<
      ApiData<{
        cycleId: string;
        metaLine: string;
        exportedBadge: string;
        entry: {
          lockedOn: string;
          lockedBy: string;
          payrollExported: string;
        };
      }>
    >(
      `/hr/payroll-review/unlock-preview${q(cycleId ? { cycleId } : undefined)}`,
    ),
  payrollUnlockRequest: (reason: string, cycleId?: string) =>
    api.post<ApiData<{ message: string; cycleId: string }>>(
      `/hr/payroll-review/unlock-request${q(cycleId ? { cycleId } : undefined)}`,
      { reason },
    ),
  offCycleKpi: () =>
    api.get<
      ApiData<{
        entriesReopened: number;
        totalDeltaHours: string;
        totalDeltaDollars: string;
        approvedBy: string;
        runStatus: string;
        pendingCount: number;
        processedCount: number;
      }>
    >(`/hr/payroll-review/off-cycle/kpi`),
  listOffCycle: (params?: HrListParams) =>
    api.get<
      ApiList<{
        id: string;
        employeeId: string;
        name: string;
        code: string;
        originalCycle: string;
        reason: string;
        original: string;
        updated: string;
        delta: string;
        dollarImpact: string;
        status: string;
      }>
    >(`/hr/payroll-review/off-cycle${q(params)}`),
  processOffCycleRun: () =>
    api.post<
      ApiData<{ processed: number; runLabel: string; message: string }>
    >(`/hr/payroll-review/off-cycle/process`, {}),

  adpExportKpi: (cycleId?: string) =>
    api.get<
      ApiData<{
        cycleId: string;
        cycleCode: string;
        ready: number;
        readyMeta: string;
        exported: number;
        exportedMeta: string;
        holds: number;
        holdsMeta: string;
        errors: number;
        errorsMeta: string;
        gross: string;
        grossMeta: string;
      }>
    >(`/hr/payroll-export/kpi${q(cycleId ? { cycleId } : undefined)}`),
  listAdpExport: (params?: HrListParams) =>
    api.get<
      ApiList<{
        id: string;
        employeeId: string;
        name: string;
        code: string;
        exportCode: string;
        cycleCode: string;
        rtHours: number;
        otHours: number;
        ptoHours: number;
        ptoDays: number;
        gross: number;
        adpCode: string;
        batchCode: string;
        reviewerName: string;
        status: string;
      }>
    >(`/hr/payroll-export${q(params)}`),
  adpExportConfirm: (cycleId?: string) =>
    api.get<
      ApiData<{
        cycleId: string;
        payCycle: string;
        employeeCount: string;
        totalHours: string;
        grossTotal: string;
        fileFormat: string;
        destination: string;
        exceptionsRemaining: number;
        cycleLocked: boolean;
        warning: string | null;
      }>
    >(`/hr/payroll-export/confirm${q(cycleId ? { cycleId } : undefined)}`),
  adpExportNow: (cycleId?: string) =>
    api.post<
      ApiData<
        | {
            ok: false;
            errorReason: string;
            missingCount: number;
            log: string;
          }
        | {
            ok: true;
            csv: string;
            filename: string;
            file: string;
            payCycle: string;
            employees: number;
            grossTotal: string;
            timestamp: string;
            cycleLocked: boolean;
            cycleId: string;
            warning: string | null;
          }
      >
    >(`/hr/payroll-export/export${q(cycleId ? { cycleId } : undefined)}`, {}),

  supervisorRoutingKpi: () =>
    api.get<
      ApiData<{
        supervisors: number;
        supervisorsMeta: string;
        crews: number;
        crewsMeta: string;
        members: number;
        membersMeta: string;
        regions: number;
        regionsMeta: string;
        unrouted: number;
        unroutedMeta: string;
      }>
    >(`/hr/supervisor-routing/kpi`),
  supervisorRoutingOverview: (params?: HrListParams) =>
    api.get<
      ApiData<{
        managerTier: string;
        routes: {
          items: HrSupervisorRoute[];
          page: number;
          pageSize: number;
          total: number;
        };
        structureDrives: Array<{
          id: string;
          label: string;
          description: string;
        }>;
      }>
    >(`/hr/supervisor-routing${q(params)}`),
  createSupervisorRoute: (body: {
    name: string;
    code?: string;
    status?: string;
    managerTier?: string;
    region?: string;
    crew?: string;
    escalatesTo?: string;
    escalateDelay?: string;
    backupName?: string;
    coverageWindow?: string;
    onCall?: boolean;
    approvesTimeEdit?: boolean;
    approvesTimeOff?: boolean;
    memberCount?: number;
    supervisorEmployeeId?: string;
  }) =>
    api.post<ApiData<HrSupervisorRoute>>(`/hr/supervisor-routing`, body),

  trainingDashboard: () =>
    api.get<ApiData<HrTrainingDashboard>>(`/hr/training/dashboard`),
  listTrainingRecords: (params?: HrListParams) =>
    api.get<ApiList<HrTrainingRecord>>(`/hr/training/records${q(params)}`),
  listTrainingCourses: () =>
    api.get<
      ApiData<
        Array<{
          id: string;
          name: string;
          kind: string;
          code?: string | null;
          issuingBody?: string | null;
        }>
      >
    >(`/hr/training/courses`),
  createTrainingRecord: (body: {
    employeeId: string;
    courseId?: string;
    topic?: string;
    issuingBody?: string;
    instructor?: string;
    completedAt?: string;
    expiryAt?: string;
    score?: string;
    cost?: string;
    certificateName?: string;
    certificateSize?: string;
    reminderLead?: string;
    notes?: string;
    kind?: string;
  }) =>
    api.post<ApiData<HrTrainingRecord>>(`/hr/training/records`, body),
  assignTraining: (body: {
    courseId?: string;
    courseName?: string;
    employeeIds: string[];
    dueDate?: string;
    reason?: string;
    notify?: boolean;
    linkedSource?: string;
  }) =>
    api.post<ApiData<{ count: number }>>(`/hr/training/assign`, body),
  createTrainingCertificate: (body: {
    employeeId: string;
    label: string;
    expiryAt?: string;
    verification?: string;
    issuingBody?: string;
    fileName?: string;
    fileSize?: string;
    renewalReminder?: boolean;
  }) => api.post<ApiData<{ id: string }>>(`/hr/training/certificates`, body),
  sseDashboard: () => api.get<ApiData<HrSseDashboard>>(`/hr/training/sse`),
  createSsePairing: (body: { mentorId: string; menteeId: string }) =>
    api.post<ApiData<{ id: string }>>(`/hr/training/sse`, body),

  onCallMonth: (params?: { year?: number; month?: number }) =>
    api.get<ApiData<HrOnCallMonth>>(`/hr/on-call${q(params)}`),
  onCallPool: () =>
    api.get<
      ApiData<{
        technicians: Array<{ id: string; name: string }>;
        certifications: string[];
      }>
    >(`/hr/on-call/pool`),
  getOnCallAssignment: (id: string) =>
    api.get<ApiData<HrOnCallAssignment>>(`/hr/on-call/${id}`),
  updateOnCallAssignment: (
    id: string,
    body: {
      employeeId?: string | null;
      backupId?: string | null;
      zone?: string | null;
      status?: string;
      notes?: string | null;
    },
  ) => api.patch<ApiData<HrOnCallAssignment>>(`/hr/on-call/${id}`, body),
  createOnCallSwap: (body: {
    assignmentId: string;
    toEmployeeId?: string;
    swapType?: string;
    reason?: string;
  }) => api.post<ApiData<{ id: string }>>(`/hr/on-call/swaps`, body),
  previewOnCallGenerate: (body: HrOnCallGenerateBody) =>
    api.post<
      ApiData<{
        assignments: Array<{
          date: string;
          dateLabel: string;
          name: string | null;
          zone: string | null;
          status: "OK" | "CONFLICT";
        }>;
        summary: { generated: number; conflicts: number; label: string };
      }>
    >(`/hr/on-call/generate/preview`, body),
  generateOnCall: (body: HrOnCallGenerateBody) =>
    api.post<
      ApiData<{
        created: number;
        conflicts: number;
        pattern: string;
        notify: boolean;
      }>
    >(`/hr/on-call/generate`, body),
  publishOnCall: (params?: { year?: number; month?: number }) =>
    api.post<ApiData<{ published: number }>>(
      `/hr/on-call/publish${q(params)}`,
      {},
    ),

  gpsFlagsOverview: () =>
    api.get<ApiData<HrGpsFlagsOverview>>(`/hr/gps-flags`),
  getGpsFlag: (id: string) =>
    api.get<ApiData<HrGpsFlagDetail>>(`/hr/gps-flags/${id}`),
  decideGpsFlag: (
    id: string,
    body: {
      decision: string;
      rejectReason?: string;
      notifyVia?: string;
      notes?: string;
    },
  ) => api.post<ApiData<HrGpsFlagDetail>>(`/hr/gps-flags/${id}/decision`, body),
};

export type HrGpsFlagListItem = {
  id: string;
  employee: string;
  eventAtLabel: string;
  ageLabel: string;
  distanceLabel: string;
  distanceMi: number;
  type: string;
  typeLabel: string;
  decision: string;
};

export type HrGpsFlagDetail = HrGpsFlagListItem & {
  title: string;
  alertBanner: string;
  timeOfEvent: string;
  workOrder?: string | null;
  customer?: string | null;
  flagAge: string;
  explanation?: string | null;
  photoLabel?: string | null;
  photoMeta?: string | null;
  map: {
    jobLat?: number | null;
    jobLng?: number | null;
    clockLat?: number | null;
    clockLng?: number | null;
  };
  decisionNotes?: string | null;
  rejectReason?: string | null;
};

export type HrGpsFlagsOverview = {
  kpis: {
    openFlags: number;
    openMeta: string;
    avgDistance: string;
    avgMeta: string;
    oldestFlag: string;
    oldestMeta: string;
  };
  flags: HrGpsFlagListItem[];
};

export type HrOnCallAssignment = {
  id: string;
  date: string;
  dateLabel: string;
  employeeId?: string | null;
  employeeName?: string | null;
  backupId?: string | null;
  backupName?: string | null;
  zone?: string | null;
  status: string;
  notes?: string | null;
  published: boolean;
  unassigned: boolean;
};

export type HrOnCallMonth = {
  year: number;
  month: number;
  monthLabel: string;
  kpis: {
    onCallToday: string;
    onCallTodayMeta: string;
    unassignedDays: number;
    unassignedMeta: string;
    swapRequests: number;
    swapMeta: string;
  };
  calendar: {
    weekdays: string[];
    cells: Array<{
      day: number;
      inMonth: boolean;
      iso: string | null;
      assignment: HrOnCallAssignment | null;
    }>;
  };
  techCounts: Array<{
    id: string;
    name: string;
    days: number;
    pct: number;
    barTone: "orange" | "blue" | "gray";
  }>;
};

export type HrOnCallGenerateBody = {
  fromDate: string;
  toDate: string;
  coverage?: string;
  technicianIds: string[];
  certifications?: string[];
  pattern?: string;
  maxConsecutive?: number;
  minGap?: number;
  respectTimeOff?: boolean;
  respectDispatch?: boolean;
  notify?: boolean;
};

export type HrTrainingRecord = {
  id: string;
  employee: string;
  employeeId: string;
  user: string;
  topic: string;
  topicCode?: string | null;
  date?: string | null;
  dateRaw?: string | null;
  mentor?: string | null;
  score?: string | null;
  verification: string;
  status: string;
  kind: string;
};

export type HrTrainingDashboard = {
  kpis: {
    activeEmployees: number;
    enrolledLabel: string;
    recordsOnFile: number;
    topicsLabel: string;
    expiringSoon: number;
    dueLabel: string;
  };
  records: HrTrainingRecord[];
  widgets: {
    completion: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      action: string;
    }>;
    assignments: {
      completed: number;
      total: number;
      summaryLabel: string;
      overdueLabel: string;
      rows: Array<{ id: string; name: string; status: string }>;
    };
    certificates: Array<{
      id: string;
      label: string;
      subtitle?: string | null;
      verification: string;
      verificationLabel?: string;
    }>;
    expiry: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      action: string;
    }>;
    quizzes: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      action: string;
    }>;
  };
};

export type HrSseDashboard = {
  kpis: {
    activePairings: number;
    pairingsLabel: string;
    evaluationsThisWeek: string;
    missingLabel: string;
    sseEvaluations: number;
    cycleLabel: string;
  };
  widgets: {
    pairings: Array<{
      id: string;
      label: string;
      status: string;
      action: string;
    }>;
    evaluationsDue: {
      completed: number;
      total: number;
      summaryLabel: string;
      pendingLabel: string;
      rows: Array<{ id: string; label: string; status: string }>;
    };
    mentorScorecard: Array<{
      id: string;
      label: string;
      status: string;
      action: string;
    }>;
    graduation: Array<{
      id: string;
      name: string;
      label: string;
      action: string;
    }>;
    decisions: Array<{
      id: string;
      label: string;
      detail?: string | null;
      action: string;
    }>;
    feedback: Array<{
      id: string;
      label: string;
      status: string;
      action: string;
    }>;
  };
};

export type HrSupervisorRoute = {
  id: string;
  code: string;
  name: string;
  status: string;
  managerTier: string;
  region?: string | null;
  crew?: string | null;
  locationLabel: string;
  escalatesTo: string;
  escalateDelay: string;
  escalateLabel: string;
  backupName?: string | null;
  coverageWindow: string;
  onCall: boolean;
  approvesTimeEdit: boolean;
  approvesTimeOff: boolean;
  memberCount: number;
  crewSummary: string;
  supervisorEmployeeId?: string | null;
};

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
