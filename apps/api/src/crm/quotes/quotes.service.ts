import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { MailService } from '../../auth/mail.service';
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

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
    private readonly mail: MailService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  private uploadsRoot() {
    return path.join(process.cwd(), 'uploads');
  }

  private absoluteUploadPath(storagePath: string) {
    return path.join(this.uploadsRoot(), storagePath);
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
  }

  private where(query: QuoteListQueryDto): Prisma.QuoteWhereInput {
    const and: Prisma.QuoteWhereInput[] = [{ archivedAt: null }];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.ownerId) and.push({ ownerId: query.ownerId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { quoteNumber: containsCi(q) },
          { notes: containsCi(q) },
          { terms: containsCi(q) },
        ],
      });
    }
    return { AND: and };
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
    const [total, items] = await this.prisma.$transaction([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          contact: { select: { id: true, fullName: true, code: true } },
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
    const [total, draft, sent, won, lost] = await Promise.all([
      this.prisma.quote.count({ where: { archivedAt: null } }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.DRAFT },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.SENT },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.WON },
      }),
      this.prisma.quote.count({
        where: { archivedAt: null, status: CrmRecordStatus.LOST },
      }),
    ]);
    return { data: { total, draft, sent, won, lost } };
  }

  async getById(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        customer: { select: { id: true, name: true, code: true } },
        contact: {
          select: { id: true, fullName: true, code: true, email: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }
    return { data: quote };
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
    return { data: quote };
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.ensureExists(id);
    const quote = await this.prisma.quote.update({
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
      },
    });
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
    const raw = dto.contentBase64.includes(',')
      ? dto.contentBase64.split(',').pop()!
      : dto.contentBase64;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(raw, 'base64');
    } catch {
      throw new BadRequestException({
        code: 'INVALID_BASE64',
        message: 'contentBase64 is not valid base64',
      });
    }
    if (!buffer.length) {
      throw new BadRequestException({
        code: 'EMPTY_FILE',
        message: 'Attachment content is empty',
      });
    }

    const safeName = this.sanitizeFileName(dto.fileName);
    const storagePath = path
      .join('quotes', quoteId, `${randomUUID()}-${safeName}`)
      .replace(/\\/g, '/');
    const absolute = this.absoluteUploadPath(storagePath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);

    const attachment = await this.prisma.quoteAttachment.create({
      data: {
        quoteId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: buffer.length,
        storagePath,
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
    try {
      await fs.unlink(this.absoluteUploadPath(attachment.storagePath));
    } catch {
      // file may already be missing
    }
    return { data: { deleted: true } };
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
          this.absoluteUploadPath(row.storagePath),
        );
        mailAttachments.push({
          filename: row.fileName,
          content,
          contentType: row.mimeType ?? undefined,
        });
      }
    }

    const amount = Number(existing.amount);
    const amountLabel = Number.isFinite(amount)
      ? amount.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
      : String(existing.amount);
    const subject =
      dto?.subject?.trim() || `Quote ${existing.quoteNumber}`;
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
      data: { sentAt: new Date(), status: CrmRecordStatus.SENT },
    });
    return { data: quote };
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
