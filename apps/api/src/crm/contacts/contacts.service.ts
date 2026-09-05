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
  ContactListQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';

const SORT_MAP: Record<string, string> = {
  fullName: 'fullName',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
  lastActivity: 'lastActivityAt',
};

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
    private readonly exportService: ExportService,
  ) {}

  private where(query: ContactListQueryDto): Prisma.ContactWhereInput {
    const and: Prisma.ContactWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.status) and.push({ status: query.status as CrmRecordStatus });
    if (query.assignedRepId) and.push({ assignedRepId: query.assignedRepId });
    if (query.customerId) {
      and.push({
        OR: [
          { primaryCustomerId: query.customerId },
          { customers: { some: { customerId: query.customerId } } },
        ],
      });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { fullName: containsCi(q) },
          { email: containsCi(q) },
          { mobile: containsCi(q) },
          { officePhone: containsCi(q) },
          { code: containsCi(q) },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async list(query: ContactListQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
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
          primaryCustomer: { select: { id: true, name: true, code: true } },
          customers: {
            include: {
              customer: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);
    return { data: paginate(items, total, page, pageSize) };
  }

  async kpi() {
    const [total, active, archived, primary] = await Promise.all([
      this.prisma.contact.count({ where: { archivedAt: null } }),
      this.prisma.contact.count({
        where: { archivedAt: null, status: CrmRecordStatus.ACTIVE },
      }),
      this.prisma.contact.count({ where: { archivedAt: { not: null } } }),
      this.prisma.contact.count({
        where: { archivedAt: null, isPrimary: true },
      }),
    ]);
    return { data: { total, active, archived, primary } };
  }

  async getById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        primaryCustomer: { select: { id: true, name: true, code: true } },
        customers: {
          include: {
            customer: { select: { id: true, name: true, code: true } },
          },
        },
        quotes: { take: 20, orderBy: { createdAt: 'desc' } },
        activities: { take: 20, orderBy: { activityAt: 'desc' } },
      },
    });
    if (!contact) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      });
    }
    return { data: contact };
  }

  async create(dto: CreateContactDto) {
    const code = await this.codes.next('contact');
    const contact = await this.prisma.contact.create({
      data: {
        code,
        fullName: dto.fullName,
        roleTitle: dto.roleTitle,
        email: dto.email,
        mobile: dto.mobile,
        officePhone: dto.officePhone,
        preferredMethod: dto.preferredMethod,
        isPrimary: dto.isPrimary ?? false,
        notes: dto.notes,
        linkedFromScan: dto.linkedFromScan,
        primaryCustomerId: dto.primaryCustomerId,
        assignedRepId: dto.assignedRepId,
        locationLabel: dto.locationLabel,
        status: (dto.status as CrmRecordStatus) ?? CrmRecordStatus.ACTIVE,
        ...(dto.primaryCustomerId || dto.customerIds?.length
          ? {
              customers: {
                create: [
                  ...(dto.primaryCustomerId
                    ? [
                        {
                          customerId: dto.primaryCustomerId,
                          isPrimary: true,
                        },
                      ]
                    : []),
                  ...(dto.customerIds ?? [])
                    .filter((id) => id !== dto.primaryCustomerId)
                    .map((customerId) => ({ customerId, isPrimary: false })),
                ],
              },
            }
          : {}),
      },
      include: {
        primaryCustomer: { select: { id: true, name: true, code: true } },
        customers: true,
      },
    });
    return { data: contact };
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.ensureExists(id);
    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.roleTitle !== undefined ? { roleTitle: dto.roleTitle } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.officePhone !== undefined
          ? { officePhone: dto.officePhone }
          : {}),
        ...(dto.preferredMethod !== undefined
          ? { preferredMethod: dto.preferredMethod }
          : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.linkedFromScan !== undefined
          ? { linkedFromScan: dto.linkedFromScan }
          : {}),
        ...(dto.primaryCustomerId !== undefined
          ? { primaryCustomerId: dto.primaryCustomerId }
          : {}),
        ...(dto.assignedRepId !== undefined
          ? { assignedRepId: dto.assignedRepId }
          : {}),
        ...(dto.locationLabel !== undefined
          ? { locationLabel: dto.locationLabel }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
      },
    });
    return { data: contact };
  }

  async archive(id: string) {
    await this.ensureExists(id);
    const contact = await this.prisma.contact.update({
      where: { id },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: contact };
  }

  async bulkArchive(ids: string[]) {
    const result = await this.prisma.contact.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: new Date(), status: CrmRecordStatus.ARCHIVED },
    });
    return { data: { updated: result.count } };
  }

  async setPrimary(id: string, customerId: string) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.contactCustomer.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      }),
      this.prisma.contactCustomer.upsert({
        where: {
          contactId_customerId: { contactId: id, customerId },
        },
        create: { contactId: id, customerId, isPrimary: true },
        update: { isPrimary: true },
      }),
      this.prisma.contact.update({
        where: { id },
        data: { primaryCustomerId: customerId, isPrimary: true },
      }),
    ]);
    return this.getById(id);
  }

  async exportCsv(query: ContactListQueryDto & { ids?: string }) {
    const ids = this.exportService.parseIds(query.ids);
    const where: Prisma.ContactWhereInput = ids?.length
      ? { id: { in: ids } }
      : this.where(query);
    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: { fullName: 'asc' },
      take: 5000,
    });
    const csv = this.exportService.toCsv(rows, [
      { key: 'code', header: 'Code', value: (r) => r.code },
      { key: 'fullName', header: 'Name', value: (r) => r.fullName },
      { key: 'email', header: 'Email', value: (r) => r.email },
      { key: 'mobile', header: 'Mobile', value: (r) => r.mobile },
      { key: 'status', header: 'Status', value: (r) => r.status },
    ]);
    return { data: { csv, filename: 'contacts.csv' } };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.contact.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      });
    }
  }
}
