import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HrGpsFlagDecision,
  HrGpsFlagType,
  HrGpsNotifyVia,
  HrGpsRejectReason,
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

@Injectable()
export class GpsFlagsService {
  constructor(private readonly prisma: PrismaService) {}

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
      distanceLabel: unavailable ? '—' : `${dist.toFixed(1)} MI`,
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
