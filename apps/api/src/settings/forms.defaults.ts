export const FORM_LIBRARY_STAT = {
  id: 'default',
  submissions: 412,
  missingRequired: 12,
  failedImports: 6,
  pendingReview: 3,
};

export const ON_CALL_RULES = {
  id: 'default',
  maxConsecutiveDays: 5,
  minRestDays: 2,
  leadHours: 24,
  balanceEvenly: false,
  autoPublish: false,
  requireBackup: false,
  sameZoneSwaps: false,
  notifyBeforeShift: false,
};

export const FORM_TEMPLATES = [
  { name: 'JOB SAFETY ANALYSIS', category: 'FIELD SAFETY', submissions: 16, sortOrder: 1 },
  { name: 'PERMIT TO WORK', category: 'FIELD SAFETY', submissions: 16, sortOrder: 2 },
  { name: 'AIR QUALITY TESTING', category: 'FIELD SAFETY', submissions: 16, sortOrder: 3 },
  { name: 'BBS STOP CARD', category: 'FIELD SAFETY', submissions: 16, sortOrder: 4 },
  { name: 'INCIDENT INVESTIGATION', category: 'FIELD SAFETY', submissions: 3, sortOrder: 5 },
  { name: 'NOISE EXPOSURE MONITORING', category: 'FIELD SAFETY', submissions: 11, sortOrder: 6 },
  { name: 'CALIBRATION REPORT', category: 'FLEET & ASSETS', submissions: 52, sortOrder: 7 },
  { name: 'RENTAL EQUIPMENT REPORT', category: 'FLEET & ASSETS', submissions: 11, sortOrder: 8 },
  { name: 'RIG INSPECTION', category: 'OPERATIONS', submissions: 3, sortOrder: 9 },
  { name: 'FIRE EXTINGUISHER INSPECTION', category: 'FLEET & ASSETS', submissions: 11, sortOrder: 10 },
  { name: 'CUSTOMER OWNED EQUIPMENT INSPECTION', category: 'FLEET & ASSETS', submissions: 52, sortOrder: 11 },
  { name: 'SALES TICKET', category: 'OPERATIONS', submissions: 11, sortOrder: 12 },
  { name: 'RIG INSPECTION', category: 'PURCHASING', submissions: 3, sortOrder: 13 },
];

const sub = (
  submittedLabel: string,
  formType: string,
  formNumber: string,
  customer: string,
  submittedBy: string,
  attachments: number,
  review: string,
  linked: string,
  sortOrder: number,
) => ({
  submittedLabel,
  formType,
  formNumber,
  weather: '2 / 4',
  customer,
  submittedBy,
  attachments,
  review,
  source: 'GOCANVAS',
  linked,
  sortOrder,
});

export const FORM_SUBMISSIONS = [
  sub('JUN 12 · 07:12', 'JOB SAFETY ANALYSIS', 'JSA-7710', 'PERMIAN BASIN SPRABERRY 31-4H', 'T. WHITLOCK', 2, 'APPROVED', 'COMPLIANCE', 1),
  sub('JUN 12 · 07:12', 'SALES TICKET', 'ST-88119', 'PERMIAN BASIN RESOURCES', 'J. MARTINEZ', 1, 'NEEDS CORRECTION', 'BILLING', 2),
  sub('JUN 11 · 18:22', 'PERMIT TO WORK', 'PTW-5521', 'DEVON ENERGY MIDLAND PAD 7', 'J. MARTINEZ', 3, 'WO MISMATCH', 'COMPLIANCE', 3),
  sub('JUN 11 · 15:05', 'AIR QUALITY TESTING REPORT', 'AQR-3391', 'PERMIAN BASIN SPRABERRY 31-4H', 'R. SALINAS', 1, 'PENDING REVIEW', 'COMPLIANCE', 4),
  sub('JUN 10 · 16:50', 'CALIBRATION REPORT', 'CAL-1180', 'DIAMONDBACK E&PT', 'R. SALINAS', 2, 'REJECTED', 'ASSETS', 5),
  sub('JUN 10 · 14:22', 'BBS STOP CARD', 'BBS-2204', 'CONOCOPHILLIPS EDDY 9-31', 'M. PATEL', 1, 'APPROVED', 'EMPLOYEES', 6),
  sub('JUN 9 · 08:10', 'CUSTOMER OWNED EQUIPMENT INSPECTION', 'COEI-0088', 'CONOCOPHILLIPS EDDY 9-31', 'R. BRYANT', 3, 'APPROVED', 'ASSETS', 7),
  sub('JUN 6 · 11:20', 'NOISE EXPOSURE MONITORING', 'NEM-0211', 'PIONEER NATURAL RESOURCES', 'L. ORTEGA', 0, 'MISSING LINK', 'COMPLIANCE', 8),
  sub('JUN 5 · 09:40', 'FIT TESTING FORM', 'FT-1044', 'MIDLAND YARD', 'C. HOLLIS', 1, 'REJECTED', 'EMPLOYEES', 9),
];

const rule = (
  name: string,
  appliesTo: string,
  forms: string,
  payrollBloc: string,
  billing: string,
  active: string,
  updatedLabel: string,
  sortOrder: number,
) => ({ name, appliesTo, forms, payrollBloc, billing, active, updatedLabel, window: 'CURRENT', sortOrder });

export const FORM_RULES = [
  rule('CONFINED SPACE ENTRY', 'JOB TYPE · CONFINED SPACE', 'JSA, PTW, AIR QUALITY, ASSET INSPECT', 'YES', 'YES', 'ACTIVE', 'JUN 1', 1),
  rule('H2S STANDBY', 'JOB TYPE · H2S STANDBY', 'JSA, AIR QUALITY, BBS', 'YES', 'NO', 'ACTIVE', 'MAY 28', 2),
  rule('CHEVRON GPS PACKET', 'CUSTOMER · CHEVRON', 'SALES TICKET, JSA, PTW, AQR', 'NO', 'YES', 'ACTIVE', 'MAY 20', 3),
  rule('RIG MOVE', 'JOB TYPE · RIG INSPECTION', 'RIG INSPECTION, FIRE EXTINGUISHER', 'NO', 'NO', 'ACTIVE', 'MAY 15', 4),
  rule('EQUIPMENT RENTAL', 'SERVICE · RENTAL', 'RENTAL EQUIPMENT REPORT', 'NO', 'YES', 'ACTIVE', 'MAY 10', 5),
  rule('ANY INCIDENT', 'TRIGGER · INCIDENT REPORTED', 'INCIDENT INVESTIGATION', 'NO', 'NO', 'ACTIVE', 'APR 30', 6),
  rule('VENDOR PURCHASE > $1,000', 'PURCHASE OVER THRESHOLD', 'VENDOR PO + APPROVAL', 'NO', 'NO', 'ACTIVE', 'APR 22', 7),
  rule('CUSTOMER-OWNED EQUIPMENT', 'EQUIPMENT · CUSTOMER-OWNED', 'CUSTOMER OWNED EQUIP INSPECTION', 'NO', 'NO', 'DRAFT', 'APR 15', 8),
];

const archived = (
  name: string,
  category: string,
  version: string,
  subs: number,
  lastLabel: string,
  reason: string,
  window: string,
  sortOrder: number,
) => ({ name, category, version, subs, lastLabel, reason, window, restored: false, sortOrder });

export const ARCHIVED_CANVASES = [
  archived('WORK ORDER (LEGACY)', 'OPERATIONS', 'GC V7', 186, 'JUN 12', 'SUPERSEDED BY NATIVE WO RECORD', 'ACTIVE', 1),
  archived('WEEKLY TIMESHEET & REPORT', 'PAYROLL', 'GC V4', 312, 'JUN 12', 'REPLACED BY TIME MODULE', 'CURRENT', 2),
  archived('TIME OFF REQUEST', 'PAYROLL', 'GC V2', 88, 'JUN 11', 'REPLACED BY TIME OFF SCREEN', 'CURRENT', 3),
  archived('REPAIR / REPLACE REQUEST', 'FLEET', 'GC V3', 41, 'JUN 11', 'MERGED INTO FLEET REQUESTS', 'ACTIVE', 4),
  archived('TRUCK INSPECTION', 'FLEET', 'GC V5', 220, 'JUN 10', 'REPLACED BY INSPECTIONS MODULE', 'FUTURE', 5),
  archived('TRUCK INVENTORY', 'FLEET', 'GC V2', 96, 'JUN 12', 'IMPORT MAPPING DEPRECATED', 'ACTIVE', 6),
  archived('TRAINING ROSTER', 'TRAINING', 'GC V3', 64, 'JUN 5', 'MOVED TO TRAINING / SSE', 'FUTURE', 7),
  archived('FIT TESTING FORM', 'TRAINING', 'GC V2', 120, 'JUN 8', 'MOVED TO TRAINING / SSE', 'CURRENT', 8),
  archived('SSE / TRAINING PACKET', 'TRAINING', 'GC V1', 47, 'JUN 7', 'MOVED TO TRAINING / SSE', 'FUTURE', 9),
];

export const NOTIFICATION_PREFERENCES = [
  { code: 'NP-01', event: 'BILLING DISCREPANCY DETECTED', detail: '', inApp: false, email: false, sms: false, sortOrder: 1 },
  { code: 'NP-02', event: 'TIME EDIT REQUEST SUBMITTED', detail: '', inApp: false, email: false, sms: false, sortOrder: 2 },
  { code: 'NP-03', event: 'TIMESHEET PENDING APPROVAL', detail: 'AWAITING SUPERVISOR SIGN-OFF', inApp: true, email: true, sms: false, sortOrder: 3 },
  { code: 'NP-04', event: 'MOBILE SYNC FAILED', detail: '', inApp: false, email: false, sms: false, sortOrder: 4 },
  { code: 'NP-05', event: 'CALIBRATION / CERT EXPIRING', detail: '', inApp: false, email: false, sms: false, sortOrder: 5 },
  { code: 'NP-06', event: 'PAY CYCLE READY TO CLOSE', detail: '', inApp: false, email: false, sms: false, sortOrder: 6 },
  { code: 'NP-07', event: 'PERMIT EXPIRING WITHIN 2 HOURS', detail: 'TECHNICIAN + SUPERVISOR · IMMEDIATE', inApp: true, email: true, sms: false, sortOrder: 7 },
];

export const DATA_INTEGRATIONS = [
  { code: 'INT-01', name: 'MOBILE DEVICE SYNC', summary: 'LIVE · THE ONLY INBOUND PIPELINE: TIME ENTRIES, FORMS, PHOTOS, SIGNATURES, GPS, CLOSEOUTS FROM FIELD DEVICES', badge: 'LIVE', actionLabel: 'OPEN', href: '/settings/mobile-sync', sortOrder: 1 },
  { code: 'INT-02', name: 'NETSUITE', summary: 'EXPORT ONLY · INVOICES AND SALES TICKETS OUT TO ACCOUNTING', badge: 'EXPORT ONLY', actionLabel: 'CONFIGURE', href: '/operations/netsuite', sortOrder: 2 },
  { code: 'INT-03', name: 'ADP WORKFORCE NOW', summary: 'EXPORT ONLY · APPROVED HOURS OUT TO PAYROLL', badge: 'EXPORT ONLY', actionLabel: 'EXPORT SETTINGS', href: '/settings/payroll-rules', sortOrder: 3 },
];

export const FORM_DRAFT = {
  id: 'current',
  title: 'FORM',
  sectionsJson: JSON.stringify([
    {
      id: 'sec-1',
      title: 'WORK ORDER',
      required: true,
      fields: [
        { id: 'fld-1', label: 'WORK ORDER NUMBER', kind: 'TEXT', placeholder: '' },
        { id: 'fld-2', label: 'EMPLOYEE NAME', kind: 'DROPDOWN', placeholder: 'ENTER EMPLOYEE NAME' },
      ],
    },
    {
      id: 'sec-2',
      title: 'NAME',
      required: true,
      fields: [
        { id: 'fld-3', label: 'RATE YOUR EXPERIENCE', kind: 'CHOICE', placeholder: '' },
        { id: 'fld-4', label: 'SELECT FIELD', kind: 'DROPDOWN', placeholder: 'SELECT FIELD' },
      ],
    },
  ]),
};
