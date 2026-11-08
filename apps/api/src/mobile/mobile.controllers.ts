import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import * as D from './dto/mobile.dto';
import { MobileClockService } from './mobile-clock.service';
import { MobileFormsService } from './mobile-forms.service';
import { MobileJobsService } from './mobile-jobs.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileTimeService } from './mobile-time.service';
import { MobileOp } from './mobile-swagger';

const me = {
  id: 'user-uuid',
  employeeId: 'employee-uuid',
  employeeCode: 'E-1042',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  roleTitle: 'Technician',
  email: 'tech@example.com',
  phone: '15550101234',
  crew: 'Crew A',
  assignedTruck: 'Truck 12',
  emergencyContact: { name: 'Sam', phone: '15550109999' },
  supervisor: { id: 'uuid', name: 'Grace Hopper', phone: '15550108888' },
  homeLocation: { address: '1 Main St', lat: 32.78, lng: -96.8, setAt: '2026-11-01T12:00:00.000Z' },
  settings: { defaultTimeCategory: 'REGULAR', notificationsEnabled: true },
};

const clock = {
  status: 'CLOCKED_IN',
  timeEntryId: 'uuid',
  clockIn: '07:05',
  workDate: '2026-11-07',
  workOrderCode: 'WO-100',
  customerName: 'Acme',
  category: 'REGULAR',
  pause: null,
};

const jobCard = {
  assignmentId: 'uuid',
  workOrderId: 'uuid',
  workOrderCode: 'WO-100',
  title: 'Tubing inspection',
  customer: 'Acme',
  location: 'Well 4',
  scheduledDate: '2026-11-08',
  startTime: '08:00',
  endTime: '16:00',
  status: 'POSTED',
  jobType: 'VISIT',
};

@ApiTags('mobile-profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileProfileController {
  constructor(private readonly s: MobileProfileService) {}

  @Get('me')
  @MobileOp('PR-1 Profile', me)
  me(@CurrentUser() u: AuthUser) { return this.s.me(u.id); }

  @Patch('me')
  @MobileOp('PR-2 Update profile. Returns the full profile.', me)
  upd(@CurrentUser() u: AuthUser, @Body() d: D.UpdateProfileDto) { return this.s.update(u.id, d); }

  @Put('me/home-location')
  @MobileOp('PR-3a Set home location (first time)', {
    homeLocation: { address: '1 Main St, Dallas, TX', lat: 32.78, lng: -96.8 },
    status: 'ACTIVE',
  })
  home(@CurrentUser() u: AuthUser, @Body() d: D.HomeLocationDto) { return this.s.setHome(u.id, d); }

  @Post('me/home-location/change-requests')
  @MobileOp('PR-3b Request home location change', { id: 'uuid', status: 'PENDING' })
  homeReq(@CurrentUser() u: AuthUser, @Body() d: D.HomeLocationChangeDto) { return this.s.requestHomeChange(u.id, d); }

  @Post('me/change-password')
  @HttpCode(200)
  @MobileOp('PR-4 Change password', { changed: true })
  pw(@CurrentUser() u: AuthUser, @Body() d: D.ChangePasswordDto) { return this.s.changePassword(u.id, d); }

  @Get('me/certifications')
  @MobileOp('PR-5 Certifications', {
    items: [{ id: 'uuid', label: 'H2S', issuingBody: 'SafeLand', expiresOn: '2027-01-15', status: 'VALID' }],
  })
  certs(@CurrentUser() u: AuthUser) { return this.s.certifications(u.id); }

  @Get('me/equipment')
  @MobileOp('PR-6 Equipment', {
    assignedTruck: 'Truck 12',
    ppeIssued: ['Hard hat', 'FR coveralls'],
    assignedEquipment: ['4-gas monitor'],
  })
  eq(@CurrentUser() u: AuthUser) { return this.s.equipment(u.id); }

  @Patch('me/settings')
  @MobileOp('PR-7 Settings', { defaultTimeCategory: 'REGULAR', notificationsEnabled: true })
  set(@CurrentUser() u: AuthUser, @Body() d: D.SettingsDto) { return this.s.settings(u.id, d); }

  @Post('me/location-access-requests')
  @MobileOp('PR-8 Ask supervisor for location access', { id: 'uuid', status: 'PENDING' })
  loc(@CurrentUser() u: AuthUser, @Body() d: D.NoteDto) { return this.s.locationAccess(u.id, d); }

  @Post('supervisor/messages')
  @MobileOp('MSG-1 Message supervisor', { id: 'uuid', sentAt: '2026-11-07T14:22:00.000Z' })
  msg(@CurrentUser() u: AuthUser, @Body() d: D.SupervisorMessageDto) { return this.s.messageSupervisor(u.id, d); }

  @Post('devices')
  @MobileOp('DV-1 Register device', { deviceId: 'install-uuid', registered: true })
  dev(@CurrentUser() u: AuthUser, @Body() d: D.DeviceDto) { return this.s.registerDevice(u.id, d); }

  @Delete('devices/:deviceId')
  @MobileOp('DV-2 Unregister device', { removed: true })
  rmDev(@CurrentUser() u: AuthUser, @Param('deviceId') id: string) { return this.s.removeDevice(u.id, id); }

  @Get('home')
  @ApiQuery({ name: 'date', required: false, example: '2026-11-07' })
  @MobileOp('HM-1 Home dashboard', {
    date: '2026-11-07',
    mode: 'WORKING',
    blockedReason: null,
    clock: { status: 'CLOCKED_IN', timeEntryId: 'uuid', clockIn: '07:05', workOrderCode: 'WO-100' },
    attentionCount: 1,
    unreadNotifications: 3,
    pendingEditsCount: 0,
    unsyncedCount: 0,
    nextJob: { assignmentId: 'uuid', workOrderId: 'uuid', workOrderCode: 'WO-100', customer: 'Acme', location: 'Well 4', startTime: '08:00', endTime: '16:00', status: 'ACCEPTED' },
    schedule: [],
    onCall: { zone: 'North', status: 'PUBLISHED', role: 'PRIMARY' },
  })
  homeDash(@CurrentUser() u: AuthUser, @Query('date') date?: string) { return this.s.home(u.id, date); }

  @Get('on-call')
  @ApiQuery({ name: 'from', required: false, example: '2026-11-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-11-30' })
  @MobileOp('OC-1 My on-call shifts', {
    items: [{ id: 'uuid', date: '2026-11-08', zone: 'North', status: 'PUBLISHED', role: 'PRIMARY', notes: 'Call Grace first' }],
  })
  oc(@CurrentUser() u: AuthUser, @Query('from') f?: string, @Query('to') t?: string) { return this.s.onCall(u.id, f, t); }

  @Get('on-call/shifts/:id')
  @MobileOp('OC-2 On-call shift detail', {
    id: 'uuid',
    date: '2026-11-08',
    zone: 'North',
    status: 'PUBLISHED',
    role: 'PRIMARY',
    instructions: 'Call Grace first',
    supervisor: { name: 'Grace Hopper', phone: '15550108888' },
  })
  ocOne(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.onCallShift(u.id, id); }

  @Post('on-call/shifts/:id/check-in')
  @MobileOp('OC-3 On-call check-in', { checkedInAt: '2026-11-07T14:22:00.000Z', withinArea: null })
  ocIn(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.GeoDto) { return this.s.onCallCheckIn(u.id, id, d); }
}

@ApiTags('mobile-clock')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileClockController {
  constructor(private readonly s: MobileClockService) {}

  @Get('clock/status')
  @MobileOp('CL-1 Clock status', { ...clock, status: 'PAUSED', pause: { id: 'uuid', reason: 'BREAK', startedAt: '2026-11-07T16:00:00.000Z' } })
  st(@CurrentUser() u: AuthUser) { return this.s.status(u.id); }

  @Post('clock/in')
  @HttpCode(200)
  @MobileOp('CL-2 Clock in', { ...clock, gpsFlag: { raised: false } })
  in(@CurrentUser() u: AuthUser, @Body() d: D.ClockInDto) { return this.s.clockIn(u.id, d); }

  @Post('clock/out')
  @HttpCode(200)
  @MobileOp('CL-3 Clock out', {
    status: 'CLOCKED_OUT',
    timeEntryId: 'uuid',
    clockOut: '17:00',
    summary: { workMinutes: 540, breakMinutes: 30, pauseMinutes: 45, totalMinutes: 585 },
    formsMissing: [],
  })
  out(@CurrentUser() u: AuthUser, @Body() d: D.GeoDto) { return this.s.clockOut(u.id, d); }

  @Post('clock/sync')
  @HttpCode(200)
  @MobileOp('CL-4 Replay offline events', {
    results: [
      { clientRequestId: 'uuid-1', ok: true },
      { clientRequestId: 'uuid-2', ok: false, error: { code: 'ALREADY_PAUSED', message: 'Already paused.' } },
    ],
  })
  sync(@CurrentUser() u: AuthUser, @Body() d: D.SyncDto) { return this.s.sync(u.id, d); }

  @Post('clock/gps-explanation')
  @HttpCode(200)
  @MobileOp('CL-5 GPS explanation', { id: 'uuid', status: 'EXPLAINED' })
  ex(@CurrentUser() u: AuthUser, @Body() d: D.GpsExplanationDto) { return this.s.explain(u.id, d); }

  @Get('clock/geofence-check')
  @ApiQuery({ name: 'workOrderId', required: true, example: 'work-order-uuid' })
  @ApiQuery({ name: 'lat', required: true, example: '32.78' })
  @ApiQuery({ name: 'lng', required: true, example: '-96.8' })
  @MobileOp('CL-6 Geofence check', { withinGeofence: true, radiusFeet: 500, distanceMeters: 42, gpsRequired: true })
  gc(@CurrentUser() u: AuthUser, @Query('workOrderId') w: string, @Query('lat') lat: string, @Query('lng') lng: string) {
    return this.s.geofenceCheck(u.id, w, Number(lat), Number(lng));
  }

  @Post('clock/pause')
  @HttpCode(200)
  @MobileOp('CL-7 Pause', { pauseId: 'uuid', startedAt: '2026-11-07T16:00:00.000Z' })
  pause(@CurrentUser() u: AuthUser, @Body() d: D.PauseDto) { return this.s.pause(u.id, d); }

  @Post('clock/resume')
  @HttpCode(200)
  @MobileOp('CL-8 Resume', { pauseId: 'uuid', endedAt: '2026-11-07T16:30:00.000Z', pauseMinutes: 30 })
  resume(@CurrentUser() u: AuthUser, @Body() d: D.ResumeDto) { return this.s.resume(u.id, d); }

  @Get('gps-flags')
  @MobileOp('GF-1 My GPS flags', {
    items: [{ id: 'uuid', type: 'OUTSIDE_GEOFENCE', status: 'OPEN', eventAt: '2026-11-07T12:05:00.000Z', workOrder: 'WO-100' }],
  })
  flags(@CurrentUser() u: AuthUser) { return this.s.flags(u.id); }

  @Get('gps-flags/:id')
  @MobileOp('GF-2 GPS flag detail', {
    id: 'uuid',
    type: 'CLOCK_IN_FROM_HOME',
    status: 'OPEN',
    timeEntryId: 'uuid',
    eventAt: '2026-11-07T12:05:00.000Z',
    homeLocation: { lat: 32.7, lng: -96.7, address: '1 Main St' },
    jobLocation: { lat: 32.9, lng: -96.9 },
    clockLocation: { lat: 32.7, lng: -96.7 },
    distanceFromJobMeters: 1200,
    explanation: null,
    decisionNotes: null,
    timeline: [{ at: '2026-11-07T12:05:00.000Z', event: 'FLAG_RAISED', actor: 'SYSTEM' }],
  })
  flag(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.flag(u.id, id); }

  @Get('sync/status')
  @MobileOp('SYNC-1 Sync status', { pendingCount: 0, failedCount: 0, lastSyncedAt: '2026-11-07T14:22:00.000Z' })
  ss(@CurrentUser() u: AuthUser) { return this.s.syncStatus(u.id); }
}

@ApiTags('mobile-jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1/jobs')
export class MobileJobsController {
  constructor(private readonly s: MobileJobsService) {}

  @Get()
  @MobileOp('JB-1 Jobs list. :id on job routes is the assignment id.', { items: [jobCard], page: 1, pageSize: 25, total: 1 })
  list(@CurrentUser() u: AuthUser, @Query() q: D.JobsQuery) { return this.s.list(u.id, q); }

  @Get(':id')
  @MobileOp('JB-2 Job detail', {
    ...jobCard,
    outcome: null,
    notes: 'Gate code 1234',
    site: { name: 'Well 4', county: 'Midland', state: 'TX', lat: 31.99, lng: -102.07, accessNotes: 'North gate', musterPoint: 'Parking pad', siteContact: 'Pat 555-0100' },
    h2sRequired: false,
    certificationWarning: null,
    distanceFromHomeMeters: 84000,
    supervisor: { name: 'Grace Hopper', phone: '15550108888' },
    respondBy: '2026-11-08',
  })
  one(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.detail(u.id, id); }

  @Post(':id/accept')
  @HttpCode(200)
  @MobileOp('JB-3 Accept', { assignmentId: 'uuid', status: 'ACCEPTED', acceptedAt: '2026-11-07T14:22:00.000Z' })
  acc(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.Idem) { return this.s.accept(u.id, id, d.clientRequestId); }

  @Post(':id/decline')
  @HttpCode(200)
  @MobileOp('JB-4 Decline', { assignmentId: 'uuid', status: 'DECLINED', declinedAt: '2026-11-07T14:22:00.000Z' })
  dec(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.DeclineDto) { return this.s.decline(u.id, id, d); }

  @Post(':id/request-help')
  @MobileOp('JB-7 Request help', { id: 'uuid', sentAt: '2026-11-07T14:22:00.000Z' })
  help(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.NoteDto) { return this.s.requestHelp(u.id, id, d); }

  @Get(':id/closeout')
  @MobileOp('CO-1 Closeout summary', {
    workOrderCode: 'WO-100',
    status: 'NOT_SUBMITTED',
    hoursWorked: 8.5,
    salesTicket: { id: 'uuid', code: 'ST-100', status: 'SUBMITTED', amount: 850 },
    formsMissing: ['JSA'],
    flaggedItems: [{ code: 'FORM_MISSING', message: 'JSA not submitted' }],
    canSubmit: false,
  })
  co(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.closeout(u.id, id); }

  @Post(':id/closeout')
  @HttpCode(200)
  @MobileOp('CO-2 Submit closeout', { id: 'review-uuid', status: 'SUBMITTED' })
  sub(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.CloseoutDto) { return this.s.submitCloseout(u.id, id, d); }

  @Get(':id/closeout/status')
  @MobileOp('CO-3 Closeout status', { status: 'SUBMITTED', decisionNote: null, flaggedItems: [] })
  cos(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.closeoutStatus(u.id, id); }

  @Post(':id/sales-ticket')
  @MobileOp('ST-1 Create sales ticket', { id: 'uuid', code: 'ST-M-100', status: 'SUBMITTED', amount: 760 })
  st(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.SalesTicketDto) { return this.s.createTicket(u.id, id, d); }

  @Put(':id/sales-ticket')
  @MobileOp('ST-2 Correct sales ticket. Same body and response as create.', { id: 'uuid', code: 'ST-M-100', status: 'SUBMITTED', amount: 760 })
  st2(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.SalesTicketDto) { return this.s.correctTicket(u.id, id, d); }
}

@ApiTags('mobile-forms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileFormsController {
  constructor(private readonly s: MobileFormsService) {}

  @Get('forms')
  @MobileOp('FM-1 Forms list', {
    items: [{ formId: 'uuid', code: 'JSA', title: 'Job Safety Analysis', version: 3, required: true }],
  })
  list(@CurrentUser() u: AuthUser, @Query() q: D.FormsQuery) { return this.s.list(u.id, q); }

  @Get('forms/corrections')
  @MobileOp('FM-6 Correction requests', {
    items: [{ id: 'uuid', code: 'FCR-100', formTitle: 'JSA', workOrderId: 'uuid', customerName: 'Acme', issueFlagged: 'Missing signature', instruction: 'Sign and resubmit', status: 'OPEN', createdAt: '2026-11-07T18:00:00.000Z' }],
  })
  cor(@CurrentUser() u: AuthUser) { return this.s.corrections(u.id); }

  @Post('forms/corrections/:id/resubmit')
  @HttpCode(200)
  @MobileOp('FM-7 Resubmit corrected form', { id: 'uuid', status: 'RESUBMITTED' })
  re(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.CorrectionResubmitDto) { return this.s.resubmit(u.id, id, d); }

  @Get('forms/submissions/:id')
  @MobileOp('FM-5 Submission detail', {
    submissionId: 'uuid',
    code: 'SFS-M-100',
    status: 'SUBMITTED',
    form: { id: 'uuid', title: 'Job Safety Analysis', definition: {} },
    values: { hazard: 'H2S' },
    meta: { employee: 'Ada Lovelace', signatureUrl: null, capturedAt: '2026-11-07T18:00:00.000Z', gps: { lat: 32.78, lng: -96.8 }, source: 'MOBILE' },
    submittedAt: '2026-11-07T18:00:00.000Z',
  })
  sub(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.submission(u.id, id); }

  @Get('forms/:formId/template')
  @MobileOp('FM-2 Form template. formId may be the id or the form code.', {
    formId: 'uuid',
    code: 'JSA',
    title: 'Job Safety Analysis',
    version: 3,
    definition: {},
  })
  tpl(@Param('formId') id: string) { return this.s.template(id); }

  @Put('forms/:formId/draft')
  @MobileOp('FM-3 Save draft', { submissionId: 'uuid', code: 'SFS-M-100', status: 'DRAFT' })
  draft(@CurrentUser() u: AuthUser, @Param('formId') id: string, @Body() d: D.FormSubmitDto) { return this.s.saveDraft(u.id, id, d); }

  @Post('forms/:formId/submissions')
  @MobileOp('FM-4 Submit form. Same body as the draft. status is SUBMITTED.', { submissionId: 'uuid', code: 'SFS-M-100', status: 'SUBMITTED' })
  submit(@CurrentUser() u: AuthUser, @Param('formId') id: string, @Body() d: D.FormSubmitDto) { return this.s.submit(u.id, id, d); }

  @Post('additional-form-requests')
  @MobileOp('SC-1 Request additional form (scope change)', { id: 'uuid', code: 'AFR-M-100', status: 'PENDING' })
  c(@CurrentUser() u: AuthUser, @Body() d: D.AdditionalFormDto) { return this.s.createAdditional(u.id, d); }

  @Get('additional-form-requests')
  @MobileOp('SC-2 My additional form requests', {
    items: [{ id: 'uuid', code: 'AFR-M-100', workOrderId: 'uuid', formRequested: 'Confined space', urgency: 'HIGH', status: 'PENDING', createdAt: '2026-11-07T18:00:00.000Z' }],
  })
  l(@CurrentUser() u: AuthUser) { return this.s.listAdditional(u.id); }

  @Get('additional-form-requests/:id')
  @MobileOp('SC-5 Request detail and timeline', {
    id: 'uuid',
    code: 'AFR-M-100',
    formRequested: 'Confined space',
    reason: 'Customer added a vessel',
    urgency: 'HIGH',
    status: 'NEEDS_INFO',
    reviewer: 'Grace Hopper',
    timeline: [{ when: '2026-11-07T18:00:00.000Z', text: 'Requested by Ada Lovelace' }],
    newFormAvailable: false,
  })
  g(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.getAdditional(u.id, id); }

  @Post('additional-form-requests/:id/respond')
  @HttpCode(200)
  @MobileOp('SC-4 Reply to more-info request', { id: 'uuid', status: 'PENDING' })
  r(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.AdditionalFormRespondDto) { return this.s.respondAdditional(u.id, id, d); }
}

@ApiTags('mobile-time')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileTimeController {
  constructor(private readonly s: MobileTimeService) {}

  @Get('pay-cycles')
  @MobileOp('TS-1 Pay cycles', {
    items: [{ id: 'uuid', label: 'Nov 1-14', code: '2026-22', startDate: '2026-11-01', endDate: '2026-11-14', status: 'OPEN' }],
  })
  pc(@CurrentUser() u: AuthUser) { return this.s.payCycles(u.id); }

  @Get('timesheet')
  @MobileOp('TS-2 Timesheet', {
    from: '2026-11-02',
    to: '2026-11-08',
    totals: { regularHours: 40, overtimeHours: 2, nonBillableHours: 1, sickHours: 0, totalHours: 43 },
    items: [{ id: 'uuid', workDate: '2026-11-07', clockIn: '07:05', clockOut: '17:00', hours: 8.5, category: 'REGULAR', workOrderCode: 'WO-100', customerName: 'Acme', status: 'PENDING', locked: false, gpsFlagged: false, editRequestStatus: null }],
  })
  ts(@CurrentUser() u: AuthUser, @Query() q: D.TimesheetQuery) { return this.s.timesheet(u.id, q); }

  @Get('timesheet/edit-reasons')
  @MobileOp('TS-8 Edit reason codes', {
    items: [
      { code: 'FORGOT_CLOCK_IN', label: 'Forgot to clock in' },
      { code: 'FORGOT_CLOCK_OUT', label: 'Forgot to clock out' },
      { code: 'WRONG_JOB', label: 'Clocked in to wrong job' },
      { code: 'GPS_ISSUE', label: 'GPS or connectivity issue' },
      { code: 'DEVICE_ISSUE', label: 'Device problem' },
      { code: 'OTHER', label: 'Other' },
    ],
  })
  er(@CurrentUser() u: AuthUser) { void u; return this.s.editReasons(); }

  @Get('timesheet/entries/:id')
  @MobileOp('TS-3 Entry detail', {
    id: 'uuid',
    workDate: '2026-11-07',
    clockIn: '07:05',
    clockOut: '17:00',
    category: 'REGULAR',
    status: 'PENDING',
    locked: false,
    workOrderCode: 'WO-100',
    customerName: 'Acme',
    jobLocation: 'Well 4',
    hours: 8.5,
    billableMinutes: 510,
    nonBillableMinutes: 0,
    nonBillableReason: null,
    gpsRecord: { flagged: false, label: 'CLEAR', clockIn: { lat: 32.78, lng: -96.8, distanceMi: 0.2 }, clockOut: { lat: 32.78, lng: -96.8, distanceMi: 0.2 }, job: { lat: 32.79, lng: -96.81 }, travelHours: null },
    pauses: [{ id: 'uuid', reason: 'BREAK', startedAt: '2026-11-07T16:00:00.000Z', endedAt: '2026-11-07T16:30:00.000Z' }],
    activity: [{ at: '2026-11-07T12:05:00.000Z', what: 'Clocked in (mobile)' }],
    notes: [{ id: 'n-1', text: 'Waited on crane', at: '2026-11-07T18:00:00.000Z', by: 'EMPLOYEE' }],
  })
  en(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.entryDetail(u.id, id); }

  @Put('timesheet/entries/:id/notes')
  @MobileOp('TS-7 Save entry note', { saved: true })
  nt(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.EntryNotesDto) { return this.s.saveNote(u.id, id, d); }

  @Post('time-edit-requests')
  @MobileOp('TS-4 Request time edit', { id: 'uuid', status: 'PENDING' })
  ce(@CurrentUser() u: AuthUser, @Body() d: D.EditRequestDto) { return this.s.createEdit(u.id, d); }

  @Get('time-edit-requests')
  @MobileOp('TS-5 My edit requests', {
    items: [{ id: 'uuid', timeEntryId: 'uuid', workDate: '2026-11-07', status: 'NEEDS_CLARIFICATION', originalClockIn: '07:05', originalClockOut: '17:00', requestedClockIn: '07:00', requestedClockOut: null, deltaLabel: '+0.1h', reason: 'Forgot to clock in: radio was dead', adminNote: 'What time did you arrive?', needsClarification: true, createdAt: '2026-11-07T19:00:00.000Z' }],
  })
  le(@CurrentUser() u: AuthUser) { return this.s.listEdits(u.id); }

  @Post('time-edit-requests/:id/respond')
  @HttpCode(200)
  @MobileOp('TS-6 Reply to clarification', { id: 'uuid', status: 'PENDING' })
  re(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.EditRespondDto) { return this.s.respondEdit(u.id, id, d); }

  @Get('time-off/balances')
  @MobileOp('TO-1 Balances', {
    PTO: { balance: 40, annual: 80, used: 24, scheduled: 16 },
    SICK: { balance: 16, annual: 40, used: 8 },
    HOLIDAY: { balance: 8, observed: 8, taken: 0 },
  })
  b(@CurrentUser() u: AuthUser) { return this.s.balances(u.id); }

  @Get('time-off')
  @MobileOp('TO-2 My requests', {
    items: [{ id: 'uuid', type: 'PTO', status: 'PENDING', startDate: '2026-11-20', endDate: '2026-11-21', dayCount: 2, hoursRequested: 16, reason: 'Family', adminNote: null, requestedAt: '2026-11-07T19:00:00.000Z' }],
  })
  lo(@CurrentUser() u: AuthUser) { return this.s.listOff(u.id); }

  @Post('time-off/preview')
  @HttpCode(200)
  @MobileOp('TO-3 Preview', { dayCount: 2, hoursRequested: 16, balanceBefore: 40, balanceAfter: 24, sufficient: true })
  pv(@CurrentUser() u: AuthUser, @Body() d: D.TimeOffPreviewDto) { return this.s.preview(u.id, d); }

  @Post('time-off')
  @MobileOp('TO-4 Request time off', { id: 'uuid', status: 'PENDING' })
  co(@CurrentUser() u: AuthUser, @Body() d: D.TimeOffCreateDto) { return this.s.createOff(u.id, d); }

  @Post('time-off/:id/cancel')
  @HttpCode(200)
  @MobileOp('TO-5 Cancel pending request', { id: 'uuid', cancelled: true })
  ca(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.cancelOff(u.id, id); }
}

@ApiTags('mobile-notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1/notifications')
export class MobileNotificationsController {
  constructor(private readonly s: MobileNotificationsService) {}

  @Get()
  @MobileOp('NT-1 List', {
    items: [{ id: 'uuid', type: 'NEW_JOB_ASSIGNED', title: 'New job assigned', body: 'WO-100 needs your response.', actionLabel: 'Respond', reference: { type: 'JOB', id: 'assignment-uuid' }, requiresAction: true, resolved: false, read: false, createdAt: '2026-11-07T14:00:00.000Z' }],
    page: 1,
    pageSize: 25,
    total: 1,
    unreadCount: 1,
  })
  list(@CurrentUser() u: AuthUser, @Query() q: D.NotificationsQuery) { return this.s.list(u.id, q); }

  @Get('unread-count')
  @MobileOp('NT-2 Unread count', { unreadCount: 3, actionRequiredCount: 1 })
  uc(@CurrentUser() u: AuthUser) { return this.s.unreadCount(u.id); }

  @Post('read-all')
  @HttpCode(200)
  @MobileOp('NT-4 Mark all read', { updated: 3 })
  all(@CurrentUser() u: AuthUser) { return this.s.markAllRead(u.id); }

  @Post(':id/read')
  @HttpCode(200)
  @MobileOp('NT-3 Mark read', { id: 'uuid', read: true })
  one(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.markRead(u.id, id); }
}
