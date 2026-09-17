import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddNoteDto,
  AddTrainingDto,
  BulkAssignDto,
  CreateEmployeeDto,
  EmployeeQueryDto,
  StartOffboardingDto,
  UpdateEmployeeDto,
  UpdateOffboardingDto,
} from './dto/employee.dto';

const SORT_MAP: Record<string, string> = {
  name: 'lastName',
  code: 'code',
  role: 'roleTitle',
  status: 'status',
  hours: 'hoursThisCycle',
  truck: 'assignedTruck',
  createdAt: 'createdAt',
};

type JsonObj = Record<string, unknown>;

export type OffboardingTask = {
  id: string;
  category: string;
  label: string;
  blocking: boolean;
  dueDate: string;
  status: 'PENDING' | 'COMPLETE' | 'BLOCKED';
};

export type OutstandingItem = {
  id: string;
  label: string;
  badge: string;
  badgeTone: 'warning' | 'pending' | 'error';
  amount: number | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function dec(n: Prisma.Decimal | number | null | undefined) {
  return Number(n ?? 0);
}

function defaultOffboardingTasks(lastDay: Date): OffboardingTask[] {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const d = new Date(lastDay);
    d.setDate(d.getDate() + days);
    return fmt(d);
  };
  const last = fmt(lastDay);
  return [
    {
      id: 'fleet-return-equip',
      category: 'FLEET',
      label: 'Return assigned equipment',
      blocking: true,
      dueDate: last,
      status: 'PENDING',
    },
    {
      id: 'fleet-manifest',
      category: 'FLEET',
      label: 'Reconcile truck manifest',
      blocking: false,
      dueDate: shift(-1),
      status: 'PENDING',
    },
    {
      id: 'fleet-reassign-truck',
      category: 'FLEET',
      label: 'Reassign or park truck',
      blocking: false,
      dueDate: shift(-3),
      status: 'COMPLETE',
    },
    {
      id: 'fleet-return-vehicle',
      category: 'FLEET',
      label: 'Return company vehicle',
      blocking: true,
      dueDate: last,
      status: 'PENDING',
    },
    {
      id: 'ops-work-orders',
      category: 'OPERATIONS',
      label: 'Reassign open work orders',
      blocking: false,
      dueDate: shift(-2),
      status: 'PENDING',
    },
    {
      id: 'ops-jobs',
      category: 'OPERATIONS',
      label: 'Reassign dispatched jobs',
      blocking: false,
      dueDate: shift(-3),
      status: 'COMPLETE',
    },
    {
      id: 'hr-time-entries',
      category: 'HR',
      label: 'Approve outstanding time entries',
      blocking: false,
      dueDate: shift(-1),
      status: 'PENDING',
    },
    {
      id: 'hr-time-edits',
      category: 'HR',
      label: 'Resolve open time edit requests',
      blocking: true,
      dueDate: shift(-1),
      status: 'BLOCKED',
    },
    {
      id: 'hr-oncall',
      category: 'HR',
      label: 'Fill on-call rotation gaps',
      blocking: false,
      dueDate: shift(1),
      status: 'PENDING',
    },
    {
      id: 'hr-leave-payout',
      category: 'HR',
      label: 'Final leave payout calculation',
      blocking: false,
      dueDate: shift(2),
      status: 'PENDING',
    },
    {
      id: 'hr-exit',
      category: 'HR',
      label: 'Exit interview',
      blocking: false,
      dueDate: shift(-5),
      status: 'COMPLETE',
    },
    {
      id: 'exp-submit',
      category: 'EXPENSES',
      label: 'Submit outstanding expenses',
      blocking: true,
      dueDate: shift(-2),
      status: 'PENDING',
    },
    {
      id: 'exp-card',
      category: 'EXPENSES',
      label: 'Return company card',
      blocking: false,
      dueDate: last,
      status: 'PENDING',
    },
    {
      id: 'exp-statement',
      category: 'EXPENSES',
      label: 'Reconcile final statement',
      blocking: false,
      dueDate: shift(3),
      status: 'PENDING',
    },
    {
      id: 'bonus-calc',
      category: 'BONUS',
      label: 'Calculate final partial bonus',
      blocking: false,
      dueDate: shift(2),
      status: 'PENDING',
    },
    {
      id: 'bonus-deduct',
      category: 'BONUS',
      label: 'Apply outstanding deductions',
      blocking: false,
      dueDate: shift(2),
      status: 'PENDING',
    },
    {
      id: 'access-revoke',
      category: 'ACCESS',
      label: 'Revoke system access',
      blocking: true,
      dueDate: last,
      status: 'PENDING',
    },
    {
      id: 'access-device',
      category: 'ACCESS',
      label: 'Deactivate mobile device',
      blocking: false,
      dueDate: last,
      status: 'PENDING',
    },
    {
      id: 'access-transfer',
      category: 'ACCESS',
      label: 'Transfer owned records',
      blocking: false,
      dueDate: shift(-4),
      status: 'COMPLETE',
    },
  ];
}

function defaultOutstanding(employee: {
  missingBbs: boolean;
  assignedTruck: string | null;
}): OutstandingItem[] {
  const items: OutstandingItem[] = [
    {
      id: 'assets',
      label: 'Unreturned assets — Laptop, Truck Key (2 items)',
      badge: 'NEEDS RETURN',
      badgeTone: 'warning',
      amount: 1240,
    },
    {
      id: 'expenses',
      label: 'Unsubmitted expenses — 1 pending',
      badge: 'PENDING',
      badgeTone: 'pending',
      amount: 142.6,
    },
  ];
  if (employee.missingBbs) {
    items.push({
      id: 'bbs',
      label: 'Final BBS weekly submission',
      badge: 'MISSING',
      badgeTone: 'error',
      amount: null,
    });
  } else {
    items.push({
      id: 'bbs',
      label: 'Final BBS weekly submission',
      badge: 'MISSING',
      badgeTone: 'error',
      amount: null,
    });
  }
  return items;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  private displayName(firstName: string, lastName: string, displayName?: string | null) {
    if (displayName?.trim()) return displayName.trim().toUpperCase();
    const f = firstName.trim();
    const l = lastName.trim();
    if (f && l) return `${f.charAt(0)}. ${l}`.toUpperCase();
    return (l || f || 'UNKNOWN').toUpperCase();
  }

  private mapListRow(row: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    roleTitle: string;
    status: EmployeeStatus;
    assignedTruck: string | null;
    hoursThisCycle: Prisma.Decimal;
    certExpiringLabel: string | null;
    certExpiringTone: string | null;
    bbsThisWeek: string;
    crew: string | null;
    certificationHeld: string | null;
    hasOpenTimeEdit: boolean;
    missingBbs: boolean;
    onLeave: boolean;
    supervisor: {
      id: string;
      firstName: string;
      lastName: string;
      code: string;
      displayName: string | null;
    } | null;
  }) {
    return {
      id: row.id,
      code: row.code,
      firstName: row.firstName,
      lastName: row.lastName,
      name: this.displayName(row.firstName, row.lastName, row.displayName),
      roleTitle: row.roleTitle.toUpperCase(),
      status: row.status,
      assignedTruck: row.assignedTruck?.toUpperCase() ?? null,
      hoursThisCycle: dec(row.hoursThisCycle),
      certExpiringLabel: (row.certExpiringLabel || 'NONE').toUpperCase(),
      certExpiringTone: (row.certExpiringTone || 'none').toLowerCase(),
      bbsThisWeek: row.bbsThisWeek.toUpperCase(),
      crew: row.crew,
      certificationHeld: row.certificationHeld,
      hasOpenTimeEdit: row.hasOpenTimeEdit,
      missingBbs: row.missingBbs,
      onLeave: row.onLeave,
      supervisor: row.supervisor
        ? {
            id: row.supervisor.id,
            code: row.supervisor.code,
            name: this.displayName(
              row.supervisor.firstName,
              row.supervisor.lastName,
              row.supervisor.displayName,
            ),
          }
        : null,
    };
  }

  private listSelect() {
    return {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      displayName: true,
      roleTitle: true,
      status: true,
      assignedTruck: true,
      hoursThisCycle: true,
      certExpiringLabel: true,
      certExpiringTone: true,
      bbsThisWeek: true,
      crew: true,
      certificationHeld: true,
      hasOpenTimeEdit: true,
      missingBbs: true,
      onLeave: true,
      supervisor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          code: true,
          displayName: true,
        },
      },
    } as const;
  }

  private mapDetail(row: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    roleTitle: string;
    status: EmployeeStatus;
    email: string | null;
    phone: string | null;
    homeAddress: string | null;
    hireDate: Date | null;
    employmentType: string | null;
    payType: string | null;
    assignedTruck: string | null;
    hoursThisCycle: Prisma.Decimal;
    certExpiringLabel: string | null;
    certExpiringTone: string | null;
    bbsThisWeek: string;
    crew: string | null;
    certificationHeld: string | null;
    hasOpenTimeEdit: boolean;
    missingBbs: boolean;
    onLeave: boolean;
    directReportsCount: number;
    maxClockInRadiusEnabled: boolean;
    maxClockInRadius: string | null;
    minBillableBlock: string | null;
    autoFlagNoShow: string | null;
    ptoBalance: Prisma.Decimal;
    ptoAnnual: Prisma.Decimal;
    ptoUsed: Prisma.Decimal;
    ptoScheduled: Prisma.Decimal;
    sickBalance: Prisma.Decimal;
    sickAnnual: Prisma.Decimal;
    sickUsed: Prisma.Decimal;
    holidayBalance: Prisma.Decimal;
    holidayObserved: Prisma.Decimal;
    holidayTaken: Prisma.Decimal;
    cycleRt: Prisma.Decimal;
    cycleOt: Prisma.Decimal;
    cyclePto: Prisma.Decimal;
    lastDay: Date | null;
    terminatedAt: Date | null;
    offboardingStartedAt: Date | null;
    timeEntries: Prisma.JsonValue;
    trainingCerts: Prisma.JsonValue;
    equipment: Prisma.JsonValue;
    auditHistory: Prisma.JsonValue;
    notes: Prisma.JsonValue;
    dateOfBirth?: Date | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    jobTitle?: string | null;
    payRate?: Prisma.Decimal | null;
    overtimeEligible?: boolean;
    adpEmployeeId?: string | null;
    defaultTimeCategory?: string | null;
    roleTemplate?: string | null;
    moduleOverrides?: string | null;
    mobileAppAccess?: boolean;
    sendInvite?: boolean;
    sseEnabled?: boolean;
    sseMentorId?: string | null;
    ssePeriodDays?: number | null;
    sseEvaluationSchedule?: string | null;
    companyCreditCard?: boolean;
    cardLast4?: string | null;
    ppeIssued?: Prisma.JsonValue;
    assignedEquipment?: Prisma.JsonValue;
    certReminderLeadDays?: number | null;
    certIssuingBody?: string | null;
    certIssueDate?: Date | null;
    certExpiryDate?: Date | null;
    payHistory?: Prisma.JsonValue;
    supervisor: {
      id: string;
      firstName: string;
      lastName: string;
      code: string;
      displayName: string | null;
    } | null;
  }) {
    const name = this.displayName(row.firstName, row.lastName, row.displayName);
    const cycleRt = dec(row.cycleRt);
    const cycleOt = dec(row.cycleOt);
    const cyclePto = dec(row.cyclePto);
    const payRate = row.payRate != null ? Number(row.payRate) : null;
    return {
      ...this.mapListRow(row),
      displayName: name,
      email: row.email,
      phone: row.phone,
      homeAddress: row.homeAddress,
      hireDate: row.hireDate ? row.hireDate.toISOString().slice(0, 10) : null,
      employmentType: (row.employmentType || 'FULL-TIME').toUpperCase(),
      payType: (row.payType || 'HOURLY').toUpperCase(),
      directReportsCount: row.directReportsCount,
      maxClockInRadiusEnabled: row.maxClockInRadiusEnabled,
      maxClockInRadius: row.maxClockInRadius,
      minBillableBlock: row.minBillableBlock,
      autoFlagNoShow: row.autoFlagNoShow,
      dateOfBirth: row.dateOfBirth
        ? row.dateOfBirth.toISOString().slice(0, 10)
        : null,
      emergencyContactName: row.emergencyContactName ?? null,
      emergencyContactPhone: row.emergencyContactPhone ?? null,
      jobTitle: row.jobTitle ?? null,
      payRate,
      overtimeEligible: row.overtimeEligible ?? true,
      adpEmployeeId: row.adpEmployeeId ?? null,
      defaultTimeCategory: row.defaultTimeCategory ?? 'REGULAR',
      roleTemplate: row.roleTemplate ?? null,
      moduleOverrides: row.moduleOverrides ?? null,
      mobileAppAccess: row.mobileAppAccess ?? true,
      sendInvite: row.sendInvite ?? true,
      sseEnabled: row.sseEnabled ?? false,
      sseMentorId: row.sseMentorId ?? null,
      ssePeriodDays: row.ssePeriodDays ?? 90,
      sseEvaluationSchedule: row.sseEvaluationSchedule ?? 'WEEKLY',
      companyCreditCard: row.companyCreditCard ?? false,
      cardLast4: row.cardLast4 ?? null,
      assignedEquipment: asArray<string>(row.assignedEquipment),
      ppeIssued: asArray<string>(row.ppeIssued),
      certReminderLeadDays: row.certReminderLeadDays ?? 30,
      certIssuingBody: row.certIssuingBody ?? null,
      certIssueDate: row.certIssueDate
        ? row.certIssueDate.toISOString().slice(0, 10)
        : null,
      certExpiryDate: row.certExpiryDate
        ? row.certExpiryDate.toISOString().slice(0, 10)
        : null,
      payHistory: asArray<JsonObj>(row.payHistory),
      leave: {
        pto: {
          balance: dec(row.ptoBalance),
          annual: dec(row.ptoAnnual),
          used: dec(row.ptoUsed),
          scheduled: dec(row.ptoScheduled),
        },
        sick: {
          balance: dec(row.sickBalance),
          annual: dec(row.sickAnnual),
          used: dec(row.sickUsed),
        },
        holiday: {
          balance: dec(row.holidayBalance),
          observed: dec(row.holidayObserved),
          taken: dec(row.holidayTaken),
        },
      },
      cycleTotals: {
        rt: cycleRt,
        ot: cycleOt,
        pto: cyclePto,
        total: Number((cycleRt + cycleOt + cyclePto).toFixed(1)),
      },
      lastDay: row.lastDay ? row.lastDay.toISOString().slice(0, 10) : null,
      terminatedAt: row.terminatedAt?.toISOString() ?? null,
      offboardingStartedAt: row.offboardingStartedAt?.toISOString() ?? null,
      timeEntries: asArray<JsonObj>(row.timeEntries),
      trainingCerts: asArray<JsonObj>(row.trainingCerts),
      equipment: asArray<JsonObj>(row.equipment),
      auditHistory: asArray<JsonObj>(row.auditHistory),
      notes: asArray<JsonObj>(row.notes),
    };
  }

  private where(query: EmployeeQueryDto): Prisma.EmployeeWhereInput {
    const and: Prisma.EmployeeWhereInput[] = [{ archivedAt: null }];

    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { firstName: containsCi(q) },
          { lastName: containsCi(q) },
          { code: containsCi(q) },
          { roleTitle: containsCi(q) },
          { assignedTruck: containsCi(q) },
          { crew: containsCi(q) },
          { email: containsCi(q) },
          { displayName: containsCi(q) },
        ],
      });
    }

    const status = (query.status ?? '').trim().toUpperCase();
    if (status && status !== 'ANY') {
      and.push({ status: status as EmployeeStatus });
    }
    if (query.role?.trim() && query.role.toUpperCase() !== 'ANY') {
      and.push({ roleTitle: containsCi(query.role.trim()) });
    }
    if (query.crew?.trim() && query.crew.toUpperCase() !== 'ANY') {
      and.push({ crew: { equals: query.crew.trim(), mode: 'insensitive' } });
    }
    if (query.supervisorId?.trim()) {
      and.push({ supervisorId: query.supervisorId.trim() });
    }
    if (
      query.assignedTruck?.trim() &&
      query.assignedTruck.toUpperCase() !== 'ANY'
    ) {
      and.push({
        assignedTruck: {
          equals: query.assignedTruck.trim(),
          mode: 'insensitive',
        },
      });
    }
    if (query.unassignedTruck === 'true') {
      and.push({ OR: [{ assignedTruck: null }, { assignedTruck: '' }] });
    }
    if (
      query.certificationHeld?.trim() &&
      query.certificationHeld.toUpperCase() !== 'ANY'
    ) {
      and.push({
        certificationHeld: {
          equals: query.certificationHeld.trim(),
          mode: 'insensitive',
        },
      });
    }
    if (query.hasOpenTimeEdit === 'true') and.push({ hasOpenTimeEdit: true });
    if (query.missingBbs === 'true') and.push({ missingBbs: true });
    if (query.onLeave === 'true') and.push({ onLeave: true });

    const days = Number(query.certExpiringWithinDays);
    if (Number.isFinite(days) && days > 0) {
      and.push({
        OR: [
          { certExpiringTone: { equals: 'warning', mode: 'insensitive' } },
          { certExpiringTone: { equals: 'error', mode: 'insensitive' } },
          { certExpiringLabel: containsCi('DAY') },
        ],
      });
    }

    if (query.availableOnDate?.trim()) {
      and.push({ onLeave: false, status: { not: EmployeeStatus.OFFLINE } });
    }

    return { AND: and };
  }

  async kpi() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [active, newThisMonth, hoursAgg, pendingEdits, timeOff, trainingFlags] =
      await this.prisma.$transaction([
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
          where: { archivedAt: null },
          _sum: { hoursThisCycle: true },
          _avg: { hoursThisCycle: true },
          _count: true,
        }),
        this.prisma.employee.count({
          where: { archivedAt: null, hasOpenTimeEdit: true },
        }),
        this.prisma.employee.count({
          where: { archivedAt: null, onLeave: true },
        }),
        this.prisma.employee.count({
          where: { archivedAt: null, missingBbs: true },
        }),
      ]);

    const needReview = await this.prisma.employee.count({
      where: { archivedAt: null, status: EmployeeStatus.NEED_REVIEW },
    });

    const hours = Number(hoursAgg._sum.hoursThisCycle ?? 0);
    const avg = Number(hoursAgg._avg.hoursThisCycle ?? 0);

    return {
      data: {
        active,
        activeDelta: newThisMonth,
        hoursThisCycle: Number(hours.toFixed(1)),
        hoursAvg: Number(avg.toFixed(1)),
        pendingRequests: pendingEdits + timeOff + needReview,
        pendingEdits,
        pendingTimeOff: timeOff,
        trainingFlags,
        trainingFlagsMeta: trainingFlags > 0 ? 'BBS Missing' : 'Clear',
      },
    };
  }

  async list(query: EmployeeQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          lastName: 'asc',
        }),
        select: this.listSelect(),
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => this.mapListRow(r)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async getOne(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            displayName: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Employee not found');
    return { data: this.mapDetail(row) };
  }

  private async nextCode() {
    const rows = await this.prisma.employee.findMany({
      select: { code: true },
    });
    let max = 1000;
    for (const r of rows) {
      const m = /^EMP-(\d+)$/i.exec(r.code);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `EMP-${max + 1}`;
  }

  async create(dto: CreateEmployeeDto) {
    const code = await this.nextCode();
    const certName = dto.certificationHeld?.trim() || null;
    const equipmentTags = (dto.assignedEquipment ?? []).filter(Boolean);
    const ppeTags = (dto.ppeIssued ?? []).filter(Boolean);
    const trainingCerts = certName
      ? [
          {
            id: `cert-${Date.now()}`,
            name: certName,
            expiresAt: dto.certExpiryDate ?? null,
            status: 'APPROVED',
          },
        ]
      : [];
    const equipmentRows = [
      ...(dto.assignedTruck
        ? [
            {
              id: 'eq-truck',
              label: 'Assigned Truck',
              value: dto.assignedTruck.trim(),
              action: 'VIEW TRUCK',
              href: '/fleet/assets',
            },
          ]
        : []),
      ...equipmentTags.map((label, i) => ({
        id: `eq-${i}`,
        label: 'Assigned equipment',
        value: label,
        badge: 'ASSIGNED',
        badgeTone: 'muted',
      })),
      ...ppeTags.map((label, i) => ({
        id: `ppe-${i}`,
        label: 'PPE Issued',
        value: label,
        badge: 'ISSUED',
        badgeTone: 'muted',
      })),
    ];

    const created = await this.prisma.employee.create({
      data: {
        code,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        displayName: dto.displayName?.trim() || null,
        roleTitle: dto.roleTitle.trim(),
        jobTitle: dto.jobTitle?.trim() || dto.roleTitle.trim(),
        status: dto.status ?? EmployeeStatus.ACTIVE,
        supervisorId: dto.supervisorId || null,
        assignedTruck: dto.assignedTruck?.trim() || null,
        crew: dto.crew?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        homeAddress: dto.homeAddress?.trim() || null,
        dateOfBirth: dto.dateOfBirth
          ? new Date(`${dto.dateOfBirth}T12:00:00.000Z`)
          : null,
        emergencyContactName: dto.emergencyContactName?.trim() || null,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
        hireDate: dto.hireDate
          ? new Date(`${dto.hireDate}T12:00:00.000Z`)
          : null,
        employmentType: dto.employmentType?.trim() || 'FULL-TIME',
        payType: dto.payType?.trim() || 'HOURLY',
        payRate: dto.payRate ? Number(dto.payRate.replace(/[^0-9.]/g, '')) : null,
        overtimeEligible: dto.overtimeEligible ?? true,
        adpEmployeeId: dto.adpEmployeeId?.trim() || null,
        defaultTimeCategory: dto.defaultTimeCategory?.trim() || 'REGULAR',
        certificationHeld: certName,
        certIssueDate: dto.certIssueDate
          ? new Date(`${dto.certIssueDate}T12:00:00.000Z`)
          : null,
        certExpiryDate: dto.certExpiryDate
          ? new Date(`${dto.certExpiryDate}T12:00:00.000Z`)
          : null,
        certIssuingBody: dto.certIssuingBody?.trim() || null,
        certReminderLeadDays: dto.certReminderLeadDays ?? 30,
        certExpiringLabel: certName ? 'NONE' : 'N/A',
        certExpiringTone: certName ? 'none' : 'na',
        bbsThisWeek: 'N/A',
        assignedEquipment: equipmentTags as unknown as Prisma.InputJsonValue,
        ppeIssued: ppeTags as unknown as Prisma.InputJsonValue,
        companyCreditCard: dto.companyCreditCard ?? false,
        cardLast4: dto.cardLast4?.trim() || null,
        roleTemplate: dto.roleTemplate?.trim() || null,
        moduleOverrides: dto.moduleOverrides?.trim() || null,
        mobileAppAccess: dto.mobileAppAccess ?? true,
        sendInvite: dto.sendInvite ?? true,
        sseEnabled: dto.sseEnabled ?? false,
        sseMentorId: dto.sseMentorId?.trim() || null,
        ssePeriodDays: dto.ssePeriodDays ?? 90,
        sseEvaluationSchedule: dto.sseEvaluationSchedule?.trim() || 'WEEKLY',
        trainingCerts: trainingCerts as unknown as Prisma.InputJsonValue,
        equipment: equipmentRows as unknown as Prisma.InputJsonValue,
        auditHistory: [
          {
            id: `audit-${Date.now()}`,
            when: 'Just now',
            label: 'Employee created',
          },
        ] as unknown as Prisma.InputJsonValue,
      },
      select: this.listSelect(),
    });
    return { data: this.mapListRow(created) };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    const parseRate = (raw?: string | null) => {
      if (raw == null || raw === '') return null;
      const n = Number(String(raw).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const nextPayRate = dto.payRate !== undefined ? parseRate(dto.payRate) : undefined;
    const prevPayRate =
      existing.payRate != null ? Number(existing.payRate) : null;
    let payHistory = asArray<JsonObj>(existing.payHistory);

    if (
      nextPayRate != null &&
      prevPayRate != null &&
      nextPayRate !== prevPayRate
    ) {
      payHistory = [
        {
          id: `pay-${Date.now()}`,
          date:
            dto.payRateEffectiveDate ||
            new Date().toISOString().slice(0, 10),
          from: prevPayRate,
          to: nextPayRate,
          by: 'Admin',
          label: `$${prevPayRate.toFixed(2)} -> $${nextPayRate.toFixed(2)} / hr`,
        },
        ...payHistory,
      ];
    } else if (nextPayRate != null && prevPayRate == null) {
      payHistory = [
        {
          id: `pay-${Date.now()}`,
          date:
            dto.payRateEffectiveDate ||
            existing.hireDate?.toISOString().slice(0, 10) ||
            new Date().toISOString().slice(0, 10),
          from: null,
          to: nextPayRate,
          by: 'System',
          label: `Hired at $${nextPayRate.toFixed(2)} / hr`,
        },
        ...payHistory,
      ];
    }

    const equipmentTags = dto.assignedEquipment;
    const ppeTags = dto.ppeIssued;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined
          ? { firstName: dto.firstName.trim() }
          : {}),
        ...(dto.lastName !== undefined
          ? { lastName: dto.lastName.trim() }
          : {}),
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName?.trim() || null }
          : {}),
        ...(dto.roleTitle !== undefined
          ? { roleTitle: dto.roleTitle.trim() }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.supervisorId !== undefined
          ? { supervisorId: dto.supervisorId }
          : {}),
        ...(dto.assignedTruck !== undefined
          ? { assignedTruck: dto.assignedTruck?.trim() || null }
          : {}),
        ...(dto.crew !== undefined ? { crew: dto.crew?.trim() || null } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null }
          : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone?.trim() || null }
          : {}),
        ...(dto.homeAddress !== undefined
          ? { homeAddress: dto.homeAddress?.trim() || null }
          : {}),
        ...(dto.hireDate !== undefined
          ? {
              hireDate: dto.hireDate
                ? new Date(`${dto.hireDate}T12:00:00.000Z`)
                : null,
            }
          : {}),
        ...(dto.employmentType !== undefined
          ? { employmentType: dto.employmentType?.trim() || null }
          : {}),
        ...(dto.payType !== undefined
          ? { payType: dto.payType?.trim() || null }
          : {}),
        ...(dto.onLeave !== undefined ? { onLeave: dto.onLeave } : {}),
        ...(dto.bbsThisWeek !== undefined
          ? { bbsThisWeek: dto.bbsThisWeek }
          : {}),
        ...(dto.missingBbs !== undefined
          ? { missingBbs: dto.missingBbs }
          : {}),
        ...(dto.maxClockInRadiusEnabled !== undefined
          ? { maxClockInRadiusEnabled: dto.maxClockInRadiusEnabled }
          : {}),
        ...(dto.maxClockInRadius !== undefined
          ? { maxClockInRadius: dto.maxClockInRadius }
          : {}),
        ...(dto.minBillableBlock !== undefined
          ? { minBillableBlock: dto.minBillableBlock }
          : {}),
        ...(dto.autoFlagNoShow !== undefined
          ? { autoFlagNoShow: dto.autoFlagNoShow }
          : {}),
        ...(dto.dateOfBirth !== undefined
          ? {
              dateOfBirth: dto.dateOfBirth
                ? new Date(`${dto.dateOfBirth}T12:00:00.000Z`)
                : null,
            }
          : {}),
        ...(dto.emergencyContactName !== undefined
          ? {
              emergencyContactName: dto.emergencyContactName?.trim() || null,
            }
          : {}),
        ...(dto.emergencyContactPhone !== undefined
          ? {
              emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
            }
          : {}),
        ...(dto.jobTitle !== undefined
          ? { jobTitle: dto.jobTitle?.trim() || null }
          : {}),
        ...(nextPayRate !== undefined ? { payRate: nextPayRate } : {}),
        ...(dto.overtimeEligible !== undefined
          ? { overtimeEligible: dto.overtimeEligible }
          : {}),
        ...(dto.adpEmployeeId !== undefined
          ? { adpEmployeeId: dto.adpEmployeeId?.trim() || null }
          : {}),
        ...(dto.defaultTimeCategory !== undefined
          ? { defaultTimeCategory: dto.defaultTimeCategory?.trim() || null }
          : {}),
        ...(dto.certificationHeld !== undefined
          ? { certificationHeld: dto.certificationHeld?.trim() || null }
          : {}),
        ...(dto.certIssueDate !== undefined
          ? {
              certIssueDate: dto.certIssueDate
                ? new Date(`${dto.certIssueDate}T12:00:00.000Z`)
                : null,
            }
          : {}),
        ...(dto.certExpiryDate !== undefined
          ? {
              certExpiryDate: dto.certExpiryDate
                ? new Date(`${dto.certExpiryDate}T12:00:00.000Z`)
                : null,
            }
          : {}),
        ...(dto.certIssuingBody !== undefined
          ? { certIssuingBody: dto.certIssuingBody?.trim() || null }
          : {}),
        ...(dto.certReminderLeadDays !== undefined
          ? { certReminderLeadDays: dto.certReminderLeadDays }
          : {}),
        ...(equipmentTags !== undefined
          ? {
              assignedEquipment:
                equipmentTags as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(ppeTags !== undefined
          ? { ppeIssued: ppeTags as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.companyCreditCard !== undefined
          ? { companyCreditCard: dto.companyCreditCard }
          : {}),
        ...(dto.cardLast4 !== undefined
          ? { cardLast4: dto.cardLast4?.trim() || null }
          : {}),
        ...(dto.roleTemplate !== undefined
          ? { roleTemplate: dto.roleTemplate?.trim() || null }
          : {}),
        ...(dto.moduleOverrides !== undefined
          ? { moduleOverrides: dto.moduleOverrides?.trim() || null }
          : {}),
        ...(dto.mobileAppAccess !== undefined
          ? { mobileAppAccess: dto.mobileAppAccess }
          : {}),
        ...(dto.sendInvite !== undefined
          ? { sendInvite: dto.sendInvite }
          : {}),
        ...(dto.sseEnabled !== undefined
          ? { sseEnabled: dto.sseEnabled }
          : {}),
        ...(dto.sseMentorId !== undefined
          ? { sseMentorId: dto.sseMentorId?.trim() || null }
          : {}),
        ...(dto.ssePeriodDays !== undefined
          ? { ssePeriodDays: dto.ssePeriodDays }
          : {}),
        ...(dto.sseEvaluationSchedule !== undefined
          ? {
              sseEvaluationSchedule:
                dto.sseEvaluationSchedule?.trim() || null,
            }
          : {}),
        payHistory: payHistory as unknown as Prisma.InputJsonValue,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            displayName: true,
          },
        },
      },
    });
    return { data: this.mapDetail(updated) };
  }

  async bulkAssign(dto: BulkAssignDto) {
    if (!dto.ids?.length) throw new BadRequestException('No employees selected');

    if (!dto.supervisorId && !dto.crew && !dto.trainingLabel) {
      throw new BadRequestException('Nothing to assign');
    }

    let updated = 0;
    for (const id of dto.ids) {
      const result = await this.prisma.employee.updateMany({
        where: { id, archivedAt: null },
        data: {
          ...(dto.crew ? { crew: dto.crew.trim() } : {}),
          ...(dto.trainingLabel
            ? {
                certificationHeld: dto.trainingLabel.trim(),
                missingBbs: false,
                bbsThisWeek: 'PENDING',
              }
            : {}),
        },
      });
      if (dto.supervisorId) {
        await this.prisma.employee.update({
          where: { id },
          data: { supervisorId: dto.supervisorId },
        });
        updated += 1;
      } else {
        updated += result.count;
      }
    }
    return { data: { updated } };
  }

  async addNote(id: string, dto: AddNoteDto) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');
    const notes = asArray<JsonObj>(row.notes);
    const note = {
      id: `note-${Date.now()}`,
      text: dto.text.trim(),
      createdAt: new Date().toISOString(),
    };
    notes.unshift(note);
    const audit = asArray<JsonObj>(row.auditHistory);
    audit.unshift({
      id: `audit-${Date.now()}`,
      when: 'Just now',
      label: 'Note added',
    });
    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        notes: notes as Prisma.InputJsonValue,
        auditHistory: audit as Prisma.InputJsonValue,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            displayName: true,
          },
        },
      },
    });
    return { data: this.mapDetail(updated) };
  }

  async addTraining(id: string, dto: AddTrainingDto) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');
    const certs = asArray<JsonObj>(row.trainingCerts);
    certs.unshift({
      id: `cert-${Date.now()}`,
      name: dto.name.trim(),
      expiresAt: dto.expiresAt ?? null,
      status: (dto.status || 'APPROVED').toUpperCase(),
    });
    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        trainingCerts: certs as Prisma.InputJsonValue,
        certificationHeld: dto.name.trim(),
        missingBbs: false,
        bbsThisWeek: 'PENDING',
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            displayName: true,
          },
        },
      },
    });
    return { data: this.mapDetail(updated) };
  }

  async resetPassword(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!row) throw new NotFoundException('Employee not found');
    const email = row.user?.email || row.email;
    if (!email) {
      throw new BadRequestException(
        'No email on file for this employee. Link a user account first.',
      );
    }
    return {
      data: {
        message: `Password reset link queued for ${email}`,
        email,
      },
    };
  }

  private offboardingPayload(row: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    roleTitle: string;
    lastDay: Date | null;
    offboardingStartedAt: Date | null;
    offboardingTasks: Prisma.JsonValue;
    outstandingItems: Prisma.JsonValue;
    missingBbs: boolean;
    assignedTruck: string | null;
  }) {
    const lastDay =
      row.lastDay ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
      })();
    let tasks = asArray<OffboardingTask>(row.offboardingTasks);
    if (!tasks.length) tasks = defaultOffboardingTasks(lastDay);
    const complete = tasks.filter((t) => t.status === 'COMPLETE').length;
    const categories = [
      'FLEET',
      'OPERATIONS',
      'HR',
      'EXPENSES',
      'BONUS',
      'ACCESS',
    ].map((category) => {
      const items = tasks.filter((t) => t.category === category);
      return {
        category,
        complete: items.filter((t) => t.status === 'COMPLETE').length,
        total: items.length,
        tasks: items,
      };
    });
    return {
      employeeId: row.id,
      name: this.displayName(row.firstName, row.lastName, row.displayName),
      roleTitle: row.roleTitle.toUpperCase(),
      lastDay: lastDay.toISOString().slice(0, 10),
      startedAt: row.offboardingStartedAt?.toISOString() ?? null,
      progress: { complete, total: tasks.length },
      categories,
      tasks,
      outstandingItems:
        asArray<OutstandingItem>(row.outstandingItems).length > 0
          ? asArray<OutstandingItem>(row.outstandingItems)
          : defaultOutstanding(row),
    };
  }

  async startOffboarding(id: string, dto: StartOffboardingDto) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');

    const lastDay = dto.lastDay
      ? new Date(`${dto.lastDay}T12:00:00.000Z`)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 14);
          return d;
        })();

    const tasks = defaultOffboardingTasks(lastDay);
    const outstanding = defaultOutstanding(row);
    const audit = asArray<JsonObj>(row.auditHistory);
    audit.unshift({
      id: `audit-${Date.now()}`,
      when: 'Just now',
      label: 'Offboarding started',
    });

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        lastDay,
        offboardingStartedAt: new Date(),
        status: EmployeeStatus.NEED_REVIEW,
        onLeave: true,
        offboardingTasks: tasks as unknown as Prisma.InputJsonValue,
        outstandingItems: outstanding as unknown as Prisma.InputJsonValue,
        auditHistory: audit as Prisma.InputJsonValue,
      },
    });

    return { data: this.offboardingPayload(updated) };
  }

  async getOffboarding(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');
    if (!row.offboardingStartedAt && !asArray(row.offboardingTasks).length) {
      throw new BadRequestException('Offboarding has not been started');
    }
    return { data: this.offboardingPayload(row) };
  }

  async updateOffboarding(id: string, dto: UpdateOffboardingDto) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');

    let tasks = asArray<OffboardingTask>(row.offboardingTasks);
    if (!tasks.length) {
      tasks = defaultOffboardingTasks(
        row.lastDay ?? new Date(Date.now() + 14 * 86400000),
      );
    }

    if (dto.tasks?.length) {
      const map = new Map(dto.tasks.map((t) => [t.id, t.status]));
      tasks = tasks.map((t) => {
        const next = map.get(t.id);
        if (!next) return t;
        const status = next.toUpperCase();
        if (
          status !== 'PENDING' &&
          status !== 'COMPLETE' &&
          status !== 'BLOCKED'
        ) {
          return t;
        }
        return { ...t, status };
      });
    }

    const lastDay = dto.lastDay
      ? new Date(`${dto.lastDay}T12:00:00.000Z`)
      : row.lastDay;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        lastDay,
        offboardingTasks: tasks as unknown as Prisma.InputJsonValue,
      },
    });

    return { data: this.offboardingPayload(updated) };
  }

  async terminationPreview(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');
    const payload = this.offboardingPayload(row);
    const total = payload.outstandingItems.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0,
    );
    return {
      data: {
        ...payload,
        totalLiability: Number(total.toFixed(2)),
        warnings: [
          'Access will be revoked immediately.',
          'Records will be retained per retention policy.',
          'Outstanding items will be listed below.',
        ],
      },
    };
  }

  async terminate(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Employee not found');

    const audit = asArray<JsonObj>(row.auditHistory);
    audit.unshift({
      id: `audit-${Date.now()}`,
      when: 'Just now',
      label: 'Employment terminated',
    });

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status: EmployeeStatus.OFFLINE,
        onLeave: false,
        terminatedAt: new Date(),
        assignedTruck: null,
        auditHistory: audit as Prisma.InputJsonValue,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            displayName: true,
          },
        },
      },
    });

    return { data: this.mapDetail(updated) };
  }

  async filterOptions() {
    const [roles, crews, trucks, certs, supervisors] = await Promise.all([
      this.prisma.employee.findMany({
        where: { archivedAt: null },
        distinct: ['roleTitle'],
        select: { roleTitle: true },
        take: 100,
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, crew: { not: null } },
        distinct: ['crew'],
        select: { crew: true },
        take: 50,
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, assignedTruck: { not: null } },
        distinct: ['assignedTruck'],
        select: { assignedTruck: true },
        take: 100,
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, certificationHeld: { not: null } },
        distinct: ['certificationHeld'],
        select: { certificationHeld: true },
        take: 50,
      }),
      this.prisma.employee.findMany({
        where: {
          archivedAt: null,
          OR: [
            { roleTitle: { contains: 'Supervisor', mode: 'insensitive' } },
            { reports: { some: {} } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          code: true,
          displayName: true,
        },
        take: 50,
      }),
    ]);

    return {
      data: {
        statuses: [
          { value: 'ANY', label: 'Any' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'NEED_REVIEW', label: 'Need Review' },
          { value: 'OFFLINE', label: 'Offline' },
        ],
        roles: [
          { value: 'ANY', label: 'Any' },
          ...roles.map((r) => ({
            value: r.roleTitle,
            label: r.roleTitle.toUpperCase(),
          })),
        ],
        crews: [
          { value: 'ANY', label: 'Any' },
          ...crews
            .filter((c) => c.crew)
            .map((c) => ({ value: c.crew!, label: c.crew!.toUpperCase() })),
        ],
        trucks: [
          { value: 'ANY', label: 'Any' },
          ...trucks
            .filter((t) => t.assignedTruck)
            .map((t) => ({
              value: t.assignedTruck!,
              label: t.assignedTruck!.toUpperCase(),
            })),
        ],
        certifications: [
          { value: 'ANY', label: 'Any' },
          ...certs
            .filter((c) => c.certificationHeld)
            .map((c) => ({
              value: c.certificationHeld!,
              label: c.certificationHeld!.toUpperCase(),
            })),
        ],
        supervisors: [
          { value: '', label: 'Any' },
          ...supervisors.map((s) => ({
            value: s.id,
            label: this.displayName(s.firstName, s.lastName, s.displayName),
          })),
        ],
        wizard: {
          roles: [
            'TECHNICIAN',
            'TECH II · LEAD',
            'SUPERVISOR',
            'FIELD TECHNICIAN',
          ],
          employmentTypes: ['FULL-TIME', 'PART-TIME', 'CONTRACT'],
          payTypes: ['HOURLY', 'SALARY'],
          timeCategories: ['REGULAR', 'TRAVEL', 'TRAINING'],
          roleTemplates: [
            'FIELD TECHNICIAN',
            'SUPERVISOR',
            'DISPATCHER',
            'ADMIN',
          ],
          certificationTypes: [
            'H2S AWARENESS',
            'FIRST AID / CPR',
            'FIT TEST',
            'CONFINED SPACE',
            'FALL PROTECTION',
          ],
          reminderLeadDays: [
            { value: '14', label: '14 DAYS BEFORE EXPIRY' },
            { value: '30', label: '30 DAYS BEFORE EXPIRY' },
            { value: '60', label: '60 DAYS BEFORE EXPIRY' },
          ],
          equipmentOptions: [
            'H2S MONITOR',
            'FALL HARNESS',
            'GAS DETECTOR',
            'RADIO',
          ],
          ppeOptions: ['HARD HAT', 'FR COVERALLS', 'STEEL TOES', 'GLOVES'],
          trucks: [
            'TRK-03',
            'TRK-05',
            'TRK-07',
            'TRK-09',
            'TRK-11',
            'TRK-14',
            'TRK-18',
            'TRK-22',
          ],
          crews: [
            'PERMIAN NORTH CREW',
            'ALPHA',
            'BRAVO',
            'CHARLIE',
          ],
          ssePeriods: [
            { value: '30', label: '30 DAYS' },
            { value: '60', label: '60 DAYS' },
            { value: '90', label: '90 DAYS' },
          ],
          sseSchedules: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'],
        },
      },
    };
  }
}
