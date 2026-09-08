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
  enforcementLevel: 'enforcementLevel',
};

const EXPIRING_WINDOW_DAYS = 30;

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
          { customer: { name: containsCi(q) } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private listOrderBy(
    sort?: string,
    direction?: 'asc' | 'desc',
  ): Prisma.CustomerRequirementOrderByWithRelationInput {
    const dir = direction === 'asc' ? 'asc' : 'desc';
    if (sort === 'customer') return { customer: { name: dir } };
    if (sort === 'techniciansAffected') {
      return { customer: { contacts: { _count: dir } } };
    }
    return orderByFrom(sort, direction, SORT_MAP, {
      createdAt: 'desc',
    }) as Prisma.CustomerRequirementOrderByWithRelationInput;
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
        orderBy: this.listOrderBy(query.sort, query.direction),
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
    const now = new Date();
    const inWindow = new Date();
    inWindow.setDate(inWindow.getDate() + EXPIRING_WINDOW_DAYS);

    const base = { archivedAt: null } as const;

    const [total, needsReview, expiring, missingDocs] = await Promise.all([
      this.prisma.customerRequirement.count({ where: base }),
      this.prisma.customerRequirement.count({
        where: { ...base, status: CrmRecordStatus.NEEDS_REVIEW },
      }),
      this.prisma.customerRequirement.count({
        where: {
          ...base,
          OR: [
            { status: CrmRecordStatus.EXPIRED },
            { dueDate: { gte: now, lte: inWindow } },
          ],
        },
      }),
      this.prisma.customerRequirement.count({
        where: {
          ...base,
          OR: [{ docsRequired: true }, { evidenceRequired: true }],
          status: { not: CrmRecordStatus.COMPLETE },
        },
      }),
    ]);
    return { data: { total, needsReview, expiring, missingDocs } };
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
      select: {
        id: true,
        name: true,
        customerId: true,
        status: true,
        docsRequired: true,
        evidenceRequired: true,
        dueDate: true,
        enforcementLevel: true,
      },
    });
    if (!req) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Requirement not found',
      });
    }

    const summary = await this.buildAffectedForCustomers(
      [req.customerId],
      [{
        id: req.id,
        name: req.name,
        customerId: req.customerId,
        status: req.status,
        docsRequired: req.docsRequired,
        evidenceRequired: req.evidenceRequired,
        dueDate: req.dueDate,
        enforcementLevel: req.enforcementLevel,
      }],
    );

    return { data: summary };
  }

  async affectedSummary() {
    const requirements = await this.prisma.customerRequirement.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        customerId: true,
        status: true,
        docsRequired: true,
        evidenceRequired: true,
        dueDate: true,
        enforcementLevel: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    const customerIds = Array.from(
      new Set(requirements.map((r) => r.customerId)),
    );

    if (customerIds.length === 0) {
      return {
        data: {
          technicians: [],
          workOrders: [],
          requirementStatus: [],
          enforcementItems: [],
          blockedTechnicians: [],
          blockedActions: [],
          statusWells: [],
          source: 'empty' as const,
        },
      };
    }

    const summary = await this.buildAffectedForCustomers(
      customerIds,
      requirements,
    );
    return { data: summary };
  }

  private async buildAffectedForCustomers(
    customerIds: string[],
    requirements: Array<{
      id: string;
      name: string;
      customerId: string;
      status: CrmRecordStatus;
      docsRequired: boolean;
      evidenceRequired: boolean;
      dueDate: Date | null;
      enforcementLevel: EnforcementLevel;
    }>,
  ) {
    const unmetByCustomer = new Map<string, string[]>();
    for (const req of requirements) {
      if (this.isRequirementMet(req)) continue;
      const list = unmetByCustomer.get(req.customerId) ?? [];
      list.push(req.name);
      unmetByCustomer.set(req.customerId, list);
    }

    const [contacts, workOrderRows, locationRows] = await Promise.all([
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
          primaryCustomerId: true,
          customers: {
            where: { customerId: { in: customerIds } },
            select: { customerId: true, roleAtCustomer: true },
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
          serviceDate: true,
          createdAt: true,
          customerId: true,
          customer: { select: { name: true } },
          assignedRep: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.location.findMany({
        where: {
          customerId: { in: customerIds },
          archivedAt: null,
        },
        orderBy: { name: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          wellPadNumber: true,
          status: true,
          customerId: true,
        },
      }),
    ]);

    const technicians = contacts.map((c) => {
      const customerId =
        c.customers[0]?.customerId ?? c.primaryCustomerId ?? customerIds[0];
      const unmet = unmetByCustomer.get(customerId ?? '') ?? [];
      const met = unmet.length === 0;
      return {
        id: c.id,
        name: this.shortContactName(c.fullName),
        role:
          c.customers[0]?.roleAtCustomer ?? c.roleTitle ?? 'Field Tech',
        status: met
          ? { label: 'MET', variant: 'success' as const }
          : { label: 'NOT MET', variant: 'error' as const },
        fails: unmet[0] ?? null,
      };
    });

    const workOrders = workOrderRows.map((wo) => {
      const blockedNames = unmetByCustomer.get(wo.customerId) ?? [];
      const blockedBy = blockedNames[0] ?? null;
      const date = wo.serviceDate ?? wo.createdAt;
      const tech = wo.assignedRep
        ? this.shortUserLabel(wo.assignedRep)
        : 'UNASSIGNED';
      return {
        id: wo.id,
        workOrder: `${wo.code} - ${wo.customer?.name ?? 'Customer'}`,
        subtitle: `${this.formatWidgetDate(date)} · TECH: ${tech}`,
        blockedBy,
        priority: this.priorityFromStatus(wo.status),
        source: 'work_orders' as const,
      };
    });

    const requirementStatus = this.requirementStatusBreakdown(requirements);

    const enforcementItems = requirements.slice(0, 8).map((r) => ({
      id: r.id,
      label: r.name,
      enforcement: this.enforcementBadge(r.enforcementLevel),
    }));

    const blockedTechnicians = technicians
      .filter((t) => t.status.label === 'NOT MET')
      .map((t) => ({
        id: t.id,
        name: t.name,
        fails: t.fails ? `FAILS: ${t.fails}` : 'FAILS: REQUIREMENT',
      }));

    const hasHard = requirements.some(
      (r) =>
        !this.isRequirementMet(r) &&
        r.enforcementLevel === EnforcementLevel.HARD_GATE,
    );
    const hasSoft = requirements.some(
      (r) =>
        !this.isRequirementMet(r) &&
        r.enforcementLevel !== EnforcementLevel.HARD_GATE,
    );

    const blockedActions = [
      ...(hasHard
        ? [
            {
              id: 'dispatch',
              label: 'Dispatch to this Customer',
              level: this.enforcementBadge(EnforcementLevel.HARD_GATE),
            },
            {
              id: 'quote',
              label: 'Quote',
              level: this.enforcementBadge(EnforcementLevel.HARD_GATE),
            },
          ]
        : []),
      ...(hasSoft
        ? [
            {
              id: 'invoice',
              label: 'Invoice',
              level: this.enforcementBadge(EnforcementLevel.SOFT_GATE),
            },
            {
              id: 'payroll',
              label: 'Payroll',
              level: this.enforcementBadge(EnforcementLevel.SOFT_GATE),
            },
          ]
        : []),
    ];

    const statusWells = locationRows.map((loc) => {
      const unmet = unmetByCustomer.get(loc.customerId) ?? [];
      const blocked = unmet.length > 0;
      return {
        id: loc.id,
        label: loc.wellPadNumber?.trim() || loc.name,
        status: blocked
          ? { label: 'BLOCKED', variant: 'error' as const }
          : {
              label: String(loc.status).replace(/_/g, ' '),
              variant:
                loc.status === CrmRecordStatus.ACTIVE
                  ? ('success' as const)
                  : loc.status === CrmRecordStatus.NEEDS_REVIEW
                    ? ('warning' as const)
                    : ('neutral' as const),
            },
      };
    });

    return {
      technicians,
      workOrders,
      requirementStatus,
      enforcementItems,
      blockedTechnicians,
      blockedActions,
      statusWells,
      source: 'work_orders' as const,
    };
  }

  private isRequirementMet(r: {
    status: CrmRecordStatus;
    docsRequired: boolean;
    evidenceRequired: boolean;
    dueDate: Date | null;
  }): boolean {
    const display = this.requirementDisplayKind(r);
    return display === 'MET';
  }

  private requirementDisplayKind(r: {
    status: CrmRecordStatus;
    docsRequired: boolean;
    evidenceRequired: boolean;
    dueDate: Date | null;
  }): 'MET' | 'NOT_MET' | 'MISSING' | 'EXPIRING' | 'NEEDS_REVIEW' {
    const s = r.status;
    const now = new Date();
    const inWindow = new Date();
    inWindow.setDate(inWindow.getDate() + EXPIRING_WINDOW_DAYS);
    const docsNeeded = r.docsRequired || r.evidenceRequired;

    if (
      s === CrmRecordStatus.EXPIRED ||
      (r.dueDate != null && r.dueDate >= now && r.dueDate <= inWindow)
    ) {
      return 'EXPIRING';
    }
    if (docsNeeded && s !== CrmRecordStatus.COMPLETE) {
      return 'MISSING';
    }
    if (s === CrmRecordStatus.NEEDS_REVIEW) {
      return 'NEEDS_REVIEW';
    }
    if (s === CrmRecordStatus.COMPLETE || s === CrmRecordStatus.ACTIVE) {
      return 'MET';
    }
    return 'NOT_MET';
  }

  private requirementStatusBreakdown(
    requirements: Array<{
      status: CrmRecordStatus;
      docsRequired: boolean;
      evidenceRequired: boolean;
      dueDate: Date | null;
    }>,
  ) {
    const counts = {
      MET: 0,
      NEEDS_REVIEW: 0,
      EXPIRING: 0,
      MISSING: 0,
      NOT_MET: 0,
    };
    for (const r of requirements) {
      const kind = this.requirementDisplayKind(r);
      if (kind === 'NOT_MET') counts.NEEDS_REVIEW += 1;
      else if (kind === 'NEEDS_REVIEW') counts.NEEDS_REVIEW += 1;
      else counts[kind] += 1;
    }
    return [
      { id: 'met', label: 'Met', count: counts.MET, variant: 'success' as const },
      {
        id: 'needsReview',
        label: 'Needs Review',
        count: counts.NEEDS_REVIEW,
        variant: 'warning' as const,
      },
      {
        id: 'expiring',
        label: 'Expiring',
        count: counts.EXPIRING,
        variant: 'warning' as const,
      },
      {
        id: 'missing',
        label: 'Missing',
        count: counts.MISSING,
        variant: 'error' as const,
      },
    ];
  }

  private enforcementBadge(level: EnforcementLevel): {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'offline' | 'neutral';
  } {
    switch (level) {
      case EnforcementLevel.HARD_GATE:
        return { label: 'HARD GATE', variant: 'error' };
      case EnforcementLevel.SOFT_GATE:
        return { label: 'WARNING', variant: 'warning' };
      case EnforcementLevel.ADVISORY:
      default:
        return { label: 'INFORMATIONAL', variant: 'neutral' };
    }
  }

  private shortContactName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`.toUpperCase();
    }
    return fullName.toUpperCase();
  }

  private shortUserLabel(user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  }): string {
    const first = user.firstName?.trim();
    const last = user.lastName?.trim();
    if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
    return (first || last || user.email || 'UNASSIGNED').toUpperCase();
  }

  private formatWidgetDate(value: Date): string {
    return value
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
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
