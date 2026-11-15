const user = (
  code: string,
  name: string,
  email: string,
  phone: string,
  role: string,
  team: string,
  region: string,
  lastLoginLabel: string,
  lastLoginDetail: string,
  loginAge: number,
  mobileLabel: string,
  mobileDetail: string,
  mobileEnabled: boolean,
  mfa: string,
  adminAccess: boolean,
  inviteStatus: string,
  status: string,
  online: boolean,
  modules: string,
  sortOrder: number,
) => ({
  code, name, email, phone, role, team, region, lastLoginLabel, lastLoginDetail, loginAge,
  mobileLabel, mobileDetail, mobileEnabled, mfa, adminAccess, inviteStatus, status, online, modules, sortOrder,
});

export const ACCESS_USERS = [
  user('AU-01', 'R. CRAWFORD', 'rcrawford@dhs.com', '(432) 555-0100', 'ADMIN', 'HR TEAM', 'MIDLAND', 'NOW', 'THIS SESSION', 0, 'ENABLED', 'WEB', true, 'ON', true, 'ACCEPTED', 'ACTIVE', true, 'HR,SETTINGS', 1),
  user('AU-02', 'J. MARTINEZ', 'jmartinez@dhs.com', '(432) 555-0118', 'TECHNICIAN', 'CREW A', 'MIDLAND', '2H AGO', 'MOBILE', 120, 'ENABLED', 'ON SITE', true, 'ON', false, 'ACCEPTED', 'ACTIVE', true, 'OPS,SAFETY', 2),
  user('AU-03', 'T. WHITLOCK', 'twhitlock@dhs.com', '(325) 555-0147', 'TECHNICIAN', 'CREW B', 'ODESSA', '3H AGO', 'MOBILE', 180, 'ENABLED', 'TRUCK 11', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', true, 'OPS,SAFETY', 3),
  user('AU-04', 'A. COOK', 'acook@dhs.com', '(575) 555-0163', 'TECHNICIAN', 'CREW B', 'ODESSA', '10M AGO', 'MOBILE', 10, 'ENABLED', 'TRUCK 15', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', true, 'OPS,SAFETY', 4),
  user('AU-05', 'M. ELLIS', 'mellis@dhs.com', '(806) 555-0129', 'BILLING', 'BILLING', 'HQ', '5M AGO', 'MOBILE', 5, 'DISABLED', 'WEB ONLY', false, 'ON', false, 'ACCEPTED', 'ACTIVE', true, 'CRM,REPORTS', 5),
  user('AU-06', 'S. NGUYEN', 'snguyen@dhs.com', '(432) 555-0191', 'SUPERVISOR', 'CREW C', 'PECOS', '2H AGO', 'MOBILE', 120, 'ENABLED', 'TRUCK 12', true, 'ON', false, 'ACCEPTED', 'ACTIVE', true, 'OPS,HR,FLEET,SAFETY', 6),
  user('AU-07', 'JESSE TRAN', 'jtran@dhs.com', '(214) 555-0136', 'DISPATCHER', 'DISPATCH', 'HQ', '—', 'INVITE SENT JUN 12', 9000, '—', 'NOT SET UP', false, 'PENDING', false, 'PENDING', 'INVITED', false, 'OPS,CRM', 7),
  user('AU-08', 'K. MILLS', 'kmills@dhs.com', '(432) 555-0175', 'TECHNICIAN', 'CREW B', 'ODESSA', 'JUN 10', 'SUSPENDED JUN 11', 8000, 'DISABLED', 'SIGNED OUT', false, 'OFF', false, 'ACCEPTED', 'SUSPENDED', false, 'OPS,SAFETY', 8),
  user('AU-09', 'D. REED', 'dreed@dhs.com', '(432) 555-0147', 'TECHNICIAN', 'SAFETY', 'HQ', '1H AGO', 'MOBILE', 60, 'ENABLED', 'WEB', true, 'ON', false, 'ACCEPTED', 'ACTIVE', false, 'SAFETY', 9),
  user('AU-10', 'K. OSEI', 'kosei@dhs.com', '(432) 555-0510', 'TECHNICIAN', 'CREW A', 'MIDLAND', '4H AGO', 'MOBILE', 240, 'ENABLED', 'TRUCK 05', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', false, 'OPS,SAFETY', 10),
  user('AU-11', 'C. HOLLIS', 'chollis@dhs.com', '(432) 555-0807', 'TECHNICIAN', 'FLEET SHOP', 'MIDLAND', '1D AGO', 'MOBILE', 1440, 'ENABLED', 'TRUCK 08', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', false, 'FLEET,OPS,SAFETY', 11),
  user('AU-12', 'P. GRANT', 'pgrant@dhs.com', '(432) 555-0911', 'TECHNICIAN', 'CREW B', 'ODESSA', '6H AGO', 'MOBILE', 360, 'ENABLED', 'TRUCK 09', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', false, 'OPS,SAFETY', 12),
  user('AU-13', 'A. LOVELACE', 'alovelace@dhs.com', '(432) 555-1042', 'TECHNICIAN', 'CREW A', 'MIDLAND', '30M AGO', 'MOBILE', 30, 'ENABLED', 'TRUCK 42', true, 'ON', false, 'ACCEPTED', 'ACTIVE', false, 'OPS,SAFETY', 13),
  user('AU-14', 'L. NGUYEN', 'lnguyen@dhs.com', '(432) 555-1091', 'SUPERVISOR', 'HR TEAM', 'MIDLAND', '8H AGO', 'WEB', 480, 'ENABLED', 'WEB', true, 'ON', false, 'ACCEPTED', 'ACTIVE', false, 'HR,SETTINGS', 14),
  user('AU-15', 'R. HALL', 'rhall@dhs.com', '(432) 555-1004', 'TECHNICIAN', 'CREW C', 'PECOS', '45M AGO', 'MOBILE', 45, 'ENABLED', 'TRUCK 07', true, 'OFF', false, 'ACCEPTED', 'ACTIVE', false, 'OPS,SAFETY', 15),
];

export const ACCESS_TEAMS = [
  { code: 'TM-01', name: 'CREW A', lead: 'J. MARTINEZ', members: 3, region: 'MIDLAND', modules: 'OPS, SAFETY', dashboards: 'OPERATIONS', owner: 'S. NGUYEN', access: 'STANDARD', status: 'ACTIVE', kind: 'FIELD', sortOrder: 1 },
  { code: 'TM-02', name: 'CREW B', lead: 'A. COOK', members: 4, region: 'ODESSA', modules: 'OPS, SAFETY', dashboards: 'OPERATIONS', owner: 'S. NGUYEN', access: 'STANDARD', status: 'ACTIVE', kind: 'FIELD', sortOrder: 2 },
  { code: 'TM-03', name: 'CREW C', lead: 'S. NGUYEN', members: 3, region: 'PECOS', modules: 'OPS, SAFETY', dashboards: 'OPERATIONS', owner: 'S. NGUYEN', access: 'STANDARD', status: 'ACTIVE', kind: 'FIELD', sortOrder: 3 },
  { code: 'TM-04', name: 'DISPATCH', lead: 'JESSE TRAN', members: 1, region: 'HQ', modules: 'OPS, CRM', dashboards: 'OPERATIONS', owner: 'R. CRAWFORD', access: 'STANDARD', status: 'ACTIVE', kind: 'HQ', sortOrder: 4 },
  { code: 'TM-05', name: 'HR TEAM', lead: 'R. CRAWFORD', members: 1, region: 'HQ', modules: 'HR, SETTINGS', dashboards: 'HR', owner: 'R. CRAWFORD', access: 'CUSTOM', status: 'ACTIVE', kind: 'HQ', sortOrder: 5 },
  { code: 'TM-06', name: 'BILLING', lead: 'M. ELLIS', members: 1, region: 'HQ', modules: 'CRM, REPORTS', dashboards: 'EXECUTIVE', owner: 'M. ELLIS', access: 'STANDARD', status: 'ACTIVE', kind: 'HQ', sortOrder: 6 },
  { code: 'TM-07', name: 'FLEET SHOP', lead: 'C. HOLLIS', members: 1, region: 'MIDLAND', modules: 'FLEET, OPS, SAFETY', dashboards: 'FLEET', owner: 'S. NGUYEN', access: 'CUSTOM', status: 'ACTIVE', kind: 'FIELD', sortOrder: 7 },
  { code: 'TM-08', name: 'SAFETY', lead: 'D. REED', members: 1, region: 'HQ', modules: 'SAFETY', dashboards: 'SAFETY', owner: 'D. REED', access: 'STANDARD', status: 'ACTIVE', kind: 'HQ', sortOrder: 8 },
];

const member = (name: string, role: string, note: string) => ({ name, role, note, status: 'ACTIVE' });

export const TEAM_PROFILES: Record<string, string> = {
  'TM-01': JSON.stringify({
    subtitle: 'FIELD CREW · MIDLAND · STANDARD ACCESS',
    ownerRole: 'SUPERVISOR',
    accessNote: 'STANDARD · TECHNICIAN DEFAULTS',
    members: [
      member('J. MARTINEZ', 'TECHNICIAN', 'LEAD · TRUCK 02'),
      member('R. SALINAS', 'TECHNICIAN', 'RESTRICTED DUTY AFTER INC-4403'),
      member('L. ORTEGA', 'TECHNICIAN', ''),
    ],
    moduleAccess: 'OPERATIONS (OWN WORK ORDERS) · SAFETY & COMPLIANCE',
    dashboards: 'OPERATIONS',
    mobile: 'ENABLED FOR ALL MEMBERS',
    custom: [],
  }),
  'TM-07': JSON.stringify({
    subtitle: 'SHOP · MIDLAND YARD · CUSTOM ACCESS',
    ownerRole: 'SUPERVISOR',
    accessNote: 'CUSTOM',
    members: [member('C. HOLLIS', 'TECHNICIAN', 'FLEET AND CALIBRATION')],
    moduleAccess: 'FLEET & ASSETS · OPERATIONS · SAFETY & COMPLIANCE',
    dashboards: 'FLEET',
    mobile: '',
    custom: [
      { label: 'FLEET & ASSETS', detail: 'EDIT EQUIPMENT, INSPECTIONS AND CALIBRATION RECORDS' },
      { label: 'INSPECTIONS', detail: 'APPROVE FLEET INSPECTIONS AND RAISE CORRECTIVE ACTIONS' },
      { label: 'CORRECTIVE ACTIONS', detail: "MARK INSPECTION-SOURCED CAS COMPLETE · CAN'T VERIFY OWN" },
      { label: 'HIDDEN', detail: 'HR, CRM, BILLING, SETTINGS' },
    ],
  }),
};

export const ROLE_CHANGED_DRAWER = JSON.stringify({
  eventCode: 'AUD-20419',
  kind: 'PERMISSION CHANGE',
  actorRole: 'ADMIN',
  targetMeta: 'CREW C',
  before: 'TECHNICIAN · OPS, SAFETY · APPROVE JSA / PTW OFF',
  after: 'SUPERVISOR · OPS, HR, SAFETY · APPROVE JSA / PTW ON',
  location: 'DARK HORSE YARD, MIDLAND TX',
  session: 'WEB · CHROME ON MACOS · MFA VERIFIED',
  timestampFull: 'JUN 12, 2026 · 2:14:08 PM CDT (UTC-5)',
});

export const ACCESS_ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'DISPATCHER', 'BILLING'];
export const ACCESS_MODULES = ['OPS', 'HR', 'FLEET', 'SAFETY'];
export const ACCESS_REGIONS = ['MIDLAND', 'ODESSA', 'PECOS', 'HQ'];

export const ACCESS_ROLE_DEFS = [
  { code: 'ADMIN', name: 'ADMIN', description: 'FULL SYSTEM ACCESS, USER AND PERMISSION MANAGEMENT', modules: 'ALL MODULES', dashboards: 'ALL', hidden: 'NONE', accessLabel: 'FULL', kind: 'SYSTEM', sortOrder: 1 },
  { code: 'SUPERVISOR', name: 'SUPERVISOR', description: 'CREW AND JOB MANAGEMENT, APPROVALS', modules: 'OPS, HR, SAFETY', dashboards: 'OPERATIONS', hidden: 'SETTINGS, BILLING EXPORT, PERMISSIONS', accessLabel: 'SCOPED', kind: 'SYSTEM', sortOrder: 2 },
  { code: 'DISPATCHER', name: 'DISPATCHER', description: 'SCHEDULING AND DISPATCH', modules: 'OPS, CRM', dashboards: 'OPERATIONS', hidden: 'SETTINGS, PAYROLL, PERMISSIONS', accessLabel: 'SCOPED', kind: 'SYSTEM', sortOrder: 3 },
  { code: 'TECHNICIAN', name: 'TECHNICIAN', description: 'FIELD AND MOBILE APP ACCESS', modules: 'OPS (OWN WORK ORDERS), SAFETY', dashboards: 'FIELD', hidden: 'SETTINGS, BILLING, PERMISSIONS', accessLabel: 'FIELD ONLY', kind: 'SYSTEM', sortOrder: 4 },
  { code: 'BILLING', name: 'BILLING', description: 'INVOICING, PAYROLL EXPORT, REPORTS', modules: 'CRM, REPORTS', dashboards: 'EXECUTIVE', hidden: 'SETTINGS, DISPATCH, PERMISSIONS', accessLabel: 'SCOPED', kind: 'SYSTEM', sortOrder: 5 },
];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

type AuditSeed = {
  occurredAt: Date;
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
  sortOrder: number;
  drawer?: string;
};

export function buildAuditEvents(): AuditSeed[] {
  const shown: AuditSeed[] = [
    { occurredAt: hoursAgo(2), timeLabel: '2:14P JUN 12', actor: 'R. CRAWFORD', action: 'ROLE CHANGED', target: 'S. NGUYEN', detail: 'TECHNICIAN → SUPERVISOR', ip: '66.235.12.40', method: 'WEB', type: 'PERMISSION', result: 'SUCCESS', severity: 'INFO', sortOrder: 1, drawer: ROLE_CHANGED_DRAWER },
    { occurredAt: hoursAgo(3), timeLabel: '1:30P JUN 12', actor: 'R. CRAWFORD', action: 'USER INVITED', target: 'JESSE TRAN', detail: 'DISPATCHER · INVITE SENT', ip: '66.235.12.40', method: 'WEB', type: 'USER', result: 'SUCCESS', severity: 'INFO', sortOrder: 2 },
    { occurredAt: hoursAgo(4), timeLabel: '11:05A JUN 12', actor: 'SYSTEM', action: 'LOGIN FAILED', target: 'M. ELLIS', detail: 'BAD PASSWORD · 3RD TRY', ip: '66.235.12.41', method: 'WEB', type: 'AUTH', result: 'FAILED', severity: 'WARN', sortOrder: 3 },
    { occurredAt: hoursAgo(5), timeLabel: '9:40A JUN 12', actor: 'R. CRAWFORD', action: 'PERMISSION EDIT', target: 'BILLING ROLE', detail: 'EXPORT PAYROLL ON', ip: '66.235.12.40', method: 'WEB', type: 'PERMISSION', result: 'SUCCESS', severity: 'INFO', sortOrder: 4 },
    { occurredAt: hoursAgo(6), timeLabel: '8:12A JUN 12', actor: 'L. ORTEGA', action: 'LOGIN', target: 'L. ORTEGA', detail: 'MFA PASSED', ip: '172.58.104.33', method: 'MOBILE', type: 'AUTH', result: 'SUCCESS', severity: 'INFO', sortOrder: 5 },
    { occurredAt: hoursAgo(30), timeLabel: '5:50P JUN 11', actor: 'R. CRAWFORD', action: 'USER DEACTIVATED', target: 'K. MILLS', detail: 'SUSPENDED · REASON: ON LEAVE', ip: '66.235.12.40', method: 'WEB', type: 'USER', result: 'SUCCESS', severity: 'WARN', sortOrder: 6 },
    { occurredAt: hoursAgo(32), timeLabel: '3:20P JUN 11', actor: 'R. CRAWFORD', action: 'MODULE VISIBILITY', target: 'SUPERVISOR ROLE', detail: 'REPORTS HIDDEN', ip: '66.235.12.40', method: 'WEB', type: 'PERMISSION', result: 'SUCCESS', severity: 'INFO', sortOrder: 7 },
    { occurredAt: hoursAgo(34), timeLabel: '10:00A JUN 11', actor: 'SYSTEM', action: 'PASSWORD RESET', target: 'A. COOK', detail: 'LINK SENT · EXPIRES 24H', ip: '—', method: 'WEB', type: 'AUTH', result: 'SUCCESS', severity: 'INFO', sortOrder: 8 },
  ];
  const logins: AuditSeed[] = Array.from({ length: 14 }, (_, index) => ({
    occurredAt: hoursAgo(1 + index * 0.2),
    timeLabel: 'TODAY',
    actor: 'FIELD TECH',
    action: 'LOGIN',
    target: 'FIELD TECH',
    detail: 'SIGN-IN',
    ip: '66.235.12.40',
    method: 'MOBILE',
    type: 'AUTH',
    result: 'SUCCESS',
    severity: 'INFO',
    sortOrder: 20 + index,
  }));
  const extraFailed: AuditSeed[] = [36, 40].map((hours, index) => ({
    occurredAt: hoursAgo(hours),
    timeLabel: 'JUN 11',
    actor: 'SYSTEM',
    action: 'LOGIN FAILED',
    target: 'UNKNOWN',
    detail: 'BAD PASSWORD',
    ip: '66.235.12.41',
    method: 'WEB',
    type: 'AUTH',
    result: 'FAILED',
    severity: 'WARN',
    sortOrder: 40 + index,
  }));
  const system: AuditSeed[] = [3.5, 4.5].map((hours, index) => ({
    occurredAt: hoursAgo(hours),
    timeLabel: 'TODAY',
    actor: 'SYSTEM',
    action: 'RETENTION CHECK',
    target: 'AUDIT LOG',
    detail: 'NIGHTLY SWEEP',
    ip: '—',
    method: 'WEB',
    type: 'SYSTEM',
    result: 'SUCCESS',
    severity: 'INFO',
    sortOrder: 50 + index,
  }));
  const session: AuditSeed = {
    occurredAt: hoursAgo(7),
    timeLabel: 'TODAY',
    actor: 'SYSTEM',
    action: 'SESSION CHECK',
    target: 'WEB',
    detail: 'TOKEN STILL VALID',
    ip: '66.235.12.40',
    method: 'WEB',
    type: 'AUTH',
    result: 'SUCCESS',
    severity: 'INFO',
    sortOrder: 70,
  };
  const extraAuth: AuditSeed[] = [26, 27, 28, 29].map((hours, index) => ({
    occurredAt: hoursAgo(hours),
    timeLabel: 'JUN 11',
    actor: 'SYSTEM',
    action: 'MFA CHALLENGE',
    target: 'SESSION',
    detail: 'CHALLENGE PASSED',
    ip: '66.235.12.40',
    method: 'WEB',
    type: 'AUTH',
    result: 'SUCCESS',
    severity: 'INFO',
    sortOrder: 60 + index,
  }));
  return [...shown, ...logins, ...extraFailed, ...system, session, ...extraAuth];
}
