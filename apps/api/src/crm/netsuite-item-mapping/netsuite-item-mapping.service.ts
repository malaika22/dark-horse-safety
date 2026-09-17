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
  MapNetSuiteItemDto,
  NetSuiteItemMappingQueryDto,
  UpdateNetSuiteItemAutoSyncDto,
} from './dto/netsuite-item-mapping.dto';

type MatchStatus = 'MATCHED' | 'PENDING' | 'UNMATCHED' | 'FAILED';
type SyncStatus = 'SYNCED' | 'PENDING' | 'UNMATCHED' | 'FAILED';

const NS_ITEM_RE = /^NS-ITM-[A-Z0-9-]+$/i;

function notFailedResult(): Prisma.NetSuiteItemMappingWhereInput {
  return {
    OR: [{ lastResult: null }, { lastResult: { not: 'FAILED' } }],
  };
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  category: 'category',
  lastSync: 'lastSyncAt',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
};

@Injectable()
export class NetSuiteItemMappingService {
  constructor(private readonly prisma: PrismaService) {}

  private matchStatus(row: {
    netsuiteItemId: string | null;
    lastSyncAt: Date | null;
    lastResult: string | null;
  }): MatchStatus {
    if ((row.lastResult ?? '').toUpperCase() === 'FAILED') return 'FAILED';
    if (!row.netsuiteItemId?.trim()) return 'UNMATCHED';
    if (!row.lastSyncAt) return 'PENDING';
    return 'MATCHED';
  }

  private syncStatus(row: {
    netsuiteItemId: string | null;
    lastSyncAt: Date | null;
    lastResult: string | null;
  }): SyncStatus {
    const m = this.matchStatus(row);
    if (m === 'MATCHED') return 'SYNCED';
    if (m === 'FAILED') return 'FAILED';
    if (m === 'PENDING') return 'PENDING';
    return 'UNMATCHED';
  }

  private itemSelect() {
    return {
      id: true,
      code: true,
      name: true,
      category: true,
      netsuiteItemId: true,
      direction: true,
      directionDetail: true,
      health: true,
      autoSync: true,
      lastSyncAt: true,
      lastResult: true,
      syncError: true,
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
      category: string;
      netsuiteItemId: string | null;
      direction: string;
      directionDetail: string | null;
      health: string | null;
      autoSync: boolean;
      lastSyncAt: Date | null;
      lastResult: string | null;
      syncError: string | null;
      owner: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
      } | null;
    },
  ) {
    const match = this.matchStatus(row);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: (row.category || 'SERVICE').toUpperCase(),
      netsuiteItemId: row.netsuiteItemId,
      match,
      direction: (row.direction || 'OUTBOUND').toUpperCase(),
      directionDetail: (row.directionDetail || '').toUpperCase() || null,
      health: row.health ? row.health.toUpperCase() : null,
      autoSync: row.autoSync,
      status: this.syncStatus(row),
      lastSyncAt: row.lastSyncAt,
      lastResult: row.lastResult,
      syncError: row.syncError,
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

  private where(query: NetSuiteItemMappingQueryDto): Prisma.NetSuiteItemMappingWhereInput {
    const and: Prisma.NetSuiteItemMappingWhereInput[] = [{ archivedAt: null }];
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { netsuiteItemId: containsCi(q) },
          { category: containsCi(q) },
        ],
      });
    }
    if (query.category?.trim()) {
      and.push({ category: query.category.trim().toUpperCase() });
    }
    if (query.health?.trim()) {
      and.push({ health: query.health.trim().toUpperCase() });
    }
    if (query.autoSync === 'true') and.push({ autoSync: true });
    if (query.autoSync === 'false') and.push({ autoSync: false });

    const status = (query.status ?? '').trim().toUpperCase();
    if (status === 'UNMATCHED') {
      and.push({ OR: [{ netsuiteItemId: null }, { netsuiteItemId: '' }] });
      and.push(notFailedResult());
    } else if (status === 'FAILED') {
      and.push({ lastResult: 'FAILED' });
    } else if (status === 'PENDING') {
      and.push({ netsuiteItemId: { not: null }, lastSyncAt: null });
      and.push(notFailedResult());
    } else if (status === 'MATCHED' || status === 'MAPPED' || status === 'SYNCED') {
      and.push({
        netsuiteItemId: { not: null },
        lastSyncAt: { not: null },
      });
      and.push(notFailedResult());
    }

    const windows = (query.window ?? '')
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    if (windows.length > 0 && windows.length < 3) {
      const or: Prisma.NetSuiteItemMappingWhereInput[] = [];
      if (windows.includes('ACTIVE')) or.push({ autoSync: true });
      if (windows.includes('CURRENT')) {
        or.push({
          lastSyncAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
      }
      if (windows.includes('FUTURE')) {
        or.push({
          OR: [
            { lastSyncAt: null },
            {
              directionDetail: {
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
    const base = { archivedAt: null } as const;
    const [mapped, pending, unmatched, errors, lastSync] =
      await this.prisma.$transaction([
        this.prisma.netSuiteItemMapping.count({
          where: {
            AND: [
              base,
              { netsuiteItemId: { not: null } },
              { lastSyncAt: { not: null } },
              notFailedResult(),
            ],
          },
        }),
        this.prisma.netSuiteItemMapping.count({
          where: {
            AND: [
              base,
              { netsuiteItemId: { not: null } },
              { lastSyncAt: null },
              notFailedResult(),
            ],
          },
        }),
        this.prisma.netSuiteItemMapping.count({
          where: {
            AND: [
              base,
              { OR: [{ netsuiteItemId: null }, { netsuiteItemId: '' }] },
              notFailedResult(),
            ],
          },
        }),
        this.prisma.netSuiteItemMapping.count({
          where: { ...base, lastResult: 'FAILED' },
        }),
        this.prisma.netSuiteItemMapping.findFirst({
          where: { ...base, lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true },
        }),
      ]);

    return {
      data: {
        mapped,
        pending,
        unmatched,
        errors,
        lastSyncAt: lastSync?.lastSyncAt ?? null,
      },
    };
  }

  async list(query: NetSuiteItemMappingQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.netSuiteItemMapping.count({ where }),
      this.prisma.netSuiteItemMapping.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          lastSyncAt: 'asc',
        }),
        select: this.itemSelect(),
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

  private async ensureDirectory(input: {
    netsuiteItemId: string;
    name: string;
    category?: string | null;
  }) {
    const netsuiteItemId = input.netsuiteItemId.toUpperCase();
    const id = `nsitem_${netsuiteItemId.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await this.prisma.$executeRaw`
      INSERT INTO "NetSuiteItemDirectory" ("id", "netsuiteItemId", "name", "category", "createdAt", "updatedAt")
      VALUES (${id}, ${netsuiteItemId}, ${input.name}, ${(input.category ?? 'SERVICE').toUpperCase()}, NOW(), NOW())
      ON CONFLICT ("netsuiteItemId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "category" = EXCLUDED."category",
        "updatedAt" = NOW()
    `;
  }

  async mapItem(id: string, dto: MapNetSuiteItemDto) {
    const existing = await this.prisma.netSuiteItemMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    const netsuiteItemId = dto.netsuiteItemId.trim().toUpperCase();
    if (!NS_ITEM_RE.test(netsuiteItemId)) {
      throw new BadRequestException('NetSuite Item ID must match NS-ITM-##');
    }

    const clash = await this.prisma.netSuiteItemMapping.findFirst({
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

    await this.ensureDirectory({
      netsuiteItemId,
      name: existing.name,
      category: existing.category,
    });

    const updated = await this.prisma.netSuiteItemMapping.update({
      where: { id },
      data: {
        netsuiteItemId,
        lastSyncAt: null,
        lastResult: null,
        syncError: null,
        health: existing.health ?? 'HEALTHY',
      },
      select: this.itemSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async setAutoSync(id: string, dto: UpdateNetSuiteItemAutoSyncDto) {
    const existing = await this.prisma.netSuiteItemMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    const updated = await this.prisma.netSuiteItemMapping.update({
      where: { id },
      data: { autoSync: Boolean(dto.autoSync) },
      select: this.itemSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async unmap(id: string) {
    const existing = await this.prisma.netSuiteItemMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    const updated = await this.prisma.netSuiteItemMapping.update({
      where: { id },
      data: {
        netsuiteItemId: null,
        lastSyncAt: null,
        lastResult: null,
        syncError: null,
        health: null,
        directionDetail: null,
      },
      select: this.itemSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  private async nextItemId(): Promise<string> {
    const rows = await this.prisma.netSuiteItemMapping.findMany({
      where: { netsuiteItemId: { startsWith: 'NS-ITM-' } },
      select: { netsuiteItemId: true },
    });
    const dir = await this.prisma.$queryRaw<{ netsuiteItemId: string }[]>`
      SELECT "netsuiteItemId" FROM "NetSuiteItemDirectory"
    `;
    let max = 0;
    for (const row of [...rows, ...dir]) {
      const n = Number(
        String(row.netsuiteItemId ?? '')
          .replace(/^NS-ITM-/i, '')
          .replace(/\D/g, ''),
      );
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `NS-ITM-${String(max + 1).padStart(2, '0')}`;
  }

  async createInNetSuite(id: string) {
    const existing = await this.prisma.netSuiteItemMapping.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');
    if (existing.netsuiteItemId?.trim()) {
      throw new BadRequestException('Item is already mapped to NetSuite');
    }

    const netsuiteItemId = await this.nextItemId();
    await this.ensureDirectory({
      netsuiteItemId,
      name: existing.name,
      category: existing.category,
    });

    const updated = await this.prisma.netSuiteItemMapping.update({
      where: { id },
      data: {
        netsuiteItemId,
        lastSyncAt: null,
        lastResult: null,
        syncError: null,
        autoSync: true,
        health: 'HEALTHY',
        direction: existing.direction || 'OUTBOUND',
      },
      select: this.itemSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async syncNow(ids?: string[]) {
    const where: Prisma.NetSuiteItemMappingWhereInput = {
      archivedAt: null,
      netsuiteItemId: { not: null },
      ...(ids?.length ? { id: { in: ids } } : { autoSync: true }),
    };
    const items = await this.prisma.netSuiteItemMapping.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        netsuiteItemId: true,
      },
    });

    const now = new Date();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      const netsuiteItemId = (item.netsuiteItemId ?? '').trim().toUpperCase();
      if (!NS_ITEM_RE.test(netsuiteItemId)) {
        await this.prisma.netSuiteItemMapping.update({
          where: { id: item.id },
          data: {
            lastSyncAt: now,
            lastResult: 'FAILED',
            syncError: `ST-${item.code.replace(/\D/g, '').slice(-5).padStart(5, '0')} - Invalid NetSuite Item ID`,
            health: 'DEGRADED',
          },
        });
        failed += 1;
        continue;
      }

      const known = await this.prisma.$queryRaw<{ netsuiteItemId: string }[]>`
        SELECT "netsuiteItemId" FROM "NetSuiteItemDirectory"
        WHERE UPPER("netsuiteItemId") = ${netsuiteItemId}
        LIMIT 1
      `;
      if (!known.length) {
        await this.prisma.netSuiteItemMapping.update({
          where: { id: item.id },
          data: {
            lastSyncAt: now,
            lastResult: 'FAILED',
            syncError: `ST-${item.code.replace(/\D/g, '').slice(-5).padStart(5, '0')} - NetSuite Item not found in directory`,
            health: 'DEGRADED',
          },
        });
        failed += 1;
        continue;
      }

      await this.ensureDirectory({
        netsuiteItemId,
        name: item.name,
        category: item.category,
      });

      // Keep PricingRule.netsuiteItem in sync for live lookups.
      await this.prisma.pricingRule.updateMany({
        where: {
          archivedAt: null,
          serviceItem: { equals: item.name, mode: 'insensitive' },
        },
        data: { netsuiteItem: netsuiteItemId },
      });

      await this.prisma.netSuiteItemMapping.update({
        where: { id: item.id },
        data: {
          netsuiteItemId,
          lastSyncAt: now,
          lastResult: 'SUCCESS',
          syncError: null,
          health: 'HEALTHY',
          directionDetail:
            item.category.toUpperCase() === 'SERVICE' ? 'ON SITE' : 'COMPLETED',
        },
      });
      synced += 1;
    }

    return {
      data: {
        attempted: items.length,
        synced,
        failed,
        lastSyncAt: now,
      },
    };
  }

  async autoMatchByName() {
    const [unmatched, directory, used] = await Promise.all([
      this.prisma.netSuiteItemMapping.findMany({
        where: {
          archivedAt: null,
          OR: [{ netsuiteItemId: null }, { netsuiteItemId: '' }],
        },
        select: { id: true, name: true, category: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.$queryRaw<
        { netsuiteItemId: string; name: string; category: string }[]
      >`SELECT "netsuiteItemId", "name", "category" FROM "NetSuiteItemDirectory"`,
      this.prisma.netSuiteItemMapping.findMany({
        where: { archivedAt: null, netsuiteItemId: { not: null } },
        select: { netsuiteItemId: true },
      }),
    ]);

    const taken = new Set(
      used
        .map((r) => (r.netsuiteItemId ?? '').trim().toUpperCase())
        .filter(Boolean),
    );

    const byName = new Map<string, { netsuiteItemId: string }[]>();
    for (const entry of directory) {
      const key = normalizeName(entry.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push({ netsuiteItemId: entry.netsuiteItemId.toUpperCase() });
      byName.set(key, list);
    }

    let matched = 0;
    for (const item of unmatched) {
      const options = (byName.get(normalizeName(item.name)) ?? []).filter(
        (o) => !taken.has(o.netsuiteItemId),
      );
      if (options.length !== 1) continue;
      const pick = options[0]!;
      await this.prisma.netSuiteItemMapping.update({
        where: { id: item.id },
        data: {
          netsuiteItemId: pick.netsuiteItemId,
          lastSyncAt: null,
          lastResult: null,
          syncError: null,
          health: 'HEALTHY',
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
