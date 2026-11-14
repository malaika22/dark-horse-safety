import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { normalizePhone } from '../common/utils/phone.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto, DeviceDto, HomeLocationChangeDto, HomeLocationDto, NoteDto,
  SettingsDto, SupervisorMessageDto, UpdateProfileDto,
} from './dto/mobile.dto';
import { MobileContext, dateOnly, isoDate } from './mobile-context.service';
import { MobileSettingsLink } from './mobile-settings-link.service';

@Injectable()
export class MobileProfileService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService, private readonly link: MobileSettingsLink) {}

  private async profile(userId: string) {
    return this.prisma.mobileProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** PR-1 */
  async me(userId: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const [p, user, supervisor] = await Promise.all([
      this.profile(userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
      e.supervisorId ? this.prisma.employee.findUnique({ where: { id: e.supervisorId } }) : null,
    ]);
    return {
      data: {
        id: userId,
        employeeId: e.id,
        employeeCode: e.code,
        name: e.displayName ?? `${e.firstName} ${e.lastName}`,
        firstName: e.firstName,
        lastName: e.lastName,
        roleTitle: e.roleTitle,
        email: user?.email ?? e.email,
        phone: user?.phone ?? e.phone,
        crew: e.crew,
        assignedTruck: e.assignedTruck,
        emergencyContact: { name: e.emergencyContactName, phone: e.emergencyContactPhone },
        supervisor: supervisor
          ? { id: supervisor.id, name: supervisor.displayName ?? `${supervisor.firstName} ${supervisor.lastName}`, phone: supervisor.phone }
          : null,
        homeLocation: p.homeLat != null ? { address: p.homeAddress, lat: p.homeLat, lng: p.homeLng, setAt: p.homeLocationSetAt } : null,
        settings: { defaultTimeCategory: e.defaultTimeCategory ?? 'REGULAR', notificationsEnabled: p.notificationsEnabled },
      },
    };
  }

  /** PR-2 */
  async update(userId: string, dto: UpdateProfileDto) {
    const { employee } = await this.ctx.actor(userId);
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;
    if (phone) {
      const clash = await this.prisma.user.findUnique({ where: { phone } });
      if (clash && clash.id !== userId) {
        throw new ConflictException({ code: 'CONFLICT', message: 'That phone number is already in use.' });
      }
      await this.prisma.user.update({ where: { id: userId }, data: { phone } });
    }
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        phone: phone ?? undefined,
        emergencyContactName: dto.emergencyContactName ?? undefined,
        emergencyContactPhone: dto.emergencyContactPhone ?? undefined,
      },
    });
    return this.me(userId);
  }

  /** PR-3a */
  async setHome(userId: string, dto: HomeLocationDto) {
    await this.ctx.actor(userId);
    const p = await this.profile(userId);
    if (p.homeLat != null) {
      throw new ConflictException({ code: 'HOME_LOCATION_EXISTS', message: 'Home location is already set. Submit a change request instead.' });
    }
    const saved = await this.prisma.mobileProfile.update({
      where: { userId },
      data: { homeAddress: dto.address, homeLat: dto.lat, homeLng: dto.lng, homeLocationSetAt: new Date() },
    });
    return { data: { homeLocation: { address: saved.homeAddress, lat: saved.homeLat, lng: saved.homeLng }, status: 'ACTIVE' } };
  }

  /** PR-3b */
  async requestHomeChange(userId: string, dto: HomeLocationChangeDto) {
    const { employee } = await this.ctx.actor(userId);
    const row = await this.prisma.homeLocationChangeRequest.create({
      data: { userId, employeeId: employee.id, address: dto.address, lat: dto.lat, lng: dto.lng, reason: dto.reason },
    });
    return { data: { id: row.id, status: row.status } };
  }

  /** PR-4 */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Current password is incorrect.' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } });
    return { data: { changed: true } };
  }

  /** PR-5 (Phase 2) */
  async certifications(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const rows = await this.prisma.trainingCertificate.findMany({ where: { employeeId: employee.id }, orderBy: { expiryAt: 'asc' } });
    const soon = Date.now() + (employee.certReminderLeadDays ?? 30) * 86_400_000;
    return {
      data: {
        items: rows.map((r) => ({
          id: r.id,
          label: r.label,
          issuingBody: r.issuingBody,
          expiresOn: r.expiryAt ? isoDate(r.expiryAt) : null,
          status: !r.expiryAt ? 'VALID' : r.expiryAt.getTime() < Date.now() ? 'EXPIRED' : r.expiryAt.getTime() < soon ? 'EXPIRING' : 'VALID',
        })),
      },
    };
  }

  /** PR-6 (Phase 2) */
  async equipment(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    return { data: { assignedTruck: employee.assignedTruck, ppeIssued: employee.ppeIssued ?? [], assignedEquipment: employee.assignedEquipment ?? [] } };
  }

  /** PR-7 */
  async settings(userId: string, dto: SettingsDto) {
    const { employee } = await this.ctx.actor(userId);
    if (dto.defaultTimeCategory) {
      await this.prisma.employee.update({ where: { id: employee.id }, data: { defaultTimeCategory: dto.defaultTimeCategory } });
    }
    if (dto.notificationsEnabled !== undefined) {
      await this.profile(userId);
      await this.prisma.mobileProfile.update({ where: { userId }, data: { notificationsEnabled: dto.notificationsEnabled } });
    }
    return { data: (await this.me(userId)).data.settings };
  }

  /** PR-8 */
  async locationAccess(userId: string, dto: NoteDto) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const row = await this.prisma.locationAccessRequest.create({ data: { userId, employeeId: employee.id, note: dto.note } });
      return { data: { id: row.id, status: row.status } };
    });
  }

  /** MSG-1 */
  async messageSupervisor(userId: string, dto: SupervisorMessageDto) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const row = await this.prisma.supervisorMessage.create({
        data: { userId, employeeId: employee.id, supervisorId: employee.supervisorId, subject: dto.subject, body: dto.body, workOrderId: dto.workOrderId },
      });
      return { data: { id: row.id, sentAt: row.createdAt } };
    });
  }

  /** DV-1 */
  async registerDevice(userId: string, dto: DeviceDto) {
    const { employee } = await this.ctx.actor(userId);
    const row = await this.prisma.mobileDevice.upsert({
      where: { deviceId: dto.deviceId },
      create: { userId, deviceId: dto.deviceId, platform: dto.platform, pushToken: dto.pushToken, appVersion: dto.appVersion, locationPermission: dto.locationPermission, pushEnabled: dto.pushEnabled ?? true },
      update: { userId, platform: dto.platform, pushToken: dto.pushToken, appVersion: dto.appVersion, locationPermission: dto.locationPermission, pushEnabled: dto.pushEnabled, lastSeenAt: new Date() },
    });
    await this.link.touchDevice(employee, { deviceId: dto.deviceId, platform: dto.platform, appVersion: dto.appVersion });
    return { data: { deviceId: row.deviceId, registered: true } };
  }

  /** DV-2 */
  async removeDevice(userId: string, deviceId: string) {
    await this.prisma.mobileDevice.deleteMany({ where: { userId, deviceId } });
    await this.link.signOutDevice(deviceId);
    return { data: { removed: true } };
  }

  /** HM-1 */
  async home(userId: string, date?: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const day = dateOnly(date ? new Date(date) : new Date());
    if (Number.isNaN(day.getTime())) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid date' });

    const [open, assignments, pendingEdits, unread, attention, oncall, pause, sync] = await Promise.all([
      this.prisma.timeEntry.findFirst({ where: { employeeId: e.id, clockOut: null, archivedAt: null }, orderBy: { createdAt: 'desc' } }),
      this.prisma.dispatchAssignment.findMany({
        where: { employeeId: e.id, scheduledDate: day, status: { in: ['POSTED', 'ACCEPTED'] } },
        include: { workOrder: { include: { customer: true, location: true } } },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.timeEditRequest.count({ where: { employeeId: e.id, status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } } }),
      this.prisma.mobileNotification.count({ where: { userId, readAt: null } }),
      this.prisma.mobileNotification.count({ where: { userId, requiresAction: true, resolved: false } }),
      this.prisma.onCallAssignment.findFirst({ where: { date: day, OR: [{ employeeId: e.id }, { backupId: e.id }] } }),
      this.prisma.timeEntryPause.findFirst({ where: { employeeId: e.id, endedAt: null } }),
      this.link.syncSnapshot(e, userId),
    ]);

    const mode = open ? 'WORKING' : oncall ? (oncall.employeeId === e.id ? 'ON_CALL' : 'STANDBY') : 'OFF_DUTY';
    const schedule = assignments.map((a) => ({
      assignmentId: a.id,
      workOrderId: a.workOrderId,
      workOrderCode: a.workOrder.code,
      customer: a.workOrder.customer.name,
      location: a.workOrder.location?.name ?? null,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status === 'POSTED' ? 'ASSIGNED' : 'ACCEPTED',
    }));
    return {
      data: {
        date: isoDate(day),
        mode,
        blockedReason: null,
        clock: {
          status: open ? (pause ? 'PAUSED' : 'CLOCKED_IN') : 'CLOCKED_OUT',
          timeEntryId: open?.id ?? null,
          clockIn: open?.clockIn ?? null,
          workOrderCode: open?.workOrderCode ?? null,
        },
        attentionCount: attention,
        unreadNotifications: unread,
        pendingEditsCount: pendingEdits,
        unsyncedCount: sync.pendingCount + sync.failedCount,
        nextJob: schedule[0] ?? null,
        schedule,
        onCall: oncall ? { zone: oncall.zone, status: oncall.status, role: oncall.employeeId === e.id ? 'PRIMARY' : 'BACKUP' } : null,
      },
    };
  }

  /** OC-1 */
  async onCall(userId: string, from?: string, to?: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const start = dateOnly(from ? new Date(from) : new Date());
    const end = dateOnly(to ? new Date(to) : new Date(Date.now() + 30 * 86_400_000));
    const rows = await this.prisma.onCallAssignment.findMany({
      where: { date: { gte: start, lte: end }, published: true, OR: [{ employeeId: e.id }, { backupId: e.id }] },
      orderBy: { date: 'asc' },
    });
    const settings = await this.link.snapshot();
    return {
      data: {
        rules: settings.onCall,
        items: rows.map((r) => ({ id: r.id, date: isoDate(r.date), zone: r.zone, status: r.status, role: r.employeeId === e.id ? 'PRIMARY' : 'BACKUP', notes: r.notes })),
      },
    };
  }

  /** Settings the dashboard already saves: on-call, time categories, payroll, notification channels. */
  async fieldSettings(userId: string) {
    await this.ctx.actor(userId);
    return { data: await this.link.snapshot() };
  }

  /** OC-2 */
  async onCallShift(userId: string, id: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const r = await this.ctx.mustFind(this.prisma.onCallAssignment.findFirst({ where: { id, OR: [{ employeeId: e.id }, { backupId: e.id }] } }), 'On-call shift');
    const supervisor = e.supervisorId ? await this.prisma.employee.findUnique({ where: { id: e.supervisorId } }) : null;
    return {
      data: {
        id: r.id, date: isoDate(r.date), zone: r.zone, status: r.status,
        role: r.employeeId === e.id ? 'PRIMARY' : 'BACKUP', instructions: r.notes,
        supervisor: supervisor ? { name: `${supervisor.firstName} ${supervisor.lastName}`, phone: supervisor.phone } : null,
      },
    };
  }

  /** OC-3 */
  async onCallCheckIn(userId: string, id: string, dto: { clientRequestId?: string; lat?: number; lng?: number }) {
    const { employee: e } = await this.ctx.actor(userId);
    await this.ctx.mustFind(this.prisma.onCallAssignment.findFirst({ where: { id, OR: [{ employeeId: e.id }, { backupId: e.id }] } }), 'On-call shift');
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const row = await this.prisma.supervisorMessage.create({
        data: { userId, employeeId: e.id, supervisorId: e.supervisorId, kind: 'ONCALL_CHECKIN', subject: id, body: `On-call check-in at ${dto.lat ?? '?'},${dto.lng ?? '?'}` },
      });
      return { data: { checkedInAt: row.createdAt, withinArea: null } };
    });
  }
}
