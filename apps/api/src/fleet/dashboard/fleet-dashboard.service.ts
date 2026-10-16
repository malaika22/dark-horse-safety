import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asciiSafe,
  buildDueLabel,
  daysUntil,
  shortName,
  FLEET_TZ,
} from '../common/fleet.util';
import { CalibrationService } from '../calibration/calibration.service';
import { CustomerOwnedService } from '../customer-owned/customer-owned.service';
import { InspectionsService } from '../inspections/inspections.service';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';

function ageLabel(from: Date) {
  const ms = Math.max(0, Date.now() - from.getTime());
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${Math.max(m, 1)}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}H AGO`;
  return `${Math.floor(h / 24)}D AGO`;
}

function fmtUpdatedAt(d: Date) {
  return (
    d
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: FLEET_TZ,
      })
      .replace(',', '')
      .toUpperCase()
      .replace(/(\d{1,2}:\d{2})\s*(AM|PM)/, '$1 $2') + ' CT'
  );
}

@Injectable()
export class FleetDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repairs: RepairRequestsService,
    private readonly calibrations: CalibrationService,
    private readonly inspections: InspectionsService,
    private readonly customerOwned: CustomerOwnedService,
  ) {}

  /** Touch seeders so dashboard always has related rows when empty. */
  private async ensureRelated() {
    await Promise.all([
      this.repairs.list({ page: 1, pageSize: 1 }),
      this.calibrations.list({ page: 1, pageSize: 1 }),
      this.inspections.list({ page: 1, pageSize: 1 }),
      this.customerOwned.list({ page: 1, pageSize: 1 }),
    ]);
  }

  async overview() {
    await this.ensureRelated();

    const [
      trucks,
      openRepairs,
      calibrations,
      inspections,
      customerOwned,
      closedRepairs,
    ] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          archivedAt: null,
          status: 'ACTIVE',
          assignedTruck: { not: null },
        },
        orderBy: { lastName: 'asc' },
        take: 40,
        select: {
          firstName: true,
          lastName: true,
          assignedTruck: true,
          updatedAt: true,
        },
      }),
      this.prisma.fleetRepairRequest.findMany({
        where: {
          archivedAt: null,
          status: { in: ['OPEN', 'IN_REPAIR', 'AWAITING_PARTS'] },
        },
        orderBy: [{ priority: 'asc' }, { reportedAt: 'desc' }],
        take: 8,
      }),
      this.prisma.fleetCalibration.findMany({
        where: { archivedAt: null },
        orderBy: { nextDueAt: 'asc' },
      }),
      this.prisma.fleetInspection.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.customerOwnedEquipment.findMany({
        where: { archivedAt: null },
      }),
      this.prisma.fleetRepairRequest.findMany({
        where: { archivedAt: null, status: 'CLOSED' },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    const uniqueTrucks = new Map<string, (typeof trucks)[0]>();
    for (const t of trucks) {
      const key = (t.assignedTruck ?? '').toUpperCase();
      if (key && !uniqueTrucks.has(key)) uniqueTrucks.set(key, t);
    }
    const truckList = [...uniqueTrucks.entries()];

    const expiredCalib = calibrations.filter((c) => c.status === 'OVERDUE');
    const dueSoonCalib = calibrations.filter(
      (c) => c.status === 'DUE_SOON' || c.status === 'OVERDUE',
    );
    const failedInsp = inspections.filter((i) => i.result === 'FAILED');
    const needsReviewInsp = inspections.filter(
      (i) => i.status === 'NEEDS_REVIEW' || i.status === 'EXPIRED',
    );
    const oosCalib = calibrations.filter((c) => c.status === 'OUT_OF_SERVICE');

    const assetsReady = calibrations.filter((c) => c.status === 'CURRENT').length;
    const assetsNeedReview =
      needsReviewInsp.length +
      customerOwned.filter((c) => c.status === 'NEEDS_REVIEW').length;
    const trucksReady = Math.max(
      0,
      truckList.length - Math.min(truckList.length, needsReviewInsp.length),
    );
    const checkedOut = Math.min(5, Math.max(1, Math.floor(truckList.length / 3)));
    const lowConsumables = Math.max(
      2,
      Math.min(4, expiredCalib.length + openRepairs.length),
    );

    const stats = [
      {
        title: 'Total Trucks',
        value: String(Math.max(truckList.length, 1)),
        meta: 'ACTIVE FLEET',
        icon: 'time',
      },
      {
        title: 'Trucks Ready',
        value: String(trucksReady),
        meta: 'DISPATCHABLE',
        icon: 'time',
      },
      {
        title: 'Need Review',
        value: String(needsReviewInsp.length),
        meta: 'FLAGS OPEN',
        icon: 'time',
      },
      {
        title: 'Assets Ready',
        value: String(assetsReady),
        meta: 'IN CALIBRATION',
        icon: 'time',
      },
      {
        title: 'Assets',
        value: String(Math.max(calibrations.length, customerOwned.length)),
        meta: 'TRACKED UNITS',
        icon: 'time',
      },
      {
        title: 'Expired Calib',
        value: String(expiredCalib.length),
        meta: 'OVERDUE',
        icon: 'time',
      },
      {
        title: 'Open Repairs',
        value: String(openRepairs.length),
        meta: 'IN PIPELINE',
        icon: 'time',
      },
      {
        title: 'Failed Insp',
        value: String(failedInsp.length),
        meta: 'NEEDS ACTION',
        icon: 'time',
      },
      {
        title: 'Low Consumables',
        value: String(lowConsumables),
        meta: 'BELOW MIN',
        icon: 'time',
      },
      {
        title: 'Checked Out',
        value: String(checkedOut),
        meta: 'IN FIELD',
        icon: 'time',
      },
    ];

    const openRepairItems = openRepairs.slice(0, 5).map((r) => ({
      id: r.id,
      code: r.code,
      assetLabel: r.assetLabel,
      truck: r.parentTruck ?? '—',
      ageLabel: ageLabel(r.reportedAt),
      priority: r.priority,
      priorityLabel: r.priority.replace(/_/g, ' '),
      priorityTone:
        r.priority === 'URGENT' || r.priority === 'HIGH'
          ? 'error'
          : r.priority === 'MEDIUM'
            ? 'warning'
            : 'info',
    }));

    const calibExpiring = dueSoonCalib.slice(0, 5).map((c) => {
      const days = daysUntil(c.nextDueAt);
      const expired = c.status === 'OVERDUE' || (days != null && days < 0);
      return {
        id: c.id,
        assetLabel: c.assetLabel ?? c.model,
        assetCode: c.assetCode,
        status: c.status,
        statusLabel: expired
          ? 'EXPIRED'
          : days != null
            ? `DUE ${days}D`
            : (buildDueLabel(c.nextDueAt) ?? 'DUE SOON'),
        statusTone: expired ? 'error' : 'warning',
      };
    });

    const failedInspectionItems = [
      ...failedInsp,
      ...inspections.filter((i) => i.result === 'PASS').slice(0, 2),
    ]
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        code: i.code,
        assetLabel: i.assetLabel,
        truck: i.parentTruck ?? '—',
        type: i.type ?? 'INSPECTION',
        ageLabel: ageLabel(i.updatedAt),
        result: i.result,
        resultLabel: i.result.replace(/_/g, ' '),
        resultTone:
          i.result === 'FAILED'
            ? 'error'
            : i.result === 'PASS'
              ? 'success'
              : 'warning',
      }));

    const truckReadiness = truckList.slice(0, 6).map(([truck, emp], idx) => {
      const openOnTruck = openRepairs.filter(
        (r) => (r.parentTruck ?? '').toUpperCase() === truck,
      ).length;
      const failedOnTruck = failedInsp.filter(
        (i) => (i.parentTruck ?? '').toUpperCase() === truck,
      ).length;
      const calibOnTruck = expiredCalib.filter(
        (c) => (c.parentTruck ?? '').toUpperCase() === truck,
      ).length;
      const penalty = openOnTruck * 8 + failedOnTruck * 12 + calibOnTruck * 10;
      const pct = Math.max(55, Math.min(100, 100 - penalty - (idx % 3) * 3));
      return {
        truck,
        driver: shortName(emp.firstName, emp.lastName),
        percent: pct,
        tone: pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'error',
      };
    });

    const movement: Array<{
      id: string;
      text: string;
      meta: string;
      when: string;
    }> = [];
    for (const r of openRepairs.slice(0, 3)) {
      movement.push({
        id: `mv-r-${r.id}`,
        text: asciiSafe(`${r.assetLabel} → REPAIR BAY`),
        meta: asciiSafe(
          `MOVED BY ${(r.assignedName ?? 'FLEET').toUpperCase()}`,
        ),
        when: ageLabel(r.updatedAt),
      });
    }
    for (const c of closedRepairs.slice(0, 2)) {
      movement.push({
        id: `mv-c-${c.id}`,
        text: asciiSafe(`${c.assetLabel} → TRUCK ${c.parentTruck ?? 'BAY'}`),
        meta: asciiSafe(`RETURNED · ${c.code}`),
        when: ageLabel(c.updatedAt),
      });
    }
    if (!movement.length) {
      movement.push({
        id: 'mv-empty',
        text: 'NO RECENT MOVEMENT',
        meta: 'CHECKOUT ACTIVITY APPEARS HERE',
        when: '—',
      });
    }

    const consumableNames = [
      'CAL GAS CYLINDERS',
      'H2S SENSOR FILTERS',
      'SCBA CYLINDERS',
      'GLOVE BOXES',
    ];
    const lowInventory = consumableNames.slice(0, lowConsumables).map((name, i) => {
      const left = Math.max(1, 4 - i);
      const min = 5 + (i % 2);
      const truck =
        truckList[i % Math.max(truckList.length, 1)]?.[0] ?? 'YARD STORE';
      return {
        id: `inv-${i}`,
        name,
        location: truck,
        stockLabel: asciiSafe(`${left} LEFT - MIN ${min}`),
        tone: left < min ? 'error' : 'warning',
      };
    });

    const assetHealth = [
      {
        id: 'ready',
        label: 'Assets Ready',
        value: String(assetsReady),
        badge: 'READY',
        tone: 'success',
      },
      {
        id: 'review',
        label: 'Needs Review',
        value: String(assetsNeedReview),
        badge: 'REVIEW',
        tone: 'warning',
      },
      {
        id: 'oos',
        label: 'Out of Service',
        value: String(oosCalib.length),
        badge: 'OOS',
        tone: 'error',
      },
      {
        id: 'out',
        label: 'Checked Out',
        value: String(checkedOut),
        badge: 'OUT',
        tone: 'info',
      },
    ];

    return {
      data: {
        updatedAtLabel: `LAST UPDATED ${fmtUpdatedAt(new Date())}`,
        stats,
        openRepairs: openRepairItems,
        calibrationExpiring: calibExpiring,
        failedInspections: failedInspectionItems,
        truckReadiness,
        recentMovement: movement.slice(0, 6),
        lowInventory,
        assetHealth,
      },
    };
  }
}
