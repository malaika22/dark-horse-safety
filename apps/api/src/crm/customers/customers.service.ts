import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

const SORT_MAP: Record<string, string> = {
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  lastActivity: 'lastActivityAt',
  status: 'status',
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: CustomerListQueryDto): Prisma.CustomerWhereInput {
    const and: Prisma.CustomerWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.assignedRepId) and.push({ assignedRepId: query.assignedRepId });
    if (query.industry) and.push({ industry: containsCi(query.industry) });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: containsCi(q) },
          { code: containsCi(q) },
          { email: containsCi(q) },
          { phone: containsCi(q) },
          { legalEntityName: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: CustomerListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        include: {
          assignedRep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { contacts: true, locations: true },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, needsReview] = await Promise.all([
      this.prisma.customer.count({ where: { archivedAt: null } }),
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.customer.count({ where: { archivedAt: { not: null } } }),
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.NEEDS_REVIEW },
      }),
    ]);
    return {
      data: {
        total,
        active,
        archived,
        needsReview,
      },
    };
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contacts: { where: { archivedAt: null }, take: 50, orderBy: { fullName: 'asc' } },
        locations: { where: { archivedAt: null }, take: 50, orderBy: { name: 'asc' } },
        pricingRules: { where: { archivedAt: null }, take: 20 },
        requirements: { where: { archivedAt: null }, take: 20 },
        formRules: { where: { archivedAt: null }, take: 20 },
        routeRules: { where: { archivedAt: null }, take: 20 },
        documents: { take: 50, orderBy: { createdAt: 'desc' } },
        quotes: { take: 20, orderBy: { createdAt: 'desc' } },
        activities: { take: 20, orderBy: { activityAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    return { data: customer };
  }

  async create(dto: CreateCustomerDto) {
    const code = await this.codes.next('customer');
    const customer = await this.prisma.customer.create({
      data: {
        code,
        name: dto.name,
        legalEntityName: dto.legalEntityName,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        assignedRepId: dto.assignedRepId,
        industry: dto.industry,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        billingAddress: dto.billingAddress,
        mailingAddress: dto.mailingAddress,
        paymentTerms: dto.paymentTerms,
        creditLimit: dto.creditLimit,
        taxExempt: dto.taxExempt ?? false,
        taxId: dto.taxId,
        pricingTier: dto.pricingTier,
        netsuiteId: dto.netsuiteId,
        isnId: dto.isnId,
        veriforceId: dto.veriforceId,
        msaOnFile: dto.msaOnFile ?? false,
        msaExpiry: dto.msaExpiry ? new Date(dto.msaExpiry) : undefined,
        coiExpiry: dto.coiExpiry ? new Date(dto.coiExpiry) : undefined,
        w9OnFile: dto.w9OnFile,
        clockInRadius: dto.clockInRadius,
        requiresPo: dto.requiresPo ?? false,
        defaultRequiredForms: dto.defaultRequiredForms,
      },
    });
    return { data: customer };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.legalEntityName !== undefined
          ? { legalEntityName: dto.legalEntityName }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.assignedRepId !== undefined
          ? { assignedRepId: dto.assignedRepId }
          : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.billingAddress !== undefined
          ? { billingAddress: dto.billingAddress }
          : {}),
        ...(dto.mailingAddress !== undefined
          ? { mailingAddress: dto.mailingAddress }
          : {}),
        ...(dto.paymentTerms !== undefined
          ? { paymentTerms: dto.paymentTerms }
          : {}),
        ...(dto.creditLimit !== undefined
          ? { creditLimit: dto.creditLimit }
          : {}),
        ...(dto.taxExempt !== undefined ? { taxExempt: dto.taxExempt } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.pricingTier !== undefined
          ? { pricingTier: dto.pricingTier }
          : {}),
        ...(dto.netsuiteId !== undefined ? { netsuiteId: dto.netsuiteId } : {}),
        ...(dto.isnId !== undefined ? { isnId: dto.isnId } : {}),
        ...(dto.veriforceId !== undefined
          ? { veriforceId: dto.veriforceId }
          : {}),
        ...(dto.msaOnFile !== undefined ? { msaOnFile: dto.msaOnFile } : {}),
        ...(dto.msaExpiry !== undefined
          ? { msaExpiry: dto.msaExpiry ? new Date(dto.msaExpiry) : null }
          : {}),
        ...(dto.coiExpiry !== undefined
          ? { coiExpiry: dto.coiExpiry ? new Date(dto.coiExpiry) : null }
          : {}),
        ...(dto.w9OnFile !== undefined ? { w9OnFile: dto.w9OnFile } : {}),
        ...(dto.clockInRadius !== undefined
          ? { clockInRadius: dto.clockInRadius }
          : {}),
        ...(dto.requiresPo !== undefined ? { requiresPo: dto.requiresPo } : {}),
        ...(dto.defaultRequiredForms !== undefined
          ? { defaultRequiredForms: dto.defaultRequiredForms }
          : {}),
      },
    });
    return { data: customer };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: customer };
  }

  async bulkArchive(ids: string[]) {
    const result = await this.prisma.customer.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async exportCsv(query: CustomerListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.CustomerWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'code', header: 'Code', value: (r) => r.code },
      { key: 'name', header: 'Name', value: (r) => r.name },
      { key: 'status', header: 'Status', value: (r) => r.status },
      { key: 'industry', header: 'Industry', value: (r) => r.industry },
      { key: 'phone', header: 'Phone', value: (r) => r.phone },
      { key: 'email', header: 'Email', value: (r) => r.email },
    ]);
    return { data: { csv, filename: 'customers.csv' } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.customer.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }
  }
}
