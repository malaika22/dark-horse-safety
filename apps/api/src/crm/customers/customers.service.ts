import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  ExportService,
  isoDate,
  userLabel,
} from '../../common/services/export.service';
import { UploadsService } from '../../common/services/uploads.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { openWorkOrderWhere } from '../common/open-jobs.util';
import {
  CreateCustomerDocumentDto,
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDocumentDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

type BulkUpdatePayload = {
  status?: string;
  assignedRepId?: string;
};

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
    private readonly uploads: UploadsService,
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
          contacts: {
            where: { archivedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }],
            take: 1,
            select: { id: true, fullName: true, isPrimary: true },
          },
          locations: {
            where: { archivedAt: null },
            orderBy: [{ updatedAt: 'desc' }],
            take: 1,
            select: { id: true, name: true, code: true },
          },
          requirements: {
            where: { archivedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 4,
            select: {
              id: true,
              name: true,
              status: true,
              enforcementLevel: true,
            },
          },
          routeRules: {
            where: { archivedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 3,
            select: {
              id: true,
              gpsRequired: true,
              geofenceRadius: true,
              status: true,
              routeLabel: true,
            },
          },
          _count: {
            select: { contacts: true, locations: true },
          },
        },
      }),
    ]);
    const openJobsByCustomer = await this.prisma.workOrder.groupBy({
      by: ['customerId'],
      where: openWorkOrderWhere({
        customerId: { in: items.map((c) => c.id) },
      }),
      _count: { _all: true },
    });
    const openJobsMap = new Map(
      openJobsByCustomer.map((row) => [row.customerId, row._count._all]),
    );
    const withOpenJobs = items.map((c) => ({
      ...c,
      openJobs: openJobsMap.get(c.id) ?? 0,
    }));
    return { data: paginate(withOpenJobs, total, page, pageSize) };
  }

  async kpi() {
    const [active, openJobs, archived, needsReview] = await Promise.all([
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.workOrder.count({ where: openWorkOrderWhere() }),
      this.prisma.customer.count({ where: { archivedAt: { not: null } } }),
      this.prisma.customer.count({
        where: { archivedAt: null, status: CrmRecordStatus.NEEDS_REVIEW },
      }),
    ]);
    return {
      data: {
        active,
        openJobs,
        needsReview,
        archived,
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
        parentCompany: {
          select: { id: true, name: true, code: true },
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
    const openJobs = await this.prisma.workOrder.count({
      where: openWorkOrderWhere({ customerId: id }),
    });
    return { data: { ...customer, openJobs } };
  }

  private async assertUniqueName(name: string, excludeId?: string) {
    const existing = await this.prisma.customer.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        archivedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, code: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_NAME',
        message: 'A customer with this name already exists.',
        details: {
          name: [
            `A customer with this name already exists. Open existing record →`,
          ],
          existingId: [existing.id],
        },
      });
    }
  }

  private assertExpiryNotPast(field: string, value?: string | null) {
    if (!value) return;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          [field]: ['This date has already passed.'],
        },
      });
    }
  }

  private assertCreateRequired(dto: CreateCustomerDto) {
    const details: Record<string, string[]> = {};
    if (!dto.name?.trim()) details.name = ['Required.'];
    if (!dto.status?.trim()) details.status = ['Required.'];
    if (!dto.assignedRepId) details.assignedRepId = ['Required.'];
    if (!dto.customerType?.trim()) details.customerType = ['Required.'];
    if (!dto.billingAddress?.trim()) details.billingAddress = ['Required.'];
    if (!dto.paymentTerms?.trim()) details.paymentTerms = ['Required.'];
    if (Object.keys(details).length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      });
    }
  }

  async create(dto: CreateCustomerDto) {
    this.assertCreateRequired(dto);
    await this.assertUniqueName(dto.name);
    this.assertExpiryNotPast('msaExpiry', dto.msaExpiry);
    this.assertExpiryNotPast('coiExpiry', dto.coiExpiry);

    const code = await this.codes.next('customer');
    const customer = await this.prisma.customer.create({
      data: {
        code,
        name: dto.name.trim(),
        legalEntityName: dto.legalEntityName,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        assignedRepId: dto.assignedRepId,
        industry: dto.industry,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        customerType: dto.customerType,
        source: dto.source,
        accountNotes: dto.accountNotes,
        logoUrl: dto.logoUrl,
        parentCompanyId: dto.parentCompanyId,
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
        minBillableBlock: dto.minBillableBlock,
        autoFlagNoShow: dto.autoFlagNoShow,
        requiresPo: dto.requiresPo ?? false,
        defaultRequiredForms: dto.defaultRequiredForms,
      },
    });
    return { data: customer };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    if (dto.name?.trim()) await this.assertUniqueName(dto.name, id);
    this.assertExpiryNotPast('msaExpiry', dto.msaExpiry);
    this.assertExpiryNotPast('coiExpiry', dto.coiExpiry);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
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
        ...(dto.customerType !== undefined
          ? { customerType: dto.customerType }
          : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.accountNotes !== undefined
          ? { accountNotes: dto.accountNotes }
          : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.parentCompanyId !== undefined
          ? { parentCompanyId: dto.parentCompanyId }
          : {}),
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
        ...(dto.minBillableBlock !== undefined
          ? { minBillableBlock: dto.minBillableBlock }
          : {}),
        ...(dto.autoFlagNoShow !== undefined
          ? { autoFlagNoShow: dto.autoFlagNoShow }
          : {}),
        ...(dto.requiresPo !== undefined ? { requiresPo: dto.requiresPo } : {}),
        ...(dto.defaultRequiredForms !== undefined
          ? { defaultRequiredForms: dto.defaultRequiredForms }
          : {}),
      },
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parentCompany: {
          select: { id: true, name: true, code: true },
        },
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

  async bulkUpdate(ids: string[], payload: BulkUpdatePayload) {
    const data: Prisma.CustomerUncheckedUpdateManyInput = {
      ...(payload.status !== undefined
        ? { status: payload.status as CrmRecordStatus }
        : {}),
      ...(payload.assignedRepId !== undefined
        ? { assignedRepId: payload.assignedRepId }
        : {}),
    };
    const result = await this.prisma.customer.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return { data: { updated: result.count } };
  }

  async createDocument(customerId: string, dto: CreateCustomerDocumentDto) {
    await this.ensureExists(customerId);
    let url = dto.url?.trim() || undefined;

    if (dto.contentBase64?.trim()) {
      const saved = await this.uploads.saveBase64({
        folder: `customers/${customerId}`,
        fileName: dto.name,
        contentBase64: dto.contentBase64,
      });
      url = saved.url;
    }

    const doc = await this.prisma.crmDocument.create({
      data: {
        customerId,
        name: dto.name.trim(),
        kind: dto.kind?.trim() || null,
        url: url ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return { data: doc };
  }

  async updateDocument(
    customerId: string,
    documentId: string,
    dto: {
      name?: string;
      url?: string;
      kind?: string;
      expiresAt?: string | null;
    },
  ) {
    await this.ensureExists(customerId);
    const existing = await this.prisma.crmDocument.findFirst({
      where: { id: documentId, customerId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }
    const doc = await this.prisma.crmDocument.update({
      where: { id: documentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
      },
    });
    return { data: doc };
  }

  async deleteDocument(customerId: string, documentId: string) {
    await this.ensureExists(customerId);
    const existing = await this.prisma.crmDocument.findFirst({
      where: { id: documentId, customerId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }
    await this.prisma.crmDocument.delete({ where: { id: documentId } });
    return { data: { deleted: true, id: documentId } };
  }

  async duplicate(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }
    const code = await this.codes.next('customer');
    const copy = await this.prisma.customer.create({
      data: {
        code,
        name: `${existing.name} (Copy)`,
        legalEntityName: existing.legalEntityName,
        status: existing.status === CrmRecordStatus.ARCHIVED
          ? CrmRecordStatus.ACTIVE
          : existing.status,
        industry: existing.industry,
        website: existing.website,
        phone: existing.phone,
        email: existing.email,
        customerType: existing.customerType,
        source: existing.source,
        accountNotes: existing.accountNotes,
        logoUrl: existing.logoUrl,
        parentCompanyId: existing.parentCompanyId,
        billingAddress: existing.billingAddress,
        mailingAddress: existing.mailingAddress,
        paymentTerms: existing.paymentTerms,
        creditLimit: existing.creditLimit,
        taxExempt: existing.taxExempt,
        taxId: existing.taxId,
        pricingTier: existing.pricingTier,
        netsuiteId: null,
        isnId: existing.isnId,
        veriforceId: existing.veriforceId,
        msaOnFile: existing.msaOnFile,
        msaExpiry: existing.msaExpiry,
        coiExpiry: existing.coiExpiry,
        w9OnFile: existing.w9OnFile,
        clockInRadius: existing.clockInRadius,
        minBillableBlock: existing.minBillableBlock,
        autoFlagNoShow: existing.autoFlagNoShow,
        requiresPo: existing.requiresPo,
        defaultRequiredForms: existing.defaultRequiredForms,
        assignedRepId: existing.assignedRepId,
      },
    });
    return { data: copy };
  }

  async exportCsv(
    query: CustomerListQueryDto & {
      ids?: string;
      format?: 'csv' | 'pdf' | 'xlsx';
    },
  ) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.CustomerWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { contacts: true, locations: true } },
      },
    });
    type Row = (typeof rows)[number];
    const columns = [
      { key: 'code', header: 'Code', value: (r: Row) => r.code },
      { key: 'name', header: 'Name', value: (r: Row) => r.name },
      {
        key: 'legalEntity',
        header: 'Legal Entity',
        value: (r: Row) => r.legalEntityName,
      },
      { key: 'status', header: 'Status', value: (r: Row) => r.status },
      { key: 'industry', header: 'Industry', value: (r: Row) => r.industry },
      { key: 'phone', header: 'Phone', value: (r: Row) => r.phone },
      { key: 'email', header: 'Email', value: (r: Row) => r.email },
      { key: 'website', header: 'Website', value: (r: Row) => r.website },
      {
        key: 'paymentTerms',
        header: 'Payment Terms',
        value: (r: Row) => r.paymentTerms,
      },
      {
        key: 'pricingTier',
        header: 'Pricing Tier',
        value: (r: Row) => r.pricingTier,
      },
      { key: 'openJobs', header: 'Open Jobs', value: (r: Row) => r.openJobs },
      {
        key: 'msaOnFile',
        header: 'MSA On File',
        value: (r: Row) => (r.msaOnFile ? 'Yes' : 'No'),
      },
      {
        key: 'msaExpiry',
        header: 'MSA Expiry',
        value: (r: Row) => isoDate(r.msaExpiry),
      },
      {
        key: 'assignedRep',
        header: 'Assigned Rep',
        value: (r: Row) => userLabel(r.assignedRep),
      },
      {
        key: 'contactsCount',
        header: 'Contacts Count',
        value: (r: Row) => r._count.contacts,
      },
      {
        key: 'locationsCount',
        header: 'Locations Count',
        value: (r: Row) => r._count.locations,
      },
      {
        key: 'lastActivity',
        header: 'Last Activity',
        value: (r: Row) => isoDate(r.lastActivityAt),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        value: (r: Row) => isoDate(r.createdAt),
      },
    ];
    return this.exportService.buildExport(
      'Customers',
      'customers',
      rows,
      columns,
      query.format ?? 'csv',
    );
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
