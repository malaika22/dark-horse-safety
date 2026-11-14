import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdditionalFormDto, AdditionalFormRespondDto, CorrectionResubmitDto, FormSubmitDto, FormsQuery } from './dto/mobile.dto';
import { MobileContext, MobileActor } from './mobile-context.service';
import { MobileSettingsLink } from './mobile-settings-link.service';

type Hist = { when: string; text: string }[];
const full = (e: { firstName: string; lastName: string; displayName: string | null }) => e.displayName ?? `${e.firstName} ${e.lastName}`;

@Injectable()
export class MobileFormsService {
  constructor(private readonly ctx: MobileContext, private readonly prisma: PrismaService, private readonly link: MobileSettingsLink) {}

  /** FM-1 */
  async list(userId: string, q: FormsQuery) {
    const { employee: e } = await this.ctx.actor(userId);
    const tab = q.tab ?? 'REQUIRED';
    const forms = await this.prisma.safetyForm.findMany({ where: { status: 'ACTIVE' }, orderBy: { title: 'asc' } });
    const subs = await this.prisma.safetyFormSubmission.findMany({
      where: { submittedById: e.id, ...(q.workOrderId ? { workOrderId: q.workOrderId } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const required = new Set<string>();
    if (q.workOrderId) {
      const wo = await this.prisma.workOrder.findUnique({ where: { id: q.workOrderId } });
      if (wo) {
        const names = await this.link.requiredFormNames(wo.id, wo.customerId);
        for (const name of names) required.add(name.toLowerCase());
      }
    }
    const isReq = (f: { title: string; code: string }) => {
      const title = f.title.toLowerCase();
      const code = f.code.toLowerCase();
      if (required.has(title) || required.has(code)) return true;
      for (const name of required) {
        if (title.includes(name) || name.includes(title) || code.includes(name)) return true;
      }
      return false;
    };
    const doneIds = new Set(subs.filter((s) => s.status !== 'DRAFT').map((s) => s.formId));
    const draftIds = new Set(subs.filter((s) => s.status === 'DRAFT').map((s) => s.formId));
    const form = (f: (typeof forms)[number]) => ({ formId: f.id, code: f.code, title: f.title, version: f.version, required: isReq(f) });

    if (tab === 'SUBMITTED' || tab === 'DRAFT') {
      const want = subs.filter((s) => (tab === 'DRAFT' ? s.status === 'DRAFT' : s.status !== 'DRAFT'));
      return {
        data: { items: want.map((s) => ({ submissionId: s.id, code: s.code, formId: s.formId, status: s.status, workOrderCode: s.workOrderCode, submittedAt: s.submittedAt, updatedAt: s.updatedAt })) },
      };
    }
    const pool = forms.filter((f) => !doneIds.has(f.id) && !draftIds.has(f.id));
    const items = pool.filter((f) => (tab === 'REQUIRED' ? isReq(f) : !isReq(f))).map(form);
    return { data: { items } };
  }

  /** FM-2 */
  async template(formId: string) {
    const f = await this.ctx.mustFind(this.prisma.safetyForm.findFirst({ where: { OR: [{ id: formId }, { code: formId }], status: 'ACTIVE' } }), 'Form');
    return { data: { formId: f.id, code: f.code, title: f.title, version: f.version, definition: f.definition } };
  }

  private async persist(actor: MobileActor, formId: string, dto: FormSubmitDto, status: 'DRAFT' | 'SUBMITTED') {
    const f = await this.ctx.mustFind(this.prisma.safetyForm.findFirst({ where: { OR: [{ id: formId }, { code: formId }], status: 'ACTIVE' } }), 'Form');
    const wo = dto.workOrderId ? await this.prisma.workOrder.findUnique({ where: { id: dto.workOrderId }, include: { customer: true, location: true } }) : null;
    const meta = {
      employee: full(actor.employee),
      signatureUrl: dto.signatureUrl ?? null,
      capturedAt: dto.capturedAt ?? new Date().toISOString(),
      gps: dto.lat != null ? { lat: dto.lat, lng: dto.lng } : null,
      source: 'MOBILE',
    } as Prisma.InputJsonValue;
    const base = {
      workOrderId: wo?.id, workOrderCode: wo?.code, customerName: wo?.customer.name, locationLabel: wo?.location?.name,
      values: dto.values as Prisma.InputJsonValue, meta, status,
      submittedById: actor.employee.id, submittedByName: full(actor.employee),
      submittedAt: status === 'SUBMITTED' ? new Date() : null,
    };
    const draft = await this.prisma.safetyFormSubmission.findFirst({ where: { formId: f.id, submittedById: actor.employee.id, workOrderId: wo?.id ?? null, status: 'DRAFT' } });
    const row = draft
      ? await this.prisma.safetyFormSubmission.update({ where: { id: draft.id }, data: base })
      : await this.prisma.safetyFormSubmission.create({ data: { code: `SFS-M-${Date.now().toString(36).toUpperCase()}`, formId: f.id, ...base } });
    return { data: { submissionId: row.id, code: row.code, status: row.status } };
  }

  /** FM-3 */
  async saveDraft(userId: string, formId: string, dto: FormSubmitDto) {
    const a = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () => this.persist(a, formId, dto, 'DRAFT'));
  }
  /** FM-4 */
  async submit(userId: string, formId: string, dto: FormSubmitDto) {
    const a = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () => this.persist(a, formId, dto, 'SUBMITTED'));
  }

  /** FM-5 */
  async submission(userId: string, id: string) {
    const { employee } = await this.ctx.actor(userId);
    const s = await this.ctx.mustFind(this.prisma.safetyFormSubmission.findFirst({ where: { id, submittedById: employee.id }, include: { form: true } }), 'Submission');
    return { data: { submissionId: s.id, code: s.code, status: s.status, form: { id: s.formId, title: s.form.title, definition: s.form.definition }, values: s.values, meta: s.meta, submittedAt: s.submittedAt } };
  }

  /** FM-6 */
  async corrections(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const rows = await this.prisma.formCorrectionRequest.findMany({
      where: { submittedBy: { equals: full(employee), mode: 'insensitive' }, status: { in: ['OPEN', 'NEEDS_INFO'] } },
      orderBy: { createdAt: 'desc' },
    });
    return { data: { items: rows.map((r) => ({ id: r.id, code: r.code, formTitle: r.formTitle, workOrderId: r.workOrderId, customerName: r.customerName, issueFlagged: r.issueFlagged, instruction: r.correctionInstruction, status: r.status, createdAt: r.createdAt })) } };
  }

  /** FM-7 */
  async resubmit(userId: string, id: string, dto: CorrectionResubmitDto) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const r = await this.ctx.mustFind(this.prisma.formCorrectionRequest.findFirst({ where: { id, submittedBy: { equals: full(employee), mode: 'insensitive' } } }), 'Correction request');
      if (r.status !== 'OPEN' && r.status !== 'NEEDS_INFO') throw new ConflictException({ code: 'INVALID_STATE', message: `Request is ${r.status}.` });
      await this.prisma.formCorrectionRequest.update({
        where: { id },
        data: { status: 'RESUBMITTED', resubmission: { version: r.version, resubmittedBy: full(employee), submitted: new Date().toISOString(), status: 'RESUBMITTED', values: dto.values, note: dto.note ?? null } as Prisma.InputJsonValue },
      });
      await this.prisma.mobileNotification.updateMany({ where: { userId, dedupeKey: `fcr:${id}` }, data: { resolved: true } });
      return { data: { id, status: 'RESUBMITTED' } };
    });
  }

  // ── Additional form requests (scope change) ──
  /** SC-1 */
  async createAdditional(userId: string, dto: AdditionalFormDto) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      const wo = await this.ctx.mustFind(this.prisma.workOrder.findUnique({ where: { id: dto.workOrderId }, include: { customer: true, location: true } }), 'Work order');
      const stopped = dto.urgency === 'HIGH_WORK_STOPPED';
      const now = new Date().toISOString();
      const row = await this.prisma.additionalFormRequest.create({
        data: {
          code: `AFR-M-${Date.now().toString(36).toUpperCase()}`,
          workOrderId: wo.id, customerName: wo.customer.name, locationLabel: wo.location?.name ?? '—',
          technicianName: full(employee), formRequested: dto.formType,
          reasonShort: dto.reason.slice(0, 120), reason: dto.scopeChangeDescription,
          urgency: stopped ? 'HIGH' : (dto.urgency as 'LOW' | 'MEDIUM' | 'HIGH'),
          rule: 'Mobile scope change',
          history: [{ when: now, text: `Requested by ${full(employee)}${stopped ? ' — WORK STOPPED' : ''}: ${dto.reason}` }, ...(dto.photoUrl ? [{ when: now, text: `Photo: ${dto.photoUrl}` }] : [])] as Prisma.InputJsonValue,
        },
      });
      return { data: { id: row.id, code: row.code, status: row.status } };
    });
  }

  private async ownRequest(userId: string, id: string) {
    const { employee } = await this.ctx.actor(userId);
    return this.ctx.mustFind(this.prisma.additionalFormRequest.findFirst({ where: { id, technicianName: { equals: full(employee), mode: 'insensitive' } } }), 'Request');
  }

  /** SC-2 */
  async listAdditional(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const rows = await this.prisma.additionalFormRequest.findMany({ where: { technicianName: { equals: full(employee), mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { data: { items: rows.map((r) => ({ id: r.id, code: r.code, workOrderId: r.workOrderId, formRequested: r.formRequested, urgency: r.urgency, status: r.status, createdAt: r.createdAt })) } };
  }

  /** SC-5 */
  async getAdditional(userId: string, id: string) {
    const r = await this.ownRequest(userId, id);
    return { data: { id: r.id, code: r.code, formRequested: r.formRequested, reason: r.reason, urgency: r.urgency, status: r.status, reviewer: r.reviewer, timeline: r.history as Hist, newFormAvailable: r.status === 'FORM_ADDED' || r.status === 'APPROVED' } };
  }

  /** SC-4 */
  async respondAdditional(userId: string, id: string, dto: AdditionalFormRespondDto) {
    const r = await this.ownRequest(userId, id);
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      if (r.status !== 'NEEDS_INFO') throw new BadRequestException({ code: 'INVALID_STATE', message: 'This request is not waiting for more information.' });
      const history = [...((r.history as Hist) ?? []), { when: new Date().toISOString(), text: `Technician replied: ${dto.message}${dto.attachmentUrl ? ` (attachment ${dto.attachmentUrl})` : ''}` }];
      await this.prisma.additionalFormRequest.update({ where: { id }, data: { status: 'PENDING', history: history as unknown as Prisma.InputJsonValue } });
      await this.prisma.mobileNotification.updateMany({ where: { userId, dedupeKey: `afr:${id}:NEEDS_INFO` }, data: { resolved: true } });
      return { data: { id, status: 'PENDING' } };
    });
  }
}
