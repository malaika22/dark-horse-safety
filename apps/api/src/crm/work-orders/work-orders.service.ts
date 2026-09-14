import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CrmRecordStatus,
  Prisma,
  SalesActivityType,
} from '@prisma/client';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConvertQuoteToWorkOrderDto } from '../quotes/dto/quote.dto';
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

/** Quote statuses allowed to convert (approved / accepted path). */
const CONVERTIBLE_QUOTE_STATUSES: CrmRecordStatus[] = [
  CrmRecordStatus.WON,
  CrmRecordStatus.SENT,
  CrmRecordStatus.OPEN,
  CrmRecordStatus.SUBMITTED,
  CrmRecordStatus.PENDING,
];

export type ConvertEligibilityCheck = {
  key: 'msa' | 'customer' | 'pricing' | 'formRules' | 'quoteStatus';
  label: string;
  ok: boolean;
  detail: string;
};

type LineSnapshot = {
  item: string;
  quantity: number;
  rate: number;
  amount: number;
};

function shortPersonName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null) {
  if (!user) return '—';
  const initial = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim();
  if (initial && last) return `${initial}. ${last}`;
  if (last) return last;
  if (user.firstName?.trim()) return user.firstName.trim();
  return user.email?.trim() || '—';
}

function fmtMsaDate(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .replace(',', '');
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function normalizeItem(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function locationLabelOf(loc: {
  name: string;
  city?: string | null;
  state?: string | null;
  county?: string | null;
}) {
  const region = [loc.city, loc.state].filter(Boolean).join(', ');
  if (region) return `${loc.name} · ${region}`;
  if (loc.county) return `${loc.name} · ${loc.county}`;
  return loc.name;
}

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
          { customer: { name: containsCi(q) } },
          { location: { name: containsCi(q) } },
        ],
      });
    }
    return { AND: and };
  }

  async kpi() {
    const base = { archivedAt: null };
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const startToday = startOfTodayUtc();
    const endToday = new Date(startToday.getTime() + 86_400_000);
    const [open, inProgress, pending, completed7d, startingToday] =
      await Promise.all([
        this.prisma.workOrder.count({
          where: {
            ...base,
            status: {
              in: [
                CrmRecordStatus.DRAFT,
                CrmRecordStatus.OPEN,
                CrmRecordStatus.PENDING,
                CrmRecordStatus.IN_PROGRESS,
              ],
            },
          },
        }),
        this.prisma.workOrder.count({
          where: { ...base, status: CrmRecordStatus.IN_PROGRESS },
        }),
        this.prisma.workOrder.count({
          where: {
            ...base,
            status: { in: [CrmRecordStatus.PENDING, CrmRecordStatus.DRAFT] },
          },
        }),
        this.prisma.workOrder.count({
          where: {
            ...base,
            status: CrmRecordStatus.COMPLETE,
            updatedAt: { gte: weekAgo },
          },
        }),
        this.prisma.workOrder.count({
          where: {
            ...base,
            serviceDate: { gte: startToday, lt: endToday },
          },
        }),
      ]);
    return {
      data: {
        open,
        inProgress,
        pending,
        completed7d,
        startingToday,
      },
    };
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
          location: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true,
            },
          },
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
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            county: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            amount: true,
            status: true,
            convertedAt: true,
            conversionOverrideReason: true,
          },
        },
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
    const stillRequired = this.computeStillRequired(workOrder);
    return {
      data: {
        ...workOrder,
        stillRequiredBeforeDispatch: stillRequired,
        locationLabel: workOrder.location
          ? locationLabelOf(workOrder.location)
          : null,
        lineItemsSummary: this.summarizeLineItems(
          workOrder.lineItemsSnapshot,
          workOrder.amount != null ? Number(workOrder.amount) : null,
        ),
      },
    };
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

  async update(
    id: string,
    dto: Partial<CreateWorkOrderDto> & {
      crewAssigned?: boolean;
      equipmentAssigned?: boolean;
      formsCompleted?: boolean;
      eligibilityVerified?: boolean;
    },
  ) {
    await this.ensureExists(id);
    const now = new Date();
    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as CrmRecordStatus }
          : {}),
        ...(dto.serviceDate !== undefined
          ? { serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : null }
          : {}),
        ...(dto.scheduledStart !== undefined
          ? { scheduledStart: dto.scheduledStart }
          : {}),
        ...(dto.scheduledEnd !== undefined
          ? { scheduledEnd: dto.scheduledEnd }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        ...(dto.assignedRepId !== undefined
          ? { assignedRepId: dto.assignedRepId }
          : {}),
        ...(dto.crewAssigned === true ? { crewAssignedAt: now } : {}),
        ...(dto.equipmentAssigned === true
          ? { equipmentAssignedAt: now }
          : {}),
        ...(dto.formsCompleted === true ? { formsCompletedAt: now } : {}),
        ...(dto.eligibilityVerified === true
          ? { eligibilityVerifiedAt: now }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            county: true,
          },
        },
        quote: { select: { id: true, quoteNumber: true, amount: true } },
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return {
      data: {
        ...workOrder,
        stillRequiredBeforeDispatch: this.computeStillRequired(workOrder),
      },
    };
  }

  async convertEligibility(quoteId: string, user?: AuthUser) {
    const quote = await this.loadQuoteForConvert(quoteId);

    const [baseChecks, sites, jobTypeOptions] = await Promise.all([
      this.buildEligibilityChecks(quote),
      this.prisma.location.findMany({
        where: {
          customerId: quote.customerId,
          archivedAt: null,
          status: { not: CrmRecordStatus.INACTIVE },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          state: true,
        },
      }),
      this.buildJobTypeOptions(quote.customerId, quote.lineItems),
    ]);

    const statusOk =
      CONVERTIBLE_QUOTE_STATUSES.includes(quote.status) ||
      quote.approvalStatus === 'APPROVED';
    const checks = baseChecks;
    const eligibilityOk = checks.every((c) => c.ok) && statusOk;
    const canOverride =
      user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
    const alreadyConverted =
      quote.status === CrmRecordStatus.CONVERTED || Boolean(quote.convertedAt);
    const failed = !statusOk
      ? {
          key: 'quoteStatus' as const,
          label: 'Quote Status',
          detail: `${quote.status} — accept/approve quote first`,
        }
      : checks.find((c) => !c.ok);
    const customerName = quote.customer.name;
    let blockerMessage: string | null = null;
    if (!statusOk) {
      blockerMessage = `Quote status is ${quote.status}. Accept or approve the quote before converting, or override with a reason.`;
    } else if (failed?.key === 'msa') {
      blockerMessage = `${customerName}'s MSA ${
        failed.detail.toLowerCase().startsWith('expired')
          ? failed.detail
          : `issue: ${failed.detail}`
      }. Resolve this before converting, or override with a reason.`;
    } else if (failed) {
      blockerMessage = `${failed.label}: ${failed.detail}. Resolve this before converting, or override with a reason.`;
    }

    return {
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        amount: Number(quote.amount),
        quoteStatus: quote.status,
        customer: {
          id: quote.customer.id,
          name: quote.customer.name,
          code: quote.customer.code,
        },
        alreadyConverted,
        canConvert:
          eligibilityOk && !quote.archivedAt && !alreadyConverted,
        canOverride,
        checks,
        blockerMessage,
        jobTypeOptions,
        siteOptions: sites.map((s) => ({
          value: s.id,
          label: s.name,
          hint: [s.city, s.state].filter(Boolean).join(', ') || s.code,
        })),
        defaultServiceDate: new Date(Date.now() + 7 * 86_400_000)
          .toISOString()
          .slice(0, 10),
        lineItemsPreview: quote.lineItems.map((li) => ({
          item: li.item,
          quantity: Number(li.quantity),
          rate: Number(li.rate),
          amount: Number(li.amount),
        })),
      },
    };
  }

  async convertFromQuote(
    quoteId: string,
    dto: ConvertQuoteToWorkOrderDto,
    user?: AuthUser,
  ) {
    const jobType = dto.jobType?.trim();
    const locationId = dto.locationId?.trim();
    const serviceDateRaw = dto.serviceDate?.trim();
    const overrideReason = dto.overrideReason?.trim();

    if (!jobType || !locationId || !serviceDateRaw) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Job type, site, and service date are required',
      });
    }

    const serviceDate = new Date(serviceDateRaw);
    if (Number.isNaN(serviceDate.getTime())) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid service date',
      });
    }

    const quote = await this.loadQuoteForConvert(quoteId);

    if (quote.archivedAt) {
      throw new ConflictException({
        code: 'QUOTE_ARCHIVED',
        message: 'Archived quotes cannot be converted',
      });
    }
    if (
      quote.status === CrmRecordStatus.CONVERTED ||
      quote.convertedAt
    ) {
      throw new ConflictException({
        code: 'ALREADY_CONVERTED',
        message: 'This quote has already been converted to a work order',
      });
    }

    const eligibility = await this.buildEligibilityChecks(quote, jobType);
    const statusOk =
      CONVERTIBLE_QUOTE_STATUSES.includes(quote.status) ||
      quote.approvalStatus === 'APPROVED';
    const canConvert = eligibility.every((c) => c.ok) && statusOk;
    const canOverride =
      user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

    if (!canConvert) {
      if (!overrideReason) {
        const failed = !statusOk
          ? { key: 'quoteStatus', label: 'Quote Status' }
          : eligibility.find((c) => !c.ok);
        throw new ForbiddenException({
          code: 'CONVERT_BLOCKED',
          message:
            failed?.key === 'msa'
              ? `${quote.customer.name}'s MSA requires resolution before converting.`
              : !statusOk
                ? `Quote status is ${quote.status}. Accept or approve before converting.`
                : `Cannot convert: ${failed?.label ?? 'eligibility check failed'}`,
        });
      }
      if (!canOverride) {
        throw new ForbiddenException({
          code: 'OVERRIDE_FORBIDDEN',
          message: 'Override is shown only to permitted roles',
        });
      }
    }

    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        customerId: quote.customerId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
        county: true,
      },
    });
    if (!location) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: "Site must be one of this customer's locations",
      });
    }

    const amount = Number(quote.amount);
    const lineItemsSnapshot: LineSnapshot[] = quote.lineItems.map((li) => ({
      item: li.item,
      quantity: Number(li.quantity),
      rate: Number(li.rate),
      amount: Number(li.amount),
    }));

    const code = await this.codes.next('workOrder');
    const convertedAt = new Date();
    const converter = user?.id
      ? await this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : null;

    const eligibilityVerifiedAt = null;

    const workOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: {
          code,
          customerId: quote.customerId,
          quoteId: quote.id,
          title: `WO from ${quote.quoteNumber}`,
          notes: quote.notes,
          category: jobType,
          locationId: location.id,
          status: CrmRecordStatus.DRAFT,
          assignedRepId: quote.ownerId,
          serviceDate,
          amount,
          lineItemsSnapshot,
          eligibilityVerifiedAt,
        },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          location: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true,
              county: true,
            },
          },
          quote: { select: { id: true, quoteNumber: true, amount: true } },
          assignedRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: CrmRecordStatus.CONVERTED,
          convertedAt,
          convertedById: user?.id ?? null,
          conversionOverrideReason: overrideReason || null,
        },
      });
      await tx.customer.update({
        where: { id: quote.customerId },
        data: { openJobs: { increment: 1 } },
      });

      if (overrideReason) {
        const activityCode = await this.codes.next('salesActivity');
        await tx.salesActivity.create({
          data: {
            activityCode,
            type: SalesActivityType.OTHER,
            subject: `Conversion override · ${quote.quoteNumber}`,
            outcome: 'OVERRIDE',
            notes: overrideReason,
            status: CrmRecordStatus.COMPLETE,
            activityAt: convertedAt,
            customerId: quote.customerId,
            repId: user?.id ?? null,
            linkedQuoteId: quote.id,
          },
        });
      } else {
        const activityCode = await this.codes.next('salesActivity');
        await tx.salesActivity.create({
          data: {
            activityCode,
            type: SalesActivityType.OTHER,
            subject: `Converted ${quote.quoteNumber} to ${code}`,
            outcome: 'WON',
            notes: `Job type: ${jobType}. Site: ${location.name}. Service date: ${serviceDateRaw}.`,
            status: CrmRecordStatus.COMPLETE,
            activityAt: convertedAt,
            customerId: quote.customerId,
            repId: user?.id ?? null,
            linkedQuoteId: quote.id,
          },
        });
      }

      return created;
    });

    const lineItemsSummary = this.summarizeLineItems(lineItemsSnapshot, amount);
    const convertedBy = shortPersonName(converter ?? workOrder.assignedRep);
    const stillRequired = this.computeStillRequired(workOrder);

    return {
      data: {
        ...workOrder,
        value: amount,
        scheduled: workOrder.serviceDate,
        createdBy: convertedBy,
        quoteNumber: quote.quoteNumber,
        quoteId: quote.id,
        outcome: 'WON',
        quoteStatus: 'CONVERTED',
        lineItemsSummary,
        locationLabel: locationLabelOf(location),
        convertedBy,
        convertedOn: convertedAt,
        stillRequiredBeforeDispatch: stillRequired,
        overridden: Boolean(overrideReason),
        conversionOverrideReason: overrideReason || null,
      },
    };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }
    return found;
  }

  private async loadQuoteForConvert(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteNumber: true,
        customerId: true,
        notes: true,
        ownerId: true,
        amount: true,
        status: true,
        approvalStatus: true,
        convertedAt: true,
        archivedAt: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            msaOnFile: true,
            msaExpiry: true,
            archivedAt: true,
          },
        },
        lineItems: {
          select: { item: true, amount: true, quantity: true, rate: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }
    return quote;
  }

  private async buildJobTypeOptions(
    customerId: string,
    lineItems: { item: string }[],
  ) {
    const [formJobs, pricingItems] = await Promise.all([
      this.prisma.formRule.findMany({
        where: {
          customerId,
          status: CrmRecordStatus.ACTIVE,
          archivedAt: null,
          jobType: { not: null },
        },
        select: { jobType: true },
        distinct: ['jobType'],
      }),
      this.prisma.pricingRule.findMany({
        where: {
          customerId,
          status: CrmRecordStatus.ACTIVE,
          archivedAt: null,
        },
        select: { serviceItem: true },
        distinct: ['serviceItem'],
      }),
    ]);

    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    const push = (raw?: string | null) => {
      const label = raw?.trim();
      if (!label) return;
      const key = normalizeItem(label);
      if (seen.has(key)) return;
      seen.add(key);
      options.push({ value: label, label });
    };

    for (const li of lineItems) push(li.item);
    for (const f of formJobs) push(f.jobType);
    for (const p of pricingItems) push(p.serviceItem);

    return options;
  }

  private computeStillRequired(wo: {
    crewAssignedAt?: Date | null;
    equipmentAssignedAt?: Date | null;
    formsCompletedAt?: Date | null;
    eligibilityVerifiedAt?: Date | null;
  }): string[] {
    const required: string[] = [];
    if (!wo.crewAssignedAt) required.push('Crew');
    if (!wo.equipmentAssignedAt) required.push('Equipment');
    if (!wo.formsCompletedAt) required.push('Required forms');
    if (!wo.eligibilityVerifiedAt) required.push('Eligibility check');
    return required;
  }

  private summarizeLineItems(
    snapshot: unknown,
    amount: number | null,
  ): string {
    const lines = Array.isArray(snapshot)
      ? (snapshot as LineSnapshot[])
      : [];
    const names = lines
      .map((l) => (typeof l?.item === 'string' ? l.item.trim() : ''))
      .filter(Boolean);
    const total =
      amount != null && Number.isFinite(amount)
        ? amount
        : lines.reduce(
            (sum, l) => sum + (Number.isFinite(Number(l.amount)) ? Number(l.amount) : 0),
            0,
          );
    const money = `$${Math.round(total).toLocaleString('en-US')}`;
    return names.length ? `${names.join(', ')} · ${money}` : money;
  }

  private async buildEligibilityChecks(
    quote: {
      status: CrmRecordStatus;
      approvalStatus?: string | null;
      customer: {
        name: string;
        status: CrmRecordStatus;
        msaOnFile: boolean;
        msaExpiry: Date | null;
        archivedAt: Date | null;
      };
      customerId: string;
      lineItems: { item: string }[];
    },
    jobType?: string,
  ): Promise<ConvertEligibilityCheck[]> {
    const today = startOfTodayUtc();
    const msaExpiry = quote.customer.msaExpiry;
    let msaOk = true;
    let msaDetail = 'On file';
    if (msaExpiry && msaExpiry.getTime() < today.getTime()) {
      msaOk = false;
      msaDetail = `Expired ${fmtMsaDate(msaExpiry)}`;
    } else if (!quote.customer.msaOnFile && !msaExpiry) {
      msaOk = false;
      msaDetail = 'Not on file';
    } else if (msaExpiry) {
      msaDetail = `Valid through ${fmtMsaDate(msaExpiry)}`;
    } else if (quote.customer.msaOnFile) {
      msaDetail = 'On file';
    }

    const customerActive =
      quote.customer.status === CrmRecordStatus.ACTIVE &&
      !quote.customer.archivedAt;

    const pricingRules = await this.prisma.pricingRule.findMany({
      where: {
        customerId: quote.customerId,
        status: CrmRecordStatus.ACTIVE,
        archivedAt: null,
      },
      select: {
        serviceItem: true,
        approvalStatus: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
    });
    const activeRules = pricingRules.filter((r) => {
      const ap = (r.approvalStatus ?? '').toUpperCase();
      if (ap === 'PENDING' || ap === 'REJECTED') return false;
      if (r.effectiveFrom && r.effectiveFrom.getTime() > today.getTime()) {
        return false;
      }
      if (r.effectiveTo && r.effectiveTo.getTime() < today.getTime()) {
        return false;
      }
      return true;
    });
    const ruleItems = activeRules.map((r) => normalizeItem(r.serviceItem));
    let pricingOk = true;
    let pricingDetail = 'Found for quoted services';
    if (ruleItems.length === 0) {
      pricingOk = false;
      pricingDetail = 'No active approved pricing rules for this customer';
    } else if (quote.lineItems.length > 0) {
      const missing = quote.lineItems.filter((li) => {
        const item = normalizeItem(li.item);
        if (!item) return false;
        return !ruleItems.some((si) => si === item);
      });
      if (missing.length > 0) {
        pricingOk = false;
        pricingDetail = `Missing rules for: ${missing
          .map((m) => m.item)
          .slice(0, 3)
          .join(', ')}`;
      }
    }

    const formWhere: Prisma.FormRuleWhereInput = {
      customerId: quote.customerId,
      status: CrmRecordStatus.ACTIVE,
      archivedAt: null,
    };
    const formRuleCount = await this.prisma.formRule.count({
      where: formWhere,
    });
    let formOk = formRuleCount > 0;
    let formDetail = formOk
      ? 'Configured for this customer'
      : 'No required-form rules configured';

    if (formOk && jobType?.trim()) {
      const jt = normalizeItem(jobType);
      const matching = await this.prisma.formRule.count({
        where: {
          ...formWhere,
          OR: [
            { jobType: null },
            { jobType: { equals: jobType, mode: 'insensitive' } },
            { jobType: { equals: 'All Jobs', mode: 'insensitive' } },
            { jobType: { contains: jt, mode: 'insensitive' } },
          ],
        },
      });
      if (matching === 0) {
        formOk = false;
        formDetail = `No required-form rules for job type ${jobType}`;
      } else {
        formDetail = `Configured for ${jobType}`;
      }
    }

    return [
      {
        key: 'msa',
        label: 'MSA Status',
        ok: msaOk,
        detail: msaDetail,
      },
      {
        key: 'customer',
        label: 'Customer Status',
        ok: customerActive,
        detail: customerActive
          ? 'Active'
          : quote.customer.archivedAt
            ? 'Archived'
            : String(quote.customer.status),
      },
      {
        key: 'pricing',
        label: 'Pricing Rules',
        ok: pricingOk,
        detail: pricingDetail,
      },
      {
        key: 'formRules',
        label: 'Required-Form Rules',
        ok: formOk,
        detail: formDetail,
      },
    ];
  }
}
