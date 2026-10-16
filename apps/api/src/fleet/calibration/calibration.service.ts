import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FleetCalibrationResult,
  FleetCalibrationStatus,
  Prisma,
} from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asciiSafe,
  buildDueLabel,
  cmpField,
  dateRangeWhere,
  DAY_MS,
  daysUntil,
  fmtShortDate,
  labelOf,
  shortName,
} from '../common/fleet.util';
import {
  AdjustFrequencyDto,
  CalibrationListQueryDto,
} from './dto/calibration.dto';

function calibrationStatusTone(status: FleetCalibrationStatus) {
  if (status === 'OVERDUE' || status === 'OUT_OF_SERVICE') return 'danger';
  if (status === 'DUE_SOON') return 'warning';
  return 'success';
}

function calibrationPinScore(row: { status: FleetCalibrationStatus }) {
  if (row.status === 'OVERDUE' || row.status === 'OUT_OF_SERVICE') return 0;
  if (row.status === 'DUE_SOON') return 1;
  return 99;
}

@Injectable()
export class CalibrationService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed() {
    const count = await this.prisma.fleetCalibration.count();
    if (count > 0) return;

    const employees = await this.prisma.employee.findMany({
      where: {
        archivedAt: null,
        status: 'ACTIVE',
        assignedTruck: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { firstName: true, lastName: true, assignedTruck: true },
    });

    const trucks =
      employees.length > 0
        ? employees.map((e) =>
            asciiSafe((e.assignedTruck ?? 'TRUCK').toUpperCase()),
          )
        : ['TRUCK 101', 'TRUCK 204', 'TRUCK 318', 'TRUCK 422'];

    const now = new Date();
    const day = (offset: number) => new Date(now.getTime() + offset * DAY_MS);

    const calibrationDefs: Array<{
      model: string;
      assetCode: string;
      serial: string;
      status: FleetCalibrationStatus;
      result: FleetCalibrationResult;
      lastOffset: number;
      nextOffset: number;
      frequencyDays: number;
    }> = [
      {
        model: 'BW GAS ALERT MICRO',
        assetCode: 'GAS-001',
        serial: 'BWM-88421',
        status: 'CURRENT',
        result: 'PASS',
        lastOffset: -30,
        nextOffset: 335,
        frequencyDays: 365,
      },
      {
        model: 'MSA ALTAIR 4X',
        assetCode: 'GAS-002',
        serial: 'MSA-44102',
        status: 'DUE_SOON',
        result: 'PASS_WITH_ADJUSTMENT',
        lastOffset: -350,
        nextOffset: 10,
        frequencyDays: 365,
      },
      {
        model: 'RAE SYSTEMS MINIRAE 3000',
        assetCode: 'GAS-003',
        serial: 'RAE-22901',
        status: 'OVERDUE',
        result: 'FAILED',
        lastOffset: -400,
        nextOffset: -12,
        frequencyDays: 365,
      },
      {
        model: 'DRAGER X-AM 5600',
        assetCode: 'GAS-004',
        serial: 'DRG-77831',
        status: 'OUT_OF_SERVICE',
        result: 'FAILED',
        lastOffset: -420,
        nextOffset: -45,
        frequencyDays: 180,
      },
      {
        model: 'INDUSTRIAL SCIENTIFIC VENTIS',
        assetCode: 'GAS-005',
        serial: 'IS-99201',
        status: 'CURRENT',
        result: 'PASS',
        lastOffset: -60,
        nextOffset: 305,
        frequencyDays: 365,
      },
      {
        model: 'BW GAS ALERT QUATTRO',
        assetCode: 'GAS-006',
        serial: 'BWQ-11029',
        status: 'DUE_SOON',
        result: 'PASS',
        lastOffset: -340,
        nextOffset: 5,
        frequencyDays: 365,
      },
      {
        model: 'MSA ALTAIR 5X',
        assetCode: 'GAS-007',
        serial: 'MSA-55201',
        status: 'OVERDUE',
        result: 'PASS_WITH_ADJUSTMENT',
        lastOffset: -380,
        nextOffset: -8,
        frequencyDays: 365,
      },
      {
        model: 'RAE SYSTEMS PPBRAE 3000',
        assetCode: 'GAS-008',
        serial: 'RAE-88102',
        status: 'CURRENT',
        result: 'PASS',
        lastOffset: -15,
        nextOffset: 350,
        frequencyDays: 365,
      },
      {
        model: 'DRAGER PAC 8000',
        assetCode: 'GAS-009',
        serial: 'DRG-33102',
        status: 'DUE_SOON',
        result: 'PASS',
        lastOffset: -355,
        nextOffset: 3,
        frequencyDays: 365,
      },
      {
        model: 'INDUSTRIAL SCIENTIFIC MX6',
        assetCode: 'GAS-010',
        serial: 'IS-44102',
        status: 'CURRENT',
        result: 'PASS_WITH_ADJUSTMENT',
        lastOffset: -90,
        nextOffset: 275,
        frequencyDays: 365,
      },
    ];

    await this.prisma.fleetCalibration.createMany({
      data: calibrationDefs.map((def, i) => ({
        code: `CAL-${String(i + 1).padStart(4, '0')}`,
        assetCode: def.assetCode,
        assetLabel: asciiSafe(`${def.model} - ${def.serial}`),
        model: asciiSafe(def.model),
        serial: def.serial,
        parentTruck: trucks[i % trucks.length]!,
        lastCalAt: day(def.lastOffset),
        nextDueAt: day(def.nextOffset),
        result: def.result,
        status: def.status,
        frequencyDays: def.frequencyDays,
      })),
    });
  }

  private mapRow(row: {
    id: string;
    code: string;
    assetCode: string;
    assetLabel: string | null;
    model: string;
    serial: string | null;
    parentTruck: string | null;
    lastCalAt: Date | null;
    nextDueAt: Date | null;
    result: FleetCalibrationResult;
    status: FleetCalibrationStatus;
    frequencyDays: number;
  }) {
    return {
      id: row.id,
      code: row.code,
      assetCode: row.assetCode,
      assetLabel: row.assetLabel ?? row.model,
      model: row.model,
      serial: row.serial,
      parentTruck: row.parentTruck,
      lastCalAt: row.lastCalAt,
      nextDueAt: row.nextDueAt,
      dateLabel: fmtShortDate(row.lastCalAt),
      dueLabel: buildDueLabel(row.nextDueAt),
      result: row.result,
      resultLabel: labelOf(row.result),
      resultTone:
        row.result === 'FAILED'
          ? 'danger'
          : row.result === 'PASS_WITH_ADJUSTMENT'
            ? 'warning'
            : 'success',
      status: row.status,
      statusLabel: labelOf(row.status),
      statusTone: calibrationStatusTone(row.status),
      frequencyDays: row.frequencyDays,
    };
  }

  async list(query: CalibrationListQueryDto) {
    await this.ensureSeed();
    const { page, pageSize } = parsePage(query.page, query.pageSize);
    const dir = query.direction === 'asc' ? 'asc' : 'desc';
    const q = query.q?.trim();
    const dueRange = dateRangeWhere(query.from, query.to);
    const where: Prisma.FleetCalibrationWhereInput = {
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.asset?.trim()
        ? {
            OR: [
              {
                assetLabel: {
                  contains: query.asset.trim(),
                  mode: 'insensitive',
                },
              },
              {
                assetCode: { contains: query.asset.trim(), mode: 'insensitive' },
              },
              { model: { contains: query.asset.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.parentTruck?.trim()
        ? {
            parentTruck: {
              contains: query.parentTruck.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(dueRange ? { nextDueAt: dueRange } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { assetCode: { contains: q, mode: 'insensitive' } },
              { assetLabel: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
              { serial: { contains: q, mode: 'insensitive' } },
              { parentTruck: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.fleetCalibration.findMany({ where });
    const sort = (query.sort ?? 'nextDueAt').toLowerCase();
    const mapped = rows.map((r) => this.mapRow(r));
    mapped.sort((a, b) => {
      const pin = calibrationPinScore(a) - calibrationPinScore(b);
      if (pin !== 0) return pin;
      if (sort === 'asset') return cmpField(a.assetLabel, b.assetLabel, dir);
      if (sort === 'model') return cmpField(a.model, b.model, dir);
      if (sort === 'status') return cmpField(a.status, b.status, dir);
      if (sort === 'lastCal') return cmpField(a.lastCalAt, b.lastCalAt, dir);
      return cmpField(a.nextDueAt, b.nextDueAt, dir);
    });

    const total = mapped.length;
    const skip = (page - 1) * pageSize;
    return { data: paginate(mapped.slice(skip, skip + pageSize), total, page, pageSize) };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.fleetCalibration.findMany({
      where: { archivedAt: null },
    });
    const overdue = rows.filter((r) => r.status === 'OVERDUE').length;
    const dueSoon = rows.filter((r) => r.status === 'DUE_SOON').length;
    const outOfService = rows.filter((r) => r.status === 'OUT_OF_SERVICE').length;
    const current = rows.filter((r) => r.status === 'CURRENT').length;
    const nextDue = [...rows]
      .filter((r) => r.status === 'DUE_SOON' || r.status === 'CURRENT')
      .sort(
        (a, b) =>
          (a.nextDueAt?.getTime() ?? Infinity) -
          (b.nextDueAt?.getTime() ?? Infinity),
      )[0];
    const nextDueHint = nextDue
      ? asciiSafe(`${nextDue.assetCode} - ${fmtShortDate(nextDue.nextDueAt)}`)
      : null;

    return {
      data: {
        cells: [
          {
            title: 'Calibrated',
            value: String(current),
            meta: 'WITHIN SCHEDULE',
            filterKey: 'CURRENT',
          },
          {
            title: 'Due Soon',
            value: String(dueSoon),
            meta: nextDueHint ?? 'WITHIN 30 DAYS',
            filterKey: 'DUE_SOON',
          },
          {
            title: 'Overdue',
            value: String(overdue),
            meta: overdue === 0 ? 'NONE OVERDUE' : 'PAST CAL DUE DATE',
            filterKey: 'OVERDUE',
          },
          {
            title: 'Out of Service',
            value: String(outOfService),
            meta: outOfService === 0 ? 'NO ASSETS FLAGGED' : 'CANNOT DEPLOY',
            filterKey: 'OUT_OF_SERVICE',
          },
        ],
        emptyHints: {
          OVERDUE: {
            title: 'ALL CALIBRATIONS ARE CURRENT.',
            subtitle: `${current} OF ${rows.length} MONITORS ARE WITHIN SCHEDULE.${
              nextDueHint ? ` NEXT DUE: ${nextDueHint}.` : ''
            }`,
            actionLabel: 'VIEW ALL CALIBRATIONS',
          },
          DUE_SOON: {
            title: 'NO CALIBRATIONS DUE SOON',
            subtitle: 'EVERYTHING IS WITHIN THE CURRENT WINDOW.',
            actionLabel: 'VIEW ALL CALIBRATIONS',
          },
          OUT_OF_SERVICE: {
            title: 'NO ASSETS OUT OF SERVICE',
            subtitle: 'ALL UNITS ARE AVAILABLE FOR DEPLOYMENT.',
            actionLabel: 'VIEW ALL CALIBRATIONS',
          },
          CURRENT: {
            title: 'NO CURRENT CALIBRATIONS',
            subtitle: 'CALIBRATED ASSETS WILL APPEAR HERE.',
            actionLabel: 'VIEW ALL CALIBRATIONS',
          },
        },
      },
    };
  }

  async markOutOfService(id: string) {
    await this.ensureSeed();
    const existing = await this.prisma.fleetCalibration.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!existing) throw new NotFoundException('Calibration not found');
    const row = await this.prisma.fleetCalibration.update({
      where: { id: existing.id },
      data: { status: 'OUT_OF_SERVICE', result: 'FAILED' },
    });
    return { data: this.mapRow(row) };
  }

  async adjustFrequency(id: string, dto: AdjustFrequencyDto) {
    await this.ensureSeed();
    const existing = await this.prisma.fleetCalibration.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!existing) throw new NotFoundException('Calibration not found');
    const nextDueAt = existing.lastCalAt
      ? new Date(existing.lastCalAt.getTime() + dto.frequencyDays * DAY_MS)
      : existing.nextDueAt;
    const now = new Date();
    let status: FleetCalibrationStatus = 'CURRENT';
    if (nextDueAt) {
      const days = daysUntil(nextDueAt, now)!;
      if (days < 0) status = 'OVERDUE';
      else if (days <= 30) status = 'DUE_SOON';
    }
    const row = await this.prisma.fleetCalibration.update({
      where: { id: existing.id },
      data: {
        frequencyDays: dto.frequencyDays,
        nextDueAt,
        status,
      },
    });
    return { data: this.mapRow(row) };
  }

  async getById(id: string) {
    await this.ensureSeed();
    const row = await this.prisma.fleetCalibration.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Calibration not found');
    return { data: this.mapRow(row) };
  }
}
