import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
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
  CreatePricingRuleDto,
  PricingRuleListQueryDto,
  UpdatePricingRuleDto,
} from './dto/pricing-rule.dto';

const SORT_MAP: Record<string, string> = {
  serviceItem: 'serviceItem',
  code: 'code',
  rate: 'rate',
  createdAt: 'createdAt',
  status: 'status',
  effectiveFrom: 'effectiveFrom',
};

function userShortLabel(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
) {
  if (!user) return '—';
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  return (first || last || user.email || '—').toUpperCase();
}

function isoDay(value?: Date | null) {
  if (!value) return '—';
  return value.toISOString().slice(0, 10);
}

function cycleLabel(value?: Date | null) {
  if (!value) return '—';
  const year = value.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const day = Math.floor((value.getTime() - start) / 86_400_000) + 1;
  const week = Math.max(1, Math.ceil(day / 7));
  return `Effective Cycle ${year}-${String(week).padStart(2, '0')}`;
}

@Injectable()
export class PricingRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: PricingRuleListQueryDto): Prisma.PricingRuleWhereInput {
    const and: Prisma.PricingRuleWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.serviceItem)
      and.push({ serviceItem: containsCi(query.serviceItem) });
    if (query.rateType) and.push({ rateType: containsCi(query.rateType) });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.effectiveFrom || query.effectiveTo) {
      const range: Prisma.DateTimeFilter = {};
      if (query.effectiveFrom) range.gte = new Date(query.effectiveFrom);
      if (query.effectiveTo) range.lte = new Date(query.effectiveTo);
      and.push({ effectiveFrom: range });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { serviceItem: containsCi(q) },
          { code: containsCi(q) },
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
  ): Prisma.PricingRuleOrderByWithRelationInput {
    const dir = direction === 'asc' ? 'asc' : 'desc';
    if (sort === 'customer') return { customer: { name: dir } };
    return orderByFrom(sort, direction, SORT_MAP, {
      createdAt: 'desc',
    }) as Prisma.PricingRuleOrderByWithRelationInput;
  }

  async list(query: PricingRuleListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.pricingRule.count({ where }),
      this.prisma.pricingRule.findMany({
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
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    const [active, pricedGroups, customerTotal, expiring] = await Promise.all([
      this.prisma.pricingRule.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.pricingRule.groupBy({
        by: ['customerId'],
        where: { archivedAt: null },
      }),
      this.prisma.customer.count({ where: { archivedAt: null } }),
      this.prisma.pricingRule.count({
        where: {
          archivedAt: null,
          effectiveTo: { gte: now, lte: in30 },
        },
      }),
    ]);

    const customersPriced = pricedGroups.length;
    const missing = Math.max(0, customerTotal - customersPriced);

    return {
      data: {
        active,
        customersPriced,
        missing,
        expiring,
      },
    };
  }

  async getById(id: string) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Pricing rule not found',
      });
    }
    return { data: rule };
  }

  async create(dto: CreatePricingRuleDto) {
    const code = await this.codes.next('pricingRule');
    const rule = await this.prisma.pricingRule.create({
      data: {
        code,
        customerId: dto.customerId,
        serviceItem: dto.serviceItem,
        rateType: dto.rateType,
        rate: dto.rate,
        unit: dto.unit,
        minimumCharge: dto.minimumCharge,
        overtimeMultiplier: dto.overtimeMultiplier,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        notes: dto.notes,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        ownerId: dto.ownerId,
      },
    });
    return { data: rule };
  }

  async update(id: string, dto: UpdatePricingRuleDto) {
    await this.ensureExists(id);
    const rule = await this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.serviceItem !== undefined
          ? { serviceItem: dto.serviceItem }
          : {}),
        ...(dto.rateType !== undefined ? { rateType: dto.rateType } : {}),
        ...(dto.rate !== undefined ? { rate: dto.rate } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.minimumCharge !== undefined
          ? { minimumCharge: dto.minimumCharge }
          : {}),
        ...(dto.overtimeMultiplier !== undefined
          ? { overtimeMultiplier: dto.overtimeMultiplier }
          : {}),
        ...(dto.effectiveFrom !== undefined
          ? {
              effectiveFrom: dto.effectiveFrom
                ? new Date(dto.effectiveFrom)
                : null,
            }
          : {}),
        ...(dto.effectiveTo !== undefined
          ? {
              effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
            }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      },
    });
    return { data: rule };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const rule = await this.prisma.pricingRule.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: rule };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.pricingRule.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async duplicate(id: string, customerId?: string) {
    const existing = await this.prisma.pricingRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Pricing rule not found',
      });
    }
    const code = await this.codes.next('pricingRule');
    const copy = await this.prisma.pricingRule.create({
      data: {
        code,
        customerId: customerId ?? existing.customerId,
        serviceItem: existing.serviceItem,
        rateType: existing.rateType,
        rate: existing.rate,
        unit: existing.unit,
        minimumCharge: existing.minimumCharge,
        overtimeMultiplier: existing.overtimeMultiplier,
        effectiveFrom: existing.effectiveFrom,
        effectiveTo: existing.effectiveTo,
        notes: existing.notes,
        status: CrmRecordStatus.DRAFT,
        ownerId: existing.ownerId,
      },
    });
    return { data: copy };
  }

  async exportCsv(
    query: PricingRuleListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.PricingRuleWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.pricingRule.findMany({
      where,
      orderBy: { serviceItem: 'asc' },
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
        key: 'serviceItem',
        header: 'Service/Item',
        value: (r: Row) => r.serviceItem,
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      { key: 'rate', header: 'Rate', value: (r: Row) => Number(r.rate) },
      { key: 'rateType', header: 'Rate Type', value: (r: Row) => r.rateType },
      { key: 'unit', header: 'Unit', value: (r: Row) => r.unit },
      {
        key: 'effectiveFrom',
        header: 'Effective From',
        value: (r: Row) => isoDate(r.effectiveFrom),
      },
      {
        key: 'effectiveTo',
        header: 'Effective To',
        value: (r: Row) => isoDate(r.effectiveTo),
      },
      {
        key: 'owner',
        header: 'Owner',
        value: (r: Row) => userLabel(r.owner),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Pricing Rules',
      'pricing-rules',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  async sidePanels() {
    const money = (value: Prisma.Decimal | number | null | undefined) => {
      if (value == null) return '—';
      const n = Number(value);
      if (Number.isNaN(n)) return '—';
      return `$${n.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      })}`;
    };

    const ownerSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    } as const;

    const [recentRules, scheduledRules] = await Promise.all([
      this.prisma.pricingRule.findMany({
        where: { archivedAt: null },
        include: {
          customer: { select: { id: true, name: true } },
          owner: { select: ownerSelect },
        },
        orderBy: { updatedAt: 'desc' },
        take: 40,
      }),
      this.prisma.pricingRule.findMany({
        where: {
          archivedAt: null,
          OR: [
            { effectiveFrom: { gt: new Date() } },
            {
              AND: [
                { effectiveFrom: { not: null } },
                { status: CrmRecordStatus.PENDING },
              ],
            },
            {
              AND: [
                { effectiveFrom: { not: null } },
                { effectiveTo: { not: null } },
              ],
            },
          ],
        },
        include: {
          customer: { select: { id: true, name: true } },
          owner: { select: ownerSelect },
        },
        orderBy: [{ effectiveFrom: 'asc' }, { updatedAt: 'desc' }],
        take: 20,
      }),
    ]);

    const changed = recentRules.filter(
      (r) => r.updatedAt.getTime() !== r.createdAt.getTime(),
    );
    const historySource =
      changed.length > 0 ? changed : recentRules.slice(0, 8);

    const rateChanges = historySource.slice(0, 12).map((r) => ({
      id: r.id,
      label: `${r.customer.name} · ${r.serviceItem}`,
      from: '—',
      to: money(r.rate),
      cycle: cycleLabel(r.effectiveFrom ?? r.updatedAt),
      changedBy: userShortLabel(r.owner),
      date: isoDay(r.updatedAt),
      reason: r.notes?.trim() || 'Current rate',
    }));

    const scheduleChanges = scheduledRules.slice(0, 12).map((r) => ({
      id: r.id,
      customer: `${r.customer.name} · ${r.serviceItem}`,
      from: undefined,
      to: money(r.rate),
      cycle: cycleLabel(r.effectiveFrom),
      scheduledBy: userShortLabel(r.owner),
      effective: isoDay(r.effectiveFrom),
    }));

    const gateRules = await this.prisma.formRule.findMany({
      where: { archivedAt: null, hardGate: true },
      include: { customer: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    });

    const permissionGates = gateRules.map((g) => ({
      id: g.id,
      customer: `${g.customer.name} · ${g.formTemplate}`,
      status: g.blocksToggle ? 'BLOCKS PAYROLL' : 'HARD GATE',
    }));

    return {
      data: {
        rateChanges,
        scheduleChanges,
        permissionGates,
      },
    };
  }

  async history(id: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Pricing rule not found',
      });
    }
    const events: { id: string; at: string; label: string; detail: string }[] =
      [
        {
          id: `${id}-created`,
          at: rule.createdAt.toISOString(),
          label: 'Created',
          detail: `Rule ${rule.code} created for ${rule.serviceItem}`,
        },
        {
          id: `${id}-status`,
          at: rule.updatedAt.toISOString(),
          label: 'Status',
          detail: rule.status,
        },
        {
          id: `${id}-rate`,
          at: rule.updatedAt.toISOString(),
          label: 'Rate',
          detail: `${Number(rule.rate)}${rule.unit ? ` / ${rule.unit}` : ''}${rule.rateType ? ` (${rule.rateType})` : ''}`,
        },
      ];
    if (rule.effectiveFrom) {
      events.push({
        id: `${id}-effective-from`,
        at: rule.effectiveFrom.toISOString(),
        label: 'Effective From',
        detail: rule.effectiveFrom.toISOString().slice(0, 10),
      });
    }
    if (rule.effectiveTo) {
      events.push({
        id: `${id}-effective-to`,
        at: rule.effectiveTo.toISOString(),
        label: 'Effective To',
        detail: rule.effectiveTo.toISOString().slice(0, 10),
      });
    }
    if (rule.updatedAt.getTime() !== rule.createdAt.getTime()) {
      events.push({
        id: `${id}-updated`,
        at: rule.updatedAt.toISOString(),
        label: 'Updated',
        detail: `Last modified ${rule.updatedAt.toISOString()}`,
      });
    }
    events.sort((a, b) => b.at.localeCompare(a.at));
    return { data: { events } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Pricing rule not found',
      });
    }
  }
}
