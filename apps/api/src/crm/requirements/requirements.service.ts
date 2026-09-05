import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, EnforcementLevel, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
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

  async exportCsv(query: RequirementListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.CustomerRequirementWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.customerRequirement.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'code', header: 'Code', value: (r) => r.code },
      { key: 'name', header: 'Name', value: (r) => r.name },
      {
        key: 'requirementType',
        header: 'Type',
        value: (r) => r.requirementType,
      },
      {
        key: 'enforcementLevel',
        header: 'Enforcement',
        value: (r) => r.enforcementLevel,
      },
      { key: 'status', header: 'Status', value: (r) => r.status },
    ]);
    return { data: { csv, filename: 'requirements.csv' } };
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
