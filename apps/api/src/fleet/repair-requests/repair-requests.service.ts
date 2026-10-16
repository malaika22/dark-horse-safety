import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FleetRepairPriority,
  FleetRepairStatus,
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
  fmtShortDate,
  labelOf,
  shortName,
} from '../common/fleet.util';
import {
  RepairListQueryDto,
  UpdateRepairDto,
} from './dto/repair-request.dto';

function repairPriorityTone(priority: FleetRepairPriority) {
  if (priority === 'URGENT') return 'danger';
  if (priority === 'HIGH') return 'warning';
  return 'muted';
}

function repairStatusTone(status: FleetRepairStatus) {
  if (status === 'OPEN') return 'warning';
  if (status === 'AWAITING_PARTS') return 'warning';
  if (status === 'IN_REPAIR') return 'info';
  if (status === 'CLOSED') return 'success';
  return 'muted';
}

function repairPinScore(row: {
  priority: FleetRepairPriority;
  status: FleetRepairStatus;
  etaAt: Date | null;
}) {
  const overdue =
    row.etaAt &&
    row.etaAt.getTime() < Date.now() &&
    row.status !== 'CLOSED' &&
    row.status !== 'CANCELLED';
  if (row.priority === 'URGENT' && row.status !== 'CLOSED') return 0;
  if (overdue) return 1;
  if (row.status === 'OPEN') return 2;
  return 99;
}

@Injectable()
export class RepairRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed() {
    const count = await this.prisma.fleetRepairRequest.count();
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

    const repairDefs: Array<{
      assetCode: string;
      assetLabel: string;
      issue: string;
      priority: FleetRepairPriority;
      status: FleetRepairStatus;
      vendorName?: string;
      assignedName?: string;
      etaOffset?: number;
      inspectionCode?: string;
    }> = [
      {
        assetCode: 'SCBA-002',
        assetLabel: 'SCBA SET - TRUCK 204',
        issue: 'REGULATOR LEAK - FAILS PRESSURE TEST',
        priority: 'URGENT',
        status: 'OPEN',
        vendorName: 'MSA SERVICE CENTER',
        assignedName: 'R. DAVIS',
        etaOffset: -2,
        inspectionCode: 'INS-0002',
      },
      {
        assetCode: 'GAS-001',
        assetLabel: '4-GAS MONITOR - TRUCK 101',
        issue: 'SENSOR DRIFT ON H2S CHANNEL',
        priority: 'URGENT',
        status: 'IN_REPAIR',
        vendorName: 'BW TECH SUPPORT',
        assignedName: 'J. SMITH',
        etaOffset: 3,
      },
      {
        assetCode: 'TRK-318',
        assetLabel: 'TRUCK 318 BRAKES',
        issue: 'REAR BRAKE PADS BELOW SPEC',
        priority: 'HIGH',
        status: 'AWAITING_PARTS',
        vendorName: 'FLEET MAINTENANCE',
        assignedName: 'M. JOHNSON',
        etaOffset: 7,
      },
      {
        assetCode: 'TRP-003',
        assetLabel: 'TRIPOD AND WINCH',
        issue: 'CABLE FRAY AT DRUM',
        priority: 'MEDIUM',
        status: 'OPEN',
        vendorName: 'RESCUE SUPPLY CO',
        etaOffset: 14,
      },
      {
        assetCode: 'TRK-422',
        assetLabel: 'TRUCK 422 ENGINE',
        issue: 'CHECK ENGINE LIGHT - EGR VALVE',
        priority: 'HIGH',
        status: 'IN_REPAIR',
        vendorName: 'DEALER SERVICE',
        assignedName: 'K. WILSON',
        etaOffset: 1,
      },
      {
        assetCode: 'H2S-008',
        assetLabel: 'PERSONAL H2S MONITOR',
        issue: 'DISPLAY INTERMITTENT',
        priority: 'MEDIUM',
        status: 'CLOSED',
        vendorName: 'IND SCI REPAIR',
        assignedName: 'J. SMITH',
        etaOffset: -10,
      },
      {
        assetCode: 'FEX-006',
        assetLabel: 'FIRE EXTINGUISHER 20LB',
        issue: 'ANNUAL RECHARGE OVERDUE',
        priority: 'LOW',
        status: 'OPEN',
        vendorName: 'SAFETY SUPPLY',
        etaOffset: 21,
      },
      {
        assetCode: 'CAL-012',
        assetLabel: 'CALIBRATION KIT',
        issue: 'CYLINDER EMPTY - CANNOT VERIFY GAS',
        priority: 'HIGH',
        status: 'AWAITING_PARTS',
        vendorName: 'AIRGAS',
        assignedName: 'R. DAVIS',
        etaOffset: -1,
        inspectionCode: 'INS-0012',
      },
      {
        assetCode: 'TRK-101',
        assetLabel: 'TRUCK 101 TIRES',
        issue: 'FRONT LEFT TIRE WEAR PATTERN',
        priority: 'MEDIUM',
        status: 'CANCELLED',
        vendorName: 'TIRE PROS',
        etaOffset: 5,
      },
      {
        assetCode: 'MGD-011',
        assetLabel: 'MULTI-GAS DETECTOR',
        issue: 'PUMP MOTOR NOISE',
        priority: 'LOW',
        status: 'CLOSED',
        vendorName: 'RAE SYSTEMS',
        assignedName: shortName(
          employees[0]?.firstName,
          employees[0]?.lastName,
        ),
        etaOffset: -5,
      },
    ];

    await this.prisma.fleetRepairRequest.createMany({
      data: repairDefs.map((def, i) => {
        const etaAt = def.etaOffset != null ? day(def.etaOffset) : null;
        return {
          code: `REP-${String(i + 1).padStart(4, '0')}`,
          assetCode: def.assetCode,
          assetLabel: asciiSafe(def.assetLabel),
          issue: asciiSafe(def.issue),
          parentTruck: trucks[i % trucks.length]!,
          priority: def.priority,
          status: def.status,
          vendorName: def.vendorName ? asciiSafe(def.vendorName) : null,
          assignedName: def.assignedName ?? null,
          etaAt,
          etaLabel: etaAt ? buildDueLabel(etaAt, 'ETA') : null,
          purchaseOrder: i % 3 === 0 ? `PO-${4400 + i}` : null,
          contactPhone: i % 2 === 0 ? '432-555-0100' : null,
          inspectionCode: def.inspectionCode ?? null,
        };
      }),
    });
  }

  private mapRow(row: {
    id: string;
    code: string;
    assetCode: string;
    assetLabel: string;
    issue: string;
    parentTruck: string | null;
    priority: FleetRepairPriority;
    status: FleetRepairStatus;
    vendorName: string | null;
    assignedName: string | null;
    etaAt: Date | null;
    etaLabel: string | null;
    purchaseOrder: string | null;
    contactPhone: string | null;
    reportedAt: Date;
    inspectionCode: string | null;
  }) {
    const overdue =
      row.etaAt &&
      row.etaAt.getTime() < Date.now() &&
      row.status !== 'CLOSED' &&
      row.status !== 'CANCELLED';
    return {
      id: row.id,
      code: row.code,
      assetCode: row.assetCode,
      assetLabel: row.assetLabel,
      issue: row.issue,
      parentTruck: row.parentTruck,
      priority: row.priority,
      priorityLabel: labelOf(row.priority),
      priorityTone: repairPriorityTone(row.priority),
      status: row.status,
      statusLabel: labelOf(row.status),
      statusTone: repairStatusTone(row.status),
      vendorName: row.vendorName,
      vendor: row.vendorName,
      assignedName: row.assignedName,
      etaAt: row.etaAt,
      etaLabel:
        row.etaLabel ?? (row.etaAt ? buildDueLabel(row.etaAt, 'ETA') : null),
      dateLabel: fmtShortDate(row.reportedAt),
      overdueVsEta: Boolean(overdue),
      purchaseOrder: row.purchaseOrder,
      contactPhone: row.contactPhone,
      reportedAt: row.reportedAt,
      inspectionCode: row.inspectionCode,
    };
  }

  async list(query: RepairListQueryDto) {
    await this.ensureSeed();
    const { page, pageSize } = parsePage(query.page, query.pageSize);
    const dir = query.direction === 'asc' ? 'asc' : 'desc';
    const q = query.q?.trim();
    const reportedRange = dateRangeWhere(query.from, query.to);
    const where: Prisma.FleetRepairRequestWhereInput = {
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
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
      ...(reportedRange ? { reportedAt: reportedRange } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { assetLabel: { contains: q, mode: 'insensitive' } },
              { assetCode: { contains: q, mode: 'insensitive' } },
              { issue: { contains: q, mode: 'insensitive' } },
              { vendorName: { contains: q, mode: 'insensitive' } },
              { assignedName: { contains: q, mode: 'insensitive' } },
              { inspectionCode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    let rows = await this.prisma.fleetRepairRequest.findMany({ where });
    if (query.overdueVsEta) {
      const now = Date.now();
      rows = rows.filter(
        (r) =>
          r.etaAt &&
          r.etaAt.getTime() < now &&
          r.status !== 'CLOSED' &&
          r.status !== 'CANCELLED',
      );
    }

    const sort = (query.sort ?? 'reportedAt').toLowerCase();
    const mapped = rows.map((r) => this.mapRow(r));
    mapped.sort((a, b) => {
      const pin =
        repairPinScore({
          priority: a.priority,
          status: a.status,
          etaAt: a.etaAt,
        }) -
        repairPinScore({
          priority: b.priority,
          status: b.status,
          etaAt: b.etaAt,
        });
      if (pin !== 0) return pin;
      if (sort === 'asset') return cmpField(a.assetLabel, b.assetLabel, dir);
      if (sort === 'priority') return cmpField(a.priority, b.priority, dir);
      if (sort === 'status') return cmpField(a.status, b.status, dir);
      if (sort === 'eta') return cmpField(a.etaAt, b.etaAt, dir);
      return cmpField(a.reportedAt, b.reportedAt, dir);
    });

    const total = mapped.length;
    const skip = (page - 1) * pageSize;
    return { data: paginate(mapped.slice(skip, skip + pageSize), total, page, pageSize) };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.fleetRepairRequest.findMany({
      where: { archivedAt: null },
    });
    const open = rows.filter((r) => r.status === 'OPEN').length;
    const inRepair = rows.filter((r) => r.status === 'IN_REPAIR').length;
    const awaitingParts = rows.filter(
      (r) => r.status === 'AWAITING_PARTS',
    ).length;
    const closed = rows.filter((r) => r.status === 'CLOSED').length;
    const lastClosed = [...rows]
      .filter((r) => r.status === 'CLOSED')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const lastClosedHint = lastClosed
      ? asciiSafe(
          `LAST CLOSED: ${lastClosed.code} - ${fmtShortDate(lastClosed.updatedAt)}`,
        )
      : null;

    return {
      data: {
        cells: [
          {
            title: 'Open',
            value: String(open),
            meta: open === 0 ? 'NONE OPEN' : 'READY TO ASSIGN',
            filterKey: 'OPEN',
          },
          {
            title: 'In Repair',
            value: String(inRepair),
            meta: awaitingParts > 0 ? 'AWAITING PARTS' : 'IN SHOP',
            filterKey: 'IN_REPAIR',
          },
          {
            title: 'Awaiting Parts',
            value: String(awaitingParts),
            meta: 'EST. 3-7 DAYS',
            filterKey: 'AWAITING_PARTS',
          },
          {
            title: 'Closed',
            value: String(closed),
            meta: 'LAST 30 DAYS',
            filterKey: 'CLOSED',
          },
        ],
        emptyHints: {
          OPEN: {
            title: 'NO OPEN REPAIR REQUESTS',
            subtitle: lastClosedHint
              ? `EVERY ASSET IS IN SERVICE. ${lastClosedHint}.`
              : 'EVERY ASSET IS IN SERVICE.',
            actionLabel: 'VIEW ALL REPAIR REQUESTS',
          },
          IN_REPAIR: {
            title: 'NOTHING IN REPAIR',
            subtitle: 'NO ASSETS ARE CURRENTLY IN THE SHOP.',
            actionLabel: 'VIEW ALL REPAIR REQUESTS',
          },
          AWAITING_PARTS: {
            title: 'NO PARTS HOLDS',
            subtitle: 'NOTHING IS WAITING ON VENDOR PARTS.',
            actionLabel: 'VIEW ALL REPAIR REQUESTS',
          },
          CLOSED: {
            title: 'NO CLOSED REPAIRS',
            subtitle: 'CLOSED REQUESTS FROM THE LAST 30 DAYS APPEAR HERE.',
            actionLabel: 'VIEW ALL REPAIR REQUESTS',
          },
        },
      },
    };
  }

  async workflow() {
    await this.ensureSeed();
    const rows = await this.prisma.fleetRepairRequest.findMany({
      where: { archivedAt: null },
      orderBy: { reportedAt: 'desc' },
    });
    const stages: FleetRepairStatus[] = [
      'OPEN',
      'IN_REPAIR',
      'AWAITING_PARTS',
      'CLOSED',
      'CANCELLED',
    ];
    const columns = stages.map((status) => ({
      status,
      statusLabel: labelOf(status),
      count: rows.filter((r) => r.status === status).length,
      items: rows
        .filter((r) => r.status === status)
        .slice(0, 8)
        .map((r) => this.mapRow(r)),
    }));
    return { data: { columns } };
  }

  async update(id: string, dto: UpdateRepairDto) {
    await this.ensureSeed();
    const existing = await this.prisma.fleetRepairRequest.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!existing) throw new NotFoundException('Repair request not found');

    const row = await this.prisma.fleetRepairRequest.update({
      where: { id: existing.id },
      data: {
        ...(dto.vendorName !== undefined
          ? { vendorName: dto.vendorName ? asciiSafe(dto.vendorName) : null }
          : {}),
        ...(dto.assignedName !== undefined
          ? { assignedName: dto.assignedName ?? null }
          : {}),
        ...(dto.etaLabel !== undefined ? { etaLabel: dto.etaLabel } : {}),
        ...(dto.purchaseOrder !== undefined
          ? { purchaseOrder: dto.purchaseOrder ?? null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      },
    });
    return { data: this.mapRow(row) };
  }

  async cancel(id: string) {
    await this.ensureSeed();
    const existing = await this.prisma.fleetRepairRequest.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!existing) throw new NotFoundException('Repair request not found');
    const row = await this.prisma.fleetRepairRequest.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
    });
    return { data: this.mapRow(row) };
  }

  async resolve(id: string) {
    await this.ensureSeed();
    const existing = await this.prisma.fleetRepairRequest.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!existing) throw new NotFoundException('Repair request not found');
    const row = await this.prisma.fleetRepairRequest.update({
      where: { id: existing.id },
      data: { status: 'CLOSED' },
    });
    return { data: this.mapRow(row) };
  }

  async getById(id: string) {
    await this.ensureSeed();
    const row = await this.prisma.fleetRepairRequest.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Repair request not found');
    return { data: this.mapRow(row) };
  }
}
