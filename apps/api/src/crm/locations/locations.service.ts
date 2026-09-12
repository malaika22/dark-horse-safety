import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  ExportService,
  isoDate,
} from '../../common/services/export.service';
import { UploadsService } from '../../common/services/uploads.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { openWorkOrderWhere } from '../common/open-jobs.util';
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
    private readonly uploads: UploadsService,
  ) {}

  /** Persist any base64 payloads to disk; DB keeps URL metadata only. */
  private async persistSitePhotos(
    locationId: string,
    raw: unknown,
  ): Promise<Prisma.InputJsonValue> {
    if (!Array.isArray(raw)) return [];
    const out: Array<Record<string, unknown>> = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const p = item as Record<string, unknown>;
      let url = typeof p.url === 'string' ? p.url : undefined;
      let storagePath =
        typeof p.storagePath === 'string' ? p.storagePath : undefined;
      const contentBase64 =
        typeof p.contentBase64 === 'string' ? p.contentBase64 : undefined;

      if (contentBase64 && (!url || contentBase64.startsWith('data:'))) {
        const saved = await this.uploads.saveBase64({
          folder: `locations/${locationId}/photos`,
          fileName: String(p.name || p.label || 'photo.jpg'),
          contentBase64,
        });
        url = saved.url;
        storagePath = saved.storagePath;
      }

      if (!url) continue;
      out.push({
        id: String(p.id ?? randomUUID()),
        label: String(p.label ?? 'Landmark').trim() || 'Landmark',
        name: typeof p.name === 'string' ? p.name : undefined,
        url,
        storagePath,
      });
    }
    return out as Prisma.InputJsonValue;
  }

  private async persistEvacuationMap(
    locationId: string,
    value?: string | null,
  ): Promise<string | null | undefined> {
    if (value === undefined) return undefined;
    if (value === null || !value.trim()) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('/uploads/') || /^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('data:') || trimmed.length > 400) {
      const saved = await this.uploads.saveBase64({
        folder: `locations/${locationId}`,
        fileName: 'evacuation-map.jpg',
        contentBase64: trimmed,
      });
      return saved.url;
    }
    return trimmed;
  }

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
          { city: containsCi(q) },
          { customer: { name: containsCi(q) } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private listOrderBy(
    sort?: string,
    direction?: 'asc' | 'desc',
  ): Prisma.LocationOrderByWithRelationInput {
    const dir = direction === 'asc' ? 'asc' : 'desc';
    if (sort === 'customer') return { customer: { name: dir } };
    return orderByFrom(sort, direction, SORT_MAP, {
      createdAt: 'desc',
    }) as Prisma.LocationOrderByWithRelationInput;
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
        orderBy: this.listOrderBy(query.sort, query.direction),
        include: {
          customer: {
          select: { id: true, name: true, code: true, clockInRadius: true },
        },
          workOrders: {
            where: openWorkOrderWhere(),
            take: 1,
            orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
            select: { serviceDate: true, createdAt: true },
          },
          routeRules: {
            where: { archivedAt: null },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, code: true, routeLabel: true },
          },
          _count: {
            select: {
              workOrders: { where: openWorkOrderWhere() },
            },
          },
        },
      }),
    ]);
    const withOpenJobs = items.map(({ _count, ...loc }) => ({
      ...loc,
      openJobs: _count.workOrders,
    }));
    return { data: paginate(withOpenJobs, total, page, pageSize) };
  }

  async kpi() {
    const base = { archivedAt: null as null };
    const [total, active, inactive, missingGps, inactiveSample] =
      await Promise.all([
        this.prisma.location.count({ where: base }),
        this.prisma.location.count({
          where: { ...base, status: CrmRecordStatus.ACTIVE },
        }),
        this.prisma.location.count({
          where: { ...base, status: CrmRecordStatus.INACTIVE },
        }),
        this.prisma.location.count({
          where: {
            ...base,
            OR: [
              { latitude: null },
              { longitude: null },
              { gpsStatus: { contains: 'Missing', mode: 'insensitive' } },
              { gpsStatus: { contains: 'Offline', mode: 'insensitive' } },
              { gpsStatus: { contains: 'Not set', mode: 'insensitive' } },
              { gpsStatus: { contains: 'Unset', mode: 'insensitive' } },
            ],
          },
        }),
        this.prisma.location.findFirst({
          where: { ...base, status: CrmRecordStatus.INACTIVE },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true, siteType: true, accessNotes: true },
        }),
      ]);

    let inactiveDetail: string | undefined;
    if (inactiveSample) {
      const since = inactiveSample.updatedAt.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      const reason =
        inactiveSample.siteType?.trim() ||
        inactiveSample.accessNotes?.trim()?.split(/[\n.]/)[0]?.trim() ||
        'Inactive';
      inactiveDetail = `Inactive since ${since} · ${reason}`;
    }

    return {
      data: {
        total,
        active,
        inactive,
        missingGps,
        ...(inactiveDetail ? { inactiveDetail } : {}),
      },
    };
  }

  async mapPins() {
    const pins = await this.prisma.location.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        customerId: true,
        gpsRequired: true,
        gpsStatus: true,
        geofenceRadius: true,
        customer: { select: { id: true, name: true } },
        _count: {
          select: {
            workOrders: { where: openWorkOrderWhere() },
          },
        },
      },
      take: 5000,
    });
    return {
      data: pins.map(({ _count, ...pin }) => ({
        ...pin,
        openJobs: _count.workOrders,
      })),
    };
  }

  async getById(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, code: true, clockInRadius: true },
        },
        routeRules: {
          where: { archivedAt: null },
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            routeLabel: true,
            geofenceRadius: true,
            gpsRequired: true,
            clockInWindow: true,
            routeFrom: true,
            expectedTravelTime: true,
            status: true,
            locationId: true,
            customerId: true,
          },
        },
        workOrders: {
          where: openWorkOrderWhere(),
          take: 5,
          orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            code: true,
            serviceDate: true,
            createdAt: true,
            status: true,
          },
        },
        _count: {
          select: {
            workOrders: { where: openWorkOrderWhere() },
          },
        },
      },
    });
    if (!location) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Location not found',
      });
    }
    const { _count, ...rest } = location;
    return { data: { ...rest, openJobs: _count.workOrders } };
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
        siteContactId: dto.siteContactId,
        geofenceRadius: dto.geofenceRadius,
        geofenceOverride: dto.geofenceOverride ?? false,
        gpsRequired: dto.gpsRequired ?? false,
        nearestHospital: dto.nearestHospital,
        hospitalPhone: dto.hospitalPhone,
        hospitalAddress: dto.hospitalAddress,
        hospitalDriveTime: dto.hospitalDriveTime,
        fireEmergency: dto.fireEmergency,
        fireNonEmergency: dto.fireNonEmergency,
        policeEmergency: dto.policeEmergency,
        policeNonEmergency: dto.policeNonEmergency,
        ambulance: dto.ambulance,
        musterPoint: dto.musterPoint,
        city: dto.city,
        customerId: dto.customerId,
      },
    });

    const sitePhotos =
      dto.sitePhotos !== undefined
        ? await this.persistSitePhotos(location.id, dto.sitePhotos)
        : undefined;
    const evacuationMapUrl =
      dto.evacuationMapUrl !== undefined
        ? await this.persistEvacuationMap(location.id, dto.evacuationMapUrl)
        : undefined;

    if (sitePhotos !== undefined || evacuationMapUrl !== undefined) {
      const updated = await this.prisma.location.update({
        where: { id: location.id },
        data: {
          ...(sitePhotos !== undefined ? { sitePhotos } : {}),
          ...(evacuationMapUrl !== undefined ? { evacuationMapUrl } : {}),
        },
      });
      return { data: updated };
    }

    return { data: location };
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.ensureExists(id);

    const sitePhotos =
      dto.sitePhotos !== undefined
        ? await this.persistSitePhotos(id, dto.sitePhotos)
        : undefined;
    const evacuationMapUrl =
      dto.evacuationMapUrl !== undefined
        ? await this.persistEvacuationMap(id, dto.evacuationMapUrl)
        : undefined;

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
        ...(dto.siteContactId !== undefined
          ? { siteContactId: dto.siteContactId }
          : {}),
        ...(dto.geofenceRadius !== undefined
          ? { geofenceRadius: dto.geofenceRadius }
          : {}),
        ...(dto.geofenceOverride !== undefined
          ? { geofenceOverride: dto.geofenceOverride }
          : {}),
        ...(dto.gpsRequired !== undefined
          ? { gpsRequired: dto.gpsRequired }
          : {}),
        ...(dto.nearestHospital !== undefined
          ? { nearestHospital: dto.nearestHospital }
          : {}),
        ...(dto.hospitalPhone !== undefined
          ? { hospitalPhone: dto.hospitalPhone }
          : {}),
        ...(dto.hospitalAddress !== undefined
          ? { hospitalAddress: dto.hospitalAddress }
          : {}),
        ...(dto.hospitalDriveTime !== undefined
          ? { hospitalDriveTime: dto.hospitalDriveTime }
          : {}),
        ...(dto.fireEmergency !== undefined
          ? { fireEmergency: dto.fireEmergency }
          : {}),
        ...(dto.fireNonEmergency !== undefined
          ? { fireNonEmergency: dto.fireNonEmergency }
          : {}),
        ...(dto.policeEmergency !== undefined
          ? { policeEmergency: dto.policeEmergency }
          : {}),
        ...(dto.policeNonEmergency !== undefined
          ? { policeNonEmergency: dto.policeNonEmergency }
          : {}),
        ...(dto.ambulance !== undefined ? { ambulance: dto.ambulance } : {}),
        ...(dto.musterPoint !== undefined
          ? { musterPoint: dto.musterPoint }
          : {}),
        ...(sitePhotos !== undefined ? { sitePhotos } : {}),
        ...(evacuationMapUrl !== undefined ? { evacuationMapUrl } : {}),
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

  async exportCsv(
    query: LocationListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.LocationWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
      include: {
        customer: {
          select: { id: true, name: true, code: true, clockInRadius: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      { key: 'code', header: 'Code', value: (r: Row) => r.code },
      { key: 'name', header: 'Name', value: (r: Row) => r.name },
      {
        key: 'customer',
        header: 'Customer',
        value: (r: Row) => r.customer?.name,
      },
      {
        key: 'wellPad',
        header: 'Well/Pad',
        value: (r: Row) => r.wellPadNumber,
      },
      { key: 'apiNumber', header: 'API #', value: (r: Row) => r.apiNumber },
      { key: 'county', header: 'County', value: (r: Row) => r.county },
      { key: 'state', header: 'State', value: (r: Row) => r.state },
      { key: 'city', header: 'City', value: (r: Row) => r.city },
      { key: 'siteType', header: 'Site Type', value: (r: Row) => r.siteType },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      { key: 'lat', header: 'Lat', value: (r: Row) => r.latitude },
      { key: 'lng', header: 'Lng', value: (r: Row) => r.longitude },
      {
        key: 'gpsRequired',
        header: 'GPS Required',
        value: (r: Row) => (r.gpsRequired ? 'Yes' : 'No'),
      },
      {
        key: 'geofence',
        header: 'Geofence',
        value: (r: Row) => r.geofenceRadius,
      },
      { key: 'openJobs', header: 'Open Jobs', value: (r: Row) => r.openJobs },
      {
        key: 'gpsStatus',
        header: 'GPS Status',
        value: (r: Row) => r.gpsStatus,
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Locations',
      'locations',
      rows,
      columns,
      query.format ?? 'csv',
    );
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
