import { api } from "@/lib/api";

export type CompanyProfile = {
  id: string;
  companyName: string;
  establishmentName: string;
  streetAddress: string;
  cityStateZip: string;
  phone: string;
  ein: string;
  naicsCode: string;
  sicCode: string;
  annualAverageEmployees: string;
  totalHoursWorked: string;
  companyExecutive: string;
  recordkeepingContact: string;
};

export type BusinessRule = {
  id: string;
  code: string;
  area: string;
  source: string;
  appliesTo: string;
  enforcement: string;
  owner: string;
  status: string;
  statusLabel: string;
  domain: string;
  hardGate: boolean;
  customerOverride: boolean;
  pendingReview: boolean;
};

export type RuleSummary = {
  activeRules: number;
  hardGates: number;
  customerOverrides: number;
  pendingReview: number;
};

export type RuleOverride = {
  id: string;
  code: string;
  whenLabel: string;
  ruleDomain: string;
  record: string;
  change: string;
  approvedBy: string;
  status: string;
  statusLabel: string;
  domain: string;
  reason: string;
  requestedBy: string;
  effectiveLabel: string;
  note: string;
};

export type RetentionClass = {
  id: string;
  code: string;
  recordClass: string;
  proposedPeriod: string;
  afterExpiry: string;
  legalHold: string;
  owner: string;
  locked: boolean;
  periodTone: string;
};

export type RetentionPolicy = {
  id: string;
  status: string;
  note: string;
};

export type GlobalDefaults = {
  id: string;
  closeoutEscalation: string;
  closeoutOwner: string;
  workStoppedEscalation: string;
  workStoppedOwner: string;
  recurringGeneration: string;
  recurringOwner: string;
  payCycle: string;
  payCycleOwner: string;
  poApproval: string;
  poOwner: string;
  missingPoBlock: string;
  missingPoOwner: string;
  requiredForms: string;
  requiredFormsOwner: string;
  geofenceFallback: string;
  geofenceOwner: string;
  msaEnforcement: string;
  msaOwner: string;
};

export type NotificationRecipient = {
  id: string;
  code: string;
  event: string;
  primary: string;
  ccEscalate: string;
  channel: string;
  trigger: string;
};

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const settingsApi = {
  companyProfile: () => api.get<{ data: CompanyProfile }>("/settings/company-profile"),
  saveCompanyProfile: (body: Omit<CompanyProfile, "id">) =>
    api.put<{ data: CompanyProfile }>("/settings/company-profile", body),
  businessRules: (params: { q?: string; domain?: string; status?: string }) =>
    api.get<{ data: { items: BusinessRule[]; summary: RuleSummary; domains: string[] } }>(
      `/settings/business-rules${query(params)}`,
    ),
  updateBusinessRule: (id: string, body: Partial<Pick<BusinessRule, "status" | "statusLabel" | "owner" | "enforcement">>) =>
    api.patch<{ data: BusinessRule }>(`/settings/business-rules/${id}`, body),
  overrides: (params: { q?: string; domain?: string; days?: string }) =>
    api.get<{ data: { items: RuleOverride[]; domains: string[] } }>(
      `/settings/overrides${query(params)}`,
    ),
  retention: () =>
    api.get<{ data: { policy: RetentionPolicy; items: RetentionClass[] } }>("/settings/retention"),
  updateRetention: (id: string, body: Partial<Pick<RetentionClass, "proposedPeriod" | "afterExpiry" | "legalHold" | "owner">>) =>
    api.patch<{ data: RetentionClass }>(`/settings/retention/${id}`, body),
  previewRetention: () =>
    api.post<{ data: { affectedClasses: number; lockedClasses: number; message: string } }>(
      "/settings/retention/preview",
      {},
    ),
  publishRetention: () =>
    api.post<{ data: { policy: RetentionPolicy; items: RetentionClass[] } }>(
      "/settings/retention/publish",
      {},
    ),
  globalDefaults: () => api.get<{ data: GlobalDefaults }>("/settings/global-defaults"),
  saveGlobalDefaults: (body: Omit<GlobalDefaults, "id">) =>
    api.put<{ data: GlobalDefaults }>("/settings/global-defaults", body),
  recipients: () =>
    api.get<{ data: { items: NotificationRecipient[]; scope: string } }>("/settings/notification-recipients"),
  saveRecipients: (items: Pick<NotificationRecipient, "id" | "primary" | "ccEscalate" | "channel" | "trigger">[]) =>
    api.put<{ data: { items: NotificationRecipient[]; scope: string } }>("/settings/notification-recipients", { items }),
  timeCategories: () => api.get<{ data: { items: TimeCategory[] } }>("/settings/time-categories"),
  createTimeCategory: (body: TimeCategoryInput) =>
    api.post<{ data: TimeCategory }>("/settings/time-categories", body),
  updateTimeCategory: (id: string, body: TimeCategoryInput) =>
    api.patch<{ data: TimeCategory }>(`/settings/time-categories/${id}`, body),
  deleteTimeCategory: (id: string) => api.delete<{ data: { id: string } }>(`/settings/time-categories/${id}`),
  reorderTimeCategories: (ids: string[]) =>
    api.put<{ data: { items: TimeCategory[] } }>("/settings/time-categories/order", { ids }),
  payrollRules: () => api.get<{ data: PayrollRules }>("/settings/payroll-rules"),
  savePayrollRules: (body: PayrollRulesInput) => api.put<{ data: PayrollRules }>("/settings/payroll-rules", body),
  exportPayroll: () => api.post<{ data: PayrollRules }>("/settings/payroll-rules/export", {}),
  mobileSync: (params: { q?: string; status?: string; page?: string; sort?: string; pageSize?: string; crew?: string; version?: string }) =>
    api.get<{ data: MobileSyncPage }>(`/settings/mobile-sync${query(params)}`),
  forceSyncAll: (ids?: string[]) =>
    api.post<{ data: MobileSyncPage & { started: string[]; deferred: string[] } }>("/settings/mobile-sync/force", { ids }),
  forceSyncDevice: (id: string) =>
    api.post<{ data: { deferred: boolean; technician: string; deviceId: string } }>(`/settings/mobile-sync/${id}/force`, {}),
  resetDevice: (id: string, reason: string) =>
    api.post<{ data: { id: string; reason: string } }>(`/settings/mobile-sync/${id}/reset`, { reason }),
  contactTechnician: (id: string) =>
    api.post<{ data: { message: string; phone: string | null; email: string | null } }>(`/settings/mobile-sync/${id}/contact`, {}),
  contactTechnicians: (ids: string[]) =>
    api.post<{ data: { message: string; count: number } }>("/settings/mobile-sync/contact", { ids }),
  deviceHistory: (id: string) => api.get<{ data: DeviceHistory }>(`/settings/mobile-sync/${id}/history`),
  syncIncident: (code: string) => api.get<{ data: SyncIncident }>(`/settings/mobile-sync/errors/${code}`),
  setIncidentStep: (code: string, stepId: string, done: boolean) =>
    api.patch<{ data: SyncIncident }>(`/settings/mobile-sync/errors/${code}/steps/${stepId}`, { done }),
  retryIncident: (code: string) => api.post<{ data: SyncIncident }>(`/settings/mobile-sync/errors/${code}/retry`, {}),
  discardIncident: (code: string, reason: string) =>
    api.post<{ data: SyncIncident }>(`/settings/mobile-sync/errors/${code}/discard`, { reason }),
  accessUsers: (params: { q?: string; role?: string; team?: string; status?: string; mfa?: string; mobile?: string; page?: string; sort?: string; pageSize?: string }) =>
    api.get<{ data: AccessUsersPage }>(`/settings/access/users${query(params)}`),
  accessUser: (id: string) => api.get<{ data: AccessUserDetail }>(`/settings/access/users/${id}`),
  createAccessUser: (body: AccessUserInput) => api.post<{ data: AccessUser }>(`/settings/access/users`, body),
  updateAccessUser: (id: string, body: AccessUserInput) => api.patch<{ data: AccessUser }>(`/settings/access/users/${id}`, body),
  deactivateAccessUser: (id: string, reason?: string) => api.post<{ data: AccessUser }>(`/settings/access/users/${id}/deactivate`, { reason }),
  deleteAccessUser: (id: string) => api.delete<{ data: { id: string } }>(`/settings/access/users/${id}`),
  resetAccessPassword: (id: string) => api.post<{ data: { message: string } }>(`/settings/access/users/${id}/reset-password`, {}),
  resendAccessInvite: (id: string) => api.post<{ data: { message: string; email: string } }>(`/settings/access/users/${id}/resend-invite`, {}),
  cancelAccessInvite: (id: string) => api.post<{ data: { id: string } }>(`/settings/access/users/${id}/cancel-invite`, {}),
  previewAccessUser: (id: string) => api.post<{ data: { message: string; name: string; role: string } }>(`/settings/access/users/${id}/preview`, {}),
  accessTeams: (params: { q?: string; region?: string; access?: string; owner?: string; kind?: string; sort?: string }) =>
    api.get<{ data: AccessTeamsPage }>(`/settings/access/teams${query(params)}`),
  createAccessTeam: (body: AccessTeamInput) => api.post<{ data: AccessTeam }>(`/settings/access/teams`, body),
  accessRoles: () => api.get<{ data: { items: AccessRole[] } }>("/settings/access/roles"),
  saveAccessRole: (code: string, body: AccessRoleInput) => api.patch<{ data: { items: AccessRole[] } }>(`/settings/access/roles/${code}`, body),
  createAccessRole: (body: AccessRoleInput) => api.post<{ data: { items: AccessRole[] } }>("/settings/access/roles", body),
  accessAudit: (params: { q?: string; type?: string; result?: string; severity?: string; actor?: string; range?: string; chip?: string; page?: string; pageSize?: string; sort?: string }) =>
    api.get<{ data: AccessAuditPage }>(`/settings/access/audit${query(params)}`),
  updateAccessTeam: (id: string, body: AccessTeamInput) => api.patch<{ data: AccessTeam }>(`/settings/access/teams/${id}`, body),
  addTeamMember: (id: string, body: { name: string; role: string; note?: string }) => api.post<{ data: AccessTeam }>(`/settings/access/teams/${id}/members`, body),
  reactivateAccessUser: (id: string, reason: string) => api.post<{ data: AccessUser }>(`/settings/access/users/${id}/reactivate`, { reason }),
  onCallRules: () => api.get<{ data: OnCallRules }>("/settings/on-call-rules"),
  saveOnCallRules: (body: OnCallRules) => api.put<{ data: OnCallRules }>("/settings/on-call-rules", body),
  formLibrary: (category?: string) => api.get<{ data: FormLibraryPage }>(`/settings/forms/library${query({ category })}`),
  formSubmissions: (params: { q?: string; review?: string }) => api.get<{ data: FormSubmissionsPage }>(`/settings/forms/submissions${query(params)}`),
  markSubmissionsReviewed: () => api.post<{ data: FormSubmissionsPage }>("/settings/forms/submissions/mark-reviewed", {}),
  formRules: (params: { q?: string; windows?: string }) => api.get<{ data: { items: FormRule[] } }>(`/settings/forms/rules${query(params)}`),
  archivedForms: (params: { q?: string; windows?: string }) => api.get<{ data: { items: ArchivedForm[] } }>(`/settings/forms/archived${query(params)}`),
  restoreArchivedForm: (id: string) => api.post<{ data: { items: ArchivedForm[] } }>(`/settings/forms/archived/${id}/restore`, {}),
  formDraft: () => api.get<{ data: FormDraft | null }>("/settings/forms/builder"),
  saveFormDraft: (body: { title: string; sections: FormSection[] }) => api.post<{ data: FormDraft }>("/settings/forms/builder", body),
  notificationPreferences: () => api.get<{ data: { items: NotificationPreference[] } }>("/settings/notifications"),
  saveNotificationPreference: (code: string, body: { inApp: boolean; email: boolean; sms: boolean }) =>
    api.patch<{ data: NotificationPreference }>(`/settings/notifications/${code}`, body),
  dataIntegrations: () => api.get<{ data: { items: DataIntegration[] } }>("/settings/integrations"),
};

export type TimeCategory = {
  id: string;
  code: string;
  name: string;
  entryCount: number;
  paid: boolean;
  billable: boolean;
  countsToOt: boolean;
  payrollCode: string;
};

export type TimeCategoryInput = Pick<TimeCategory, "name" | "paid" | "billable" | "countsToOt" | "payrollCode">;

export type PayrollRules = {
  id: string;
  payCycleLength: string;
  currentCycleStart: string;
  overtimeThreshold: string;
  longShiftFlag: string;
  seventhDayRule: boolean;
  autoApproveClean: boolean;
  roundClockEntries: string;
  requireAdminNote: boolean;
  gracePeriod: string;
  minimumShift: string;
  exportTo: string;
  lastExportLabel: string;
  lastExportDate: string;
  nextCloseLabel: string;
  nextCloseDate: string;
};

export type PayrollRulesInput = Omit<PayrollRules, "id" | "lastExportLabel" | "lastExportDate" | "nextCloseLabel" | "nextCloseDate">;

export type DeviceQueueItem = {
  id: string;
  itemType: string;
  detail: string;
  createdLabel: string;
  sizeLabel: string;
  status: string;
  errorLabel: string | null;
  errorCode: string | null;
};

export type FieldDevice = {
  id: string;
  technician: string;
  truck: string;
  status: string;
  statusLabel: string;
  failed: number;
  queued: number;
  lastSyncLabel: string;
  lastSyncDetail: string | null;
  appVersion: string;
  versionNote: string | null;
  deviceId: string;
  phone: string | null;
  email: string | null;
  lastLocation: string | null;
  crew: string | null;
  connectivity: string | null;
  sessionLabel: string | null;
  platform: string | null;
  queueItems: DeviceQueueItem[];
  incidents: { code: string }[];
};

export type MobileSyncSummary = {
  devices: number;
  upToDate: number;
  queued: number;
  failed: number;
  offline: number;
  attention: number;
  offlineName: string;
  latestVersion: string;
};

export type MobileSyncPage = {
  items: FieldDevice[];
  summary: MobileSyncSummary;
  crews: string[];
  latestVersion: string;
  resetReasons: string[];
  page: number;
  pageSize: number;
  total: number;
};

export type DeviceHistoryEvent = {
  id: string;
  whenLabel: string;
  title: string;
  detail: string | null;
  status: string;
};

export type DeviceHistory = {
  deviceId: string;
  technician: string;
  truck: string;
  platform: string | null;
  appVersion: string;
  events: DeviceHistoryEvent[];
};

export type SyncIncident = {
  id: string;
  code: string;
  message: string;
  occurredLabel: string;
  attemptCount: number;
  statusNote: string;
  retryMode: string;
  workOrder: string;
  workOrderNote: string | null;
  queuedWith: string;
  deviceLine: string;
  discarded: boolean;
  discardReason: string | null;
  device: {
    id: string;
    technician: string;
    truck: string;
    status: string;
    statusLabel: string;
    deviceId: string;
    phone: string | null;
    email: string | null;
    lastLocation: string | null;
    lastSyncLabel: string;
    lastSyncDetail: string | null;
    queued: number;
    failed: number;
  };
  items: { id: string; itemType: string; detail: string; createdLabel: string; sizeLabel: string }[];
  steps: { id: string; number: number; text: string; done: boolean }[];
  attempts: { id: string; timeLabel: string; message: string; tone: string }[];
  cases: { code: string; title: string; guidance: string }[];
};

export type AccessUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  team: string;
  region: string;
  lastLoginLabel: string;
  lastLoginDetail: string;
  mobileLabel: string;
  mobileDetail: string;
  mobileEnabled: boolean;
  mfa: string;
  adminAccess: boolean;
  inviteStatus: string;
  status: string;
  online: boolean;
  modules: string;
};

export type AccessUserDetail = Omit<AccessUser, "modules"> & { modules: string[] };

export type AccessUserInput = {
  name: string;
  email: string;
  phone: string;
  role: string;
  team: string;
  region: string;
  mobileEnabled: boolean;
  adminAccess: boolean;
  modules: string[];
};

export type AccessUsersPage = {
  items: AccessUser[];
  summary: {
    total: number;
    active: number;
    online: number;
    invited: number;
    suspended: number;
    admins: number;
    invitedName: string;
    suspendedName: string;
    adminName: string;
  };
  teams: string[];
  roles: string[];
  page: number;
  pageSize: number;
  total: number;
};

export type AccessTeam = {
  id: string;
  code: string;
  name: string;
  lead: string;
  members: number;
  region: string;
  modules: string;
  dashboards: string;
  owner: string;
  access: string;
  status: string;
  kind: string;
  profile: string;
};

export type AccessTeamInput = {
  name: string;
  lead: string;
  region: string;
  modules: string;
  dashboards: string;
  owner: string;
  access: string;
  kind: string;
};

export type AccessTeamsPage = {
  items: AccessTeam[];
  summary: {
    teams: number;
    members: number;
    regions: number;
    regionNames: string;
    custom: number;
    customNames: string;
    unassigned: number;
    field: number;
    hq: number;
  };
  owners: string[];
  regions: string[];
};

export type AccessRole = {
  id: string;
  code: string;
  name: string;
  description: string;
  modules: string;
  dashboards: string;
  hidden: string;
  accessLabel: string;
  kind: string;
  users: number;
};

export type AccessRoleInput = {
  name: string;
  description: string;
  modules: string;
  dashboards: string;
  hidden: string;
  accessLabel: string;
};

export type AccessAuditEvent = {
  id: string;
  timeLabel: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  method: string;
  type: string;
  result: string;
  severity: string;
  drawer: {
    eventCode: string;
    kind: string;
    actorRole: string;
    targetMeta: string;
    before: string;
    after: string;
    location: string;
    session: string;
    timestampFull: string;
    ip: string;
  };
};

export type TeamMember = { name: string; role: string; note: string; status: string };
export type TeamProfile = {
  subtitle: string;
  ownerRole: string;
  accessNote: string;
  members: TeamMember[];
  moduleAccess: string;
  dashboards: string;
  mobile: string;
  custom: { label: string; detail: string }[];
};

export type OnCallRules = {
  maxConsecutiveDays: number;
  minRestDays: number;
  leadHours: number;
  balanceEvenly: boolean;
  autoPublish: boolean;
  requireBackup: boolean;
  sameZoneSwaps: boolean;
  notifyBeforeShift: boolean;
};

export type FormTemplate = { id: string; name: string; category: string; submissions: number };
export type FormLibraryPage = {
  items: FormTemplate[];
  summary: { activeTemplates: number; submissions: number; missingRequired: number; failedImports: number; pendingReview: number };
};
export type FormSubmission = {
  id: string;
  submittedLabel: string;
  formType: string;
  formNumber: string;
  weather: string;
  customer: string;
  submittedBy: string;
  attachments: number;
  review: string;
  source: string;
  linked: string;
};
export type FormSubmissionsPage = { items: FormSubmission[]; rejected: number };
export type FormRule = {
  id: string;
  name: string;
  appliesTo: string;
  forms: string;
  payrollBloc: string;
  billing: string;
  active: string;
  updatedLabel: string;
  window: string;
};
export type ArchivedForm = {
  id: string;
  name: string;
  category: string;
  version: string;
  subs: number;
  lastLabel: string;
  reason: string;
  window: string;
};
export type FormField = { id: string; label: string; kind: string; placeholder: string };
export type FormSection = { id: string; title: string; required: boolean; fields: FormField[] };
export type FormDraft = { title: string; sections: FormSection[] };

export type NotificationPreference = {
  id: string;
  code: string;
  event: string;
  detail: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
};

export type DataIntegration = {
  id: string;
  code: string;
  name: string;
  summary: string;
  badge: string;
  actionLabel: string;
  href: string;
};

export type AccessAuditPage = {
  items: AccessAuditEvent[];
  summary: {
    today: number;
    week: number;
    permChanges: number;
    logins: number;
    failed: number;
    permission: number;
    user: number;
    login: number;
    failedAll: number;
    system: number;
  };
  actors: string[];
  page: number;
  pageSize: number;
  total: number;
};
