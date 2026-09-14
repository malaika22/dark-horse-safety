import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateExpenseDto,
  ExpenseListQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

const SORT_MAP: Record<string, string> = {
  expenseDate: 'expenseDate',
  merchant: 'merchant',
  category: 'category',
  amount: 'amount',
  status: 'status',
  createdAt: 'createdAt',
  code: 'code',
};

const INCLUDE = {
  customer: { select: { id: true, name: true, code: true } },
  location: {
    select: { id: true, name: true, code: true, city: true, state: true },
  },
  rep: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  salesActivity: {
    select: { id: true, activityCode: true, subject: true, type: true },
  },
} satisfies Prisma.ExpenseInclude;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
  ) {}

  private where(query: ExpenseListQueryDto): Prisma.ExpenseWhereInput {
    const and: Prisma.ExpenseWhereInput[] = [{ archivedAt: null }];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.locationId) and.push({ locationId: query.locationId });
    if (query.repId) and.push({ repId: query.repId });
    if (query.status) and.push({ status: query.status });
    if (query.from || query.to) {
      const expenseDate: Prisma.DateTimeFilter = {};
      if (query.from) {
        const from = new Date(`${query.from}T00:00:00`);
        if (!Number.isNaN(from.getTime())) expenseDate.gte = from;
      }
      if (query.to) {
        const to = new Date(`${query.to}T23:59:59.999`);
        if (!Number.isNaN(to.getTime())) expenseDate.lte = to;
      }
      if (Object.keys(expenseDate).length > 0) {
        and.push({ expenseDate });
      }
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { merchant: containsCi(q) },
          { category: containsCi(q) },
          { code: containsCi(q) },
          { paymentMethod: containsCi(q) },
          { notes: containsCi(q) },
          { location: { name: containsCi(q) } },
        ],
      });
    }
    return { AND: and };
  }

  private serialize(row: {
    amount: Prisma.Decimal | number | string;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      amount:
        typeof row.amount === 'object' && row.amount != null && 'toString' in row.amount
          ? Number(row.amount.toString())
          : Number(row.amount),
    };
  }

  async list(query: ExpenseListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items, sumAgg] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          expenseDate: 'desc',
        }),
        include: INCLUDE,
      }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);
    const totalAmount =
      sumAgg._sum.amount == null ? 0 : Number(sumAgg._sum.amount.toString());
    return {
      data: {
        ...paginate(
          items.map((item) => this.serialize(item)),
          total,
          page,
          pageSize,
        ),
        totalAmount,
        from: query.from ?? null,
        to: query.to ?? null,
      },
    };
  }

  async listForCustomer(customerId: string, query: ExpenseListQueryDto) {
    return this.list({ ...query, customerId });
  }

  async getById(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!expense || expense.archivedAt) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found',
      });
    }
    return { data: this.serialize(expense) };
  }

  async create(dto: CreateExpenseDto, actorId?: string) {
    const code = await this.codes.next('expense');
    const expense = await this.prisma.expense.create({
      data: {
        code,
        expenseDate: new Date(dto.expenseDate),
        merchant: dto.merchant.trim(),
        category: dto.category.trim(),
        paymentMethod: dto.paymentMethod?.trim() || null,
        amount: new Prisma.Decimal(dto.amount),
        status: dto.status ?? ExpenseStatus.PENDING,
        reimbursable: Boolean(dto.reimbursable),
        attendees: dto.attendees
          ? (dto.attendees as unknown as Prisma.InputJsonValue)
          : undefined,
        noReceipt: Boolean(dto.noReceipt),
        missingReceiptReason: dto.missingReceiptReason?.trim() || null,
        receiptUrl: dto.receiptUrl?.trim() || null,
        receiptFileName: dto.receiptFileName?.trim() || null,
        receiptFileSizeBytes:
          dto.receiptFileSizeBytes === undefined
            ? null
            : dto.receiptFileSizeBytes,
        receiptCaptureMethod: dto.receiptCaptureMethod?.trim() || null,
        receiptLat: dto.receiptLat ?? null,
        receiptLng: dto.receiptLng ?? null,
        receiptCapturedAt: dto.receiptCapturedAt
          ? new Date(dto.receiptCapturedAt)
          : null,
        notes: dto.notes?.trim() || null,
        customerId: dto.customerId,
        locationId: dto.locationId || null,
        repId: dto.repId || actorId || null,
        salesActivityId: dto.salesActivityId || null,
      },
      include: INCLUDE,
    });
    return { data: this.serialize(expense) };
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.ensureExists(id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        merchant: dto.merchant?.trim(),
        category: dto.category?.trim(),
        paymentMethod:
          dto.paymentMethod === undefined
            ? undefined
            : dto.paymentMethod?.trim() || null,
        amount:
          dto.amount === undefined
            ? undefined
            : new Prisma.Decimal(dto.amount),
        status: dto.status,
        reimbursable:
          dto.reimbursable === undefined
            ? undefined
            : Boolean(dto.reimbursable),
        attendees:
          dto.attendees === undefined
            ? undefined
            : (dto.attendees as unknown as Prisma.InputJsonValue),
        noReceipt:
          dto.noReceipt === undefined ? undefined : Boolean(dto.noReceipt),
        missingReceiptReason:
          dto.missingReceiptReason === undefined
            ? undefined
            : dto.missingReceiptReason?.trim() || null,
        receiptUrl:
          dto.receiptUrl === undefined
            ? undefined
            : dto.receiptUrl?.trim() || null,
        receiptFileName:
          dto.receiptFileName === undefined
            ? undefined
            : dto.receiptFileName?.trim() || null,
        receiptFileSizeBytes:
          dto.receiptFileSizeBytes === undefined
            ? undefined
            : dto.receiptFileSizeBytes,
        receiptCaptureMethod:
          dto.receiptCaptureMethod === undefined
            ? undefined
            : dto.receiptCaptureMethod?.trim() || null,
        receiptLat:
          dto.receiptLat === undefined ? undefined : dto.receiptLat,
        receiptLng:
          dto.receiptLng === undefined ? undefined : dto.receiptLng,
        receiptCapturedAt:
          dto.receiptCapturedAt === undefined
            ? undefined
            : dto.receiptCapturedAt
              ? new Date(dto.receiptCapturedAt)
              : null,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        customerId: dto.customerId,
        locationId:
          dto.locationId === undefined ? undefined : dto.locationId || null,
        repId: dto.repId === undefined ? undefined : dto.repId || null,
        salesActivityId:
          dto.salesActivityId === undefined
            ? undefined
            : dto.salesActivityId || null,
      },
      include: INCLUDE,
    });
    return { data: this.serialize(expense) };
  }

  async approve(id: string) {
    await this.ensureExists(id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedAt: new Date(),
        flaggedAt: null,
      },
      include: INCLUDE,
    });
    return { data: this.serialize(expense) };
  }

  async flagForReview(id: string) {
    await this.ensureExists(id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.NEEDS_REVIEW,
        flaggedAt: new Date(),
        approvedAt: null,
      },
      include: INCLUDE,
    });
    return { data: this.serialize(expense) };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: INCLUDE,
    });
    return { data: this.serialize(expense) };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.expense.findFirst({
      where: { id, archivedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found',
      });
    }
  }
}
