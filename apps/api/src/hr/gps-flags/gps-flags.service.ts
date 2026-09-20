import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  HrGpsFlagDecision,
  HrGpsFlagType,
  HrGpsRejectReason,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GpsFlagDecisionDto } from './dto/gps-flags.dto';

function shortName(first: string, last: string) {
  const initial = first.trim().charAt(0).toUpperCase();
  return `${initial}. ${last.trim().toUpperCase()}`;
}

function typeLabel(type: HrGpsFlagType) {
  if (type === HrGpsFlagType.OUTSIDE_GEOFENCE) return 'Outside Geofence';
  if (type === HrGpsFlagType.GPS_UNAVAILABLE) return 'GPS Unavailable';
  return 'Late Clock-In Location';
}

function formatEventAt(d: Date) {
  return (
    d
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      .replace(',', ' -')
      .toUpperCase() + ' CT'
  );
}

function formatAge(d: Date) {
  const hours = Math.max(
    0,
    Math.round((Date.now() - d.getTime()) / 3_600_000),
  );
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.round(hours / 24);
  return `${days}D AGO`;
}

function ageDays(d: Date) {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

const MIDLAND = { lat: 31.9973, lng: -102.0779 };

@Injectable()
export class GpsFlagsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureDemo();
    } catch {
      // DB may not be ready
    }
  }

  /** Seed open HR GPS flags from live employees when queue is empty. */
  async ensureDemo() {
    const count = await this.prisma.hrGpsFlag.count({
      where: {
        decision: {
          in: [HrGpsFlagDecision.PENDING, HrGpsFlagDecision.MORE_INFO],
        },
      },
    });
    if (count > 0) return { created: 0 };

    const employees = await this.prisma.employee.findMany({
      where: { archivedAt: null },
      take: 6,
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (employees.length === 0) return { created: 0 };

    const workOrders = await this.prisma.workOrder.findMany({
      where: { archivedAt: null },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        location: { select: { latitude: true, longitude: true } },
      },
    });

    const demos: Array<{
      type: HrGpsFlagType;
      distanceMi: number;
      hoursAgo: number;
      explanation: string;
      eventType: string;
      photo?: boolean;
    }> = [
      {
        type: HrGpsFlagType.OUTSIDE_GEOFENCE,
        distanceMi: 2.4,
        hoursAgo: 6,
        explanation: 'Parked at lease road entrance; gate locked on arrival.',
        eventType: 'CLOCK-IN',
        photo: true,
      },
      {
        type: HrGpsFlagType.OUTSIDE_GEOFENCE,
        distanceMi: 1.1,
        hoursAgo: 18,
        explanation: 'Job pin outdated after pad move overnight.',
        eventType: 'CLOCK-IN',
        photo: true,
      },
      {
        type: HrGpsFlagType.GPS_UNAVAILABLE,
        distanceMi: 0,
        hoursAgo: 30,
        explanation: 'No GPS fix inside metal building; manual clock-in.',
        eventType: 'CLOCK-IN',
      },
      {
        type: HrGpsFlagType.LATE_CLOCK_IN,
        distanceMi: 0.6,
        hoursAgo: 48,
        explanation: 'Traffic delay on Hwy 191; arrived 22 min late.',
        eventType: 'CLOCK-IN',
        photo: true,
      },
      {
        type: HrGpsFlagType.OUTSIDE_GEOFENCE,
        distanceMi: 3.8,
        hoursAgo: 72,
        explanation: 'Clocked in at wrong well pad (adjacent lease).',
        eventType: 'CLOCK-IN',
      },
      {
        type: HrGpsFlagType.OUTSIDE_GEOFENCE,
        distanceMi: 0.9,
        hoursAgo: 10,
        explanation: 'Staging area outside 500 ft geofence while waiting HSE.',
        eventType: 'CLOCK-OUT',
        photo: true,
      },
    ];

    let created = 0;
    for (let i = 0; i < Math.min(demos.length, employees.length); i++) {
      const emp = employees[i]!;
      const demo = demos[i]!;
      const wo = workOrders[i % Math.max(workOrders.length, 1)];
      const jobLat = wo?.location?.latitude ?? MIDLAND.lat;
      const jobLng = wo?.location?.longitude ?? MIDLAND.lng;
      const offsetDeg = demo.distanceMi / 69;
      const clockLat =
        demo.type === HrGpsFlagType.GPS_UNAVAILABLE
          ? null
          : jobLat + offsetDeg * 0.55;
      const clockLng =
        demo.type === HrGpsFlagType.GPS_UNAVAILABLE
          ? null
          : jobLng + offsetDeg * 0.35;

      await this.prisma.hrGpsFlag.create({
        data: {
          employeeId: emp.id,
          type: demo.type,
          eventAt: new Date(Date.now() - demo.hoursAgo * 3_600_000),
          distanceMi: new Prisma.Decimal(demo.distanceMi),
          geofenceFt: 500,
          workOrder: wo?.code ?? `WO-GPS-${i + 1}`,
          customer: wo?.customer?.name ?? 'PERMIAN BASIN ENERGY',
          eventType: demo.eventType,
          explanation: demo.explanation,
          photoLabel: demo.photo ? 'SITE PHOTO' : null,
          photoMeta: demo.photo ? 'ATTACHED . MOBILE' : null,
          jobLat,
          jobLng,
          clockLat,
          clockLng,
          decision: HrGpsFlagDecision.PENDING,
        },
      });
      created += 1;
    }
    return { created };
  }

  private mapListRow(row: {
    id: string;
    type: HrGpsFlagType;
    eventAt: Date;
    distanceMi: { toNumber?: () => number } | number | string;
    decision: HrGpsFlagDecision;
    employee: { firstName: string; lastName: string };
  }) {
    const dist =
      typeof row.distanceMi === 'object' &&
      row.distanceMi &&
      'toNumber' in row.distanceMi
        ? row.distanceMi.toNumber!()
        : Number(row.distanceMi);
    const unavailable = row.type === HrGpsFlagType.GPS_UNAVAILABLE;
    return {
      id: row.id,
      employee: shortName(row.employee.firstName, row.employee.lastName),
      eventAtLabel: formatEventAt(row.eventAt),
      ageLabel: formatAge(row.eventAt),
      distanceLabel: unavailable ? '-' : `${dist.toFixed(1)} MI`,
      distanceMi: dist,
      type: row.type,
      typeLabel: typeLabel(row.type),
      decision: row.decision,
    };
  }

  private mapDetail(row: {
    id: string;
    type: HrGpsFlagType;
    eventAt: Date;
    distanceMi: { toNumber?: () => number } | number | string;
    geofenceFt: number;
    workOrder: string | null;
    customer: string | null;
    eventType: string;
    explanation: string | null;
    photoLabel: string | null;
    photoMeta: string | null;
    jobLat: number | null;
    jobLng: number | null;
    clockLat: number | null;
    clockLng: number | null;
    decision: HrGpsFlagDecision;
    rejectReason: HrGpsRejectReason | null;
    decisionNotes: string | null;
    employee: { firstName: string; lastName: string };
  }) {
    const list = this.mapListRow(row);
    const dist = list.distanceMi;
    const unavailable = row.type === HrGpsFlagType.GPS_UNAVAILABLE;
    return {
      ...list,
      title: `${list.employee} - ${row.eventType} - ${row.eventAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`,
      alertBanner: unavailable
        ? 'GPS SIGNAL UNAVAILABLE AT CLOCK-IN'
        : `${dist.toFixed(1)} MI OUTSIDE ${row.geofenceFt} FT GEOFENCE`,
      timeOfEvent: list.eventAtLabel,
      workOrder: row.workOrder,
      customer: row.customer,
      flagAge: list.ageLabel.includes('H AGO')
        ? list.ageLabel.replace('H AGO', ' HOURS AGO')
        : list.ageLabel.replace('D AGO', ' DAYS AGO'),
      explanation: row.explanation,
      photoLabel: row.photoLabel,
      photoMeta: row.photoMeta,
      map: {
        jobLat: row.jobLat,
        jobLng: row.jobLng,
        clockLat: row.clockLat,
        clockLng: row.clockLng,
      },
      decisionNotes: row.decisionNotes,
      rejectReason: row.rejectReason,
    };
  }

  async overview() {
    await this.ensureDemo();
    const open = await this.prisma.hrGpsFlag.findMany({
      where: {
        decision: {
          in: [HrGpsFlagDecision.PENDING, HrGpsFlagDecision.MORE_INFO],
        },
      },
      orderBy: { eventAt: 'desc' },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    const withDistance = open.filter(
      (r) => r.type !== HrGpsFlagType.GPS_UNAVAILABLE,
    );
    const avgDistance =
      withDistance.length === 0
        ? 0
        : withDistance.reduce((sum, r) => sum + Number(r.distanceMi), 0) /
          withDistance.length;
    const oldest = open.reduce(
      (max, r) => Math.max(max, ageDays(r.eventAt)),
      0,
    );

    return {
      data: {
        kpis: {
          openFlags: open.length,
          openMeta: 'Unresolved',
          avgDistance: `${avgDistance.toFixed(1)} MI`,
          avgMeta: 'From job site',
          oldestFlag: `${oldest || 0}D`,
          oldestMeta: 'Awaiting review',
        },
        flags: open.map((r) => this.mapListRow(r)),
      },
    };
  }

  async getOne(id: string) {
    await this.ensureDemo();
    const row = await this.prisma.hrGpsFlag.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('GPS flag not found');
    return { data: this.mapDetail(row) };
  }

  async decide(id: string, dto: GpsFlagDecisionDto) {
    const existing = await this.prisma.hrGpsFlag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('GPS flag not found');
    if (
      existing.decision !== HrGpsFlagDecision.PENDING &&
      existing.decision !== HrGpsFlagDecision.MORE_INFO
    ) {
      throw new BadRequestException('Flag already resolved');
    }

    if (dto.decision === HrGpsFlagDecision.REJECTED && !dto.rejectReason) {
      throw new BadRequestException('Select a rejection reason');
    }
    if (dto.decision === HrGpsFlagDecision.MORE_INFO && !dto.notes?.trim()) {
      throw new BadRequestException('Enter a message to the technician');
    }

    const updated = await this.prisma.hrGpsFlag.update({
      where: { id },
      data: {
        decision: dto.decision,
        rejectReason: dto.rejectReason ?? null,
        notifyVia: dto.notifyVia ?? null,
        decisionNotes: dto.notes?.trim() || null,
        resolvedAt:
          dto.decision === HrGpsFlagDecision.MORE_INFO ? null : new Date(),
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    return { data: this.mapDetail(updated) };
  }
}
