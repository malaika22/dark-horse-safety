import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EditRequestDto, EditRespondDto, EntryNotesDto, TimeOffCreateDto, TimeOffPreviewDto, TimesheetQuery } from './dto/mobile.dto';
import { MobileContext, dateOnly, isoDate, num } from './mobile-context.service';

const EDIT_REASONS = [
  { code: 'FORGOT_CLOCK_IN', label: 'Forgot to clock in' },
  { code: 'FORGOT_CLOCK_OUT', label: 'Forgot to clock out' },
  { code: 'WRONG_JOB', label: 'Clocked in to wrong job' },
  { code: 'GPS_ISSUE', label: 'GPS or connectivity issue' },
  { code: 'DEVICE_ISSUE', label: 'Device problem' },
  { code: 'OTHER', label: 'Other' },
];
const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const mins = (hm?: string | null) => (hm ? Number(hm.split(':')[0]) * 60 + Number(hm.split(':')[1]) : 0);
type Note = { id: string; text: string; at: string; by?: string };

@Injectable()
export class MobileTimeService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService) {}

  /** TS-1 */
  async payCycles(userId: string) {
    await this.ctx.actor(userId);
    const rows = await this.prisma.payCycle.findMany({ orderBy: { startDate: 'desc' }, take: 12 });
    return { data: { items: rows.map((c) => ({ id: c.id, label: c.label, code: c.code, startDate: isoDate(c.startDate), endDate: isoDate(c.endDate), status: c.status })) } };
  }

  private range(q: TimesheetQuery) {
    const today = dateOnly(new Date());
    if (q.from && q.to) return { from: dateOnly(new Date(q.from)), to: dateOnly(new Date(q.to)) };
    const dow = (today.getUTCDay() + 6) % 7; // Monday = 0
    const monday = new Date(today.getTime() - dow * 86_400_000);
    if (q.range === 'PREVIOUS_DAY') { const y = new Date(today.getTime() - 86_400_000); return { from: y, to: y }; }
    if (q.range === 'LAST_WEEK') return { from: new Date(monday.getTime() - 7 * 86_400_000), to: new Date(monday.getTime() - 86_400_000) };
    return { from: monday, to: new Date(monday.getTime() + 6 * 86_400_000) };
  }

  /** TS-2 */
  async timesheet(userId: string, q: TimesheetQuery) {
    const { employee: e } = await this.ctx.actor(userId);
    const { from, to } = this.range(q);
    const [rows, sick, edits] = await Promise.all([
      this.prisma.timeEntry.findMany({ where: { employeeId: e.id, archivedAt: null, workDate: { gte: from, lte: to } }, orderBy: [{ workDate: 'desc' }, { clockIn: 'desc' }] }),
      this.prisma.timeOffRequest.findMany({ where: { employeeId: e.id, type: 'SICK', status: 'APPROVED', archivedAt: null, startDate: { lte: to }, endDate: { gte: from } } }),
      this.prisma.timeEditRequest.findMany({ where: { employeeId: e.id, status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } }, select: { timeEntryId: true, status: true } }),
    ]);
    const pending = new Map(edits.map((x) => [x.timeEntryId, x.status]));
    const sum = (f: (r: (typeof rows)[number]) => boolean) => +rows.filter(f).reduce((s, r) => s + num(r.hours), 0).toFixed(1);
    return {
      data: {
        from: isoDate(from), to: isoDate(to),
        totals: {
          regularHours: sum((r) => r.category === 'REGULAR' || r.category === 'ON_JOB_TRAINING'),
          overtimeHours: sum((r) => r.category === 'OVERTIME'),
          nonBillableHours: sum((r) => r.category === 'NON_BILLABLE'),
          sickHours: +sick.reduce((s, r) => s + num(r.hoursRequested), 0).toFixed(1),
          totalHours: sum(() => true),
        },
        items: rows.map((r) => ({
          id: r.id, workDate: isoDate(r.workDate), clockIn: r.clockIn, clockOut: r.clockOut, hours: num(r.hours), category: r.category,
          workOrderCode: r.workOrderCode, customerName: r.customerName, status: r.status, locked: r.locked, gpsFlagged: r.gpsFlagged,
          editRequestStatus: pending.get(r.id) ?? null,
        })),
      },
    };
  }

  private async entry(userId: string, id: string) {
    const { employee } = await this.ctx.actor(userId);
    const t = await this.ctx.mustFind(this.prisma.timeEntry.findFirst({ where: { id, employeeId: employee.id } }), 'Time entry');
    return { employee, t };
  }

  /** TS-3 */
  async entryDetail(userId: string, id: string) {
    const { t } = await this.entry(userId, id);
    const pauses = await this.prisma.timeEntryPause.findMany({ where: { timeEntryId: id }, orderBy: { startedAt: 'asc' } });
    const billable = num(t.billableHours ?? (t.billable ? t.hours : 0));
    const nonBillable = num(t.nonBillableHours ?? (t.billable ? 0 : t.hours));
    return {
      data: {
        id: t.id, workDate: isoDate(t.workDate), clockIn: t.clockIn, clockOut: t.clockOut, category: t.category, status: t.status, locked: t.locked,
        workOrderCode: t.workOrderCode, customerName: t.customerName, jobLocation: t.jobLocation,
        hours: num(t.hours), billableMinutes: Math.round(billable * 60), nonBillableMinutes: Math.round(nonBillable * 60),
        nonBillableReason: t.nonBillableReason,
        gpsRecord: {
          flagged: t.gpsFlagged, label: t.gpsLabel,
          clockIn: t.clockInLat != null ? { lat: t.clockInLat, lng: t.clockInLng, distanceMi: t.clockInDistanceMi } : null,
          clockOut: t.clockOutLat != null ? { lat: t.clockOutLat, lng: t.clockOutLng, distanceMi: t.clockOutDistanceMi } : null,
          job: t.jobLat != null ? { lat: t.jobLat, lng: t.jobLng } : null,
          travelHours: t.travelHours != null ? num(t.travelHours) : null,
        },
        pauses: pauses.map((p) => ({ id: p.id, reason: p.reason, startedAt: p.startedAt, endedAt: p.endedAt })),
        activity: (t.editHistory as unknown[]) ?? [],
        notes: ((t.notes as Note[] | null) ?? []).filter((n) => n.by === 'EMPLOYEE' || n.by === undefined),
      },
    };
  }

  /** TS-7 */
  async saveNote(userId: string, id: string, dto: EntryNotesDto) {
    const { t } = await this.entry(userId, id);
    const notes = [...((t.notes as Note[] | null) ?? []).filter((n) => n.by !== 'EMPLOYEE'), ...(dto.notes.trim() ? [{ id: `n-${Date.now()}`, text: dto.notes.trim(), at: new Date().toISOString(), by: 'EMPLOYEE' }] : [])];
    await this.prisma.timeEntry.update({ where: { id }, data: { notes: notes as unknown as Prisma.InputJsonValue } });
    return { data: { saved: true } };
  }

  /** TS-8 */
  editReasons() { return { data: { items: EDIT_REASONS } }; }

  /** TS-4 */
  async createEdit(userId: string, dto: EditRequestDto) {
    const { employee, t } = await this.entry(userId, dto.timeEntryId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      if (t.locked || t.status === 'LOCKED') throw new HttpException({ code: 'ENTRY_LOCKED', message: 'This pay period is closed.' }, HttpStatus.LOCKED);
      const open = await this.prisma.timeEditRequest.findFirst({ where: { timeEntryId: t.id, status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } } });
      if (open) throw new ConflictException({ code: 'EDIT_ALREADY_PENDING', message: 'An edit request is already pending for this entry.' });
      if (!dto.requestedClockIn && !dto.requestedClockOut) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Provide a new clock-in or clock-out time.' });
      const reason = EDIT_REASONS.find((r) => r.code === dto.reasonCode)?.label ?? dto.reasonCode;
      const inT = dto.requestedClockIn ?? t.clockIn;
      const outT = dto.requestedClockOut ?? t.clockOut;
      const reqHours = outT && inT ? +(((mins(outT) - mins(inT) + 1440) % 1440) / 60).toFixed(1) : null;
      const delta = reqHours != null ? +(reqHours - num(t.hours)).toFixed(1) : 0;
      const row = await this.prisma.timeEditRequest.create({
        data: {
          employeeId: employee.id, timeEntryId: t.id, workDate: t.workDate, dateLabel: short(t.workDate), cycleLabel: t.cycleLabel,
          workOrderCode: t.workOrderCode, customerName: t.customerName,
          type: dto.requestedClockIn ? 'CLOCK_IN_CHANGE' : 'CLOCK_OUT_CHANGE',
          deltaHours: delta, deltaLabel: `${delta >= 0 ? '+' : ''}${delta}h`,
          originalClockIn: t.clockIn, originalClockOut: t.clockOut, originalHours: t.hours,
          requestedClockIn: dto.requestedClockIn, requestedClockOut: dto.requestedClockOut, requestedHours: reqHours,
          technicianReason: dto.notes ? `${reason}: ${dto.notes}` : reason,
          gpsContext: t.gpsLabel,
        },
      });
      await this.prisma.timeEntry.update({ where: { id: t.id }, data: { correctionRequested: true } });
      return { data: { id: row.id, status: row.status } };
    });
  }

  /** TS-5 */
  async listEdits(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const rows = await this.prisma.timeEditRequest.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { data: { items: rows.map((r) => ({ id: r.id, timeEntryId: r.timeEntryId, workDate: isoDate(r.workDate), status: r.status, originalClockIn: r.originalClockIn, originalClockOut: r.originalClockOut, requestedClockIn: r.requestedClockIn, requestedClockOut: r.requestedClockOut, deltaLabel: r.deltaLabel, reason: r.technicianReason, adminNote: r.adminNote, needsClarification: r.status === 'NEEDS_CLARIFICATION', createdAt: r.createdAt })) } };
  }

  /** TS-6 */
  async respondEdit(userId: string, id: string, dto: EditRespondDto) {
    const { employee } = await this.ctx.actor(userId);
    const r = await this.ctx.mustFind(this.prisma.timeEditRequest.findFirst({ where: { id, employeeId: employee.id } }), 'Edit request');
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      if (r.status !== 'NEEDS_CLARIFICATION') throw new ConflictException({ code: 'INVALID_STATE', message: 'No clarification was requested.' });
      await this.prisma.timeEditRequest.update({
        where: { id },
        data: { status: 'PENDING', needsClarification: false, technicianReason: `${r.technicianReason ?? ''}\nReply: ${dto.message}${dto.attachmentUrl ? ` (attachment ${dto.attachmentUrl})` : ''}`.trim() },
      });
      return { data: { id, status: 'PENDING' } };
    });
  }

  // ── Time off ──
  /** TO-1 */
  async balances(userId: string) {
    const { employee: e } = await this.ctx.actor(userId);
    return { data: { PTO: { balance: num(e.ptoBalance), annual: num(e.ptoAnnual), used: num(e.ptoUsed), scheduled: num(e.ptoScheduled) }, SICK: { balance: num(e.sickBalance), annual: num(e.sickAnnual), used: num(e.sickUsed) }, HOLIDAY: { balance: num(e.holidayBalance), observed: num(e.holidayObserved), taken: num(e.holidayTaken) } } };
  }

  /** TO-2 */
  async listOff(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const rows = await this.prisma.timeOffRequest.findMany({ where: { employeeId: employee.id, archivedAt: null }, orderBy: { startDate: 'desc' }, take: 100 });
    return { data: { items: rows.map((r) => ({ id: r.id, type: r.type, status: r.status, startDate: isoDate(r.startDate), endDate: isoDate(r.endDate), dayCount: r.dayCount, hoursRequested: num(r.hoursRequested), reason: r.reason, adminNote: r.adminNote, requestedAt: r.requestedAt })) } };
  }

  private calc(e: { ptoBalance: unknown; sickBalance: unknown; holidayBalance: unknown }, dto: TimeOffPreviewDto) {
    const s = dateOnly(new Date(dto.startAt));
    const en = dateOnly(new Date(dto.endAt));
    if (en < s) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'End must not be before start.' });
    const days = Math.round((en.getTime() - s.getTime()) / 86_400_000) + 1;
    const hours = dto.partialDay ? dto.partialHours ?? 4 : days * 8;
    const bal = dto.type === 'PTO' ? num(e.ptoBalance) : dto.type === 'SICK' ? num(e.sickBalance) : dto.type === 'HOLIDAY' ? num(e.holidayBalance) : null;
    return { s, en, days, hours, bal, after: bal === null ? null : +(bal - hours).toFixed(1) };
  }

  /** TO-3 */
  async preview(userId: string, dto: TimeOffPreviewDto) {
    const { employee } = await this.ctx.actor(userId);
    const c = this.calc(employee, dto);
    return { data: { dayCount: c.days, hoursRequested: c.hours, balanceBefore: c.bal, balanceAfter: c.after, sufficient: c.after === null || c.after >= 0 } };
  }

  /** TO-4 */
  async createOff(userId: string, dto: TimeOffCreateDto) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const c = this.calc(employee, dto);
      if (c.after !== null && c.after < 0) throw new UnprocessableEntityException({ code: 'INSUFFICIENT_BALANCE', message: 'Not enough balance for this request.' });
      const row = await this.prisma.timeOffRequest.create({
        data: {
          employeeId: employee.id, type: dto.type as never, startDate: c.s, endDate: c.en, startLabel: short(c.s), endLabel: short(c.en),
          dayCount: c.days, hoursRequested: c.hours, balanceAfter: c.after, durationMode: dto.partialDay ? 'PARTIAL' : 'ALL_DAY',
          partialHours: dto.partialDay ? c.hours : undefined, reason: dto.reason, requestedLabel: short(new Date()),
          attachments: dto.signatureUrl ? [{ kind: 'SIGNATURE', url: dto.signatureUrl }] : undefined,
        },
      });
      return { data: { id: row.id, status: row.status } };
    });
  }

  /** TO-5 */
  async cancelOff(userId: string, id: string) {
    const { employee } = await this.ctx.actor(userId);
    const r = await this.ctx.mustFind(this.prisma.timeOffRequest.findFirst({ where: { id, employeeId: employee.id, archivedAt: null } }), 'Request');
    if (r.status !== 'PENDING') throw new ConflictException({ code: 'INVALID_STATE', message: 'Only pending requests can be cancelled.' });
    await this.prisma.timeOffRequest.update({ where: { id }, data: { archivedAt: new Date() } });
    return { data: { id, cancelled: true } };
  }
}
