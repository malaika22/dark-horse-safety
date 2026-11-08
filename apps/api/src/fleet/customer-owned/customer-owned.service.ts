import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerOwnedStatus, Prisma } from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asciiSafe,
  buildDueLabel,
  cmpField,
  dateRangeWhere,
  DAY_MS,
  fmtShortDate,
  labelOf,
} from '../common/fleet.util';
import {
  BulkReviewDto,
  CustomerOwnedListQueryDto,
  SaveCustomerOwnedDto,
} from './dto/customer-owned.dto';

type CustomerExtra = {
  frequency?: string;
  formName?: string;
  notes?: string;
  photoUrl?: string;
  operationalStatus?: string;
};

function customerOwnedStatusTone(status: CustomerOwnedStatus) {
  if (status === 'OVERDUE') return 'danger';
  if (status === 'EXPIRING' || status === 'NEEDS_REVIEW') return 'warning';
  return 'success';
}

function customerOwnedPinScore(row: { status: CustomerOwnedStatus }) {
  if (row.status === 'OVERDUE') return 0;
  if (row.status === 'NEEDS_REVIEW') return 1;
  if (row.status === 'EXPIRING') return 2;
  return 99;
}

@Injectable()
export class CustomerOwnedService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed() {
    const count = await this.prisma.customerOwnedEquipment.count();
    if (count > 0) return;

    const [workOrders, customers] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          location: { select: { name: true, county: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, name: true },
      }),
    ]);

    const customerNames =
      customers.length > 0
        ? customers.map((c) => asciiSafe(c.name.toUpperCase()))
        : ['PIONEER NATURAL RESOURCES', 'EOG RESOURCES', 'DEVON ENERGY'];

    const now = new Date();
    const day = (offset: number) => new Date(now.getTime() + offset * DAY_MS);

    const coeDefs: Array<{
      description: string;
      status: CustomerOwnedStatus;
      type: string;
      model: string;
      serial: string;
      lastResult: string;
      lastOffset: number;
      nextOffset: number;
    }> = [
      {
        description: 'CUSTOMER OWNED 4-GAS MONITOR',
        status: 'CURRENT',
        type: 'GAS DETECTOR',
        model: 'MSA ALTAIR 4X',
        serial: 'COE-88201',
        lastResult: 'PASS',
        lastOffset: -45,
        nextOffset: 320,
      },
      {
        description: 'CUSTOMER OWNED TRIPOD',
        status: 'EXPIRING',
        type: 'RESCUE EQUIPMENT',
        model: 'DBI SALA TRIPOD',
        serial: 'COE-44102',
        lastResult: 'PASS WITH FINDINGS',
        lastOffset: -330,
        nextOffset: 12,
      },
      {
        description: 'CUSTOMER OWNED H2S MONITOR',
        status: 'OVERDUE',
        type: 'GAS DETECTOR',
        model: 'BW GAS ALERT MICRO',
        serial: 'COE-22901',
        lastResult: 'FAILED',
        lastOffset: -400,
        nextOffset: -18,
      },
      {
        description: 'CUSTOMER OWNED SCBA',
        status: 'NEEDS_REVIEW',
        type: 'BREATHING APPARATUS',
        model: 'MSA G1 SCBA',
        serial: 'COE-77831',
        lastResult: 'NOT DONE',
        lastOffset: -120,
        nextOffset: -5,
      },
      {
        description: 'CUSTOMER OWNED WINCH',
        status: 'CURRENT',
        type: 'RESCUE EQUIPMENT',
        model: 'DBI SALA WINCH',
        serial: 'COE-99201',
        lastResult: 'PASS',
        lastOffset: -20,
        nextOffset: 345,
      },
      {
        description: 'CUSTOMER OWNED FIRE BLANKET',
        status: 'EXPIRING',
        type: 'FIRE WATCH',
        model: 'FIRE BLANKET 6X8',
        serial: 'COE-11029',
        lastResult: 'PASS',
        lastOffset: -350,
        nextOffset: 8,
      },
    ];

    await this.prisma.customerOwnedEquipment.createMany({
      data: coeDefs.map((def, i) => {
        const customer = customers[i % Math.max(customers.length, 1)];
        const wo = workOrders[i % Math.max(workOrders.length, 1)];
        const site =
          wo?.location?.name ||
          wo?.location?.county ||
          `WELL SITE ${i + 1}`;
        return {
          code: `RIG-${String(i + 1).padStart(3, '0')}`,
          description: asciiSafe(def.description),
          customerId: customer?.id ?? null,
          customerName: customer
            ? asciiSafe(customer.name.toUpperCase())
            : customerNames[i % customerNames.length]!,
          wellSite: asciiSafe(String(site).toUpperCase()),
          county: wo?.location?.county
            ? asciiSafe(wo.location.county.toUpperCase())
            : 'MIDLAND',
          lastInspectionResult: def.lastResult,
          lastInspectionAt: day(def.lastOffset),
          nextDueAt: day(def.nextOffset),
          status: def.status,
          type: def.type,
          model: asciiSafe(def.model),
          serial: def.serial,
          customerOwned: true,
          reviewedAt: def.status === 'CURRENT' ? day(-2) : null,
          reviewedBy: def.status === 'CURRENT' ? 'FLEET ADMIN' : null,
        };
      }),
    });
  }

  private mapRow(row: {
    id: string;
    code: string;
    description: string;
    customerId: string | null;
    customerName: string;
    wellSite: string;
    county: string | null;
    lastInspectionResult: string | null;
    lastInspectionAt: Date | null;
    nextDueAt: Date | null;
    status: CustomerOwnedStatus;
    type: string | null;
    model: string | null;
    serial: string | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
  }, extra?: CustomerExtra) {
    const operational = extra?.operationalStatus || '';
    const statusLabel =
      operational === 'OUT OF SERVICE'
        ? 'OUT OF SERVICE'
        : row.status === 'CURRENT' && operational === 'ACTIVE'
          ? 'ACTIVE'
          : labelOf(row.status);
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      customerId: row.customerId,
      customerName: row.customerName,
      wellSite: row.wellSite,
      county: row.county,
      lastInspectionResult: row.lastInspectionResult,
      lastInspectionAt: row.lastInspectionAt,
      nextDueAt: row.nextDueAt,
      dateLabel: fmtShortDate(row.lastInspectionAt),
      dueLabel: buildDueLabel(row.nextDueAt),
      status: row.status,
      statusLabel,
      statusTone: operational === 'OUT OF SERVICE' ? 'danger' : customerOwnedStatusTone(row.status),
      type: row.type,
      model: row.model,
      serial: row.serial,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy,
      frequency: extra?.frequency ?? '',
      formName: extra?.formName ?? '',
      notes: extra?.notes ?? '',
      photoUrl: extra?.photoUrl ?? '',
      operationalStatus: operational,
    };
  }

  private async extraMap(ids: string[]) {
    const map = new Map<string, CustomerExtra>();
    try {
      await this.prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "FleetCustomerOwnedExtra" (
          "equipmentId" TEXT PRIMARY KEY,
          extra JSONB NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
      );
      if (!ids.length) return map;
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ equipmentId: string; extra: CustomerExtra }>
      >(`SELECT "equipmentId", extra FROM "FleetCustomerOwnedExtra"`);
      for (const row of rows) {
        if (ids.includes(row.equipmentId)) map.set(row.equipmentId, row.extra ?? {});
      }
    } catch {
      return map;
    }
    return map;
  }

  private async writeExtra(id: string, extra: CustomerExtra) {
    await this.extraMap([id]);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "FleetCustomerOwnedExtra" ("equipmentId", extra, "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT ("equipmentId") DO UPDATE SET extra = EXCLUDED.extra, "updatedAt" = NOW()`,
      id,
      JSON.stringify(extra),
    );
  }

  private statusFor(nextDue: Date | null, result: string | null): CustomerOwnedStatus {
    if (result && /FAIL/i.test(result)) return 'NEEDS_REVIEW';
    if (!nextDue) return 'CURRENT';
    const days = (nextDue.getTime() - Date.now()) / DAY_MS;
    if (days < 0) return 'OVERDUE';
    if (days <= 30) return 'EXPIRING';
    return 'CURRENT';
  }

  private async save(dto: SaveCustomerOwnedDto, existingId?: string) {
    const name = asciiSafe(dto.name.trim().toUpperCase());
    const customerName = asciiSafe(dto.customerName.trim().toUpperCase());
    if (!name || !customerName || !dto.type?.trim()) {
      throw new BadRequestException('Equipment name, type, and customer are required');
    }
    const nextDue = dto.nextDue ? new Date(dto.nextDue) : null;
    const lastInspected = dto.lastInspected ? new Date(dto.lastInspected) : null;
    const result = dto.lastResult ? asciiSafe(dto.lastResult.trim().toUpperCase()) : null;
    const data = {
      description: name,
      type: asciiSafe(dto.type.trim().toUpperCase()),
      customerName,
      customerId: dto.customerId || null,
      serial: dto.serial ? asciiSafe(dto.serial.trim().toUpperCase()) : null,
      wellSite: dto.location ? asciiSafe(dto.location.trim().toUpperCase()) : '',
      lastInspectionAt: lastInspected && !Number.isNaN(lastInspected.getTime()) ? lastInspected : null,
      lastInspectionResult: result,
      nextDueAt: nextDue && !Number.isNaN(nextDue.getTime()) ? nextDue : null,
      status: this.statusFor(
        nextDue && !Number.isNaN(nextDue.getTime()) ? nextDue : null,
        result,
      ),
      customerOwned: true,
    };
    const row = existingId
      ? await this.prisma.customerOwnedEquipment.update({ where: { id: existingId }, data })
      : await this.prisma.customerOwnedEquipment.create({
          data: {
            ...data,
            code: await this.nextCode(),
          },
        });
    const extra: CustomerExtra = {
      frequency: dto.frequency ? asciiSafe(dto.frequency.trim().toUpperCase()) : '',
      formName: dto.formName ? asciiSafe(dto.formName.trim().toUpperCase()) : '',
      notes: dto.notes ? asciiSafe(dto.notes.trim()) : '',
      photoUrl: dto.photoUrl?.trim() ?? '',
      operationalStatus:
        asciiSafe((dto.operationalStatus || 'ACTIVE').trim().toUpperCase()) === 'OUT OF SERVICE'
          ? 'OUT OF SERVICE'
          : 'ACTIVE',
    };
    await this.writeExtra(row.id, extra);
    return { data: this.mapRow(row, extra) };
  }

  private async nextCode() {
    const rows = await this.prisma.customerOwnedEquipment.findMany({ select: { code: true } });
    let max = 0;
    for (const row of rows) {
      const value = Number(row.code.replace(/\D/g, ''));
      if (Number.isFinite(value) && value > max) max = value;
    }
    return `COE-${String(max + 1).padStart(4, '0')}`;
  }

  async create(dto: SaveCustomerOwnedDto) {
    await this.ensureSeed();
    return this.save(dto);
  }

  async update(id: string, dto: SaveCustomerOwnedDto) {
    await this.ensureSeed();
    const row = await this.prisma.customerOwnedEquipment.findFirst({
      where: { archivedAt: null, OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }] },
    });
    if (!row) throw new NotFoundException('Customer-owned equipment not found');
    return this.save(dto, row.id);
  }

  async list(query: CustomerOwnedListQueryDto) {
    await this.ensureSeed();
    const { page, pageSize } = parsePage(query.page, query.pageSize);
    const dir = query.direction === 'asc' ? 'asc' : 'desc';
    const q = query.q?.trim();
    const dueRange = dateRangeWhere(query.from, query.to);
    const where: Prisma.CustomerOwnedEquipmentWhereInput = {
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.asset?.trim()
        ? {
            OR: [
              {
                description: {
                  contains: query.asset.trim(),
                  mode: 'insensitive',
                },
              },
              { model: { contains: query.asset.trim(), mode: 'insensitive' } },
              { serial: { contains: query.asset.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(dueRange ? { nextDueAt: dueRange } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { wellSite: { contains: q, mode: 'insensitive' } },
              { county: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.customerOwnedEquipment.findMany({ where });
    const extras = await this.extraMap(rows.map((row) => row.id));
    const sort = (query.sort ?? 'nextDueAt').toLowerCase();
    const mapped = rows.map((r) => this.mapRow(r, extras.get(r.id)));
    mapped.sort((a, b) => {
      const pin = customerOwnedPinScore(a) - customerOwnedPinScore(b);
      if (pin !== 0) return pin;
      if (sort === 'customer')
        return cmpField(a.customerName, b.customerName, dir);
      if (sort === 'asset') return cmpField(a.description, b.description, dir);
      if (sort === 'status') return cmpField(a.status, b.status, dir);
      if (sort === 'lastInspection')
        return cmpField(a.lastInspectionAt, b.lastInspectionAt, dir);
      return cmpField(a.nextDueAt, b.nextDueAt, dir);
    });

    const total = mapped.length;
    const skip = (page - 1) * pageSize;
    return { data: paginate(mapped.slice(skip, skip + pageSize), total, page, pageSize) };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.customerOwnedEquipment.findMany({
      where: { archivedAt: null },
    });
    const overdue = rows.filter((r) => r.status === 'OVERDUE').length;
    const expiring = rows.filter((r) => r.status === 'EXPIRING').length;
    const needsReview = rows.filter((r) => r.status === 'NEEDS_REVIEW').length;
    const customers = new Set(rows.map((r) => r.customerName)).size;

    return {
      data: {
        cells: [
          {
            title: 'Overdue Rigs',
            value: String(overdue),
            meta: 'CUSTOMER OWNED PAST DUE',
          },
          {
            title: 'Expiring Soon',
            value: String(expiring),
            meta: 'WITHIN 30 DAYS',
          },
          {
            title: 'Needs Review',
            value: String(needsReview),
            meta: 'MISSING OR FAILED INSPECTION',
          },
          {
            title: 'Customers',
            value: String(customers),
            meta: `${rows.length} REGISTERED ASSETS`,
          },
        ],
      },
    };
  }

  async bulkMarkReviewed(dto: BulkReviewDto) {
    await this.ensureSeed();
    if (!dto.ids?.length) throw new BadRequestException('ids required');
    const now = new Date();
    const reviewer = dto.reviewedBy?.trim()
      ? asciiSafe(dto.reviewedBy.trim().toUpperCase())
      : 'FLEET ADMIN';
    await this.prisma.customerOwnedEquipment.updateMany({
      where: { id: { in: dto.ids }, archivedAt: null },
      data: { status: 'CURRENT', reviewedAt: now, reviewedBy: reviewer },
    });
    const rows = await this.prisma.customerOwnedEquipment.findMany({
      where: { id: { in: dto.ids } },
    });
    const extras = await this.extraMap(rows.map((row) => row.id));
    return {
      data: {
        updated: rows.length,
        items: rows.map((r) => this.mapRow(r, extras.get(r.id))),
      },
    };
  }

  async getById(id: string) {
    await this.ensureSeed();
    const row = await this.prisma.customerOwnedEquipment.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Customer-owned equipment not found');
    const extras = await this.extraMap([row.id]);
    return { data: this.mapRow(row, extras.get(row.id)) };
  }
}
