import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, EnforcementLevel, Prisma } from '@prisma/client';
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
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRequirementDto,
  RequirementListQueryDto,
  UpdateRequirementDto,
} from './dto/requirement.dto';

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
  dueDate: 'dueDate',
};

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(
    query: RequirementListQueryDto,
  ): Prisma.CustomerRequirementWhereInput {
    const and: Prisma.CustomerRequirementWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.requirementType)
      and.push({ requirementType: containsCi(query.requirementType) });
    if (query.enforcementLevel)
      and.push({
        enforcementLevel: query.enforcementLevel as EnforcementLevel,
      });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { requirementType: containsCi(q) },
          { notes: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: RequirementListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.customerRequirement.count({ where }),
      this.prisma.customerRequirement.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, hardGate] = await Promise.all([
      this.prisma.customerRequirement.count({ where: { archivedAt: null } }),
      this.prisma.customerRequirement.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.customerRequirement.count({
        where: { archivedAt: { not: null } },
      }),
      this.prisma.customerRequirement.count({
        where: {
          archivedAt: null,
          enforcementLevel: EnforcementLevel.HARD_GATE,
        },
      }),
    ]);
    return { data: { total, active, archived, hardGate } };
  }

  async getById(id: string) {
    const req = await this.prisma.customerRequirement.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!req) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Requirement not found',
      });
    }
    return { data: req };
  }

  async create(dto: CreateRequirementDto) {
    const code = await this.codes.next('requirement');
    const req = await this.prisma.customerRequirement.create({
      data: {
        code,
        customerId: dto.customerId,
        name: dto.name,
        requirementType: dto.requirementType,
        appliesTo: dto.appliesTo,
        enforcementLevel: dto.enforcementLevel ?? EnforcementLevel.SOFT_GATE,
        evidenceRequired: dto.evidenceRequired ?? false,
        renewalPeriod: dto.renewalPeriod,
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        reviewCycle: dto.reviewCycle,
        docsRequired: dto.docsRequired ?? false,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        ownerId: dto.ownerId,
      },
    });
    return { data: req };
  }

  async update(id: string, dto: UpdateRequirementDto) {
    await this.ensureExists(id);
    const req = await this.prisma.customerRequirement.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.requirementType !== undefined
          ? { requirementType: dto.requirementType }
          : {}),
        ...(dto.appliesTo !== undefined ? { appliesTo: dto.appliesTo } : {}),
        ...(dto.enforcementLevel !== undefined
          ? { enforcementLevel: dto.enforcementLevel }
          : {}),
        ...(dto.evidenceRequired !== undefined
          ? { evidenceRequired: dto.evidenceRequired }
          : {}),
        ...(dto.renewalPeriod !== undefined
          ? { renewalPeriod: dto.renewalPeriod }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.reviewCycle !== undefined
          ? { reviewCycle: dto.reviewCycle }
          : {}),
        ...(dto.docsRequired !== undefined
          ? { docsRequired: dto.docsRequired }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      },
    });
    return { data: req };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const req = await this.prisma.customerRequirement.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: req };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.customerRequirement.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async exportCsv(
    query: RequirementListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.CustomerRequirementWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.customerRequirement.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      { key: 'code', header: 'Code', value: (r: Row) => r.code },
      {
        key: 'customer',
        header: 'Customer',
        value: (r: Row) => r.customer?.name,
      },
      {
        key: 'requirement',
        header: 'Requirement',
        value: (r: Row) => r.name,
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'type',
        header: 'Type',
        value: (r: Row) => r.requirementType,
      },
      {
        key: 'enforcement',
        header: 'Enforcement',
        value: (r: Row) => r.enforcementLevel,
      },
      {
        key: 'appliesTo',
        header: 'Applies To',
        value: (r: Row) => r.appliesTo,
      },
      {
        key: 'owner',
        header: 'Owner',
        value: (r: Row) => userLabel(r.owner),
      },
      {
        key: 'dueDate',
        header: 'Due Date',
        value: (r: Row) => isoDate(r.dueDate),
      },
      {
        key: 'reviewCycle',
        header: 'Review Cycle',
        value: (r: Row) => r.reviewCycle,
      },
      {
        key: 'docsRequired',
        header: 'Docs Required',
        value: (r: Row) => (r.docsRequired ? 'Yes' : 'No'),
      },
      {
        key: 'evidenceRequired',
        header: 'Evidence Required',
        value: (r: Row) => (r.evidenceRequired ? 'Yes' : 'No'),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Requirements',
      'requirements',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  async affected(id: string) {
    const req = await this.prisma.customerRequirement.findUnique({
      where: { id },
      select: { id: true, customerId: true },
    });
    if (!req) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Requirement not found',
      });
    }
    const [contacts, workOrderRows, locations] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          archivedAt: null,
          OR: [
            { primaryCustomerId: req.customerId },
            { customers: { some: { customerId: req.customerId } } },
          ],
        },
        orderBy: { fullName: 'asc' },
        take: 50,
        select: {
          id: true,
          fullName: true,
          roleTitle: true,
          customers: {
            where: { customerId: req.customerId },
            select: { roleAtCustomer: true },
            take: 1,
          },
        },
      }),
      this.prisma.workOrder.findMany({
        where: {
          customerId: req.customerId,
          status: { not: CrmRecordStatus.ARCHIVED },
          archivedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
        },
      }),
      this.prisma.location.findMany({
        where: {
          customerId: req.customerId,
          archivedAt: null,
          openJobs: { gt: 0 },
        },
        orderBy: { openJobs: 'desc' },
        take: 50,
        select: {
          id: true,
          code: true,
          name: true,
          openJobs: true,
          status: true,
        },
      }),
    ]);

    const technicians = contacts.map((c) => ({
      id: c.id,
      name: c.fullName,
      role:
        c.customers[0]?.roleAtCustomer ?? c.roleTitle ?? 'Technician',
    }));

    if (workOrderRows.length > 0) {
      return {
        data: {
          technicians,
          workOrders: workOrderRows.map((wo) => ({
            id: wo.id,
            workOrder: wo.title?.trim()
              ? `${wo.code} / ${wo.title}`
              : wo.code,
            priority: this.priorityFromStatus(wo.status),
            source: 'work_orders' as const,
          })),
          source: 'work_orders' as const,
        },
      };
    }

    return {
      data: {
        technicians,
        workOrders: locations.map((loc) => ({
          id: loc.id,
          workOrder: `Location: ${loc.code} / ${loc.name}`,
          priority: this.priorityFromOpenJobs(loc.openJobs),
          source: 'location' as const,
        })),
        source: 'locations_with_open_jobs' as const,
      },
    };
  }

  async affectedSummary() {
    const customerIds = (
      await this.prisma.customerRequirement.findMany({
        where: { archivedAt: null },
        select: { customerId: true },
        distinct: ['customerId'],
      })
    ).map((r) => r.customerId);

    if (customerIds.length === 0) {
      return {
        data: {
          technicians: [],
          workOrders: [],
          statusWells: [],
          source: 'locations_with_open_jobs' as const,
        },
      };
    }

    const [contacts, workOrderRows, openLocations, statusLocations] =
      await Promise.all([
        this.prisma.contact.findMany({
          where: {
            archivedAt: null,
            OR: [
              { primaryCustomerId: { in: customerIds } },
              { customers: { some: { customerId: { in: customerIds } } } },
            ],
          },
          orderBy: { fullName: 'asc' },
          take: 8,
          select: {
            id: true,
            fullName: true,
            roleTitle: true,
            customers: {
              where: { customerId: { in: customerIds } },
              select: { roleAtCustomer: true },
              take: 1,
            },
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            customerId: { in: customerIds },
            status: { not: CrmRecordStatus.ARCHIVED },
            archivedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
          },
        }),
        this.prisma.location.findMany({
          where: {
            customerId: { in: customerIds },
            archivedAt: null,
            openJobs: { gt: 0 },
          },
          orderBy: { openJobs: 'desc' },
          take: 8,
          select: {
            id: true,
            code: true,
            name: true,
            openJobs: true,
          },
        }),
        this.prisma.location.findMany({
          where: {
            customerId: { in: customerIds },
            archivedAt: null,
          },
          orderBy: { name: 'asc' },
          take: 12,
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        }),
      ]);

    const technicians = contacts.map((c) => ({
      id: c.id,
      name: c.fullName,
      role:
        c.customers[0]?.roleAtCustomer ?? c.roleTitle ?? 'Technician',
    }));

    const statusWells = statusLocations.map((loc) => ({
      id: loc.id,
      label: loc.name || loc.code,
      status: this.statusBadge(loc.status),
    }));

    if (workOrderRows.length > 0) {
      return {
        data: {
          technicians,
          workOrders: workOrderRows.map((wo) => ({
            id: wo.id,
            workOrder: wo.title?.trim()
              ? `${wo.code} / ${wo.title}`
              : wo.code,
            priority: this.priorityFromStatus(wo.status),
            source: 'work_orders' as const,
          })),
          statusWells,
          source: 'work_orders' as const,
        },
      };
    }

    return {
      data: {
        technicians,
        workOrders: openLocations.map((loc) => ({
          id: loc.id,
          workOrder: `Location: ${loc.code} / ${loc.name}`,
          priority: this.priorityFromOpenJobs(loc.openJobs),
          source: 'location' as const,
        })),
        statusWells,
        source: 'locations_with_open_jobs' as const,
      },
    };
  }

  private priorityFromOpenJobs(openJobs: number): string {
    if (openJobs >= 5) return 'CRITICAL';
    if (openJobs >= 3) return 'HIGH';
    if (openJobs >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private priorityFromStatus(status: CrmRecordStatus): string {
    switch (status) {
      case CrmRecordStatus.IN_PROGRESS:
      case CrmRecordStatus.ON_HOLD:
        return 'HIGH';
      case CrmRecordStatus.OPEN:
      case CrmRecordStatus.PENDING:
        return 'MEDIUM';
      case CrmRecordStatus.DRAFT:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  private statusBadge(status: CrmRecordStatus): {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'offline' | 'neutral';
  } {
    switch (status) {
      case CrmRecordStatus.ACTIVE:
        return { label: 'Active', variant: 'success' };
      case CrmRecordStatus.DRAFT:
        return { label: 'Draft', variant: 'warning' };
      case CrmRecordStatus.EXPIRED:
        return { label: 'Expired', variant: 'error' };
      case CrmRecordStatus.INACTIVE:
        return { label: 'Inactive', variant: 'offline' };
      case CrmRecordStatus.ARCHIVED:
        return { label: 'Archived', variant: 'neutral' };
      default:
        return { label: String(status), variant: 'neutral' };
    }
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.customerRequirement.findUnique({
      where: { id },
    });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Requirement not found',
      });
    }
  }
}
