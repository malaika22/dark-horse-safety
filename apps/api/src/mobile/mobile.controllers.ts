import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import * as D from './dto/mobile.dto';
import { MobileClockService } from './mobile-clock.service';
import { MobileFormsService } from './mobile-forms.service';
import { MobileJobsService } from './mobile-jobs.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileTimeService } from './mobile-time.service';

const Op = (s: string) => ApiOperation({ summary: s });

@ApiTags('mobile-profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileProfileController {
  constructor(private readonly s: MobileProfileService) {}
  @Get('me') @Op('PR-1 Profile') me(@CurrentUser() u: AuthUser) { return this.s.me(u.id); }
  @Patch('me') @Op('PR-2 Update profile') upd(@CurrentUser() u: AuthUser, @Body() d: D.UpdateProfileDto) { return this.s.update(u.id, d); }
  @Put('me/home-location') @Op('PR-3a Set home location (first time)') home(@CurrentUser() u: AuthUser, @Body() d: D.HomeLocationDto) { return this.s.setHome(u.id, d); }
  @Post('me/home-location/change-requests') @Op('PR-3b Request home location change') homeReq(@CurrentUser() u: AuthUser, @Body() d: D.HomeLocationChangeDto) { return this.s.requestHomeChange(u.id, d); }
  @Post('me/change-password') @HttpCode(200) @Op('PR-4 Change password') pw(@CurrentUser() u: AuthUser, @Body() d: D.ChangePasswordDto) { return this.s.changePassword(u.id, d); }
  @Get('me/certifications') @Op('PR-5 Certifications (Phase 2)') certs(@CurrentUser() u: AuthUser) { return this.s.certifications(u.id); }
  @Get('me/equipment') @Op('PR-6 Equipment (Phase 2)') eq(@CurrentUser() u: AuthUser) { return this.s.equipment(u.id); }
  @Patch('me/settings') @Op('PR-7 Settings') set(@CurrentUser() u: AuthUser, @Body() d: D.SettingsDto) { return this.s.settings(u.id, d); }
  @Post('me/location-access-requests') @Op('PR-8 Ask supervisor for location access') loc(@CurrentUser() u: AuthUser, @Body() d: D.NoteDto) { return this.s.locationAccess(u.id, d); }
  @Post('supervisor/messages') @Op('MSG-1 Message supervisor') msg(@CurrentUser() u: AuthUser, @Body() d: D.SupervisorMessageDto) { return this.s.messageSupervisor(u.id, d); }
  @Post('devices') @Op('DV-1 Register device') dev(@CurrentUser() u: AuthUser, @Body() d: D.DeviceDto) { return this.s.registerDevice(u.id, d); }
  @Delete('devices/:deviceId') @Op('DV-2 Unregister device') rmDev(@CurrentUser() u: AuthUser, @Param('deviceId') id: string) { return this.s.removeDevice(u.id, id); }
  @Get('home') @Op('HM-1 Home dashboard') homeDash(@CurrentUser() u: AuthUser, @Query('date') date?: string) { return this.s.home(u.id, date); }
  @Get('on-call') @Op('OC-1 My on-call shifts') oc(@CurrentUser() u: AuthUser, @Query('from') f?: string, @Query('to') t?: string) { return this.s.onCall(u.id, f, t); }
  @Get('on-call/shifts/:id') @Op('OC-2 On-call shift detail') ocOne(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.onCallShift(u.id, id); }
  @Post('on-call/shifts/:id/check-in') @Op('OC-3 On-call check-in') ocIn(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.GeoDto) { return this.s.onCallCheckIn(u.id, id, d); }
}

@ApiTags('mobile-clock')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileClockController {
  constructor(private readonly s: MobileClockService) {}
  @Get('clock/status') @Op('CL-1 Clock status') st(@CurrentUser() u: AuthUser) { return this.s.status(u.id); }
  @Post('clock/in') @HttpCode(200) @Op('CL-2 Clock in') in(@CurrentUser() u: AuthUser, @Body() d: D.ClockInDto) { return this.s.clockIn(u.id, d); }
  @Post('clock/out') @HttpCode(200) @Op('CL-3 Clock out') out(@CurrentUser() u: AuthUser, @Body() d: D.GeoDto) { return this.s.clockOut(u.id, d); }
  @Post('clock/sync') @HttpCode(200) @Op('CL-4 Replay offline events') sync(@CurrentUser() u: AuthUser, @Body() d: D.SyncDto) { return this.s.sync(u.id, d); }
  @Post('clock/gps-explanation') @HttpCode(200) @Op('CL-5 GPS explanation') ex(@CurrentUser() u: AuthUser, @Body() d: D.GpsExplanationDto) { return this.s.explain(u.id, d); }
  @Get('clock/geofence-check') @Op('CL-6 Geofence check') gc(@CurrentUser() u: AuthUser, @Query('workOrderId') w: string, @Query('lat') lat: string, @Query('lng') lng: string) { return this.s.geofenceCheck(u.id, w, Number(lat), Number(lng)); }
  @Post('clock/pause') @HttpCode(200) @Op('CL-7 Pause') pause(@CurrentUser() u: AuthUser, @Body() d: D.PauseDto) { return this.s.pause(u.id, d); }
  @Post('clock/resume') @HttpCode(200) @Op('CL-8 Resume') resume(@CurrentUser() u: AuthUser, @Body() d: D.ResumeDto) { return this.s.resume(u.id, d); }
  @Get('gps-flags') @Op('GF-1 My GPS flags') flags(@CurrentUser() u: AuthUser) { return this.s.flags(u.id); }
  @Get('gps-flags/:id') @Op('GF-2 GPS flag detail') flag(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.flag(u.id, id); }
  @Get('sync/status') @Op('SYNC-1 Sync status') ss(@CurrentUser() u: AuthUser) { return this.s.syncStatus(u.id); }
}

@ApiTags('mobile-jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1/jobs')
export class MobileJobsController {
  constructor(private readonly s: MobileJobsService) {}
  @Get() @Op('JB-1 Jobs list') list(@CurrentUser() u: AuthUser, @Query() q: D.JobsQuery) { return this.s.list(u.id, q); }
  @Get(':id') @Op('JB-2 Job detail') one(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.detail(u.id, id); }
  @Post(':id/accept') @HttpCode(200) @Op('JB-3 Accept') acc(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.Idem) { return this.s.accept(u.id, id, d.clientRequestId); }
  @Post(':id/decline') @HttpCode(200) @Op('JB-4 Decline') dec(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.DeclineDto) { return this.s.decline(u.id, id, d); }
  @Post(':id/request-help') @Op('JB-7 Request help') help(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.NoteDto) { return this.s.requestHelp(u.id, id, d); }
  @Get(':id/closeout') @Op('CO-1 Closeout summary') co(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.closeout(u.id, id); }
  @Post(':id/closeout') @HttpCode(200) @Op('CO-2 Submit closeout') sub(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.CloseoutDto) { return this.s.submitCloseout(u.id, id, d); }
  @Get(':id/closeout/status') @Op('CO-3 Closeout status') cos(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.closeoutStatus(u.id, id); }
  @Post(':id/sales-ticket') @Op('ST-1 Create sales ticket') st(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.SalesTicketDto) { return this.s.createTicket(u.id, id, d); }
  @Put(':id/sales-ticket') @Op('ST-2 Correct sales ticket') st2(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.SalesTicketDto) { return this.s.correctTicket(u.id, id, d); }
}

@ApiTags('mobile-forms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileFormsController {
  constructor(private readonly s: MobileFormsService) {}
  @Get('forms') @Op('FM-1 Forms list') list(@CurrentUser() u: AuthUser, @Query() q: D.FormsQuery) { return this.s.list(u.id, q); }
  @Get('forms/corrections') @Op('FM-6 Correction requests') cor(@CurrentUser() u: AuthUser) { return this.s.corrections(u.id); }
  @Post('forms/corrections/:id/resubmit') @HttpCode(200) @Op('FM-7 Resubmit corrected form') re(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.CorrectionResubmitDto) { return this.s.resubmit(u.id, id, d); }
  @Get('forms/submissions/:id') @Op('FM-5 Submission detail') sub(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.submission(u.id, id); }
  @Get('forms/:formId/template') @Op('FM-2 Form template') tpl(@Param('formId') id: string) { return this.s.template(id); }
  @Put('forms/:formId/draft') @Op('FM-3 Save draft') draft(@CurrentUser() u: AuthUser, @Param('formId') id: string, @Body() d: D.FormSubmitDto) { return this.s.saveDraft(u.id, id, d); }
  @Post('forms/:formId/submissions') @Op('FM-4 Submit form') submit(@CurrentUser() u: AuthUser, @Param('formId') id: string, @Body() d: D.FormSubmitDto) { return this.s.submit(u.id, id, d); }

  @Post('additional-form-requests') @Op('SC-1 Request additional form (scope change)') c(@CurrentUser() u: AuthUser, @Body() d: D.AdditionalFormDto) { return this.s.createAdditional(u.id, d); }
  @Get('additional-form-requests') @Op('SC-2 My additional form requests') l(@CurrentUser() u: AuthUser) { return this.s.listAdditional(u.id); }
  @Get('additional-form-requests/:id') @Op('SC-5 Request detail and timeline') g(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.getAdditional(u.id, id); }
  @Post('additional-form-requests/:id/respond') @HttpCode(200) @Op('SC-4 Reply to more-info request') r(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.AdditionalFormRespondDto) { return this.s.respondAdditional(u.id, id, d); }
}

@ApiTags('mobile-time')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1')
export class MobileTimeController {
  constructor(private readonly s: MobileTimeService) {}
  @Get('pay-cycles') @Op('TS-1 Pay cycles') pc(@CurrentUser() u: AuthUser) { return this.s.payCycles(u.id); }
  @Get('timesheet') @Op('TS-2 Timesheet') ts(@CurrentUser() u: AuthUser, @Query() q: D.TimesheetQuery) { return this.s.timesheet(u.id, q); }
  @Get('timesheet/edit-reasons') @Op('TS-8 Edit reason codes') er(@CurrentUser() u: AuthUser) { void u; return this.s.editReasons(); }
  @Get('timesheet/entries/:id') @Op('TS-3 Entry detail') en(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.entryDetail(u.id, id); }
  @Put('timesheet/entries/:id/notes') @Op('TS-7 Save entry note') nt(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.EntryNotesDto) { return this.s.saveNote(u.id, id, d); }
  @Post('time-edit-requests') @Op('TS-4 Request time edit') ce(@CurrentUser() u: AuthUser, @Body() d: D.EditRequestDto) { return this.s.createEdit(u.id, d); }
  @Get('time-edit-requests') @Op('TS-5 My edit requests') le(@CurrentUser() u: AuthUser) { return this.s.listEdits(u.id); }
  @Post('time-edit-requests/:id/respond') @HttpCode(200) @Op('TS-6 Reply to clarification') re(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: D.EditRespondDto) { return this.s.respondEdit(u.id, id, d); }
  @Get('time-off/balances') @Op('TO-1 Balances') b(@CurrentUser() u: AuthUser) { return this.s.balances(u.id); }
  @Get('time-off') @Op('TO-2 My requests') lo(@CurrentUser() u: AuthUser) { return this.s.listOff(u.id); }
  @Post('time-off/preview') @HttpCode(200) @Op('TO-3 Preview') pv(@CurrentUser() u: AuthUser, @Body() d: D.TimeOffPreviewDto) { return this.s.preview(u.id, d); }
  @Post('time-off') @Op('TO-4 Request time off') co(@CurrentUser() u: AuthUser, @Body() d: D.TimeOffCreateDto) { return this.s.createOff(u.id, d); }
  @Post('time-off/:id/cancel') @HttpCode(200) @Op('TO-5 Cancel pending request') ca(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.cancelOff(u.id, id); }
}

@ApiTags('mobile-notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1/notifications')
export class MobileNotificationsController {
  constructor(private readonly s: MobileNotificationsService) {}
  @Get() @Op('NT-1 List') list(@CurrentUser() u: AuthUser, @Query() q: D.NotificationsQuery) { return this.s.list(u.id, q); }
  @Get('unread-count') @Op('NT-2 Unread count') uc(@CurrentUser() u: AuthUser) { return this.s.unreadCount(u.id); }
  @Post('read-all') @HttpCode(200) @Op('NT-4 Mark all read') all(@CurrentUser() u: AuthUser) { return this.s.markAllRead(u.id); }
  @Post(':id/read') @HttpCode(200) @Op('NT-3 Mark read') one(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.s.markRead(u.id, id); }
}
