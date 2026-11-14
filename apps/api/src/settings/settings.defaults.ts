export const COMPANY_PROFILE = {
  id: 'default',
  companyName: 'DARK HORSE DISPLAY',
  establishmentName: 'DARK HORSE DISPLAY - MIDLAND YARD',
  streetAddress: '2901 W INDUSTRIAL AVE',
  cityStateZip: 'MIDLAND - TX - 79701',
  phone: '(432) 555-0100',
  ein: '****-4721',
  naicsCode: '213112 - SUPPORT ACTIVITIES FOR OIL AND GAS OPERATIONS',
  sicCode: '1389 - OIL AND GAS FIELD SERVICES, NEC',
  annualAverageEmployees: '15 - CALCULATED FROM HR',
  totalHoursWorked: 'FROM PAYROLL REVIEW',
  companyExecutive: 'R. CRAWFORD - CEO',
  recordkeepingContact: 'D. REED - SAFETY',
};

export const BUSINESS_RULES = [
  { code: 'BR-CUSTOMER-REQ', area: 'Customer Requirements', source: 'CRM / CUSTOMER', appliesTo: 'Customer + job', enforcement: 'Hard gate / warning', owner: 'CRM admin', status: 'ACTIVE', statusLabel: 'ACTIVE', domain: 'CRM / CUSTOMER', hardGate: true, customerOverride: true, pendingReview: false, sortOrder: 1 },
  { code: 'BR-MSA', area: 'MSA Rules', source: 'Contract / customer', appliesTo: 'Customer + term', enforcement: 'Dispatch / invoice', owner: 'CRM admin', status: 'ACTIVE', statusLabel: 'ACTIVE', domain: 'CONTRACT', hardGate: true, customerOverride: true, pendingReview: false, sortOrder: 2 },
  { code: 'BR-GEOFENCE', area: 'Geofence Rules', source: 'Routes / GPS', appliesTo: 'Location + job', enforcement: 'Clock-in / review', owner: 'Operations', status: 'ACTIVE', statusLabel: 'ACTIVE', domain: 'ROUTES / GPS', hardGate: true, customerOverride: false, pendingReview: false, sortOrder: 3 },
  { code: 'BR-PRICING', area: 'Pricing Rules', source: 'CRM / CUSTOMER', appliesTo: 'Customer + service', enforcement: 'Quote / sales ticket', owner: 'Billing', status: 'ACTIVE', statusLabel: 'ACTIVE', domain: 'CRM / CUSTOMER', hardGate: false, customerOverride: true, pendingReview: false, sortOrder: 4 },
  { code: 'BR-FORMS', area: 'Required Form Rules', source: 'CRM / CUSTOMER', appliesTo: 'Customer + job', enforcement: 'Clock-in / closeout', owner: 'Safety', status: 'ACTIVE', statusLabel: 'ACTIVE', domain: 'CRM / CUSTOMER', hardGate: true, customerOverride: true, pendingReview: false, sortOrder: 5 },
  { code: 'BR-BLOCKING', area: 'Blocking Workflows', source: 'Cross-module', appliesTo: 'Work order / payroll', enforcement: 'Stop action + reason', owner: 'Admin', status: 'REVIEW', statusLabel: '2 REVIEW', domain: 'CROSS-MODULE', hardGate: true, customerOverride: false, pendingReview: true, sortOrder: 6 },
];

const daysAgo = (days: number, hours: number) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);

export const RULE_OVERRIDES = [
  { code: 'OV-0142-GEO', occurredAt: daysAgo(1, 2), whenLabel: 'Jun 12 · 09:42', ruleDomain: 'Geofence / clock-in', record: 'WO-2026-0142', change: '100 mi → 124 mi radius', approvedBy: 'R. Crawford', status: 'APPROVED', statusLabel: 'APPROVED', domain: 'GEOFENCE', reason: 'Site gate moved; supervisor verified technician was on location.', requestedBy: 'J. MARTINEZ', effectiveLabel: 'JUN 12, 09:42', note: 'Original rule remains unchanged. This exception applies only to WO-2026-0142 and is retained in the job audit trail.' },
  { code: 'OV-0142-PTW', occurredAt: daysAgo(1, 4), whenLabel: 'Jun 12 · 08:16', ruleDomain: 'Required Form / PTW', record: 'WO-2026-0142', change: 'Start gate → exception', approvedBy: 'R. Crawford', status: 'APPROVED', statusLabel: 'APPROVED', domain: 'FORMS', reason: 'Permit was issued on paper at the lease entrance before the app copy was uploaded.', requestedBy: 'A. LOVELACE', effectiveLabel: 'JUN 12, 08:16', note: 'Original rule remains unchanged. This exception applies only to WO-2026-0142 and is retained in the job audit trail.' },
  { code: 'OV-0088-RATE', occurredAt: daysAgo(3, 1), whenLabel: 'Jun 11 · 16:05', ruleDomain: 'Pricing / travel', record: 'ST-2026-0088', change: '$0 → $160 / hr', approvedBy: 'M. Ellis', status: 'EXPIRES', statusLabel: 'EXPIRES JUN 15', domain: 'PRICING', reason: 'Customer approved a one-week travel rate while the MSA amendment is in review.', requestedBy: 'M. TORRES', effectiveLabel: 'JUN 11, 16:05', note: 'Original rule remains unchanged. This exception expires Jun 15 and is retained in the sales-ticket audit trail.' },
  { code: 'OV-0138-MSA', occurredAt: daysAgo(6, 2), whenLabel: 'Jun 10 · 13:20', ruleDomain: 'MSA / PO required', record: 'WO-2026-0138', change: 'Invoice hold → review', approvedBy: 'R. Crawford', status: 'APPROVED', statusLabel: 'APPROVED', domain: 'MSA', reason: 'PO number was confirmed by the customer AP desk after dispatch.', requestedBy: 'L. NGUYEN', effectiveLabel: 'JUN 10, 13:20', note: 'Original rule remains unchanged. This exception applies only to WO-2026-0138 and is retained in the job audit trail.' },
  { code: 'OV-0135-CERT', occurredAt: daysAgo(10, 3), whenLabel: 'Jun 09 · 11:14', ruleDomain: 'Customer requirement', record: 'WO-2026-0135', change: 'Missing cert → denied', approvedBy: '—', status: 'DENIED', statusLabel: 'DENIED', domain: 'CRM / CUSTOMER', reason: 'H2S card on file was expired. Dispatch stayed blocked.', requestedBy: 'D. FORD', effectiveLabel: 'JUN 09, 11:14', note: 'Original rule remains unchanged. The denied exception is retained in the job audit trail.' },
];

export const RETENTION_NOTE =
  'Validate periods with Legal before publishing. Exposure records have a 30-year floor (OSHA 29 CFR 1910.1020) and cannot be shortened or purged.';

export const RETENTION_CLASSES = [
  { code: 'RET-JOBS', recordClass: 'Job packets + forms', proposedPeriod: '7 years', afterExpiry: 'Archive → purge', legalHold: 'On / off', owner: 'Safety', locked: false, periodTone: 'default', sortOrder: 1 },
  { code: 'RET-TIME', recordClass: 'Time entries + payroll', proposedPeriod: '7 years', afterExpiry: 'Archive → purge', legalHold: 'On / off', owner: 'Payroll', locked: false, periodTone: 'default', sortOrder: 2 },
  { code: 'RET-SALES', recordClass: 'Sales tickets + invoices', proposedPeriod: '7 years', afterExpiry: 'Archive → purge', legalHold: 'On / off', owner: 'Billing', locked: false, periodTone: 'default', sortOrder: 3 },
  { code: 'RET-GPS', recordClass: 'GPS / geofence events', proposedPeriod: '2 years', afterExpiry: 'Purge', legalHold: 'On / off', owner: 'Operations', locked: false, periodTone: 'default', sortOrder: 4 },
  { code: 'RET-NOTES', recordClass: 'Notifications + requests', proposedPeriod: '3 years', afterExpiry: 'Purge', legalHold: 'On / off', owner: 'Admin', locked: false, periodTone: 'default', sortOrder: 5 },
  { code: 'RET-AUDIT', recordClass: 'Rule overrides + audit log', proposedPeriod: '7 years', afterExpiry: 'Archive → purge', legalHold: 'On / off', owner: 'Admin', locked: false, periodTone: 'default', sortOrder: 6 },
  { code: 'RET-EXPOSURE', recordClass: 'Exposure records - air + noise', proposedPeriod: '30 years · floor', afterExpiry: 'Archive only · never purged', legalHold: 'Always on', owner: 'Safety', locked: true, periodTone: 'floor', sortOrder: 7 },
];

export const GLOBAL_DEFAULTS = {
  id: 'default',
  closeoutEscalation: '48 hours after work stops',
  closeoutOwner: 'Operations admin',
  workStoppedEscalation: '2 hours without response',
  workStoppedOwner: 'Admin',
  recurringGeneration: '14 days before occurrence',
  recurringOwner: 'Operations',
  payCycle: 'Bi-weekly · Jun 2–15',
  payCycleOwner: 'Payroll',
  poApproval: 'Approval limit configured per role',
  poOwner: 'Operations + finance',
  missingPoBlock: 'On when customer requires PO',
  missingPoOwner: 'Billing',
  requiredForms: 'From customer + job rule',
  requiredFormsOwner: 'Safety',
  geofenceFallback: 'Use location / well rule',
  geofenceOwner: 'Operations',
  msaEnforcement: 'Use signed customer terms',
  msaOwner: 'CRM admin',
};

export const RECIPIENTS = [
  { code: 'NR-CLOSEOUT', event: 'Closeout not submitted', primary: 'Assigned dispatcher', ccEscalate: 'Operations admin', channel: 'In-app + email', trigger: '48 h after stop', sortOrder: 1 },
  { code: 'NR-STOPPED', event: 'High · work stopped form', primary: 'Safety queue', ccEscalate: 'Admin after 2 h', channel: 'In-app + email', trigger: 'Immediate', sortOrder: 2 },
  { code: 'NR-OVERRIDE', event: 'Business rule override', primary: 'Rule owner', ccEscalate: 'Admin approver', channel: 'In-app + email', trigger: 'On request / decision', sortOrder: 3 },
  { code: 'NR-GEOFENCE', event: 'Geofence exception', primary: 'Dispatch', ccEscalate: 'Operations supervisor', channel: 'In-app', trigger: 'On failed clock-in', sortOrder: 4 },
  { code: 'NR-PO', event: 'PO requested from customer', primary: 'Customer contact', ccEscalate: 'Assigned rep', channel: 'Email', trigger: 'On send / chase', sortOrder: 5 },
  { code: 'NR-BILLING', event: 'Billing exception', primary: 'Billing queue', ccEscalate: 'Operations owner', channel: 'In-app + email', trigger: 'On reconciliation', sortOrder: 6 },
  { code: 'NR-NETSUITE', event: 'NetSuite export failure', primary: 'Billing queue', ccEscalate: 'Integration admin', channel: 'In-app + email', trigger: 'On failed sync', sortOrder: 7 },
];

export const TIME_CATEGORIES = [
  { code: 'TC-REG', name: 'REGULAR', entryCount: 412, paid: true, billable: true, countsToOt: true, payrollCode: 'ADP: REG', sortOrder: 1 },
  { code: 'TC-OT', name: 'OVERTIME', entryCount: 96, paid: true, billable: true, countsToOt: false, payrollCode: 'ADP: OT', sortOrder: 2 },
  { code: 'TC-OJT', name: 'ON-JOB TRAINING', entryCount: 38, paid: true, billable: false, countsToOt: true, payrollCode: 'ADP: OJT', sortOrder: 3 },
  { code: 'TC-VAC', name: 'VACATION / PTO', entryCount: 22, paid: true, billable: false, countsToOt: false, payrollCode: 'ADP: VAC', sortOrder: 4 },
  { code: 'TC-SICK', name: 'SICK', entryCount: 9, paid: true, billable: false, countsToOt: false, payrollCode: 'ADP: SICK', sortOrder: 5 },
  { code: 'TC-HOL', name: 'HOLIDAY', entryCount: 11, paid: true, billable: false, countsToOt: false, payrollCode: 'ADP: HOL', sortOrder: 6 },
  { code: 'TC-UNP', name: 'UNPAID', entryCount: 4, paid: false, billable: false, countsToOt: false, payrollCode: 'ADP: UNP', sortOrder: 7 },
  { code: 'TC-NB', name: 'NON-BILLABLE', entryCount: 57, paid: true, billable: false, countsToOt: true, payrollCode: 'ADP: NB', sortOrder: 8 },
];

export const PAYROLL_RULES = {
  id: 'default',
  payCycleLength: 'BIWEEKLY',
  currentCycleStart: 'JUN 1, 2026',
  overtimeThreshold: 'AFTER 8H / DAY',
  longShiftFlag: 'OVER 12H / SHIFT',
  seventhDayRule: true,
  autoApproveClean: false,
  roundClockEntries: '15 MIN',
  requireAdminNote: false,
  gracePeriod: '2H',
  minimumShift: '4H',
  exportTo: 'ADP WORKFORCE NOW',
  lastExportLabel: 'CYCLE 01 · MAY 18 – MAY 31 · 142 RECORDS',
  lastExportDate: 'JUN 1, 2026',
  nextCloseLabel: 'CYCLE 02 LOCKS JUN 15, 11:59 PM CT',
  nextCloseDate: 'JUN 14, 2026',
};

export const FIELD_DEVICES = [
  { code: 'DEV-0712', technician: 'D. REED', truck: 'TRUCK 07', status: 'OFFLINE', statusLabel: 'OFFLINE', failed: 1, queued: 4, lastSyncLabel: 'OFFLINE SINCE 06:40', lastSyncDetail: '6H 20M DARK', appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-0712', attention: true, sortOrder: 1 },
  { code: 'DEV-0203', technician: 'J. MARTINEZ', truck: 'TRUCK 02', status: 'ITEM_FAILED', statusLabel: 'ITEM FAILED', failed: 1, queued: 0, lastSyncLabel: '2M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-0203', attention: true, sortOrder: 2 },
  { code: 'DEV-0510', technician: 'K. OSEI', truck: 'TRUCK 05', status: 'SYNCING', statusLabel: 'SYNCING', failed: 0, queued: 0, lastSyncLabel: 'SYNCING NOW', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-0510', attention: false, sortOrder: 3 },
  { code: 'DEV-1514', technician: 'A. COOK', truck: 'TRUCK 12', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: 'JUST NOW', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1514', attention: false, sortOrder: 4 },
  { code: 'DEV-1209', technician: 'S. NGUYEN', truck: 'TRUCK 12', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '4M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1209', attention: false, sortOrder: 5 },
  { code: 'DEV-0808', technician: 'C. HOLLIS', truck: 'TRUCK 08', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '1M AGO', lastSyncDetail: null, appVersion: 'V3.7.0', versionNote: 'LATEST IS V3.8.2 — ASK TECHNICIAN TO UPDATE FROM THE APP STORE', deviceId: 'DH-IPD-0807', attention: false, sortOrder: 6 },
  { code: 'DEV-0911', technician: 'P. GRANT', truck: 'TRUCK 09', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '12M AGO', lastSyncDetail: null, appVersion: 'V3.7.0', versionNote: 'UPDATE AVAILABLE', deviceId: 'DH-IPD-0911', attention: false, sortOrder: 7 },
  { code: 'DEV-1118', technician: 'T. WHITLOCK', truck: 'TRUCK 11', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '6M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1118', attention: false, sortOrder: 8 },
  { code: 'DEV-1042', technician: 'A. LOVELACE', truck: 'TRUCK 42', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '8M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1042', attention: false, sortOrder: 9 },
  { code: 'DEV-1004', technician: 'R. HALL', truck: 'TRUCK 07', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '15M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1004', attention: false, sortOrder: 10 },
  { code: 'DEV-1006', technician: 'L. GARCIA', truck: 'TRUCK 03', status: 'UP_TO_DATE', statusLabel: 'UP TO DATE', failed: 0, queued: 0, lastSyncLabel: '20M AGO', lastSyncDetail: null, appVersion: 'V3.8.2', versionNote: null, deviceId: 'DH-IPD-1006', attention: false, sortOrder: 11 },
];

export const REED_QUEUE = [
  { itemType: 'TIME ENTRY', detail: 'CLOCK-IN · WO-2026-0144', createdLabel: '06/12', sizeLabel: '2 KB', status: 'QUEUED', errorLabel: null, sortOrder: 1 },
  { itemType: 'FORM', detail: 'JSA · WO-2026-0144', createdLabel: '06/25', sizeLabel: '48 KB', status: 'QUEUED', errorLabel: null, sortOrder: 2 },
  { itemType: 'PHOTO', detail: 'SITE SETUP · WO-2026-0144', createdLabel: '06/31', sizeLabel: '6.8 MB', status: 'FAILED', errorLabel: 'MS-413 · PAYLOAD', errorCode: 'MS-413', sortOrder: 3 },
  { itemType: 'SIGNATURE', detail: 'CUSTOMER SIGN-OFF · WO-2026-0144', createdLabel: '06/30', sizeLabel: '22 KB', status: 'QUEUED', errorLabel: null, sortOrder: 4 },
  { itemType: 'GPS EVENT', detail: 'ARRIVED ON SITE · WOLFCAMP 12-4H', createdLabel: '06/30', sizeLabel: '1 KB', status: 'QUEUED', errorLabel: null, sortOrder: 5 },
];
