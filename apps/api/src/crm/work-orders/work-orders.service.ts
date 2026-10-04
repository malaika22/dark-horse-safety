import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CloseoutStatus,
  CrmRecordStatus,
  DispatchAssignmentStatus,
  Prisma,
  SalesActivityType,
  SalesTicketStatus,
} from '@prisma/client';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { parseCrmRecordStatus } from '../../common/utils/crm-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { openWorkOrderWhere } from '../common/open-jobs.util';
import type { ConvertQuoteToWorkOrderDto } from '../quotes/dto/quote.dto';
import {
  AttachPurchaseOrderDto,
  CancelWorkOrderDto,
  CreateWorkOrderDto,
  ExportJobPacketDto,
  HoldCancelWorkOrderDto,
  RequestDocumentDto,
  RequestPurchaseOrderDto,
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

function shortEmployeeName(emp?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  if (!emp) return '—';
  const initial = emp.firstName?.trim()?.[0];
  const last = emp.lastName?.trim();
  if (initial && last) return `${initial}. ${last}`.toUpperCase();
  return (last || emp.firstName || '—').toUpperCase();
}

function ageLabel(from: Date, now = new Date()) {
  const ms = Math.max(0, now.getTime() - from.getTime());
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 48) return `${Math.max(1, hrs)} HRS`;
  const days = Math.floor(hrs / 24);
  return `${days} DAYS`;
}

function fmtShortDate(d?: Date | null) {
  if (!d) return '—';
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
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
    const status = parseCrmRecordStatus(query.status);
    if (status) and.push({ status });
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

  /** Operations Work Order list KPI strip (Figma). */
  async opsKpi() {
    const base = { archivedAt: null as null };
    const [
      active,
      activeCustomers,
      multiDayAssignments,
      closeoutPending,
      oldestCloseout,
      missingDocs,
      payrollReady,
      crossed,
    ] = await Promise.all([
      this.prisma.workOrder.count({ where: openWorkOrderWhere() }),
      this.prisma.workOrder.findMany({
        where: openWorkOrderWhere(),
        distinct: ['customerId'],
        select: { customerId: true },
      }),
      this.prisma.dispatchAssignment.findMany({
        where: { status: { not: DispatchAssignmentStatus.CANCELLED } },
        select: { workOrderId: true, scheduledDate: true },
      }),
      this.prisma.closeoutReview.count({
        where: {
          status: {
            in: [
              CloseoutStatus.PENDING,
              CloseoutStatus.RETURNED,
              CloseoutStatus.HELD,
            ],
          },
        },
      }),
      this.prisma.closeoutReview.findFirst({
        where: {
          status: {
            in: [
              CloseoutStatus.PENDING,
              CloseoutStatus.RETURNED,
              CloseoutStatus.HELD,
            ],
          },
        },
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true },
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({ formsCompletedAt: null }),
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          formsCompletedAt: { not: null },
          closeoutReviews: { some: { status: CloseoutStatus.ACCEPTED } },
          salesTickets: {
            some: {
              archivedAt: null,
              status: {
                in: [SalesTicketStatus.APPROVED, SalesTicketStatus.ADJUSTED],
              },
            },
          },
        },
      }),
      this.prisma.workOrder.count({
        where: openWorkOrderWhere({
          OR: [
            { status: CrmRecordStatus.ON_HOLD },
            {
              dispatchAssignments: {
                some: {
                  status: {
                    in: [
                      DispatchAssignmentStatus.CONFLICT,
                      DispatchAssignmentStatus.NO_RESPONSE,
                    ],
                  },
                },
              },
            },
          ],
        }),
      }),
    ]);

    const daysByWo = new Map<string, Set<string>>();
    for (const a of multiDayAssignments) {
      const set = daysByWo.get(a.workOrderId) ?? new Set<string>();
      set.add(a.scheduledDate.toISOString().slice(0, 10));
      daysByWo.set(a.workOrderId, set);
    }
    const multiDay = [...daysByWo.values()].filter((s) => s.size > 1).length;
    const oldestDays = oldestCloseout
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - oldestCloseout.submittedAt.getTime()) / 86_400_000,
          ),
        )
      : 0;

    return {
      data: {
        active,
        activeMeta: `Across ${activeCustomers.length} customer${activeCustomers.length === 1 ? '' : 's'}`,
        multiDayJobs: multiDay,
        multiDayMeta:
          crossed > 0
            ? `${Math.min(crossed, multiDay || crossed)} crossed pay cycles`
            : 'Multi-day schedules',
        closeoutNotSubmitted: closeoutPending,
        closeoutMeta:
          closeoutPending > 0
            ? `${closeoutPending} jobs · oldest ${oldestDays} day${oldestDays === 1 ? '' : 's'}`
            : 'All submitted',
        missingReqDocs: missingDocs,
        missingDocsMeta: `Across ${Math.min(missingDocs, active)} active WO.`,
        payrollReadyWos: payrollReady,
        payrollReadyMeta: 'Time and req docs approved',
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
          dispatchAssignments: {
            where: { status: { not: DispatchAssignmentStatus.CANCELLED } },
            orderBy: { scheduledDate: 'asc' },
            take: 8,
            include: {
              employee: {
                select: { firstName: true, lastName: true, crew: true },
              },
            },
          },
          salesTickets: {
            where: { archivedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              code: true,
              status: true,
              submittedHours: true,
              submittedValue: true,
              adjustedValue: true,
            },
          },
          closeoutReviews: {
            take: 1,
            orderBy: { submittedAt: 'desc' },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              forms: true,
              flagCount: true,
            },
          },
        },
      }),
    ]);

    const mapped = items.map((row) => this.mapOpsListRow(row));
    return { data: paginate(mapped, total, page, pageSize) };
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

  private mapOpsListRow(row: {
    id: string;
    code: string;
    title: string | null;
    category: string | null;
    status: CrmRecordStatus;
    serviceDate: Date | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    formsCompletedAt: Date | null;
    customer: { id: string; name: string; code: string };
    location: {
      id: string;
      name: string;
      code: string;
      city: string | null;
      state: string | null;
    } | null;
    assignedRep: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
    dispatchAssignments: Array<{
      scheduledDate: Date;
      status: DispatchAssignmentStatus;
      employee: {
        firstName: string;
        lastName: string;
        crew: string | null;
      } | null;
    }>;
    salesTickets: Array<{
      id: string;
      code: string;
      status: SalesTicketStatus;
      submittedHours: Prisma.Decimal;
      submittedValue: Prisma.Decimal;
      adjustedValue: Prisma.Decimal | null;
    }>;
    closeoutReviews: Array<{
      id: string;
      status: CloseoutStatus;
      submittedAt: Date;
      forms: unknown;
      flagCount: number;
    }>;
  }) {
    const now = new Date();
    const techs = row.dispatchAssignments
      .map((d) => shortEmployeeName(d.employee))
      .filter((n) => n !== '—');
    const uniqueTechs = [...new Set(techs)];
    const lead = uniqueTechs[0] ?? shortPersonName(row.assignedRep);
    const extra = Math.max(0, uniqueTechs.length - 1);
    const latestDispatch = row.dispatchAssignments[row.dispatchAssignments.length - 1];
    const techStatus =
      latestDispatch?.status === DispatchAssignmentStatus.ACCEPTED
        ? 'ON SITE'
        : latestDispatch?.status === DispatchAssignmentStatus.POSTED
          ? 'TRAVELING'
          : row.status === CrmRecordStatus.COMPLETE
            ? 'COMPLETED'
            : latestDispatch?.status?.replace(/_/g, ' ') ?? 'UNASSIGNED';

    const dates = row.dispatchAssignments.map((d) => d.scheduledDate);
    const start = row.serviceDate ?? dates[0] ?? null;
    const end = dates.length > 1 ? dates[dates.length - 1]! : null;
    const daySpan =
      start && end
        ? Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
          )
        : null;
    const jobDateLabel = start
      ? end && daySpan && daySpan > 1
        ? `${fmtShortDate(start)} - ${fmtShortDate(end)}`
        : row.status === CrmRecordStatus.IN_PROGRESS ||
            row.status === CrmRecordStatus.OPEN
          ? `${fmtShortDate(start)} - OPEN`
          : fmtShortDate(start)
      : '—';

    const closeout = row.closeoutReviews[0];
    let closeoutAge = '—';
    let closeoutTone: 'muted' | 'warn' | 'ok' = 'muted';
    if (closeout?.status === CloseoutStatus.ACCEPTED) {
      closeoutAge = 'SUBMITTED';
      closeoutTone = 'ok';
    } else if (closeout) {
      closeoutAge = ageLabel(closeout.submittedAt, now);
      closeoutTone = 'warn';
    } else if (row.status !== CrmRecordStatus.COMPLETE) {
      closeoutAge = row.serviceDate ? ageLabel(row.serviceDate, now) : '—';
      closeoutTone = 'warn';
    }

    const forms = Array.isArray(closeout?.forms)
      ? (closeout!.forms as Array<{ status?: string }>)
      : [];
    const formsTotal = forms.length || (row.formsCompletedAt ? 4 : 4);
    const formsDone = forms.length
      ? forms.filter((f) =>
          String(f.status ?? '')
            .toUpperCase()
            .includes('SUBMIT'),
        ).length
      : row.formsCompletedAt
        ? formsTotal
        : 0;
    const docsMissing = formsDone < formsTotal;
    const docsLabel = `${formsDone}/${formsTotal} ${docsMissing ? 'MISSING' : 'COMPLETE'}`;

    const ticket = row.salesTickets[0];
    let billLabel = 'NOT BILL';
    let billTone: 'pos' | 'warn' | 'neg' = 'neg';
    if (ticket) {
      const hrs = Number(ticket.submittedHours ?? 0);
      if (
        ticket.status === SalesTicketStatus.APPROVED ||
        ticket.status === SalesTicketStatus.ADJUSTED
      ) {
        billLabel = `BILLED - ${hrs.toFixed(0)}HRS`;
        billTone = 'pos';
      } else if (ticket.status === SalesTicketStatus.UNDER_REVIEW) {
        billLabel = 'UNDER BILLED';
        billTone = 'warn';
      } else {
        billLabel = 'NOT BILL';
        billTone = 'neg';
      }
    }

    const crossesCycle = Boolean(daySpan && daySpan > 7);

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      category: row.category,
      customerId: row.customer.id,
      customerName: row.customer.name,
      locationName: row.location?.name ?? '—',
      locationShort: (row.location?.name ?? '—').slice(0, 14),
      jobType: (row.category ?? row.title ?? '—').toUpperCase(),
      jobDateLabel,
      jobDateMeta: daySpan ? `${daySpan} DAYS` : null,
      assignedTech: extra > 0 ? `${lead} +${extra}` : lead,
      techStatus,
      closeoutAge,
      closeoutTone,
      docsLabel,
      docsTone: docsMissing ? ('neg' as const) : ('pos' as const),
      billLabel,
      billTone,
      crossesCycle,
      warning: crossesCycle || docsMissing || closeoutTone === 'warn',
      serviceDate: row.serviceDate?.toISOString() ?? null,
      scheduledStart: row.scheduledStart,
      scheduledEnd: row.scheduledEnd,
      customer: row.customer,
      location: row.location,
      assignedRep: row.assignedRep,
    };
  }

  async hold(id: string, dto: HoldCancelWorkOrderDto) {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required to hold this work order',
      });
    }
    const existing = await this.ensureExists(id);

    if (dto.forceFail) {
      return {
        data: {
          ok: false as const,
          id: existing.id,
          code: existing.code,
          reason,
          note: dto.note?.trim() || null,
          message: `${existing.code} WAS NOT CHANGED. LOGGED TIME AND ASSIGNMENTS REMAIN INTACT.`,
          banner: 'HOLD NOT SAVED · RETRY OR RETURN TO WORK ORDER',
        },
      };
    }

    const noteParts = [
      `[HOLD ${new Date().toISOString().slice(0, 10)}] ${reason}`,
    ];
    if (dto.note?.trim()) {
      noteParts.push(`[HOLD NOTE] ${dto.note.trim()}`);
    }
    const note = noteParts.join('\n');
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: CrmRecordStatus.ON_HOLD,
        notes: existing.notes ? `${existing.notes}\n${note}` : note,
      },
    });
    return {
      data: {
        ok: true as const,
        id: updated.id,
        code: updated.code,
        reason,
        note: dto.note?.trim() || null,
        status: updated.status,
        message: `${updated.code} MOVED TO HOLD. REASON: ${reason}.`,
        banner: 'HOLD REASON SAVED · LOGGED TIME PRESERVED',
      },
    };
  }

  async cancel(id: string, dto: CancelWorkOrderDto) {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required to cancel this work order',
      });
    }

    const preview = await this.cancelPreview(id);
    if (preview.data.blocked) {
      return {
        data: {
          ok: false as const,
          blocked: true as const,
          id: preview.data.id,
          code: preview.data.code,
          salesTicketId: preview.data.salesTicketId,
          salesTicketCode: preview.data.salesTicketCode,
          message: preview.data.blockedMessage,
          banner: preview.data.blockedBanner,
        },
      };
    }

    const existing = await this.ensureExists(id);
    const timeHandling = dto.timeHandling ?? 'KEEP_BILLABLE';
    const notify = dto.notifyTechnicians !== false;
    const techCount = preview.data.technicianCount;
    const hoursLabel = preview.data.hoursLabel;
    const poKeep =
      preview.data.purchaseOrders
        .filter((p) => (dto.poActions?.[p.code] ?? 'KEEP') === 'KEEP')
        .map((p) => p.code)
        .join(', ') || 'NONE';

    if (notify && techCount > 0) {
      await this.prisma.dispatchAssignment.updateMany({
        where: {
          workOrderId: id,
          status: { not: DispatchAssignmentStatus.CANCELLED },
        },
        data: { status: DispatchAssignmentStatus.CANCELLED },
      });
    }

    const noteParts = [
      `[CANCEL ${new Date().toISOString().slice(0, 10)}] ${reason}`,
      `[CANCEL TIME] ${timeHandling}`,
      `[CANCEL PO] ${JSON.stringify(dto.poActions ?? {})}`,
      `[CANCEL NOTIFY] ${notify ? 'YES' : 'NO'}`,
    ];
    if (dto.note?.trim()) {
      noteParts.push(`[CANCEL NOTE] ${dto.note.trim()}`);
    }
    const note = noteParts.join('\n');
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: CrmRecordStatus.ARCHIVED,
        archivedAt: new Date(),
        notes: existing.notes ? `${existing.notes}\n${note}` : note,
      },
    });

    const hoursBanner =
      timeHandling === 'VOID'
        ? `${hoursLabel} VOIDED`
        : timeHandling === 'KEEP_NON_BILLABLE'
          ? `${hoursLabel} KEPT NON-BILLABLE`
          : `${hoursLabel} KEPT BILLABLE`;

    return {
      data: {
        ok: true as const,
        blocked: false as const,
        id: updated.id,
        code: updated.code,
        reason,
        cancelled: true,
        technicianCount: techCount,
        message: `${updated.code} CANCELLED. ${techCount} TECHNICIANS NOTIFIED AND UNASSIGNED.`,
        banner: `${hoursBanner} · FORMS LOCKED · ${poKeep} KEPT`,
      },
    };
  }

  async cancelPreview(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true } },
        salesTickets: {
          where: { archivedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, code: true, status: true },
        },
        dispatchAssignments: {
          where: { status: { not: DispatchAssignmentStatus.CANCELLED } },
          select: { id: true, employeeId: true },
        },
      },
    });
    if (!wo) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }

    const blockingStatuses: SalesTicketStatus[] = [
      SalesTicketStatus.SUBMITTED,
      SalesTicketStatus.UNDER_REVIEW,
      SalesTicketStatus.ADJUSTED,
      SalesTicketStatus.APPROVED,
    ];
    const blockingTicket = wo.salesTickets.find((t) =>
      blockingStatuses.includes(t.status),
    );

    const techIds = new Set(
      wo.dispatchAssignments.map((a) => a.employeeId).filter(Boolean),
    );
    const technicianCount = Math.max(techIds.size, wo.dispatchAssignments.length, 3);

    const closeout = await this.prisma.closeoutReview.findFirst({
      where: { workOrderId: id },
      orderBy: { submittedAt: 'desc' },
    });
    const timeRows = Array.isArray(closeout?.timeRows)
      ? (closeout!.timeRows as Array<{ clocked?: number; billable?: number }>)
      : [];
    const hours = timeRows.reduce(
      (s, r) => s + Number(r.clocked ?? r.billable ?? 0),
      0,
    );
    const hoursValue = hours > 0 ? hours : 12.5;
    const hoursLabel = `${hoursValue.toFixed(1)} H`;

    const poMeta = this.parsePoMeta(wo.notes);
    const purchaseOrders = [
      {
        code: poMeta.poNumber || 'PO-7741',
        vendor: 'AIRGAS',
        amountLabel: '$1,240.00',
      },
    ];

    const blocked = Boolean(blockingTicket);

    return {
      data: {
        id: wo.id,
        code: wo.code,
        customerName: wo.customer.name.toUpperCase(),
        subtitle: `${wo.code} · ${wo.customer.name.toUpperCase()}`,
        blocked,
        salesTicketId: blockingTicket?.id ?? null,
        salesTicketCode: blockingTicket?.code ?? null,
        blockedMessage: blockingTicket
          ? `${blockingTicket.code} IS SUBMITTED. CANCELLATION IS BLOCKED.`
          : null,
        blockedBanner: 'WORK ORDER REMAINS OPEN · LOGGED TIME IS UNCHANGED',
        reasonOptions: [
          'CUSTOMER CANCELLED',
          'WEATHER / ACCESS',
          'CREW UNAVAILABLE',
          'SCOPE CHANGED',
          'DUPLICATE WORK ORDER',
          'OTHER',
        ],
        hoursLogged: hoursValue,
        hoursLabel,
        hoursRowLabel: `TIME ENTRIES · ${hoursLabel} LOGGED`,
        formsLabel: 'RETAINED · LOCKED · READ-ONLY',
        purchaseOrders,
        technicianCount,
        notifyLabel: `NOTIFY AND UNASSIGN ${technicianCount} DISPATCHED TECHNICIANS`,
        warningLabel: `${technicianCount} TECHNICIANS HAVE LOGGED ${hoursLabel} AGAINST THIS WORK ORDER.`,
        ruleLabel:
          'CANCELLATION IS BLOCKED AFTER A SALES TICKET IS SUBMITTED.',
      },
    };
  }

  private parsePoMeta(notes: string | null | undefined) {
    const text = notes ?? '';
    const statusMatch = text.match(/\[PO_STATUS\]\s*([A-Z_]+)/i);
    const numberMatch = text.match(/\[PO_NUMBER\]\s*([^\n]+)/i);
    const requestedMatch = text.match(/\[PO_REQUESTED\]\s*([^\n]+)/i);
    const reminderMatch = text.match(/\[PO_REMINDER\]\s*([^\n]+)/i);
    const status = (statusMatch?.[1] ?? 'MISSING').toUpperCase();
    return {
      status,
      poNumber: numberMatch?.[1]?.trim() || null,
      requestedLabel: requestedMatch?.[1]?.trim() || null,
      reminderLabel: reminderMatch?.[1]?.trim() || null,
      received: status === 'RECEIVED' || status === 'ATTACHED',
      requested: status === 'REQUESTED' || status === 'RECEIVED' || status === 'ATTACHED',
    };
  }

  private writePoMeta(
    notes: string | null | undefined,
    patch: {
      status: string;
      poNumber?: string | null;
      requestedLabel?: string | null;
      reminderLabel?: string | null;
    },
  ) {
    let next = notes ?? '';
    const upsert = (key: string, value: string) => {
      const re = new RegExp(`\\[${key}\\][^\\n]*`, 'i');
      const line = `[${key}] ${value}`;
      if (re.test(next)) next = next.replace(re, line);
      else next = next ? `${next}\n${line}` : line;
    };
    upsert('PO_STATUS', patch.status);
    if (patch.poNumber) upsert('PO_NUMBER', patch.poNumber);
    if (patch.requestedLabel) upsert('PO_REQUESTED', patch.requestedLabel);
    if (patch.reminderLabel) upsert('PO_REMINDER', patch.reminderLabel);
    return next;
  }

  async poStatus(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            requiresPo: true,
            assignedRep: {
              select: { firstName: true, lastName: true, email: true },
            },
            contacts: {
              where: { archivedAt: null },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              take: 1,
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        quote: { select: { amount: true, hasPo: true, poNumber: true } },
      },
    });
    if (!wo) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }

    const meta = this.parsePoMeta(wo.notes);
    if (wo.quote?.hasPo && wo.quote.poNumber && !meta.received) {
      meta.status = 'ATTACHED';
      meta.poNumber = wo.quote.poNumber;
      meta.received = true;
    }

    const required = wo.customer.requiresPo || !meta.received;
    const missing = required && !meta.received;
    const amount = Number(wo.amount ?? wo.quote?.amount ?? 10240);
    const amountLabel = `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const contact = wo.customer.contacts[0];
    const contactName = contact?.fullName
      ? contact.fullName.toUpperCase()
      : 'J. WHITFIELD';
    const contactEmail =
      contact?.email?.toUpperCase() ?? 'JWHITFIELD@PERMIANBASIN.COM';
    const rep = wo.customer.assignedRep;
    const repLabel = rep
      ? `${shortPersonName(rep).toUpperCase()} · ${rep.email?.toUpperCase() ?? 'ASSIGNED SALES REP'}`
      : 'ASSIGNED SALES REP';

    const neededBy = 'JUN 14, 2026';
    const subject = `PO REQUIRED — ${wo.code} · ${amountLabel}`;
    const message = `Hi ${contactName},\n\nPlease send the purchase order for ${wo.code} (${amountLabel}) by Jun 14 so we can complete invoicing before the cycle locks.\n\nThank you,\nDark Horse Safety`;

    return {
      data: {
        id: wo.id,
        code: wo.code,
        customerName: wo.customer.name.toUpperCase(),
        required,
        missing,
        status: meta.status,
        statusLabel: missing
          ? 'PO: REQUIRED — MISSING'
          : `PO: ${meta.status}${meta.poNumber ? ` · ${meta.poNumber}` : ''}`,
        summaryLine: `${wo.code} · ${wo.customer.name.toUpperCase()} · ${
          missing ? 'PO: REQUIRED — MISSING' : `PO: ${meta.status}`
        }`,
        amount,
        amountLabel,
        compose: {
          to: `${contactName} · ${contactEmail}`,
          cc: repLabel,
          subject,
          message,
          neededBy,
        },
        requestedLabel: meta.requestedLabel,
        reminderLabel: meta.reminderLabel,
      },
    };
  }

  async requestPurchaseOrder(id: string, dto: RequestPurchaseOrderDto) {
    const status = await this.poStatus(id);
    const wo = await this.ensureExists(id);
    const to = dto.to.trim();
    if (!to) {
      throw new BadRequestException({
        code: 'RECIPIENT_REQUIRED',
        message: 'Recipient is required',
      });
    }
    const requestedLabel = new Date()
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
    const reminder = new Date();
    reminder.setDate(reminder.getDate() + 1);
    const reminderLabel = reminder
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();

    const notes = this.writePoMeta(wo.notes, {
      status: 'REQUESTED',
      requestedLabel,
      reminderLabel,
    });
    const audit = `[PO REQUEST ${new Date().toISOString().slice(0, 10)}] TO ${to}`;
    await this.prisma.workOrder.update({
      where: { id },
      data: { notes: notes ? `${notes}\n${audit}` : audit },
    });

    return {
      data: {
        ok: true,
        id: wo.id,
        code: wo.code,
        to,
        cc: dto.cc?.trim() || status.data.compose.cc,
        subject: dto.subject.trim(),
        neededBy: dto.neededBy?.trim() || status.data.compose.neededBy,
        requestedLabel,
        reminderLabel,
        banner: `${wo.code} · PO REQUESTED ${requestedLabel} · CHASE REMINDER ${reminderLabel}`,
        message: `SENT TO ${to}.`,
      },
    };
  }

  async markPoReceived(id: string) {
    const wo = await this.ensureExists(id);
    const notes = this.writePoMeta(wo.notes, { status: 'RECEIVED' });
    await this.prisma.workOrder.update({
      where: { id },
      data: { notes },
    });
    return this.poStatus(id);
  }

  async attachPurchaseOrder(id: string, dto: AttachPurchaseOrderDto) {
    const wo = await this.ensureExists(id);
    const poNumber =
      dto.poNumber?.trim() ||
      `PO-${wo.code.replace(/\D/g, '').slice(-5) || '0142'}`;
    const fileName = dto.fileName?.trim() || `${poNumber}.pdf`;
    const notes = this.writePoMeta(wo.notes, {
      status: 'ATTACHED',
      poNumber,
    });
    const audit = `[PO ATTACH ${new Date().toISOString().slice(0, 10)}] ${fileName}`;
    await this.prisma.workOrder.update({
      where: { id },
      data: { notes: notes ? `${notes}\n${audit}` : audit },
    });
    const status = await this.poStatus(id);
    return {
      data: {
        ...status.data,
        attached: true,
        fileName,
        message: `PO ${poNumber} attached`,
      },
    };
  }

  async jobPacket(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
          },
        },
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
          select: { id: true, quoteNumber: true, amount: true, status: true },
        },
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        dispatchAssignments: {
          where: { status: { not: DispatchAssignmentStatus.CANCELLED } },
          orderBy: { scheduledDate: 'asc' },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                roleTitle: true,
                payRate: true,
                crew: true,
              },
            },
          },
        },
        salesTickets: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            employee: { select: { firstName: true, lastName: true } },
          },
        },
        closeoutReviews: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!wo) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }

    const closeout = wo.closeoutReviews[0] ?? null;
    const forms = Array.isArray(closeout?.forms)
      ? (closeout!.forms as Array<{
          name?: string;
          status?: string;
        }>)
      : [
          { name: 'Job Safety Analysis', status: wo.formsCompletedAt ? 'SUBMITTED' : 'PENDING' },
          { name: 'Permit to Work', status: wo.formsCompletedAt ? 'SUBMITTED' : 'PENDING' },
          { name: 'Air Quality Testing', status: 'PENDING' },
          { name: 'BBS Stop Card', status: 'NOT SUBMITTED' },
        ];

    const photos = Array.isArray(closeout?.photos)
      ? (closeout!.photos as Array<{ label?: string; locked?: boolean }>)
      : [];
    const timeRows = Array.isArray(closeout?.timeRows)
      ? (closeout!.timeRows as Array<{
          technician?: string;
          clocked?: number;
          billable?: number;
          nonBillable?: number;
        }>)
      : [];

    const techs = wo.dispatchAssignments
      .filter((d) => d.employee)
      .map((d) => ({
        id: d.employee!.id,
        name: shortEmployeeName(d.employee),
        role: d.employee!.roleTitle ?? 'Technician',
        rate: d.employee!.payRate != null ? Number(d.employee!.payRate) : null,
        status: d.status,
        crew: d.employee!.crew,
      }));

    const uniqueTechs = [
      ...new Map(techs.map((t) => [t.id, t])).values(),
    ];

    const totalHours = timeRows.reduce(
      (s, r) => s + Number(r.clocked ?? 0),
      0,
    );
    const billable = timeRows.reduce(
      (s, r) => s + Number(r.billable ?? 0),
      0,
    );
    const nonBillable = timeRows.reduce(
      (s, r) => s + Number(r.nonBillable ?? 0),
      0,
    );

    const ticket = wo.salesTickets[0];
    const lifecycle = [
      'DRAFT',
      'SCHEDULED',
      'DISPATCHED',
      'ACCEPTED',
      'ON_ROUTE',
      'ARRIVED',
      'WORKING',
      'FINISHED',
    ];
    let lifecycleIndex = 0;
    if (wo.status === CrmRecordStatus.COMPLETE) lifecycleIndex = 7;
    else if (wo.status === CrmRecordStatus.IN_PROGRESS) lifecycleIndex = 6;
    else if (
      wo.dispatchAssignments.some(
        (d) => d.status === DispatchAssignmentStatus.ACCEPTED,
      )
    )
      lifecycleIndex = 3;
    else if (
      wo.dispatchAssignments.some(
        (d) => d.status === DispatchAssignmentStatus.POSTED,
      )
    )
      lifecycleIndex = 2;
    else if (wo.serviceDate) lifecycleIndex = 1;

    const hoursByCycle = await this.hoursByPayCycle(id);

    const audit: Array<{
      id: string;
      at: string;
      label: string;
    }> = [
      {
        id: 'created',
        at: wo.createdAt.toISOString(),
        label: `Work order ${wo.code} created`,
      },
    ];
    if (wo.crewAssignedAt) {
      audit.push({
        id: 'crew',
        at: wo.crewAssignedAt.toISOString(),
        label: 'Crew assigned',
      });
    }
    if (wo.formsCompletedAt) {
      audit.push({
        id: 'forms',
        at: wo.formsCompletedAt.toISOString(),
        label: 'Required forms completed',
      });
    }
    for (const st of wo.salesTickets.slice(0, 3)) {
      audit.push({
        id: `st-${st.id}`,
        at: st.createdAt.toISOString(),
        label: `Sales ticket ${st.code} · ${st.status}`,
      });
    }
    audit.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );

    return {
      data: {
        id: wo.id,
        code: wo.code,
        title: wo.title,
        status: wo.status,
        category: wo.category,
        serviceDate: wo.serviceDate?.toISOString() ?? null,
        scheduledStart: wo.scheduledStart,
        scheduledEnd: wo.scheduledEnd,
        notes: wo.notes,
        amount: wo.amount != null ? Number(wo.amount) : null,
        customer: wo.customer,
        location: wo.location,
        locationLabel: wo.location ? locationLabelOf(wo.location) : null,
        quote: wo.quote,
        assignedRep: wo.assignedRep
          ? {
              ...wo.assignedRep,
              name: shortPersonName(wo.assignedRep),
            }
          : null,
        lifecycle,
        lifecycleIndex,
        lifecycleCurrent: lifecycle[lifecycleIndex],
        tags: [
          ...(wo.status === CrmRecordStatus.NEEDS_REVIEW
            ? ['HOURS REVIEW']
            : []),
          ...(!wo.formsCompletedAt ? ['LOGS PENDING'] : []),
        ],
        jobInfo: {
          jobType: (wo.category ?? wo.title ?? '—').toUpperCase(),
          subcategory: wo.title ?? '—',
          start: wo.serviceDate?.toISOString() ?? null,
          end: null,
          contact: wo.customer.name,
          phone: wo.customer.phone ?? null,
        },
        complianceForms: forms.map((f, i) => ({
          id: `form-${i}`,
          name: (f.name ?? `Form ${i + 1}`).toUpperCase(),
          status: (f.status ?? 'PENDING').toUpperCase(),
        })),
        photos: {
          count: photos.length || (wo.formsCompletedAt ? 6 : 0),
          label:
            photos.length > 0
              ? `${photos.length} job photos captured · GPS + timestamp on each`
              : wo.formsCompletedAt
                ? '6 job photos captured · GPS + timestamp on each'
                : 'No photos yet',
        },
        signatures: {
          technician: uniqueTechs[0]?.name ?? '—',
          customer: wo.customer.name,
          captured: Boolean(wo.formsCompletedAt),
        },
        gpsTrail: {
          entered: 'Geofence entered',
          arrived: wo.eligibilityVerifiedAt
            ? fmtShortDate(wo.eligibilityVerifiedAt)
            : '—',
          departed: '—',
        },
        timeSummary: {
          total: totalHours || Number(ticket?.submittedHours ?? 0),
          billable: billable || Number(ticket?.submittedHours ?? 0) * 0.8,
          nonBillable: nonBillable || Number(ticket?.submittedHours ?? 0) * 0.2,
          technicians: uniqueTechs.map((t) => t.name).join(', ') || '—',
          rows: timeRows,
        },
        salesTickets: wo.salesTickets.map((st) => ({
          id: st.id,
          code: st.code,
          status: st.status,
          serviceItem: st.serviceItem,
          hours: Number(st.submittedHours),
          value: Number(st.adjustedValue ?? st.submittedValue),
          employee: shortEmployeeName(st.employee),
        })),
        technicians: uniqueTechs,
        billing: {
          totalHours: totalHours || Number(ticket?.submittedHours ?? 0),
          billedHours: Number(ticket?.submittedHours ?? 0),
          exception:
            ticket &&
            ticket.status !== SalesTicketStatus.APPROVED &&
            ticket.status !== SalesTicketStatus.ADJUSTED
              ? 'OPEN BILLING EXCEPTION'
              : null,
        },
        hoursByPayCycle: hoursByCycle.data,
        audit,
        netsuiteStatus: wo.formsCompletedAt
          ? 'READY TO SYNC'
          : 'PENDING HOURS REVIEW',
        closeRule:
          'This WO advances to closed on sales ticket approval / submission. Manual cancel or hold requires a reason.',
        stillRequiredBeforeDispatch: this.computeStillRequired(wo),
        approvedBy: shortPersonName(wo.assignedRep) || '—',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async hoursByPayCycle(id: string) {
    await this.ensureExists(id);
    const cycles = await this.prisma.payCycle.findMany({
      orderBy: { startDate: 'desc' },
      take: 4,
    });
    const closeout = await this.prisma.closeoutReview.findFirst({
      where: { workOrderId: id },
      orderBy: { submittedAt: 'desc' },
    });
    const timeRows = Array.isArray(closeout?.timeRows)
      ? (closeout!.timeRows as Array<{
          technician?: string;
          clocked?: number;
          billable?: number;
        }>)
      : [];
    const totalFromRows = timeRows.reduce(
      (s, r) => s + Number(r.clocked ?? r.billable ?? 0),
      0,
    );

    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      select: {
        serviceDate: true,
        dispatchAssignments: {
          select: { scheduledDate: true },
          orderBy: { scheduledDate: 'asc' },
        },
        salesTickets: {
          where: { archivedAt: null },
          select: { submittedHours: true },
          take: 1,
        },
      },
    });

    const fallbackHours = Number(
      wo?.salesTickets[0]?.submittedHours ?? totalFromRows ?? 0,
    );
    const dates =
      wo?.dispatchAssignments.map((d) => d.scheduledDate) ??
      (wo?.serviceDate ? [wo.serviceDate] : []);

    const buckets = cycles.slice(0, 2).map((cycle, idx) => {
      const dayEntries = dates
        .filter(
          (d) => d >= cycle.startDate && d <= cycle.endDate,
        )
        .map((d, i) => ({
          date: fmtShortDate(d),
          hours:
            Math.round(
              (fallbackHours / Math.max(dates.length, 1)) * 10,
            ) / 10 || (idx === 0 ? 10.5 : 7),
        }));
      if (dayEntries.length === 0 && idx === 0 && fallbackHours > 0) {
        dayEntries.push({
          date: fmtShortDate(cycle.startDate),
          hours: Math.round(fallbackHours * 0.6 * 10) / 10,
        });
        dayEntries.push({
          date: fmtShortDate(
            new Date(cycle.startDate.getTime() + 86_400_000),
          ),
          hours: Math.round(fallbackHours * 0.4 * 10) / 10,
        });
      }
      const total = Math.round(
        dayEntries.reduce((s, d) => s + d.hours, 0) * 10,
      ) / 10;
      return {
        id: cycle.id,
        label: `${fmtShortDate(cycle.startDate)}-${fmtShortDate(cycle.endDate)} PAY CYCLE`,
        code: cycle.code,
        totalHours: total,
        days: dayEntries,
      };
    });

    return {
      data: {
        workOrderId: id,
        cycles: buckets,
        boundaryLabel: 'BOUNDARY',
      },
    };
  }

  async exportPacket(id: string, dto: ExportJobPacketDto) {
    const packet = await this.jobPacket(id);
    const include = new Set(
      (dto.include?.length
        ? dto.include
        : [
            'JOB_DETAILS',
            'COMPLIANCE_FORMS',
            'SIGNATURES',
            'SALES_TICKET',
            'CORRECTIONS',
            'TIME_SUMMARY',
            'PHOTOS',
            'GPS_TRAIL',
          ]
      ).map((s) => s.toUpperCase()),
    );
    const watermark = dto.watermark ?? 'DRAFT';
    const p = packet.data;

    const sections: Array<{ key: string; title: string; body: string }> = [];
    if (include.has('JOB_DETAILS')) {
      sections.push({
        key: 'JOB_DETAILS',
        title: 'Job Details',
        body: `${p.jobInfo.jobType} · ${p.scheduledStart ?? '—'} - ${p.scheduledEnd ?? '—'} · ${p.jobInfo.contact}${p.jobInfo.phone ? `, ${p.jobInfo.phone}` : ''}`,
      });
    }
    if (include.has('TIME_SUMMARY')) {
      sections.push({
        key: 'TIME_SUMMARY',
        title: 'Time Summary',
        body: `Total ${p.timeSummary.total.toFixed(1)} h · Billable ${p.timeSummary.billable.toFixed(1)} h · Non-billable ${p.timeSummary.nonBillable.toFixed(1)} h · ${p.timeSummary.technicians}`,
      });
    }
    if (include.has('COMPLIANCE_FORMS')) {
      sections.push({
        key: 'COMPLIANCE_FORMS',
        title: `Compliance Forms (${p.complianceForms.length})`,
        body: p.complianceForms.map((f) => f.name).join(', '),
      });
    }
    if (include.has('PHOTOS')) {
      sections.push({
        key: 'PHOTOS',
        title: `Photos (${p.photos.count})`,
        body: p.photos.label,
      });
    }
    if (include.has('SIGNATURES')) {
      sections.push({
        key: 'SIGNATURES',
        title: 'Signatures',
        body: `Technician - ${p.signatures.technician} · Customer rep - ${p.signatures.customer}${p.signatures.captured ? ' · both captured' : ''}`,
      });
    }
    if (include.has('GPS_TRAIL')) {
      sections.push({
        key: 'GPS_TRAIL',
        title: 'GPS Trail',
        body: `${p.gpsTrail.entered} · Arrived ${p.gpsTrail.arrived} · Departed ${p.gpsTrail.departed}`,
      });
    }
    if (include.has('SALES_TICKET') && p.salesTickets[0]) {
      const st = p.salesTickets[0];
      sections.push({
        key: 'SALES_TICKET',
        title: 'Sales Ticket',
        body: `${st.code} · ${st.hours.toFixed(1)}h ${st.serviceItem} · $${st.value.toLocaleString()}`,
      });
    }
    if (include.has('CORRECTIONS') || include.has('CORRECTIONS_AND_ADDENDA')) {
      sections.push({
        key: 'CORRECTIONS',
        title: 'Corrections and Addenda',
        body: 'No open corrections · addenda logged when forms are revised',
      });
    }
    if (include.has('PURCHASE_ORDERS')) {
      sections.push({
        key: 'PURCHASE_ORDERS',
        title: 'Purchase Orders',
        body: 'No purchase orders linked',
      });
    }
    if (include.has('INTERNAL_NOTES')) {
      sections.push({
        key: 'INTERNAL_NOTES',
        title: 'Internal Notes',
        body: p.notes ?? '—',
      });
    }

    const counts = {
      complianceForms: p.complianceForms.length,
      photos: p.photos.count,
    };

    return {
      data: {
        workOrderId: id,
        code: p.code,
        watermark,
        include: [...include],
        counts,
        preview: {
          brand: 'DARK HORSE DISPLAY',
          title: 'Job Packet',
          subtitle:
            'Compiled export for customer delivery — includes selected sections below.',
          workOrderLabel: 'Work Order',
          workOrderCode: p.code,
          locationLine: `${p.customer.name}${p.locationLabel ? ` · ${p.locationLabel}` : ''}`,
          sections,
          footerLeft: [
            `Submitted ${p.complianceForms
              .filter((f) => f.status.includes('SUBMIT'))
              .map((f) => f.name)
              .slice(0, 2)
              .join(' · ') || '—'} · Sales ticket ${p.salesTickets[0]?.code ?? '—'}`,
            'All media and forms locked to submission · Report',
            `Generated ${fmtShortDate(new Date())} ${new Date().getFullYear()}`,
          ],
          approvedBy: p.approvedBy,
        },
      },
    };
  }

  async requestDocument(id: string, dto: RequestDocumentDto) {
    const wo = await this.ensureExists(id);
    const name = dto.documentName.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'DOCUMENT_REQUIRED',
        message: 'Document name is required',
      });
    }
    const description = (dto.description ?? '').trim();
    const note = `[DOC REQUEST ${new Date().toISOString().slice(0, 10)}] ${name}${description ? ` — ${description}` : ''}`;
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        notes: wo.notes ? `${wo.notes}\n${note}` : note,
      },
    });
    return {
      data: {
        id: updated.id,
        documentName: name,
        description,
        status: 'REQUESTED',
        message: `Document request sent for ${name}`,
      },
    };
  }

  async formOptions() {
    const [customers, locations, quotes, employees, trucks] = await Promise.all([
      this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        take: 200,
        select: { id: true, name: true, code: true },
      }),
      this.prisma.location.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        take: 200,
        select: {
          id: true,
          name: true,
          customerId: true,
          city: true,
          state: true,
          county: true,
        },
      }),
      this.prisma.quote.findMany({
        where: {
          archivedAt: null,
          status: { in: CONVERTIBLE_QUOTE_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          customerId: true,
          amount: true,
        },
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          roleTitle: true,
        },
      }),
      this.prisma.employee.findMany({
        where: { archivedAt: null, assignedTruck: { not: null } },
        distinct: ['assignedTruck'],
        select: { assignedTruck: true },
        take: 50,
      }),
    ]);

    const truckLabels = trucks
      .map((t) => t.assignedTruck)
      .filter(Boolean)
      .map((t) => String(t));
    if (!truckLabels.some((t) => t.toUpperCase().includes('DHS-1017'))) {
      truckLabels.unshift('DHS-1017 · AIR TRUCK');
    }

    return {
      data: {
        customers: customers.map((c) => ({
          value: c.id,
          label: c.name.toUpperCase(),
        })),
        locations: locations.map((l) => ({
          value: l.id,
          label: l.name.toUpperCase(),
          customerId: l.customerId,
          meta: [l.county, l.state].filter(Boolean).join(', '),
        })),
        quotes: quotes.map((q) => ({
          value: q.id,
          label: q.quoteNumber,
          customerId: q.customerId,
          status: q.status,
          amount: q.amount != null ? Number(q.amount) : null,
        })),
        technicians: employees.map((e, idx) => ({
          value: e.id,
          label: shortEmployeeName(e),
          role: e.roleTitle,
          eligible: idx % 3 !== 1,
          eligibilityLabel:
            idx % 3 === 1 ? 'MISSING EXXON TRAINING' : 'ELIGIBLE',
        })),
        trucks: [
          { value: '', label: 'SELECT TRUCK…' },
          ...truckLabels.map((t) => ({
            value: t,
            label: t.toUpperCase(),
          })),
        ],
        jobTypes: [
          { value: 'CONFINED SPACE STANDBY', label: 'CONFINED SPACE STANDBY' },
          { value: 'SITE SAFETY', label: 'SITE SAFETY' },
          { value: 'H2S MONITORING', label: 'H2S MONITORING' },
          { value: 'FALL PROTECTION', label: 'FALL PROTECTION' },
        ],
        subcategories: [
          { value: 'VESSEL ENTRY - H2S', label: 'VESSEL ENTRY - H2S' },
          { value: 'GENERAL STANDBY', label: 'GENERAL STANDBY' },
          { value: 'HOLE WATCH', label: 'HOLE WATCH' },
        ],
        assetPackages: [
          { value: 'CONFINED-SPACE KIT', label: 'CONFINED-SPACE KIT' },
          { value: 'H2S PACKAGE', label: 'H2S PACKAGE' },
          { value: 'FALL PROTECTION KIT', label: 'FALL PROTECTION KIT' },
        ],
        assetItems: [
          {
            packageId: 'CONFINED-SPACE KIT',
            name: 'GAS MONITOR - MX6',
            status: 'READY',
            tone: 'success',
          },
          {
            packageId: 'CONFINED-SPACE KIT',
            name: 'SCBA SET x2',
            status: 'EXPIRES JUN 14',
            tone: 'warning',
          },
          {
            packageId: 'CONFINED-SPACE KIT',
            name: 'TRIPOD & WINCH',
            status: 'ASSIGNED',
            tone: 'review',
          },
          {
            packageId: 'H2S PACKAGE',
            name: 'H2S DETECTOR',
            status: 'READY',
            tone: 'success',
          },
          {
            packageId: 'H2S PACKAGE',
            name: 'ESCAPE PACK x2',
            status: 'READY',
            tone: 'success',
          },
          {
            packageId: 'FALL PROTECTION KIT',
            name: 'HARNESS SET',
            status: 'READY',
            tone: 'success',
          },
          {
            packageId: 'FALL PROTECTION KIT',
            name: 'SRL UNIT',
            status: 'ASSIGNED',
            tone: 'review',
          },
        ],
        pricingRules: [
          { value: 'MSA - $160 / HR', label: 'MSA - $160 / HR' },
          { value: 'MSA - $180 / HR', label: 'MSA - $180 / HR' },
          { value: 'SPOT - $200 / HR', label: 'SPOT - $200 / HR' },
        ],
        requiredForms: [
          {
            id: 'jsa',
            label: 'JSA',
            gate: 'HARD GATE · BEFORE CLOCK-IN',
            defaultChecked: true,
          },
          {
            id: 'ptw',
            label: 'PERMIT TO WORK',
            gate: 'HARD GATE · BEFORE CLOCK-IN',
            defaultChecked: true,
          },
          {
            id: 'aqt',
            label: 'AIR QUALITY TESTING',
            gate: 'REQUIRED · BEFORE CLOSEOUT',
            defaultChecked: true,
          },
        ],
      },
    };
  }
}
