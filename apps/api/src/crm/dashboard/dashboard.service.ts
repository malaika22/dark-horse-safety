import { Injectable } from '@nestjs/common';
import {
  CrmRecordStatus,
  QuoteApprovalStatus,
  SalesActivityType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
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
        syncedAt: new Date().toISOString(),
      },
    };
  }
}
