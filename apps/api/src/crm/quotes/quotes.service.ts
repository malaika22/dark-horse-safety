import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma, QuoteApprovalStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import { MailService } from '../../auth/mail.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  ExportService,
  isoDate,
  userLabel,
} from '../../common/services/export.service';
import { UploadsService } from '../../common/services/uploads.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import {
  AddQuoteAttachmentDto,
  CreateQuoteDto,
  QuoteLineItemInputDto,
  QuoteListQueryDto,
  SendQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteLineItemDto,
} from './dto/quote.dto';

const SORT_MAP: Record<string, string> = {
  quoteNumber: 'quoteNumber',
  amount: 'amount',
  createdAt: 'createdAt',
  status: 'status',
  expiresAt: 'expiresAt',
};

function moneyLabel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
    private readonly mail: MailService,
    private readonly workOrders: WorkOrdersService,
    private readonly uploads: UploadsService,
  ) {}

  private where(query: QuoteListQueryDto): Prisma.QuoteWhereInput {
    const and: Prisma.QuoteWhereInput[] = [{ archivedAt: null }];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.ownerId) and.push({ ownerId: query.ownerId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.hasPo === 'true' || query.hasPo === '1') {
      and.push({ hasPo: true });
    }
    if (query.hasPo === 'false' || query.hasPo === '0') {
      and.push({ hasPo: false });
    }
    const valueMin = query.valueMin ? Number(query.valueMin) : NaN;
    const valueMax = query.valueMax ? Number(query.valueMax) : NaN;
    if (Number.isFinite(valueMin) || Number.isFinite(valueMax)) {
      and.push({
        amount: {
          ...(Number.isFinite(valueMin) ? { gte: valueMin } : {}),
          ...(Number.isFinite(valueMax) ? { lte: valueMax } : {}),
        },
      });
    }
    if (query.createdMin || query.createdMax) {
      and.push({
        createdAt: {
          ...(query.createdMin ? { gte: new Date(query.createdMin) } : {}),
          ...(query.createdMax
            ? { lte: new Date(`${query.createdMax}T23:59:59.999Z`) }
            : {}),
        },
      });
    }
    if (query.expiresMin || query.expiresMax) {
      and.push({
        expiresAt: {
          ...(query.expiresMin ? { gte: new Date(query.expiresMin) } : {}),
          ...(query.expiresMax
            ? { lte: new Date(`${query.expiresMax}T23:59:59.999Z`) }
            : {}),
        },
      });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { quoteNumber: containsCi(q) },
          { notes: containsCi(q) },
          { terms: containsCi(q) },
          { customer: { name: containsCi(q) } },
        ],
      });
    }
    return { AND: and };
  }

  private buildSnapshot(quote: {
    amount: unknown;
    lineItems?: { item: string; amount: unknown; quantity: unknown; rate: unknown }[];
    terms?: string | null;
  }) {
    const lines = quote.lineItems ?? [];
    const subtotal = lines.reduce((sum, line) => sum + Number(line.amount), 0);
    const taxRate = 0.0825;
    const discountPct = 0;
    const discountAmt = subtotal * (discountPct / 100);
    const taxable = Math.max(0, subtotal - discountAmt);
    const tax = taxable * taxRate;
    const total = Number(quote.amount) || taxable + tax;
    return {
      subtotal,
      discount: discountPct,
      taxRate,
      tax,
      total,
      lineItems: lines.map((line) => ({
        item: line.item,
        quantity: Number(line.quantity),
        rate: Number(line.rate),
        amount: Number(line.amount),
      })),
      terms: quote.terms ?? null,
    };
  }

  private async captureVersion(
    quoteId: string,
    opts?: { status?: string; sentAt?: Date | null; bump?: boolean },
  ) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quote) return null;

    let revision = quote.revision ?? 1;
    if (opts?.bump) {
      revision = revision + 1;
      await this.prisma.quote.update({
        where: { id: quoteId },
        data: { revision },
      });
    }

    const snapshot = this.buildSnapshot(quote);
    const status = opts?.status ?? quote.status;
    const sentAt =
      opts?.sentAt !== undefined
        ? opts.sentAt
        : quote.sentAt ?? (status === CrmRecordStatus.SENT ? new Date() : null);

    return this.prisma.quoteVersion.upsert({
      where: {
        quoteId_revision: { quoteId, revision },
      },
      create: {
        quoteId,
        revision,
        status,
        amount: quote.amount,
        snapshot,
        sentAt,
        createdById: quote.ownerId,
      },
      update: {
        status,
        amount: quote.amount,
        snapshot,
        sentAt,
      },
    });
  }

  private lineAmount(quantity: number, rate: number) {
    return quantity * rate;
  }

  private async recalcAmount(quoteId: string) {
    const lines = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });
    const amount = lines.reduce(
      (sum, line) => sum + Number(line.amount),
      0,
    );
    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { amount },
    });
  }

  async list(query: QuoteListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const dir = query.direction === 'asc' ? ('asc' as const) : ('desc' as const);
    const orderBy: Prisma.QuoteOrderByWithRelationInput =
      query.sort === 'customer'
        ? { customer: { name: dir } }
        : query.sort === 'owner'
          ? { owner: { lastName: dir } }
          : (orderByFrom(query.sort, query.direction, SORT_MAP, {
              createdAt: 'desc',
            }) as Prisma.QuoteOrderByWithRelationInput);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: { select: { id: true, name: true, code: true } },
          contact: {
            select: { id: true, fullName: true, code: true, email: true },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { lineItems: true } },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const openStatuses = [
      CrmRecordStatus.DRAFT,
      CrmRecordStatus.SENT,
      CrmRecordStatus.OPEN,
    ];
    const [draft, sent, approved, expired, converted, openAgg] =
      await Promise.all([
        this.prisma.quote.count({
          where: { archivedAt: null, status: CrmRecordStatus.DRAFT },
        }),
        this.prisma.quote.count({
          where: { archivedAt: null, status: CrmRecordStatus.SENT },
        }),
        this.prisma.quote.count({
          where: {
            archivedAt: null,
            OR: [
              { status: CrmRecordStatus.OPEN },
              { approvalStatus: QuoteApprovalStatus.APPROVED },
            ],
          },
        }),
        this.prisma.quote.count({
          where: { archivedAt: null, status: CrmRecordStatus.EXPIRED },
        }),
        this.prisma.quote.count({
          where: { archivedAt: null, status: CrmRecordStatus.WON },
        }),
        this.prisma.quote.aggregate({
          where: {
            archivedAt: null,
            status: { in: openStatuses },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);
    return {
      data: {
        draft,
        sent,
        approved,
        expired,
        converted,
        openCount: openAgg._count,
        openAmount: Number(openAgg._sum.amount ?? 0),
      },
    };
  }

  async getById(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true,
            billingAddress: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
            code: true,
            email: true,
            roleTitle: true,
            officePhone: true,
            mobile: true,
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        workOrders: {
          where: { archivedAt: null },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, code: true, status: true },
        },
        versions: {
          orderBy: { revision: 'desc' },
          take: 5,
          select: {
            id: true,
            revision: true,
            status: true,
            createdAt: true,
            sentAt: true,
          },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }
    const currentRevision =
      quote.versions[0]?.revision ?? quote.revision ?? 1;
    return {
      data: {
        ...quote,
        currentRevision,
        convertedWorkOrder: quote.workOrders[0] ?? null,
      },
    };
  }

  async create(dto: CreateQuoteDto) {
    const quoteNumber = await this.codes.next('quote');
    const lineItems = (dto.lineItems ?? []).map((line, index) => {
      const quantity = line.quantity ?? 1;
      const amount = this.lineAmount(quantity, line.rate);
      return {
        item: line.item,
        quantity,
        rate: line.rate,
        amount,
        sortOrder: index,
      };
    });
    const amount = lineItems.reduce((sum, line) => sum + line.amount, 0);
    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: dto.customerId,
        contactId: dto.contactId,
        ownerId: dto.ownerId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        terms: dto.terms,
        notes: dto.notes,
        amount,
        status: CrmRecordStatus.DRAFT,
        ...(lineItems.length
          ? { lineItems: { create: lineItems } }
          : {}),
      },
      include: { lineItems: true },
    });
    await this.captureVersion(quote.id, { status: CrmRecordStatus.DRAFT });
    return { data: quote };
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.ensureExists(id);

    const lineItems = (dto.lineItems ?? []).map((line, index) => {
      const quantity = line.quantity ?? 1;
      const amount = this.lineAmount(quantity, line.rate);
      return {
        item: line.item,
        quantity,
        rate: line.rate,
        amount,
        sortOrder: index,
      };
    });
    const hasLines = dto.lineItems !== undefined;

    const quote = await this.prisma.$transaction(async (tx) => {
      if (hasLines) {
        await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
        if (lineItems.length) {
          await tx.quoteLineItem.createMany({
            data: lineItems.map((line) => ({ ...line, quoteId: id })),
          });
        }
      }

      const amount = hasLines
        ? lineItems.reduce((sum, line) => sum + line.amount, 0)
        : undefined;

      return tx.quote.update({
        where: { id },
        data: {
          ...(dto.customerId !== undefined
            ? { customerId: dto.customerId }
            : {}),
          ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
          ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
          ...(dto.expiresAt !== undefined
            ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
            : {}),
          ...(dto.terms !== undefined ? { terms: dto.terms } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.status !== undefined
            ? { status: dto.status as CrmRecordStatus }
            : {}),
          ...(amount !== undefined ? { amount } : {}),
        },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    if (hasLines) {
      await this.captureVersion(id, { bump: true, status: quote.status });
    } else {
      await this.captureVersion(id, { status: quote.status });
    }

    return { data: quote };
  }

  async listAttachments(quoteId: string) {
    await this.ensureExists(quoteId);
    const attachments = await this.prisma.quoteAttachment.findMany({
      where: { quoteId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: attachments };
  }

  async addAttachment(quoteId: string, dto: AddQuoteAttachmentDto) {
    await this.ensureExists(quoteId);
    const saved = await this.uploads.saveBase64({
      folder: `quotes/${quoteId}`,
      fileName: dto.fileName,
      contentBase64: dto.contentBase64,
    });

    const attachment = await this.prisma.quoteAttachment.create({
      data: {
        quoteId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: saved.sizeBytes,
        storagePath: saved.storagePath,
      },
    });
    return { data: attachment };
  }

  async deleteAttachment(quoteId: string, attachmentId: string) {
    await this.ensureExists(quoteId);
    const attachment = await this.prisma.quoteAttachment.findFirst({
      where: { id: attachmentId, quoteId },
    });
    if (!attachment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote attachment not found',
      });
    }
    await this.prisma.quoteAttachment.delete({ where: { id: attachmentId } });
    await this.uploads.deleteIfExists(attachment.storagePath);
    return { data: { deleted: true } };
  }

  async listVersions(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }

    let versions = await this.prisma.quoteVersion.findMany({
      where: { quoteId: id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { revision: 'desc' },
    });

    if (!versions.length) {
      await this.captureVersion(id, {
        status: quote.status,
        sentAt: quote.sentAt,
      });
      versions = await this.prisma.quoteVersion.findMany({
        where: { quoteId: id },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { revision: 'desc' },
      });
    }

    const currentRev = versions[0]?.revision ?? quote.revision;
    const items = versions.map((v) => {
      const isCurrent = v.revision === currentRev;
      let badge: 'CURRENT' | 'SUPERSEDED' | 'DRAFT' = 'SUPERSEDED';
      if (isCurrent && v.status === CrmRecordStatus.DRAFT) badge = 'DRAFT';
      else if (isCurrent) badge = 'CURRENT';
      else if (v.status === CrmRecordStatus.DRAFT) badge = 'DRAFT';
      const author = v.createdBy ?? quote.owner;
      const authorLabel = author
        ? [author.firstName?.[0], author.lastName].filter(Boolean).join('. ') ||
          author.email
        : '—';
      return {
        id: v.id,
        revision: v.revision,
        label: `V${v.revision}`,
        status: v.status,
        badge,
        amount: Number(v.amount),
        sentAt: v.sentAt,
        createdAt: v.createdAt,
        author: authorLabel,
        isCurrent,
      };
    });

    return {
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        customer: quote.customer?.name ?? '—',
        currentRevision: currentRev,
        versions: items,
      },
    };
  }

  async compareVersions(
    id: string,
    leftRevision?: number,
    rightRevision?: number,
  ) {
    const listed = await this.listVersions(id);
    const versions = await this.prisma.quoteVersion.findMany({
      where: { quoteId: id },
      orderBy: { revision: 'asc' },
    });
    if (versions.length < 1) {
      throw new BadRequestException({
        code: 'NO_VERSIONS',
        message: 'No versions available to compare',
      });
    }
    const right =
      versions.find((v) => v.revision === rightRevision) ??
      versions[versions.length - 1]!;
    const left =
      versions.find((v) => v.revision === leftRevision) ??
      versions.filter((v) => v.revision < right.revision).slice(-1)[0] ??
      versions[0]!;

    type Snap = {
      subtotal?: number;
      discount?: number;
      tax?: number;
      taxRate?: number;
      total?: number;
      lineItems?: { item: string; amount: number }[];
    };
    const leftSnap = (left.snapshot ?? {}) as Snap;
    const rightSnap = (right.snapshot ?? {}) as Snap;
    const leftLines = new Map(
      (leftSnap.lineItems ?? []).map((l) => [l.item.toUpperCase(), l.amount]),
    );
    const rightLines = new Map(
      (rightSnap.lineItems ?? []).map((l) => [l.item.toUpperCase(), l.amount]),
    );
    const lineKeys = Array.from(
      new Set([...leftLines.keys(), ...rightLines.keys()]),
    );

    const rows: {
      field: string;
      left: string | null;
      right: string | null;
      change: 'same' | 'changed' | 'added' | 'removed';
    }[] = [
      {
        field: 'Subtotal',
        left: moneyLabel(leftSnap.subtotal ?? Number(left.amount)),
        right: moneyLabel(rightSnap.subtotal ?? Number(right.amount)),
        change:
          Number(leftSnap.subtotal ?? left.amount) ===
          Number(rightSnap.subtotal ?? right.amount)
            ? 'same'
            : 'changed',
      },
      {
        field: 'Discount',
        left: `${leftSnap.discount ?? 0}%`,
        right: `${rightSnap.discount ?? 0}%`,
        change:
          (leftSnap.discount ?? 0) === (rightSnap.discount ?? 0)
            ? 'same'
            : 'changed',
      },
      {
        field: `Tax (${(((rightSnap.taxRate ?? leftSnap.taxRate ?? 0.0825) * 100).toFixed(2))}%)`,
        left: moneyLabel(leftSnap.tax ?? 0),
        right: moneyLabel(rightSnap.tax ?? 0),
        change:
          Number(leftSnap.tax ?? 0) === Number(rightSnap.tax ?? 0)
            ? 'same'
            : 'changed',
      },
    ];

    for (const key of lineKeys) {
      const l = leftLines.get(key);
      const r = rightLines.get(key);
      if (l == null && r != null) {
        rows.push({
          field: key,
          left: null,
          right: `+ ${moneyLabel(r)}`,
          change: 'added',
        });
      } else if (l != null && r == null) {
        rows.push({
          field: key,
          left: moneyLabel(l),
          right: null,
          change: 'removed',
        });
      } else {
        rows.push({
          field: key,
          left: moneyLabel(l),
          right: moneyLabel(r),
          change: Number(l) === Number(r) ? 'same' : 'changed',
        });
      }
    }

    rows.push({
      field: 'Total',
      left: moneyLabel(leftSnap.total ?? Number(left.amount)),
      right: moneyLabel(rightSnap.total ?? Number(right.amount)),
      change:
        Number(leftSnap.total ?? left.amount) ===
        Number(rightSnap.total ?? right.amount)
          ? 'same'
          : 'changed',
    });

    return {
      data: {
        quoteId: id,
        quoteNumber: listed.data.quoteNumber,
        left: {
          revision: left.revision,
          label: `V${left.revision}`,
          date: left.sentAt ?? left.createdAt,
        },
        right: {
          revision: right.revision,
          label: `V${right.revision}`,
          date: right.sentAt ?? right.createdAt,
          isCurrent: right.revision === listed.data.currentRevision,
        },
        rows,
      },
    };
  }

  async convertToWorkOrder(quoteId: string) {
    return this.workOrders.convertFromQuote(quoteId);
  }

  async send(id: string, dto?: SendQuoteDto) {
    const existing = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, code: true, email: true },
        },
        contact: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }

    const to =
      dto?.to?.trim() ||
      existing.contact?.email?.trim() ||
      existing.customer?.email?.trim();
    if (!to) {
      throw new BadRequestException({
        code: 'NO_RECIPIENT',
        message:
          'No email recipient — provide to, or set contact/customer email',
      });
    }

    const subject =
      dto?.subject?.trim() || `Quote ${existing.quoteNumber}`;

    if (dto?.schedule === 'later') {
      if (!dto.scheduledAt) {
        throw new BadRequestException({
          code: 'SCHEDULE_REQUIRED',
          message: 'scheduledAt is required when schedule is later',
        });
      }
      const when = new Date(dto.scheduledAt);
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        throw new BadRequestException({
          code: 'SCHEDULE_INVALID',
          message: 'scheduledAt must be a future date/time',
        });
      }
      const quote = await this.prisma.quote.update({
        where: { id },
        data: {
          scheduledSendAt: when,
          scheduledTo: to,
          scheduledSubject: subject,
          scheduledMessage: dto.message?.trim() || null,
        },
      });
      return { data: quote };
    }

    const mailAttachments: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[] = [];
    if (dto?.attachmentIds?.length) {
      const rows = await this.prisma.quoteAttachment.findMany({
        where: { quoteId: id, id: { in: dto.attachmentIds } },
      });
      if (rows.length !== dto.attachmentIds.length) {
        throw new BadRequestException({
          code: 'INVALID_ATTACHMENTS',
          message: 'One or more attachmentIds are invalid for this quote',
        });
      }
      for (const row of rows) {
        const content = await fs.readFile(
          this.uploads.absolute(row.storagePath),
        );
        mailAttachments.push({
          filename: row.fileName,
          content,
          contentType: row.mimeType ?? undefined,
        });
      }
    }

    const attachPdf =
      dto?.attachPdf === true ||
      dto?.attachPdf === 'true' ||
      dto?.attachPdf === '1';
    if (attachPdf) {
      const body = [
        `Quote ${existing.quoteNumber}`,
        `Customer: ${existing.customer?.name ?? '—'}`,
        `Amount: ${Number(existing.amount)}`,
        `Generated: ${new Date().toISOString()}`,
      ].join('\n');
      mailAttachments.push({
        filename: `${existing.quoteNumber}.txt`,
        content: Buffer.from(body, 'utf8'),
        contentType: 'text/plain',
      });
    }

    const amount = Number(existing.amount);
    const amountLabel = Number.isFinite(amount)
      ? amount.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
      : String(existing.amount);
    const messageHtml = dto?.message?.trim()
      ? `<p style="margin:0 0 16px;color:#d1d5db">${dto.message.trim()}</p>`
      : '';

    await this.mail.sendCrmEmail({
      to,
      subject,
      title: `Quote ${existing.quoteNumber}`,
      bodyHtml: `${messageHtml}
        <p style="margin:0 0 8px;color:#d1d5db">Customer: <strong style="color:#fff">${existing.customer?.name ?? '—'}</strong></p>
        <p style="margin:0 0 8px;color:#d1d5db">Quote #: <strong style="color:#fff">${existing.quoteNumber}</strong></p>
        <p style="margin:0 0 16px;color:#d1d5db">Amount: <strong style="color:#fff">${amountLabel}</strong></p>
        <p style="margin:0;color:#9ca3af;font-size:13px">Please review this quote and reply with any questions.</p>`,
      kind: 'crm-quote-send',
      attachments: mailAttachments.length ? mailAttachments : undefined,
    });

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        sentAt: new Date(),
        status: CrmRecordStatus.SENT,
        scheduledSendAt: null,
        scheduledTo: null,
        scheduledSubject: null,
        scheduledMessage: null,
      },
    });
    await this.captureVersion(id, {
      status: CrmRecordStatus.SENT,
      sentAt: quote.sentAt,
    });
    return { data: quote };
  }

  async sendDueScheduled() {
    const due = await this.prisma.quote.findMany({
      where: {
        archivedAt: null,
        sentAt: null,
        scheduledSendAt: { lte: new Date() },
      },
      take: 50,
      select: { id: true },
    });
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const row of due) {
      try {
        const full = await this.prisma.quote.findUnique({ where: { id: row.id } });
        await this.send(row.id, {
          to: full?.scheduledTo ?? undefined,
          subject: full?.scheduledSubject ?? undefined,
          message: full?.scheduledMessage ?? undefined,
          schedule: 'now',
        });
        results.push({ id: row.id, ok: true });
      } catch (err) {
        results.push({
          id: row.id,
          ok: false,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
    }
    return { data: { processed: results.length, results } };
  }

  async duplicate(id: string) {
    const existing = await this.prisma.quote.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }
    const quoteNumber = await this.codes.next('quote');
    const copy = await this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: existing.customerId,
        contactId: existing.contactId,
        ownerId: existing.ownerId,
        expiresAt: existing.expiresAt,
        terms: existing.terms,
        notes: existing.notes,
        amount: existing.amount,
        status: CrmRecordStatus.DRAFT,
        lineItems: {
          create: existing.lineItems.map((line, index) => ({
            item: line.item,
            quantity: line.quantity,
            rate: line.rate,
            amount: line.amount,
            sortOrder: index,
          })),
        },
      },
      include: { lineItems: true },
    });
    return { data: copy };
  }

  async markWon(id: string) {
    await this.ensureExists(id);
    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: CrmRecordStatus.WON },
    });
    return { data: quote };
  }

  async markLost(id: string) {
    await this.ensureExists(id);
    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: CrmRecordStatus.LOST },
    });
    return { data: quote };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const quote = await this.prisma.quote.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: quote };
  }

  async bulkArchive(ids: string[]) {
    const result = await this.prisma.quote.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async addLineItem(id: string, dto: QuoteLineItemInputDto) {
    await this.ensureExists(id);
    const count = await this.prisma.quoteLineItem.count({
      where: { quoteId: id },
    });
    const quantity = dto.quantity ?? 1;
    const amount = this.lineAmount(quantity, dto.rate);
    await this.prisma.quoteLineItem.create({
      data: {
        quoteId: id,
        item: dto.item,
        quantity,
        rate: dto.rate,
        amount,
        sortOrder: count,
      },
    });
    await this.recalcAmount(id);
    return this.getById(id);
  }

  async updateLineItem(
    id: string,
    lineId: string,
    dto: UpdateQuoteLineItemDto,
  ) {
    await this.ensureExists(id);
    const line = await this.prisma.quoteLineItem.findFirst({
      where: { id: lineId, quoteId: id },
    });
    if (!line) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote line item not found',
      });
    }
    const quantity =
      dto.quantity !== undefined ? dto.quantity : Number(line.quantity);
    const rate = dto.rate !== undefined ? dto.rate : Number(line.rate);
    await this.prisma.quoteLineItem.update({
      where: { id: lineId },
      data: {
        ...(dto.item !== undefined ? { item: dto.item } : {}),
        quantity,
        rate,
        amount: this.lineAmount(quantity, rate),
      },
    });
    await this.recalcAmount(id);
    return this.getById(id);
  }

  async deleteLineItem(id: string, lineId: string) {
    await this.ensureExists(id);
    const result = await this.prisma.quoteLineItem.deleteMany({
      where: { id: lineId, quoteId: id },
    });
    if (!result.count) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote line item not found',
      });
    }
    await this.recalcAmount(id);
    return this.getById(id);
  }

  async exportCsv(
    query: QuoteListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.QuoteWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      {
        key: 'quoteNumber',
        header: 'Quote #',
        value: (r: Row) => r.quoteNumber,
      },
      {
        key: 'customer',
        header: 'Customer',
        value: (r: Row) => r.customer?.name,
      },
      {
        key: 'contact',
        header: 'Contact',
        value: (r: Row) => r.contact?.fullName,
      },
      { key: 'amount', header: 'Amount', value: (r: Row) => Number(r.amount) },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'approval',
        header: 'Approval',
        value: (r: Row) => r.approvalStatus,
      },
      {
        key: 'owner',
        header: 'Owner',
        value: (r: Row) => userLabel(r.owner),
      },
      {
        key: 'created',
        header: 'Created',
        value: (r: Row) => isoDate(r.createdAt),
      },
      {
        key: 'expires',
        header: 'Expires',
        value: (r: Row) => isoDate(r.expiresAt),
      },
      {
        key: 'sent',
        header: 'Sent',
        value: (r: Row) => isoDate(r.sentAt),
      },
      { key: 'terms', header: 'Terms', value: (r: Row) => r.terms },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Quotes',
      'quotes',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.quote.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }
  }
}
