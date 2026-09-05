import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
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
  CreateRouteRuleDto,
  RouteRuleListQueryDto,
  UpdateRouteRuleDto,
} from './dto/route-rule.dto';

const SORT_MAP: Record<string, string> = {
  routeLabel: 'routeLabel',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
};

@Injectable()
export class RouteRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: RouteRuleListQueryDto): Prisma.RouteRuleWhereInput {
    const and: Prisma.RouteRuleWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.locationId) and.push({ locationId: query.locationId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.gpsRequired !== undefined)
      and.push({ gpsRequired: query.gpsRequired });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { routeLabel: containsCi(q) },
          { code: containsCi(q) },
          { routeFrom: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: RouteRuleListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.routeRule.count({ where }),
      this.prisma.routeRule.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          location: {
            select: {
              id: true,
              name: true,
              code: true,
              latitude: true,
              longitude: true,
            },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, gpsRequired] = await Promise.all([
      this.prisma.routeRule.count({ where: { archivedAt: null } }),
      this.prisma.routeRule.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.routeRule.count({ where: { archivedAt: { not: null } } }),
      this.prisma.routeRule.count({
        where: { archivedAt: null, gpsRequired: true },
      }),
    ]);
    return { data: { total, active, archived, gpsRequired } };
  }

  async mapPins() {
    const rules = await this.prisma.routeRule.findMany({
      where: {
        archivedAt: null,
        location: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      select: {
        id: true,
        routeLabel: true,
        status: true,
        customerId: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: 5000,
    });
    return {
      data: rules.map((r) => ({
        id: r.id,
        name: r.routeLabel ?? r.location?.name ?? r.id,
        latitude: r.location?.latitude ?? null,
        longitude: r.location?.longitude ?? null,
        status: r.status,
        customerId: r.customerId,
        locationId: r.locationId,
      })),
    };
  }

  async getById(id: string) {
    const rule = await this.prisma.routeRule.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        location: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route rule not found',
      });
    }
    return { data: rule };
  }

  async create(dto: CreateRouteRuleDto) {
    const code = await this.codes.next('routeRule');
    const rule = await this.prisma.routeRule.create({
      data: {
        code,
        customerId: dto.customerId,
        locationId: dto.locationId,
        geofenceRadius: dto.geofenceRadius,
        gpsRequired: dto.gpsRequired ?? false,
        clockInWindow: dto.clockInWindow,
        routeFrom: dto.routeFrom,
        expectedTravelTime: dto.expectedTravelTime,
        mileageRateOverride: dto.mileageRateOverride,
        routeLabel: dto.routeLabel,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        ownerId: dto.ownerId,
      },
    });
    return { data: rule };
  }

  async update(id: string, dto: UpdateRouteRuleDto) {
    await this.ensureExists(id);
    const rule = await this.prisma.routeRule.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.locationId !== undefined
          ? { locationId: dto.locationId }
          : {}),
        ...(dto.geofenceRadius !== undefined
          ? { geofenceRadius: dto.geofenceRadius }
          : {}),
        ...(dto.gpsRequired !== undefined
          ? { gpsRequired: dto.gpsRequired }
          : {}),
        ...(dto.clockInWindow !== undefined
          ? { clockInWindow: dto.clockInWindow }
          : {}),
        ...(dto.routeFrom !== undefined ? { routeFrom: dto.routeFrom } : {}),
        ...(dto.expectedTravelTime !== undefined
          ? { expectedTravelTime: dto.expectedTravelTime }
          : {}),
        ...(dto.mileageRateOverride !== undefined
          ? { mileageRateOverride: dto.mileageRateOverride }
          : {}),
        ...(dto.routeLabel !== undefined
          ? { routeLabel: dto.routeLabel }
          : {}),
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
    const rule = await this.prisma.routeRule.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: rule };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.routeRule.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async copyToLocation(id: string, locationId: string) {
    const existing = await this.prisma.routeRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route rule not found',
      });
    }
    const code = await this.codes.next('routeRule');
    const copy = await this.prisma.routeRule.create({
      data: {
        code,
        customerId: existing.customerId,
        locationId,
        geofenceRadius: existing.geofenceRadius,
        gpsRequired: existing.gpsRequired,
        clockInWindow: existing.clockInWindow,
        routeFrom: existing.routeFrom,
        expectedTravelTime: existing.expectedTravelTime,
        mileageRateOverride: existing.mileageRateOverride,
        routeLabel: existing.routeLabel,
        status: CrmRecordStatus.DRAFT,
        ownerId: existing.ownerId,
      },
    });
    return { data: copy };
  }

  async exportCsv(query: RouteRuleListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.RouteRuleWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.routeRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'code', header: 'Code', value: (r) => r.code },
      { key: 'routeLabel', header: 'Label', value: (r) => r.routeLabel },
      { key: 'routeFrom', header: 'From', value: (r) => r.routeFrom },
      { key: 'gpsRequired', header: 'GPS Required', value: (r) => r.gpsRequired },
      { key: 'status', header: 'Status', value: (r) => r.status },
    ]);
    return { data: { csv, filename: 'route-rules.csv' } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.routeRule.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route rule not found',
      });
    }
  }
}
