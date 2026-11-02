import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQuery } from './dto/mobile.dto';
import { MobileContext } from './mobile-context.service';

type Cand = { key: string; type: string; title: string; body: string; actionLabel?: string; ref: Record<string, unknown>; action: boolean; open: boolean };
const full = (e: { firstName: string; lastName: string; displayName: string | null }) => e.displayName ?? `${e.firstName} ${e.lastName}`;

@Injectable()
export class MobileNotificationsService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService) {}

  /** Poll-on-read: derive notifications from the existing admin tables (no changes to those services). */
  private async sync(userId: string) {
    const { employee: e } = await this.ctx.actor(userId);
    const name = { equals: full(e), mode: 'insensitive' as const };
    const [jobs, edits, afr, fcr, tickets, closeouts] = await Promise.all([
      this.prisma.dispatchAssignment.findMany({ where: { employeeId: e.id, status: { in: ['POSTED', 'ACCEPTED', 'REASSIGNED'] }, createdAt: { gt: new Date(Date.now() - 30 * 86_400_000) } }, include: { workOrder: true }, take: 50 }),
      this.prisma.timeEditRequest.findMany({ where: { employeeId: e.id, status: { not: 'PENDING' } }, take: 50, orderBy: { updatedAt: 'desc' } }),
      this.prisma.additionalFormRequest.findMany({ where: { technicianName: name, status: { not: 'PENDING' } }, take: 50 }),
      this.prisma.formCorrectionRequest.findMany({ where: { submittedBy: name, status: { in: ['OPEN', 'NEEDS_INFO'] } }, take: 50 }),
      this.prisma.salesTicket.findMany({ where: { employeeId: e.id, status: 'RETURNED' }, take: 50 }),
      this.prisma.closeoutReview.findMany({ where: { submittedById: e.id, status: 'RETURNED' }, include: { workOrder: true }, take: 50 }),
    ]);
    const c: Cand[] = [];
    for (const j of jobs) {
      if (j.status === 'REASSIGNED') c.push({ key: `job:${j.id}:REASSIGNED`, type: 'JOB_REASSIGNED', title: 'Job reassigned', body: `${j.workOrder.code} was reassigned.`, ref: { type: 'JOB', id: j.id }, action: false, open: false });
      else c.push({ key: `job:${j.id}:POSTED`, type: 'NEW_JOB_ASSIGNED', title: 'New job assigned', body: `${j.workOrder.code} needs your response.`, actionLabel: 'Respond', ref: { type: 'JOB', id: j.id }, action: true, open: j.status === 'POSTED' });
    }
    for (const t of edits) {
      if (t.status === 'NEEDS_CLARIFICATION') c.push({ key: `tecl:${t.id}`, type: 'TIME_CORRECTION_NEEDS_INFO', title: 'More information needed', body: 'Your time edit request needs a reply.', actionLabel: 'Reply', ref: { type: 'EDIT_REQUEST', id: t.id }, action: true, open: true });
      else c.push({ key: `te:${t.id}:${t.status}`, type: t.status === 'APPROVED' ? 'TIME_CORRECTION_APPROVED' : 'TIME_CORRECTION_REJECTED', title: t.status === 'APPROVED' ? 'Time correction approved' : 'Time correction rejected', body: t.adminNote ?? `Edit for ${t.dateLabel} was ${t.status.toLowerCase()}.`, ref: { type: 'EDIT_REQUEST', id: t.id }, action: false, open: false });
    }
    for (const r of afr) {
      const type = r.status === 'DENIED' ? 'ADDITIONAL_FORM_DENIED' : r.status === 'NEEDS_INFO' ? 'ADDITIONAL_FORM_NEEDS_INFO' : 'ADDITIONAL_FORM_APPROVED';
      c.push({ key: `afr:${r.id}:${r.status}`, type, title: r.status === 'NEEDS_INFO' ? 'More info needed' : `Additional form ${r.status.toLowerCase().replace('_', ' ')}`, body: `${r.formRequested} — ${r.code}`, actionLabel: r.status === 'NEEDS_INFO' ? 'Reply' : undefined, ref: { type: 'ADDITIONAL_FORM_REQUEST', id: r.id }, action: r.status === 'NEEDS_INFO', open: r.status === 'NEEDS_INFO' });
    }
    for (const r of fcr) c.push({ key: `fcr:${r.id}`, type: 'FORM_CORRECTION_REQUESTED', title: 'Form correction requested', body: r.issueFlagged, actionLabel: 'Correct', ref: { type: 'FORM_CORRECTION', id: r.id }, action: true, open: true });
    for (const t of tickets) c.push({ key: `st:${t.id}:${t.returnedAt?.getTime() ?? 0}`, type: 'SALES_TICKET_NEEDS_CORRECTION', title: 'Sales ticket needs correction', body: t.returnNote ?? t.code, actionLabel: 'Correct', ref: { type: 'SALES_TICKET', id: t.id }, action: true, open: true });
    for (const r of closeouts) c.push({ key: `co:${r.id}:${r.decidedAt?.getTime() ?? 0}`, type: 'CLOSEOUT_NEEDS_REVIEW', title: 'Closeout needs review', body: r.decisionNote ?? r.workOrder.code, actionLabel: 'Review', ref: { type: 'CLOSEOUT', id: r.workOrderId }, action: true, open: true });

    for (const n of c) {
      await this.ctx.notify(userId, { dedupeKey: n.key, type: n.type, title: n.title, body: n.body, actionLabel: n.actionLabel, reference: n.ref, requiresAction: n.action });
      if (n.action && !n.open) await this.prisma.mobileNotification.updateMany({ where: { userId, dedupeKey: n.key }, data: { resolved: true } });
    }
  }

  private shape(n: Prisma.MobileNotificationGetPayload<object>) {
    return {
      id: n.id, type: n.type, title: n.title, body: n.body, actionLabel: n.actionLabel, reference: n.reference,
      requiresAction: n.requiresAction, resolved: n.resolved || (!n.requiresAction && n.readAt != null),
      read: n.readAt != null, createdAt: n.createdAt,
    };
  }

  /** NT-1 */
  async list(userId: string, q: NotificationsQuery) {
    await this.sync(userId);
    const tab = q.tab ?? 'ALL';
    const where: Prisma.MobileNotificationWhereInput = { userId };
    if (tab === 'UNREAD') where.readAt = null;
    if (tab === 'ACTION_REQUIRED') Object.assign(where, { requiresAction: true, resolved: false });
    if (tab === 'RESOLVED') where.OR = [{ resolved: true }, { requiresAction: false, readAt: { not: null } }];
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const [rows, total, unread] = await Promise.all([
      this.prisma.mobileNotification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.mobileNotification.count({ where }),
      this.prisma.mobileNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { data: { items: rows.map((r) => this.shape(r)), page, pageSize, total, unreadCount: unread } };
  }

  /** NT-2 */
  async unreadCount(userId: string) {
    await this.sync(userId);
    const [unread, action] = await Promise.all([
      this.prisma.mobileNotification.count({ where: { userId, readAt: null } }),
      this.prisma.mobileNotification.count({ where: { userId, requiresAction: true, resolved: false } }),
    ]);
    return { data: { unreadCount: unread, actionRequiredCount: action } };
  }

  /** NT-3 */
  async markRead(userId: string, id: string) {
    const n = await this.ctx.mustFind(this.prisma.mobileNotification.findFirst({ where: { id, userId } }), 'Notification');
    await this.prisma.mobileNotification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
    return { data: { id, read: true } };
  }

  /** NT-4 */
  async markAllRead(userId: string) {
    const r = await this.prisma.mobileNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { data: { updated: r.count } };
  }
}
