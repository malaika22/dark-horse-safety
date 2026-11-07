import { BadRequestException, ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloseoutDto, DeclineDto, JobsQuery, NoteDto, SalesTicketDto } from './dto/mobile.dto';
import { MobileContext, dateOnly, haversineMeters, isoDate, num } from './mobile-context.service';

const include = { workOrder: { include: { customer: true, location: true } } } satisfies Prisma.DispatchAssignmentInclude;
type Row = Prisma.DispatchAssignmentGetPayload<{ include: typeof include }>;

@Injectable()
export class MobileJobsService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService) {}

  private card(a: Row) {
    return {
      assignmentId: a.id,
      workOrderId: a.workOrderId,
      workOrderCode: a.workOrder.code,
      title: a.workOrder.title,
      customer: a.workOrder.customer.name,
      location: a.workOrder.location?.name ?? null,
      scheduledDate: isoDate(a.scheduledDate),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      jobType: a.jobType,
    };
  }

  /** JB-1 */
  async list(userId: string, q: JobsQuery) {
    const { employee: e } = await this.ctx.actor(userId);
    const today = dateOnly(new Date());
    const week = new Date(today.getTime() - 7 * 86_400_000);
    const tab = q.tab ?? 'ASSIGNED';
    const base: Prisma.DispatchAssignmentWhereInput = { employeeId: e.id };
    const where: Prisma.DispatchAssignmentWhereInput =
      tab === 'ASSIGNED' ? { ...base, status: 'POSTED' }
      : tab === 'ACCEPTED' ? { ...base, status: 'ACCEPTED', scheduledDate: { gte: today } }
      : tab === 'RECENT' ? { ...base, scheduledDate: { gte: week, lte: today }, status: { in: ['ACCEPTED', 'DECLINED', 'REASSIGNED', 'CANCELLED'] } }
      : { ...base, status: 'ACCEPTED', workOrder: { closeoutReviews: { some: {} } } };
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const [rows, total] = await Promise.all([
      this.prisma.dispatchAssignment.findMany({ where, include, orderBy: { scheduledDate: tab === 'ASSIGNED' || tab === 'ACCEPTED' ? 'asc' : 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.dispatchAssignment.count({ where }),
    ]);
    return { data: { items: rows.map((r) => this.card(r)), page, pageSize, total } };
  }

  private async own(userId: string, id: string) {
    const { employee } = await this.ctx.actor(userId);
    const a = await this.ctx.mustFind(this.prisma.dispatchAssignment.findFirst({ where: { id, employeeId: employee.id }, include }), 'Job');
    return { employee, a };
  }

  /** JB-2 */
  async detail(userId: string, id: string) {
    const { employee, a } = await this.own(userId, id);
    const [profile, supervisor] = await Promise.all([
      this.prisma.mobileProfile.findUnique({ where: { userId } }),
      employee.supervisorId ? this.prisma.employee.findUnique({ where: { id: employee.supervisorId } }) : null,
    ]);
    const loc = a.workOrder.location;
    const dist = profile?.homeLat != null && loc?.latitude != null && loc.longitude != null
      ? Math.round(haversineMeters(profile.homeLat, profile.homeLng!, loc.latitude, loc.longitude)) : null;
    const expired = a.status === 'POSTED' && a.scheduledDate < dateOnly(new Date());
    return {
      data: {
        ...this.card(a),
        outcome: expired ? 'EXPIRED' : a.status === 'ACCEPTED' ? 'ACCEPTED' : a.status === 'DECLINED' ? 'DECLINED' : a.status === 'REASSIGNED' ? 'REASSIGNED' : null,
        notes: a.notes ?? a.workOrder.notes,
        site: loc ? { name: loc.name, county: loc.county, state: loc.state, lat: loc.latitude, lng: loc.longitude, accessNotes: loc.accessNotes, musterPoint: loc.musterPoint, siteContact: loc.siteContact } : null,
        h2sRequired: /h2s/i.test(`${a.workOrder.title ?? ''} ${a.notes ?? ''}`),
        certificationWarning: a.conflictKind === 'CERT' ? a.conflictLabel : null,
        distanceFromHomeMeters: dist,
        supervisor: supervisor ? { name: `${supervisor.firstName} ${supervisor.lastName}`, phone: supervisor.phone } : null,
        respondBy: a.status === 'POSTED' ? a.scheduledDate : null,
      },
    };
  }

  /** JB-3 */
  async accept(userId: string, id: string, clientRequestId?: string) {
    const { a } = await this.own(userId, id);
    return this.ctx.idempotent(userId, clientRequestId, async () => {
      if (a.status !== 'POSTED') throw new ConflictException({ code: 'INVALID_STATE', message: `Job is ${a.status}, not awaiting a response.` });
      const now = new Date();
      const updated = await this.prisma.dispatchAssignment.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: now, responseMinutes: a.postedAt ? Math.max(0, Math.round((now.getTime() - a.postedAt.getTime()) / 60000)) : null },
      });
      return { data: { assignmentId: id, status: updated.status, acceptedAt: updated.acceptedAt } };
    });
  }

  /** JB-4 */
  async decline(userId: string, id: string, dto: DeclineDto) {
    const { a } = await this.own(userId, id);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      if (a.status !== 'POSTED') throw new ConflictException({ code: 'INVALID_STATE', message: `Job is ${a.status}, not awaiting a response.` });
      if (dto.reason === 'OTHER' && !dto.notes?.trim()) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Notes are required for OTHER.', details: { notes: 'Required' } });
      const updated = await this.prisma.dispatchAssignment.update({
        where: { id },
        data: { status: 'DECLINED', declinedAt: new Date(), declineReason: dto.notes ? `${dto.reason}: ${dto.notes}` : dto.reason },
      });
      return { data: { assignmentId: id, status: updated.status, declinedAt: updated.declinedAt } };
    });
  }

  /** JB-7 */
  async requestHelp(userId: string, id: string, dto: NoteDto) {
    const { employee, a } = await this.own(userId, id);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const row = await this.prisma.supervisorMessage.create({
        data: { userId, employeeId: employee.id, supervisorId: employee.supervisorId, kind: 'JOB_HELP', subject: a.workOrder.code, body: dto.note ?? 'Help requested', workOrderId: a.workOrderId },
      });
      return { data: { id: row.id, sentAt: row.createdAt } };
    });
  }

  // ── Closeout & sales ticket ──
  private async ticketFor(workOrderId: string, employeeId: string) {
    return this.prisma.salesTicket.findFirst({ where: { workOrderId, employeeId }, orderBy: { createdAt: 'desc' } });
  }

  private async requiredFormsMissing(workOrderId: string, customerId: string) {
    const rules = await this.prisma.formRule.findMany({ where: { customerId, status: 'ACTIVE', required: true } });
    const subs = await this.prisma.safetyFormSubmission.findMany({ where: { workOrderId, status: { in: ['SUBMITTED', 'LOCKED'] } }, include: { form: true } });
    const done = new Set(subs.flatMap((s) => [s.form.title.toLowerCase(), s.form.code.toLowerCase()]));
    return rules.filter((r) => !done.has(r.formTemplate.toLowerCase())).map((r) => r.formTemplate);
  }

  /** CO-1 */
  async closeout(userId: string, id: string) {
    const { employee, a } = await this.own(userId, id);
    const [entries, ticket, review, missing] = await Promise.all([
      this.prisma.timeEntry.findMany({ where: { employeeId: employee.id, workOrderCode: a.workOrder.code } }),
      this.ticketFor(a.workOrderId, employee.id),
      this.prisma.closeoutReview.findUnique({ where: { workOrderId: a.workOrderId } }),
      this.requiredFormsMissing(a.workOrderId, a.workOrder.customerId),
    ]);
    const flagged = [
      ...missing.map((m) => ({ code: 'FORM_MISSING', message: `${m} not submitted` })),
      ...(ticket ? [] : [{ code: 'SALES_TICKET_MISSING', message: 'Sales ticket not created' }]),
    ];
    return {
      data: {
        workOrderCode: a.workOrder.code,
        status: review ? review.status : 'NOT_SUBMITTED',
        hoursWorked: entries.reduce((s, t) => s + num(t.hours), 0),
        salesTicket: ticket ? { id: ticket.id, code: ticket.code, status: ticket.status, amount: num(ticket.submittedValue) } : null,
        formsMissing: missing,
        flaggedItems: flagged,
        canSubmit: flagged.length === 0,
      },
    };
  }

  /** CO-2 */
  async submitCloseout(userId: string, id: string, dto: CloseoutDto) {
    const { employee, a } = await this.own(userId, id);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const summary = (await this.closeout(userId, id)).data;
      if (!summary.canSubmit) {
        throw new UnprocessableEntityException({ code: 'CLOSEOUT_INCOMPLETE', message: 'Closeout has blocking items.', details: { items: summary.flaggedItems } });
      }
      const ticket = await this.ticketFor(a.workOrderId, employee.id);
      const data = {
        customerId: a.workOrder.customerId,
        submittedById: employee.id,
        serviceDate: a.scheduledDate,
        locationLabel: a.workOrder.location?.name,
        status: 'PENDING' as const,
        decisionNote: dto.notes,
        salesTicketId: ticket?.id,
        salesTotal: ticket ? ticket.submittedValue : undefined,
        photos: dto.signatureUrl ? [{ label: 'Signature', locked: true, url: dto.signatureUrl }] : undefined,
      };
      const review = await this.prisma.closeoutReview.upsert({
        where: { workOrderId: a.workOrderId },
        create: { workOrderId: a.workOrderId, ...data },
        update: data,
      });
      return { data: { id: review.id, status: 'SUBMITTED' } };
    });
  }

  /** CO-3 */
  async closeoutStatus(userId: string, id: string) {
    const { a } = await this.own(userId, id);
    const r = await this.prisma.closeoutReview.findUnique({ where: { workOrderId: a.workOrderId } });
    if (!r) return { data: { status: 'NOT_SUBMITTED', flaggedItems: [] } };
    const status = r.status === 'ACCEPTED' ? 'APPROVED' : r.status === 'RETURNED' ? 'NEEDS_REVIEW' : 'SUBMITTED';
    return { data: { status, decisionNote: r.decisionNote, flaggedItems: (r.flags as unknown[]) ?? [] } };
  }

  private async writeTicket(userId: string, id: string, dto: SalesTicketDto, mode: 'create' | 'correct') {
    const { employee, a } = await this.own(userId, id);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const hours = dto.lineItems.reduce((s, l) => s + l.hours, 0);
      const value = dto.lineItems.reduce((s, l) => s + l.hours * l.rate, 0);
      const existing = await this.ticketFor(a.workOrderId, employee.id);
      const detail = { lines: dto.lineItems, notes: dto.notes ?? null };
      if (mode === 'create' && existing) throw new ConflictException({ code: 'ALREADY_EXISTS', message: 'A sales ticket already exists. Use PUT to correct it.' });
      if (mode === 'correct' && !existing) throw new ConflictException({ code: 'NOT_FOUND', message: 'No sales ticket to correct.' });
      const first = dto.lineItems[0];
      const common = {
        serviceItem: dto.lineItems.map((l) => l.item).join(', ').slice(0, 250) || 'Service',
        submittedRate: first?.rate ?? 0,
        submittedHours: +hours.toFixed(1),
        submittedValue: +value.toFixed(2),
        detailPacket: detail as unknown as Prisma.InputJsonValue,
      };
      const t = existing
        ? await this.prisma.salesTicket.update({ where: { id: existing.id }, data: { ...common, status: 'SUBMITTED', returnNote: null } })
        : await this.prisma.salesTicket.create({
            data: { code: `ST-M-${Date.now().toString(36).toUpperCase()}`, workOrderId: a.workOrderId, customerId: a.workOrder.customerId, employeeId: employee.id, ...common },
          });
      await this.prisma.mobileNotification.updateMany({ where: { userId, type: 'SALES_TICKET_NEEDS_CORRECTION', dedupeKey: { startsWith: `st:${t.id}` } }, data: { resolved: true } });
      return { data: { id: t.id, code: t.code, status: t.status, amount: num(t.submittedValue) } };
    });
  }

  /** ST-1 */
  createTicket(userId: string, id: string, dto: SalesTicketDto) { return this.writeTicket(userId, id, dto, 'create'); }
  /** ST-2 */
  correctTicket(userId: string, id: string, dto: SalesTicketDto) { return this.writeTicket(userId, id, dto, 'correct'); }
}
