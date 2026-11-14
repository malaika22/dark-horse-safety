import { Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SYNC_FAILED = 'MOBILE SYNC FAILED';

/** Dashboard settings the field app reads, and the device row the Mobile Sync screen lists. */
@Injectable()
export class MobileSettingsLink {
  constructor(private readonly prisma: PrismaService) {}

  private techName(employee: Pick<Employee, 'displayName' | 'firstName' | 'lastName'>) {
    return (employee.displayName ?? `${employee.firstName} ${employee.lastName}`).trim();
  }

  private async devicesFor(employee: Employee) {
    const name = this.techName(employee);
    return this.prisma.fieldDevice.findMany({
      where: { technician: { equals: name, mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Register or refresh the dashboard Mobile Sync row for this install. */
  async touchDevice(employee: Employee, device: { deviceId: string; platform: string; appVersion?: string }) {
    const name = this.techName(employee);
    const shared = {
      technician: name,
      truck: employee.assignedTruck ?? 'UNASSIGNED',
      appVersion: device.appVersion ?? 'MOBILE',
      phone: employee.phone,
      email: employee.email,
      crew: employee.crew,
      platform: device.platform.toUpperCase(),
      connectivity: 'ONLINE',
      sessionLabel: 'SIGNED IN',
      lastSyncLabel: 'JUST NOW',
      lastSyncDetail: 'REGISTERED FROM THE MOBILE APP',
      syncAge: 0,
    };
    const existing = await this.prisma.fieldDevice.findFirst({ where: { deviceId: device.deviceId } });
    if (existing) {
      await this.prisma.fieldDevice.update({
        where: { id: existing.id },
        data: {
          ...shared,
          status: existing.failed > 0 ? existing.status : 'CURRENT',
          statusLabel: existing.failed > 0 ? existing.statusLabel : 'UP TO DATE',
          attention: existing.failed > 0,
        },
      });
      return;
    }
    const code = `MOB-${device.deviceId.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase() || 'DEVICE'}`;
    await this.prisma.fieldDevice.create({
      data: {
        ...shared,
        code,
        deviceId: device.deviceId,
        status: 'CURRENT',
        statusLabel: 'UP TO DATE',
        attention: false,
        sortOrder: 0,
      },
    });
  }

  async signOutDevice(deviceId: string) {
    const row = await this.prisma.fieldDevice.findFirst({ where: { deviceId } });
    if (!row) return;
    await this.prisma.fieldDevice.update({
      where: { id: row.id },
      data: { status: 'OFFLINE', statusLabel: 'SIGNED OUT', connectivity: 'OFFLINE', sessionLabel: 'SIGNED OUT' },
    });
  }

  /** A successful clock or sync moves the dashboard "last sync" stamp. */
  async recordHeartbeat(employee: Employee) {
    const rows = await this.devicesFor(employee);
    if (!rows.length) return;
    await this.prisma.fieldDevice.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { lastSyncLabel: 'JUST NOW', lastSyncDetail: 'SYNCED FROM THE MOBILE APP', syncAge: 0, connectivity: 'ONLINE', sessionLabel: 'SIGNED IN' },
    });
  }

  /** Failed offline events land on the same device queue the dashboard error screen reads. */
  async recordSyncFailures(employee: Employee, failures: { detail: string }[]) {
    if (!failures.length) return;
    const [device] = await this.devicesFor(employee);
    if (!device) return;
    const stamp = new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).toUpperCase();
    await this.prisma.fieldDeviceQueueItem.createMany({
      data: failures.map((failure) => ({
        deviceId: device.id,
        itemType: 'SYNC',
        detail: failure.detail.slice(0, 180),
        createdLabel: stamp,
        sizeLabel: '1 EVENT',
        status: 'FAILED',
      })),
    });
    const failed = await this.prisma.fieldDeviceQueueItem.count({ where: { deviceId: device.id, status: 'FAILED' } });
    await this.prisma.fieldDevice.update({
      where: { id: device.id },
      data: {
        failed,
        status: 'FAILED',
        statusLabel: 'SYNC FAILED',
        attention: true,
        lastSyncLabel: 'JUST NOW',
        lastSyncDetail: 'SYNC FAILED FROM THE MOBILE APP',
      },
    });
  }

  async syncSnapshot(employee: Employee, userId: string) {
    const rows = await this.devicesFor(employee);
    if (!rows.length) {
      const failed = await this.prisma.mobileNotification.count({
        where: { userId, type: 'OFFLINE_SYNC_FAILED', resolved: false },
      });
      return { pendingCount: 0, failedCount: failed, lastSyncedAt: null as Date | null, devices: [] as { deviceId: string; status: string; appVersion: string; queued: number; failed: number; lastSyncLabel: string }[] };
    }
    return {
      pendingCount: rows.reduce((sum, row) => sum + row.queued, 0),
      failedCount: rows.reduce((sum, row) => sum + row.failed, 0),
      lastSyncedAt: rows[0].updatedAt,
      devices: rows.map((row) => ({
        deviceId: row.deviceId,
        status: row.status,
        appVersion: row.appVersion,
        queued: row.queued,
        failed: row.failed,
        lastSyncLabel: row.lastSyncLabel,
      })),
    };
  }

  /** In-app delivery follows Settings → Notifications. Unlisted types stay on. */
  async inAppAllowed(type: string) {
    if (type !== 'OFFLINE_SYNC_FAILED') return true;
    const pref = await this.prisma.notificationPreference.findFirst({ where: { event: SYNC_FAILED } });
    return pref ? pref.inApp : false;
  }

  async snapshot() {
    const [onCall, categories, payroll, notifications] = await Promise.all([
      this.prisma.onCallRules.findUnique({ where: { id: 'default' } }),
      this.prisma.timeCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.payrollRules.findUnique({ where: { id: 'default' } }),
      this.prisma.notificationPreference.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      onCall: onCall
        ? {
            maxConsecutiveDays: onCall.maxConsecutiveDays,
            minRestDays: onCall.minRestDays,
            leadHours: onCall.leadHours,
            balanceEvenly: onCall.balanceEvenly,
            autoPublish: onCall.autoPublish,
            requireBackup: onCall.requireBackup,
            sameZoneSwaps: onCall.sameZoneSwaps,
            notifyBeforeShift: onCall.notifyBeforeShift,
          }
        : null,
      timeCategories: categories.map((row) => ({
        code: row.code,
        name: row.name,
        paid: row.paid,
        billable: row.billable,
        countsToOt: row.countsToOt,
        payrollCode: row.payrollCode,
      })),
      payroll: payroll
        ? {
            payCycleLength: payroll.payCycleLength,
            overtimeThreshold: payroll.overtimeThreshold,
            longShiftFlag: payroll.longShiftFlag,
            seventhDayRule: payroll.seventhDayRule,
            roundClockEntries: payroll.roundClockEntries,
            gracePeriod: payroll.gracePeriod,
            minimumShift: payroll.minimumShift,
          }
        : null,
      notifications: notifications.map((row) => ({
        code: row.code,
        event: row.event,
        inApp: row.inApp,
        email: row.email,
        sms: row.sms,
      })),
    };
  }

  /** CRM customer rules plus Settings form rules whose job or customer matches this work order. */
  async requiredFormNames(workOrderId: string, customerId: string) {
    const [wo, crmRules, settingsRules] = await Promise.all([
      this.prisma.workOrder.findUnique({ where: { id: workOrderId }, include: { customer: true } }),
      this.prisma.formRule.findMany({ where: { customerId, status: 'ACTIVE', required: true } }),
      this.prisma.settingsFormRule.findMany({ where: { active: 'ACTIVE' } }),
    ]);
    const hay = `${wo?.category ?? ''} ${wo?.title ?? ''} ${wo?.customer.name ?? ''}`.toUpperCase();
    const required = crmRules.map((rule) => rule.formTemplate);
    for (const rule of settingsRules) {
      const token = (rule.appliesTo.split('·').pop() ?? rule.appliesTo).trim().toUpperCase();
      if (!token || !hay.includes(token)) continue;
      required.push(...rule.forms.split(',').map((name) => name.trim()).filter(Boolean));
    }
    return [...new Set(required)];
  }

  async missingFormNames(workOrderId: string, customerId: string) {
    const [required, subs] = await Promise.all([
      this.requiredFormNames(workOrderId, customerId),
      this.prisma.safetyFormSubmission.findMany({
        where: { workOrderId, status: { in: ['SUBMITTED', 'LOCKED'] } },
        include: { form: true },
      }),
    ]);
    const done = new Set(subs.flatMap((row) => [row.form.title.toLowerCase(), row.form.code.toLowerCase()]));
    return required.filter((name) => !done.has(name.toLowerCase()));
  }
}
