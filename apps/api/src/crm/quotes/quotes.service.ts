import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuoteDto,
  QuoteLineItemInputDto,
  QuoteListQueryDto,
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
  ) {}

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

  async send(id: string) {
    await this.ensureExists(id);
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

  async exportCsv(query: QuoteListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.QuoteWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'quoteNumber', header: 'Quote #', value: (r) => r.quoteNumber },
      { key: 'amount', header: 'Amount', value: (r) => Number(r.amount) },
      { key: 'status', header: 'Status', value: (r) => r.status },
      {
        key: 'expiresAt',
        header: 'Expires',
        value: (r) =>
          r.expiresAt ? r.expiresAt.toISOString().slice(0, 10) : '',
      },
    ]);
    return { data: { csv, filename: 'quotes.csv' } };
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
