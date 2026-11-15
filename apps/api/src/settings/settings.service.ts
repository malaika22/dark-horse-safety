import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_ROLE_DEFS, ACCESS_TEAMS, ACCESS_USERS, ROLE_CHANGED_DRAWER, TEAM_PROFILES, buildAuditEvents } from './access.defaults';
import { ARCHIVED_CANVASES, DATA_INTEGRATIONS, FORM_DRAFT, FORM_LIBRARY_STAT, FORM_RULES, FORM_SUBMISSIONS, FORM_TEMPLATES, NOTIFICATION_PREFERENCES, ON_CALL_RULES } from './forms.defaults';
import {
  DEVICE_EXTRAS,
  MARTINEZ_QUEUE,
  REED_HISTORY,
  RESET_REASONS,
  SYNC_ERROR_CASES,
  SYNC_INCIDENTS,
} from './mobile-sync.defaults';
import {
  BUSINESS_RULES,
  COMPANY_PROFILE,
  FIELD_DEVICES,
  GLOBAL_DEFAULTS,
  PAYROLL_RULES,
  RECIPIENTS,
  REED_QUEUE,
  RETENTION_CLASSES,
  RETENTION_NOTE,
  RULE_OVERRIDES,
  TIME_CATEGORIES,
} from './settings.defaults';
import {
  AccessRoleDto,
  AccessTeamDto,
  AccessUserDto,
  AddTeamMemberDto,
  FormDraftDto,
  NotificationChannelsDto,
  OnCallRulesDto,
  CompanyProfileDto,
  GlobalDefaultsDto,
  PayrollRulesDto,
  ReorderIdsDto,
  TimeCategoryDto,
  UpdateBusinessRuleDto,
  UpdateRecipientsDto,
  UpdateRetentionClassDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensure() {
    const profile = await this.prisma.companyProfile.findUnique({ where: { id: 'default' } });
    if (!profile) {
      await this.prisma.companyProfile.create({ data: COMPANY_PROFILE });
    }
    if ((await this.prisma.businessRule.count()) === 0) {
      await this.prisma.businessRule.createMany({ data: BUSINESS_RULES });
    }
    if ((await this.prisma.ruleOverride.count()) === 0) {
      await this.prisma.ruleOverride.createMany({ data: RULE_OVERRIDES });
    }
    const policy = await this.prisma.retentionPolicy.findUnique({ where: { id: 'default' } });
    if (!policy) {
      await this.prisma.retentionPolicy.create({
        data: { id: 'default', status: 'DRAFT', note: RETENTION_NOTE },
      });
    }
    if ((await this.prisma.retentionClass.count()) === 0) {
      await this.prisma.retentionClass.createMany({ data: RETENTION_CLASSES });
    }
    const defaults = await this.prisma.globalDefaults.findUnique({ where: { id: 'default' } });
    if (!defaults) {
      await this.prisma.globalDefaults.create({ data: GLOBAL_DEFAULTS });
    }
    if ((await this.prisma.notificationRecipient.count()) === 0) {
      await this.prisma.notificationRecipient.createMany({ data: RECIPIENTS });
    }
    if ((await this.prisma.timeCategory.count()) === 0) {
      await this.prisma.timeCategory.createMany({ data: TIME_CATEGORIES });
    }
    const payroll = await this.prisma.payrollRules.findUnique({ where: { id: 'default' } });
    if (!payroll) {
      await this.prisma.payrollRules.create({ data: PAYROLL_RULES });
    }
    if ((await this.prisma.fieldDevice.count()) === 0) {
      await this.prisma.fieldDevice.createMany({
        data: FIELD_DEVICES.map((device) => ({ ...device, ...DEVICE_EXTRAS[device.code] })),
      });
      const reed = await this.prisma.fieldDevice.findUnique({ where: { code: 'DEV-0712' } });
      if (reed) {
        await this.prisma.fieldDeviceQueueItem.createMany({
          data: REED_QUEUE.map((item) => ({ ...item, errorCode: 'errorCode' in item ? item.errorCode : null, deviceId: reed.id })),
        });
      }
      const martinez = await this.prisma.fieldDevice.findUnique({ where: { code: 'DEV-0203' } });
      if (martinez) {
        await this.prisma.fieldDeviceQueueItem.create({ data: { ...MARTINEZ_QUEUE, deviceId: martinez.id } });
      }
    }
    await this.seedMobileSyncExtras();
    if ((await this.prisma.accessUser.count()) === 0) {
      await this.prisma.accessUser.createMany({ data: ACCESS_USERS });
    }
    if ((await this.prisma.accessTeam.count()) === 0) {
      await this.prisma.accessTeam.createMany({ data: ACCESS_TEAMS });
    }
    if ((await this.prisma.accessRole.count()) === 0) {
      const updatedAt = new Date();
      await this.prisma.accessRole.createMany({ data: ACCESS_ROLE_DEFS.map((role) => ({ ...role, updatedAt })) });
    }
    if ((await this.prisma.accessAuditEvent.count()) === 0) {
      await this.prisma.accessAuditEvent.createMany({ data: buildAuditEvents() });
    }
    await this.prisma.accessAuditEvent.updateMany({
      where: { action: 'ROLE CHANGED', drawer: '' },
      data: { drawer: ROLE_CHANGED_DRAWER },
    });
    const blankTeams = await this.prisma.accessTeam.findMany({ where: { profile: '' } });
    for (const team of blankTeams) {
      const profile = TEAM_PROFILES[team.code] ?? JSON.stringify({
        subtitle: `${team.kind === 'FIELD' ? 'FIELD CREW' : 'HQ TEAM'} · ${team.region} · ${team.access} ACCESS`,
        ownerRole: 'SUPERVISOR',
        accessNote: team.access === 'CUSTOM' ? 'CUSTOM ACCESS' : 'STANDARD · ROLE DEFAULTS',
        members: [{ name: team.lead, role: 'LEAD', note: '', status: 'ACTIVE' }],
        moduleAccess: team.modules,
        dashboards: team.dashboards,
        mobile: team.kind === 'FIELD' ? 'ENABLED FOR ALL MEMBERS' : '',
        custom: [],
      });
      await this.prisma.accessTeam.update({ where: { id: team.id }, data: { profile } });
    }
    if ((await this.prisma.onCallRules.count()) === 0) {
      await this.prisma.onCallRules.create({ data: ON_CALL_RULES });
    }
    if ((await this.prisma.formLibraryStat.count()) === 0) {
      await this.prisma.formLibraryStat.create({ data: FORM_LIBRARY_STAT });
    }
    if ((await this.prisma.formTemplate.count()) === 0) {
      await this.prisma.formTemplate.createMany({ data: FORM_TEMPLATES });
    }
    if ((await this.prisma.formSubmission.count()) === 0) {
      await this.prisma.formSubmission.createMany({ data: FORM_SUBMISSIONS });
    }
    if ((await this.prisma.settingsFormRule.count()) === 0) {
      await this.prisma.settingsFormRule.createMany({ data: FORM_RULES });
    }
    if ((await this.prisma.archivedCanvas.count()) === 0) {
      await this.prisma.archivedCanvas.createMany({ data: ARCHIVED_CANVASES });
    }
    if ((await this.prisma.formDraft.count()) === 0) {
      await this.prisma.formDraft.create({ data: FORM_DRAFT });
    }
    if ((await this.prisma.notificationPreference.count()) === 0) {
      const updatedAt = new Date();
      await this.prisma.notificationPreference.createMany({ data: NOTIFICATION_PREFERENCES.map((row) => ({ ...row, updatedAt })) });
    }
    if ((await this.prisma.dataIntegration.count()) === 0) {
      await this.prisma.dataIntegration.createMany({ data: DATA_INTEGRATIONS });
    }
  }

  private async seedMobileSyncExtras() {
    const bare = await this.prisma.fieldDevice.findMany({ where: { phone: null } });
    for (const row of bare) {
      const extra = DEVICE_EXTRAS[row.code];
      if (extra) await this.prisma.fieldDevice.update({ where: { id: row.id }, data: extra });
    }
    if ((await this.prisma.syncErrorCase.count()) === 0) {
      await this.prisma.syncErrorCase.createMany({ data: SYNC_ERROR_CASES });
    }
    if ((await this.prisma.syncIncident.count()) === 0) {
      for (const incident of SYNC_INCIDENTS) {
        const device = await this.prisma.fieldDevice.findUnique({ where: { code: incident.deviceCode } });
        if (!device) continue;
        const { deviceCode: _deviceCode, items, steps, attempts, ...rest } = incident;
        await this.prisma.syncIncident.create({
          data: { ...rest, deviceId: device.id, items: { create: items }, steps: { create: steps }, attempts: { create: attempts } },
        });
      }
    }
    if ((await this.prisma.deviceHistoryEvent.count()) === 0) {
      const reed = await this.prisma.fieldDevice.findUnique({ where: { code: 'DEV-0712' } });
      if (reed) {
        await this.prisma.deviceHistoryEvent.createMany({
          data: REED_HISTORY.map((event) => ({ ...event, deviceId: reed.id })),
        });
      }
    }
    const photo = await this.prisma.fieldDeviceQueueItem.findFirst({
      where: { errorLabel: { startsWith: 'MS-413' }, errorCode: null },
    });
    if (photo) await this.prisma.fieldDeviceQueueItem.update({ where: { id: photo.id }, data: { errorCode: 'MS-413' } });
    await this.prisma.fieldDevice.updateMany({
      where: { code: 'DEV-0808', deviceId: 'DH-IPD-0808' },
      data: { deviceId: 'DH-IPD-0807' },
    });
    const timeout = await this.prisma.syncIncident.findUnique({ where: { code: 'MS-504' } });
    if (timeout && !timeout.message.includes('30 S')) {
      await this.prisma.syncIncident.delete({ where: { id: timeout.id } });
    }
    if (!(await this.prisma.syncIncident.findUnique({ where: { code: 'MS-504' } }))) {
      const spec = SYNC_INCIDENTS.find((incident) => incident.code === 'MS-504');
      const hollis = await this.prisma.fieldDevice.findUnique({ where: { code: 'DEV-0808' } });
      if (spec && hollis) {
        const { deviceCode: _deviceCode, items, steps, attempts, ...rest } = spec;
        await this.prisma.syncIncident.create({
          data: { ...rest, deviceId: hollis.id, items: { create: items }, steps: { create: steps }, attempts: { create: attempts } },
        });
      }
    }
  }

  async companyProfile() {
    await this.ensure();
    const row = await this.prisma.companyProfile.findUniqueOrThrow({ where: { id: 'default' } });
    return { data: row };
  }

  async saveCompanyProfile(dto: CompanyProfileDto) {
    await this.ensure();
    const row = await this.prisma.companyProfile.update({ where: { id: 'default' }, data: dto });
    return { data: row };
  }

  async businessRules(q?: string, domain?: string, status?: string) {
    await this.ensure();
    const where: Prisma.BusinessRuleWhereInput = {};
    if (domain && domain !== 'ALL') where.domain = domain;
    if (status && status !== 'ALL') where.status = status;
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { area: { contains, mode: 'insensitive' } },
        { source: { contains, mode: 'insensitive' } },
        { owner: { contains, mode: 'insensitive' } },
        { appliesTo: { contains, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.businessRule.findMany({ where, orderBy: { sortOrder: 'asc' } });
    const all = await this.prisma.businessRule.findMany();
    return {
      data: {
        items,
        summary: {
          activeRules: all.filter((row) => row.status === 'ACTIVE').length,
          hardGates: all.filter((row) => row.hardGate).length,
          customerOverrides: all.filter((row) => row.customerOverride).length,
          pendingReview: all.filter((row) => row.pendingReview).length,
        },
        domains: ['ALL', ...new Set(all.map((row) => row.domain))],
      },
    };
  }

  async updateBusinessRule(id: string, dto: UpdateBusinessRuleDto) {
    await this.ensure();
    const existing = await this.prisma.businessRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Business rule not found');
    const status = dto.status ?? existing.status;
    const row = await this.prisma.businessRule.update({
      where: { id },
      data: {
        ...dto,
        pendingReview: status === 'REVIEW',
        statusLabel: dto.statusLabel ?? (status === 'REVIEW' ? 'REVIEW' : 'ACTIVE'),
      },
    });
    return { data: row };
  }

  async overrides(q?: string, domain?: string, days?: string) {
    await this.ensure();
    const where: Prisma.RuleOverrideWhereInput = {};
    const window = Number(days);
    if (Number.isFinite(window) && window > 0) {
      where.occurredAt = { gte: new Date(Date.now() - window * 86_400_000) };
    }
    if (domain && domain !== 'ALL') where.domain = domain;
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { record: { contains, mode: 'insensitive' } },
        { ruleDomain: { contains, mode: 'insensitive' } },
        { approvedBy: { contains, mode: 'insensitive' } },
        { change: { contains, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.ruleOverride.findMany({ where, orderBy: { occurredAt: 'desc' } });
    const domains = await this.prisma.ruleOverride.findMany({ select: { domain: true }, distinct: ['domain'] });
    return { data: { items, domains: ['ALL', ...domains.map((row) => row.domain)] } };
  }

  async retention() {
    await this.ensure();
    const [policy, items] = await Promise.all([
      this.prisma.retentionPolicy.findUniqueOrThrow({ where: { id: 'default' } }),
      this.prisma.retentionClass.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return { data: { policy, items } };
  }

  async updateRetentionClass(id: string, dto: UpdateRetentionClassDto) {
    await this.ensure();
    const existing = await this.prisma.retentionClass.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Retention class not found');
    if (existing.locked) throw new BadRequestException('This retention class is locked');
    const row = await this.prisma.retentionClass.update({ where: { id }, data: dto });
    return { data: row };
  }

  async previewRetention() {
    await this.ensure();
    const items = await this.prisma.retentionClass.findMany();
    const editable = items.filter((row) => !row.locked);
    return {
      data: {
        affectedClasses: editable.length,
        lockedClasses: items.length - editable.length,
        message: `A policy change would recalculate expiry for ${editable.length} record classes. ${items.length - editable.length} class stays locked under legal hold.`,
      },
    };
  }

  async publishRetention() {
    await this.ensure();
    const policy = await this.prisma.retentionPolicy.update({
      where: { id: 'default' },
      data: { status: 'PUBLISHED' },
    });
    const items = await this.prisma.retentionClass.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { policy, items } };
  }

  async globalDefaults() {
    await this.ensure();
    const row = await this.prisma.globalDefaults.findUniqueOrThrow({ where: { id: 'default' } });
    return { data: row };
  }

  async saveGlobalDefaults(dto: GlobalDefaultsDto) {
    await this.ensure();
    const row = await this.prisma.globalDefaults.update({ where: { id: 'default' }, data: dto });
    return { data: row };
  }

  async recipients() {
    await this.ensure();
    const items = await this.prisma.notificationRecipient.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { items, scope: 'GLOBAL DEFAULTS' } };
  }

  async saveRecipients(dto: UpdateRecipientsDto) {
    await this.ensure();
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.notificationRecipient.update({
          where: { id: item.id },
          data: {
            primary: item.primary,
            ccEscalate: item.ccEscalate,
            channel: item.channel,
            trigger: item.trigger,
          },
        }),
      ),
    );
    return this.recipients();
  }

  async timeCategories() {
    await this.ensure();
    const items = await this.prisma.timeCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { items } };
  }

  async createTimeCategory(dto: TimeCategoryDto) {
    await this.ensure();
    const count = await this.prisma.timeCategory.count();
    const row = await this.prisma.timeCategory.create({
      data: {
        code: `TC-${Date.now().toString(36).toUpperCase()}`,
        name: dto.name.trim().toUpperCase(),
        entryCount: 0,
        paid: dto.paid,
        billable: dto.billable,
        countsToOt: dto.countsToOt,
        payrollCode: dto.payrollCode,
        sortOrder: count + 1,
      },
    });
    return { data: row };
  }

  async updateTimeCategory(id: string, dto: TimeCategoryDto) {
    await this.ensure();
    const existing = await this.prisma.timeCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Time category not found');
    const row = await this.prisma.timeCategory.update({
      where: { id },
      data: {
        name: dto.name.trim().toUpperCase(),
        paid: dto.paid,
        billable: dto.billable,
        countsToOt: dto.countsToOt,
        payrollCode: dto.payrollCode,
      },
    });
    return { data: row };
  }

  async deleteTimeCategory(id: string) {
    await this.ensure();
    const existing = await this.prisma.timeCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Time category not found');
    if (existing.entryCount > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_IN_USE',
        message: `Cannot delete — ${existing.entryCount} entries use this category`,
      });
    }
    await this.prisma.timeCategory.delete({ where: { id } });
    return { data: { id } };
  }

  async reorderTimeCategories(dto: ReorderIdsDto) {
    await this.ensure();
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.timeCategory.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
    return this.timeCategories();
  }

  async payrollRules() {
    await this.ensure();
    const row = await this.prisma.payrollRules.findUniqueOrThrow({ where: { id: 'default' } });
    return { data: row };
  }

  async savePayrollRules(dto: PayrollRulesDto) {
    await this.ensure();
    const row = await this.prisma.payrollRules.update({ where: { id: 'default' }, data: dto });
    return { data: row };
  }

  async exportPayroll() {
    await this.ensure();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const lastExportDate = `${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
    const row = await this.prisma.payrollRules.update({
      where: { id: 'default' },
      data: { lastExportDate },
    });
    return { data: row };
  }

  async mobileSync(
    q?: string,
    status?: string,
    page = 1,
    sort = 'ATTENTION',
    pageSize = 8,
    crew?: string,
    version?: string,
  ) {
    await this.ensure();
    const size = Math.min(100, Math.max(1, pageSize || 8));
    const latestVersion = 'V3.8.2';
    const where: Prisma.FieldDeviceWhereInput = {};
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { technician: { contains, mode: 'insensitive' } },
        { deviceId: { contains, mode: 'insensitive' } },
        { truck: { contains, mode: 'insensitive' } },
      ];
    }
    if (status === 'QUEUED') where.queued = { gt: 0 };
    else if (status && status !== 'ALL') {
      where.status = status === 'NEEDS_ATTENTION' ? { in: ['OFFLINE', 'ITEM_FAILED', 'SYNCING'] } : status;
    }
    if (crew && crew !== 'ALL') where.crew = crew;
    if (version === 'LATEST') where.appVersion = latestVersion;
    if (version === 'OUTDATED') where.appVersion = { not: latestVersion };
    const rows = await this.prisma.fieldDevice.findMany({
      where,
      include: {
        queueItems: { orderBy: { sortOrder: 'asc' } },
        incidents: { select: { code: true } },
      },
    });
    const rank: Record<string, number> = { OFFLINE: 0, ITEM_FAILED: 1, SYNCING: 2, UP_TO_DATE: 3 };
    rows.sort((a, b) => {
      if (sort === 'TECHNICIAN') return a.technician.localeCompare(b.technician);
      if (sort === 'DEVICE_ID') return a.deviceId.localeCompare(b.deviceId);
      if (sort === 'LAST_SYNC') return a.syncAge - b.syncAge;
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.sortOrder - b.sortOrder;
    });
    const current = Math.max(1, page);
    const start = (current - 1) * size;
    const crews = await this.prisma.fieldDevice.findMany({ select: { crew: true }, distinct: ['crew'], orderBy: { crew: 'asc' } });
    return {
      data: {
        items: rows.slice(start, start + size),
        summary: await this.deviceSummary(),
        crews: crews.map((row) => row.crew).filter((value): value is string => Boolean(value)),
        latestVersion,
        resetReasons: [...RESET_REASONS],
        page: current,
        pageSize: size,
        total: rows.length,
      },
    };
  }

  async forceSyncAll(ids?: string[]) {
    await this.ensure();
    const devices = await this.prisma.fieldDevice.findMany({
      where: ids?.length ? { id: { in: ids } } : { status: { not: 'UP_TO_DATE' } },
    });
    const started: string[] = [];
    const deferred: string[] = [];
    for (const device of devices) {
      if (device.status === 'OFFLINE') {
        await this.noteForceSync(device.id);
        deferred.push(device.deviceId);
      } else {
        await this.applyForceSync(device.id);
        started.push(`${device.technician} · ${device.deviceId}`);
      }
    }
    const page = await this.mobileSync();
    return { data: { ...page.data, started, deferred } };
  }

  async forceSyncDevice(id: string) {
    await this.ensure();
    const device = await this.prisma.fieldDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    const deferred = device.status === 'OFFLINE';
    if (deferred) await this.noteForceSync(device.id);
    else await this.applyForceSync(device.id);
    return { data: { deferred, technician: device.technician, deviceId: device.deviceId } };
  }

  async resetDevice(id: string, reason: string) {
    await this.ensure();
    if (!RESET_REASONS.includes(reason as (typeof RESET_REASONS)[number])) {
      throw new BadRequestException({ code: 'RESET_REASON_REQUIRED', message: 'Choose a reset reason' });
    }
    const existing = await this.prisma.fieldDevice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Device not found');
    await this.prisma.deviceReset.create({ data: { deviceId: id, reason, actorName: 'R. CRAWFORD' } });
    await this.prisma.fieldDeviceQueueItem.deleteMany({ where: { deviceId: id } });
    await this.prisma.fieldDevice.update({
      where: { id },
      data: {
        status: 'UP_TO_DATE',
        statusLabel: 'UP TO DATE',
        failed: 0,
        queued: 0,
        attention: false,
        lastSyncLabel: 'JUST NOW',
        lastSyncDetail: null,
        syncAge: 0,
      },
    });
    await this.prisma.deviceHistoryEvent.create({
      data: {
        deviceId: id,
        whenLabel: 'NOW',
        title: 'DEVICE RESET',
        detail: `${reason} · R. CRAWFORD`,
        status: 'UPDATED',
        sortOrder: 0,
      },
    });
    return { data: { id, reason } };
  }

  async contactTechnician(id: string) {
    await this.ensure();
    const device = await this.prisma.fieldDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    return {
      data: {
        message: `Message queued for ${device.technician} · ${device.truck}`,
        phone: device.phone,
        email: device.email,
      },
    };
  }

  async contactTechnicians(ids: string[]) {
    await this.ensure();
    const devices = await this.prisma.fieldDevice.findMany({ where: { id: { in: ids } } });
    if (!devices.length) throw new NotFoundException('Device not found');
    return {
      data: {
        message: `Message queued for ${devices.map((device) => device.technician).join(', ')}`,
        count: devices.length,
      },
    };
  }

  async deviceHistory(id: string) {
    await this.ensure();
    const device = await this.prisma.fieldDevice.findUnique({
      where: { id },
      include: { history: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!device) throw new NotFoundException('Device not found');
    return {
      data: {
        deviceId: device.deviceId,
        technician: device.technician,
        truck: device.truck,
        platform: device.platform,
        appVersion: device.appVersion,
        events: device.history,
      },
    };
  }

  async syncIncident(code: string) {
    await this.ensure();
    const incident = await this.prisma.syncIncident.findUnique({
      where: { code },
      include: {
        device: true,
        items: { orderBy: { sortOrder: 'asc' } },
        steps: { orderBy: { sortOrder: 'asc' } },
        attempts: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!incident) throw new NotFoundException('Sync error not found');
    const cases = await this.prisma.syncErrorCase.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { ...incident, cases } };
  }

  async setIncidentStep(code: string, stepId: string, done: boolean) {
    await this.ensure();
    const step = await this.prisma.syncIncidentStep.findFirst({ where: { id: stepId, incident: { code } } });
    if (!step) throw new NotFoundException('Resolution step not found');
    await this.prisma.syncIncidentStep.update({ where: { id: stepId }, data: { done } });
    if (done) await this.addAttempt(step.incidentId, 'NOW', `STEP ${step.number} CHECKED · R. CRAWFORD`, 'default');
    return this.syncIncident(code);
  }

  async retryIncident(code: string) {
    await this.ensure();
    const incident = await this.prisma.syncIncident.findUnique({ where: { code }, include: { device: true } });
    if (!incident) throw new NotFoundException('Sync error not found');
    if (incident.retryMode === 'WAITING') {
      throw new BadRequestException({
        code: 'WAITING_FOR_SIGN_IN',
        message: 'Waiting for the technician to sign in',
      });
    }
    const offline = incident.device.status === 'OFFLINE';
    await this.addAttempt(
      incident.id,
      'NOW',
      offline ? 'RETRY QUEUED UNTIL THE DEVICE RECONNECTS' : `RETRY REQUESTED · ${code}`,
      offline ? 'danger' : 'default',
    );
    if (!offline) {
      await this.prisma.fieldDevice.update({
        where: { id: incident.deviceId },
        data: { status: 'SYNCING', statusLabel: 'SYNCING', lastSyncLabel: 'SYNCING NOW', syncAge: 0 },
      });
    }
    return this.syncIncident(code);
  }

  async discardIncident(code: string, reason: string) {
    await this.ensure();
    const incident = await this.prisma.syncIncident.findUnique({ where: { code } });
    if (!incident) throw new NotFoundException('Sync error not found');
    await this.prisma.syncIncident.update({
      where: { id: incident.id },
      data: { discarded: true, discardReason: reason, statusNote: 'DISCARDED' },
    });
    await this.prisma.fieldDeviceQueueItem.deleteMany({ where: { deviceId: incident.deviceId, errorCode: code } });
    const remaining = await this.prisma.fieldDeviceQueueItem.findMany({ where: { deviceId: incident.deviceId } });
    const failed = remaining.filter((item) => item.status === 'FAILED').length;
    const queued = remaining.filter((item) => item.status === 'QUEUED').length;
    await this.prisma.fieldDevice.update({
      where: { id: incident.deviceId },
      data: {
        failed,
        queued,
        attention: failed > 0,
        status: failed > 0 ? 'ITEM_FAILED' : queued > 0 ? 'OFFLINE' : 'UP_TO_DATE',
        statusLabel: failed > 0 ? 'ITEM FAILED' : queued > 0 ? 'OFFLINE' : 'UP TO DATE',
      },
    });
    await this.addAttempt(incident.id, 'NOW', `ITEM DISCARDED · ${reason} · R. CRAWFORD`, 'danger');
    return this.syncIncident(code);
  }

  private async noteForceSync(id: string) {
    await this.prisma.deviceHistoryEvent.create({
      data: {
        deviceId: id,
        whenLabel: 'NOW',
        title: 'FORCE SYNC REQUESTED',
        detail: 'ITEMS WILL UPLOAD WHEN THE DEVICE RECONNECTS',
        status: 'QUEUED',
        sortOrder: 0,
      },
    });
  }

  private async addAttempt(incidentId: string, timeLabel: string, message: string, tone: string) {
    const count = await this.prisma.syncIncidentAttempt.count({ where: { incidentId } });
    await this.prisma.syncIncidentAttempt.create({
      data: { incidentId, timeLabel, message, tone, sortOrder: count + 1 },
    });
  }

  private async applyForceSync(id: string) {
    const device = await this.prisma.fieldDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.prisma.fieldDeviceQueueItem.deleteMany({ where: { deviceId: id, status: 'QUEUED' } });
    const failed = await this.prisma.fieldDeviceQueueItem.count({ where: { deviceId: id, status: 'FAILED' } });
    await this.prisma.fieldDevice.update({
      where: { id },
      data: {
        queued: 0,
        failed,
        status: failed ? 'ITEM_FAILED' : 'UP_TO_DATE',
        statusLabel: failed ? 'ITEM FAILED' : 'UP TO DATE',
        lastSyncLabel: failed ? device.lastSyncLabel : 'JUST NOW',
        lastSyncDetail: failed ? device.lastSyncDetail : null,
        attention: failed > 0,
      },
    });
  }

  private async deviceSummary() {
    const rows = await this.prisma.fieldDevice.findMany();
    const offline = rows.find((row) => row.status === 'OFFLINE');
    return {
      devices: rows.length,
      upToDate: rows.filter((row) => row.status === 'UP_TO_DATE').length,
      queued: rows.reduce((total, row) => total + row.queued, 0),
      failed: rows.reduce((total, row) => total + row.failed, 0),
      offline: rows.filter((row) => row.status === 'OFFLINE').length,
      attention: rows.filter((row) => row.status === 'OFFLINE' || row.status === 'ITEM_FAILED').length,
      offlineName: offline ? `${offline.technician} · ${offline.truck}` : '',
      latestVersion: 'V3.8.2',
    };
  }

  async accessUsers(q?: string, role?: string, team?: string, status?: string, mfa?: string, mobile?: string, page = 1, sort = 'RECENT', pageSize = 8) {
    await this.ensure();
    const size = Math.min(100, Math.max(1, pageSize || 8));
    const where: Prisma.AccessUserWhereInput = {};
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { name: { contains, mode: 'insensitive' } },
        { email: { contains, mode: 'insensitive' } },
        { role: { contains, mode: 'insensitive' } },
      ];
    }
    if (role && role !== 'ALL') where.role = role;
    if (team && team !== 'ALL') where.team = team;
    if (status && status !== 'ALL') where.status = status;
    if (mfa && mfa !== 'ALL') where.mfa = mfa;
    if (mobile === 'ENABLED') where.mobileEnabled = true;
    if (mobile === 'DISABLED') where.mobileEnabled = false;
    const rows = await this.prisma.accessUser.findMany({ where });
    rows.sort((a, b) => {
      if (sort === 'NAME') return a.name.localeCompare(b.name);
      if (sort === 'ROLE') return a.role.localeCompare(b.role);
      if (sort === 'LAST_LOGIN') return a.loginAge - b.loginAge;
      if (sort === 'STATUS') return a.status.localeCompare(b.status);
      return a.sortOrder - b.sortOrder;
    });
    const all = await this.prisma.accessUser.findMany();
    const current = Math.max(1, page);
    const start = (current - 1) * size;
    const teams = await this.prisma.accessTeam.findMany({ orderBy: { name: 'asc' } });
    return {
      data: {
        items: rows.slice(start, start + size),
        summary: {
          total: all.length,
          active: all.filter((row) => row.status === 'ACTIVE').length,
          online: all.filter((row) => row.online && row.status === 'ACTIVE').length,
          invited: all.filter((row) => row.status === 'INVITED').length,
          suspended: all.filter((row) => row.status === 'SUSPENDED').length,
          admins: all.filter((row) => row.adminAccess).length,
          invitedName: all.find((row) => row.status === 'INVITED')?.name ?? '',
          suspendedName: all.find((row) => row.status === 'SUSPENDED')?.name ?? '',
          adminName: all.find((row) => row.adminAccess)?.name ?? '',
        },
        teams: teams.map((row) => row.name),
        roles: [...new Set(all.map((row) => row.role))].sort(),
        page: current,
        pageSize: size,
        total: rows.length,
      },
    };
  }

  async accessUser(id: string) {
    await this.ensure();
    const row = await this.prisma.accessUser.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('User not found');
    return { data: { ...row, modules: row.modules.split(',').filter(Boolean) } };
  }

  async createAccessUser(dto: AccessUserDto) {
    await this.ensure();
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.accessUser.findUnique({ where: { email } });
    if (existing) throw new BadRequestException({ code: 'EMAIL_IN_USE', message: 'A user with this email already exists' });
    const count = await this.prisma.accessUser.count();
    const row = await this.prisma.accessUser.create({
      data: {
        code: `AU-${Date.now().toString(36).toUpperCase()}`,
        name: dto.name.trim().toUpperCase(),
        email,
        phone: dto.phone,
        role: dto.role,
        team: dto.team,
        region: dto.region,
        lastLoginLabel: '—',
        lastLoginDetail: 'INVITE SENT',
        loginAge: 1,
        mobileLabel: dto.mobileEnabled ? 'ENABLED' : '—',
        mobileDetail: dto.mobileEnabled ? 'INVITE PENDING' : 'NOT SET UP',
        mobileEnabled: dto.mobileEnabled,
        mfa: 'PENDING',
        adminAccess: dto.role === 'ADMIN' || dto.adminAccess,
        inviteStatus: 'PENDING',
        status: 'INVITED',
        online: false,
        modules: dto.modules.join(','),
        sortOrder: count + 1,
      },
    });
    await this.prisma.accessTeam.updateMany({ where: { name: dto.team }, data: { members: { increment: 1 } } });
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'USER INVITED',
      target: row.name,
      detail: `${row.role} · INVITE SENT`,
      type: 'USER',
      result: 'SUCCESS',
      severity: 'INFO',
    });
    return { data: row };
  }

  async updateAccessUser(id: string, dto: AccessUserDto) {
    await this.ensure();
    const existing = await this.prisma.accessUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.team !== dto.team) {
      await this.prisma.accessTeam.updateMany({ where: { name: existing.team }, data: { members: { decrement: 1 } } });
      await this.prisma.accessTeam.updateMany({ where: { name: dto.team }, data: { members: { increment: 1 } } });
    }
    const row = await this.prisma.accessUser.update({
      where: { id },
      data: {
        name: dto.name.trim().toUpperCase(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone,
        role: dto.role,
        team: dto.team,
        region: dto.region,
        mobileEnabled: dto.mobileEnabled,
        mobileLabel: dto.mobileEnabled ? 'ENABLED' : 'DISABLED',
        adminAccess: dto.role === 'ADMIN' || dto.adminAccess,
        modules: dto.modules.join(','),
      },
    });
    return { data: row };
  }

  async deactivateAccessUser(id: string, reason?: string) {
    await this.ensure();
    const row = await this.prisma.accessUser.update({
      where: { id },
      data: { status: 'SUSPENDED', online: false, mobileLabel: 'DISABLED', mobileDetail: 'SIGNED OUT', lastLoginDetail: 'SUSPENDED' },
    });
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'USER DEACTIVATED',
      target: row.name,
      detail: `SUSPENDED · REASON: ${reason?.trim() || 'NOT PROVIDED'}`,
      type: 'USER',
      result: 'SUCCESS',
      severity: 'WARN',
    });
    return { data: row };
  }

  async reactivateAccessUser(id: string, reason?: string) {
    await this.ensure();
    if (!reason?.trim()) {
      throw new BadRequestException({ code: 'REASON_REQUIRED', message: 'A reactivation reason is required' });
    }
    const row = await this.prisma.accessUser.update({
      where: { id },
      data: { status: 'ACTIVE', inviteStatus: 'ACCEPTED', mobileLabel: 'ENABLED', mobileDetail: 'WEB', online: true },
    });
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'USER REACTIVATED',
      target: row.name,
      detail: `ACTIVE · REASON: ${reason.trim()}`,
      type: 'USER',
      result: 'SUCCESS',
      severity: 'INFO',
    });
    return { data: row };
  }

  async deleteAccessUser(id: string) {
    await this.ensure();
    const existing = await this.prisma.accessUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.status === 'ACTIVE') {
      throw new BadRequestException({ code: 'USER_ACTIVE', message: 'Deactivate the user before deleting' });
    }
    await this.prisma.accessUser.delete({ where: { id } });
    await this.prisma.accessTeam.updateMany({ where: { name: existing.team, members: { gt: 0 } }, data: { members: { decrement: 1 } } });
    return { data: { id } };
  }

  async resetAccessPassword(id: string) {
    await this.ensure();
    const existing = await this.prisma.accessUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'PASSWORD RESET',
      target: existing.name,
      detail: 'LINK SENT · EXPIRES 24H',
      type: 'AUTH',
      result: 'SUCCESS',
      severity: 'INFO',
    });
    return { data: { message: `Password reset sent to ${existing.email}`, email: existing.email } };
  }

  async resendAccessInvite(id: string) {
    await this.ensure();
    const row = await this.prisma.accessUser.update({
      where: { id },
      data: { status: 'INVITED', inviteStatus: 'PENDING', lastLoginDetail: 'INVITE SENT' },
    });
    return { data: { message: `Invite resent to ${row.email}`, email: row.email } };
  }

  async cancelAccessInvite(id: string) {
    return this.deleteAccessUser(id);
  }

  async previewAccessUser(id: string) {
    await this.ensure();
    const existing = await this.prisma.accessUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    return { data: { message: `Previewing as ${existing.name} · ${existing.role}`, name: existing.name, role: existing.role } };
  }

  async accessTeams(q?: string, region?: string, access?: string, owner?: string, kind?: string, sort = 'RECENT') {
    await this.ensure();
    const where: Prisma.AccessTeamWhereInput = {};
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { name: { contains, mode: 'insensitive' } },
        { lead: { contains, mode: 'insensitive' } },
        { region: { contains, mode: 'insensitive' } },
      ];
    }
    if (region && region !== 'ALL') where.region = region;
    if (access && access !== 'ALL') where.access = access;
    if (owner && owner !== 'ALL') where.owner = owner;
    if (kind === 'FIELD') {
      where.kind = 'FIELD';
      where.name = { startsWith: 'CREW' };
    }
    if (kind === 'HQ') where.kind = 'HQ';
    if (kind === 'CUSTOM') where.access = 'CUSTOM';
    const rows = await this.prisma.accessTeam.findMany({ where });
    rows.sort((a, b) => {
      if (sort === 'NAME') return a.name.localeCompare(b.name);
      if (sort === 'MEMBERS') return b.members - a.members;
      if (sort === 'REGION') return a.region.localeCompare(b.region);
      if (sort === 'OWNER') return a.owner.localeCompare(b.owner);
      return a.sortOrder - b.sortOrder;
    });
    const all = await this.prisma.accessTeam.findMany();
    const users = await this.prisma.accessUser.count();
    return {
      data: {
        items: rows,
        summary: {
          teams: all.length,
          members: users,
          regions: new Set(all.map((row) => row.region)).size,
          regionNames: [...new Set(all.map((row) => row.region))].join(' · '),
          custom: all.filter((row) => row.access === 'CUSTOM').length,
          customNames: all.filter((row) => row.access === 'CUSTOM').map((row) => row.name).join(' · '),
          unassigned: 0,
          field: all.filter((row) => row.kind === 'FIELD' && row.name.startsWith('CREW')).length,
          hq: all.filter((row) => row.kind === 'HQ').length,
        },
        owners: [...new Set(all.map((row) => row.owner))].sort(),
        regions: [...new Set(all.map((row) => row.region))].sort(),
      },
    };
  }

  async createAccessTeam(dto: AccessTeamDto) {
    await this.ensure();
    const count = await this.prisma.accessTeam.count();
    const row = await this.prisma.accessTeam.create({
      data: {
        code: `TM-${String(count + 1).padStart(2, '0')}`,
        name: dto.name.trim().toUpperCase(),
        lead: dto.lead.trim().toUpperCase(),
        members: 0,
        region: dto.region,
        modules: dto.modules,
        dashboards: dto.dashboards,
        owner: dto.owner,
        access: dto.access,
        kind: dto.kind,
        status: 'ACTIVE',
        sortOrder: count + 1,
        profile: JSON.stringify({
          subtitle: `${dto.kind === 'FIELD' ? 'FIELD CREW' : 'HQ TEAM'} · ${dto.region} · ${dto.access} ACCESS`,
          ownerRole: 'SUPERVISOR',
          accessNote: dto.access,
          members: [{ name: dto.lead.trim().toUpperCase(), role: 'LEAD', note: '', status: 'ACTIVE' }],
          moduleAccess: dto.modules,
          dashboards: dto.dashboards,
          mobile: dto.kind === 'FIELD' ? 'ENABLED FOR ALL MEMBERS' : '',
          custom: [],
        }),
      },
    });
    return { data: row };
  }

  async accessRoles() {
    await this.ensure();
    const roles = await this.prisma.accessRole.findMany({ orderBy: { sortOrder: 'asc' } });
    const users = await this.prisma.accessUser.groupBy({ by: ['role'], _count: { _all: true } });
    const counts = new Map(users.map((row) => [row.role, row._count._all]));
    return { data: { items: roles.map((role) => ({ ...role, users: counts.get(role.code) ?? counts.get(role.name) ?? 0 })) } };
  }

  async saveAccessRole(code: string, dto: AccessRoleDto) {
    await this.ensure();
    const existing = await this.prisma.accessRole.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException('Role not found');
    const row = await this.prisma.accessRole.update({ where: { code }, data: dto });
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'PERMISSION EDIT',
      target: row.name,
      detail: row.modules,
      type: 'PERMISSION',
      result: 'SUCCESS',
      severity: 'INFO',
    });
    return this.accessRoles();
  }

  async createAccessRole(dto: AccessRoleDto) {
    await this.ensure();
    const count = await this.prisma.accessRole.count();
    const code = dto.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || `ROLE-${count + 1}`;
    const row = await this.prisma.accessRole.create({
      data: { ...dto, name: dto.name.trim().toUpperCase(), code, kind: 'CUSTOM', sortOrder: count + 1 },
    });
    await this.writeAudit({
      actor: 'R. CRAWFORD',
      action: 'ROLE CREATED',
      target: row.name,
      detail: row.modules,
      type: 'PERMISSION',
      result: 'SUCCESS',
      severity: 'INFO',
    });
    return this.accessRoles();
  }

  async accessAudit(q?: string, type?: string, result?: string, severity?: string, actor?: string, range?: string, chip?: string, page = 1, pageSize = 8, sort = 'RECENT') {
    await this.ensure();
    const size = Math.min(100, Math.max(1, pageSize || 8));
    const now = Date.now();
    const dayAgo = new Date(now - 86_400_000);
    const weekAgo = new Date(now - 7 * 86_400_000);
    const where: Prisma.AccessAuditEventWhereInput = {};
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { actor: { contains, mode: 'insensitive' } },
        { action: { contains, mode: 'insensitive' } },
        { target: { contains, mode: 'insensitive' } },
      ];
    }
    if (type && type !== 'ALL') where.type = type;
    if (result && result !== 'ALL') where.result = result;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (actor && actor !== 'ALL') where.actor = actor;
    if (range === 'TODAY') where.occurredAt = { gte: dayAgo };
    if (range === 'WEEK') where.occurredAt = { gte: weekAgo };
    if (chip === 'PERMISSION' || chip === 'USER' || chip === 'SYSTEM') where.type = chip;
    if (chip === 'LOGIN') where.action = 'LOGIN';
    if (chip === 'FAILED') where.result = 'FAILED';
    const orderBy =
      sort === 'NEWEST' ? { occurredAt: 'desc' as const }
      : sort === 'ACTOR' ? { actor: 'asc' as const }
      : sort === 'ACTION' ? { action: 'asc' as const }
      : { sortOrder: 'asc' as const };
    const rows = await this.prisma.accessAuditEvent.findMany({ where, orderBy });
    const all = await this.prisma.accessAuditEvent.findMany();
    const inWeek = (date: Date) => date >= weekAgo;
    const inToday = (date: Date) => date >= dayAgo;
    const current = Math.max(1, page);
    const start = (current - 1) * size;
    const actors = [...new Set(all.map((row) => row.actor))].sort();
    return {
      data: {
        items: rows.slice(start, start + size).map((row) => this.presentAudit(row)),
        summary: {
          today: all.filter((row) => inToday(row.occurredAt) && row.action !== 'LOGIN').length,
          week: all.filter((row) => inWeek(row.occurredAt)).length,
          permChanges: all.filter((row) => inWeek(row.occurredAt) && row.type === 'PERMISSION').length,
          logins: all.filter((row) => inToday(row.occurredAt) && row.action === 'LOGIN' && row.result === 'SUCCESS').length,
          failed: all.filter((row) => inWeek(row.occurredAt) && row.result === 'FAILED').length,
          permission: all.filter((row) => row.type === 'PERMISSION').length,
          user: all.filter((row) => row.type === 'USER').length,
          login: all.filter((row) => row.action === 'LOGIN').length,
          failedAll: all.filter((row) => row.result === 'FAILED').length,
          system: all.filter((row) => row.type === 'SYSTEM').length,
        },
        actors,
        page: current,
        pageSize: size,
        total: rows.length,
      },
    };
  }

  private presentAudit(row: { drawer: string; sortOrder: number; type: string; detail: string; method: string; timeLabel: string; ip: string }) {
    let extra: Record<string, string> = {};
    try {
      extra = row.drawer ? JSON.parse(row.drawer) as Record<string, string> : {};
    } catch {
      extra = {};
    }
    return {
      ...row,
      drawer: {
        eventCode: extra.eventCode ?? `AUD-${20000 + row.sortOrder}`,
        kind: extra.kind ?? `${row.type} CHANGE`,
        actorRole: extra.actorRole ?? '',
        targetMeta: extra.targetMeta ?? '',
        before: extra.before ?? row.detail,
        after: extra.after ?? '',
        location: extra.location ?? '',
        session: extra.session ?? row.method,
        timestampFull: extra.timestampFull ?? row.timeLabel,
        ip: row.ip,
      },
    };
  }

  async updateAccessTeam(id: string, dto: AccessTeamDto) {
    await this.ensure();
    const existing = await this.prisma.accessTeam.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Team not found');
    const row = await this.prisma.accessTeam.update({
      where: { id },
      data: {
        name: dto.name.trim().toUpperCase(),
        lead: dto.lead.trim().toUpperCase(),
        region: dto.region,
        modules: dto.modules,
        dashboards: dto.dashboards,
        owner: dto.owner,
        access: dto.access,
        kind: dto.kind,
      },
    });
    return { data: row };
  }

  async addTeamMember(id: string, dto: AddTeamMemberDto) {
    await this.ensure();
    const team = await this.prisma.accessTeam.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    const profile = JSON.parse(team.profile || '{}') as { members?: { name: string; role: string; note: string; status: string }[] };
    const members = [...(profile.members ?? []), { name: dto.name.trim().toUpperCase(), role: dto.role.trim().toUpperCase(), note: dto.note?.trim().toUpperCase() ?? '', status: 'ACTIVE' }];
    const row = await this.prisma.accessTeam.update({
      where: { id },
      data: { profile: JSON.stringify({ ...profile, members }), members: members.length },
    });
    return { data: row };
  }

  async onCallRules() {
    await this.ensure();
    const row = await this.prisma.onCallRules.findUnique({ where: { id: 'default' } });
    return { data: row };
  }

  async saveOnCallRules(dto: OnCallRulesDto) {
    await this.ensure();
    const row = await this.prisma.onCallRules.update({ where: { id: 'default' }, data: dto });
    return { data: row };
  }

  async formLibrary(category?: string) {
    await this.ensure();
    const stat = await this.prisma.formLibraryStat.findUnique({ where: { id: 'default' } });
    const items = await this.prisma.formTemplate.findMany({
      where: category && category !== 'ALL' ? { category } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
    const activeTemplates = await this.prisma.formTemplate.count();
    return { data: { items, summary: { activeTemplates, submissions: stat?.submissions ?? 0, missingRequired: stat?.missingRequired ?? 0, failedImports: stat?.failedImports ?? 0, pendingReview: stat?.pendingReview ?? 0 } } };
  }

  async formSubmissions(q?: string, review?: string) {
    await this.ensure();
    const where: Prisma.FormSubmissionWhereInput = {};
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { formType: { contains, mode: 'insensitive' } },
        { formNumber: { contains, mode: 'insensitive' } },
        { customer: { contains, mode: 'insensitive' } },
        { submittedBy: { contains, mode: 'insensitive' } },
      ];
    }
    if (review && review !== 'ALL') where.review = review;
    const items = await this.prisma.formSubmission.findMany({ where, orderBy: { sortOrder: 'asc' } });
    const rejected = await this.prisma.formSubmission.count({ where: { review: 'REJECTED' } });
    return { data: { items, rejected } };
  }

  async markSubmissionsReviewed() {
    await this.ensure();
    const pending = await this.prisma.formSubmission.updateMany({ where: { review: 'PENDING REVIEW' }, data: { review: 'APPROVED' } });
    if (pending.count) {
      await this.prisma.formLibraryStat.update({ where: { id: 'default' }, data: { pendingReview: { decrement: pending.count } } });
    }
    return this.formSubmissions();
  }

  async formRules(q?: string, windows?: string) {
    await this.ensure();
    const selected = (windows ?? 'ACTIVE,CURRENT,FUTURE').split(',').filter(Boolean);
    const items = await this.prisma.settingsFormRule.findMany({ orderBy: { sortOrder: 'asc' } });
    const filtered = items.filter((row) => !q?.trim() || `${row.name} ${row.appliesTo}`.toLowerCase().includes(q.trim().toLowerCase()));
    const windowed = filtered.filter((row) => selected.includes(row.window));
    return { data: { items: windowed } };
  }

  async archivedCanvases(q?: string, windows?: string) {
    await this.ensure();
    const selected = (windows ?? 'ACTIVE,CURRENT,FUTURE').split(',').filter(Boolean);
    const items = await this.prisma.archivedCanvas.findMany({ where: { restored: false }, orderBy: { sortOrder: 'asc' } });
    const filtered = items.filter((row) => selected.includes(row.window) && (!q?.trim() || row.name.toLowerCase().includes(q.trim().toLowerCase())));
    return { data: { items: filtered } };
  }

  async restoreArchivedCanvas(id: string) {
    await this.ensure();
    const row = await this.prisma.archivedCanvas.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Archived form not found');
    await this.prisma.archivedCanvas.update({ where: { id }, data: { restored: true } });
    const count = await this.prisma.formTemplate.count();
    await this.prisma.formTemplate.create({ data: { name: row.name, category: 'OPERATIONS', submissions: 0, sortOrder: count + 1 } });
    return this.archivedCanvases();
  }

  async formDraft() {
    await this.ensure();
    const row = await this.prisma.formDraft.findUnique({ where: { id: 'current' } });
    return { data: row ? { ...row, sections: JSON.parse(row.sectionsJson) } : null };
  }

  async notificationPreferences() {
    await this.ensure();
    const items = await this.prisma.notificationPreference.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { items } };
  }

  async saveNotificationPreference(code: string, dto: NotificationChannelsDto) {
    await this.ensure();
    const existing = await this.prisma.notificationPreference.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException('Notification not found');
    const row = await this.prisma.notificationPreference.update({ where: { code }, data: dto });
    return { data: row };
  }

  async dataIntegrations() {
    await this.ensure();
    const items = await this.prisma.dataIntegration.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: { items } };
  }

  async saveFormDraft(dto: FormDraftDto) {
    await this.ensure();
    const row = await this.prisma.formDraft.upsert({
      where: { id: 'current' },
      update: { title: dto.title, sectionsJson: JSON.stringify(dto.sections) },
      create: { id: 'current', title: dto.title, sectionsJson: JSON.stringify(dto.sections) },
    });
    const count = await this.prisma.formTemplate.count();
    await this.prisma.formTemplate.create({
      data: { name: dto.title.trim().toUpperCase() || 'UNTITLED FORM', category: 'OPERATIONS', submissions: 0, sortOrder: count + 1 },
    });
    return { data: { ...row, sections: dto.sections } };
  }

  private async writeAudit(entry: { actor: string; action: string; target: string; detail: string; type: string; result: string; severity: string }) {
    await this.prisma.accessAuditEvent.create({
      data: {
        ...entry,
        occurredAt: new Date(),
        timeLabel: 'NOW',
        ip: '66.235.12.40',
        method: 'WEB',
        sortOrder: 0,
      },
    });
  }
}
