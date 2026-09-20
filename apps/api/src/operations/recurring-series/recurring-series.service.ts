import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RecurringSeriesFrequency,
  RecurringSeriesStatus,
  type RecurringSeriesOccurrence,
  type RecurringWorkOrderSeries,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePage } from '../../common/utils/pagination.util';
import {
  CancelRecurringSeriesDto,
  CreateRecurringSeriesDto,
  RecurringSeriesListQueryDto,
  UpdateRecurringSeriesDto,
} from './dto/recurring-series.dto';

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function fmtNext(d: Date | null | undefined) {
  if (!d) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function fmtLongDate(d: Date | null | undefined) {
  if (!d) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function hoursNum(n: Prisma.Decimal | number | null | undefined) {
  if (n == null) return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

type SeriesWithCustomer = RecurringWorkOrderSeries & {
  customer: { id: string; name: string; code: string };
};

@Injectable()
export class RecurringSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapOccurrence(
    row: RecurringSeriesOccurrence,
    totalPlanned: number,
  ) {
    const n = String(row.occurrenceNumber).padStart(2, '0');
    const total = String(totalPlanned).padStart(2, '0');
    return {
      id: row.id,
      occurrenceNumber: row.occurrenceNumber,
      occurrenceLabel: `${n} / ${total}`,
      workOrderId: row.workOrderId,
      workOrderCode: row.workOrderCode,
      serviceDate: row.serviceDate.toISOString(),
      serviceDateLabel: fmtLongDate(row.serviceDate),
      crewLabel: row.crewLabel,
      status: row.status,
    };
  }

  private mapRow(row: SeriesWithCustomer) {
    const totalPlanned =
      row.endsAfterOccurrences ||
      row.generatedCount + row.remainingCount ||
      12;
    const isEnded = row.status === RecurringSeriesStatus.ENDED;
    return {
      id: row.id,
      code: row.code,
      customerId: row.customerId,
      customerName: row.customer.name,
      jobType: row.jobType,
      frequency: row.frequency,
      nextOccurrence: isEnded
        ? null
        : (row.nextOccurrence?.toISOString() ?? null),
      nextOccurrenceLabel: isEnded ? null : fmtNext(row.nextOccurrence),
      nextOccurrenceLongLabel: isEnded
        ? null
        : fmtLongDate(row.nextOccurrence),
      generatedCount: row.generatedCount,
      remainingCount: isEnded ? 0 : row.remainingCount,
      status: row.status,
      dayRule: row.dayRule,
      generateAheadDays: row.generateAheadDays,
      endsAfterOccurrences: row.endsAfterOccurrences,
      endsOnDate: row.endsOnDate?.toISOString() ?? null,
      endsNever: row.endsNever,
      crewTemplate: row.crewTemplate,
      estimatedDurationHours: hoursNum(row.estimatedDurationHours),
      requiredForms: row.requiredForms,
      requiredEquipment: row.requiredEquipment,
      notes: row.notes,
      totalPlanned,
      generatedOfLabel: `${row.generatedCount} OF ${totalPlanned} GENERATED`,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDetail(
    row: SeriesWithCustomer & { occurrences: RecurringSeriesOccurrence[] },
  ) {
    const base = this.mapRow(row);
    const totalPlanned = base.totalPlanned;
    const unstartedStatuses = new Set([
      'DRAFT',
      'SCHEDULED',
      'OPEN',
      'PENDING',
    ]);
    const unstartedCount = row.occurrences.filter((o) =>
      unstartedStatuses.has(o.status.toUpperCase()),
    ).length;
    const remaining = row.remainingCount;
    const isEnded = row.status === RecurringSeriesStatus.ENDED;
    return {
      ...base,
      isEnded,
      statusHeadline: isEnded
        ? 'ENDED · FUTURE GENERATION STOPPED'
        : null,
      settings: {
        frequency: row.frequency,
        dayRule: row.dayRule,
        dayRuleHint: 'FIRST MONDAY / SAME DATE / SPECIFIC WEEKDAY',
        generateAheadDays: row.generateAheadDays,
        generateLabel: `${row.generateAheadDays} DAYS AHEAD · 7 / 14 / 30`,
        endsLabel: `AFTER ${row.endsAfterOccurrences} OCCURRENCES`,
        otherEndLabel: row.endsNever
          ? 'ON A DATE · NEVER'
          : row.endsOnDate
            ? `ON A DATE · ${fmtLongDate(row.endsOnDate)}`
            : 'ON A DATE · NEVER',
        editScopeNote:
          'Edit scope is chosen before any generated work order is updated.',
        footerNote: isEnded
          ? 'Series ended. Generated work orders remain available below.'
          : 'Edit scope is chosen before any generated work order is updated.',
        footerTone: isEnded ? ('muted' as const) : ('warning' as const),
      },
      template: {
        crewTemplate: row.crewTemplate ?? '—',
        estimatedDuration:
          row.estimatedDurationHours != null
            ? `${hoursNum(row.estimatedDurationHours)} HOURS PER OCCURRENCE`
            : '—',
        requiredForms: row.requiredForms ?? '—',
        requiredEquipment: row.requiredEquipment ?? '—',
      },
      editScope: {
        futureOnly: {
          value: 'FUTURE_ONLY' as const,
          label: 'Apply to future occurrences only',
          description: `${remaining} remaining; already generated work orders stay as they are.`,
        },
        allUnstarted: {
          value: 'ALL_UNSTARTED' as const,
          label: 'Apply to all unstarted occurrences',
          description:
            unstartedCount > 0
              ? `Also updates Draft or Scheduled work orders; ${unstartedCount} in this series.`
              : 'Also updates Draft or Scheduled work orders; none in this series.',
        },
        warning:
          'Dispatched, in-progress and closed jobs are never changed.',
        remainingCount: remaining,
        unstartedCount,
      },
      cancelPreview: {
        question: 'Stop generating future work orders for this series?',
        remainingHeadline: `${remaining} remaining occurrence${remaining === 1 ? '' : 's'} will not be generated.`,
        intactNote: `${row.generatedCount} generated work order${row.generatedCount === 1 ? '' : 's'} stay intact. Dispatched, in-progress and closed jobs are never changed.`,
        keepLabel: 'Keep Series',
        confirmLabel: 'Cancel Future Generation',
      },
      occurrences: row.occurrences
        .slice()
        .sort((a, b) => a.occurrenceNumber - b.occurrenceNumber)
        .map((o) => this.mapOccurrence(o, totalPlanned)),
    };
  }

  private async nextCode() {
    const latest = await this.prisma.recurringWorkOrderSeries.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let seq = 1;
    if (latest?.code) {
      const n = Number(latest.code.replace(/\D/g, ''));
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `SER-${String(seq).padStart(4, '0')}`;
  }

  private async enrichDemoDetails() {
    const series = await this.prisma.recurringWorkOrderSeries.findMany({
      where: { archivedAt: null },
      include: { _count: { select: { occurrences: true } } },
    });

    for (const s of series) {
      const defaults =
        s.code === 'SER-0012'
          ? {
              dayRule: 'SAME DATE - 1ST',
              generateAheadDays: 14,
              endsAfterOccurrences: 12,
              endsNever: true,
              crewTemplate: '2 FIRE-WATCH TECHNICIANS',
              estimatedDurationHours: 10,
              requiredForms: 'JSA · PERMIT TO WORK · AIR QUALITY TESTING',
              requiredEquipment:
                'GAS MONITOR (4-GAS) · CALIBRATION CYLINDER',
              generatedCount: 6,
              remainingCount: 6,
            }
          : s.code === 'SER-0009'
            ? {
                dayRule: 'SAME DATE - 1ST',
                generateAheadDays: 14,
                endsAfterOccurrences: 4,
                endsNever: true,
                crewTemplate: '1 GAS DETECTION TECH',
                estimatedDurationHours: 8,
                requiredForms: 'JSA · PERMIT TO WORK',
                requiredEquipment: 'GAS MONITOR (4-GAS)',
                generatedCount: 2,
                remainingCount: 2,
              }
            : {
                dayRule: 'SPECIFIC WEEKDAY - MONDAY',
                generateAheadDays: 7,
                endsAfterOccurrences: 18,
                endsNever: true,
                crewTemplate: '2 CONFINED-SPACE TECHNICIANS',
                estimatedDurationHours: 12,
                requiredForms: 'JSA · PTW · AIR QUALITY TESTING',
                requiredEquipment: 'TRIPOD & WINCH · SCBA',
                generatedCount: 18,
                remainingCount: 0,
              };

      await this.prisma.recurringWorkOrderSeries.update({
        where: { id: s.id },
        data: {
          dayRule: s.dayRule || defaults.dayRule,
          generateAheadDays: s.generateAheadDays || defaults.generateAheadDays,
          endsAfterOccurrences:
            s.endsAfterOccurrences || defaults.endsAfterOccurrences,
          endsNever: s.endsNever ?? defaults.endsNever,
          crewTemplate: s.crewTemplate ?? defaults.crewTemplate,
          estimatedDurationHours:
            s.estimatedDurationHours ?? defaults.estimatedDurationHours,
          requiredForms: s.requiredForms ?? defaults.requiredForms,
          requiredEquipment:
            s.requiredEquipment ?? defaults.requiredEquipment,
          generatedCount: Math.max(s.generatedCount, defaults.generatedCount),
          remainingCount:
            s.status === RecurringSeriesStatus.ENDED
              ? 0
              : Math.max(s.remainingCount, defaults.remainingCount),
        },
      });

      if (s._count.occurrences > 0) continue;

      const count =
        s.code === 'SER-0012' ? 6 : s.code === 'SER-0009' ? 2 : Math.min(s.generatedCount || 3, 6);
      const startYear = 2026;
      const baseWo = s.code === 'SER-0012' ? 46006001 : s.code === 'SER-0009' ? 46007001 : 46008001;

      for (let i = 1; i <= count; i++) {
        const month = i - 1;
        await this.prisma.recurringSeriesOccurrence.create({
          data: {
            seriesId: s.id,
            occurrenceNumber: i,
            workOrderCode: `${startYear} ${baseWo + i - 1}-WO`,
            serviceDate: new Date(Date.UTC(startYear, month, 1)),
            crewLabel: '2 TECHS',
            status: 'CLOSED',
          },
        });
      }
    }
  }

  /** Seed Figma-style demo rows when the table is empty. */
  async ensureDemoSeries() {
    const existing = await this.prisma.recurringWorkOrderSeries.count({
      where: { archivedAt: null },
    });
    if (existing === 0) {
      const customers = await this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { code: 'asc' },
        take: 8,
        select: { id: true, name: true, code: true },
      });
      if (!customers.length) return { created: 0 };

      const byName = (needle: string) =>
        customers.find((c) =>
          c.name.toLowerCase().includes(needle.toLowerCase()),
        ) ?? customers[0]!;

      const defs = [
        {
          code: 'SER-0012',
          customerId: byName('Permian').id,
          jobType: 'FIRE WATCH',
          frequency: RecurringSeriesFrequency.MONTHLY,
          nextOccurrence: null,
          generatedCount: 6,
          remainingCount: 0,
          status: RecurringSeriesStatus.ENDED,
          dayRule: 'SAME DATE - 1ST',
          generateAheadDays: 14,
          endsAfterOccurrences: 12,
          endsNever: true,
          crewTemplate: '2 FIRE-WATCH TECHNICIANS',
          estimatedDurationHours: 10,
          requiredForms: 'JSA · PERMIT TO WORK · AIR QUALITY TESTING',
          requiredEquipment: 'GAS MONITOR (4-GAS) · CALIBRATION CYLINDER',
        },
        {
          code: 'SER-0009',
          customerId: byName('Lonestar').id,
          jobType: 'GAS DETECTION SURVEY',
          frequency: RecurringSeriesFrequency.QUARTERLY,
          nextOccurrence: new Date(Date.UTC(2026, 8, 1)),
          generatedCount: 2,
          remainingCount: 2,
          status: RecurringSeriesStatus.ACTIVE,
          dayRule: 'SAME DATE - 1ST',
          generateAheadDays: 14,
          endsAfterOccurrences: 4,
          endsNever: true,
          crewTemplate: '1 GAS DETECTION TECH',
          estimatedDurationHours: 8,
          requiredForms: 'JSA · PERMIT TO WORK',
          requiredEquipment: 'GAS MONITOR (4-GAS)',
        },
        {
          code: 'SER-0004',
          customerId: byName('Summit').id,
          jobType: 'CONFINED SPACE STANDBY',
          frequency: RecurringSeriesFrequency.WEEKLY,
          nextOccurrence: null,
          generatedCount: 18,
          remainingCount: 0,
          status: RecurringSeriesStatus.ENDED,
          dayRule: 'SPECIFIC WEEKDAY - MONDAY',
          generateAheadDays: 7,
          endsAfterOccurrences: 18,
          endsNever: true,
          crewTemplate: '2 CONFINED-SPACE TECHNICIANS',
          estimatedDurationHours: 12,
          requiredForms: 'JSA · PTW · AIR QUALITY TESTING',
          requiredEquipment: 'TRIPOD & WINCH · SCBA',
        },
      ];

      for (const d of defs) {
        await this.prisma.recurringWorkOrderSeries.upsert({
          where: { code: d.code },
          update: d,
          create: d,
        });
      }
    }

    await this.enrichDemoDetails();
    return { created: existing === 0 ? 3 : 0 };
  }

  async list(query: RecurringSeriesListQueryDto) {
    await this.ensureDemoSeries();
    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize ?? 25,
    );

    const where: Prisma.RecurringWorkOrderSeriesWhereInput = {
      archivedAt: null,
    };
    const status = query.status?.trim().toUpperCase();
    if (status && status !== 'ALL') {
      if (status === 'ACTIVE' || status === 'ENDED') {
        where.status = status as RecurringSeriesStatus;
      }
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { jobType: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total, activeCount, allCount] = await Promise.all([
      this.prisma.recurringWorkOrderSeries.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ code: 'desc' }],
        skip,
        take,
      }),
      this.prisma.recurringWorkOrderSeries.count({ where }),
      this.prisma.recurringWorkOrderSeries.count({
        where: { archivedAt: null, status: RecurringSeriesStatus.ACTIVE },
      }),
      this.prisma.recurringWorkOrderSeries.count({
        where: { archivedAt: null },
      }),
    ]);

    return {
      data: {
        items: rows.map((r) => this.mapRow(r)),
        page,
        pageSize,
        total,
      },
      summary: {
        total: allCount,
        active: activeCount,
        label: `${allCount} SERIES · ${activeCount} ACTIVE`,
      },
    };
  }

  async getOne(id: string) {
    await this.ensureDemoSeries();
    const row = await this.prisma.recurringWorkOrderSeries.findFirst({
      where: { id, archivedAt: null },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        occurrences: { orderBy: { occurrenceNumber: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: 'Recurring series not found',
      });
    }
    return { data: this.mapDetail(row) };
  }

  async create(dto: CreateRecurringSeriesDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, archivedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
      });
    }

    const remaining = dto.remainingCount ?? dto.endsAfterOccurrences ?? 12;
    const generated = dto.generatedCount ?? 0;
    const endsAfter = dto.endsAfterOccurrences ?? remaining;
    const next =
      dto.nextOccurrence != null
        ? new Date(dto.nextOccurrence)
        : remaining > 0
          ? new Date()
          : null;

    const code = await this.nextCode();
    const row = await this.prisma.recurringWorkOrderSeries.create({
      data: {
        code,
        customerId: dto.customerId,
        jobType: dto.jobType.trim().toUpperCase(),
        frequency: dto.frequency as RecurringSeriesFrequency,
        nextOccurrence: remaining > 0 ? next : null,
        generatedCount: generated,
        remainingCount: remaining,
        status:
          remaining > 0
            ? RecurringSeriesStatus.ACTIVE
            : RecurringSeriesStatus.ENDED,
        dayRule: dto.dayRule?.trim() || 'SAME DATE - 1ST',
        generateAheadDays: dto.generateAheadDays ?? 14,
        endsAfterOccurrences: endsAfter,
        endsNever: true,
        crewTemplate: dto.crewTemplate?.trim() || null,
        estimatedDurationHours: dto.estimatedDurationHours ?? null,
        requiredForms: dto.requiredForms?.trim() || null,
        requiredEquipment: dto.requiredEquipment?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        occurrences: true,
      },
    });
    return { data: this.mapDetail(row) };
  }

  async update(id: string, dto: UpdateRecurringSeriesDto) {
    const existing = await this.prisma.recurringWorkOrderSeries.findFirst({
      where: { id, archivedAt: null },
      include: { occurrences: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: 'Recurring series not found',
      });
    }
    if (existing.status === RecurringSeriesStatus.ENDED) {
      throw new BadRequestException({
        code: 'SERIES_ENDED',
        message: 'Ended series cannot be edited',
      });
    }

    const scope = dto.updateScope ?? 'FUTURE_ONLY';
    const unstartedStatuses = new Set([
      'DRAFT',
      'SCHEDULED',
      'OPEN',
      'PENDING',
    ]);
    const unstarted = existing.occurrences.filter((o) =>
      unstartedStatuses.has(o.status.toUpperCase()),
    );
    const affected =
      scope === 'ALL_UNSTARTED' ? unstarted.length : existing.remainingCount;

    const scopeNote = `[EDIT SCOPE ${new Date().toISOString().slice(0, 10)}] ${scope}${
      scope === 'ALL_UNSTARTED'
        ? ` · ${unstarted.length} unstarted WO(s) eligible`
        : ` · future only (${existing.remainingCount} remaining)`
    } · dispatched/in-progress/closed never changed`;

    const row = await this.prisma.recurringWorkOrderSeries.update({
      where: { id },
      data: {
        ...(dto.jobType != null
          ? { jobType: dto.jobType.trim().toUpperCase() }
          : {}),
        ...(dto.frequency != null
          ? { frequency: dto.frequency as RecurringSeriesFrequency }
          : {}),
        ...(dto.nextOccurrence !== undefined
          ? {
              nextOccurrence: dto.nextOccurrence
                ? new Date(dto.nextOccurrence)
                : null,
            }
          : {}),
        ...(dto.dayRule != null ? { dayRule: dto.dayRule.trim() } : {}),
        ...(dto.generateAheadDays != null
          ? { generateAheadDays: dto.generateAheadDays }
          : {}),
        ...(dto.endsAfterOccurrences != null
          ? { endsAfterOccurrences: dto.endsAfterOccurrences }
          : {}),
        ...(dto.endsOnDate !== undefined
          ? {
              endsOnDate: dto.endsOnDate ? new Date(dto.endsOnDate) : null,
            }
          : {}),
        ...(dto.endsNever != null ? { endsNever: dto.endsNever } : {}),
        ...(dto.crewTemplate != null
          ? { crewTemplate: dto.crewTemplate.trim() }
          : {}),
        ...(dto.estimatedDurationHours != null
          ? { estimatedDurationHours: dto.estimatedDurationHours }
          : {}),
        ...(dto.requiredForms != null
          ? { requiredForms: dto.requiredForms.trim() }
          : {}),
        ...(dto.requiredEquipment != null
          ? { requiredEquipment: dto.requiredEquipment.trim() }
          : {}),
        notes: (() => {
          const base = dto.notes?.trim() || existing.notes || '';
          return base ? `${base}\n${scopeNote}` : scopeNote;
        })(),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        occurrences: { orderBy: { occurrenceNumber: 'asc' } },
      },
    });

    return {
      data: {
        ...this.mapDetail(row),
        lastUpdate: {
          scope,
          affectedCount: affected,
          message:
            scope === 'FUTURE_ONLY'
              ? `Settings saved for future occurrences only (${existing.remainingCount} remaining).`
              : `Settings saved; ${unstarted.length} unstarted occurrence(s) eligible for update.`,
        },
      },
    };
  }

  async cancel(id: string, dto: CancelRecurringSeriesDto) {
    const existing = await this.prisma.recurringWorkOrderSeries.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: 'Recurring series not found',
      });
    }
    if (existing.status === RecurringSeriesStatus.ENDED) {
      throw new BadRequestException({
        code: 'SERIES_ALREADY_ENDED',
        message: 'This series is already ended',
      });
    }

    const remainingBefore = existing.remainingCount;
    const generatedBefore = existing.generatedCount;
    const note = dto.reason?.trim()
      ? `[CANCELLED ${new Date().toISOString().slice(0, 10)}] ${dto.reason.trim()}`
      : `[CANCELLED ${new Date().toISOString().slice(0, 10)}] Future generation cancelled · ${remainingBefore} remaining not generated · ${generatedBefore} generated WOs intact`;

    const row = await this.prisma.recurringWorkOrderSeries.update({
      where: { id },
      data: {
        status: RecurringSeriesStatus.ENDED,
        nextOccurrence: null,
        remainingCount: 0,
        notes: existing.notes ? `${existing.notes}\n${note}` : note,
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        occurrences: { orderBy: { occurrenceNumber: 'asc' } },
      },
    });
    return {
      data: {
        ...this.mapDetail(row),
        cancelResult: {
          remainingStopped: remainingBefore,
          generatedIntact: generatedBefore,
          message: `Future generation cancelled. ${remainingBefore} remaining occurrence(s) will not be generated; ${generatedBefore} generated work order(s) stay intact.`,
        },
      },
    };
  }

  async options() {
    const customers = await this.prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
      take: 100,
      select: { id: true, name: true },
    });
    return {
      data: {
        customers: customers.map((c) => ({
          value: c.id,
          label: c.name,
        })),
        frequencies: [
          { value: 'WEEKLY', label: 'Weekly' },
          { value: 'FORTNIGHTLY', label: 'Fortnightly' },
          { value: 'MONTHLY', label: 'Monthly' },
          { value: 'QUARTERLY', label: 'Quarterly' },
          { value: 'ANNUALLY', label: 'Annually' },
        ],
        jobTypes: [
          { value: 'FIRE WATCH', label: 'Fire Watch' },
          { value: 'GAS DETECTION SURVEY', label: 'Gas Detection Survey' },
          {
            value: 'CONFINED SPACE STANDBY',
            label: 'Confined Space Standby',
          },
          { value: 'H2S MONITORING', label: 'H2S Monitoring' },
          { value: 'SITE SAFETY TECH', label: 'Site Safety Tech' },
        ],
      },
    };
  }
}
