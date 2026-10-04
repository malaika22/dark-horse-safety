import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AdditionalFormStatus,
  AdditionalFormUrgency,
  FormCorrectionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type HistoryEntry = { when: string; text: string };

type Resubmission = {
  version: string;
  resubmittedBy: string;
  submitted: string;
  status: string;
};

function asciiSafe(s: string) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[·•]/g, ' - ')
    .replace(/[—–−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f.charAt(0).toUpperCase()}. ${l.toUpperCase()}`;
  return (f || l || 'UNASSIGNED').toUpperCase();
}

function fmtWhen(d: Date) {
  return d
    .toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    })
    .replace(',', '')
    .toUpperCase();
}

function fmtDay(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    })
    .toUpperCase();
}

function ageLabel(from: Date) {
  const ms = Math.max(0, Date.now() - from.getTime());
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (days >= 1) return `${days} DAY${days === 1 ? '' : 'S'}`;
  if (h >= 1) return `${h}H ${String(m % 60).padStart(2, '0')}M`;
  return `${Math.max(m, 1)}M`;
}

function historyOf(value: Prisma.JsonValue | null): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>;
      return {
        when: String(row.when ?? ''),
        text: String(row.text ?? ''),
      };
    });
}

function resubmissionOf(value: Prisma.JsonValue | null): Resubmission | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!row.version) return null;
  return {
    version: String(row.version),
    resubmittedBy: String(row.resubmittedBy ?? ''),
    submitted: String(row.submitted ?? ''),
    status: String(row.status ?? ''),
  };
}

function formAbbrev(title: string) {
  const t = title.toUpperCase();
  if (t.includes('PERMIT TO WORK') || t.includes('PTW')) return 'PTW';
  if (t.includes('CONFINED')) return 'CSE';
  if (t.includes('HOT WORK')) return 'HWP';
  if (t.includes('AIR QUALITY')) return 'AIR QUALITY';
  if (t.includes('RIG')) return 'RIG INSP';
  if (t.includes('JSA') || t.includes('JOB SAFETY')) return 'JSA';
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 12);
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('');
}

@Injectable()
export class FormRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private statusLabel(status: string) {
    return status.replace(/_/g, ' ');
  }

  private async ensurePersisted() {
    const [corrCount, addCount] = await Promise.all([
      this.prisma.formCorrectionRequest.count(),
      this.prisma.additionalFormRequest.count(),
    ]);
    if (corrCount > 0 && addCount > 0) return;

    const workOrders = await this.prisma.workOrder.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        customer: { select: { name: true } },
        location: { select: { name: true, county: true } },
        assignedRep: { select: { firstName: true, lastName: true } },
        dispatchAssignments: {
          take: 2,
          orderBy: { updatedAt: 'desc' },
          include: {
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!workOrders.length) return;

    const [employees, safetyForms, submissions] = await Promise.all([
      this.prisma.employee.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { firstName: true, lastName: true, roleTitle: true },
      }),
      this.prisma.safetyForm.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { title: true, version: true },
      }),
      this.prisma.safetyFormSubmission.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: { form: { select: { title: true, version: true } } },
      }),
    ]);

    const techNames = employees.length
      ? employees.map((e) => shortName(e.firstName, e.lastName))
      : workOrders.map((w) => {
          const emp = w.dispatchAssignments[0]?.employee;
          return emp
            ? shortName(emp.firstName, emp.lastName)
            : shortName(w.assignedRep?.firstName, w.assignedRep?.lastName);
        });

    const reviewers = employees
      .filter((e) => /admin|super|ops|dispatch|manager/i.test(e.roleTitle ?? ''))
      .map((e) => shortName(e.firstName, e.lastName));
    if (!reviewers.length && techNames.length > 1) {
      reviewers.push(techNames[techNames.length - 1]!);
    }

    const formTitles = [
      ...safetyForms.map((f) => f.title.toUpperCase()),
      ...submissions.map((s) => s.form.title.toUpperCase()),
    ].filter(Boolean);
    const uniqueForms = [...new Set(formTitles)];
    if (!uniqueForms.length) {
      uniqueForms.push(
        'JSA',
        'PERMIT TO WORK',
        'CONFINED SPACE ENTRY',
        'AIR QUALITY REPORT',
      );
    }

    const corrStatuses: FormCorrectionStatus[] = [
      'OPEN',
      'RESUBMITTED',
      'APPROVED',
      'REJECTED',
      'NEEDS_INFO',
    ];
    const addStatuses: AdditionalFormStatus[] = [
      'PENDING',
      'PENDING',
      'APPROVED',
      'DENIED',
      'NEEDS_INFO',
      'FORM_ADDED',
    ];
    const urgencies: AdditionalFormUrgency[] = ['HIGH', 'MEDIUM', 'LOW'];

    if (corrCount === 0) {
      await this.prisma.formCorrectionRequest.createMany({
        data: workOrders.slice(0, 6).map((wo, i) => {
          const formTitle = uniqueForms[i % uniqueForms.length]!;
          const tech = techNames[i % techNames.length]!;
          const reviewer =
            reviewers[i % Math.max(reviewers.length, 1)] ?? techNames[0]!;
          const status = corrStatuses[i % corrStatuses.length]!;
          const loc =
            wo.location?.name || wo.location?.county || wo.title || wo.code;
          const issue =
            submissions[i]?.workOrderCode === wo.code
              ? `INCOMPLETE FIELDS ON ${formTitle} FOR ${asciiSafe(String(loc).toUpperCase())}.`
              : `${formTitle} IS MISSING REQUIRED CONTROLS ON ${asciiSafe(String(loc).toUpperCase())}.`;
          const resubmission =
            status === 'RESUBMITTED' || status === 'APPROVED'
              ? {
                  version: `V${i + 2} (ADDENDUM)`,
                  resubmittedBy: tech,
                  submitted: fmtWhen(wo.updatedAt),
                  status:
                    status === 'APPROVED' ? 'APPROVED' : 'READY FOR REVIEW',
                }
              : undefined;
          return {
            code: `FCR-${String(i + 1).padStart(2, '0')}`,
            formLabel: formAbbrev(formTitle),
            formTitle: asciiSafe(formTitle),
            workOrderId: wo.id,
            customerName: wo.customer.name.toUpperCase(),
            locationLabel: asciiSafe(String(loc).toUpperCase()),
            reasonShort: asciiSafe(issue.split('.')[0]!.slice(0, 40)),
            requestedBy: reviewer,
            requestedByStatus: wo.dispatchAssignments[0] ? 'ON SITE' : null,
            status,
            originalStatus: 'LOCKED',
            version: `V${Math.max(1, i % 3)}`,
            issueFlagged: asciiSafe(issue.toUpperCase()),
            correctionInstruction: asciiSafe(
              `ADD THE MISSING CONTROLS ON ${formTitle}, THEN RESUBMIT AS AN ADDENDUM. DO NOT EDIT THE ORIGINAL FORM.`,
            ),
            resubmission: resubmission
              ? (resubmission as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            rule: 'THE ORIGINAL FORM STAYS LOCKED AND READ-ONLY. THE JOB PACKET SHOWS THE ORIGINAL AND THE CORRECTED VERSION SIDE BY SIDE.',
            submittedBy: tech,
            createdAt: wo.updatedAt,
          };
        }),
      });
    }

    if (addCount === 0) {
      await this.prisma.additionalFormRequest.createMany({
        data: workOrders.slice(0, 6).map((wo, i) => {
          const formTitle = uniqueForms[(i + 1) % uniqueForms.length]!;
          const tech = techNames[i % techNames.length]!;
          const reviewer =
            i % 3 === 0
              ? 'UNASSIGNED'
              : (reviewers[i % Math.max(reviewers.length, 1)] ?? 'UNASSIGNED');
          const loc =
            wo.location?.name || wo.location?.county || wo.title || wo.code;
          const status = addStatuses[i % addStatuses.length]!;
          const urgency = urgencies[i % urgencies.length]!;
          const reason = asciiSafe(
            `SCOPE ON ${String(loc).toUpperCase()} REQUIRES ${formTitle} BEFORE CONTINUING WO ${wo.code}.`,
          );
          const history: HistoryEntry[] = [
            {
              when: fmtWhen(wo.updatedAt),
              text: `${tech} SUBMITTED REQUEST`,
            },
            {
              when: 'NOW',
              text:
                status === 'PENDING'
                  ? 'PENDING ADMIN REVIEW'
                  : `STATUS SET TO ${this.statusLabel(status)}`,
            },
          ];
          return {
            code: `AFR-${String(i + 1).padStart(2, '0')}`,
            workOrderId: wo.id,
            customerName: wo.customer.name.toUpperCase(),
            locationLabel: asciiSafe(String(loc).toUpperCase()),
            technicianName: tech,
            formRequested: asciiSafe(formTitle),
            reasonShort: asciiSafe(formTitle.slice(0, 24)),
            reason,
            urgency,
            status,
            reviewer,
            history: history as unknown as Prisma.InputJsonValue,
            rule: asciiSafe(
              `APPROVED FORMS ATTACH TO WO ${wo.code} AND NOTIFY THE TECHNICIAN. ORIGINAL REQUIRED FORMS STAY LOCKED AND READ-ONLY.`,
            ),
            createdAt: wo.updatedAt,
          };
        }),
      });
    }
  }

  async listCorrections() {
    await this.ensurePersisted();
    const rows = await this.prisma.formCorrectionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { workOrder: { select: { id: true, code: true } } },
    });
    const items = rows.map((r) => ({
      id: r.id,
      code: r.code,
      workOrderId: r.workOrderId,
      workOrderCode: r.workOrder?.code ?? null,
      customerName: r.customerName,
      formLabel: r.formLabel,
      reasonShort: r.reasonShort,
      reasonAge: ageLabel(r.createdAt),
      requestedBy: r.requestedBy,
      requestedByStatus: r.requestedByStatus,
      status: r.status,
      statusLabel: this.statusLabel(r.status),
      requestedLabel: fmtDay(r.createdAt),
      originalStatus: r.originalStatus,
      version: r.version,
    }));

    const open = items.filter((i) => i.status === 'OPEN').length;
    const resubmitted = items.filter((i) => i.status === 'RESUBMITTED').length;
    const approved = items.filter((i) => i.status === 'APPROVED').length;
    const rejected = items.filter((i) => i.status === 'REJECTED').length;
    const needsInfo = items.filter((i) => i.status === 'NEEDS_INFO').length;
    const customers = new Set(items.map((i) => i.customerName)).size;
    const woCount = new Set(items.map((i) => i.workOrderId).filter(Boolean))
      .size;

    return {
      data: {
        kpis: {
          open,
          openMeta: `ACROSS ${customers} CUSTOMER${customers === 1 ? '' : 'S'}`,
          resubmitted,
          resubmittedMeta: `${resubmitted} AWAITING REVIEW`,
          approved,
          approvedMeta: 'ACCEPTED ON JOB PACKET',
          rejected,
          rejectedMeta: `ACROSS ${woCount} ACTIVE WORK ORDER${woCount === 1 ? '' : 'S'}`,
          needsInfo,
          needsInfoMeta: 'WAITING ON TECHNICIAN',
        },
        items,
      },
    };
  }

  async getCorrection(id: string) {
    await this.ensurePersisted();
    const row = await this.prisma.formCorrectionRequest.findFirst({
      where: {
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
      include: { workOrder: { select: { id: true, code: true } } },
    });
    if (!row) throw new NotFoundException('Form correction not found');

    const all = await this.prisma.formCorrectionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        formTitle: true,
        status: true,
      },
    });
    const ids = all.map((r) => r.id);
    const index = ids.indexOf(row.id) + 1;
    const woCode = row.workOrder?.code ?? '';

    return {
      data: {
        id: row.id,
        code: row.code,
        title: 'FORM CORRECTION REQUEST',
        status: row.status,
        statusLabel: this.statusLabel(row.status),
        metaLabel: asciiSafe(
          `REQUESTED ${fmtDay(row.createdAt)} - ${row.requestedBy} - WO ${woCode}`,
        ),
        index,
        total: ids.length,
        ids,
        requests: all.map((r) => ({
          id: r.id,
          code: r.code,
          label: `${r.code} - ${r.formTitle}`,
          pendingLabel:
            r.status === 'OPEN' || r.status === 'RESUBMITTED'
              ? 'PENDING REVIEW'
              : this.statusLabel(r.status),
        })),
        original: {
          form: row.formLabel,
          formTitle: row.formTitle,
          submittedBy: row.submittedBy,
          submitted: fmtDay(row.createdAt),
          lockedLabel: 'LOCKED - READ-ONLY',
        },
        workOrderCode: woCode,
        version: row.version,
        formDisplay: `${row.formLabel} - ${row.locationLabel ?? row.formTitle}`,
        issueFlagged: row.issueFlagged,
        correction: {
          requestedBy: `${row.requestedBy} - ${fmtDay(row.createdAt)}`,
          instruction: row.correctionInstruction,
        },
        resubmission: resubmissionOf(row.resubmission),
        rule: row.rule,
      },
    };
  }

  private async mutateCorrection(
    id: string,
    status: FormCorrectionStatus,
    opts?: {
      reason?: string;
      issue?: string;
      instructions?: string;
      form?: string;
      forceFail?: boolean;
      failKind?: 'approve' | 'deny' | 'more-info';
    },
  ) {
    await this.ensurePersisted();
    const row = await this.prisma.formCorrectionRequest.findFirst({
      where: {
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
      include: { workOrder: { select: { code: true } } },
    });
    if (!row) throw new NotFoundException('Form correction not found');

    const tech = resubmissionOf(row.resubmission)?.resubmittedBy ?? row.submittedBy;
    const addendumLabel =
      resubmissionOf(row.resubmission)?.version ??
      `${row.formLabel} ${row.version}`;
    const woCode = row.workOrder?.code ?? '';
    const approveContext = `${row.formLabel} ${addendumLabel} → WO ${woCode}`;
    const rejectContext = `${addendumLabel} → ${tech}`;
    const requestContext = `${row.formLabel} ${row.version} → ${tech}`;

    if (opts?.forceFail) {
      const failMessage =
        opts.failKind === 'approve'
          ? "COULDN'T COMPLETE — JOB PACKET COULD NOT BE UPDATED."
          : opts.failKind === 'deny'
            ? "COULDN'T COMPLETE — NOTIFICATION COULD NOT BE DELIVERED."
            : "COULDN'T COMPLETE — CORRECTION REQUEST COULD NOT BE SENT.";
      const contextLine =
        opts.failKind === 'approve'
          ? approveContext
          : opts.failKind === 'deny'
            ? rejectContext
            : requestContext;
      return {
        data: {
          ok: false as const,
          id: row.id,
          code: row.code,
          status: row.status,
          contextLine,
          workOrderCode: woCode,
          technicianName: tech,
          formLabel: row.formLabel,
          version: row.version,
          message: failMessage,
          savedNote: 'YOUR ENTRIES ARE SAVED.',
          toastTitle: null,
          toastSubtitle: null,
          dueBackLabel: null,
        },
      };
    }

    const updated = await this.prisma.formCorrectionRequest.update({
      where: { id: row.id },
      data: {
        status,
        issueFlagged: opts?.issue?.trim()
          ? asciiSafe(opts.issue.trim().toUpperCase())
          : undefined,
        correctionInstruction: opts?.instructions?.trim()
          ? asciiSafe(opts.instructions.trim().toUpperCase())
          : undefined,
        formTitle: opts?.form?.trim()
          ? asciiSafe(opts.form.trim().toUpperCase())
          : undefined,
      },
      include: { workOrder: { select: { code: true } } },
    });

    const detail = await this.getCorrection(updated.id);
    let toastTitle = '';
    let toastSubtitle = '';
    let dueBackLabel: string | null = null;
    if (status === 'APPROVED') {
      toastTitle = `ADDENDUM ${updated.version} ACCEPTED - JOB PACKET UPDATED`;
    } else if (status === 'REJECTED') {
      toastTitle = `ADDENDUM REJECTED - ${tech} NOTIFIED WITH`;
      toastSubtitle = 'YOUR REASON';
    } else {
      const due = new Date();
      due.setDate(due.getDate() + 1);
      dueBackLabel = `DUE BACK ${fmtDay(due)}`;
      toastTitle = `CORRECTION REQUESTED - ${tech} NOTIFIED`;
    }

    return {
      data: {
        ok: true as const,
        id: updated.id,
        code: updated.code,
        status: updated.status,
        contextLine:
          status === 'APPROVED'
            ? approveContext
            : status === 'REJECTED'
              ? rejectContext
              : requestContext,
        workOrderCode: woCode,
        technicianName: tech,
        formLabel: updated.formLabel,
        version: updated.version,
        message: toastTitle,
        savedNote: null,
        toastTitle,
        toastSubtitle,
        dueBackLabel,
        detail: detail.data,
      },
    };
  }

  approveCorrection(id: string, dto?: { forceFail?: boolean; note?: string }) {
    return this.mutateCorrection(id, 'APPROVED', {
      forceFail: dto?.forceFail,
      failKind: 'approve',
    });
  }

  denyCorrection(
    id: string,
    dto?: { reason?: string; forceFail?: boolean; note?: string },
  ) {
    return this.mutateCorrection(id, 'REJECTED', {
      reason: dto?.reason ?? dto?.note,
      forceFail: dto?.forceFail,
      failKind: 'deny',
    });
  }

  moreInfoCorrection(
    id: string,
    dto?: {
      form?: string;
      issue?: string;
      instructions?: string;
      message?: string;
      forceFail?: boolean;
      note?: string;
    },
  ) {
    return this.mutateCorrection(id, 'NEEDS_INFO', {
      form: dto?.form,
      issue: dto?.issue,
      instructions: dto?.instructions ?? dto?.message ?? dto?.note,
      forceFail: dto?.forceFail,
      failKind: 'more-info',
    });
  }

  async listAdditional() {
    await this.ensurePersisted();
    const rows = await this.prisma.additionalFormRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { workOrder: { select: { id: true, code: true } } },
    });
    const items = rows.map((r) => ({
      id: r.id,
      code: r.code,
      workOrderId: r.workOrderId,
      workOrderCode: r.workOrder?.code ?? null,
      customerName: r.customerName,
      technicianName: r.technicianName,
      formRequested: r.formRequested,
      reasonShort: r.reasonShort,
      urgency: r.urgency,
      status: r.status,
      statusLabel: this.statusLabel(r.status),
      ageLabel: ageLabel(r.createdAt),
      reviewer: r.reviewer,
    }));

    const pending = items.filter((i) => i.status === 'PENDING').length;
    const approved = items.filter((i) => i.status === 'APPROVED').length;
    const denied = items.filter((i) => i.status === 'DENIED').length;
    const needsInfo = items.filter((i) => i.status === 'NEEDS_INFO').length;
    const formAdded = items.filter((i) => i.status === 'FORM_ADDED').length;
    const customers = new Set(items.map((i) => i.customerName)).size;
    const woCount = new Set(items.map((i) => i.workOrderId).filter(Boolean))
      .size;
    const high = rows.find((r) => r.urgency === 'HIGH' && r.status === 'PENDING');

    return {
      data: {
        kpis: {
          pending,
          pendingMeta: `ACROSS ${customers} CUSTOMER${customers === 1 ? '' : 'S'}`,
          approved,
          approvedMeta: 'READY TO ATTACH',
          denied,
          deniedMeta: `ACROSS ${woCount} ACTIVE WORK ORDER${woCount === 1 ? '' : 'S'}`,
          needsInfo,
          needsInfoMeta: 'WAITING ON TECHNICIAN',
          formAdded,
          formAddedMeta: 'ATTACHED TO WORK ORDER',
        },
        alert: high
          ? `${high.code} - HIGH - WORK STOPPED - ${ageLabel(high.createdAt)} - PENDING ADMIN`
          : null,
        items,
      },
    };
  }

  async getAdditional(id: string) {
    await this.ensurePersisted();
    const row = await this.prisma.additionalFormRequest.findFirst({
      where: {
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
      include: { workOrder: { select: { id: true, code: true } } },
    });
    if (!row) throw new NotFoundException('Additional form request not found');

    const all = await this.prisma.additionalFormRequest.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, formRequested: true, status: true },
    });
    const ids = all.map((r) => r.id);
    const index = ids.indexOf(row.id) + 1;
    const woCode = row.workOrder?.code ?? '';

    return {
      data: {
        id: row.id,
        code: row.code,
        title: 'ADDITIONAL FORM REQUEST',
        status: row.status,
        statusLabel: this.statusLabel(row.status),
        urgency: row.urgency,
        metaLabel: asciiSafe(`SUBMITTED ${fmtWhen(row.createdAt)}`),
        index,
        total: ids.length,
        ids,
        requests: all.map((r) => ({
          id: r.id,
          code: r.code,
          label: `${r.code} - ${r.formRequested}`,
          pendingLabel:
            r.status === 'PENDING'
              ? 'PENDING REVIEW'
              : this.statusLabel(r.status),
        })),
        details: {
          workOrder: woCode,
          customer: row.customerName,
          location: row.locationLabel,
          technician: row.technicianName,
          formRequested: row.formRequested,
          urgency: row.urgency,
        },
        history: historyOf(row.history),
        reason: row.reason,
        rule: row.rule,
      },
    };
  }

  private async mutateAdditional(
    id: string,
    status: AdditionalFormStatus,
    opts?: {
      reason?: string;
      message?: string;
      forceFail?: boolean;
      failKind?: 'approve' | 'deny' | 'more-info';
    },
  ) {
    await this.ensurePersisted();
    const row = await this.prisma.additionalFormRequest.findFirst({
      where: {
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
      include: { workOrder: { select: { code: true } } },
    });
    if (!row) throw new NotFoundException('Additional form request not found');

    const contextLine = `${row.formRequested} → ${row.technicianName}`;
    const woCode = row.workOrder?.code ?? '';

    if (opts?.forceFail) {
      const failMessage =
        opts.failKind === 'approve'
          ? "COULDN'T COMPLETE — FORM COULD NOT BE ATTACHED TO WORK ORDER."
          : opts.failKind === 'deny'
            ? "COULDN'T COMPLETE — NOTIFICATION COULD NOT BE DELIVERED."
            : "COULDN'T COMPLETE — MESSAGE COULD NOT BE DELIVERED.";
      return {
        data: {
          ok: false as const,
          id: row.id,
          code: row.code,
          status: row.status,
          contextLine,
          workOrderCode: woCode,
          technicianName: row.technicianName,
          formRequested: row.formRequested,
          message: failMessage,
          savedNote: 'YOUR ENTRIES ARE SAVED.',
          toastTitle: null,
          toastSubtitle: null,
        },
      };
    }

    const history = historyOf(row.history);
    const nextHistory: HistoryEntry[] = [
      opts?.reason?.trim()
        ? {
            when: 'NOW',
            text: `DENIED - ${asciiSafe(opts.reason.trim().toUpperCase())}`,
          }
        : opts?.message?.trim()
          ? {
              when: 'NOW',
              text: `MORE INFO REQUESTED - ${asciiSafe(opts.message.trim().toUpperCase())}`,
            }
          : {
              when: 'NOW',
              text: `STATUS SET TO ${this.statusLabel(status)}`,
            },
      ...history,
    ];

    const updated = await this.prisma.additionalFormRequest.update({
      where: { id: row.id },
      data: {
        status,
        history: nextHistory as unknown as Prisma.InputJsonValue,
      },
    });

    const detail = await this.getAdditional(updated.id);
    let toastTitle = '';
    let toastSubtitle = '';
    if (status === 'FORM_ADDED') {
      toastTitle = `${updated.formRequested} ATTACHED TO ${woCode}`;
      toastSubtitle = `${updated.technicianName} NOTIFIED`;
    } else if (status === 'DENIED') {
      toastTitle = `REQUEST DENIED - ${updated.technicianName} NOTIFIED WITH YOUR REASON`;
      toastSubtitle = '';
    } else {
      toastTitle = `SENT TO ${updated.technicianName} - AWAITING RESPONSE`;
      toastSubtitle = '';
    }

    return {
      data: {
        ok: true as const,
        id: updated.id,
        code: updated.code,
        status: updated.status,
        contextLine,
        workOrderCode: woCode,
        technicianName: updated.technicianName,
        formRequested: updated.formRequested,
        message: toastTitle,
        savedNote: null,
        toastTitle,
        toastSubtitle,
        detail: detail.data,
      },
    };
  }

  approveAdditional(id: string, dto?: { forceFail?: boolean; note?: string }) {
    return this.mutateAdditional(id, 'FORM_ADDED', {
      forceFail: dto?.forceFail,
      failKind: 'approve',
      message: dto?.note,
    });
  }

  denyAdditional(
    id: string,
    dto?: { reason?: string; forceFail?: boolean; note?: string },
  ) {
    return this.mutateAdditional(id, 'DENIED', {
      reason: dto?.reason ?? dto?.note,
      forceFail: dto?.forceFail,
      failKind: 'deny',
    });
  }

  moreInfoAdditional(
    id: string,
    dto?: { message?: string; forceFail?: boolean; note?: string },
  ) {
    return this.mutateAdditional(id, 'NEEDS_INFO', {
      message: dto?.message ?? dto?.note,
      forceFail: dto?.forceFail,
      failKind: 'more-info',
    });
  }
}
