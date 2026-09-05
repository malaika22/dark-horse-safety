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
  CreateLocationDto,
  LocationListQueryDto,
  UpdateLocationDto,
} from './dto/location.dto';

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
  county: 'county',
};

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: LocationListQueryDto): Prisma.LocationWhereInput {
    const and: Prisma.LocationWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.county) and.push({ county: containsCi(query.county) });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.gpsRequired !== undefined)
      and.push({ gpsRequired: query.gpsRequired });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { wellPadNumber: containsCi(q) },
          { apiNumber: containsCi(q) },
          { county: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: LocationListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.location.count({ where }),
      this.prisma.location.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, gpsRequired] = await Promise.all([
      this.prisma.location.count({ where: { archivedAt: null } }),
      this.prisma.location.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.location.count({ where: { archivedAt: { not: null } } }),
      this.prisma.location.count({
        where: { archivedAt: null, gpsRequired: true },
      }),
    ]);
    return { data: { total, active, archived, gpsRequired } };
  }

  async mapPins() {
    const pins = await this.prisma.location.findMany({
      where: {
        archivedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        customerId: true,
      },
      take: 5000,
    });
    return { data: pins };
  }

  async getById(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        routeRules: { where: { archivedAt: null }, take: 20 },
      },
    });
    if (!location) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Location not found',
      });
    }
    return { data: location };
  }

  async create(dto: CreateLocationDto) {
    const code = await this.codes.next('location');
    const location = await this.prisma.location.create({
      data: {
        code,
        name: dto.name,
        wellPadNumber: dto.wellPadNumber,
        apiNumber: dto.apiNumber,
        county: dto.county,
        state: dto.state,
        latitude: dto.latitude,
        longitude: dto.longitude,
        siteType: dto.siteType,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        accessNotes: dto.accessNotes,
        siteContact: dto.siteContact,
        geofenceRadius: dto.geofenceRadius,
        gpsRequired: dto.gpsRequired ?? false,
        nearestHospital: dto.nearestHospital,
        city: dto.city,
        customerId: dto.customerId,
      },
    });
    return { data: location };
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.ensureExists(id);
    const location = await this.prisma.location.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.wellPadNumber !== undefined
          ? { wellPadNumber: dto.wellPadNumber }
          : {}),
        ...(dto.apiNumber !== undefined ? { apiNumber: dto.apiNumber } : {}),
        ...(dto.county !== undefined ? { county: dto.county } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.siteType !== undefined ? { siteType: dto.siteType } : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.accessNotes !== undefined
          ? { accessNotes: dto.accessNotes }
          : {}),
        ...(dto.siteContact !== undefined
          ? { siteContact: dto.siteContact }
          : {}),
        ...(dto.geofenceRadius !== undefined
          ? { geofenceRadius: dto.geofenceRadius }
          : {}),
        ...(dto.gpsRequired !== undefined
          ? { gpsRequired: dto.gpsRequired }
          : {}),
        ...(dto.nearestHospital !== undefined
          ? { nearestHospital: dto.nearestHospital }
          : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
      },
    });
    return { data: location };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const location = await this.prisma.location.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: location };
  }

  async bulkArchive(ids: string[]) {
    const result = await this.prisma.location.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async exportCsv(query: LocationListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.LocationWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'code', header: 'Code', value: (r) => r.code },
      { key: 'name', header: 'Name', value: (r) => r.name },
      { key: 'county', header: 'County', value: (r) => r.county },
      { key: 'state', header: 'State', value: (r) => r.state },
      { key: 'status', header: 'Status', value: (r) => r.status },
    ]);
    return { data: { csv, filename: 'locations.csv' } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.location.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Location not found',
      });
    }
  }
}
