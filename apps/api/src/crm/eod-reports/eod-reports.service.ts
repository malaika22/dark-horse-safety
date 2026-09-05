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
  CreateEodReportDto,
  EodReportListQueryDto,
  UpdateEodReportDto,
} from './dto/eod-report.dto';

const SORT_MAP: Record<string, string> = {
  reportDate: 'reportDate',
  reportCode: 'reportCode',
  createdAt: 'createdAt',
  status: 'status',
  submittedAt: 'submittedAt',
};

@Injectable()
export class EodReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: EodReportListQueryDto): Prisma.EodReportWhereInput {
    const and: Prisma.EodReportWhereInput[] = [];
    if (query.repId) and.push({ repId: query.repId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.dateFrom || query.dateTo) {
      and.push({
        reportDate: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { reportCode: containsCi(q) },
          { notes: containsCi(q) },
          { nextDayPlan: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: EodReportListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.eodReport.count({ where }),
      this.prisma.eodReport.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          reportDate: 'desc',
        }),
        include: {
          rep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, submitted, pending, complete] = await Promise.all([
      this.prisma.eodReport.count(),
      this.prisma.eodReport.count({
        where: { status: CrmRecordStatus.SUBMITTED },
      }),
      this.prisma.eodReport.count({
        where: { status: CrmRecordStatus.PENDING },
      }),
      this.prisma.eodReport.count({
        where: { status: CrmRecordStatus.COMPLETE },
      }),
    ]);
    return { data: { total, submitted, pending, complete } };
  }

  async getById(id: string) {
    const report = await this.prisma.eodReport.findUnique({
      where: { id },
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        activityLines: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'EOD report not found',
      });
    }
    return { data: report };
  }

  async create(dto: CreateEodReportDto) {
    const reportCode = await this.codes.next('eodReport');
    const report = await this.prisma.eodReport.create({
      data: {
        reportCode,
        reportDate: new Date(dto.reportDate),
        repId: dto.repId,
        notes: dto.notes,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.PENDING,
      },
    });
    return { data: report };
  }

  async update(id: string, dto: UpdateEodReportDto) {
    await this.ensureExists(id);
    const report = await this.prisma.eodReport.update({
      where: { id },
      data: {
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.nextDayPlan !== undefined
          ? { nextDayPlan: dto.nextDayPlan }
          : {}),
        ...(dto.pipelineNote !== undefined
          ? { pipelineNote: dto.pipelineNote }
          : {}),
        ...(dto.quotesNote !== undefined
          ? { quotesNote: dto.quotesNote }
          : {}),
      },
    });
    return { data: report };
  }

  async remind(id: string) {
    await this.ensureExists(id);
    return { data: { sent: true } };
  }

  async exportCsv(query: EodReportListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.EodReportWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.eodReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: 5000,
      include: {
        rep: { select: { firstName: true, lastName: true } },
      },
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'reportCode', header: 'Code', value: (r) => r.reportCode },
      {
        key: 'reportDate',
        header: 'Date',
        value: (r) => r.reportDate.toISOString().slice(0, 10),
      },
      {
        key: 'rep',
        header: 'Rep',
        value: (r) =>
          [r.rep.firstName, r.rep.lastName].filter(Boolean).join(' '),
      },
      { key: 'status', header: 'Status', value: (r) => r.status },
      {
        key: 'activitiesCount',
        header: 'Activities',
        value: (r) => r.activitiesCount,
      },
    ]);
    return { data: { csv, filename: 'eod-reports.csv' } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.eodReport.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'EOD report not found',
      });
    }
  }
}
