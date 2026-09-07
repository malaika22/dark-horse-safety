import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
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
    private readonly mail: MailService,
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
    const report = await this.prisma.eodReport.findUnique({
      where: { id },
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'EOD report not found',
      });
    }

    const to = report.rep?.email?.trim();
    if (!to) {
      return { data: { sent: false, id, reason: 'no_email' as const } };
    }

    const repName =
      [report.rep?.firstName, report.rep?.lastName].filter(Boolean).join(' ') ||
      'there';

    await this.mail.sendCrmEmail({
      to,
      subject: `EOD reminder: ${report.reportCode}`,
      title: 'EOD Report Reminder',
      bodyHtml: `<p style="margin:0 0 16px;color:#d1d5db">Hi <strong style="color:#fff">${repName}</strong>,</p>
        <p style="margin:0 0 16px;color:#d1d5db">This is a reminder to submit or review your end-of-day report <strong style="color:#fff">${report.reportCode}</strong>.</p>
        <p style="margin:0;color:#9ca3af;font-size:13px">Please complete the report when you can.</p>`,
      kind: 'crm-eod-remind',
    });

    return { data: { sent: true, id } };
  }

  async bulkRemind(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    let sent = 0;
    const results: Array<{
      sent: boolean;
      id: string;
      reason?: 'no_email';
    }> = [];
    for (const id of unique) {
      const result = await this.remind(id);
      results.push(result.data);
      if (result.data.sent) sent += 1;
    }
    return { data: { sent, ids: unique, results } };
  }

  async exportCsv(
    query: EodReportListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.EodReportWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.eodReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: 5000,
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      {
        key: 'reportCode',
        header: 'Report Code',
        value: (r: Row) => r.reportCode,
      },
      {
        key: 'date',
        header: 'Date',
        value: (r: Row) => isoDate(r.reportDate),
      },
      { key: 'rep', header: 'Rep', value: (r: Row) => userLabel(r.rep) },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'activities',
        header: 'Activities',
        value: (r: Row) => r.activitiesCount,
      },
      {
        key: 'calls',
        header: 'Calls',
        value: (r: Row) => r.callsCount,
      },
      {
        key: 'visits',
        header: 'Visits',
        value: (r: Row) => r.visitsCount,
      },
      {
        key: 'meetings',
        header: 'Meetings',
        value: (r: Row) => r.meetingsCount,
      },
      {
        key: 'quotesSent',
        header: 'Quotes Sent',
        value: (r: Row) => r.quotesSent,
      },
      {
        key: 'pipelineValue',
        header: 'Pipeline Value',
        value: (r: Row) =>
          r.pipelineValue == null ? '' : Number(r.pipelineValue),
      },
      {
        key: 'closedToday',
        header: 'Closed Today',
        value: (r: Row) =>
          r.closedToday == null ? '' : Number(r.closedToday),
      },
      {
        key: 'submittedAt',
        header: 'Submitted At',
        value: (r: Row) => isoDate(r.submittedAt),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'EOD Reports',
      'eod-reports',
      rows,
      columns,
      query.format ?? 'csv',
    );
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
