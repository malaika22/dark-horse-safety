import { Injectable } from '@nestjs/common';
import {
  CloseoutStatus,
  EmployeeStatus,
  HrGpsFlagDecision,
  PayCycleStatus,
  SupervisorRouteStatus,
  TimeEditRequestStatus,
  TimeEntryStatus,
  TimeOffStatus,
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
export class HrDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const in30 = new Date(now.getTime() + 30 * 86_400_000);
    const in14 = new Date(now.getTime() + 14 * 86_400_000);

    const [
      activeEmployees,
      newThisMonth,
      hoursAgg,
      techIds,
      pendingEdits,
      pendingTimeOff,
      upcomingTimeOff,
      certExpirations,
      trainingDue,
      onboarding,
      unroutedRoutes,
      unassignedSupervisors,
      payrollReady,
      payrollTotal,
      missingSalesTicketWos,
      openGpsFlags,
      pendingCloseouts,
      recentEdits,
      recentCloseouts,
      recentGps,
      recentAdjustments,
      payCycle,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: { archivedAt: null, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: {
          archivedAt: null,
          status: EmployeeStatus.ACTIVE,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.employee.aggregate({
        where: { archivedAt: null, status: EmployeeStatus.ACTIVE },
        _sum: { hoursThisCycle: true },
      }),
      this.prisma.timeEntry.findMany({
        where: {
          archivedAt: null,
          status: {
            in: [TimeEntryStatus.PENDING, TimeEntryStatus.APPROVED],
          },
        },
        distinct: ['employeeId'],
        select: { employeeId: true },
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
      this.prisma.timeOffRequest.count({
        where: { archivedAt: null, status: TimeOffStatus.PENDING },
      }),
      this.prisma.timeOffRequest.count({
        where: {
          archivedAt: null,
          status: TimeOffStatus.APPROVED,
          startDate: { gte: now, lte: in14 },
        },
      }),
      this.prisma.trainingRecord.count({
        where: { expiryAt: { gte: now, lte: in30 } },
      }),
      this.prisma.trainingAssignment.count({
        where: {
          status: { in: ['MISSING', 'DUE', 'OVERDUE', 'PENDING'] },
        },
      }),
      this.prisma.employee.count({
        where: { archivedAt: null, status: EmployeeStatus.NEED_REVIEW },
      }),
      this.prisma.supervisorRoute.count({
        where: { status: SupervisorRouteStatus.UNROUTED },
      }),
      this.prisma.employee.count({
        where: { archivedAt: null, supervisorId: null },
      }),
      this.prisma.employee.count({
        where: {
          archivedAt: null,
          status: EmployeeStatus.ACTIVE,
          hasOpenTimeEdit: false,
          missingBbs: false,
        },
      }),
      this.prisma.employee.count({
        where: { archivedAt: null, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({
          salesTickets: { none: {} },
        }),
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
      this.prisma.timeEditRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.closeoutReview.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          workOrder: { select: { code: true } },
        },
      }),
      this.prisma.hrGpsFlag.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 4,
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
      this.prisma.payCycle.findFirst({
        where: { status: PayCycleStatus.OPEN },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const hoursOnShift = Math.round(
      Number(hoursAgg._sum.hoursThisCycle ?? 0),
    );
    const techCount = Math.max(techIds.length, activeEmployees);
    const pendingRequests = pendingEdits + pendingTimeOff;

    const stats = {
      activeEmployees: {
        value: activeEmployees,
        meta:
          newThisMonth > 0
            ? `+${newThisMonth} this month`
            : 'No new hires this month',
        action: 'View Employees',
        href: '/hr/employees',
        icon: 'time' as const,
      },
      onShift: {
        value: hoursOnShift,
        meta: `Across ${techCount} tech${techCount === 1 ? '' : 's'}`,
        action: 'View Shifts',
        href: '/hr/time-entries',
        icon: 'edit' as const,
      },
      pendingRequests: {
        value: pendingRequests,
        meta: `${pendingEdits} edits · ${pendingTimeOff} time off`,
        action: 'Review',
        href: '/hr/time-edit-requests',
        icon: 'gps' as const,
      },
      timeOffReqs: {
        value: pendingTimeOff,
        meta:
          upcomingTimeOff > 0
            ? `${upcomingTimeOff} upcoming approved`
            : 'No upcoming leave',
        action: 'Review',
        href: '/hr/time-off',
        icon: 'wrench' as const,
      },
      certExpirations: {
        value: certExpirations,
        meta: 'Next 30 days',
        action: 'View Certs',
        href: '/hr/training',
        icon: 'wrench' as const,
      },
      payrollReady: {
        value: payrollReady,
        meta: `Across ${payrollTotal} active employee${payrollTotal === 1 ? '' : 's'}`,
        action: 'Export',
        href: '/hr/payroll-export',
        icon: 'time' as const,
      },
      trainingDue: {
        value: trainingDue,
        meta: 'Assignments due',
        action: 'Assign',
        href: '/hr/training',
        icon: 'edit' as const,
      },
      onboarding: {
        value: onboarding,
        meta: 'In progress',
        action: 'View',
        href: '/hr/employees?status=NEED_REVIEW',
        icon: 'gps' as const,
      },
      supervisorRouting: {
        value: Math.max(unroutedRoutes, unassignedSupervisors > 0 ? 1 : 0),
        meta:
          unroutedRoutes > 0 || unassignedSupervisors > 0
            ? 'Pending setup'
            : 'All routes active',
        action: 'Configure',
        href: '/hr/supervisor-routing',
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

    if (missingSalesTicketWos > 0) {
      needingReview.push({
        id: 'ops-missing-st',
        category: 'operations',
        categoryLabel: 'Operations',
        title: `${missingSalesTicketWos} work order${missingSalesTicketWos === 1 ? '' : 's'} missing sales ticket`,
        href: '/operations/work-orders',
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
    if (pendingTimeOff > 0) {
      needingReview.push({
        id: 'emp-time-off',
        category: 'employee',
        categoryLabel: 'Employee / HR',
        title: `${pendingTimeOff} time off request${pendingTimeOff === 1 ? '' : 's'} awaiting approval`,
        href: '/hr/time-off',
      });
    }
    if (openGpsFlags > 0) {
      needingReview.push({
        id: 'assets-gps',
        category: 'assets',
        categoryLabel: 'Assets',
        title: `${openGpsFlags} GPS flag${openGpsFlags === 1 ? '' : 's'} need review`,
        href: '/hr/gps-flag-review',
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
    if (certExpirations > 0) {
      needingReview.push({
        id: 'compliance-certs',
        category: 'compliance',
        categoryLabel: 'Compliance',
        title: `${certExpirations} certification${certExpirations === 1 ? '' : 's'} expiring in 30 days`,
        href: '/hr/training',
      });
    }
    if (unroutedRoutes > 0 || unassignedSupervisors > 0) {
      const n = unroutedRoutes || unassignedSupervisors;
      needingReview.push({
        id: 'emp-routing',
        category: 'employee',
        categoryLabel: 'Employee / HR',
        title: `${n} supervisor routing item${n === 1 ? '' : 's'} pending setup`,
        href: '/hr/supervisor-routing',
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
      const statusVariant =
        status === 'Pending'
          ? ('warning' as const)
          : status === 'Approved'
            ? ('success' as const)
            : status === 'Rejected'
              ? ('error' as const)
              : ('review' as const);
      activity.push({
        id: `edit-${row.id}`,
        type: 'time',
        title: `${name} submitted a time edit request for ${day} — ${reason}`,
        subtitle: `${relativeAgo(row.createdAt, now)} · Time edit request`,
        status,
        statusVariant,
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

    for (const row of recentGps) {
      const name = shortName(row.employee.firstName, row.employee.lastName);
      activity.push({
        id: `gps-${row.id}`,
        type: 'time',
        title: `${name} GPS flag — ${row.explanation ?? row.type.replace(/_/g, ' ')}`,
        subtitle: `${relativeAgo(row.updatedAt, now)} · GPS flag review`,
        status:
          row.decision === HrGpsFlagDecision.PENDING ||
          row.decision === HrGpsFlagDecision.MORE_INFO
            ? 'Needs Review'
            : row.decision === HrGpsFlagDecision.ACCEPTED
              ? 'Accepted'
              : 'Rejected',
        statusVariant:
          row.decision === HrGpsFlagDecision.PENDING ||
          row.decision === HrGpsFlagDecision.MORE_INFO
            ? 'review'
            : row.decision === HrGpsFlagDecision.ACCEPTED
              ? 'success'
              : 'error',
        href: '/hr/gps-flag-review',
        at: row.updatedAt.toISOString(),
      });
    }

    if (payCycle) {
      activity.push({
        id: `sync-cycle-${payCycle.id}`,
        type: 'sync',
        title: `Pay cycle ${payCycle.code} sync — ${payCycle.label}`,
        subtitle: `${relativeAgo(payCycle.updatedAt, now)} · Payroll sync`,
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
