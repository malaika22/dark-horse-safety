import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma, SalesActivityType } from '@prisma/client';
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
import {
  CreateSalesActivityDto,
  FollowUpDto,
  SalesActivityListQueryDto,
  UpdateSalesActivityDto,
} from './dto/sales-activity.dto';

const SORT_MAP: Record<string, string> = {
  activityAt: 'activityAt',
  activityCode: 'activityCode',
  type: 'type',
  createdAt: 'createdAt',
  followUpAt: 'followUpAt',
};

@Injectable()
export class SalesActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(
    query: SalesActivityListQueryDto,
  ): Prisma.SalesActivityWhereInput {
    const and: Prisma.SalesActivityWhereInput[] = [
      { archivedAt: null },
    ];
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.contactId) and.push({ contactId: query.contactId });
    if (query.repId) and.push({ repId: query.repId });
    if (query.type) and.push({ type: query.type });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { subject: containsCi(q) },
          { activityCode: containsCi(q) },
          { notes: containsCi(q) },
          { outcome: containsCi(q) },
        ],
      });
    }
    return { AND: and };
  }

  async list(query: SalesActivityListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.salesActivity.count({ where }),
      this.prisma.salesActivity.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          activityAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          contact: { select: { id: true, fullName: true, code: true } },
          rep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, calls, visits, meetings, withFollowUp] = await Promise.all([
      this.prisma.salesActivity.count({ where: { archivedAt: null } }),
      this.prisma.salesActivity.count({
        where: { archivedAt: null, type: SalesActivityType.CALL },
      }),
      this.prisma.salesActivity.count({
        where: { archivedAt: null, type: SalesActivityType.VISIT },
      }),
      this.prisma.salesActivity.count({
        where: { archivedAt: null, type: SalesActivityType.MEETING },
      }),
      this.prisma.salesActivity.count({
        where: { archivedAt: null, followUpAt: { not: null } },
      }),
    ]);
    return { data: { total, calls, visits, meetings, withFollowUp } };
  }

  async getById(id: string) {
    const activity = await this.prisma.salesActivity.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        linkedQuote: {
          select: { id: true, quoteNumber: true, amount: true, status: true },
        },
      },
    });
    if (!activity) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Sales activity not found',
      });
    }
    return { data: activity };
  }

  async create(dto: CreateSalesActivityDto) {
    const activityCode = await this.codes.next('salesActivity');
    const activity = await this.prisma.salesActivity.create({
      data: {
        activityCode,
        type: dto.type ?? SalesActivityType.CALL,
        subject: dto.subject,
        outcome: dto.outcome,
        duration: dto.duration,
        notes: dto.notes,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined,
        customerId: dto.customerId,
        contactId: dto.contactId,
        repId: dto.repId,
        activityAt: dto.activityAt ? new Date(dto.activityAt) : undefined,
        linkedQuoteId: dto.linkedQuoteId,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.COMPLETE,
      },
    });
    return { data: activity };
  }

  async update(id: string, dto: UpdateSalesActivityDto) {
    await this.ensureExists(id);
    const activity = await this.prisma.salesActivity.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
        ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.followUpAt !== undefined
          ? {
              followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
            }
          : {}),
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
        ...(dto.repId !== undefined ? { repId: dto.repId } : {}),
        ...(dto.activityAt !== undefined
          ? { activityAt: new Date(dto.activityAt) }
          : {}),
        ...(dto.linkedQuoteId !== undefined
          ? { linkedQuoteId: dto.linkedQuoteId }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
      },
    });
    return { data: activity };
  }

  async followUp(id: string, dto: FollowUpDto) {
    await this.ensureExists(id);
    const activity = await this.prisma.salesActivity.update({
      where: { id },
      data: {
        followUpAt: new Date(dto.followUpAt),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return { data: activity };
  }

  async exportCsv(
    query: SalesActivityListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.SalesActivityWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.salesActivity.findMany({
      where,
      orderBy: { activityAt: 'desc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        contact: { select: { id: true, fullName: true, code: true } },
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      {
        key: 'activityCode',
        header: 'Activity Code',
        value: (r: Row) => r.activityCode,
      },
      {
        key: 'date',
        header: 'Date',
        value: (r: Row) => isoDate(r.activityAt),
      },
      { key: 'type', header: 'Type', value: (r: Row) => r.type },
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
      { key: 'rep', header: 'Rep', value: (r: Row) => userLabel(r.rep) },
      { key: 'subject', header: 'Subject', value: (r: Row) => r.subject },
      { key: 'outcome', header: 'Outcome', value: (r: Row) => r.outcome },
      { key: 'duration', header: 'Duration', value: (r: Row) => r.duration },
      {
        key: 'followUp',
        header: 'Follow-up',
        value: (r: Row) => isoDate(r.followUpAt),
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Sales Activities',
      'sales-activities',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.salesActivity.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Sales activity not found',
      });
    }
  }
}
