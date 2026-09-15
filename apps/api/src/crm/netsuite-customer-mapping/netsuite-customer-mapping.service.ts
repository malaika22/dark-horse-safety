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
  MapNetSuiteCustomerDto,
  NetSuiteCustomerMappingQueryDto,
  UpdateNetSuiteAutoExportDto,
} from './dto/netsuite-customer-mapping.dto';

type MappingStatus = 'MAPPED' | 'PENDING' | 'UNMATCHED' | 'FAILED';

const NS_ID_RE = /^NS-\d{7}$/i;

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  customerType: 'customerType',
  lastSync: 'netsuiteLastSyncAt',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(llc|inc|incorporated|ltd|limited|co|company|corp|corporation|lp|llp|plc|partners|holdings|services)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class NetSuiteCustomerMappingService {
  constructor(private readonly prisma: PrismaService) {}

  private mappingStatus(row: {
    netsuiteId: string | null;
    netsuiteLastSyncAt: Date | null;
    netsuiteLastResult: string | null;
  }): MappingStatus {
    if ((row.netsuiteLastResult ?? '').toUpperCase() === 'FAILED') {
      return 'FAILED';
    }
    if (!row.netsuiteId?.trim()) return 'UNMATCHED';
    if (!row.netsuiteLastSyncAt) return 'PENDING';
    return 'MAPPED';
  }

  private shortOwner(
    first?: string | null,
    last?: string | null,
  ): string | null {
    const f = (first ?? '').trim();
    const l = (last ?? '').trim();
    if (f && l) return `${f.charAt(0)}. ${l}`.toUpperCase();
    return (l || f || null)?.toUpperCase() ?? null;
  }

  private customerSelect() {
    return {
      id: true,
      code: true,
      name: true,
      customerType: true,
      netsuiteId: true,
      netsuiteLastSyncAt: true,
      netsuiteLastResult: true,
      netsuiteSyncError: true,
      netsuiteAutoExport: true,
      assignedRep: {
        select: { id: true, firstName: true, lastName: true },
      },
    } as const;
  }

  private where(query: NetSuiteCustomerMappingQueryDto): Prisma.CustomerWhereInput {
    const and: Prisma.CustomerWhereInput[] = [{ archivedAt: null }];
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { netsuiteId: containsCi(q) },
        ],
      });
    }
    if (query.customerType?.trim()) {
      and.push({ customerType: query.customerType.trim() });
    }
    if (query.lastResult?.trim()) {
      and.push({
        netsuiteLastResult: query.lastResult.trim().toUpperCase(),
      });
    }
    if (query.autoExport === 'true') {
      and.push({ netsuiteAutoExport: true });
    } else if (query.autoExport === 'false') {
      and.push({ netsuiteAutoExport: false });
    }

    const status = (query.status ?? '').trim().toUpperCase();
    if (status === 'UNMATCHED') {
      and.push({
        OR: [{ netsuiteId: null }, { netsuiteId: '' }],
      });
      and.push({
        NOT: { netsuiteLastResult: 'FAILED' },
      });
    } else if (status === 'FAILED') {
      and.push({ netsuiteLastResult: 'FAILED' });
    } else if (status === 'PENDING') {
      and.push({
        netsuiteId: { not: null },
        netsuiteLastSyncAt: null,
        NOT: { netsuiteLastResult: 'FAILED' },
      });
    } else if (status === 'MAPPED') {
      and.push({
        netsuiteId: { not: null },
        netsuiteLastSyncAt: { not: null },
        NOT: { netsuiteLastResult: 'FAILED' },
      });
    }

    return { AND: and };
  }

  private mapRow(row: {
    id: string;
    code: string;
    name: string;
    customerType: string | null;
    netsuiteId: string | null;
    netsuiteLastSyncAt: Date | null;
    netsuiteLastResult: string | null;
    netsuiteSyncError: string | null;
    netsuiteAutoExport: boolean;
    assignedRep: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      customerType: (row.customerType ?? 'CUSTOMER').toUpperCase(),
      netsuiteId: row.netsuiteId,
      status: this.mappingStatus(row),
      lastSyncAt: row.netsuiteLastSyncAt,
      lastResult: row.netsuiteLastResult,
      syncError: row.netsuiteSyncError,
      autoExport: row.netsuiteAutoExport,
      owner: row.assignedRep
        ? {
            id: row.assignedRep.id,
            name: this.shortOwner(
              row.assignedRep.firstName,
              row.assignedRep.lastName,
            ),
          }
        : null,
    };
  }

  private async assertNetSuiteIdAvailable(netsuiteId: string, excludeId?: string) {
    const clash = await this.prisma.customer.findFirst({
      where: {
        archivedAt: null,
        netsuiteId: { equals: netsuiteId, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, code: true },
    });
    if (clash) {
      throw new BadRequestException(
        `NetSuite ID already mapped to ${clash.code}`,
      );
    }
  }

  private async nextNetSuiteId(): Promise<string> {
    const fromCustomers = await this.prisma.customer.findMany({
      where: { netsuiteId: { startsWith: 'NS-' } },
      select: { netsuiteId: true },
    });
    const fromDirectory = await this.prisma.$queryRaw<
      { netsuiteId: string }[]
    >`SELECT "netsuiteId" FROM "NetSuiteCustomerDirectory"`;

    let max = 0;
    for (const row of [...fromCustomers, ...fromDirectory]) {
      const n = Number(String(row.netsuiteId ?? '').replace(/^NS-/i, ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
    const next = max > 0 ? max + 1 : 1_000_000;
    return `NS-${String(next).padStart(7, '0')}`;
  }

  private async ensureDirectoryEntry(input: {
    netsuiteId: string;
    name: string;
    legalName?: string | null;
    customerType?: string | null;
  }) {
    const netsuiteId = input.netsuiteId.toUpperCase();
    const name = input.name;
    const legalName = input.legalName ?? null;
    const customerType = (input.customerType ?? 'CUSTOMER').toUpperCase();
    const id = `nsdir_${netsuiteId.toLowerCase()}`;
    await this.prisma.$executeRaw`
      INSERT INTO "NetSuiteCustomerDirectory" ("id", "netsuiteId", "name", "legalName", "customerType", "createdAt", "updatedAt")
      VALUES (${id}, ${netsuiteId}, ${name}, ${legalName}, ${customerType}, NOW(), NOW())
      ON CONFLICT ("netsuiteId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "legalName" = EXCLUDED."legalName",
        "customerType" = EXCLUDED."customerType",
        "updatedAt" = NOW()
    `;
  }

  async kpi() {
    const base = { archivedAt: null } as const;
    const [mapped, pending, unmatched, errors, lastSync] =
      await this.prisma.$transaction([
        this.prisma.customer.count({
          where: {
            ...base,
            netsuiteId: { not: null },
            netsuiteLastSyncAt: { not: null },
            NOT: { netsuiteLastResult: 'FAILED' },
          },
        }),
        this.prisma.customer.count({
          where: {
            ...base,
            netsuiteId: { not: null },
            netsuiteLastSyncAt: null,
            NOT: { netsuiteLastResult: 'FAILED' },
          },
        }),
        this.prisma.customer.count({
          where: {
            ...base,
            OR: [{ netsuiteId: null }, { netsuiteId: '' }],
            NOT: { netsuiteLastResult: 'FAILED' },
          },
        }),
        this.prisma.customer.count({
          where: { ...base, netsuiteLastResult: 'FAILED' },
        }),
        this.prisma.customer.findFirst({
          where: { ...base, netsuiteLastSyncAt: { not: null } },
          orderBy: { netsuiteLastSyncAt: 'desc' },
          select: { netsuiteLastSyncAt: true },
        }),
      ]);

    return {
      data: {
        mapped,
        pending,
        unmatched,
        errors,
        lastSyncAt: lastSync?.netsuiteLastSyncAt ?? null,
      },
    };
  }

  async list(query: NetSuiteCustomerMappingQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          netsuiteLastSyncAt: 'asc',
        }),
        select: this.customerSelect(),
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

  async mapCustomer(id: string, dto: MapNetSuiteCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const netsuiteId = dto.netsuiteId.trim().toUpperCase();
    if (!NS_ID_RE.test(netsuiteId)) {
      throw new BadRequestException('NetSuite ID must match NS-#######');
    }
    await this.assertNetSuiteIdAvailable(netsuiteId, id);
    await this.ensureDirectoryEntry({
      netsuiteId,
      name: existing.name,
      legalName: existing.legalEntityName,
      customerType: existing.customerType,
    });

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        netsuiteId,
        netsuiteLastSyncAt: null,
        netsuiteLastResult: null,
        netsuiteSyncError: null,
      },
      select: this.customerSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async setAutoExport(id: string, dto: UpdateNetSuiteAutoExportDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { netsuiteAutoExport: Boolean(dto.autoExport) },
      select: this.customerSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async createInNetSuite(id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');
    if (existing.netsuiteId?.trim()) {
      throw new BadRequestException('Customer is already mapped to NetSuite');
    }

    const netsuiteId = await this.nextNetSuiteId();
    await this.ensureDirectoryEntry({
      netsuiteId,
      name: existing.name,
      legalName: existing.legalEntityName,
      customerType: existing.customerType,
    });

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        netsuiteId,
        netsuiteLastSyncAt: null,
        netsuiteLastResult: null,
        netsuiteSyncError: null,
        netsuiteAutoExport: true,
      },
      select: this.customerSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async unmap(id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        netsuiteId: null,
        netsuiteLastSyncAt: null,
        netsuiteLastResult: null,
        netsuiteSyncError: null,
      },
      select: this.customerSelect(),
    });
    return { data: this.mapRow(updated) };
  }

  async syncNow(ids?: string[]) {
    const where: Prisma.CustomerWhereInput = {
      archivedAt: null,
      netsuiteId: { not: null },
      ...(ids?.length ? { id: { in: ids } } : { netsuiteAutoExport: true }),
    };
    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        netsuiteId: true,
        legalEntityName: true,
        customerType: true,
      },
    });

    const now = new Date();
    let synced = 0;
    let failed = 0;

    for (const c of customers) {
      const netsuiteId = (c.netsuiteId ?? '').trim().toUpperCase();
      const valid = NS_ID_RE.test(netsuiteId);

      if (!valid) {
        await this.prisma.customer.update({
          where: { id: c.id },
          data: {
            netsuiteLastSyncAt: now,
            netsuiteLastResult: 'FAILED',
            netsuiteSyncError: `ST-${c.code.replace(/\D/g, '').slice(-5).padStart(5, '0')} - Invalid NetSuite ID format (expected NS-#######)`,
          },
        });
        failed += 1;
        continue;
      }

      const known = await this.prisma.$queryRaw<{ netsuiteId: string }[]>`
        SELECT "netsuiteId" FROM "NetSuiteCustomerDirectory"
        WHERE UPPER("netsuiteId") = ${netsuiteId}
        LIMIT 1
      `;
      if (!known.length) {
        await this.prisma.customer.update({
          where: { id: c.id },
          data: {
            netsuiteLastSyncAt: now,
            netsuiteLastResult: 'FAILED',
            netsuiteSyncError: `ST-${c.code.replace(/\D/g, '').slice(-5).padStart(5, '0')} - NetSuite ID not found in directory`,
          },
        });
        failed += 1;
        continue;
      }

      await this.ensureDirectoryEntry({
        netsuiteId,
        name: c.name,
        legalName: c.legalEntityName,
        customerType: c.customerType,
      });

      await this.prisma.customer.update({
        where: { id: c.id },
        data: {
          netsuiteId,
          netsuiteLastSyncAt: now,
          netsuiteLastResult: 'SUCCESS',
          netsuiteSyncError: null,
        },
      });
      synced += 1;
    }

    return {
      data: {
        attempted: customers.length,
        synced,
        failed,
        lastSyncAt: now,
      },
    };
  }

  async autoMatchByName() {
    const [unmatched, directory, usedIds] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          archivedAt: null,
          OR: [{ netsuiteId: null }, { netsuiteId: '' }],
        },
        select: {
          id: true,
          name: true,
          legalEntityName: true,
          customerType: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.$queryRaw<
        { netsuiteId: string; name: string; legalName: string | null }[]
      >`SELECT "netsuiteId", "name", "legalName" FROM "NetSuiteCustomerDirectory"`,
      this.prisma.customer.findMany({
        where: {
          archivedAt: null,
          netsuiteId: { not: null },
        },
        select: { netsuiteId: true },
      }),
    ]);

    const taken = new Set(
      usedIds
        .map((r) => (r.netsuiteId ?? '').trim().toUpperCase())
        .filter(Boolean),
    );

    const byName = new Map<string, { netsuiteId: string; name: string }[]>();
    for (const entry of directory) {
      const key = normalizeName(entry.name);
      const legalKey = entry.legalName ? normalizeName(entry.legalName) : '';
      const item = {
        netsuiteId: entry.netsuiteId.toUpperCase(),
        name: entry.name,
      };
      if (key) {
        const list = byName.get(key) ?? [];
        list.push(item);
        byName.set(key, list);
      }
      if (legalKey && legalKey !== key) {
        const list = byName.get(legalKey) ?? [];
        list.push(item);
        byName.set(legalKey, list);
      }
    }

    let matched = 0;
    for (const c of unmatched) {
      const keys = [
        normalizeName(c.name),
        c.legalEntityName ? normalizeName(c.legalEntityName) : '',
      ].filter(Boolean);

      let candidate: { netsuiteId: string; name: string } | undefined;
      for (const key of keys) {
        const options = (byName.get(key) ?? []).filter(
          (o) => !taken.has(o.netsuiteId),
        );
        if (options.length === 1) {
          candidate = options[0];
          break;
        }
      }
      if (!candidate) continue;

      await this.prisma.customer.update({
        where: { id: c.id },
        data: {
          netsuiteId: candidate.netsuiteId,
          netsuiteLastSyncAt: null,
          netsuiteLastResult: null,
          netsuiteSyncError: null,
        },
      });
      taken.add(candidate.netsuiteId);
      matched += 1;
    }

    return {
      data: {
        matched,
        remaining: unmatched.length - matched,
      },
    };
  }
}
