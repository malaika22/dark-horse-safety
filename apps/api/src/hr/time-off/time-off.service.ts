import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeOffStatus, TimeOffType } from '@prisma/client';
import {
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTimeOffDto,
  DecideTimeOffDto,
  TimeOffCalendarQueryDto,
  TimeOffQueryDto,
} from './dto/time-off.dto';

const SORT_MAP: Record<string, string> = {
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  type: 'type',
  requestedAt: 'requestedAt',
  hours: 'hoursRequested',
  employee: 'employeeId',
};

const employeeInclude = {
  employee: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      displayName: true,
      ptoBalance: true,
      sickBalance: true,
      crew: true,
    },
  },
} as const;

type Row = Prisma.TimeOffRequestGetPayload<{ include: typeof employeeInclude }>;

type JobRow = { code: string; date: string; label?: string };

function dec(n: Prisma.Decimal | number | null | undefined) {
  return Number(n ?? 0);
}

function techName(row: Row) {
  return (
    row.employee.displayName ||
    `${row.employee.firstName} ${row.employee.lastName}`.trim()
  );
}

function dateLabel(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function asJobs(value: unknown): JobRow[] {
  if (!Array.isArray(value)) return [];
  const out: JobRow[] = [];
  for (const v of value) {
    if (!v || typeof v !== 'object') continue;
    const row = v as Record<string, unknown>;
    if (typeof row.code !== 'string' || typeof row.date !== 'string') continue;
    out.push({
      code: row.code,
      date: row.date,
      ...(typeof row.label === 'string' ? { label: row.label } : {}),
    });
  }
  return out;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class TimeOffService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: Row) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employee: {
        id: row.employee.id,
        code: row.employee.code,
        name: techName(row),
        crew: row.employee.crew,
      },
      type: row.type,
      status: row.status,
      startDate: isoDay(row.startDate),
      endDate: isoDay(row.endDate),
      startLabel: row.startLabel,
      endLabel: row.endLabel,
      dayCount: row.dayCount,
      hoursRequested: dec(row.hoursRequested),
      balanceAfter: row.balanceAfter != null ? dec(row.balanceAfter) : null,
      coverage: row.coverage,
      requestedAt: row.requestedAt.toISOString(),
      requestedLabel: row.requestedLabel,
      reason: row.reason,
      adminNote: row.adminNote,
      crossesPayCycle: row.crossesPayCycle,
      onCallDates: asStringArray(row.onCallDates),
      assignedJobs: asJobs(row.assignedJobs),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async load(id: string) {
    const row = await this.prisma.timeOffRequest.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!row || row.archivedAt) {
      throw new NotFoundException('Time off request not found');
    }
    return row;
  }

  private currentBalance(row: Row) {
    if (row.type === TimeOffType.SICK) return dec(row.employee.sickBalance);
    if (row.type === TimeOffType.UNPAID || row.type === TimeOffType.BEREAVEMENT) {
      return dec(row.employee.ptoBalance);
    }
    return dec(row.employee.ptoBalance);
  }

  async kpi() {
    const base = { archivedAt: null as null };
    const now = new Date();
    const in14 = new Date(now);
    in14.setUTCDate(in14.getUTCDate() + 14);

    const [pending, approved, denied, upcoming, coverageNeeded, crossed] =
      await Promise.all([
        this.prisma.timeOffRequest.count({
          where: { ...base, status: TimeOffStatus.PENDING },
        }),
        this.prisma.timeOffRequest.count({
          where: { ...base, status: TimeOffStatus.APPROVED },
        }),
        this.prisma.timeOffRequest.count({
          where: { ...base, status: TimeOffStatus.DENIED },
        }),
        this.prisma.timeOffRequest.count({
          where: {
            ...base,
            status: TimeOffStatus.APPROVED,
            startDate: { gte: now, lte: in14 },
          },
        }),
        this.prisma.timeOffRequest.count({
          where: {
            ...base,
            coverage: 'NEEDED',
            status: { in: [TimeOffStatus.PENDING, TimeOffStatus.APPROVED] },
          },
        }),
        this.prisma.timeOffRequest.count({
          where: {
            ...base,
            status: TimeOffStatus.APPROVED,
            crossesPayCycle: true,
          },
        }),
      ]);

    return {
      data: {
        pending,
        pendingMeta: 'Awaiting supervisor approval',
        approved,
        approvedMeta: `${crossed} have crossed pay cycles`,
        denied,
        deniedMeta: 'Eligible to resubmit',
        upcoming,
        upcomingMeta: 'Starting within 14 days',
        coverageNeeded,
        coverageNeededMeta: 'Shifts without backup coverage',
      },
    };
  }

  async list(query: TimeOffQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const and: Prisma.TimeOffRequestWhereInput[] = [{ archivedAt: null }];

    if (query.status && query.status !== 'ANY') {
      and.push({ status: query.status as TimeOffStatus });
    }
    if (query.type && query.type !== 'ANY') {
      and.push({ type: query.type as TimeOffType });
    }
    if (query.coverage && query.coverage !== 'ANY') {
      and.push({ coverage: query.coverage });
    }
    if (query.employeeId && query.employeeId !== 'ANY') {
      and.push({ employeeId: query.employeeId });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      const or: Prisma.TimeOffRequestWhereInput[] = [
        { employee: { displayName: { contains: q, mode: 'insensitive' } } },
        { employee: { firstName: { contains: q, mode: 'insensitive' } } },
        { employee: { lastName: { contains: q, mode: 'insensitive' } } },
        { startLabel: { contains: q, mode: 'insensitive' } },
        { endLabel: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { coverage: { contains: q, mode: 'insensitive' } },
      ];
      const typeMatch = Object.values(TimeOffType).find(
        (t) => t === q.toUpperCase() || t.startsWith(q.toUpperCase()),
      );
      if (typeMatch) or.push({ type: typeMatch });
      and.push({ OR: or });
    }

    const where: Prisma.TimeOffRequestWhereInput = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.timeOffRequest.count({ where }),
      this.prisma.timeOffRequest.findMany({
        where,
        include: employeeInclude,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          startDate: 'asc',
        }),
        skip,
        take,
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => this.mapRow(r)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async calendar(query: TimeOffCalendarQueryDto) {
    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month ?? now.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const and: Prisma.TimeOffRequestWhereInput[] = [
      { archivedAt: null },
      { status: { in: [TimeOffStatus.APPROVED, TimeOffStatus.PENDING] } },
      { startDate: { lte: monthEnd } },
      { endDate: { gte: monthStart } },
    ];

    if (query.status && query.status !== 'ANY') {
      and.push({ status: query.status as TimeOffStatus });
    }
    if (query.type && query.type !== 'ANY') {
      and.push({ type: query.type as TimeOffType });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { employee: { displayName: { contains: q, mode: 'insensitive' } } },
          { employee: { firstName: { contains: q, mode: 'insensitive' } } },
          { employee: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const rows = await this.prisma.timeOffRequest.findMany({
      where: { AND: and },
      include: employeeInclude,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });

    const events = rows.map((r) => {
      const mapped = this.mapRow(r);
      return {
        id: mapped.id,
        employeeName: mapped.employee.name,
        type: mapped.type,
        status: mapped.status,
        startDate: mapped.startDate,
        endDate: mapped.endDate,
        startLabel: mapped.startLabel,
        endLabel: mapped.endLabel,
        coverage: mapped.coverage,
      };
    });

    return {
      data: {
        year,
        month,
        monthLabel: monthStart
          .toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase(),
        events,
      },
    };
  }

  async getOne(id: string) {
    return { data: this.mapRow(await this.load(id)) };
  }

  async review(id: string) {
    const row = await this.load(id);
    const mapped = this.mapRow(row);
    const currentBalance = this.currentBalance(row);
    const requested = mapped.hoursRequested;
    const balanceAfter =
      mapped.balanceAfter != null
        ? mapped.balanceAfter
        : Math.max(0, currentBalance - requested);
    const sufficient = balanceAfter >= 0 && currentBalance >= requested;

    const overlaps = await this.prisma.timeOffRequest.findMany({
      where: {
        archivedAt: null,
        id: { not: row.id },
        employeeId: { not: row.employeeId },
        status: { in: [TimeOffStatus.APPROVED, TimeOffStatus.PENDING] },
        startDate: { lte: row.endDate },
        endDate: { gte: row.startDate },
        ...(row.employee.crew
          ? { employee: { crew: row.employee.crew } }
          : {}),
      },
      include: employeeInclude,
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    const coverageChecks: Array<{
      id: string;
      kind: 'OVERLAP' | 'CONFLICT';
      label: string;
      detail: string;
      tone: 'warning' | 'danger';
    }> = [];

    for (const other of overlaps) {
      const days = overlapDays(
        row.startDate,
        row.endDate,
        other.startDate,
        other.endDate,
      );
      if (days <= 0) continue;
      const name = techName(other);
      coverageChecks.push({
        id: `overlap-${other.id}`,
        kind: 'OVERLAP',
        label: `Who else is off (${mapped.startLabel}–${mapped.endLabel})`,
        detail: `${name} — ${other.type}, ${other.startLabel} – ${other.endLabel} (overlaps ${days} day${days === 1 ? '' : 's'})`,
        tone: 'warning',
      });
    }

    const onCall = asStringArray(row.onCallDates).filter((d) => {
      const dt = new Date(`${d}T12:00:00.000Z`);
      return dt >= row.startDate && dt <= row.endDate;
    });
    if (onCall.length > 0) {
      coverageChecks.push({
        id: 'on-call',
        kind: 'CONFLICT',
        label: 'On-call status',
        detail: `Yes — scheduled on-call ${onCall.map((d) => dateLabel(new Date(`${d}T12:00:00.000Z`))).join(', ')}`,
        tone: 'danger',
      });
    } else {
      coverageChecks.push({
        id: 'on-call-clear',
        kind: 'OVERLAP',
        label: 'On-call status',
        detail: 'No — not scheduled on-call during this window',
        tone: 'warning',
      });
      // Remove clear on-call from conflict count — only keep real conflicts
      coverageChecks.pop();
    }

    const jobs = asJobs(row.assignedJobs).filter((j) => {
      const dt = new Date(`${j.date}T12:00:00.000Z`);
      return dt >= row.startDate && dt <= row.endDate;
    });
    if (jobs.length > 0) {
      const j = jobs[0];
      coverageChecks.push({
        id: 'jobs',
        kind: 'CONFLICT',
        label: 'Dispatched jobs',
        detail: `Yes — assigned to WO ${j.code}, dispatched ${dateLabel(new Date(`${j.date}T12:00:00.000Z`))}`,
        tone: 'danger',
      });
    }

    // Only count real conflicts (overlaps + conflict-kind items that are actual issues)
    const conflictItems = coverageChecks.filter(
      (c) =>
        c.kind === 'CONFLICT' ||
        (c.kind === 'OVERLAP' && c.id.startsWith('overlap-')),
    );

    return {
      data: {
        request: mapped,
        summary: `${mapped.employee.name} · ${mapped.type} · ${mapped.startLabel} – ${mapped.endLabel} · Requested ${mapped.requestedLabel}`,
        conflictCount: conflictItems.length,
        coverageChecks: conflictItems,
        balance: {
          current: currentBalance,
          requested,
          after: balanceAfter,
          status: sufficient ? 'SUFFICIENT' : 'INSUFFICIENT',
        },
      },
    };
  }

  async create(dto: CreateTimeOffDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, archivedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const start = new Date(`${dto.startDate}T12:00:00.000Z`);
    const end = new Date(`${dto.endDate}T12:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const type = (dto.type.toUpperCase() as TimeOffType) || TimeOffType.PTO;
    if (!Object.values(TimeOffType).includes(type)) {
      throw new BadRequestException('Invalid leave type');
    }

    const dayCount = daysBetween(start, end);
    const hoursRequested = dayCount * 8;
    const bal =
      type === TimeOffType.SICK
        ? Number(employee.sickBalance)
        : Number(employee.ptoBalance);
    const balanceAfter = Math.max(0, bal - hoursRequested);
    const now = new Date();

    const created = await this.prisma.timeOffRequest.create({
      data: {
        employeeId: employee.id,
        type,
        status: TimeOffStatus.PENDING,
        startDate: start,
        endDate: end,
        startLabel: dateLabel(start),
        endLabel: dateLabel(end),
        dayCount,
        hoursRequested,
        balanceAfter,
        coverage: 'NEEDED',
        requestedAt: now,
        requestedLabel: dateLabel(now),
        reason: dto.reason?.trim() || null,
      },
      include: employeeInclude,
    });

    return { data: this.mapRow(created) };
  }

  async approve(id: string, dto: DecideTimeOffDto) {
    const row = await this.load(id);
    if (row.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }
    const updated = await this.prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: TimeOffStatus.APPROVED,
        adminNote: dto.adminNote?.trim() || row.adminNote,
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async deny(id: string, dto: DecideTimeOffDto) {
    const row = await this.load(id);
    if (row.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be denied');
    }
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Reason for denial is required');
    }
    const updated = await this.prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: TimeOffStatus.DENIED,
        adminNote: reason,
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async exportCsv(query: TimeOffQueryDto) {
    const res = await this.list({ ...query, page: 1, pageSize: 200 });
    const header = [
      'employee',
      'type',
      'from',
      'to',
      'days',
      'hours',
      'balanceAfter',
      'coverage',
      'requested',
      'status',
    ];
    const lines = res.data.items.map((r) =>
      [
        r.employee.name,
        r.type,
        r.startLabel,
        r.endLabel,
        r.dayCount,
        r.hoursRequested,
        r.balanceAfter ?? '',
        r.coverage,
        r.requestedLabel,
        r.status,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    );
    return {
      data: {
        csv: [header.join(','), ...lines].join('\n'),
        filename: 'time-off-requests.csv',
      },
    };
  }
}
