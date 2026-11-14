import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import {
  CompanyProfileDto,
  GlobalDefaultsDto,
  AccessRoleDto,
  AccessTeamDto,
  AccessUserDto,
  AddTeamMemberDto,
  DeactivateUserDto,
  FormDraftDto,
  NotificationChannelsDto,
  OnCallRulesDto,
  DeviceIdsDto,
  DiscardItemDto,
  PayrollRulesDto,
  ReorderIdsDto,
  ResetDeviceDto,
  StepDoneDto,
  TimeCategoryDto,
  UpdateBusinessRuleDto,
  UpdateRecipientsDto,
  UpdateRetentionClassDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('company-profile')
  @ApiOperation({ summary: 'Company profile used on OSHA packets and report headers' })
  company() {
    return this.settings.companyProfile();
  }

  @Put('company-profile')
  @ApiOperation({ summary: 'Save the company profile' })
  saveCompany(@Body() dto: CompanyProfileDto) {
    return this.settings.saveCompanyProfile(dto);
  }

  @Get('business-rules')
  @ApiOperation({ summary: 'Business rule registry and summary counts' })
  rules(@Query('q') q?: string, @Query('domain') domain?: string, @Query('status') status?: string) {
    return this.settings.businessRules(q, domain, status);
  }

  @Patch('business-rules/:id')
  @ApiOperation({ summary: 'Update a business rule status or owner' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateBusinessRuleDto) {
    return this.settings.updateBusinessRule(id, dto);
  }

  @Get('overrides')
  @ApiOperation({ summary: 'Immutable override log' })
  overrides(@Query('q') q?: string, @Query('domain') domain?: string, @Query('days') days?: string) {
    return this.settings.overrides(q, domain, days);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Data retention policy and record classes' })
  retention() {
    return this.settings.retention();
  }

  @Patch('retention/:id')
  @ApiOperation({ summary: 'Edit one retention class' })
  updateRetention(@Param('id') id: string, @Body() dto: UpdateRetentionClassDto) {
    return this.settings.updateRetentionClass(id, dto);
  }

  @Post('retention/preview')
  @ApiOperation({ summary: 'Preview how many record classes a policy change affects' })
  preview() {
    return this.settings.previewRetention();
  }

  @Post('retention/publish')
  @ApiOperation({ summary: 'Publish the retention policy' })
  publish() {
    return this.settings.publishRetention();
  }

  @Get('global-defaults')
  @ApiOperation({ summary: 'Fallback values used when no customer or job rule applies' })
  defaults() {
    return this.settings.globalDefaults();
  }

  @Put('global-defaults')
  @ApiOperation({ summary: 'Save global defaults' })
  saveDefaults(@Body() dto: GlobalDefaultsDto) {
    return this.settings.saveGlobalDefaults(dto);
  }

  @Get('notification-recipients')
  @ApiOperation({ summary: 'Global notification recipient routes' })
  recipients() {
    return this.settings.recipients();
  }

  @Put('notification-recipients')
  @ApiOperation({ summary: 'Save notification recipient routes' })
  saveRecipients(@Body() dto: UpdateRecipientsDto) {
    return this.settings.saveRecipients(dto);
  }

  @Get('time-categories')
  @ApiOperation({ summary: 'Payroll time categories' })
  timeCategories() {
    return this.settings.timeCategories();
  }

  @Post('time-categories')
  @ApiOperation({ summary: 'Add a time category' })
  createTimeCategory(@Body() dto: TimeCategoryDto) {
    return this.settings.createTimeCategory(dto);
  }

  @Put('time-categories/order')
  @ApiOperation({ summary: 'Reorder time categories' })
  reorderTimeCategories(@Body() dto: ReorderIdsDto) {
    return this.settings.reorderTimeCategories(dto);
  }

  @Patch('time-categories/:id')
  @ApiOperation({ summary: 'Update a time category' })
  updateTimeCategory(@Param('id') id: string, @Body() dto: TimeCategoryDto) {
    return this.settings.updateTimeCategory(id, dto);
  }

  @Delete('time-categories/:id')
  @ApiOperation({ summary: 'Delete a time category that has no logged entries' })
  deleteTimeCategory(@Param('id') id: string) {
    return this.settings.deleteTimeCategory(id);
  }

  @Get('payroll-rules')
  @ApiOperation({ summary: 'Pay cycle, rounding, and ADP export settings' })
  payrollRules() {
    return this.settings.payrollRules();
  }

  @Put('payroll-rules')
  @ApiOperation({ summary: 'Save payroll rules' })
  savePayrollRules(@Body() dto: PayrollRulesDto) {
    return this.settings.savePayrollRules(dto);
  }

  @Post('payroll-rules/export')
  @ApiOperation({ summary: 'Record an ADP payroll export' })
  exportPayroll() {
    return this.settings.exportPayroll();
  }

  @Get('mobile-sync')
  @ApiOperation({ summary: 'Field device sync status' })
  mobileSync(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('sort') sort?: string,
    @Query('pageSize') pageSize?: string,
    @Query('crew') crew?: string,
    @Query('version') version?: string,
  ) {
    return this.settings.mobileSync(q, status, Number(page) || 1, sort, Number(pageSize) || 8, crew, version);
  }

  @Get('mobile-sync/errors/:code')
  @ApiOperation({ summary: 'Mobile sync error detail' })
  syncIncident(@Param('code') code: string) {
    return this.settings.syncIncident(code);
  }

  @Patch('mobile-sync/errors/:code/steps/:stepId')
  @ApiOperation({ summary: 'Check or clear a resolution step' })
  setIncidentStep(@Param('code') code: string, @Param('stepId') stepId: string, @Body() dto: StepDoneDto) {
    return this.settings.setIncidentStep(code, stepId, dto.done);
  }

  @Post('mobile-sync/errors/:code/retry')
  @ApiOperation({ summary: 'Retry the failed sync item' })
  retryIncident(@Param('code') code: string) {
    return this.settings.retryIncident(code);
  }

  @Post('mobile-sync/errors/:code/discard')
  @ApiOperation({ summary: 'Discard a failed sync item' })
  discardIncident(@Param('code') code: string, @Body() dto: DiscardItemDto) {
    return this.settings.discardIncident(code, dto.reason);
  }

  @Post('mobile-sync/force')
  @ApiOperation({ summary: 'Force sync devices that need attention' })
  forceSyncAll(@Body() dto: DeviceIdsDto) {
    return this.settings.forceSyncAll(dto.ids);
  }

  @Post('mobile-sync/contact')
  @ApiOperation({ summary: 'Queue a message to the selected technicians' })
  contactTechnicians(@Body() dto: DeviceIdsDto) {
    return this.settings.contactTechnicians(dto.ids ?? []);
  }

  @Post('mobile-sync/:id/force')
  @ApiOperation({ summary: 'Force sync one device' })
  forceSyncDevice(@Param('id') id: string) {
    return this.settings.forceSyncDevice(id);
  }

  @Get('mobile-sync/:id/history')
  @ApiOperation({ summary: 'Device sync history' })
  deviceHistory(@Param('id') id: string) {
    return this.settings.deviceHistory(id);
  }

  @Post('mobile-sync/:id/reset')
  @ApiOperation({ summary: 'Reset a field device queue' })
  resetDevice(@Param('id') id: string, @Body() dto: ResetDeviceDto) {
    return this.settings.resetDevice(id, dto.reason);
  }

  @Post('mobile-sync/:id/contact')
  @ApiOperation({ summary: 'Queue a message to the technician on a device' })
  contactTechnician(@Param('id') id: string) {
    return this.settings.contactTechnician(id);
  }

  @Get('access/users')
  @ApiOperation({ summary: 'Access control user directory' })
  accessUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('team') team?: string,
    @Query('status') status?: string,
    @Query('mfa') mfa?: string,
    @Query('mobile') mobile?: string,
    @Query('page') page?: string,
    @Query('sort') sort?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.settings.accessUsers(q, role, team, status, mfa, mobile, Number(page) || 1, sort, Number(pageSize) || 8);
  }

  @Post('access/users')
  @ApiOperation({ summary: 'Invite a user' })
  createAccessUser(@Body() dto: AccessUserDto) {
    return this.settings.createAccessUser(dto);
  }

  @Get('access/users/:id')
  @ApiOperation({ summary: 'Access control user' })
  accessUser(@Param('id') id: string) {
    return this.settings.accessUser(id);
  }

  @Patch('access/users/:id')
  @ApiOperation({ summary: 'Update an access control user' })
  updateAccessUser(@Param('id') id: string, @Body() dto: AccessUserDto) {
    return this.settings.updateAccessUser(id, dto);
  }

  @Post('access/users/:id/deactivate')
  deactivateAccessUser(@Param('id') id: string, @Body() dto: DeactivateUserDto) {
    return this.settings.deactivateAccessUser(id, dto.reason);
  }

  @Post('access/users/:id/reactivate')
  reactivateAccessUser(@Param('id') id: string, @Body() dto: DeactivateUserDto) {
    return this.settings.reactivateAccessUser(id, dto.reason);
  }

  @Delete('access/users/:id')
  deleteAccessUser(@Param('id') id: string) {
    return this.settings.deleteAccessUser(id);
  }

  @Post('access/users/:id/reset-password')
  resetAccessPassword(@Param('id') id: string) {
    return this.settings.resetAccessPassword(id);
  }

  @Post('access/users/:id/resend-invite')
  resendAccessInvite(@Param('id') id: string) {
    return this.settings.resendAccessInvite(id);
  }

  @Post('access/users/:id/cancel-invite')
  cancelAccessInvite(@Param('id') id: string) {
    return this.settings.cancelAccessInvite(id);
  }

  @Post('access/users/:id/preview')
  previewAccessUser(@Param('id') id: string) {
    return this.settings.previewAccessUser(id);
  }

  @Get('access/teams')
  @ApiOperation({ summary: 'Team access directory' })
  accessTeams(
    @Query('q') q?: string,
    @Query('region') region?: string,
    @Query('access') access?: string,
    @Query('owner') owner?: string,
    @Query('kind') kind?: string,
    @Query('sort') sort?: string,
  ) {
    return this.settings.accessTeams(q, region, access, owner, kind, sort);
  }

  @Post('access/teams')
  @ApiOperation({ summary: 'Add a team' })
  createAccessTeam(@Body() dto: AccessTeamDto) {
    return this.settings.createAccessTeam(dto);
  }

  @Get('access/roles')
  @ApiOperation({ summary: 'Access control roles' })
  accessRoles() {
    return this.settings.accessRoles();
  }

  @Post('access/roles')
  @ApiOperation({ summary: 'Create a custom role' })
  createAccessRole(@Body() dto: AccessRoleDto) {
    return this.settings.createAccessRole(dto);
  }

  @Patch('access/roles/:code')
  @ApiOperation({ summary: 'Update a role' })
  saveAccessRole(@Param('code') code: string, @Body() dto: AccessRoleDto) {
    return this.settings.saveAccessRole(code, dto);
  }

  @Patch('access/teams/:id')
  @ApiOperation({ summary: 'Update a team' })
  updateAccessTeam(@Param('id') id: string, @Body() dto: AccessTeamDto) {
    return this.settings.updateAccessTeam(id, dto);
  }

  @Post('access/teams/:id/members')
  @ApiOperation({ summary: 'Add a team member' })
  addTeamMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.settings.addTeamMember(id, dto);
  }

  @Get('on-call-rules')
  @ApiOperation({ summary: 'On-call rotation rules' })
  onCallRules() {
    return this.settings.onCallRules();
  }

  @Put('on-call-rules')
  @ApiOperation({ summary: 'Save on-call rotation rules' })
  saveOnCallRules(@Body() dto: OnCallRulesDto) {
    return this.settings.saveOnCallRules(dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notification channel preferences' })
  notificationPreferences() {
    return this.settings.notificationPreferences();
  }

  @Patch('notifications/:code')
  @ApiOperation({ summary: 'Update notification channels' })
  saveNotificationPreference(@Param('code') code: string, @Body() dto: NotificationChannelsDto) {
    return this.settings.saveNotificationPreference(code, dto);
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Data integrations' })
  dataIntegrations() {
    return this.settings.dataIntegrations();
  }

  @Get('forms/library')
  @ApiOperation({ summary: 'Form template library' })
  formLibrary(@Query('category') category?: string) {
    return this.settings.formLibrary(category);
  }

  @Get('forms/submissions')
  @ApiOperation({ summary: 'Form submissions' })
  formSubmissions(@Query('q') q?: string, @Query('review') review?: string) {
    return this.settings.formSubmissions(q, review);
  }

  @Post('forms/submissions/mark-reviewed')
  @ApiOperation({ summary: 'Mark pending submissions reviewed' })
  markSubmissionsReviewed() {
    return this.settings.markSubmissionsReviewed();
  }

  @Get('forms/rules')
  @ApiOperation({ summary: 'Required form rules' })
  formRules(@Query('q') q?: string, @Query('windows') windows?: string) {
    return this.settings.formRules(q, windows);
  }

  @Get('forms/archived')
  @ApiOperation({ summary: 'Archived GoCanvas forms' })
  archivedCanvases(@Query('q') q?: string, @Query('windows') windows?: string) {
    return this.settings.archivedCanvases(q, windows);
  }

  @Post('forms/archived/:id/restore')
  @ApiOperation({ summary: 'Restore an archived GoCanvas form' })
  restoreArchivedCanvas(@Param('id') id: string) {
    return this.settings.restoreArchivedCanvas(id);
  }

  @Get('forms/builder')
  @ApiOperation({ summary: 'Current form draft' })
  formDraft() {
    return this.settings.formDraft();
  }

  @Post('forms/builder')
  @ApiOperation({ summary: 'Generate a form template from the builder' })
  saveFormDraft(@Body() dto: FormDraftDto) {
    return this.settings.saveFormDraft(dto);
  }

  @Get('access/audit')
  @ApiOperation({ summary: 'Access control audit log' })
  accessAudit(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('result') result?: string,
    @Query('severity') severity?: string,
    @Query('actor') actor?: string,
    @Query('range') range?: string,
    @Query('chip') chip?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
  ) {
    return this.settings.accessAudit(q, type, result, severity, actor, range, chip, Number(page) || 1, Number(pageSize) || 8, sort || 'RECENT');
  }
}
