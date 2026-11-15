export const RESET_REASONS = [
  'DEVICE REPLACED',
  'APP REINSTALL NEEDED',
  'PERSISTENT SYNC ERROR',
  'DEVICE DECOMMISSIONED',
] as const;

export const DEVICE_EXTRAS: Record<
  string,
  {
    phone: string;
    email: string;
    lastLocation: string;
    crew: string;
    platform: string;
    connectivity: string;
    sessionLabel: string | null;
    syncAge: number;
    appVersion?: string;
    versionNote?: string | null;
  }
> = {
  'DEV-0712': { phone: '(432) 555-0147', email: 'dreed@darkhorseops.com', lastLocation: 'WOLFCAMP 12-4H · 06:39', crew: 'TRUCK 07', platform: 'IPAD', connectivity: 'OFFLINE', sessionLabel: null, syncAge: 560 },
  'DEV-0203': { phone: '(432) 555-0203', email: 'jmartinez@darkhorseops.com', lastLocation: 'WOLFCAMP 9-2H · 09:12', crew: 'TRUCK 02', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 2 },
  'DEV-0510': { phone: '(432) 555-0510', email: 'kosei@darkhorseops.com', lastLocation: 'WOLFCAMP 12-4H · 14:20', crew: 'TRUCK 05', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 0 },
  'DEV-1514': { phone: '(432) 555-1514', email: 'acook@darkhorseops.com', lastLocation: 'MIDLAND YARD · JUST NOW', crew: 'TRUCK 12', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 0 },
  'DEV-1209': { phone: '(432) 555-1209', email: 'snguyen@darkhorseops.com', lastLocation: 'WOLFCAMP 9-2H · 06:01', crew: 'TRUCK 12', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: 'SIGNED OUT', syncAge: 4 },
  'DEV-0808': { phone: '(432) 555-0808', email: 'chollis@darkhorseops.com', lastLocation: 'MIDLAND YARD · 1M AGO', crew: 'TRUCK 08', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 1 },
  'DEV-0911': { phone: '(432) 555-0911', email: 'pgrant@darkhorseops.com', lastLocation: 'MIDLAND YARD · 12M AGO', crew: 'TRUCK 09', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 12, appVersion: 'V3.7.9', versionNote: 'UPDATE AVAILABLE' },
  'DEV-1118': { phone: '(432) 555-1118', email: 'twhitlock@darkhorseops.com', lastLocation: 'MIDLAND YARD · 6M AGO', crew: 'TRUCK 11', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 6 },
  'DEV-1042': { phone: '(432) 555-1042', email: 'tech@darkhorseops.com', lastLocation: 'MIDLAND YARD · 8M AGO', crew: 'TRUCK 42', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 8 },
  'DEV-1004': { phone: '(432) 555-1004', email: 'rhall@darkhorseops.com', lastLocation: 'MIDLAND YARD · 15M AGO', crew: 'TRUCK 07', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 15 },
  'DEV-1006': { phone: '(432) 555-1006', email: 'lgarcia@darkhorseops.com', lastLocation: 'MIDLAND YARD · 20M AGO', crew: 'TRUCK 03', platform: 'IPAD', connectivity: 'ONLINE', sessionLabel: null, syncAge: 20 },
};

export const MARTINEZ_QUEUE = {
  itemType: 'FORM',
  detail: 'JSA · WO-2026-0141',
  createdLabel: '09/12',
  sizeLabel: '48 KB',
  status: 'FAILED',
  errorLabel: 'MS-409 · DUPLICATE',
  errorCode: 'MS-409',
  sortOrder: 1,
};

export const SYNC_ERROR_CASES = [
  { code: 'MS-413', title: 'PAYLOAD TOO LARGE', guidance: 'USUALLY PHOTOS · COMPRESS OR RETAKE', sortOrder: 1 },
  { code: 'MS-409', title: 'DUPLICATE SUBMISSION', guidance: 'SAME ITEM SENT TWICE · KEEP THE FIRST, DISCARD THE COPY', sortOrder: 2 },
  { code: 'MS-410', title: 'STALE REFERENCE', guidance: 'WO CANCELLED AFTER CAPTURE · REASSIGN TO AN OPEN WO OR DISCARD', sortOrder: 3 },
  { code: 'MS-401', title: 'AUTHENTICATION EXPIRED', guidance: 'TECHNICIAN SIGNS IN AGAIN · QUEUE RESUMES AUTOMATICALLY', sortOrder: 4 },
  { code: 'MS-504', title: 'SERVER TIMEOUT', guidance: 'TRANSIENT · RETRY SYNC, ESCALATE AFTER 3 FAILURES', sortOrder: 5 },
];

const step = (number: number, text: string, done = false) => ({ number, text, done, sortOrder: number });
const attempt = (timeLabel: string, message: string, tone: 'default' | 'danger', sortOrder: number) => ({
  timeLabel,
  message,
  tone,
  sortOrder,
});
const item = (itemType: string, detail: string, createdLabel: string, sizeLabel: string, sortOrder: number) => ({
  itemType,
  detail,
  createdLabel,
  sizeLabel,
  sortOrder,
});

export const SYNC_INCIDENTS = [
  {
    deviceCode: 'DEV-0712',
    code: 'MS-413',
    message: 'PHOTO EXCEEDS THE 5 MB PER-ITEM UPLOAD LIMIT ON CELLULAR',
    occurredLabel: 'OCCURRED JUN 13 · 06:32 · 3 ATTEMPTS',
    attemptCount: 3,
    statusNote: 'ITEM PAUSED · 9H 28M AGO',
    retryMode: 'ITEM',
    workOrder: 'WO-2026-0144',
    workOrderNote: null,
    queuedWith: 'JSA FORM · SIGNATURE · GPS EVENT · TIME ENTRY',
    deviceLine: 'DH-IPD-0712 · IPAD · APP V3.8.2 · OFFLINE SINCE 06:40',
    items: [item('PHOTO', 'SITE SETUP · WO-2026-0144', 'CREATED 06/31', '6.8 MB', 1)],
    steps: [
      step(1, 'ASK D. REED TO RECONNECT ON WI-FI — LARGE ITEMS ARE HELD WHILE THE DEVICE IS ON CELLULAR.', true),
      step(2, 'ONCE THE DEVICE IS BACK ON WI-FI, RETRY THIS ITEM. THE OTHER 4 QUEUED ITEMS UPLOAD ON THEIR OWN.'),
      step(3, 'IF IT FAILS AGAIN, ASK THE TECHNICIAN TO RETAKE THE PHOTO AT STANDARD RESOLUTION.'),
      step(4, 'DISCARD THE ORIGINAL ONLY AFTER THE REPLACEMENT ARRIVES. ADMIN ONLY, REASON REQUIRED, LOGGED.'),
    ],
    attempts: [
      attempt('06/31', 'PHOTO CAPTURED OFFLINE · QUEUED', 'default', 1),
      attempt('06/32', 'ATTEMPT 1 · MS-413 PAYLOAD TOO LARGE', 'danger', 2),
      attempt('06/34', 'ATTEMPT 2 · AUTO-RETRY · MS-413', 'danger', 3),
      attempt('06/38', 'ATTEMPT 3 · AUTO-RETRY · MS-413 · ITEM PAUSED', 'danger', 4),
      attempt('06/40', 'DEVICE WENT OFFLINE · 4 ITEMS QUEUED', 'default', 5),
      attempt('15/58', 'STEP 1 CHECKED · ASKED D. REED TO RECONNECT ON WI-FI. R. CRAWFORD', 'default', 6),
    ],
  },
  {
    deviceCode: 'DEV-1209',
    code: 'MS-401',
    message: "TECHNICIAN'S SESSION EXPIRED · THE DEVICE CANNOT UPLOAD UNTIL THEY SIGN IN AGAIN",
    occurredLabel: 'OCCURRED JUN 10 · 06:05 · 2 ATTEMPTS',
    attemptCount: 2,
    statusNote: 'WAITING FOR SIGN-IN · 3 DAYS AGO',
    retryMode: 'WAITING',
    workOrder: 'WO-2026-0128',
    workOrderNote: null,
    queuedWith: 'ALL 3 ITEMS HELD · NOTHING UPLOADED',
    deviceLine: 'DH-IPD-1209 · IPAD · APP V3.8.2 · ONLINE · SIGNED OUT',
    items: [
      item('TIME ENTRY', 'CLOCK-IN · WO-2026-0128', 'CREATED 06/52', '2 KB', 1),
      item('FORM', 'JSA · WO-2026-0128', 'CREATED 06/58', '46 KB', 2),
      item('GPS EVENT', 'ARRIVED ON SITE · WOLFCAMP 9-2H', 'CREATED 06/01', '1 KB', 3),
    ],
    steps: [
      step(1, 'ASK S. NGUYEN TO OPEN THE APP AND SIGN IN. ITEMS STAY ON THE DEVICE; NOTHING IS LOST.'),
      step(2, 'THE QUEUE RESUMES AUTOMATICALLY AFTER SIGN-IN. NO RETRY NEEDED.'),
      step(3, 'IF SIGN-IN FAILS, CHECK THE ACCOUNT IS ACTIVE IN SETTINGS › USERS & ROLES.'),
      step(4, 'DO NOT DISCARD — ALL 3 ITEMS ARE VALID AND UPLOAD ONCE THE SESSION IS RESTORED.'),
    ],
    attempts: [
      attempt('06/50', 'SESSION EXPIRED · 30-DAY SIGN-IN LIMIT', 'danger', 1),
      attempt('06/05', 'ATTEMPT 1 · MS-401 AUTH EXPIRED · 3 ITEMS HELD', 'danger', 2),
      attempt('06/20', 'ATTEMPT 2 · AUTO-RETRY · MS-401', 'danger', 3),
      attempt('06/20', 'SYNC PAUSED · WAITING FOR SIGN-IN', 'danger', 4),
    ],
  },
  {
    deviceCode: 'DEV-0203',
    code: 'MS-409',
    message: 'SAME JSA FORM ALREADY RECEIVED AT 09:12 · THIS COPY WAS REJECTED',
    occurredLabel: 'OCCURRED JUN 13 · 09:13 · 1 ATTEMPT',
    attemptCount: 1,
    statusNote: 'ITEM PAUSED · 6H 47M AGO',
    retryMode: 'ITEM',
    workOrder: 'WO-2026-0141',
    workOrderNote: null,
    queuedWith: 'NOTHING ELSE QUEUED',
    deviceLine: 'DH-IPD-0203 · IPAD · APP V3.8.2 · ONLINE · LAST SYNC 2M AGO',
    items: [item('FORM', 'JSA · WO-2026-0141', 'CREATED 09/12', '48 KB', 1)],
    steps: [
      step(1, 'OPEN THE RECEIVED JSA ON WO-2026-0141 AND COMPARE IT WITH THIS COPY — BOTH WERE CAPTURED AT 09:12.'),
      step(2, 'IF THEY MATCH, DISCARD THIS COPY. NOTHING IS LOST; THE ORIGINAL IS ALREADY ON THE WORK ORDER.'),
      step(3, 'IF THE COPY HAS EXTRA ENTRIES, ADD THEM TO THE RECEIVED FORM. DO NOT RETRY — THE SERVER REJECTS IT AGAIN.'),
      step(4, 'IF DUPLICATES REPEAT ON THIS DEVICE, REPORT IT TO SUPPORT WITH THE DEVICE ID.'),
    ],
    attempts: [
      attempt('09/12', 'JSA FORM SUBMITTED · RECEIVED', 'default', 1),
      attempt('09/12', 'SAME FORM SUBMITTED AGAIN · QUEUED', 'default', 2),
      attempt('09/13', 'ATTEMPT 1 · MS-409 DUPLICATE SUBMISSION', 'danger', 3),
      attempt('09/13', 'ITEM PAUSED · DUPLICATES ARE NOT AUTO-RETRIED', 'danger', 4),
    ],
  },
  {
    deviceCode: 'DEV-0510',
    code: 'MS-410',
    message: 'WO-2026-0137 WAS CANCELLED AT 13:55, AFTER THIS CLOSEOUT WAS CAPTURED OFFLINE.',
    occurredLabel: 'OCCURRED JUN 12 · 14:20 · 1 ATTEMPT',
    attemptCount: 1,
    statusNote: 'NEEDS REASSIGNMENT · 1 DAY AGO',
    retryMode: 'ITEM',
    workOrder: 'WO-2026-0137',
    workOrderNote: 'CANCELLED',
    queuedWith: 'SIGNATURE · 2 PHOTOS (UPLOADED, ON CANCELLED WO)',
    deviceLine: 'DH-IPD-0510 · IPAD · APP V3.8.2 · ONLINE · LAST SYNC 14:20',
    items: [item('CLOSEOUT', 'JOB CLOSEOUT · WO-2026-0137', 'CREATED 13/40', '310 KB', 1)],
    steps: [
      step(1, 'OPEN WO-2026-0137 AND CHECK ITS AUDIT LOG FOR WHY IT WAS CANCELLED AT 13:55.'),
      step(2, 'IF THE WORK WAS DONE, REASSIGN THIS CLOSEOUT TO THE REPLACEMENT OR A NEW OPEN WORK ORDER FOR THE SAME WELL.'),
      step(3, 'IF THE WORK WAS NOT DONE, DISCARD THE CLOSEOUT. ADMIN ONLY, REASON REQUIRED, LOGGED.'),
      step(4, 'DO NOT RETRY AS-IS — IT FAILS WITH MS-410 UNTIL IT POINTS AT AN OPEN WORK ORDER.'),
    ],
    attempts: [
      attempt('13/40', 'CLOSEOUT CAPTURED OFFLINE · QUEUED', 'default', 1),
      attempt('13/55', 'WO-2026-0137 CANCELLED BY DISPATCH', 'danger', 2),
      attempt('14/20', 'ATTEMPT 1 · MS-410 WORK ORDER CANCELLED', 'danger', 3),
      attempt('14/20', 'ITEM PAUSED · NEEDS REASSIGNMENT', 'danger', 4),
    ],
  },
  {
    deviceCode: 'DEV-0808',
    code: 'MS-504',
    message: 'SERVER DID NOT RESPOND WITHIN 30 S · ITEM IS VALID AND STILL ON THE DEVICE',
    occurredLabel: 'OCCURRED JUN 8 · 16:03 · 3 ATTEMPTS',
    attemptCount: 3,
    statusNote: 'ESCALATE TO SUPPORT · 5 DAYS AGO',
    retryMode: 'ITEM',
    workOrder: 'WO-2026-0119',
    workOrderNote: null,
    queuedWith: 'NOTHING ELSE QUEUED',
    deviceLine: 'DH-IPD-0807 · IPAD · APP V3.8.2 · ONLINE · LAST SYNC 16:09',
    items: [item('SIGNATURE', 'CUSTOMER SIGN-OFF · WO-2026-0119', 'CREATED 16/02', '22 KB', 1)],
    steps: [
      step(1, 'RETRY SYNC. TIMEOUTS ARE USUALLY TRANSIENT.'),
      step(2, 'IF OTHER DEVICES FAILED WITH MS-504 AT THE SAME TIME, THE PROBLEM IS SERVER-SIDE — WAIT 10 MINUTES AND RETRY.'),
      step(3, 'AFTER 3 FAILED ATTEMPTS, ESCALATE TO SUPPORT WITH THE ERROR CODE, DEVICE ID AND ATTEMPT TIMES.'),
      step(4, 'DO NOT DISCARD — THE SIGNATURE IS VALID AND UPLOADS ONCE THE SERVER RESPONDS.'),
    ],
    attempts: [
      attempt('16/02', 'SIGNATURE CAPTURED · QUEUED', 'default', 1),
      attempt('16/03', 'ATTEMPT 1 · MS-504 TIMEOUT AFTER 30 S', 'danger', 2),
      attempt('16/05', 'ATTEMPT 2 · AUTO-RETRY · MS-504', 'danger', 3),
      attempt('16/09', 'ATTEMPT 3 · AUTO-RETRY · MS-504 · ESCALATE', 'danger', 4),
    ],
  },
];

export const REED_HISTORY = [
  { whenLabel: 'JUN 13 · 06:40', title: 'DEVICE WENT OFFLINE', detail: 'LAST HEARTBEAT · WOLFCAMP 12-4H', status: 'OFFLINE', sortOrder: 1 },
  { whenLabel: 'JUN 13 · 06:38', title: 'GPS EVENT QUEUED', detail: 'ARRIVED ON SITE · WOLFCAMP 12-4H', status: 'QUEUED', sortOrder: 2 },
  { whenLabel: 'JUN 13 · 06:38', title: 'ATTEMPT 3 FAILED · MS-413', detail: 'PHOTO 6.8 MB · PAYLOAD TOO LARGE', status: 'FAILED', sortOrder: 3 },
  { whenLabel: 'JUN 13 · 06:34', title: 'ATTEMPT 2 FAILED · MS-413', detail: 'RETRY AFTER 2 MIN', status: 'FAILED', sortOrder: 4 },
  { whenLabel: 'JUN 13 · 06:32', title: 'ATTEMPT 1 FAILED · MS-413', detail: 'UPLOAD REJECTED BY SERVER', status: 'FAILED', sortOrder: 5 },
  { whenLabel: 'JUN 13 · 06:31', title: 'PHOTO CAPTURED · QUEUED', detail: 'SITE SETUP · WO-2026-0144', status: 'QUEUED', sortOrder: 6 },
  { whenLabel: 'JUN 13 · 06:12', title: 'CLOCK-IN QUEUED', detail: 'TIME ENTRY · WO-2026-0144', status: 'QUEUED', sortOrder: 7 },
  { whenLabel: 'JUN 12 · 17:05', title: 'SYNCED 23 ITEMS', detail: 'UP TO DATE', status: 'SYNCED', sortOrder: 8 },
  { whenLabel: 'JUN 12 · 06:58', title: 'APP UPDATED TO V3.8.2', detail: 'FROM V3.7.9', status: 'UPDATED', sortOrder: 9 },
];
