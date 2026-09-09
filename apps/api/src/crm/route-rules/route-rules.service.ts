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
import { openWorkOrderWhere } from '../common/open-jobs.util';
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
              city: true,
              county: true,
              state: true,
              latitude: true,
              longitude: true,
              _count: {
                select: {
                  workOrders: { where: openWorkOrderWhere() },
                },
              },
            },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    const withLocationJobs = items.map((r) => {
      if (!r.location) return r;
      const { _count, ...loc } = r.location;
      return {
        ...r,
        location: {
          ...loc,
          city:
            loc.city?.trim() ||
            [loc.county, loc.state].filter(Boolean).join(', ') ||
            null,
          openJobs: _count.workOrders,
        },
      };
    });
    return { data: paginate(withLocationJobs, total, page, pageSize) };
  }

  async kpi() {
    const cycleStart = new Date();
    cycleStart.setDate(cycleStart.getDate() - 30);
    cycleStart.setHours(0, 0, 0, 0);

    const [locations, siteRules, customerRules, flags] = await Promise.all([
      this.prisma.location.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          customerId: true,
          latitude: true,
          longitude: true,
          status: true,
          gpsStatus: true,
        },
      }),
      this.prisma.routeRule.findMany({
        where: { archivedAt: null, locationId: { not: null } },
        select: { locationId: true },
      }),
      this.prisma.routeRule.findMany({
        where: { archivedAt: null, locationId: null },
        select: { customerId: true },
      }),
      this.prisma.gpsFlag.findMany({
        where: { flaggedAt: { gte: cycleStart } },
        select: {
          locationId: true,
          location: { select: { name: true } },
        },
      }),
    ]);

    const siteOverrideIds = new Set(
      siteRules.map((r) => r.locationId).filter(Boolean) as string[],
    );
    const customerDefaultIds = new Set(customerRules.map((r) => r.customerId));

    let sitesWithRule = 0;
    let usingSystemDefault = 0;
    let sitesWithNoRule = 0;
    for (const loc of locations) {
      const hasSite = siteOverrideIds.has(loc.id);
      const hasCustomer = customerDefaultIds.has(loc.customerId);
      if (hasSite || hasCustomer) sitesWithRule += 1;
      else usingSystemDefault += 1;
      const needsSetup =
        loc.latitude == null ||
        loc.longitude == null ||
        loc.status === CrmRecordStatus.NEEDS_REVIEW ||
        /missing|unset|offline|fail/i.test(loc.gpsStatus ?? '');
      if (needsSetup) sitesWithNoRule += 1;
    }

    const flagCounts = new Map<string, { name: string; count: number }>();
    for (const f of flags) {
      const existing = flagCounts.get(f.locationId) ?? {
        name: f.location?.name ?? 'Site',
        count: 0,
      };
      existing.count += 1;
      flagCounts.set(f.locationId, existing);
    }
    const topFlagSite = Array.from(flagCounts.values()).sort(
      (a, b) => b.count - a.count,
    )[0];

    return {
      data: {
        sitesWithRule,
        usingSystemDefault,
        gpsFlagsThisCycle: flags.length,
        sitesWithNoRule,
        flagsTopSite: topFlagSite?.name ?? null,
      },
    };
  }

  async overview() {
    const cycleStart = new Date();
    cycleStart.setDate(cycleStart.getDate() - 30);
    cycleStart.setHours(0, 0, 0, 0);

    const [rules, locations, flags, kpi] = await Promise.all([
      this.prisma.routeRule.findMany({
        where: { archivedAt: null },
        include: {
          customer: { select: { id: true, name: true } },
          location: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              geofenceRadius: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.location.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          customerId: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.gpsFlag.findMany({
        where: { flaggedAt: { gte: cycleStart } },
        include: {
          location: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          technician: {
            select: { id: true, firstName: true, lastName: true },
          },
          routeRule: { select: { id: true } },
        },
        orderBy: { flaggedAt: 'desc' },
        take: 100,
      }),
      this.kpi(),
    ]);

    const customerDefaults = rules
      .filter((r) => !r.locationId)
      .map((r) => {
        const sitesCount = locations.filter(
          (l) => l.customerId === r.customerId,
        ).length;
        return {
          id: r.id,
          name: r.customer?.name ?? 'Customer',
          geofenceRadius: r.geofenceRadius ?? '—',
          gpsRequired: r.gpsRequired,
          gpsLabel: r.gpsRequired ? 'GPS REQUIRED' : 'GPS OPTIONAL',
          sitesCount,
          detail: [
            r.geofenceRadius,
            r.gpsRequired ? 'GPS REQUIRED' : 'GPS OPTIONAL',
          ]
            .filter(Boolean)
            .join(' · '),
        };
      });

    const customerDefaultCustomerIds = new Set(
      rules.filter((r) => !r.locationId).map((r) => r.customerId),
    );

    const siteOverrides = rules
      .filter((r) => Boolean(r.locationId))
      .map((r) => {
        const gpsLabel = r.gpsRequired
          ? 'GPS REQUIRED'
          : r.clockInWindow?.trim()
            ? `GPS NOT REQUIRED · ${r.clockInWindow}`
            : 'GPS OPTIONAL';
        return {
          id: r.id,
          name: r.location?.name ?? r.routeLabel ?? 'Site',
          customer: r.customer?.name ?? '—',
          locationId: r.locationId,
          geofenceRadius: r.geofenceRadius ?? '—',
          gpsRequired: r.gpsRequired,
          gpsLabel,
          detail: [r.geofenceRadius, gpsLabel].filter(Boolean).join(' · '),
          overrides: customerDefaultCustomerIds.has(r.customerId)
            ? 'OVERRIDES CUSTOMER DEFAULT'
            : 'OVERRIDES SYSTEM DEFAULT',
        };
      });

    const flagCountByLocation = new Map<string, number>();
    for (const f of flags) {
      flagCountByLocation.set(
        f.locationId,
        (flagCountByLocation.get(f.locationId) ?? 0) + 1,
      );
    }

    const customerDefaultByCustomer = new Map(
      customerDefaults.map((c) => {
        const rule = rules.find((r) => r.id === c.id)!;
        return [rule.customerId, rule] as const;
      }),
    );

    const mapSites = locations
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((loc) => {
        const siteRule = rules.find((r) => r.locationId === loc.id);
        const customerRule = customerDefaultByCustomer.get(loc.customerId);
        const applied = siteRule ?? customerRule ?? null;
        const ruleSource = siteRule
          ? ('SITE_OVERRIDE' as const)
          : customerRule
            ? ('CUSTOMER_DEFAULT' as const)
            : ('SYSTEM_DEFAULT' as const);
        const gpsRequired = applied?.gpsRequired ?? true;
        let gpsMode: 'required' | 'optional' | 'not_required' = 'required';
        if (applied) {
          if (applied.gpsRequired) gpsMode = 'required';
          else if (/signal|not required/i.test(applied.clockInWindow ?? ''))
            gpsMode = 'not_required';
          else gpsMode = 'optional';
        }
        const radiusRaw =
          siteRule?.geofenceRadius ??
          customerRule?.geofenceRadius ??
          loc.geofenceRadius ??
          '1000 FT';
        const radiusFt = this.parseRadiusFt(radiusRaw) || 1000;
        return {
          id: applied?.id ?? `system-${loc.id}`,
          locationId: loc.id,
          label: loc.name,
          customer: loc.customer?.name ?? '—',
          latitude: loc.latitude,
          longitude: loc.longitude,
          ruleSource,
          gpsMode,
          flagCount: flagCountByLocation.get(loc.id) ?? 0,
          radiusFt,
          radiusLabel: this.radiusMilesLabel(radiusFt),
          geofenceRadius: radiusRaw,
        };
      });

    const flagRows = flags.map((f) => ({
      id: f.id,
      site: f.location?.name ?? '—',
      siteId: f.locationId,
      customer: f.customer?.name ?? '—',
      technician: this.shortTech(f.technician),
      technicianInitials: this.techInitials(f.technician),
      flaggedAt: f.flaggedAt.toISOString(),
      flagType: f.flagType,
      distanceOutside: f.distanceOutside,
      radiusApplied: f.radiusApplied,
      ruleSource: f.ruleSource,
      outcome: f.outcome,
      routeRuleId: f.routeRuleId,
    }));

    const siteFlagAgg = new Map<
      string,
      { site: string; locationId: string; count: number; accepted: number; ruleId: string | null }
    >();
    for (const f of flags) {
      const cur = siteFlagAgg.get(f.locationId) ?? {
        site: f.location?.name ?? 'Site',
        locationId: f.locationId,
        count: 0,
        accepted: 0,
        ruleId: f.routeRuleId,
      };
      cur.count += 1;
      if (/accept/i.test(f.outcome)) cur.accepted += 1;
      if (f.routeRuleId) cur.ruleId = f.routeRuleId;
      siteFlagAgg.set(f.locationId, cur);
    }
    const topInsight = Array.from(siteFlagAgg.values()).sort(
      (a, b) => b.count - a.count,
    )[0];

    const usingSystemDefault = kpi.data.usingSystemDefault ?? 0;

    const radiusVotes = new Map<string, number>();
    let gpsRequiredVotes = 0;
    let gpsOptionalVotes = 0;
    for (const r of customerDefaults) {
      const radius = (r.geofenceRadius ?? '').trim() || '1000 FT';
      radiusVotes.set(radius, (radiusVotes.get(radius) ?? 0) + 1);
      if (r.gpsRequired) gpsRequiredVotes += 1;
      else gpsOptionalVotes += 1;
    }
    let systemRadius = '1000 FT';
    let bestVote = 0;
    for (const [radius, vote] of radiusVotes) {
      if (vote > bestVote) {
        bestVote = vote;
        systemRadius = radius;
      }
    }
    const systemGpsRequired = gpsRequiredVotes >= gpsOptionalVotes;
    const systemDetail = [
      systemRadius,
      systemGpsRequired ? 'GPS REQUIRED' : 'GPS OPTIONAL',
    ].join(' · ');

    const uniqueSites = new Set(flags.map((f) => f.locationId)).size;

    return {
      data: {
        kpi: kpi.data,
        systemDefault: {
          id: 'system-default',
          name: 'ALL SITES',
          detail: systemDetail,
          appliesTo: usingSystemDefault,
        },
        customerDefaults,
        siteOverrides,
        mapSites,
        flags: flagRows,
        flagsSummary: {
          total: flags.length,
          sites: uniqueSites,
        },
        insight: topInsight
          ? {
              site: topInsight.site,
              locationId: topInsight.locationId,
              message: `${topInsight.site} raised ${topInsight.count} flags in 30 days — ${topInsight.accepted} accepted. Consider increasing the radius.`,
              routeRuleId: topInsight.ruleId,
            }
          : null,
      },
    };
  }

  private shortTech(
    user?: { firstName?: string | null; lastName?: string | null } | null,
  ) {
    if (!user) return '—';
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    if (first && last) return `${first.charAt(0)}. ${last}`;
    return first || last || '—';
  }

  private techInitials(
    user?: { firstName?: string | null; lastName?: string | null } | null,
  ) {
    if (!user) return '?';
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    return `${first.charAt(0) || ''}${last.charAt(0) || ''}`.toUpperCase() || '?';
  }

  private radiusMilesLabel(radiusFt: number) {
    const mi = radiusFt / 5280;
    if (mi >= 0.1) return `${mi.toFixed(mi >= 1 ? 1 : 2)} MI`;
    return `${radiusFt} FT`;
  }

  async mapPins() {
    const overview = await this.overview();
    return {
      data: overview.data.mapSites.map((s) => ({
        id: s.locationId,
        name: s.label,
        label: s.label,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.gpsMode === 'not_required' ? 'INACTIVE' : 'ACTIVE',
        customerId: undefined,
        locationId: s.locationId,
        ruleSource: s.ruleSource,
        gpsMode: s.gpsMode,
        flagCount: s.flagCount,
        geofenceRadius: s.geofenceRadius,
        radiusLabel: s.radiusLabel,
        customer: s.customer,
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

  async exportCsv(
    query: RouteRuleListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.RouteRuleWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.routeRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
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
        key: 'location',
        header: 'Location',
        value: (r: Row) => r.location?.name,
      },
      { key: 'label', header: 'Label', value: (r: Row) => r.routeLabel },
      {
        key: 'routeFrom',
        header: 'Route From',
        value: (r: Row) => r.routeFrom,
      },
      {
        key: 'geofence',
        header: 'Geofence',
        value: (r: Row) => r.geofenceRadius,
      },
      {
        key: 'gpsRequired',
        header: 'GPS Required',
        value: (r: Row) => (r.gpsRequired ? 'Yes' : 'No'),
      },
      {
        key: 'clockInWindow',
        header: 'Clock-In Window',
        value: (r: Row) => r.clockInWindow,
      },
      {
        key: 'travelTime',
        header: 'Travel Time',
        value: (r: Row) => r.expectedTravelTime,
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
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
      'Route Rules',
      'route-rules',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  async testCoordinate(id: string, lat: number, lng: number) {
    const rule = await this.prisma.routeRule.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route rule not found',
      });
    }
    const locationName = rule.location?.name ?? 'Unassigned location';
    const radiusFt = this.parseRadiusFt(rule.geofenceRadius);
    const locLat = rule.location?.latitude;
    const locLng = rule.location?.longitude;
    if (locLat == null || locLng == null) {
      return {
        data: {
          inside: false,
          distanceFt: null as number | null,
          radiusFt,
          locationName,
        },
      };
    }
    const distanceFt = this.haversineFt(locLat, locLng, lat, lng);
    return {
      data: {
        inside: radiusFt > 0 ? distanceFt <= radiusFt : false,
        distanceFt: Math.round(distanceFt),
        radiusFt,
        locationName,
      },
    };
  }

  async gpsFlags(id: string) {
    const rule = await this.prisma.routeRule.findUnique({
      where: { id },
      select: { id: true, locationId: true, customerId: true },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route rule not found',
      });
    }

    const cycleStart = new Date();
    cycleStart.setDate(cycleStart.getDate() - 30);

    const flags = await this.prisma.gpsFlag.findMany({
      where: {
        flaggedAt: { gte: cycleStart },
        OR: [
          { routeRuleId: id },
          ...(rule.locationId ? [{ locationId: rule.locationId }] : []),
        ],
      },
      include: {
        location: { select: { name: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { flaggedAt: 'desc' },
      take: 50,
    });

    return {
      data: {
        flags: flags.map((f) => ({
          id: f.id,
          severity:
            f.outcome === 'REJECTED'
              ? 'error'
              : f.outcome === 'AWAITING'
                ? 'warning'
                : 'info',
          message: f.flagType,
          detail: [
            f.distanceOutside,
            f.radiusApplied ? `radius ${f.radiusApplied}` : null,
            f.outcome,
            this.shortTech(f.technician),
          ]
            .filter(Boolean)
            .join(' · '),
          at: f.flaggedAt.toISOString(),
        })),
      },
    };
  }

  private parseRadiusFt(raw?: string | null): number {
    if (!raw) return 0;
    const m = raw.match(/([\d.]+)/);
    return m ? Number(m[1]) : 0;
  }

  /** Great-circle distance in feet between two WGS84 points. */
  private haversineFt(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R_MI = 3958.7613;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    const miles = 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(a)));
    return miles * 5280;
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
