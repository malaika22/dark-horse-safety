import { Injectable } from '@nestjs/common';
import {
  CloseoutStatus,
  CrmRecordStatus,
  DispatchAssignmentStatus,
  HrGpsFlagDecision,
  PayCycleStatus,
  SalesTicketStatus,
  TimeEditRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { openWorkOrderWhere } from '../../crm/common/open-jobs.util';

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f[0]!.toUpperCase()}. ${l.toUpperCase()}`;
  return (l || f || 'Someone').toUpperCase();
}

function relativeAgo(at: Date, now = new Date()) {
  const ms = Math.max(0, now.getTime() - at.getTime());
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function syncLabel(at: Date) {
  const raw = at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
  return `${raw.replace(/\s+/g, '').toUpperCase()} CT`;
}

function formatMonthDay(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

type ReviewCategory =
  | 'operations'
  | 'employee'
  | 'compliance'
  | 'assets'
  | 'customer';

type ActivityType = 'time' | 'billing' | 'sync' | 'compliance';

@Injectable()
export class OpsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const base = { archivedAt: null as null };

    const [
      openWos,
      openCustomerIds,
      inProgress,
      inProgressCrews,
      readyForReview,
      needsReviewFlag,
      dispatched,
      awaitingAcceptance,
      multiDayAssignments,
      missingSt,
      missingDocs,
      payrollReady,
      pendingEdits,
      openGps,
      pendingCloseouts,
      underReviewTickets,
      recentEdits,
      recentAdjustments,
      recentCloseouts,
      recentDispatch,
      payCycle,
      crossedPayCycle,
    ] = await Promise.all([
      this.prisma.workOrder.count({
        where: openWorkOrderWhere(),
      }),
      this.prisma.workOrder.findMany({
        where: openWorkOrderWhere(),
        distinct: ['customerId'],
        select: { customerId: true },
      }),
      this.prisma.workOrder.count({
        where: { ...base, status: CrmRecordStatus.IN_PROGRESS },
      }),
      this.prisma.dispatchAssignment.findMany({
        where: {
          status: {
            in: [
              DispatchAssignmentStatus.ACCEPTED,
              DispatchAssignmentStatus.POSTED,
            ],
          },
          workOrder: { status: CrmRecordStatus.IN_PROGRESS, archivedAt: null },
          employee: { crew: { not: null } },
        },
        distinct: ['employeeId'],
        select: {
          employee: { select: { crew: true } },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          OR: [
            { status: CrmRecordStatus.NEEDS_REVIEW },
            { status: CrmRecordStatus.PENDING },
            {
              closeoutReviews: {
                some: {
                  status: {
                    in: [
                      CloseoutStatus.PENDING,
                      CloseoutStatus.RETURNED,
                      CloseoutStatus.HELD,
                    ],
                  },
                },
              },
            },
            {
              salesTickets: {
                some: {
                  archivedAt: null,
                  status: {
                    in: [
                      SalesTicketStatus.SUBMITTED,
                      SalesTicketStatus.UNDER_REVIEW,
                    ],
                  },
                },
              },
            },
          ],
        },
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          status: CrmRecordStatus.NEEDS_REVIEW,
        },
      }),
      this.prisma.dispatchAssignment.count({
        where: {
          status: DispatchAssignmentStatus.ACCEPTED,
        },
      }),
      this.prisma.dispatchAssignment.count({
        where: {
          status: DispatchAssignmentStatus.POSTED,
          acceptedAt: null,
        },
      }),
      this.prisma.dispatchAssignment.findMany({
        where: {
          status: { not: DispatchAssignmentStatus.CANCELLED },
        },
        select: { workOrderId: true, scheduledDate: true },
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({
          salesTickets: { none: {} },
        }),
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({
          OR: [
            { formsCompletedAt: null },
            {
              closeoutReviews: {
                some: {
                  status: {
                    in: [
                      CloseoutStatus.PENDING,
                      CloseoutStatus.RETURNED,
                      CloseoutStatus.HELD,
                    ],
                  },
                },
              },
            },
          ],
        }),
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          formsCompletedAt: { not: null },
          status: {
            in: [CrmRecordStatus.COMPLETE, CrmRecordStatus.IN_PROGRESS],
          },
          closeoutReviews: {
            some: { status: CloseoutStatus.ACCEPTED },
          },
          salesTickets: {
            some: {
              archivedAt: null,
              status: {
                in: [SalesTicketStatus.APPROVED, SalesTicketStatus.ADJUSTED],
              },
            },
          },
        },
      }),
      this.prisma.timeEditRequest.count({
        where: {
          status: {
            in: [
              TimeEditRequestStatus.PENDING,
              TimeEditRequestStatus.NEEDS_CLARIFICATION,
            ],
          },
        },
      }),
      this.prisma.hrGpsFlag.count({
        where: {
          decision: {
            in: [HrGpsFlagDecision.PENDING, HrGpsFlagDecision.MORE_INFO],
          },
        },
      }),
      this.prisma.closeoutReview.count({
        where: {
          status: {
            in: [
              CloseoutStatus.PENDING,
              CloseoutStatus.RETURNED,
              CloseoutStatus.HELD,
            ],
          },
        },
      }),
      this.prisma.salesTicket.count({
        where: {
          archivedAt: null,
          status: {
            in: [SalesTicketStatus.SUBMITTED, SalesTicketStatus.UNDER_REVIEW],
          },
        },
      }),
      this.prisma.timeEditRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.salesTicket.findMany({
        where: { archivedAt: null, rateAdjustedAt: { not: null } },
        orderBy: { rateAdjustedAt: 'desc' },
        take: 4,
        include: {
          customer: { select: { name: true } },
          workOrder: { select: { code: true } },
        },
      }),
      this.prisma.closeoutReview.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          workOrder: { select: { code: true } },
        },
      }),
      this.prisma.dispatchAssignment.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          workOrder: { select: { code: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.payCycle.findFirst({
        where: { status: PayCycleStatus.OPEN },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({
          OR: [
            { status: CrmRecordStatus.ON_HOLD },
            {
              dispatchAssignments: {
                some: {
                  status: {
                    in: [
                      DispatchAssignmentStatus.CONFLICT,
                      DispatchAssignmentStatus.NO_RESPONSE,
                    ],
                  },
                },
              },
            },
          ],
        }),
      }),
    ]);

    const crewSet = new Set(
      inProgressCrews
        .map((r) => r.employee?.crew?.trim().toUpperCase())
        .filter(Boolean) as string[],
    );
    const daysByWo = new Map<string, Set<string>>();
    for (const a of multiDayAssignments) {
      const key = a.scheduledDate.toISOString().slice(0, 10);
      const set = daysByWo.get(a.workOrderId) ?? new Set<string>();
      set.add(key);
      daysByWo.set(a.workOrderId, set);
    }
    const multiDayJobs = [...daysByWo.values()].filter((s) => s.size > 1)
      .length;
    const customerCount = openCustomerIds.length;
    const reviewNeedCount = needsReviewFlag + underReviewTickets;

    const stats = {
      openWorkOrders: {
        value: openWos,
        meta: `Across ${customerCount} customer${customerCount === 1 ? '' : 's'}`,
        action: 'View WOs',
        href: '/operations/work-orders',
        icon: 'time' as const,
      },
      inProgress: {
        value: inProgress,
        meta: `Across ${Math.max(crewSet.size, 1)} crew${crewSet.size === 1 ? '' : 's'}`,
        action: 'View Jobs',
        href: '/operations/work-orders?status=IN_PROGRESS',
        icon: 'edit' as const,
      },
      readyForReview: {
        value: readyForReview,
        meta: `${reviewNeedCount} need review`,
        action: 'Review',
        href: '/operations/sales-tickets',
        icon: 'gps' as const,
      },
      dispatched: {
        value: dispatched,
        meta:
          crossedPayCycle > 0
            ? `${crossedPayCycle} crossed pay cycles`
            : 'Active dispatches',
        action: 'View Dispatch',
        href: '/operations/dispatch',
        icon: 'wrench' as const,
      },
      awaitingAcceptance: {
        value: awaitingAcceptance,
        meta:
          missingSt > 0 ? 'ST link not found' : 'Posted to mobile',
        action: 'Notify Techs',
        href: '/operations/dispatch',
        icon: 'operations' as const,
      },
      multiDayJobs: {
        value: multiDayJobs,
        meta:
          crossedPayCycle > 0
            ? `${Math.min(crossedPayCycle, multiDayJobs || crossedPayCycle)} crossed pay cycles`
            : 'Multi-day schedules',
        action: 'View',
        href: '/operations/dispatch',
        icon: 'time' as const,
      },
      missingStLink: {
        value: missingSt,
        meta: missingSt > 0 ? 'ST link not found' : 'All linked',
        action: 'Create Ticket',
        href: '/operations/sales-tickets',
        icon: 'edit' as const,
      },
      missingReqDocs: {
        value: missingDocs,
        meta: `Across ${Math.min(missingDocs, openWos)} active WO.`,
        action: 'Resolve',
        href: '/hr/closeout-review',
        icon: 'gps' as const,
      },
      payrollReadyWos: {
        value: payrollReady,
        meta: 'Time and req docs approved',
        action: 'Assign',
        href: '/hr/payroll-review',
        icon: 'wrench' as const,
      },
    };

    const needingReview: Array<{
      id: string;
      category: ReviewCategory;
      categoryLabel: string;
      title: string;
      href: string;
    }> = [];

    if (missingSt > 0) {
      needingReview.push({
        id: 'ops-missing-st',
        category: 'operations',
        categoryLabel: 'Operations',
        title: `${missingSt} work order${missingSt === 1 ? '' : 's'} missing sales ticket`,
        href: '/operations/sales-tickets',
      });
    }
    if (awaitingAcceptance > 0) {
      needingReview.push({
        id: 'ops-awaiting',
        category: 'operations',
        categoryLabel: 'Operations',
        title: `${awaitingAcceptance} dispatch${awaitingAcceptance === 1 ? '' : 'es'} awaiting tech acceptance`,
        href: '/operations/dispatch',
      });
    }
    if (pendingEdits > 0) {
      needingReview.push({
        id: 'emp-time-edits',
        category: 'employee',
        categoryLabel: 'Employee / HR',
        title: `${pendingEdits} time edit request${pendingEdits === 1 ? '' : 's'} pending review`,
        href: '/hr/time-edit-requests',
      });
    }
    if (pendingCloseouts > 0) {
      needingReview.push({
        id: 'compliance-closeouts',
        category: 'compliance',
        categoryLabel: 'Compliance',
        title: `${pendingCloseouts} closeout review${pendingCloseouts === 1 ? '' : 's'} pending`,
        href: '/hr/closeout-review',
      });
    }
    if (missingDocs > 0) {
      needingReview.push({
        id: 'compliance-docs',
        category: 'compliance',
        categoryLabel: 'Compliance',
        title: `${missingDocs} work order${missingDocs === 1 ? '' : 's'} missing required docs`,
        href: '/hr/closeout-review',
      });
    }
    if (openGps > 0) {
      needingReview.push({
        id: 'assets-gps',
        category: 'assets',
        categoryLabel: 'Assets',
        title: `${openGps} GPS flag${openGps === 1 ? '' : 's'} need review`,
        href: '/hr/gps-flag-review',
      });
    }
    if (underReviewTickets > 0) {
      needingReview.push({
        id: 'customer-st',
        category: 'customer',
        categoryLabel: 'Customer',
        title: `${underReviewTickets} sales ticket${underReviewTickets === 1 ? '' : 's'} under review`,
        href: '/operations/sales-tickets',
      });
    }

    const activity: Array<{
      id: string;
      type: ActivityType;
      title: string;
      subtitle: string;
      status: string;
      statusVariant: 'warning' | 'review' | 'error' | 'success' | 'gold';
      href: string;
      at: string;
    }> = [];

    for (const row of recentEdits) {
      const name = shortName(row.employee.firstName, row.employee.lastName);
      const reason = (row.technicianReason ?? row.type.replace(/_/g, ' '))
        .toString()
        .toUpperCase();
      const day = formatMonthDay(row.workDate);
      const status =
        row.status === TimeEditRequestStatus.APPROVED
          ? 'Approved'
          : row.status === TimeEditRequestStatus.REJECTED
            ? 'Rejected'
            : row.status === TimeEditRequestStatus.NEEDS_CLARIFICATION
              ? 'Needs Clarification'
              : 'Pending';
      activity.push({
        id: `edit-${row.id}`,
        type: 'time',
        title: `${name} submitted a time edit request for ${day} — ${reason}`,
        subtitle: `${relativeAgo(row.createdAt, now)} · Time edit request`,
        status,
        statusVariant:
          status === 'Pending'
            ? 'warning'
            : status === 'Approved'
              ? 'success'
              : status === 'Rejected'
                ? 'error'
                : 'review',
        href: '/hr/time-edit-requests',
        at: row.createdAt.toISOString(),
      });
    }

    for (const row of recentAdjustments) {
      const wo = row.workOrder?.code ?? row.code;
      const delta = Number(row.rateDifference ?? 0);
      const tone =
        delta < 0 ? 'underbilled' : delta > 0 ? 'rate adjusted' : 'reviewed';
      activity.push({
        id: `bill-${row.id}`,
        type: 'billing',
        title: `Billing discrepancy on ${wo} — ${row.customer.name} ${tone}`,
        subtitle: `${relativeAgo(row.rateAdjustedAt ?? row.updatedAt, now)} · Billing reconciliation`,
        status: 'Needs Review',
        statusVariant: 'review',
        href: '/reports/rate-adjustments',
        at: (row.rateAdjustedAt ?? row.updatedAt).toISOString(),
      });
    }

    for (const row of recentCloseouts) {
      const wo = row.workOrder.code;
      const missing =
        row.status === CloseoutStatus.PENDING ||
        row.status === CloseoutStatus.RETURNED ||
        row.status === CloseoutStatus.HELD;
      activity.push({
        id: `close-${row.id}`,
        type: 'compliance',
        title: missing
          ? `JSA missing for ${wo} — required before payroll approval`
          : `Closeout accepted for ${wo}`,
        subtitle: `${relativeAgo(row.updatedAt, now)} · Compliance documents`,
        status: missing ? 'Missing' : 'Resolved',
        statusVariant: missing ? 'error' : 'success',
        href: '/hr/closeout-review',
        at: row.updatedAt.toISOString(),
      });
    }

    for (const row of recentDispatch) {
      const tech = row.employee
        ? shortName(row.employee.firstName, row.employee.lastName)
        : 'Unassigned';
      const wo = row.workOrder.code;
      activity.push({
        id: `disp-${row.id}`,
        type: 'sync',
        title: `${tech} dispatch ${row.status.replace(/_/g, ' ').toLowerCase()} for ${wo}`,
        subtitle: `${relativeAgo(row.updatedAt, now)} · Dispatch sync`,
        status: row.status.replace(/_/g, ' '),
        statusVariant:
          row.status === DispatchAssignmentStatus.ACCEPTED
            ? 'success'
            : row.status === DispatchAssignmentStatus.POSTED
              ? 'warning'
              : row.status === DispatchAssignmentStatus.CONFLICT ||
                  row.status === DispatchAssignmentStatus.DECLINED
                ? 'error'
                : 'review',
        href: '/operations/dispatch',
        at: row.updatedAt.toISOString(),
      });
    }

    if (payCycle) {
      activity.push({
        id: `sync-cycle-${payCycle.id}`,
        type: 'sync',
        title: `Pay cycle ${payCycle.code} sync — ${payCycle.label}`,
        subtitle: `${relativeAgo(payCycle.updatedAt, now)} · Ops sync`,
        status: 'Synced',
        statusVariant: 'success',
        href: '/hr/pay-cycle',
        at: payCycle.updatedAt.toISOString(),
      });
    }

    activity.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );

    const lastSyncAt = payCycle?.updatedAt ?? now;

    return {
      data: {
        lastSyncAt: lastSyncAt.toISOString(),
        lastSyncLabel: `Last sync update ${syncLabel(lastSyncAt)}`,
        stats,
        needingReview,
        activity: activity.slice(0, 12),
        reviewCategories: [
          { id: 'all', label: 'All' },
          { id: 'operations', label: 'Operation' },
          { id: 'employee', label: 'Employee' },
          { id: 'compliance', label: 'Compliance' },
          { id: 'assets', label: 'Assets' },
          { id: 'customer', label: 'Customer' },
        ],
        activityTypes: [
          { id: 'all', label: 'All' },
          { id: 'time', label: 'Time' },
          { id: 'billing', label: 'Billing' },
          { id: 'sync', label: 'Sync' },
        ],
      },
    };
  }

  async sync() {
    const cycle = await this.prisma.payCycle.findFirst({
      where: { status: PayCycleStatus.OPEN },
      orderBy: { startDate: 'desc' },
    });
    const at = new Date();
    if (cycle) {
      await this.prisma.payCycle.update({
        where: { id: cycle.id },
        data: { updatedAt: at },
      });
    }
    return {
      data: {
        syncedAt: at.toISOString(),
        lastSyncLabel: `Last sync update ${syncLabel(at)}`,
      },
    };
  }
}
