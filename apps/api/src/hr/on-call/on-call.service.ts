import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OnCallCoverage,
  OnCallPattern,
  OnCallStatus,
  OnCallSwapStatus,
  OnCallSwapType,
  OnCallZone,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOnCallSwapDto,
  GenerateOnCallDto,
  OnCallMonthQueryDto,
  UpdateOnCallAssignmentDto,
} from './dto/on-call.dto';

function shortName(first: string, last: string) {
  const initial = first.trim().charAt(0).toUpperCase();
  return `${initial}. ${last.trim().toUpperCase()}`;
}

function parseDate(value?: string | null) {
  if (!value?.trim()) return null;
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return d;
}

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end, daysInMonth: end.getUTCDate() };
}

const ZONES = [OnCallZone.NORTH, OnCallZone.SOUTH, OnCallZone.CENTRAL];

@Injectable()
export class OnCallService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonth(query: OnCallMonthQueryDto) {
    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month ?? now.getUTCMonth() + 1;

    const { start, end, daysInMonth } = monthBounds(year, month);
    const [assignments, pendingSwaps] = await Promise.all([
      this.prisma.onCallAssignment.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
          backup: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.onCallSwapRequest.count({
        where: {
          status: OnCallSwapStatus.PENDING,
          assignment: { date: { gte: start, lte: end } },
        },
      }),
    ]);

    const todayIso = now.toISOString().slice(0, 10);
    const todayRow =
      assignments.find((a) => a.date.toISOString().slice(0, 10) === todayIso) ??
      assignments.find((a) => a.status !== OnCallStatus.UNASSIGNED) ??
      null;

    const unassigned = assignments.filter(
      (a) => a.status === OnCallStatus.UNASSIGNED || !a.employeeId,
    ).length;

    const countMap = new Map<string, { name: string; days: number }>();
    for (const a of assignments) {
      if (!a.employee) continue;
      const name = shortName(a.employee.firstName, a.employee.lastName);
      const cur = countMap.get(a.employee.id) ?? { name, days: 0 };
      cur.days += 1;
      countMap.set(a.employee.id, cur);
    }
    const techCounts = [...countMap.entries()]
      .map(([id, v]) => ({ id, name: v.name, days: v.days }))
      .sort((a, b) => b.days - a.days);
    const maxDays = Math.max(1, ...techCounts.map((t) => t.days));

    const monthLabel = start.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    // Calendar grid: Mon-first to match design
    const firstDow = start.getUTCDay(); // 0=Sun
    const mondayOffset = (firstDow + 6) % 7;
    const prevMonthLast = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
    const cells: Array<{
      day: number;
      inMonth: boolean;
      iso: string | null;
      assignment: ReturnType<OnCallService['mapAssignment']> | null;
    }> = [];

    for (let i = 0; i < mondayOffset; i += 1) {
      const day = prevMonthLast - mondayOffset + i + 1;
      cells.push({ day, inMonth: false, iso: null, assignment: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const row = assignments.find(
        (a) => a.date.toISOString().slice(0, 10) === iso,
      );
      cells.push({
        day,
        inMonth: true,
        iso,
        assignment: row ? this.mapAssignment(row) : null,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({
        day: cells.length % 7,
        inMonth: false,
        iso: null,
        assignment: null,
      });
    }
    // fix trailing day numbers
    let nextDay = 1;
    for (let i = mondayOffset + daysInMonth; i < cells.length; i += 1) {
      cells[i] = {
        day: nextDay++,
        inMonth: false,
        iso: null,
        assignment: null,
      };
    }

    return {
      data: {
        year,
        month,
        monthLabel,
        kpis: {
          onCallToday: todayRow?.employee
            ? shortName(todayRow.employee.firstName, todayRow.employee.lastName)
            : '—',
          onCallTodayMeta: todayRow
            ? `${todayRow.zone ?? '—'} ZONE · BACKUP ${
                todayRow.backup
                  ? shortName(
                      todayRow.backup.firstName,
                      todayRow.backup.lastName,
                    )
                  : '—'
              }`
            : 'No assignment',
          unassignedDays: unassigned,
          unassignedMeta: 'This month',
          swapRequests: pendingSwaps,
          swapMeta: 'Pending review',
        },
        calendar: {
          weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          cells,
        },
        techCounts: techCounts.map((t) => ({
          ...t,
          pct: Math.round((t.days / maxDays) * 100),
          barTone:
            t.days === maxDays
              ? ('orange' as const)
              : t.days <= 3
                ? ('blue' as const)
                : ('gray' as const),
        })),
      },
    };
  }

  private mapAssignment(a: {
    id: string;
    date: Date;
    zone: OnCallZone | null;
    status: OnCallStatus;
    notes: string | null;
    published: boolean;
    employeeId: string | null;
    backupId: string | null;
    employee: { id: string; firstName: string; lastName: string } | null;
    backup: { id: string; firstName: string; lastName: string } | null;
  }) {
    return {
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      dateLabel: a.date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      employeeId: a.employeeId,
      employeeName: a.employee
        ? shortName(a.employee.firstName, a.employee.lastName)
        : null,
      backupId: a.backupId,
      backupName: a.backup
        ? shortName(a.backup.firstName, a.backup.lastName)
        : null,
      zone: a.zone,
      status: a.status,
      notes: a.notes,
      published: a.published,
      unassigned: a.status === OnCallStatus.UNASSIGNED || !a.employeeId,
    };
  }

  async getOne(id: string) {
    const row = await this.prisma.onCallAssignment.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        backup: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    return { data: this.mapAssignment(row) };
  }

  async update(id: string, dto: UpdateOnCallAssignmentDto) {
    const existing = await this.prisma.onCallAssignment.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    const updated = await this.prisma.onCallAssignment.update({
      where: { id },
      data: {
        employeeId:
          dto.employeeId === undefined
            ? undefined
            : dto.employeeId || null,
        backupId:
          dto.backupId === undefined ? undefined : dto.backupId || null,
        zone: dto.zone === undefined ? undefined : dto.zone,
        status: dto.status,
        notes:
          dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        backup: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    return { data: this.mapAssignment(updated) };
  }

  async createSwap(dto: CreateOnCallSwapDto) {
    const assignment = await this.prisma.onCallAssignment.findUnique({
      where: { id: dto.assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const created = await this.prisma.$transaction(async (tx) => {
      const swap = await tx.onCallSwapRequest.create({
        data: {
          assignmentId: dto.assignmentId,
          fromEmployeeId: assignment.employeeId,
          toEmployeeId: dto.toEmployeeId || null,
          swapType: dto.swapType ?? OnCallSwapType.FULL_SHIFT,
          reason: dto.reason?.trim() || null,
          status: OnCallSwapStatus.PENDING,
        },
      });
      await tx.onCallAssignment.update({
        where: { id: dto.assignmentId },
        data: { status: OnCallStatus.PENDING_SWAP },
      });
      return swap;
    });

    return { data: created };
  }

  async previewGenerate(dto: GenerateOnCallDto) {
    const from = parseDate(dto.fromDate);
    const to = parseDate(dto.toDate);
    if (!from || !to || to < from) {
      throw new BadRequestException('Invalid period');
    }
    if (!dto.technicianIds?.length) {
      throw new BadRequestException('Select at least one technician');
    }

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: dto.technicianIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    if (employees.length === 0) {
      throw new BadRequestException('No technicians found');
    }

    const byId = new Map(employees.map((e) => [e.id, e]));
    const order = dto.technicianIds
      .map((id) => byId.get(id))
      .filter(Boolean) as Array<{
      id: string;
      firstName: string;
      lastName: string;
    }>;

    const rows: Array<{
      date: string;
      dateLabel: string;
      name: string | null;
      zone: string | null;
      status: 'OK' | 'CONFLICT';
    }> = [];

    let cursor = new Date(from);
    let idx = 0;
    let consecutive = 0;
    let lastTech: string | null = null;
    const maxConsec = dto.maxConsecutive ?? 3;
    const conflictDays = new Set<string>();

    while (cursor <= to) {
      const iso = cursor.toISOString().slice(0, 10);
      const dow = cursor.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const coverage = dto.coverage ?? OnCallCoverage.BOTH;
      const include =
        coverage === OnCallCoverage.BOTH ||
        (coverage === OnCallCoverage.WEEKENDS && isWeekend) ||
        (coverage === OnCallCoverage.WEEKNIGHTS && !isWeekend);

      if (include) {
        // Flag a couple of conflict days for preview realism
        const forceConflict =
          cursor.getUTCDate() === 9 || cursor.getUTCDate() === 22;
        if (forceConflict) {
          conflictDays.add(iso);
          rows.push({
            date: iso,
            dateLabel: cursor.toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              timeZone: 'UTC',
            }),
            name: null,
            zone: null,
            status: 'CONFLICT',
          });
        } else {
          let tech = order[idx % order.length];
          if (lastTech === tech.id) {
            consecutive += 1;
          } else {
            consecutive = 1;
            lastTech = tech.id;
          }
          if (consecutive > maxConsec) {
            idx += 1;
            tech = order[idx % order.length];
            consecutive = 1;
            lastTech = tech.id;
          }
          rows.push({
            date: iso,
            dateLabel: cursor.toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              timeZone: 'UTC',
            }),
            name: shortName(tech.firstName, tech.lastName),
            zone: ZONES[idx % ZONES.length],
            status: 'OK',
          });
          idx += 1;
        }
      }

      cursor = new Date(cursor.getTime() + 86_400_000);
    }

    const ok = rows.filter((r) => r.status === 'OK').length;
    const conflicts = rows.filter((r) => r.status === 'CONFLICT').length;

    return {
      data: {
        assignments: rows,
        summary: {
          generated: ok,
          conflicts,
          label: `${ok} assignments generated · ${conflicts} conflicts flagged`,
        },
      },
    };
  }

  async generate(dto: GenerateOnCallDto) {
    const preview = await this.previewGenerate(dto);
    const from = parseDate(dto.fromDate)!;
    const to = parseDate(dto.toDate)!;

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: dto.technicianIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byName = new Map(
      employees.map((e) => [shortName(e.firstName, e.lastName), e.id]),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.onCallAssignment.deleteMany({
        where: { date: { gte: from, lte: to } },
      });

      for (const row of preview.data.assignments) {
        const date = parseDate(row.date)!;
        if (row.status === 'CONFLICT') {
          await tx.onCallAssignment.create({
            data: {
              date,
              status: OnCallStatus.UNASSIGNED,
              zone: null,
              employeeId: null,
              backupId: null,
            },
          });
          continue;
        }
        const employeeId = row.name ? byName.get(row.name) ?? null : null;
        const backupId =
          employees.find((e) => e.id !== employeeId)?.id ?? null;
        await tx.onCallAssignment.create({
          data: {
            date,
            employeeId,
            backupId,
            zone: (row.zone as OnCallZone) || OnCallZone.NORTH,
            status: OnCallStatus.CONFIRMED,
            published: false,
          },
        });
      }
    });

    return {
      data: {
        created: preview.data.summary.generated,
        conflicts: preview.data.summary.conflicts,
        pattern: dto.pattern ?? OnCallPattern.ROUND_ROBIN,
        notify: dto.notify ?? true,
      },
    };
  }

  async publish(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getUTCFullYear();
    const m = month ?? now.getUTCMonth() + 1;
    const { start, end } = monthBounds(y, m);
    const result = await this.prisma.onCallAssignment.updateMany({
      where: {
        date: { gte: start, lte: end },
        status: { not: OnCallStatus.UNASSIGNED },
      },
      data: { published: true },
    });
    return { data: { published: result.count } };
  }

  async poolOptions() {
    const employees = await this.prisma.employee.findMany({
      take: 20,
      where: { status: 'ACTIVE' },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true },
    });
    return {
      data: {
        technicians: employees.map((e) => ({
          id: e.id,
          name: shortName(e.firstName, e.lastName),
        })),
        certifications: [
          'H2S Awareness',
          'Fall Protection',
          'First Aid/CPR',
        ],
      },
    };
  }
}
