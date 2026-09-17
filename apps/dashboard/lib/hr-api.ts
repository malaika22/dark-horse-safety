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
  auditHistory: Array<{ id: string; when: string; label: string }>;
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
    body: Partial<CreateEmployeeBody> & {
      onLeave?: boolean;
      bbsThisWeek?: string;
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
