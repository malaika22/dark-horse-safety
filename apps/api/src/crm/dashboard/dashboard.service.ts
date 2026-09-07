import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  CrmRecordStatus,
  QuoteApprovalStatus,
  SalesActivityType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDay(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function shortRepName(firstName?: string | null, lastName?: string | null) {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  if (last) return last.toUpperCase();
  if (first) return first.toUpperCase();
  return 'UNKNOWN';
}

function countWeekdays(from: Date, to: Date) {
  let n = 0;
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, n);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      syncState,
      customersTotal,
      customersActive,
      customersArchived,
      customersNeedsReview,
      eodToday,
      eodSubmittedWeek,
      eodPending,
      activitiesWeek,
      callsWeek,
      visitsWeek,
      meetingsWeek,
      followUpsPending,
      quotesDraft,
      quotesSent,
      quotesApproved,
      quotesExpired,
      quotesWon,
      recentActivities,
      openPipeline,
    ] = await Promise.all([
      this.prisma.crmSyncState.findUnique({ where: { id: 'crm' } }),
      this.prisma.customer.count({ where: { archivedAt: null } }),
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.customer.count({ where: { archivedAt: { not: null } } }),
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.NEEDS_REVIEW },
      }),
      this.prisma.eodReport.count({
        where: { reportDate: { gte: startOfToday } },
      }),
      this.prisma.eodReport.count({
        where: {
          submittedAt: { gte: weekAgo },
          status: { in: [CrmRecordStatus.SUBMITTED, CrmRecordStatus.COMPLETE] },
        },
      }),
      this.prisma.eodReport.count({
        where: {
          status: {
            in: [CrmRecordStatus.PENDING, CrmRecordStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.salesActivity.count({
        where: { archivedAt: null, activityAt: { gte: weekAgo } },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          activityAt: { gte: weekAgo },
          type: SalesActivityType.CALL,
        },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          activityAt: { gte: weekAgo },
          type: SalesActivityType.VISIT,
        },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          activityAt: { gte: weekAgo },
          type: SalesActivityType.MEETING,
        },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          followUpAt: { not: null, gte: startOfToday },
        },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.DRAFT },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.SENT },
      }),
      this.prisma.quote.count({
        where: {
          archivedAt: null,
          OR: [
            { status: CrmRecordStatus.OPEN },
            { approvalStatus: QuoteApprovalStatus.APPROVED },
          ],
        },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.EXPIRED },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.WON },
      }),
      this.prisma.salesActivity.findMany({
        where: { archivedAt: null },
        orderBy: { activityAt: 'desc' },
        take: 8,
        include: {
          customer: { select: { name: true } },
          contact: { select: { fullName: true } },
          rep: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.quote.aggregate({
        where: {
          archivedAt: null,
          status: {
            in: [
              CrmRecordStatus.DRAFT,
              CrmRecordStatus.SENT,
              CrmRecordStatus.OPEN,
              CrmRecordStatus.PENDING,
            ],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const pipelineSum = openPipeline._sum.amount;
    const pipelineValue =
      pipelineSum == null ? 0 : Number(pipelineSum.toString());
    const syncedAt = (syncState?.syncedAt ?? new Date()).toISOString();

    return {
      data: {
        customers: {
          total: customersTotal,
          active: customersActive,
          archived: customersArchived,
          needsReview: customersNeedsReview,
        },
        eod: {
          today: eodToday,
          submitted: eodSubmittedWeek,
          pending: eodPending,
          activities: activitiesWeek,
          pipeline: pipelineValue,
        },
        sales: {
          thisWeek: activitiesWeek,
          calls: callsWeek,
          visits: visitsWeek,
          meetings: meetingsWeek,
          followUps: followUpsPending,
        },
        quotes: {
          draft: quotesDraft,
          sent: quotesSent,
          approved: quotesApproved,
          expired: quotesExpired,
          converted: quotesWon,
          openPipeline: pipelineValue,
        },
        recentSales: recentActivities.map((a) => ({
          id: a.id,
          code: a.activityCode,
          type: a.type,
          subject: a.subject,
          customer: a.customer?.name ?? null,
          contact: a.contact?.fullName ?? null,
          rep: [a.rep?.firstName, a.rep?.lastName].filter(Boolean).join(' ') || null,
          activityAt: a.activityAt,
          outcome: a.outcome,
          status: a.status,
        })),
        syncedAt,
      },
    };
  }

  async managerSalesSummary(params?: { from?: string; to?: string }) {
    const today = startOfDay(new Date());
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 13);

    const from = startOfDay(parseDay(params?.from, defaultFrom));
    const to = endOfDay(parseDay(params?.to, today));
    const weekdayCount = countWeekdays(from, to);

    const openQuoteStatuses: CrmRecordStatus[] = [
      CrmRecordStatus.DRAFT,
      CrmRecordStatus.SENT,
      CrmRecordStatus.OPEN,
      CrmRecordStatus.PENDING,
    ];

    const reps = await this.prisma.user.findMany({
      where: {
        status: AccountStatus.ACTIVE,
        OR: [
          {
            salesActivities: {
              some: {
                archivedAt: null,
                activityAt: { gte: from, lte: to },
              },
            },
          },
          {
            eodReports: {
              some: { reportDate: { gte: from, lte: to } },
            },
          },
          {
            quotesOwned: {
              some: {
                archivedAt: null,
                createdAt: { gte: from, lte: to },
              },
            },
          },
          {
            customersOwned: {
              some: { archivedAt: null },
            },
          },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const repRows = await Promise.all(
      reps.map(async (rep) => {
        const [
          activities,
          calls,
          visits,
          quotes,
          pipelineAgg,
          eodSubmitted,
        ] = await Promise.all([
          this.prisma.salesActivity.count({
            where: {
              repId: rep.id,
              archivedAt: null,
              activityAt: { gte: from, lte: to },
            },
          }),
          this.prisma.salesActivity.count({
            where: {
              repId: rep.id,
              archivedAt: null,
              activityAt: { gte: from, lte: to },
              type: SalesActivityType.CALL,
            },
          }),
          this.prisma.salesActivity.count({
            where: {
              repId: rep.id,
              archivedAt: null,
              activityAt: { gte: from, lte: to },
              type: SalesActivityType.VISIT,
            },
          }),
          this.prisma.quote.count({
            where: {
              ownerId: rep.id,
              archivedAt: null,
              createdAt: { gte: from, lte: to },
            },
          }),
          this.prisma.quote.aggregate({
            where: {
              ownerId: rep.id,
              archivedAt: null,
              status: { in: openQuoteStatuses },
            },
            _sum: { amount: true },
          }),
          this.prisma.eodReport.count({
            where: {
              repId: rep.id,
              reportDate: { gte: from, lte: to },
              status: {
                in: [
                  CrmRecordStatus.SUBMITTED,
                  CrmRecordStatus.COMPLETE,
                ],
              },
            },
          }),
        ]);

        const pipeline =
          pipelineAgg._sum.amount == null
            ? 0
            : Number(pipelineAgg._sum.amount.toString());
        const eodPct = Math.round(
          (Math.min(eodSubmitted, weekdayCount) / weekdayCount) * 100,
        );

        return {
          id: rep.id,
          name: shortRepName(rep.firstName, rep.lastName),
          activities,
          calls,
          visits,
          quotes,
          pipeline,
          eodPct,
        };
      }),
    );

    const totals = repRows.reduce(
      (acc, row) => {
        acc.activities += row.activities;
        acc.calls += row.calls;
        acc.visits += row.visits;
        acc.quotes += row.quotes;
        acc.pipeline += row.pipeline;
        acc.eodPctSum += row.eodPct;
        return acc;
      },
      {
        activities: 0,
        calls: 0,
        visits: 0,
        quotes: 0,
        pipeline: 0,
        eodPctSum: 0,
      },
    );

    const repCount = repRows.length;
    const teamEodAvg =
      repCount === 0 ? 0 : Math.round(totals.eodPctSum / repCount);

    return {
      data: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        repCount,
        kpis: {
          activities: totals.activities,
          calls: totals.calls,
          visits: totals.visits,
          quotes: totals.quotes,
          pipeline: totals.pipeline,
          eodPct: teamEodAvg,
        },
        teamAvg: {
          activities: repCount ? totals.activities / repCount : 0,
          calls: repCount ? totals.calls / repCount : 0,
          visits: repCount ? totals.visits / repCount : 0,
          quotes: repCount ? totals.quotes / repCount : 0,
          pipeline: repCount ? totals.pipeline / repCount : 0,
          eodPct: teamEodAvg,
        },
        reps: repRows,
      },
    };
  }

  async repDashboard(
    userId: string,
    params?: { from?: string; to?: string },
  ) {
    const summary = await this.managerSalesSummary(params);
    const from = startOfDay(parseDay(params?.from, new Date(summary.data.from)));
    const to = endOfDay(parseDay(params?.to, new Date(summary.data.to)));

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const openQuoteStatuses: CrmRecordStatus[] = [
      CrmRecordStatus.DRAFT,
      CrmRecordStatus.SENT,
      CrmRecordStatus.OPEN,
      CrmRecordStatus.PENDING,
    ];

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const [
      quotesSent,
      quotesWon,
      quotesTotal,
      pipelineAgg,
      eodToday,
      tasksDueToday,
      tasksOverdue,
      calendarToday,
      accounts,
    ] = await Promise.all([
      this.prisma.quote.count({
        where: {
          ownerId: userId,
          archivedAt: null,
          createdAt: { gte: from, lte: to },
          status: {
            in: [
              CrmRecordStatus.SENT,
              CrmRecordStatus.OPEN,
              CrmRecordStatus.WON,
            ],
          },
        },
      }),
      this.prisma.quote.count({
        where: {
          ownerId: userId,
          archivedAt: null,
          createdAt: { gte: from, lte: to },
          OR: [
            { status: CrmRecordStatus.WON },
            { approvalStatus: QuoteApprovalStatus.APPROVED },
          ],
        },
      }),
      this.prisma.quote.count({
        where: {
          ownerId: userId,
          archivedAt: null,
          createdAt: { gte: from, lte: to },
        },
      }),
      this.prisma.quote.aggregate({
        where: {
          ownerId: userId,
          archivedAt: null,
          status: { in: openQuoteStatuses },
        },
        _sum: { amount: true },
      }),
      this.prisma.eodReport.findFirst({
        where: {
          repId: userId,
          reportDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { submittedAt: 'desc' },
        select: {
          status: true,
          submittedAt: true,
        },
      }),
      this.prisma.salesActivity.findMany({
        where: {
          repId: userId,
          archivedAt: null,
          followUpAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { followUpAt: 'asc' },
        take: 20,
      }),
      this.prisma.salesActivity.findMany({
        where: {
          repId: userId,
          archivedAt: null,
          followUpAt: { lt: todayStart, not: null },
          status: { not: CrmRecordStatus.COMPLETE },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { followUpAt: 'asc' },
        take: 20,
      }),
      this.prisma.salesActivity.findMany({
        where: {
          repId: userId,
          archivedAt: null,
          activityAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { activityAt: 'asc' },
        take: 30,
      }),
      this.prisma.customer.findMany({
        where: {
          assignedRepId: userId,
          archivedAt: null,
        },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          quotes: {
            where: {
              archivedAt: null,
              status: { in: openQuoteStatuses },
            },
            select: { amount: true },
          },
          activities: {
            where: { archivedAt: null },
            orderBy: { activityAt: 'desc' },
            take: 1,
            select: { activityAt: true },
          },
        },
        orderBy: { name: 'asc' },
        take: 25,
      }),
    ]);

    const pipeline =
      pipelineAgg._sum.amount == null
        ? 0
        : Number(pipelineAgg._sum.amount.toString());
    const winRate =
      quotesTotal === 0 ? 0 : Math.round((quotesWon / quotesTotal) * 100);

    const eodDone =
      eodToday?.status === CrmRecordStatus.SUBMITTED ||
      eodToday?.status === CrmRecordStatus.COMPLETE;

    const leaderboard = [...summary.data.reps].sort(
      (a, b) => b.activities - a.activities || b.pipeline - a.pipeline,
    );

    const myRankIdx = leaderboard.findIndex((r) => r.id === userId);
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

    const mapTask = (
      a: (typeof tasksDueToday)[number],
      kind: 'today' | 'overdue',
    ) => ({
      id: a.id,
      kind,
      title: (a.subject ?? a.type ?? 'Follow-up').toUpperCase(),
      customer: a.customer?.name ?? null,
      dueAt: a.followUpAt?.toISOString() ?? null,
    });

    return {
      data: {
        from: summary.data.from,
        to: summary.data.to,
        me: {
          id: userId,
          name: shortRepName(me?.firstName, me?.lastName),
        },
        rank: myRank,
        kpis: {
          pipeline,
          quotesSent,
          winRate,
          eodStatus: eodDone ? 'DONE' : eodToday ? 'PENDING' : 'MISSING',
          eodSubmittedAt: eodToday?.submittedAt?.toISOString() ?? null,
          tasksToday: tasksDueToday.length,
          overdue: tasksOverdue.length,
        },
        leaderboard,
        tasks: {
          today: tasksDueToday.map((a) => mapTask(a, 'today')),
          overdue: tasksOverdue.map((a) => mapTask(a, 'overdue')),
        },
        calendar: calendarToday.map((a) => ({
          id: a.id,
          activityAt: a.activityAt.toISOString(),
          type: a.type,
          subject: a.subject,
          customer: a.customer?.name ?? null,
          hasFollowUp: Boolean(a.followUpAt),
        })),
        accounts: accounts.map((c) => {
          const accountPipeline = c.quotes.reduce(
            (sum, q) =>
              sum + (q.amount == null ? 0 : Number(q.amount.toString())),
            0,
          );
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            pipeline: accountPipeline,
            lastActivityAt:
              c.activities[0]?.activityAt?.toISOString() ?? null,
          };
        }),
      },
    };
  }

  async sync() {
    const now = new Date();
    await this.prisma.crmSyncState.upsert({
      where: { id: 'crm' },
      create: { id: 'crm', syncedAt: now },
      update: { syncedAt: now },
    });
    const overview = await this.overview();
    return {
      data: {
        ...overview.data,
        ok: true,
      },
    };
  }

  async notifications() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [pendingEod, followUps, expiringQuotes] = await Promise.all([
      this.prisma.eodReport.count({
        where: {
          status: {
            in: [CrmRecordStatus.PENDING, CrmRecordStatus.DRAFT],
          },
        },
      }),
      this.prisma.salesActivity.count({
        where: {
          archivedAt: null,
          followUpAt: { not: null, lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.quote.count({
        where: {
          archivedAt: null,
          status: { in: [CrmRecordStatus.SENT, CrmRecordStatus.OPEN] },
          expiresAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: startOfToday,
          },
        },
      }),
    ]);

    const items = [
      pendingEod > 0
        ? {
            id: 'eod-pending',
            title: `${pendingEod} EOD report(s) need attention`,
            href: '/crm/eod-reports',
          }
        : null,
      followUps > 0
        ? {
            id: 'sales-followups',
            title: `${followUps} follow-up(s) due soon`,
            href: '/crm/sales',
          }
        : null,
      expiringQuotes > 0
        ? {
            id: 'quotes-expiring',
            title: `${expiringQuotes} quote(s) expiring within 7 days`,
            href: '/crm/quotes',
          }
        : null,
    ].filter(Boolean);

    return { data: { items, count: items.length } };
  }
}
