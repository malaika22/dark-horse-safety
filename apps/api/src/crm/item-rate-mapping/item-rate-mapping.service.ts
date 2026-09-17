import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ItemRateMappingQueryDto,
  MapItemRateDto,
  UpdateItemRateAutoSyncDto,
  UpdateItemRateDhsDto,
} from './dto/item-rate-mapping.dto';

type RateStatus = 'MAPPED' | 'REVIEW' | 'UNMAPPED';

const NS_ITEM_RE = /^NS-ITM-[A-Z0-9-]+$/i;

function money(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function ratesEqual(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) < 0.005;
}

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  dhsRate: 'dhsRate',
  netsuiteRate: 'netsuiteRate',
  effectiveFrom: 'effectiveFrom',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
};

@Injectable()
export class ItemRateMappingService {
  constructor(private readonly prisma: PrismaService) {}

  private status(row: {
    netsuiteItemId: string | null;
    dhsRate: Prisma.Decimal | number;
    netsuiteRate: Prisma.Decimal | number | null;
  }): RateStatus {
    if (!row.netsuiteItemId?.trim()) return 'UNMAPPED';
    const dhs = money(row.dhsRate) ?? 0;
    const ns = money(row.netsuiteRate);
    if (ns == null || !ratesEqual(dhs, ns)) return 'REVIEW';
    return 'MAPPED';
  }

  private select() {
    return {
      id: true,
      code: true,
      name: true,
      dhsRate: true,
      netsuiteItemId: true,
      netsuiteRate: true,
      unit: true,
      duration: true,
      effectiveFrom: true,
      effectiveDetail: true,
      autoSync: true,
      owner: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    } as const;
  }

  private mapRow(
    row: {
      id: string;
      code: string;
      name: string;
      dhsRate: Prisma.Decimal;
      netsuiteItemId: string | null;
      netsuiteRate: Prisma.Decimal | null;
      unit: string | null;
      duration: string | null;
      effectiveFrom: Date | null;
      effectiveDetail: string | null;
      autoSync: boolean;
      owner: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
      } | null;
    },
  ) {
    const dhsRate = money(row.dhsRate) ?? 0;
    const netsuiteRate = money(row.netsuiteRate);
    const status = this.status(row);
    const variance =
      status === 'UNMAPPED' || netsuiteRate == null
        ? null
        : Number((netsuiteRate - dhsRate).toFixed(2));

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      dhsRate,
      netsuiteItemId: row.netsuiteItemId,
      netsuiteRate,
      unit: (row.unit || '').toUpperCase() || null,
      duration: (row.duration || '').toUpperCase() || null,
      effectiveFrom: row.effectiveFrom,
      effectiveDetail: (row.effectiveDetail || '').toUpperCase() || null,
      autoSync: row.autoSync,
      variance,
      status,
      owner: row.owner
        ? {
            id: row.owner.id,
            name:
              row.owner.role?.toUpperCase() === 'ADMIN'
                ? 'ADMIN'
                : `${(row.owner.firstName ?? '').charAt(0)}. ${(row.owner.lastName ?? '').trim()}`.toUpperCase().trim(),
          }
        : { id: '', name: 'ADMIN' },
    };
  }

  private where(query: ItemRateMappingQueryDto): Prisma.ItemRateMappingWhereInput {
    const and: Prisma.ItemRateMappingWhereInput[] = [{ archivedAt: null }];

    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { netsuiteItemId: containsCi(q) },
          { unit: containsCi(q) },
        ],
      });
    }

    if (query.autoSync === 'true') and.push({ autoSync: true });
    if (query.autoSync === 'false') and.push({ autoSync: false });

    const status = (query.status ?? '').trim().toUpperCase();
    if (status === 'UNMAPPED') {
      and.push({ OR: [{ netsuiteItemId: null }, { netsuiteItemId: '' }] });
    } else if (status === 'MAPPED') {
      and.push({ netsuiteItemId: { not: null } });
      and.push({ netsuiteRate: { not: null } });
      // Equal rates: handled post-filter for Decimal precision; approximate via raw later.
    } else if (status === 'REVIEW' || status === 'VARIANCE') {
      and.push({ netsuiteItemId: { not: null } });
    }

    const windows = (query.window ?? '')
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    if (windows.length > 0 && windows.length < 3) {
      const or: Prisma.ItemRateMappingWhereInput[] = [];
      if (windows.includes('ACTIVE')) or.push({ autoSync: true });
      if (windows.includes('CURRENT')) {
        or.push({
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveDetail: { not: null } }],
        });
      }
      if (windows.includes('FUTURE')) {
        or.push({
          OR: [
            { effectiveFrom: { gt: new Date() } },
            {
              effectiveDetail: {
                equals: 'TRAVELING',
                mode: 'insensitive',
              },
            },
          ],
        });
      }
      if (or.length) and.push({ OR: or });
    }

    return { AND: and };
  }

  async kpi() {
    const rows = await this.prisma.itemRateMapping.findMany({
      where: { archivedAt: null },
      select: {
        netsuiteItemId: true,
        dhsRate: true,
        netsuiteRate: true,
      },
    });

    let mapped = 0;
    let review = 0;
    let unmapped = 0;
    for (const row of rows) {
      const s = this.status(row);
      if (s === 'MAPPED') mapped += 1;
      else if (s === 'REVIEW') review += 1;
      else unmapped += 1;
    }

    return {
      data: {
        mapped,
        review,
        unmapped,
        variance: review,
        items: rows.length,
      },
    };
  }

  async list(query: ItemRateMappingQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const status = (query.status ?? '').trim().toUpperCase();

    // When filtering by mapped/review, load candidates then refine (Decimal compare).
    if (status === 'MAPPED' || status === 'REVIEW' || status === 'VARIANCE') {
      const all = await this.prisma.itemRateMapping.findMany({
        where,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          effectiveFrom: 'asc',
        }),
        select: this.select(),
      });
      const mappedRows = all
        .map((r) => this.mapRow(r))
        .filter((r) =>
          status === 'MAPPED' ? r.status === 'MAPPED' : r.status === 'REVIEW',
        );
      const total = mappedRows.length;
      const pageRows = mappedRows.slice(skip, skip + take);
      return { data: paginate(pageRows, total, page, pageSize) };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.itemRateMapping.count({ where }),
      this.prisma.itemRateMapping.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          effectiveFrom: 'asc',
        }),
        select: this.select(),
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => this.mapRow(r)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async mapItem(id: string, dto: MapItemRateDto) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');

    const netsuiteItemId = dto.netsuiteItemId.trim().toUpperCase();
    if (!NS_ITEM_RE.test(netsuiteItemId)) {
      throw new BadRequestException('NetSuite Item ID must match NS-ITM-##');
    }

    const clash = await this.prisma.itemRateMapping.findFirst({
      where: {
        archivedAt: null,
        netsuiteItemId: { equals: netsuiteItemId, mode: 'insensitive' },
        NOT: { id },
      },
      select: { code: true },
    });
    if (clash) {
      throw new BadRequestException(
        `NetSuite Item already mapped to ${clash.code}`,
      );
    }

    let netsuiteRate =
      dto.netsuiteRate != null ? Number(dto.netsuiteRate) : null;
    if (netsuiteRate == null) {
      const dir = await this.prisma.$queryRaw<{ rate: Prisma.Decimal | null }[]>`
        SELECT "rate" FROM "NetSuiteItemDirectory"
        WHERE UPPER("netsuiteItemId") = ${netsuiteItemId}
        LIMIT 1
      `;
      netsuiteRate = money(dir[0]?.rate) ?? Number(existing.dhsRate);
    }

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: {
        netsuiteItemId,
        netsuiteRate,
      },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async setAutoSync(id: string, dto: UpdateItemRateAutoSyncDto) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: { autoSync: Boolean(dto.autoSync) },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async setDhsRate(id: string, dto: UpdateItemRateDhsDto) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: { dhsRate: dto.dhsRate },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async unmap(id: string) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: {
        netsuiteItemId: null,
        netsuiteRate: null,
        effectiveDetail: null,
      },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async acceptNetSuiteRate(id: string) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');
    if (!existing.netsuiteItemId || existing.netsuiteRate == null) {
      throw new BadRequestException('Item has no NetSuite rate to accept');
    }

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: { dhsRate: existing.netsuiteRate },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async pushDhsRate(id: string) {
    const existing = await this.prisma.itemRateMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item rate not found');
    if (!existing.netsuiteItemId?.trim()) {
      throw new BadRequestException('Item is not mapped to NetSuite');
    }

    const netsuiteItemId = existing.netsuiteItemId.trim().toUpperCase();
    const dhsRate = Number(existing.dhsRate);
    const dirId = `nsitem_${netsuiteItemId.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await this.prisma.$executeRaw`
      INSERT INTO "NetSuiteItemDirectory" ("id", "netsuiteItemId", "name", "category", "rate", "createdAt", "updatedAt")
      VALUES (${dirId}, ${netsuiteItemId}, ${existing.name}, ${'SERVICE'}, ${dhsRate}, NOW(), NOW())
      ON CONFLICT ("netsuiteItemId") DO UPDATE SET
        "rate" = EXCLUDED."rate",
        "name" = EXCLUDED."name",
        "updatedAt" = NOW()
    `;

    const updated = await this.prisma.itemRateMapping.update({
      where: { id },
      data: { netsuiteRate: dhsRate },
      select: this.select(),
    });
    return { data: this.mapRow(updated) };
  }

  async syncNow(ids?: string[]) {
    const where: Prisma.ItemRateMappingWhereInput = {
      archivedAt: null,
      netsuiteItemId: { not: null },
      ...(ids?.length ? { id: { in: ids } } : { autoSync: true }),
    };
    const items = await this.prisma.itemRateMapping.findMany({
      where,
      select: {
        id: true,
        name: true,
        netsuiteItemId: true,
        dhsRate: true,
      },
    });

    let synced = 0;
    let failed = 0;
    for (const item of items) {
      const netsuiteItemId = (item.netsuiteItemId ?? '').trim().toUpperCase();
      if (!NS_ITEM_RE.test(netsuiteItemId)) {
        failed += 1;
        continue;
      }

      const dir = await this.prisma.$queryRaw<
        { rate: Prisma.Decimal | null; name: string }[]
      >`
        SELECT "rate", "name" FROM "NetSuiteItemDirectory"
        WHERE UPPER("netsuiteItemId") = ${netsuiteItemId}
        LIMIT 1
      `;

      if (!dir.length) {
        failed += 1;
        continue;
      }

      const nsRate = money(dir[0]?.rate) ?? Number(item.dhsRate);
      await this.prisma.itemRateMapping.update({
        where: { id: item.id },
        data: { netsuiteRate: nsRate },
      });
      synced += 1;
    }

    return {
      data: {
        attempted: items.length,
        synced,
        failed,
        syncedAt: new Date(),
      },
    };
  }

  async autoMatchByName() {
    const [unmatched, directory, used] = await Promise.all([
      this.prisma.itemRateMapping.findMany({
        where: {
          archivedAt: null,
          OR: [{ netsuiteItemId: null }, { netsuiteItemId: '' }],
        },
        select: { id: true, name: true, dhsRate: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.$queryRaw<
        { netsuiteItemId: string; name: string; rate: Prisma.Decimal | null }[]
      >`SELECT "netsuiteItemId", "name", "rate" FROM "NetSuiteItemDirectory"`,
      this.prisma.itemRateMapping.findMany({
        where: { archivedAt: null, netsuiteItemId: { not: null } },
        select: { netsuiteItemId: true },
      }),
    ]);

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const taken = new Set(
      used
        .map((r) => (r.netsuiteItemId ?? '').trim().toUpperCase())
        .filter(Boolean),
    );

    const byName = new Map<
      string,
      { netsuiteItemId: string; rate: number | null }[]
    >();
    for (const entry of directory) {
      const key = normalize(entry.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push({
        netsuiteItemId: entry.netsuiteItemId.toUpperCase(),
        rate: money(entry.rate),
      });
      byName.set(key, list);
    }

    let matched = 0;
    for (const item of unmatched) {
      const options = (byName.get(normalize(item.name)) ?? []).filter(
        (o) => !taken.has(o.netsuiteItemId),
      );
      if (options.length !== 1) continue;
      const pick = options[0]!;
      await this.prisma.itemRateMapping.update({
        where: { id: item.id },
        data: {
          netsuiteItemId: pick.netsuiteItemId,
          netsuiteRate: pick.rate ?? Number(item.dhsRate),
        },
      });
      taken.add(pick.netsuiteItemId);
      matched += 1;
    }

    return {
      data: { matched, remaining: unmatched.length - matched },
    };
  }
}
