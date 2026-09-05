import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWorkOrderDto,
  WorkOrderListQueryDto,
} from './dto/work-order.dto';

const SORT_MAP: Record<string, string> = {
  code: 'code',
  title: 'title',
  status: 'status',
  serviceDate: 'serviceDate',
  createdAt: 'createdAt',
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
  ) {}

  private where(query: WorkOrderListQueryDto): Prisma.WorkOrderWhereInput {
    const and: Prisma.WorkOrderWhereInput[] = [{ archivedAt: null }];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.locationId) and.push({ locationId: query.locationId });
    if (query.quoteId) and.push({ quoteId: query.quoteId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { code: containsCi(q) },
          { title: containsCi(q) },
          { notes: containsCi(q) },
          { category: containsCi(q) },
        ],
      });
    }
    return { AND: and };
  }

  async list(query: WorkOrderListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          quote: { select: { id: true, quoteNumber: true } },
          assignedRep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async getById(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
        quote: { select: { id: true, quoteNumber: true, amount: true } },
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!workOrder) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }
    return { data: workOrder };
  }

  async create(dto: CreateWorkOrderDto) {
    const code = await this.codes.next('workOrder');
    const workOrder = await this.prisma.workOrder.create({
      data: {
        code,
        customerId: dto.customerId,
        title: dto.title,
        category: dto.category,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.DRAFT,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        notes: dto.notes,
        locationId: dto.locationId,
        quoteId: dto.quoteId,
        assignedRepId: dto.assignedRepId,
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
      },
    });
    return { data: workOrder };
  }

  async convertFromQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteNumber: true,
        customerId: true,
        notes: true,
        ownerId: true,
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }

    const code = await this.codes.next('workOrder');
    const workOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: {
          code,
          customerId: quote.customerId,
          quoteId: quote.id,
          title: `WO from ${quote.quoteNumber}`,
          notes: quote.notes,
          status: CrmRecordStatus.DRAFT,
          assignedRepId: quote.ownerId,
        },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          quote: { select: { id: true, quoteNumber: true } },
        },
      });
      await tx.customer.update({
        where: { id: quote.customerId },
        data: { openJobs: { increment: 1 } },
      });
      return created;
    });
    return { data: workOrder };
  }
}
