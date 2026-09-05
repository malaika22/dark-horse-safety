import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
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
  CreateFormRuleDto,
  FormRuleListQueryDto,
  UpdateFormRuleDto,
} from './dto/form-rule.dto';

const SORT_MAP: Record<string, string> = {
  formTemplate: 'formTemplate',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
};

@Injectable()
export class FormRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: FormRuleListQueryDto): Prisma.FormRuleWhereInput {
    const and: Prisma.FormRuleWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.formTemplate)
      and.push({ formTemplate: containsCi(query.formTemplate) });
    if (query.jobType) and.push({ jobType: containsCi(query.jobType) });
    if (query.hardGate !== undefined) and.push({ hardGate: query.hardGate });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { formTemplate: containsCi(q) },
          { code: containsCi(q) },
          { jobType: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: FormRuleListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.formRule.count({ where }),
      this.prisma.formRule.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          customer: { select: { id: true, name: true, code: true } },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, hardGate] = await Promise.all([
      this.prisma.formRule.count({ where: { archivedAt: null } }),
      this.prisma.formRule.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.formRule.count({ where: { archivedAt: { not: null } } }),
      this.prisma.formRule.count({
        where: { archivedAt: null, hardGate: true },
      }),
    ]);
    return { data: { total, active, archived, hardGate } };
  }

  async getById(id: string) {
    const rule = await this.prisma.formRule.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
    return { data: rule };
  }

  async create(dto: CreateFormRuleDto) {
    const code = await this.codes.next('formRule');
    const rule = await this.prisma.formRule.create({
      data: {
        code,
        customerId: dto.customerId,
        jobType: dto.jobType,
        formTemplate: dto.formTemplate,
        required: dto.required ?? true,
        hardGate: dto.hardGate ?? false,
        blocksToggle: dto.blocksToggle ?? false,
        due: dto.due,
        appliesFrom: dto.appliesFrom ? new Date(dto.appliesFrom) : undefined,
        trigger: dto.trigger,
        appliesTo: dto.appliesTo,
        version: dto.version,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        ownerId: dto.ownerId,
      },
    });
    return { data: rule };
  }

  async update(id: string, dto: UpdateFormRuleDto) {
    await this.ensureExists(id);
    const rule = await this.prisma.formRule.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId }
          : {}),
        ...(dto.jobType !== undefined ? { jobType: dto.jobType } : {}),
        ...(dto.formTemplate !== undefined
          ? { formTemplate: dto.formTemplate }
          : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.hardGate !== undefined ? { hardGate: dto.hardGate } : {}),
        ...(dto.blocksToggle !== undefined
          ? { blocksToggle: dto.blocksToggle }
          : {}),
        ...(dto.due !== undefined ? { due: dto.due } : {}),
        ...(dto.appliesFrom !== undefined
          ? {
              appliesFrom: dto.appliesFrom ? new Date(dto.appliesFrom) : null,
            }
          : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.appliesTo !== undefined ? { appliesTo: dto.appliesTo } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      },
    });
    return { data: rule };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const rule = await this.prisma.formRule.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: rule };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.formRule.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async duplicate(id: string) {
    const existing = await this.prisma.formRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
    const code = await this.codes.next('formRule');
    const copy = await this.prisma.formRule.create({
      data: {
        code,
        customerId: existing.customerId,
        jobType: existing.jobType,
        formTemplate: existing.formTemplate,
        required: existing.required,
        hardGate: existing.hardGate,
        blocksToggle: existing.blocksToggle,
        due: existing.due,
        appliesFrom: existing.appliesFrom,
        trigger: existing.trigger,
        appliesTo: existing.appliesTo,
        version: existing.version,
        status: CrmRecordStatus.DRAFT,
        ownerId: existing.ownerId,
      },
    });
    return { data: copy };
  }

  async copyToCustomer(id: string, customerId: string) {
    const existing = await this.prisma.formRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
    const code = await this.codes.next('formRule');
    const copy = await this.prisma.formRule.create({
      data: {
        code,
        customerId,
        jobType: existing.jobType,
        formTemplate: existing.formTemplate,
        required: existing.required,
        hardGate: existing.hardGate,
        blocksToggle: existing.blocksToggle,
        due: existing.due,
        appliesFrom: existing.appliesFrom,
        trigger: existing.trigger,
        appliesTo: existing.appliesTo,
        version: existing.version,
        status: CrmRecordStatus.DRAFT,
        ownerId: existing.ownerId,
      },
    });
    return { data: copy };
  }

  async exportCsv(
    query: FormRuleListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.FormRuleWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.formRule.findMany({
      where,
      orderBy: { formTemplate: 'asc' },
      take: 5000,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      { key: 'code', header: 'Code', value: (r: Row) => r.code },
      {
        key: 'customer',
        header: 'Customer',
        value: (r: Row) => r.customer?.name,
      },
      {
        key: 'formTemplate',
        header: 'Form Template',
        value: (r: Row) => r.formTemplate,
      },
      { key: 'jobType', header: 'Job Type', value: (r: Row) => r.jobType },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      {
        key: 'required',
        header: 'Required',
        value: (r: Row) => (r.required ? 'Yes' : 'No'),
      },
      {
        key: 'hardGate',
        header: 'Hard Gate',
        value: (r: Row) => (r.hardGate ? 'Yes' : 'No'),
      },
      {
        key: 'blocksToggle',
        header: 'Blocks Toggle',
        value: (r: Row) => (r.blocksToggle ? 'Yes' : 'No'),
      },
      {
        key: 'appliesTo',
        header: 'Applies To',
        value: (r: Row) => r.appliesTo,
      },
      { key: 'due', header: 'Due', value: (r: Row) => r.due },
      {
        key: 'owner',
        header: 'Owner',
        value: (r: Row) => userLabel(r.owner),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Form Rules',
      'form-rules',
      rows,
      columns,
      query.format ?? 'csv',
    );
  }

  async history(id: string) {
    const rule = await this.prisma.formRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
    const events: { id: string; at: string; label: string; detail: string }[] =
      [
        {
          id: `${id}-created`,
          at: rule.createdAt.toISOString(),
          label: 'Created',
          detail: `Rule ${rule.code} · template ${rule.formTemplate}`,
        },
        {
          id: `${id}-status`,
          at: rule.updatedAt.toISOString(),
          label: 'Status',
          detail: rule.status,
        },
        {
          id: `${id}-template`,
          at: rule.updatedAt.toISOString(),
          label: 'Form Template',
          detail: rule.formTemplate,
        },
      ];
    if (rule.jobType) {
      events.push({
        id: `${id}-job-type`,
        at: rule.updatedAt.toISOString(),
        label: 'Job Type',
        detail: rule.jobType,
      });
    }
    if (rule.hardGate) {
      events.push({
        id: `${id}-hard-gate`,
        at: rule.updatedAt.toISOString(),
        label: 'Hard Gate',
        detail: 'Hard gate enabled',
      });
    }
    if (rule.appliesFrom) {
      events.push({
        id: `${id}-applies-from`,
        at: rule.appliesFrom.toISOString(),
        label: 'Applies From',
        detail: rule.appliesFrom.toISOString().slice(0, 10),
      });
    }
    if (rule.updatedAt.getTime() !== rule.createdAt.getTime()) {
      events.push({
        id: `${id}-updated`,
        at: rule.updatedAt.toISOString(),
        label: 'Updated',
        detail: `Last modified ${rule.updatedAt.toISOString()}`,
      });
    }
    events.sort((a, b) => b.at.localeCompare(a.at));
    return { data: { events } };
  }

  async test(id: string, jobType: string) {
    const rule = await this.prisma.formRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
    const ruleJobType = rule.jobType ?? '';
    const input = jobType.trim();
    const ruleNorm = ruleJobType.trim().toLowerCase();
    const inputNorm = input.toLowerCase();

    let matches = false;
    let reason: string;
    if (!ruleNorm) {
      matches = true;
      reason = 'Rule has no job type filter — matches all job types';
    } else if (inputNorm === ruleNorm) {
      matches = true;
      reason = `Job type equals rule filter "${ruleJobType}"`;
    } else if (inputNorm.includes(ruleNorm) || ruleNorm.includes(inputNorm)) {
      matches = true;
      reason = `Job type contains rule filter "${ruleJobType}"`;
    } else {
      matches = false;
      reason = `Job type "${input}" does not match rule filter "${ruleJobType}"`;
    }

    return {
      data: {
        matches,
        reason,
        ruleJobType: rule.jobType,
        formTemplate: rule.formTemplate,
      },
    };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.formRule.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Form rule not found',
      });
    }
  }
}
