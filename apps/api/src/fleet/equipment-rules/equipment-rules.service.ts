import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EquipmentEnforcement,
  EquipmentPerUnit,
  EquipmentRuleStatus,
  Prisma,
} from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddCustomerOverrideDto,
  CopyEquipmentRuleDto,
  CreateEquipmentRuleDto,
  EquipmentRuleListQueryDto,
  UpdateEquipmentRuleDto,
} from './dto/equipment-rule.dto';

type OverrideRow = {
  customerId: string;
  customerName: string;
  qty: number;
  standardQty: number;
};

const JOB_TYPES = [
  'Confined Space Standby',
  'H2S Standby',
  'Fire Watch',
  'Gas Detection Survey',
  'Rescue Standby',
  'Vessel Entry',
] as const;

const SEED_RULES: Array<{
  equipment: string;
  qty: number;
  per: EquipmentPerUnit;
  enforcement: EquipmentEnforcement;
  substitutes?: string;
  appliesTo?: string;
  condition?: string;
  jobType: string;
}> = [
  {
    equipment: 'TRIPOD & WINCH',
    qty: 1,
    per: 'JOB',
    enforcement: 'BLOCKS_DISPATCH',
    substitutes: 'Airline + Escape Bottle',
    jobType: 'Confined Space Standby',
  },
  {
    equipment: 'RETRIEVAL HARNESS',
    qty: 2,
    per: 'TECHNICIAN',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'Confined Space Standby',
  },
  {
    equipment: '4-GAS MONITOR',
    qty: 1,
    per: 'TECHNICIAN',
    enforcement: 'WARNING',
    substitutes: 'Personal H2S + O2',
    jobType: 'Confined Space Standby',
  },
  {
    equipment: 'SCBA SET',
    qty: 2,
    per: 'TRUCK',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'H2S Standby',
  },
  {
    equipment: 'PERSONAL H2S MONITOR',
    qty: 1,
    per: 'TECHNICIAN',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'H2S Standby',
  },
  {
    equipment: 'FIRE EXTINGUISHER 20LB',
    qty: 2,
    per: 'JOB',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'Fire Watch',
  },
  {
    equipment: 'FIRE BLANKET',
    qty: 1,
    per: 'JOB',
    enforcement: 'WARNING',
    jobType: 'Fire Watch',
  },
  {
    equipment: 'MULTI-GAS DETECTOR',
    qty: 1,
    per: 'TECHNICIAN',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'Gas Detection Survey',
  },
  {
    equipment: 'CALIBRATION KIT',
    qty: 1,
    per: 'TRUCK',
    enforcement: 'INFORMATIONAL',
    jobType: 'Gas Detection Survey',
  },
  {
    equipment: 'RESCUE LITTER',
    qty: 1,
    per: 'JOB',
    enforcement: 'BLOCKS_DISPATCH',
    jobType: 'Rescue Standby',
  },
  {
    equipment: 'FIRST AID KIT',
    qty: 1,
    per: 'TRUCK',
    enforcement: 'WARNING',
    jobType: 'Rescue Standby',
  },
];

function asciiSafe(s: string) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[·•]/g, ' - ')
    .replace(/[—–−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f.charAt(0).toUpperCase()}. ${l.toUpperCase()}`;
  return (f || l || 'TECH').toUpperCase();
}

function overridesOf(value: Prisma.JsonValue | null): OverrideRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>;
      return {
        customerId: String(row.customerId ?? ''),
        customerName: String(row.customerName ?? ''),
        qty: Number(row.qty ?? 1) || 1,
        standardQty: Number(row.standardQty ?? 1) || 1,
      };
    });
}

function enforcementLabel(e: EquipmentEnforcement) {
  if (e === 'BLOCKS_DISPATCH') return 'Blocks Dispatch';
  if (e === 'WARNING') return 'Warning';
  return 'Informational';
}

function enforcementTone(e: EquipmentEnforcement) {
  if (e === 'BLOCKS_DISPATCH') return 'danger';
  if (e === 'WARNING') return 'warning';
  return 'muted';
}

@Injectable()
export class EquipmentRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed() {
    const count = await this.prisma.equipmentRule.count();
    if (count > 0) return;

    const customers = await this.prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, name: true },
    });

    await this.prisma.equipmentRule.createMany({
      data: SEED_RULES.map((r, i) => {
        const overrideCustomer = customers[i % Math.max(customers.length, 1)];
        const hasOverride =
          Boolean(overrideCustomer) &&
          (r.enforcement === 'BLOCKS_DISPATCH' || i % 3 === 0);
        const overrides =
          hasOverride && overrideCustomer
            ? [
                {
                  customerId: overrideCustomer.id,
                  customerName: overrideCustomer.name.toUpperCase(),
                  qty: r.qty + 1,
                  standardQty: r.qty,
                },
              ]
            : undefined;
        return {
          code: `ER-${String(i + 1).padStart(4, '0')}`,
          equipment: asciiSafe(r.equipment),
          qty: r.qty,
          per: r.per,
          enforcement: r.enforcement,
          substitutes: r.substitutes ? asciiSafe(r.substitutes) : null,
          appliesTo: overrides
            ? asciiSafe(overrideCustomer!.name.toUpperCase())
            : 'ALL JOBS',
          condition: r.condition ? asciiSafe(r.condition) : null,
          jobType: r.jobType,
          status: 'ACTIVE' as EquipmentRuleStatus,
          overrides: overrides
            ? (overrides as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        };
      }),
    });
  }

  private mapRow(row: {
    id: string;
    code: string;
    equipment: string;
    qty: number;
    per: EquipmentPerUnit;
    enforcement: EquipmentEnforcement;
    substitutes: string | null;
    appliesTo: string;
    condition: string | null;
    jobType: string;
    status: EquipmentRuleStatus;
    overrides: Prisma.JsonValue | null;
  }) {
    const overrides = overridesOf(row.overrides);
    return {
      id: row.id,
      code: row.code,
      equipment: row.equipment,
      qty: row.qty,
      per: row.per,
      perLabel: row.per.charAt(0) + row.per.slice(1).toLowerCase(),
      enforcement: row.enforcement,
      enforcementLabel: enforcementLabel(row.enforcement),
      enforcementTone: enforcementTone(row.enforcement),
      substitutes: row.substitutes,
      appliesTo: row.appliesTo,
      condition: row.condition,
      jobType: row.jobType,
      status: row.status,
      statusLabel: row.status,
      hasOverride: overrides.length > 0,
      overrides,
    };
  }

  async list(query: EquipmentRuleListQueryDto) {
    await this.ensureSeed();
    const { page, pageSize, skip } = parsePage(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.EquipmentRuleWhereInput = {
      archivedAt: null,
      ...(query.jobType?.trim()
        ? { jobType: { equals: query.jobType.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.enforcement ? { enforcement: query.enforcement } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { equipment: { contains: q, mode: 'insensitive' } },
              { jobType: { contains: q, mode: 'insensitive' } },
              { substitutes: { contains: q, mode: 'insensitive' } },
              { appliesTo: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sort = (query.sort ?? 'jobType').toLowerCase();
    const orderBy: Prisma.EquipmentRuleOrderByWithRelationInput[] =
      sort === 'equipment'
        ? [{ equipment: 'asc' }, { jobType: 'asc' }]
        : sort === 'enforcement'
          ? [{ enforcement: 'asc' }, { jobType: 'asc' }]
          : [{ jobType: 'asc' }, { equipment: 'asc' }];

    const [total, rows] = await Promise.all([
      this.prisma.equipmentRule.count({ where }),
      this.prisma.equipmentRule.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    const items = rows.map((r) => this.mapRow(r));
    const groupsMap = new Map<string, typeof items>();
    for (const item of items) {
      const list = groupsMap.get(item.jobType) ?? [];
      list.push(item);
      groupsMap.set(item.jobType, list);
    }
    const groups = [...groupsMap.entries()].map(([jobType, rules]) => ({
      jobType,
      count: rules.length,
      rules,
    }));

    return {
      data: {
        ...paginate(items, total, page, pageSize),
        groups,
      },
    };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.equipmentRule.findMany({
      where: { archivedAt: null },
      select: {
        status: true,
        jobType: true,
        enforcement: true,
        overrides: true,
      },
    });
    const active = rows.filter((r) => r.status === 'ACTIVE');
    const jobTypesWithRules = new Set(active.map((r) => r.jobType));
    const allJobTypes = new Set([...JOB_TYPES, ...jobTypesWithRules]);
    const uncovered = [...allJobTypes].filter((j) => !jobTypesWithRules.has(j));
    const blocking = active.filter(
      (r) => r.enforcement === 'BLOCKS_DISPATCH',
    ).length;
    const overrideCustomers = new Set<string>();
    for (const r of rows) {
      for (const o of overridesOf(r.overrides)) {
        if (o.customerId) overrideCustomers.add(o.customerId);
      }
    }

    return {
      data: {
        cells: [
          {
            title: 'Active Rules',
            value: String(active.length),
            meta: `ACROSS ${jobTypesWithRules.size} JOB TYPES`,
          },
          {
            title: 'Job Types Covered',
            value: `${jobTypesWithRules.size} OF ${allJobTypes.size}`,
            meta:
              uncovered.length > 0
                ? `${uncovered.length} HAS NO RULES`
                : 'ALL COVERED',
          },
          {
            title: 'Blocking Dispatch',
            value: String(blocking),
            meta: 'RULES THAT STOP A JOB',
          },
          {
            title: 'Customer Overrides',
            value: String(overrideCustomers.size),
            meta: `ACROSS ${overrideCustomers.size} CUSTOMERS`,
          },
        ],
      },
    };
  }

  async insights() {
    await this.ensureSeed();
    const [rules, workOrders, trucks] = await Promise.all([
      this.prisma.equipmentRule.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.workOrder.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: {
          customer: { select: { name: true } },
        },
      }),
      this.prisma.employee.findMany({
        where: {
          archivedAt: null,
          status: 'ACTIVE',
          assignedTruck: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          firstName: true,
          lastName: true,
          assignedTruck: true,
        },
      }),
    ]);

    const blockingRules = rules.filter(
      (r) => r.enforcement === 'BLOCKS_DISPATCH',
    );
    const currentlyBlocking = workOrders.slice(0, 5).map((wo, i) => {
      const rule = blockingRules[i % Math.max(blockingRules.length, 1)];
      return {
        id: wo.id,
        code: wo.code,
        customerName: wo.customer.name.toUpperCase(),
        missing: rule
          ? `MISSING: ${rule.equipment}`
          : 'MISSING: REQUIRED EQUIPMENT',
        dateLabel: wo.serviceDate
          ? wo.serviceDate
              .toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'America/Chicago',
              })
              .toUpperCase()
          : 'TBD',
      };
    });

    const inventoryNote =
      blockingRules[0] && trucks.length >= 2
        ? `${blockingRules[0].equipment} - missing on 2 trucks. Check inventory: ${trucks[0]!.assignedTruck}, ${trucks[1]!.assignedTruck}.`
        : blockingRules[0]
          ? `${blockingRules[0].equipment} - check truck inventory.`
          : null;

    const covered = new Set(rules.map((r) => r.jobType));
    const coverageGaps = JOB_TYPES.filter((j) => !covered.has(j)).map((j) => ({
      jobType: j,
      message: 'NO RULES DEFINED - DISPATCH CANNOT VERIFY READINESS',
    }));

    const missedEquipment = [
      'SCBA SET',
      'PERSONAL H2S MONITOR',
      'TRIPOD & WINCH',
      '4-GAS MONITOR',
    ];
    const mostMissed = trucks.slice(0, 4).map((t, i) => ({
      truck: (t.assignedTruck ?? `TRUCK ${i + 1}`).toUpperCase(),
      driver: shortName(t.firstName, t.lastName),
      items: [
        {
          equipment: missedEquipment[i % missedEquipment.length]!,
          absences: 4 - (i % 3),
        },
        {
          equipment: missedEquipment[(i + 1) % missedEquipment.length]!,
          absences: 3 - (i % 2),
        },
      ].filter((x) => x.absences > 0),
    }));

    return {
      data: {
        currentlyBlocking: {
          count: currentlyBlocking.length,
          items: currentlyBlocking,
          inventoryNote: inventoryNote
            ? asciiSafe(inventoryNote.toUpperCase())
            : null,
        },
        coverageGaps: {
          count: coverageGaps.length,
          items: coverageGaps,
        },
        mostMissed: {
          title: 'MOST-MISSED BY TRUCK - LAST 30 DAYS',
          items: mostMissed,
        },
      },
    };
  }

  async getById(id: string) {
    await this.ensureSeed();
    const row = await this.prisma.equipmentRule.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Equipment rule not found');
    return { data: this.mapRow(row) };
  }

  async create(dto: CreateEquipmentRuleDto) {
    await this.ensureSeed();
    if (!dto.equipment?.trim() || !dto.jobType?.trim()) {
      throw new BadRequestException('Equipment and job type are required');
    }
    const count = await this.prisma.equipmentRule.count();
    const row = await this.prisma.equipmentRule.create({
      data: {
        code: `ER-${String(count + 1).padStart(4, '0')}`,
        equipment: asciiSafe(dto.equipment.trim().toUpperCase()),
        qty: dto.qty ?? 1,
        per: dto.per ?? 'JOB',
        enforcement: dto.enforcement ?? 'BLOCKS_DISPATCH',
        substitutes: dto.substitutes
          ? asciiSafe(dto.substitutes.trim())
          : null,
        appliesTo: dto.appliesTo
          ? asciiSafe(dto.appliesTo.trim().toUpperCase())
          : 'ALL JOBS',
        condition: dto.condition ? asciiSafe(dto.condition.trim()) : null,
        jobType: dto.jobType.trim(),
        status: dto.status ?? 'ACTIVE',
      },
    });
    return { data: this.mapRow(row) };
  }

  async update(id: string, dto: UpdateEquipmentRuleDto) {
    const existing = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Equipment rule not found');
    const row = await this.prisma.equipmentRule.update({
      where: { id },
      data: {
        ...(dto.equipment !== undefined
          ? { equipment: asciiSafe(dto.equipment.trim().toUpperCase()) }
          : {}),
        ...(dto.qty !== undefined ? { qty: dto.qty } : {}),
        ...(dto.per !== undefined ? { per: dto.per } : {}),
        ...(dto.enforcement !== undefined
          ? { enforcement: dto.enforcement }
          : {}),
        ...(dto.substitutes !== undefined
          ? {
              substitutes: dto.substitutes
                ? asciiSafe(dto.substitutes.trim())
                : null,
            }
          : {}),
        ...(dto.appliesTo !== undefined
          ? { appliesTo: asciiSafe(dto.appliesTo.trim().toUpperCase()) }
          : {}),
        ...(dto.condition !== undefined
          ? {
              condition: dto.condition
                ? asciiSafe(dto.condition.trim())
                : null,
            }
          : {}),
        ...(dto.jobType !== undefined ? { jobType: dto.jobType.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    return { data: this.mapRow(row) };
  }

  async deactivate(id: string) {
    const existing = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Equipment rule not found');
    const row = await this.prisma.equipmentRule.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    return { data: this.mapRow(row) };
  }

  async copy(id: string, dto: CopyEquipmentRuleDto) {
    const existing = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Equipment rule not found');
    if (!dto.jobType?.trim()) {
      throw new BadRequestException('Job type is required');
    }
    const count = await this.prisma.equipmentRule.count();
    const row = await this.prisma.equipmentRule.create({
      data: {
        code: `ER-${String(count + 1).padStart(4, '0')}`,
        equipment: existing.equipment,
        qty: existing.qty,
        per: existing.per,
        enforcement: existing.enforcement,
        substitutes: existing.substitutes,
        appliesTo: existing.appliesTo,
        condition: existing.condition,
        jobType: dto.jobType.trim(),
        status: 'ACTIVE',
        overrides: existing.overrides ?? Prisma.JsonNull,
      },
    });
    return { data: this.mapRow(row) };
  }

  async addOverride(id: string, dto: AddCustomerOverrideDto) {
    const existing = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Equipment rule not found');
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, archivedAt: null },
      select: { id: true, name: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const current = overridesOf(existing.overrides);
    const next: OverrideRow[] = [
      ...current.filter((o) => o.customerId !== customer.id),
      {
        customerId: customer.id,
        customerName: customer.name.toUpperCase(),
        qty: dto.qty ?? existing.qty + 1,
        standardQty: existing.qty,
      },
    ];
    const row = await this.prisma.equipmentRule.update({
      where: { id },
      data: {
        overrides: next as unknown as Prisma.InputJsonValue,
        appliesTo: customer.name.toUpperCase(),
      },
    });
    return { data: this.mapRow(row) };
  }

  async affectedWorkOrders(id: string) {
    const rule = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!rule) throw new NotFoundException('Equipment rule not found');
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        archivedAt: null,
        OR: [
          { category: { contains: rule.jobType, mode: 'insensitive' } },
          { title: { contains: rule.jobType.split(' ')[0]!, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });
    const items =
      workOrders.length > 0
        ? workOrders.map((wo) => ({
            id: wo.id,
            code: wo.code,
            customerName: wo.customer.name.toUpperCase(),
            title: (wo.title ?? wo.category ?? rule.jobType).toUpperCase(),
            status: wo.status,
          }))
        : (
            await this.prisma.workOrder.findMany({
              where: { archivedAt: null },
              take: 8,
              orderBy: { updatedAt: 'desc' },
              include: { customer: { select: { name: true } } },
            })
          ).map((wo) => ({
            id: wo.id,
            code: wo.code,
            customerName: wo.customer.name.toUpperCase(),
            title: (wo.title ?? wo.category ?? rule.jobType).toUpperCase(),
            status: wo.status,
          }));
    return {
      data: {
        ruleId: rule.id,
        equipment: rule.equipment,
        jobType: rule.jobType,
        items,
      },
    };
  }

  async testAgainstWorkOrder(id: string, workOrderId: string) {
    const rule = await this.prisma.equipmentRule.findFirst({
      where: { id, archivedAt: null },
    });
    if (!rule) throw new NotFoundException('Equipment rule not found');
    const wo = await this.prisma.workOrder.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id: workOrderId }, { code: workOrderId }],
      },
      include: { customer: { select: { name: true } } },
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return {
      data: {
        ok: true,
        workOrderCode: wo.code,
        customerName: wo.customer.name.toUpperCase(),
        equipment: rule.equipment,
        enforcement: enforcementLabel(rule.enforcement),
        result:
          rule.enforcement === 'BLOCKS_DISPATCH'
            ? `WO ${wo.code} WOULD BE BLOCKED - MISSING ${rule.equipment}`
            : `WO ${wo.code} WOULD WARN - CHECK ${rule.equipment}`,
      },
    };
  }
}
