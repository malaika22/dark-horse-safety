import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ManagerTier,
  Prisma,
  SupervisorRouteStatus,
} from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSupervisorRouteDto,
  SupervisorRoutingQueryDto,
} from './dto/supervisor-routing.dto';

const STRUCTURE_DRIVES = [
  {
    id: 'time-edit',
    label: 'Time Edit Approval Routing',
    description:
      "Correction requests route to the employee's supervisor first, escalating per the delay above if unactioned.",
  },
  {
    id: 'time-off',
    label: 'Time Off Approval Routing',
    description:
      'PTO / sick requests go to the assigned supervisor; unrouted members stay in the unassigned queue.',
  },
  {
    id: 'training',
    label: 'Training Notifications',
    description:
      'Certification and BBS reminders notify the crew supervisor and backup when the primary is off.',
  },
  {
    id: 'gps',
    label: 'GPS Flag Escalation',
    description:
      'Unresolved GPS flags escalate to the manager tier after the configured business-day delay.',
  },
  {
    id: 'notifications',
    label: 'Notification Recipients',
    description:
      'Backup supervisors receive the same alerts as primary while coverage window is active.',
  },
];

@Injectable()
export class SupervisorRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(
    row: Prisma.SupervisorRouteGetPayload<{
      include: {
        supervisorEmployee: {
          select: { id: true; code: true; firstName: true; lastName: true };
        };
      };
    }>,
  ) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      managerTier: row.managerTier,
      region: row.region,
      crew: row.crew,
      locationLabel: [row.region, row.crew].filter(Boolean).join(' · ') || '—',
      escalatesTo: row.escalatesTo,
      escalateDelay: row.escalateDelay,
      escalateLabel: `${row.escalatesTo} (${row.escalateDelay})`,
      backupName: row.backupName,
      coverageWindow: row.coverageWindow,
      onCall: row.onCall,
      approvesTimeEdit: row.approvesTimeEdit,
      approvesTimeOff: row.approvesTimeOff,
      memberCount: row.memberCount,
      crewSummary: `${row.memberCount} MEMBERS${row.crew ? ` · ${row.crew}` : ''}`,
      supervisorEmployeeId: row.supervisorEmployeeId,
    };
  }

  async kpi() {
    const [routes, unassignedMembers, crews, regions] = await Promise.all([
      this.prisma.supervisorRoute.findMany(),
      this.prisma.employee.count({
        where: { archivedAt: null, supervisorId: null },
      }),
      this.prisma.supervisorRoute.findMany({
        where: { crew: { not: null } },
        distinct: ['crew'],
        select: { crew: true },
      }),
      this.prisma.supervisorRoute.findMany({
        where: { region: { not: null } },
        distinct: ['region'],
        select: { region: true },
      }),
    ]);

    const supervisors = routes.filter(
      (r) => r.status === SupervisorRouteStatus.ACTIVE,
    ).length;
    const unrouted = routes.filter(
      (r) => r.status === SupervisorRouteStatus.UNROUTED,
    ).length;
    const members = routes.reduce((s, r) => s + r.memberCount, 0);

    return {
      data: {
        supervisors,
        supervisorsMeta: 'Active this pay cycle',
        crews: crews.length,
        crewsMeta: `${crews.length} active crew${crews.length === 1 ? '' : 's'}`,
        members,
        membersMeta: `${unassignedMembers} awaiting crew assignment`,
        regions: regions.length,
        regionsMeta: 'Covered by current roster',
        unrouted,
        unroutedMeta: 'Awaiting supervisor assignment',
      },
    };
  }

  async overview(query: SupervisorRoutingQueryDto) {
    const tier = query.managerTier ?? ManagerTier.OPS_MGR;
    const where: Prisma.SupervisorRouteWhereInput = { managerTier: tier };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { crew: { contains: q, mode: 'insensitive' } },
        { region: { contains: q, mode: 'insensitive' } },
      ];
    }

    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize ?? 50,
    );
    const [total, rows] = await Promise.all([
      this.prisma.supervisorRoute.count({ where }),
      this.prisma.supervisorRoute.findMany({
        where,
        include: {
          supervisorEmployee: {
            select: {
              id: true,
              code: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);

    return {
      data: {
        managerTier: tier,
        routes: paginate(
          rows.map((r) => this.mapRow(r)),
          total,
          page,
          pageSize,
        ),
        structureDrives: STRUCTURE_DRIVES,
      },
    };
  }

  async create(dto: CreateSupervisorRouteDto) {
    const count = await this.prisma.supervisorRoute.count();
    const code =
      dto.code?.trim().toUpperCase() ||
      `SR-${String(count + 1).padStart(3, '0')}`;

    const created = await this.prisma.supervisorRoute.create({
      data: {
        code,
        name: dto.name.trim().toUpperCase(),
        status: dto.status ?? SupervisorRouteStatus.ACTIVE,
        managerTier: dto.managerTier ?? ManagerTier.OPS_MGR,
        region: dto.region?.trim().toUpperCase() || null,
        crew: dto.crew?.trim().toUpperCase() || null,
        escalatesTo: dto.escalatesTo?.trim().toUpperCase() || 'OPS MGR',
        escalateDelay:
          dto.escalateDelay?.trim().toUpperCase() || '2 BUSINESS DAYS',
        backupName: dto.backupName?.trim().toUpperCase() || null,
        coverageWindow: dto.coverageWindow?.trim().toUpperCase() || '24/7',
        onCall: dto.onCall ?? false,
        approvesTimeEdit: dto.approvesTimeEdit ?? true,
        approvesTimeOff: dto.approvesTimeOff ?? true,
        memberCount: dto.memberCount ?? 0,
        sortOrder: count + 1,
        supervisorEmployeeId: dto.supervisorEmployeeId || null,
      },
      include: {
        supervisorEmployee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return { data: this.mapRow(created) };
  }

  async getOne(id: string) {
    const row = await this.prisma.supervisorRoute.findUnique({
      where: { id },
      include: {
        supervisorEmployee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Route not found');
    return { data: this.mapRow(row) };
  }
}
