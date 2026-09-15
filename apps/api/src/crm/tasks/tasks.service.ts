import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, CrmTaskPriority, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { parseCrmRecordStatus } from '../../common/utils/crm-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCrmTaskDto,
  CrmTaskListQueryDto,
  UpdateCrmTaskDto,
} from './dto/crm-task.dto';

const SORT_MAP: Record<string, string> = {
  dueAt: 'dueAt',
  createdAt: 'createdAt',
  code: 'code',
  priority: 'priority',
  status: 'status',
  title: 'title',
};

const taskInclude = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  customer: { select: { id: true, name: true, code: true } },
  quote: {
    select: { id: true, quoteNumber: true, status: true, revision: true },
  },
  salesActivity: {
    select: {
      id: true,
      activityCode: true,
      subject: true,
      type: true,
      activityAt: true,
    },
  },
} satisfies Prisma.CrmTaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
  ) {}

  private where(query: CrmTaskListQueryDto): Prisma.CrmTaskWhereInput {
    const and: Prisma.CrmTaskWhereInput[] = [{ archivedAt: null }];
    if (query.salesActivityId) {
      and.push({ salesActivityId: query.salesActivityId });
    }
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.assigneeId) and.push({ assigneeId: query.assigneeId });
    const status = parseCrmRecordStatus(query.status);
    if (status) and.push({ status });
    if (query.priority) {
      and.push({ priority: query.priority as CrmTaskPriority });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { code: containsCi(q) },
          { title: containsCi(q) },
          { taskType: containsCi(q) },
          { notes: containsCi(q) },
          { relatedLabel: containsCi(q) },
        ],
      });
    }
    return { AND: and };
  }

  private withDisplayStatus<T extends { status: CrmRecordStatus; dueAt: Date | null }>(
    task: T,
  ) {
    const now = new Date();
    const displayStatus =
      task.status === CrmRecordStatus.OPEN &&
      task.dueAt &&
      task.dueAt.getTime() < now.getTime()
        ? 'OVERDUE'
        : task.status;
    return { ...task, displayStatus };
  }

  async list(query: CrmTaskListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.crmTask.count({ where }),
      this.prisma.crmTask.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          dueAt: 'asc',
        }),
        include: taskInclude,
      }),
    ]);
    return {
      data: paginate(
        items.map((t) => this.withDisplayStatus(t)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async getById(id: string) {
    const task = await this.prisma.crmTask.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!task || task.archivedAt) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }
    return { data: this.withDisplayStatus(task) };
  }

  async create(dto: CreateCrmTaskDto, createdById?: string) {
    const code = await this.codes.next('task');
    const title =
      dto.title?.trim() ||
      dto.notes?.trim()?.slice(0, 120) ||
      dto.taskType;
    const task = await this.prisma.crmTask.create({
      data: {
        code,
        title,
        taskType: dto.taskType.trim(),
        priority: (dto.priority as CrmTaskPriority) ?? CrmTaskPriority.MEDIUM,
        status:
          parseCrmRecordStatus(dto.status) ?? CrmRecordStatus.OPEN,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        reminder: dto.reminder,
        notes: dto.notes,
        relatedLabel: dto.relatedLabel,
        attachmentUrl: dto.attachmentUrl,
        attachmentFileName: dto.attachmentFileName,
        salesActivityId: dto.salesActivityId,
        customerId: dto.customerId,
        quoteId: dto.quoteId,
        assigneeId: dto.assigneeId,
        createdById,
      },
      include: taskInclude,
    });
    return { data: this.withDisplayStatus(task) };
  }

  async update(id: string, dto: UpdateCrmTaskDto) {
    await this.ensureExists(id);
    const task = await this.prisma.crmTask.update({
      where: { id },
      data: {
        ...(dto.taskType !== undefined
          ? { taskType: dto.taskType.trim() }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.priority !== undefined
          ? { priority: dto.priority as CrmTaskPriority }
          : {}),
        ...(dto.status !== undefined
          ? {
              status:
                parseCrmRecordStatus(dto.status) ?? CrmRecordStatus.OPEN,
            }
          : {}),
        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
          : {}),
        ...(dto.reminder !== undefined ? { reminder: dto.reminder } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.relatedLabel !== undefined
          ? { relatedLabel: dto.relatedLabel }
          : {}),
        ...(dto.attachmentUrl !== undefined
          ? { attachmentUrl: dto.attachmentUrl }
          : {}),
        ...(dto.attachmentFileName !== undefined
          ? { attachmentFileName: dto.attachmentFileName }
          : {}),
        ...(dto.salesActivityId !== undefined
          ? { salesActivityId: dto.salesActivityId || null }
          : {}),
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId || null }
          : {}),
        ...(dto.quoteId !== undefined ? { quoteId: dto.quoteId || null } : {}),
        ...(dto.assigneeId !== undefined
          ? { assigneeId: dto.assigneeId || null }
          : {}),
      },
      include: taskInclude,
    });
    return { data: this.withDisplayStatus(task) };
  }

  async complete(id: string) {
    return this.update(id, { status: 'COMPLETE' });
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const task = await this.prisma.crmTask.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
      include: taskInclude,
    });
    return { data: this.withDisplayStatus(task) };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.crmTask.findFirst({
      where: { id, archivedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }
  }
}
