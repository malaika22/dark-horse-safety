import { BadRequestException, ConflictException, HttpException, Injectable } from '@nestjs/common';
import { Prisma, TimeEntry, TimeEntryCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClockInDto, GeoDto, GpsExplanationDto, PauseDto, ResumeDto, SyncDto } from './dto/mobile.dto';
import { MILES_PER_METER, MobileContext, dateOnly, haversineMeters, hhmm, isoDate, num } from './mobile-context.service';

const DEFAULT_RADIUS_FT = 500;
const FT_PER_M = 3.28084;

function radiusFt(raw?: string | null) {
  const n = parseFloat(raw ?? '');
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RADIUS_FT;
}
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

@Injectable()
export class MobileClockService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService) {}

  private openEntry(employeeId: string) {
    return this.prisma.timeEntry.findFirst({ where: { employeeId, clockOut: null, archivedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  private async view(entry: TimeEntry | null) {
    if (!entry) return { status: 'CLOCKED_OUT', timeEntryId: null };
    const pause = await this.prisma.timeEntryPause.findFirst({ where: { timeEntryId: entry.id, endedAt: null } });
    return {
      status: pause ? 'PAUSED' : 'CLOCKED_IN',
      timeEntryId: entry.id,
      clockIn: entry.clockIn,
      workDate: isoDate(entry.workDate),
      workOrderCode: entry.workOrderCode,
      customerName: entry.customerName,
      category: entry.category,
      pause: pause ? { id: pause.id, reason: pause.reason, startedAt: pause.startedAt } : null,
    };
  }

  /** CL-1 */
  async status(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    return { data: await this.view(await this.openEntry(employee.id)) };
  }

  /** CL-6 */
  async geofenceCheck(userId: string, workOrderId: string, lat: number, lng: number) {
    await this.ctx.actor(userId);
    const wo = await this.ctx.mustFind(this.prisma.workOrder.findUnique({ where: { id: workOrderId }, include: { location: true } }), 'Work order');
    const loc = wo.location;
    const r = radiusFt(loc?.geofenceRadius);
    if (!loc || loc.latitude == null || loc.longitude == null) {
      return { data: { withinGeofence: null, radiusFeet: r, distanceMeters: null, gpsRequired: loc?.gpsRequired ?? false } };
    }
    const d = haversineMeters(lat, lng, loc.latitude, loc.longitude);
    return { data: { withinGeofence: d * FT_PER_M <= r, radiusFeet: r, distanceMeters: Math.round(d), gpsRequired: loc.gpsRequired } };
  }

  /** CL-2 */
  async clockIn(userId: string, dto: ClockInDto) {
    const { employee: e } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      if (await this.openEntry(e.id)) {
        throw new ConflictException({ code: 'ALREADY_CLOCKED_IN', message: 'You are already clocked in.' });
      }
      const category = (dto.category ?? e.defaultTimeCategory ?? 'REGULAR') as TimeEntryCategory;
      if (category === 'NON_BILLABLE' && !dto.nonBillableReason?.trim()) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'A reason is required for non-billable time.', details: { nonBillableReason: 'Required' } });
      }
      const at = dto.capturedAt ? new Date(dto.capturedAt) : new Date();
      const wo = dto.workOrderId
        ? await this.prisma.workOrder.findUnique({ where: { id: dto.workOrderId }, include: { customer: true, location: true } })
        : null;
      const loc = wo?.location ?? null;
      const hasGps = dto.lat != null && dto.lng != null;
      const jobHasCoords = loc?.latitude != null && loc?.longitude != null;
      const distM = hasGps && jobHasCoords ? haversineMeters(dto.lat!, dto.lng!, loc!.latitude!, loc!.longitude!) : null;
      const r = radiusFt(loc?.geofenceRadius);

      const profile = await this.prisma.mobileProfile.findUnique({ where: { userId } });
      const fromHome =
        hasGps && profile?.homeLat != null && profile.homeLng != null &&
        haversineMeters(dto.lat!, dto.lng!, profile.homeLat, profile.homeLng) * FT_PER_M <= r &&
        distM !== null && distM * FT_PER_M > r;

      let flagType: 'OUTSIDE_GEOFENCE' | 'GPS_UNAVAILABLE' | null = null;
      if (!hasGps) flagType = 'GPS_UNAVAILABLE';
      else if (distM !== null && distM * FT_PER_M > r) flagType = 'OUTSIDE_GEOFENCE';

      const entry = await this.prisma.timeEntry.create({
        data: {
          employeeId: e.id,
          workDate: dateOnly(at),
          cycleLabel: await this.ctx.cycleLabelFor(at),
          workOrderShort: wo?.code,
          workOrderCode: wo?.code,
          category,
          clockIn: hhmm(at),
          source: 'MOBILE',
          billable: category !== 'NON_BILLABLE',
          nonBillableReason: category === 'NON_BILLABLE' ? dto.nonBillableReason : undefined,
          customerName: wo?.customer.name,
          jobLocation: loc?.name,
          jobSiteLabel: loc?.name,
          jobLat: loc?.latitude,
          jobLng: loc?.longitude,
          clockInLat: dto.lat,
          clockInLng: dto.lng,
          clockInDistanceMi: distM !== null ? +(distM * MILES_PER_METER).toFixed(2) : undefined,
          gpsFlagged: flagType !== null,
          gpsLabel: flagType ? 'FLAGGED' : 'CLEAR',
          status: 'PENDING',
          editHistory: [{ at: at.toISOString(), what: 'Clocked in (mobile)' }] as Prisma.InputJsonValue,
        },
      });

      let gpsFlag: { raised: boolean; id?: string; type?: string; explanationRequired?: boolean } = { raised: false };
      if (flagType) {
        const flag = await this.prisma.hrGpsFlag.create({
          data: {
            employeeId: e.id,
            type: flagType,
            eventAt: at,
            distanceMi: distM !== null ? +(distM * MILES_PER_METER).toFixed(2) : 0,
            geofenceFt: Math.round(r),
            workOrder: wo?.code,
            customer: wo?.customer.name,
            eventType: fromHome ? 'CLOCK-IN FROM HOME' : 'CLOCK-IN',
            jobLat: loc?.latitude,
            jobLng: loc?.longitude,
            clockLat: dto.lat,
            clockLng: dto.lng,
          },
        });
        gpsFlag = { raised: true, id: flag.id, type: fromHome ? 'CLOCK_IN_FROM_HOME' : flagType, explanationRequired: true };
        await this.ctx.notify(userId, {
          dedupeKey: `gps:${flag.id}`, type: 'GPS_FLAG_NEEDS_EXPLANATION',
          title: 'GPS flag needs an explanation', body: 'Your clock-in was flagged. Add an explanation.',
          actionLabel: 'Explain', reference: { type: 'GPS_FLAG', id: flag.id }, requiresAction: true,
        });
      }
      return { data: { ...(await this.view(entry)), gpsFlag } };
    });
  }

  private closeOpenPause(entryId: string, at: Date) {
    return this.prisma.timeEntryPause.updateMany({ where: { timeEntryId: entryId, endedAt: null }, data: { endedAt: at } });
  }

  /** CL-3 */
  async clockOut(userId: string, dto: GeoDto) {
    const { employee: e } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const entry = await this.openEntry(e.id);
      if (!entry) throw new ConflictException({ code: 'NOT_CLOCKED_IN', message: 'You are not clocked in.' });
      const at = dto.capturedAt ? new Date(dto.capturedAt) : new Date();
      await this.closeOpenPause(entry.id, at);
      const pauses = await this.prisma.timeEntryPause.findMany({ where: { timeEntryId: entry.id } });
      const breakMin = pauses.filter((p) => p.reason === 'BREAK').reduce((s, p) => s + Math.round(((p.endedAt ?? at).getTime() - p.startedAt.getTime()) / 60000), 0);
      const pauseMin = pauses.reduce((s, p) => s + Math.round(((p.endedAt ?? at).getTime() - p.startedAt.getTime()) / 60000), 0);

      const out = hhmm(at);
      let total = toMin(out) - toMin(entry.clockIn ?? out);
      if (total < 0) total += 24 * 60;
      const workMin = Math.max(0, total - pauseMin);
      const hours = +(workMin / 60).toFixed(1);
      const distM = dto.lat != null && dto.lng != null && entry.jobLat != null && entry.jobLng != null
        ? haversineMeters(dto.lat, dto.lng, entry.jobLat, entry.jobLng) : null;

      await this.prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          clockOut: out, hours, workHours: hours,
          billableHours: entry.billable ? hours : 0,
          nonBillableHours: entry.billable ? undefined : hours,
          clockOutLat: dto.lat, clockOutLng: dto.lng,
          clockOutDistanceMi: distM !== null ? +(distM * MILES_PER_METER).toFixed(2) : undefined,
          editHistory: [...((entry.editHistory as unknown[] | null) ?? []), { at: at.toISOString(), what: 'Clocked out (mobile)' }] as Prisma.InputJsonValue,
        },
      });
      return {
        data: {
          status: 'CLOCKED_OUT', timeEntryId: entry.id, clockOut: out,
          summary: { workMinutes: workMin, breakMinutes: breakMin, pauseMinutes: pauseMin, totalMinutes: total },
          formsMissing: [],
        },
      };
    });
  }

  /** CL-7 */
  async pause(userId: string, dto: PauseDto) {
    const { employee: e } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const entry = await this.openEntry(e.id);
      if (!entry) throw new ConflictException({ code: 'NOT_CLOCKED_IN', message: 'You are not clocked in.' });
      if (dto.reason === 'OTHER' && !dto.note?.trim()) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'A note is required for OTHER.', details: { note: 'Required' } });
      }
      if (await this.prisma.timeEntryPause.findFirst({ where: { timeEntryId: entry.id, endedAt: null } })) {
        throw new ConflictException({ code: 'ALREADY_PAUSED', message: 'Already paused.' });
      }
      const row = await this.prisma.timeEntryPause.create({
        data: { timeEntryId: entry.id, employeeId: e.id, reason: dto.reason, note: dto.note, photoUrl: dto.photoUrl, startedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date() },
      });
      return { data: { pauseId: row.id, startedAt: row.startedAt } };
    });
  }

  /** CL-8 */
  async resume(userId: string, dto: ResumeDto) {
    const { employee: e } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const p = await this.prisma.timeEntryPause.findFirst({ where: { employeeId: e.id, endedAt: null }, orderBy: { startedAt: 'desc' } });
      if (!p) throw new ConflictException({ code: 'NOT_PAUSED', message: 'No open pause.' });
      const at = dto.capturedAt ? new Date(dto.capturedAt) : new Date();
      await this.prisma.timeEntryPause.update({ where: { id: p.id }, data: { endedAt: at } });
      return { data: { pauseId: p.id, endedAt: at, pauseMinutes: Math.round((at.getTime() - p.startedAt.getTime()) / 60000) } };
    });
  }

  /** CL-4 — replay offline events in order; each is idempotent by clientRequestId. */
  async sync(userId: string, dto: SyncDto) {
    const results: unknown[] = [];
    for (const ev of dto.events) {
      const body = { ...(ev.payload as object), clientRequestId: ev.clientRequestId } as never;
      try {
        if (ev.type === 'CLOCK_IN') await this.clockIn(userId, body);
        else if (ev.type === 'CLOCK_OUT') await this.clockOut(userId, body);
        else if (ev.type === 'PAUSE') await this.pause(userId, body);
        else await this.resume(userId, body);
        results.push({ clientRequestId: ev.clientRequestId, ok: true });
      } catch (err) {
        const r = err instanceof HttpException ? (err.getResponse() as Record<string, unknown>) : {};
        results.push({ clientRequestId: ev.clientRequestId, ok: false, error: { code: r.code ?? 'ERROR', message: r.message ?? 'Failed' } });
      }
    }
    return { data: { results } };
  }

  /** CL-5 */
  async explain(userId: string, dto: GpsExplanationDto) {
    const { employee: e } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const flag = await this.ctx.mustFind(this.prisma.hrGpsFlag.findFirst({ where: { id: dto.gpsFlagId, employeeId: e.id } }), 'GPS flag');
      await this.prisma.hrGpsFlag.update({ where: { id: flag.id }, data: { explanation: dto.text, photoLabel: dto.attachmentUrl ?? flag.photoLabel } });
      await this.prisma.mobileNotification.updateMany({ where: { userId, dedupeKey: `gps:${flag.id}` }, data: { resolved: true } });
      return { data: { id: flag.id, status: 'EXPLAINED' } };
    });
  }

  private flagStatus(f: { explanation: string | null; decision: string }) {
    if (f.decision === 'ACCEPTED' || f.decision === 'REJECTED') return 'RESOLVED';
    return f.explanation ? 'EXPLAINED' : 'OPEN';
  }

  /** GF-1 */
  async flags(userId: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const rows = await this.prisma.hrGpsFlag.findMany({ where: { employeeId: e.id }, orderBy: { eventAt: 'desc' }, take: 100 });
    return { data: { items: rows.map((f) => ({ id: f.id, type: f.eventType === 'CLOCK-IN FROM HOME' ? 'CLOCK_IN_FROM_HOME' : f.type, status: this.flagStatus(f), eventAt: f.eventAt, workOrder: f.workOrder })) } };
  }

  /** GF-2 */
  async flag(userId: string, id: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const f = await this.ctx.mustFind(this.prisma.hrGpsFlag.findFirst({ where: { id, employeeId: e.id } }), 'GPS flag');
    const profile = await this.prisma.mobileProfile.findUnique({ where: { userId } });
    const entry = f.workOrder
      ? await this.prisma.timeEntry.findFirst({ where: { employeeId: e.id, workOrderCode: f.workOrder, workDate: dateOnly(f.eventAt) } })
      : null;
    const timeline = [{ at: f.createdAt, event: 'FLAG_RAISED', actor: 'SYSTEM' }] as { at: Date | null; event: string; actor: string }[];
    if (f.explanation) timeline.push({ at: f.updatedAt, event: 'EXPLANATION_SUBMITTED', actor: 'EMPLOYEE' });
    if (f.resolvedAt) timeline.push({ at: f.resolvedAt, event: f.decision, actor: 'HR' });
    return {
      data: {
        id: f.id,
        type: f.eventType === 'CLOCK-IN FROM HOME' ? 'CLOCK_IN_FROM_HOME' : f.type,
        status: this.flagStatus(f),
        timeEntryId: entry?.id ?? null,
        eventAt: f.eventAt,
        homeLocation: profile?.homeLat != null ? { lat: profile.homeLat, lng: profile.homeLng, address: profile.homeAddress } : null,
        jobLocation: f.jobLat != null ? { lat: f.jobLat, lng: f.jobLng } : null,
        clockLocation: f.clockLat != null ? { lat: f.clockLat, lng: f.clockLng } : null,
        distanceFromJobMeters: Math.round(num(f.distanceMi) / MILES_PER_METER),
        explanation: f.explanation,
        decisionNotes: f.decisionNotes,
        timeline,
      },
    };
  }

  /** SYNC-1 */
  async syncStatus(userId: string) {
    await this.ctx.actor(userId);
    const failed = await this.prisma.mobileNotification.count({ where: { userId, type: 'OFFLINE_SYNC_FAILED', resolved: false } });
    return { data: { pendingCount: 0, failedCount: failed, lastSyncedAt: new Date() } };
  }
}
