import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma, SalesActivityType } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  ExportService,
  isoDate,
  userLabel,
} from '../../common/services/export.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { parseCrmRecordStatus } from '../../common/utils/crm-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSalesActivityDto,
  FollowUpDto,
  SalesActivityListQueryDto,
  UpdateSalesActivityDto,
} from './dto/sales-activity.dto';

const SORT_MAP: Record<string, string> = {
  activityAt: 'activityAt',
  activityCode: 'activityCode',
  type: 'type',
  createdAt: 'createdAt',
  followUpAt: 'followUpAt',
  outcome: 'outcome',
  status: 'status',
};

@Injectable()
export class SalesActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private listOrderBy(
    sort?: string,
    direction?: 'asc' | 'desc',
  ): Prisma.SalesActivityOrderByWithRelationInput {
    const dir = direction === 'asc' ? 'asc' : 'desc';
    if (sort === 'rep') return { rep: { lastName: dir } };
    if (sort === 'customer') return { customer: { name: dir } };
    return orderByFrom(sort, direction, SORT_MAP, {
      activityAt: 'desc',
    }) as Prisma.SalesActivityOrderByWithRelationInput;
  }

  private where(
    query: SalesActivityListQueryDto,
  ): Prisma.SalesActivityWhereInput {
    const and: Prisma.SalesActivityWhereInput[] = [
      { archivedAt: null },
    ];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.contactId) and.push({ contactId: query.contactId });
    if (query.locationId) and.push({ locationId: query.locationId });
    if (query.repId) and.push({ repId: query.repId });
    if (query.type) and.push({ type: query.type });
    const status = parseCrmRecordStatus(query.status);
    if (status) and.push({ status });
    if (query.outcome?.trim()) {
      and.push({ outcome: containsCi(query.outcome.trim()) });
    }
    if (query.hasLinkedQuote === true) {
      and.push({ linkedQuoteId: { not: null } });
    } else if (query.hasLinkedQuote === false) {
      and.push({ linkedQuoteId: null });
    }
    if (query.hasExpenseLogged === true) {
      and.push({ expenses: { some: { archivedAt: null } } });
    } else if (query.hasExpenseLogged === false) {
      and.push({ expenses: { none: { archivedAt: null } } });
    }
    if (query.followUpStatus) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      switch (query.followUpStatus) {
        case 'NONE':
          and.push({ followUpAt: null });
          break;
        case 'DONE':
          and.push({
            followUpAt: { not: null },
            status: CrmRecordStatus.COMPLETE,
          });
          break;
        case 'OVERDUE':
          and.push({
            followUpAt: { not: null, lt: startOfToday },
            status: { not: CrmRecordStatus.COMPLETE },
          });
          break;
        case 'OPEN':
          and.push({
            followUpAt: { not: null, gte: startOfToday },
            status: { not: CrmRecordStatus.COMPLETE },
          });
          break;
      }
    }
    if (query.from || query.to) {
      const activityAt: Prisma.DateTimeFilter = {};
      if (query.from) {
        const from = new Date(`${query.from}T00:00:00`);
        if (!Number.isNaN(from.getTime())) activityAt.gte = from;
      }
      if (query.to) {
        const to = new Date(`${query.to}T23:59:59.999`);
        if (!Number.isNaN(to.getTime())) activityAt.lte = to;
      }
      if (Object.keys(activityAt).length > 0) {
        and.push({ activityAt });
      }
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { subject: containsCi(q) },
          { activityCode: containsCi(q) },
          { notes: containsCi(q) },
          { outcome: containsCi(q) },
        ],
      });
    }
    return { AND: and };
  }

  async list(query: SalesActivityListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.salesActivity.count({ where }),
      this.prisma.salesActivity.findMany({
        where,
        skip,
        take,
        orderBy: this.listOrderBy(query.sort, query.direction),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          contact: { select: { id: true, fullName: true, code: true } },
          location: {
            select: { id: true, name: true, code: true, city: true, state: true },
          },
          rep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          linkedQuote: {
            select: {
              id: true,
              quoteNumber: true,
              amount: true,
              status: true,
              revision: true,
            },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const data = await this.prisma.salesActivity.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { data };
  }

  async kpi() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const weekBase = { archivedAt: null, activityAt: { gte: weekAgo } };

    const [thisWeek, calls, visits, meetings, followUps] = await Promise.all([
      this.prisma.salesActivity.count({ where: weekBase }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          type: SalesActivityType.CALL,
          activityAt: { gte: fiveDaysAgo },
        },
      }),
      this.prisma.salesActivity.count({
        where: { ...weekBase, type: SalesActivityType.VISIT },
      }),
      this.prisma.salesActivity.count({
        where: { ...weekBase, type: SalesActivityType.MEETING },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          followUpAt: { not: null, gte: startOfToday },
        },
      }),
    ]);
    return { data: { thisWeek, calls, visits, meetings, followUps } };
  }

  async summary() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekBase = { archivedAt: null as null, activityAt: { gte: weekAgo } };

    const [
      thisWeek,
      calls,
      visits,
      meetings,
      followUpsPending,
      byRepRaw,
      outcomesRaw,
      overdueFollowUps,
      openTasks,
    ] = await Promise.all([
      this.prisma.salesActivity.count({ where: weekBase }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          type: SalesActivityType.CALL,
          activityAt: { gte: fiveDaysAgo },
        },
      }),
      this.prisma.salesActivity.count({
        where: { ...weekBase, type: SalesActivityType.VISIT },
      }),
      this.prisma.salesActivity.count({
        where: { ...weekBase, type: SalesActivityType.MEETING },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          followUpAt: { not: null, gte: startOfToday },
        },
      }),
      this.prisma.salesActivity.groupBy({
        by: ['repId', 'type'],
        where: weekBase,
        _count: { _all: true },
      }),
      this.prisma.salesActivity.groupBy({
        by: ['outcome'],
        where: {
          ...weekBase,
          outcome: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.salesActivity.findMany({
        where: {
          archivedAt: null,
          followUpAt: { not: null, lt: startOfToday },
          status: { not: CrmRecordStatus.COMPLETE },
        },
        take: 20,
        orderBy: { followUpAt: 'asc' },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.crmTask.findMany({
        where: {
          archivedAt: null,
          status: { in: [CrmRecordStatus.OPEN, CrmRecordStatus.PENDING] },
        },
        take: 20,
        orderBy: { dueAt: 'asc' },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          salesActivity: {
            select: { id: true, activityCode: true },
          },
        },
      }),
    ]);

    const repIds = [
      ...new Set(byRepRaw.map((r) => r.repId).filter(Boolean) as string[]),
    ];
    const reps = repIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: repIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const repName = (id: string | null) => {
      if (!id) return 'Unassigned';
      const r = reps.find((x) => x.id === id);
      if (!r) return 'Unassigned';
      const first = (r.firstName ?? '').trim();
      const last = (r.lastName ?? '').trim();
      if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
      return (last || first || r.email || 'Unassigned').toUpperCase();
    };

    const byRepMap = new Map<
      string,
      {
        repId: string | null;
        repName: string;
        calls: number;
        visits: number;
        emails: number;
        meetings: number;
        total: number;
      }
    >();
    for (const row of byRepRaw) {
      const key = row.repId ?? 'none';
      const cur = byRepMap.get(key) ?? {
        repId: row.repId,
        repName: repName(row.repId),
        calls: 0,
        visits: 0,
        emails: 0,
        meetings: 0,
        total: 0,
      };
      const n = row._count._all;
      cur.total += n;
      if (row.type === SalesActivityType.CALL) cur.calls += n;
      else if (row.type === SalesActivityType.VISIT) cur.visits += n;
      else if (row.type === SalesActivityType.EMAIL) cur.emails += n;
      else if (row.type === SalesActivityType.MEETING) cur.meetings += n;
      byRepMap.set(key, cur);
    }

    const outcomeTotal = outcomesRaw.reduce((s, o) => s + o._count._all, 0);
    const normalizeOutcome = (raw: string | null) => {
      const u = (raw ?? 'UNKNOWN').toUpperCase();
      if (u.includes('POSITIVE') || u.includes('WON')) return 'POSITIVE';
      if (u.includes('NO ANSWER') || u.includes('NOANSWER')) return 'NO ANSWER';
      if (u.includes('NEUTRAL') || u.includes('CALLBACK')) return 'NEUTRAL';
      if (u.includes('NEGATIVE') || u.includes('LOST')) return 'NEGATIVE';
      return u || 'UNKNOWN';
    };
    const outcomeMap = new Map<string, number>();
    for (const o of outcomesRaw) {
      const key = normalizeOutcome(o.outcome);
      outcomeMap.set(key, (outcomeMap.get(key) ?? 0) + o._count._all);
    }
    const outcomes = [...outcomeMap.entries()].map(([label, count]) => ({
      label,
      count,
      percent: outcomeTotal
        ? Math.round((count / outcomeTotal) * 100)
        : 0,
    }));

    const followUpTracked = overdueFollowUps.length + followUpsPending;
    const onTrack = followUpsPending;
    const overdueItems = overdueFollowUps.map((a) => {
      const due = a.followUpAt ? new Date(a.followUpAt) : now;
      const days = Math.max(
        1,
        Math.ceil((startOfToday.getTime() - due.getTime()) / 86400000),
      );
      return {
        id: a.id,
        activityCode: a.activityCode,
        customerName: a.customer?.name ?? a.location?.name ?? '—',
        subject: a.subject ?? a.type,
        daysOverdue: days,
        followUpAt: a.followUpAt,
      };
    });

    const tasks = openTasks.map((t) => {
      const overdue =
        t.dueAt != null && t.dueAt.getTime() < now.getTime() && t.status === 'OPEN';
      return {
        ...t,
        displayStatus: overdue ? 'OVERDUE' : t.status,
      };
    });

    return {
      data: {
        kpi: {
          thisWeek,
          calls,
          visits,
          meetings,
          followUps: followUpsPending,
        },
        byRep: [...byRepMap.values()].sort((a, b) => b.total - a.total),
        outcomes,
        followUpCompliance: {
          onTrack,
          total: followUpTracked || overdueItems.length,
          percent:
            followUpTracked > 0
              ? Math.round((onTrack / followUpTracked) * 100)
              : 100,
          overdueCount: overdueItems.length,
          overdueItems,
        },
        tasks,
      },
    };
  }

  async getById(id: string) {
    const activity = await this.prisma.salesActivity.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        location: {
          select: { id: true, name: true, code: true, city: true, state: true },
        },
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            amount: true,
            status: true,
            notes: true,
            terms: true,
          },
        },
        expenses: {
          where: { archivedAt: null },
          orderBy: { expenseDate: 'desc' },
          take: 20,
          select: {
            id: true,
            code: true,
            merchant: true,
            amount: true,
            status: true,
            expenseDate: true,
            category: true,
          },
        },
        tasks: {
          where: { archivedAt: null },
          orderBy: { dueAt: 'asc' },
          take: 50,
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!activity) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Sales activity not found',
      });
    }
    const now = new Date();
    const tasks = activity.tasks.map((t) => ({
      ...t,
      displayStatus:
        t.status === CrmRecordStatus.OPEN &&
        t.dueAt &&
        t.dueAt.getTime() < now.getTime()
          ? 'OVERDUE'
          : t.status,
    }));
    return { data: { ...activity, tasks } };
  }

  async create(dto: CreateSalesActivityDto) {
    const activityCode = await this.codes.next('salesActivity');
    const createFollowUpTask = Boolean(dto.createFollowUpTask);
    let followUpAt = dto.followUpAt ? new Date(dto.followUpAt) : undefined;
    if (createFollowUpTask && !followUpAt) {
      followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    const activity = await this.prisma.salesActivity.create({
      data: {
        activityCode,
        type: dto.type ?? SalesActivityType.CALL,
        subject: dto.subject,
        outcome: dto.outcome,
        duration: dto.duration,
        notes: dto.notes,
        nextAction: dto.nextAction,
        followUpAt,
        createFollowUpTask,
        logExpense: Boolean(dto.logExpense),
        attendees: dto.attendees
          ? (dto.attendees as unknown as Prisma.InputJsonValue)
          : undefined,
        customerId: dto.customerId,
        contactId: dto.contactId,
        locationId: dto.locationId,
        repId: dto.repId,
        activityAt: dto.activityAt ? new Date(dto.activityAt) : undefined,
        linkedQuoteId: dto.linkedQuoteId,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.COMPLETE,
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        location: {
          select: { id: true, name: true, code: true, city: true, state: true },
        },
        linkedQuote: {
          select: { id: true, quoteNumber: true, amount: true, status: true },
        },
      },
    });

    if (createFollowUpTask && followUpAt) {
      const taskCode = await this.codes.next('task');
      await this.prisma.crmTask.create({
        data: {
          code: taskCode,
          title: dto.subject?.trim() || `Follow-up · ${activityCode}`,
          taskType: 'FOLLOW-UP',
          priority: 'MEDIUM',
          status: CrmRecordStatus.OPEN,
          dueAt: followUpAt,
          reminder: '1 DAY BEFORE',
          notes: dto.notes,
          relatedLabel: [
            activity.customer?.name,
            activityCode,
            activity.linkedQuote?.quoteNumber,
          ]
            .filter(Boolean)
            .join(' · '),
          salesActivityId: activity.id,
          customerId: activity.customerId,
          quoteId: activity.linkedQuoteId,
          assigneeId: activity.repId,
        },
      });
    }

    return { data: activity };
  }

  async update(id: string, dto: UpdateSalesActivityDto) {
    await this.ensureExists(id);
    const createFollowUpTask =
      dto.createFollowUpTask !== undefined
        ? Boolean(dto.createFollowUpTask)
        : undefined;
    let followUpAt: Date | null | undefined;
    if (dto.followUpAt !== undefined) {
      followUpAt = dto.followUpAt ? new Date(dto.followUpAt) : null;
    } else if (createFollowUpTask === true) {
      followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (createFollowUpTask === false) {
      followUpAt = null;
    }
    const activity = await this.prisma.salesActivity.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
        ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.nextAction !== undefined
          ? { nextAction: dto.nextAction }
          : {}),
        ...(followUpAt !== undefined ? { followUpAt } : {}),
        ...(createFollowUpTask !== undefined
          ? { createFollowUpTask }
          : {}),
        ...(dto.logExpense !== undefined
          ? { logExpense: Boolean(dto.logExpense) }
          : {}),
        ...(dto.attendees !== undefined
          ? { attendees: dto.attendees as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
        ...(dto.locationId !== undefined
          ? { locationId: dto.locationId || null }
          : {}),
        ...(dto.repId !== undefined ? { repId: dto.repId } : {}),
        ...(dto.activityAt !== undefined
          ? { activityAt: new Date(dto.activityAt) }
          : {}),
        ...(dto.linkedQuoteId !== undefined
          ? { linkedQuoteId: dto.linkedQuoteId || null }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        location: {
          select: { id: true, name: true, code: true, city: true, state: true },
        },
        linkedQuote: {
          select: { id: true, quoteNumber: true, amount: true, status: true },
        },
      },
    });
    return { data: activity };
  }

  async followUp(id: string, dto: FollowUpDto) {
    await this.ensureExists(id);
    const activity = await this.prisma.salesActivity.update({
      where: { id },
      data: {
        followUpAt: new Date(dto.followUpAt),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return { data: activity };
  }

  async exportCsv(
    query: SalesActivityListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.SalesActivityWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.salesActivity.findMany({
      where,
      orderBy: { activityAt: 'desc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      {
        key: 'activityCode',
        header: 'Activity Code',
        value: (r: Row) => r.activityCode,
      },
      {
        key: 'date',
        header: 'Date',
        value: (r: Row) => isoDate(r.activityAt),
      },
      { key: 'type', header: 'Type', value: (r: Row) => r.type },
      {
        key: 'customer',
        header: 'Customer',
        value: (r: Row) => r.customer?.name,
      },
      {
        key: 'contact',
        header: 'Contact',
        value: (r: Row) => r.contact?.fullName,
      },
      { key: 'rep', header: 'Rep', value: (r: Row) => userLabel(r.rep) },
      { key: 'subject', header: 'Subject', value: (r: Row) => r.subject },
      { key: 'outcome', header: 'Outcome', value: (r: Row) => r.outcome },
      { key: 'duration', header: 'Duration', value: (r: Row) => r.duration },
      {
        key: 'followUp',
        header: 'Follow-up',
        value: (r: Row) => isoDate(r.followUpAt),
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Sales Activities',
      'sales-activities',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.salesActivity.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Sales activity not found',
      });
    }
  }
}
