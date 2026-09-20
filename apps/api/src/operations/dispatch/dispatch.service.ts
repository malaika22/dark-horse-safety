import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DispatchAssignmentStatus,
  DispatchConflictKind,
  DispatchJobType,
  Prisma,
  TimeOffStatus,
  TrainingRecordStatus,
} from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignDispatchJobDto,
  DispatchAcceptanceQueryDto,
  DispatchRangeQueryDto,
  OverrideDispatchDto,
  ReassignDispatchDto,
  RescheduleDispatchDto,
} from './dto/dispatch.dto';

function shortName(first: string, last: string) {
  const initial = first.trim().charAt(0).toUpperCase();
  return `${initial}. ${last.trim().toUpperCase()}`;
}

function parseDay(value?: string | null) {
  if (!value?.trim()) return null;
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function startOfWeekMonday(d: Date) {
  const day = d.getUTCDay();
  const offset = (day + 6) % 7;
  return addDays(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
    -offset,
  );
}

function fmtDayLabel(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function fmtRangeLabel(from: Date, to: Date) {
  const a = from.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const b = to.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${a} – ${b}`.toUpperCase();
}

type AssignmentRow = Prisma.DispatchAssignmentGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        crew: true;
        certificationHeld: true;
        onLeave: true;
        assignedTruck: true;
      };
    };
    workOrder: {
      include: {
        customer: { select: { id: true, name: true } };
        location: { select: { id: true, name: true, county: true } };
      };
    };
  };
}>;

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCard(row: AssignmentRow) {
    const emp = row.employee;
    const wo = row.workOrder;
    const loc = wo.location;
    return {
      id: row.id,
      workOrderId: wo.id,
      workOrderCode: wo.code,
      customerName: wo.customer.name,
      locationName: loc?.name ?? wo.title ?? '—',
      locationMeta: loc?.county ?? null,
      jobType: row.jobType,
      category: wo.category,
      scheduledDate: dayKey(row.scheduledDate),
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      conflictKind: row.conflictKind,
      conflictLabel: row.conflictLabel,
      declineReason: row.declineReason,
      notes: row.notes,
      postedAt: row.postedAt?.toISOString() ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      responseMinutes: row.responseMinutes,
      employeeId: emp?.id ?? null,
      employeeName: emp ? shortName(emp.firstName, emp.lastName) : 'Unassigned',
      crew: emp?.crew ?? null,
      overrideReason: row.overrideReason,
      overriddenAt: row.overriddenAt?.toISOString() ?? null,
    };
  }

  private async resolveRange(query: DispatchRangeQueryDto) {
    const now = new Date();
    const from =
      parseDay(query.from) ??
      startOfWeekMonday(
        new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        ),
      );
    const to = parseDay(query.to) ?? addDays(from, 6);
    return { from, to };
  }

  private async evaluateTech(
    employeeId: string,
    scheduledDate: Date,
    workOrderId?: string,
  ) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, archivedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        crew: true,
        certificationHeld: true,
        onLeave: true,
        certExpiryDate: true,
        missingBbs: true,
        assignedTruck: true,
      },
    });
    if (!emp) throw new NotFoundException('Technician not found');

    const name = shortName(emp.firstName, emp.lastName);
    const day = dayKey(scheduledDate);

    if (emp.onLeave) {
      return {
        employeeId: emp.id,
        name,
        eligible: false,
        status: 'BLOCKED' as const,
        detail: 'On leave',
        distanceMi: null as number | null,
        jobsThatDay: 0,
      };
    }

    const pto = await this.prisma.timeOffRequest.findFirst({
      where: {
        employeeId,
        status: { in: [TimeOffStatus.APPROVED, TimeOffStatus.PENDING] },
        startDate: { lte: scheduledDate },
        endDate: { gte: scheduledDate },
      },
    });
    if (pto) {
      return {
        employeeId: emp.id,
        name,
        eligible: false,
        status: 'BLOCKED' as const,
        detail: 'PTO / time off',
        distanceMi: null,
        jobsThatDay: 0,
      };
    }

    const expiredCert = await this.prisma.trainingRecord.findFirst({
      where: {
        employeeId,
        status: TrainingRecordStatus.EXPIRED,
      },
      orderBy: { expiryAt: 'desc' },
    });
    if (expiredCert) {
      return {
        employeeId: emp.id,
        name,
        eligible: false,
        status: 'BLOCKED' as const,
        detail: `Missing / expired ${expiredCert.topic}`,
        distanceMi: null,
        jobsThatDay: 0,
      };
    }

    if (emp.certExpiryDate && emp.certExpiryDate < scheduledDate) {
      return {
        employeeId: emp.id,
        name,
        eligible: false,
        status: 'BLOCKED' as const,
        detail: `${emp.certificationHeld || 'Cert'} expired`,
        distanceMi: null,
        jobsThatDay: 0,
      };
    }

    const sameDay = await this.prisma.dispatchAssignment.findMany({
      where: {
        employeeId,
        scheduledDate,
        status: {
          notIn: [
            DispatchAssignmentStatus.CANCELLED,
            DispatchAssignmentStatus.REASSIGNED,
          ],
        },
        ...(workOrderId
          ? { workOrderId: { not: workOrderId } }
          : {}),
      },
      include: {
        workOrder: { select: { code: true, title: true } },
      },
    });

    if (sameDay.length > 0) {
      const other = sameDay[0];
      return {
        employeeId: emp.id,
        name,
        eligible: false,
        status: 'BLOCKED' as const,
        detail: `Already on ${other.workOrder.code}`,
        distanceMi: null,
        jobsThatDay: sameDay.length,
      };
    }

    const jobsThatDay = await this.prisma.dispatchAssignment.count({
      where: {
        employeeId,
        scheduledDate,
        status: {
          notIn: [
            DispatchAssignmentStatus.CANCELLED,
            DispatchAssignmentStatus.REASSIGNED,
          ],
        },
      },
    });

    return {
      employeeId: emp.id,
      name,
      eligible: true,
      status: 'ELIGIBLE' as const,
      detail: jobsThatDay > 0 ? `${jobsThatDay} job that day` : 'Free',
      distanceMi: null as number | null,
      jobsThatDay,
    };
  }

  private async buildGates(workOrderId: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        customer: { select: { id: true, name: true } },
        location: { select: { name: true } },
        dispatchAssignments: {
          where: {
            status: {
              notIn: [
                DispatchAssignmentStatus.CANCELLED,
                DispatchAssignmentStatus.REASSIGNED,
              ],
            },
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                certificationHeld: true,
              },
            },
          },
        },
      },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const certBlocked = wo.dispatchAssignments.filter((a) => {
      if (a.conflictKind === DispatchConflictKind.CERT) return true;
      if (a.status === DispatchAssignmentStatus.CONFLICT && a.conflictLabel?.toLowerCase().includes('cert'))
        return true;
      return false;
    }).length;

    const formBlocked = !wo.formsCompletedAt;
    const assetWarning = !wo.equipmentAssignedAt;
    const customerMet = Boolean(wo.eligibilityVerifiedAt || wo.crewAssignedAt);

    const gates = [
      {
        key: 'certifications',
        label: 'Certifications',
        status: certBlocked > 0 ? ('BLOCKED' as const) : ('MET' as const),
        detail:
          certBlocked > 0
            ? `${certBlocked} blocked`
            : 'All assigned techs clear',
      },
      {
        key: 'customerRequests',
        label: 'Customer Requests',
        status: customerMet ? ('MET' as const) : ('WARNING' as const),
        detail: customerMet ? 'Met' : 'Eligibility not verified',
      },
      {
        key: 'assetReadiness',
        label: 'Asset Readiness',
        status: assetWarning ? ('WARNING' as const) : ('MET' as const),
        detail: assetWarning ? 'Equipment not marked ready' : 'Ready',
      },
      {
        key: 'requiredForms',
        label: 'Required Forms',
        status: formBlocked ? ('BLOCKED' as const) : ('MET' as const),
        detail: formBlocked ? 'Forms incomplete' : 'Complete',
      },
    ];

    const techs = await Promise.all(
      wo.dispatchAssignments
        .filter((a) => a.employeeId)
        .map(async (a) => {
          const evaled = await this.evaluateTech(
            a.employeeId!,
            a.scheduledDate,
            wo.id,
          );
          return {
            ...evaled,
            assignmentId: a.id,
            assignmentStatus: a.status,
          };
        }),
    );

    const blockedCount =
      gates.filter((g) => g.status === 'BLOCKED').length +
      techs.filter((t) => !t.eligible).length;

    return {
      workOrderId: wo.id,
      workOrderCode: wo.code,
      customerName: wo.customer.name,
      locationName: wo.location?.name ?? wo.title ?? '—',
      banner:
        blockedCount > 0
          ? `Blocked · ${blockedCount} issue${blockedCount === 1 ? '' : 's'} must be resolved before dispatch`
          : 'Clear · Ready to dispatch',
      blocked: blockedCount > 0,
      issueCount: blockedCount,
      gates,
      technicians: techs,
    };
  }

  async kpi(query: DispatchRangeQueryDto) {
    const { from, to } = await this.resolveRange(query);
    const next7 = addDays(
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        ),
      ),
      7,
    );
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);

    const base: Prisma.DispatchAssignmentWhereInput = {
      scheduledDate: { gte: from, lte: to },
      status: { not: DispatchAssignmentStatus.CANCELLED },
    };

    const [
      toDispatch,
      posted,
      accepted,
      needsReassign,
      noResponse,
      conflicts,
    ] = await Promise.all([
      this.prisma.dispatchAssignment.count({
        where: {
          status: DispatchAssignmentStatus.TO_DISPATCH,
          scheduledDate: { lte: next7 },
        },
      }),
      this.prisma.dispatchAssignment.count({
        where: { ...base, status: DispatchAssignmentStatus.POSTED },
      }),
      this.prisma.dispatchAssignment.count({
        where: { ...base, status: DispatchAssignmentStatus.ACCEPTED },
      }),
      this.prisma.dispatchAssignment.count({
        where: {
          ...base,
          status: {
            in: [
              DispatchAssignmentStatus.DECLINED,
              DispatchAssignmentStatus.NO_RESPONSE,
            ],
          },
        },
      }),
      this.prisma.dispatchAssignment.count({
        where: {
          status: DispatchAssignmentStatus.POSTED,
          postedAt: { lte: twoHoursAgo },
          acceptedAt: null,
          declinedAt: null,
        },
      }),
      this.prisma.dispatchAssignment.count({
        where: {
          ...base,
          OR: [
            { status: DispatchAssignmentStatus.CONFLICT },
            { conflictKind: { not: DispatchConflictKind.NONE } },
          ],
        },
      }),
    ]);

    return {
      data: {
        toDispatch,
        toDispatchMeta: 'Next 7 days',
        postedToMobile: posted,
        postedMeta: 'Awaiting acceptance',
        accepted,
        acceptedMeta: 'Crews confirmed',
        needsReassign,
        needsReassignMeta: 'Declined · No response',
        noResponse,
        noResponseMeta: 'Over 2 hrs',
        conflicts,
        conflictsMeta: 'Cert · Asset · Overlap',
        rangeLabel: fmtRangeLabel(from, to),
        from: dayKey(from),
        to: dayKey(to),
      },
    };
  }

  async scheduleBoard(query: DispatchRangeQueryDto) {
    const { from, to } = await this.resolveRange(query);
    const days: Date[] = [];
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      days.push(new Date(d));
    }

    const where: Prisma.DispatchAssignmentWhereInput = {
      scheduledDate: { gte: from, lte: to },
      status: { not: DispatchAssignmentStatus.CANCELLED },
    };
    if (query.crew?.trim()) {
      where.employee = { crew: { equals: query.crew.trim(), mode: 'insensitive' } };
    }
    if (query.customerId?.trim()) {
      where.workOrder = { customerId: query.customerId.trim() };
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { workOrder: { code: { contains: q, mode: 'insensitive' } } },
        { workOrder: { title: { contains: q, mode: 'insensitive' } } },
        { workOrder: { customer: { name: { contains: q, mode: 'insensitive' } } } },
        {
          employee: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [assignments, employees, timeOff] = await Promise.all([
      this.prisma.dispatchAssignment.findMany({
        where,
        orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              crew: true,
              certificationHeld: true,
              onLeave: true,
              assignedTruck: true,
            },
          },
          workOrder: {
            include: {
              customer: { select: { id: true, name: true } },
              location: { select: { id: true, name: true, county: true } },
            },
          },
        },
      }),
      this.prisma.employee.findMany({
        where: {
          archivedAt: null,
          status: 'ACTIVE',
          ...(query.crew?.trim()
            ? { crew: { equals: query.crew.trim(), mode: 'insensitive' } }
            : {}),
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 80,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          crew: true,
        },
      }),
      this.prisma.timeOffRequest.findMany({
        where: {
          status: TimeOffStatus.APPROVED,
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
          type: true,
        },
      }),
    ]);

    const cards = assignments.map((a) => this.mapCard(a));
    const techIds = new Set(employees.map((e) => e.id));
    for (const a of assignments) {
      if (a.employee && !techIds.has(a.employee.id)) {
        employees.push({
          id: a.employee.id,
          firstName: a.employee.firstName,
          lastName: a.employee.lastName,
          crew: a.employee.crew,
        });
        techIds.add(a.employee.id);
      }
    }

    const rows = employees.map((emp) => {
      const name = shortName(emp.firstName, emp.lastName);
      const cells = days.map((day) => {
        const key = dayKey(day);
        const dayCards = cards.filter(
          (c) => c.employeeId === emp.id && c.scheduledDate === key,
        );
        const onPto = timeOff.some(
          (t) =>
            t.employeeId === emp.id &&
            t.startDate <= day &&
            t.endDate >= day,
        );
        if (onPto && dayCards.length === 0) {
          return {
            date: key,
            cards: [
              {
                id: `pto-${emp.id}-${key}`,
                workOrderId: null,
                workOrderCode: null,
                customerName: null,
                locationName: 'PTO',
                locationMeta: null,
                jobType: null,
                category: null,
                scheduledDate: key,
                startTime: null,
                endTime: null,
                status: DispatchAssignmentStatus.PTO,
                conflictKind: DispatchConflictKind.PTO,
                conflictLabel: 'Time Off',
                declineReason: null,
                notes: null,
                postedAt: null,
                acceptedAt: null,
                responseMinutes: null,
                employeeId: emp.id,
                employeeName: name,
                crew: emp.crew,
                overrideReason: null,
                overriddenAt: null,
                isPto: true,
              },
            ],
          };
        }
        return { date: key, cards: dayCards };
      });
      return {
        employeeId: emp.id,
        employeeName: name,
        crew: emp.crew,
        cells,
      };
    });

    return {
      data: {
        from: dayKey(from),
        to: dayKey(to),
        rangeLabel: fmtRangeLabel(from, to),
        days: days.map((d) => ({
          date: dayKey(d),
          label: fmtDayLabel(d),
          weekday: d
            .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
            .toUpperCase(),
          dayNum: d.getUTCDate(),
        })),
        rows,
        unassigned: cards.filter((c) => !c.employeeId),
      },
    };
  }

  async acceptanceList(query: DispatchAcceptanceQueryDto) {
    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize ?? 25,
    );
    const where: Prisma.DispatchAssignmentWhereInput = {
      status: {
        notIn: [
          DispatchAssignmentStatus.CANCELLED,
          DispatchAssignmentStatus.TO_DISPATCH,
          DispatchAssignmentStatus.PTO,
        ],
      },
    };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.scheduledDate = {};
      if (query.from) where.scheduledDate.gte = parseDay(query.from)!;
      if (query.to) where.scheduledDate.lte = parseDay(query.to)!;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { workOrder: { code: { contains: q, mode: 'insensitive' } } },
        { workOrder: { customer: { name: { contains: q, mode: 'insensitive' } } } },
        {
          employee: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.dispatchAssignment.count({ where }),
      this.prisma.dispatchAssignment.findMany({
        where,
        skip,
        take,
        orderBy: [{ postedAt: 'desc' }, { scheduledDate: 'asc' }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              crew: true,
              certificationHeld: true,
              onLeave: true,
              assignedTruck: true,
            },
          },
          workOrder: {
            include: {
              customer: { select: { id: true, name: true } },
              location: { select: { id: true, name: true, county: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => {
          const card = this.mapCard(r);
          const crewCount = 1;
          return {
            ...card,
            techLabel: `${card.employeeName}${crewCount > 1 ? ` +${crewCount - 1}` : ''}`,
            postedLabel: r.postedAt
              ? r.postedAt
                  .toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'UTC',
                  })
                  .toUpperCase()
              : '—',
            responseLabel: r.responseMinutes != null ? `${r.responseMinutes} MIN` : '—',
            reasonLabel:
              r.conflictLabel ||
              r.declineReason ||
              (r.status === DispatchAssignmentStatus.NO_RESPONSE
                ? 'Timed out'
                : null),
          };
        }),
        total,
        page,
        pageSize,
      ),
    };
  }

  async getAssignment(id: string) {
    const row = await this.prisma.dispatchAssignment.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    return { data: this.mapCard(row) };
  }

  async eligibility(workOrderId: string) {
    const data = await this.buildGates(workOrderId);
    return { data };
  }

  async assign(dto: AssignDispatchJobDto) {
    const date = parseDay(dto.scheduledDate);
    if (!date) throw new BadRequestException('scheduledDate is required');

    const wo = await this.prisma.workOrder.findUnique({
      where: { id: dto.workOrderId },
    });
    if (!wo || wo.archivedAt) throw new NotFoundException('Work order not found');

    const tech = await this.evaluateTech(dto.employeeId, date, dto.workOrderId);
    let status: DispatchAssignmentStatus = DispatchAssignmentStatus.TO_DISPATCH;
    let conflictKind: DispatchConflictKind = DispatchConflictKind.NONE;
    let conflictLabel: string | null = null;

    if (!tech.eligible) {
      status = DispatchAssignmentStatus.CONFLICT;
      conflictKind = tech.detail.toLowerCase().includes('pto')
        ? DispatchConflictKind.PTO
        : tech.detail.toLowerCase().includes('cert') ||
            tech.detail.toLowerCase().includes('missing') ||
            tech.detail.toLowerCase().includes('expired')
          ? DispatchConflictKind.CERT
          : DispatchConflictKind.OVERLAP;
      conflictLabel = tech.detail;
    }

    if (dto.postToMobile && tech.eligible) {
      status = DispatchAssignmentStatus.POSTED;
    }

    const created = await this.prisma.dispatchAssignment.create({
      data: {
        workOrderId: dto.workOrderId,
        employeeId: dto.employeeId,
        scheduledDate: date,
        startTime: dto.startTime?.trim() || wo.scheduledStart || '07:00',
        endTime: dto.endTime?.trim() || wo.scheduledEnd || '17:00',
        jobType: dto.jobType ?? DispatchJobType.VISIT,
        status,
        conflictKind,
        conflictLabel,
        notes: dto.notes?.trim() || null,
        postedAt:
          status === DispatchAssignmentStatus.POSTED ? new Date() : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });

    if (!wo.crewAssignedAt) {
      await this.prisma.workOrder.update({
        where: { id: wo.id },
        data: { crewAssignedAt: new Date() },
      });
    }

    return { data: this.mapCard(created) };
  }

  async postToMobile(ids?: string[]) {
    const where: Prisma.DispatchAssignmentWhereInput = {
      status: DispatchAssignmentStatus.TO_DISPATCH,
      employeeId: { not: null },
      conflictKind: DispatchConflictKind.NONE,
    };
    if (ids?.length) where.id = { in: ids };

    const result = await this.prisma.dispatchAssignment.updateMany({
      where,
      data: {
        status: DispatchAssignmentStatus.POSTED,
        postedAt: new Date(),
      },
    });
    return {
      data: {
        updated: result.count,
        message: `Posted ${result.count} assignment${result.count === 1 ? '' : 's'} to mobile`,
      },
    };
  }

  async notifyTechs(ids?: string[]) {
    const where: Prisma.DispatchAssignmentWhereInput = {
      status: {
        in: [
          DispatchAssignmentStatus.POSTED,
          DispatchAssignmentStatus.ACCEPTED,
          DispatchAssignmentStatus.TO_DISPATCH,
        ],
      },
      employeeId: { not: null },
    };
    if (ids?.length) where.id = { in: ids };
    const count = await this.prisma.dispatchAssignment.count({ where });
    return {
      data: {
        notified: count,
        message: `Notification queued for ${count} technician${count === 1 ? '' : 's'}`,
      },
    };
  }

  async reschedule(id: string, dto: RescheduleDispatchDto) {
    const row = await this.prisma.dispatchAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        workOrder: {
          include: {
            customer: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Assignment not found');

    const nextEmpId = dto.employeeId ?? row.employeeId;
    const nextDate = parseDay(dto.scheduledDate) ?? row.scheduledDate;
    if (!nextEmpId) throw new BadRequestException('Technician is required');

    const tech = await this.evaluateTech(nextEmpId, nextDate, row.workOrderId);
    const conflict =
      !tech.eligible
        ? {
            message: `Conflict at destination — ${tech.name} · ${tech.detail}`,
            detail: tech.detail,
          }
        : null;

    if (conflict && !dto.force) {
      return {
        data: {
          preview: true,
          jobLabel: `${row.workOrder.location?.name ?? row.workOrder.title ?? 'Job'} · ${row.workOrder.code}`,
          fromLabel: `${row.employee ? shortName(row.employee.firstName, row.employee.lastName) : 'Unassigned'} · ${fmtDayLabel(row.scheduledDate)}`,
          toLabel: `${tech.name} · ${fmtDayLabel(nextDate)}`,
          conflict,
        },
      };
    }

    const updated = await this.prisma.dispatchAssignment.update({
      where: { id },
      data: {
        employeeId: nextEmpId,
        scheduledDate: nextDate,
        status: tech.eligible
          ? row.status === DispatchAssignmentStatus.POSTED ||
            row.status === DispatchAssignmentStatus.ACCEPTED
            ? row.status
            : DispatchAssignmentStatus.TO_DISPATCH
          : DispatchAssignmentStatus.CONFLICT,
        conflictKind: tech.eligible
          ? DispatchConflictKind.NONE
          : DispatchConflictKind.OVERLAP,
        conflictLabel: tech.eligible ? null : tech.detail,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });

    return { data: { preview: false, assignment: this.mapCard(updated) } };
  }

  async reassignCandidates(id: string) {
    const row = await this.prisma.dispatchAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        workOrder: {
          include: {
            customer: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Assignment not found');

    const techs = await this.prisma.employee.findMany({
      where: {
        archivedAt: null,
        status: 'ACTIVE',
        id: row.employeeId ? { not: row.employeeId } : undefined,
      },
      take: 40,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true },
    });

    const candidates = await Promise.all(
      techs.map((t) => this.evaluateTech(t.id, row.scheduledDate, row.workOrderId)),
    );

    return {
      data: {
        assignmentId: row.id,
        workOrderCode: row.workOrder.code,
        customerName: row.workOrder.customer.name,
        locationName: row.workOrder.location?.name ?? '—',
        scheduledDate: dayKey(row.scheduledDate),
        originally: row.employee
          ? shortName(row.employee.firstName, row.employee.lastName)
          : '—',
        declineReason: row.declineReason || 'No reason provided',
        candidates,
      },
    };
  }

  async reassign(id: string, dto: ReassignDispatchDto) {
    const row = await this.prisma.dispatchAssignment.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Assignment not found');

    await this.prisma.dispatchAssignment.update({
      where: { id },
      data: { status: DispatchAssignmentStatus.REASSIGNED },
    });

    const created = await this.assign({
      workOrderId: row.workOrderId,
      employeeId: dto.employeeId,
      scheduledDate: dayKey(row.scheduledDate),
      jobType: row.jobType,
      startTime: row.startTime ?? undefined,
      endTime: row.endTime ?? undefined,
      notes: dto.note?.trim() || row.notes || undefined,
      postToMobile: dto.notifyTechnician !== false,
    });

    return created;
  }

  async leaveUnassigned(id: string) {
    const updated = await this.prisma.dispatchAssignment.update({
      where: { id },
      data: {
        employeeId: null,
        status: DispatchAssignmentStatus.TO_DISPATCH,
        declineReason: null,
        conflictKind: DispatchConflictKind.NONE,
        conflictLabel: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });
    return { data: this.mapCard(updated) };
  }

  async override(id: string, dto: OverrideDispatchDto) {
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('Reason is required');

    const row = await this.prisma.dispatchAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('Assignment not found');

    const updated = await this.prisma.dispatchAssignment.update({
      where: { id },
      data: {
        status: DispatchAssignmentStatus.POSTED,
        conflictKind: DispatchConflictKind.NONE,
        conflictLabel: null,
        overrideReason: reason,
        overrideByName: dto.overrideByName?.trim() || 'Dispatcher',
        overriddenAt: new Date(),
        postedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });

    return {
      data: {
        assignment: this.mapCard(updated),
        message: `Override recorded for ${
          row.employee
            ? shortName(row.employee.firstName, row.employee.lastName)
            : 'assignment'
        }`,
      },
    };
  }

  async cancel(id: string) {
    const updated = await this.prisma.dispatchAssignment.update({
      where: { id },
      data: { status: DispatchAssignmentStatus.CANCELLED },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            crew: true,
            certificationHeld: true,
            onLeave: true,
            assignedTruck: true,
          },
        },
        workOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, county: true } },
          },
        },
      },
    });
    return { data: this.mapCard(updated) };
  }

  async options() {
    const [employees, workOrders, crews, customers] = await Promise.all([
      this.prisma.employee.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
        select: { id: true, firstName: true, lastName: true, crew: true },
      }),
      this.prisma.workOrder.findMany({
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          code: true,
          title: true,
          serviceDate: true,
          customer: { select: { name: true } },
          location: { select: { name: true } },
        },
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, crew: { not: null } },
        distinct: ['crew'],
        select: { crew: true },
        take: 50,
      }),
      this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        take: 100,
        select: { id: true, name: true },
      }),
    ]);

    return {
      data: {
        technicians: employees.map((e) => ({
          value: e.id,
          label: shortName(e.firstName, e.lastName),
          crew: e.crew,
        })),
        workOrders: workOrders.map((w) => ({
          value: w.id,
          label: `${w.code} · ${w.customer.name}${
            w.location?.name ? ` · ${w.location.name}` : ''
          }`,
          serviceDate: w.serviceDate
            ? dayKey(w.serviceDate)
            : null,
        })),
        crews: crews
          .map((c) => c.crew)
          .filter((v): v is string => Boolean(v))
          .map((v) => ({ value: v, label: v.toUpperCase() })),
        customers: customers.map((c) => ({
          value: c.id,
          label: c.name.toUpperCase(),
        })),
      },
    };
  }
}
