import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma, SalesActivityType } from '@prisma/client';
import { MailService } from '../../auth/mail.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  ExportService,
  isoDate,
  userLabel,
} from '../../common/services/export.service';
import {
  containsCi,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { endOfDay, startOfDay } from '../common/open-jobs.util';
import {
  CreateEodReportDto,
  EodReportListQueryDto,
  RemindEodDto,
  RequestEodDetailDto,
  UpdateEodReportDto,
} from './dto/eod-report.dto';

const SORT_MAP: Record<string, string> = {
  reportDate: 'reportDate',
  date: 'reportDate',
  reportCode: 'reportCode',
  createdAt: 'createdAt',
  status: 'status',
  submittedAt: 'submittedAt',
  activities: 'activitiesCount',
  activitiesCount: 'activitiesCount',
  pipeline: 'pipelineValue',
  pipelineAdded: 'pipelineValue',
  pipelineValue: 'pipelineValue',
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
          ...(query.dateFrom
            ? { gte: new Date(`${query.dateFrom}T00:00:00`) }
            : {}),
          ...(query.dateTo
            ? { lte: new Date(`${query.dateTo}T23:59:59.999`) }
            : {}),
        },
      });
    }
    if (query.hasPipeline === true) {
      and.push({ pipelineValue: { gt: 0 } });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { reportCode: containsCi(q) },
          { notes: containsCi(q) },
          { nextDayPlan: containsCi(q) },
          { visitsDetail: containsCi(q) },
          {
            rep: {
              OR: [
                { firstName: containsCi(q) },
                { lastName: containsCi(q) },
                { email: containsCi(q) },
              ],
            },
          },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private orderBy(query: EodReportListQueryDto): Prisma.EodReportOrderByWithRelationInput[] {
    const dir = query.direction === 'asc' ? 'asc' : 'desc';
    const sort = (query.sort ?? '').trim();
    if (sort === 'rep' || sort === 'repName') {
      return [{ rep: { lastName: dir } }, { rep: { firstName: dir } }];
    }
    const mapped = SORT_MAP[sort];
    if (mapped) return [{ [mapped]: dir }];
    return [{ reportDate: 'desc' }];
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
        orderBy: this.orderBy(query),
        include: {
          rep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { activityLines: true } },
        },
      }),
    ]);
    const enriched = await this.attachLiveActivityCounts(items);
    return { data: paginate(enriched, total, page, pageSize) };
  }

  async listAttention() {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.eodReport.findMany({
      where: {
        reportDate: { gte: cutoff },
        OR: [
          {
            status: {
              in: [CrmRecordStatus.PENDING, CrmRecordStatus.IN_PROGRESS],
            },
          },
          {
            status: {
              in: [CrmRecordStatus.SUBMITTED, CrmRecordStatus.COMPLETE],
            },
            submittedAt: { not: null },
          },
        ],
      },
      orderBy: { reportDate: 'desc' },
      take: 40,
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const items = rows
      .map((r) => {
        const submitted = r.submittedAt ? new Date(r.submittedAt) : null;
        const reportDay = new Date(r.reportDate);
        const pending =
          r.status === CrmRecordStatus.PENDING ||
          r.status === CrmRecordStatus.IN_PROGRESS ||
          !submitted;
        const late =
          Boolean(submitted) &&
          (submitted!.getHours() >= 18 ||
            submitted!.toDateString() !== reportDay.toDateString());
        if (!pending && !late) return null;

        const due = new Date(r.reportDate);
        due.setHours(18, 0, 0, 0);
        const lateMs = (pending ? Date.now() : submitted!.getTime()) - due.getTime();
        const hoursLate = Math.max(0, Math.round(lateMs / 3_600_000));
        const detail = pending
          ? hoursLate >= 24
            ? `${Math.floor(hoursLate / 24)} Day${
                Math.floor(hoursLate / 24) === 1 ? '' : 's'
              } Late`
            : `Due 6:00 PM · ${Math.max(hoursLate, 1)} Hrs Late`
          : `Submitted ${submitted!.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}`;
        return {
          id: r.id,
          reportCode: r.reportCode,
          reportDate: r.reportDate,
          submittedAt: r.submittedAt,
          status: r.status,
          kind: pending ? ('missing' as const) : ('late' as const),
          detail,
          rep: r.rep,
          selectedByDefault: true,
        };
      })
      .filter(Boolean);

    return { data: { items } };
  }

  async kpi() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [today, submitted, pending, activities, pipelineAgg] =
      await Promise.all([
        this.prisma.eodReport.count({
          where: { reportDate: { gte: startOfToday } },
        }),
        this.prisma.eodReport.count({
          where: {
            submittedAt: { gte: startOfToday },
            status: {
              in: [CrmRecordStatus.SUBMITTED, CrmRecordStatus.COMPLETE],
            },
          },
        }),
        this.prisma.eodReport.count({
          where: {
            status: {
              in: [CrmRecordStatus.PENDING, CrmRecordStatus.IN_PROGRESS],
            },
          },
        }),
        this.prisma.salesActivity.count({
          where: { archivedAt: null, activityAt: { gte: weekAgo } },
        }),
        this.prisma.quote.aggregate({
          where: {
            archivedAt: null,
            status: {
              in: [
                CrmRecordStatus.DRAFT,
                CrmRecordStatus.SENT,
                CrmRecordStatus.OPEN,
                CrmRecordStatus.PENDING,
              ],
            },
            updatedAt: { gte: weekAgo },
          },
          _sum: { amount: true },
        }),
      ]);

    const pipelineRaw =
      pipelineAgg._sum.amount == null
        ? 0
        : Number(pipelineAgg._sum.amount.toString());
    const pipeline =
      pipelineRaw <= 0
        ? 0
        : pipelineRaw >= 1000
          ? `$${Math.round(pipelineRaw / 1000)}K`
          : `$${Math.round(pipelineRaw)}`;

    return { data: { today, submitted, pending, activities, pipeline } };
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
    const [enriched] = await this.attachLiveActivityCounts([report]);
    return { data: enriched };
  }

  /** Prefer live SalesActivity totals for the report day; fall back to line count. */
  private async attachLiveActivityCounts<
    T extends {
      id: string;
      repId: string;
      reportDate: Date;
      activitiesCount: number;
      callsCount: number;
      visitsCount: number;
      meetingsCount: number;
      _count?: { activityLines: number };
    },
  >(items: T[]) {
    if (items.length === 0) return items;

    const dayKeys = items.map((r) => ({
      id: r.id,
      repId: r.repId,
      from: startOfDay(r.reportDate),
      to: endOfDay(r.reportDate),
    }));
    const minFrom = new Date(Math.min(...dayKeys.map((d) => d.from.getTime())));
    const maxTo = new Date(Math.max(...dayKeys.map((d) => d.to.getTime())));
    const repIds = [...new Set(items.map((r) => r.repId))];

    const activities = await this.prisma.salesActivity.findMany({
      where: {
        archivedAt: null,
        repId: { in: repIds },
        activityAt: { gte: minFrom, lte: maxTo },
      },
      select: { repId: true, type: true, activityAt: true },
    });

    return items.map((report) => {
      const from = startOfDay(report.reportDate).getTime();
      const to = endOfDay(report.reportDate).getTime();
      const dayActs = activities.filter(
        (a) =>
          a.repId === report.repId &&
          a.activityAt.getTime() >= from &&
          a.activityAt.getTime() <= to,
      );
      const lineFallback = report._count?.activityLines ?? 0;
      const calls = dayActs.filter((a) => a.type === SalesActivityType.CALL)
        .length;
      const visits = dayActs.filter((a) => a.type === SalesActivityType.VISIT)
        .length;
      const meetings = dayActs.filter(
        (a) => a.type === SalesActivityType.MEETING,
      ).length;
      const total = dayActs.length > 0 ? dayActs.length : lineFallback;
      const { _count, ...rest } = report;
      return {
        ...rest,
        activitiesCount: total || report.activitiesCount,
        callsCount: dayActs.length > 0 ? calls : report.callsCount,
        visitsCount: dayActs.length > 0 ? visits : report.visitsCount,
        meetingsCount: dayActs.length > 0 ? meetings : report.meetingsCount,
      };
    });
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

  async remind(id: string, dto: RemindEodDto = {}) {
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

    const viaEmail = dto.viaEmail !== false;
    const viaPush = dto.viaPush === true;
    const message =
      dto.message?.trim() ||
      `Your EOD report ${report.reportCode} is missing or late. Please submit it as soon as possible — reach out if you're blocked.`;

    const repName =
      [report.rep?.firstName, report.rep?.lastName].filter(Boolean).join(' ') ||
      'there';
    const to = report.rep?.email?.trim();

    let emailed = false;
    let pushed = false;

    if (viaEmail) {
      if (!to) {
        return {
          data: {
            sent: false,
            emailed: false,
            pushed: false,
            id,
            reason: 'no_email' as const,
          },
        };
      }
      await this.mail.sendCrmEmail({
        to,
        subject: `EOD reminder: ${report.reportCode}`,
        title: 'EOD Report Reminder',
        bodyHtml: `<p style="margin:0 0 16px;color:#d1d5db">Hi <strong style="color:#fff">${repName}</strong>,</p>
          <p style="margin:0 0 16px;color:#d1d5db">${message.replace(/\n/g, '<br/>')}</p>
          <p style="margin:0;color:#9ca3af;font-size:13px">Report <strong style="color:#fff">${report.reportCode}</strong> · ${isoDate(report.reportDate)}</p>`,
        kind: 'crm-eod-remind',
      });
      emailed = true;
    }

    if (viaPush) {
      await this.prisma.salesActivity.create({
        data: {
          activityCode: await this.codes.next('salesActivity'),
          type: SalesActivityType.OTHER,
          subject: `EOD Push · ${report.reportCode}`,
          notes: message,
          status: CrmRecordStatus.PENDING,
          activityAt: new Date(),
          followUpAt: new Date(),
          repId: report.repId,
        },
      });
      pushed = true;
    }

    const stamp = new Date().toISOString();
    const channels = [
      emailed ? 'email' : null,
      pushed ? 'push' : null,
    ]
      .filter(Boolean)
      .join('+');
    const noteLine = `[REMINDER ${stamp}] via ${channels || 'none'}: ${message}`;
    await this.prisma.eodReport.update({
      where: { id },
      data: {
        notes: report.notes?.trim()
          ? `${report.notes.trim()}\n${noteLine}`
          : noteLine,
      },
    });

    return {
      data: {
        sent: emailed || pushed,
        emailed,
        pushed,
        id,
      },
    };
  }

  async bulkRemind(ids: string[], dto: RemindEodDto = {}) {
    const unique = [...new Set(ids.filter(Boolean))];
    let sent = 0;
    const results: Array<{
      sent: boolean;
      emailed?: boolean;
      pushed?: boolean;
      id: string;
      reason?: 'no_email';
    }> = [];
    for (const id of unique) {
      const result = await this.remind(id, dto);
      results.push(result.data);
      if (result.data.sent) sent += 1;
    }
    return { data: { sent, ids: unique, results } };
  }

  async requestDetail(id: string, dto: RequestEodDetailDto) {
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

    const missing = (dto.missing ?? []).map((m) => m.trim()).filter(Boolean);
    const note = dto.note?.trim() || '';
    const dueBackBy = dto.dueBackBy ? new Date(dto.dueBackBy) : null;
    const viaEmail = dto.viaEmail !== false;
    const viaPush = dto.viaPush !== false;

    const missingLabel = missing.length
      ? missing.map((m) => m.replace(/_/g, ' ')).join(', ')
      : 'additional detail';
    const bodyText = [
      `Manager requested more detail on ${report.reportCode}.`,
      `What's missing: ${missingLabel}.`,
      note ? `Note: ${note}` : null,
      dueBackBy && !Number.isNaN(dueBackBy.getTime())
        ? `Due back by: ${dueBackBy.toLocaleString('en-US')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const stamp = new Date().toISOString();
    const noteLine = `[REQUEST DETAIL ${stamp}] missing=${missing.join('|') || 'other'}; due=${dueBackBy?.toISOString() ?? '—'}; ${note}`;
    const updated = await this.prisma.eodReport.update({
      where: { id },
      data: {
        status: CrmRecordStatus.NEEDS_REVIEW,
        notes: report.notes?.trim()
          ? `${report.notes.trim()}\n${noteLine}`
          : noteLine,
      },
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const repName =
      [report.rep?.firstName, report.rep?.lastName].filter(Boolean).join(' ') ||
      'there';
    let emailed = false;
    let pushed = false;

    if (viaEmail && report.rep?.email?.trim()) {
      await this.mail.sendCrmEmail({
        to: report.rep.email.trim(),
        subject: `EOD detail requested: ${report.reportCode}`,
        title: 'Request More Detail',
        bodyHtml: `<p style="margin:0 0 16px;color:#d1d5db">Hi <strong style="color:#fff">${repName}</strong>,</p>
          <p style="margin:0 0 16px;color:#d1d5db">${bodyText.replace(/\n/g, '<br/>')}</p>`,
        kind: 'crm-eod-request-detail',
      });
      emailed = true;
    }

    if (viaPush) {
      await this.prisma.salesActivity.create({
        data: {
          activityCode: await this.codes.next('salesActivity'),
          type: SalesActivityType.OTHER,
          subject: `EOD Detail Request · ${report.reportCode}`,
          notes: bodyText,
          status: CrmRecordStatus.PENDING,
          activityAt: new Date(),
          followUpAt:
            dueBackBy && !Number.isNaN(dueBackBy.getTime())
              ? dueBackBy
              : new Date(Date.now() + 24 * 60 * 60 * 1000),
          repId: report.repId,
        },
      });
      pushed = true;
    }

    return {
      data: {
        report: updated,
        emailed,
        pushed,
        missing,
        dueBackBy: dueBackBy?.toISOString() ?? null,
      },
    };
  }

  async acknowledge(id: string, body: { by?: string; note?: string } = {}) {
    const report = await this.prisma.eodReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'EOD report not found',
      });
    }
    const by = body.by?.trim() || 'Manager';
    const stamp = new Date().toISOString();
    const ackJson = JSON.stringify({ by, at: stamp, note: body.note ?? null });
    let notes = report.notes ?? '';
    if (/---ACK---/.test(notes)) {
      notes = notes.replace(/---ACK---\s*\{[\s\S]*?\}\s*$/m, '').trim();
    }
    notes = `${notes}\n---ACK---\n${ackJson}`.trim();
    const updated = await this.prisma.eodReport.update({
      where: { id },
      data: {
        notes,
        status:
          report.status === CrmRecordStatus.PENDING
            ? CrmRecordStatus.SUBMITTED
            : report.status,
      },
      include: {
        rep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return { data: updated };
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
