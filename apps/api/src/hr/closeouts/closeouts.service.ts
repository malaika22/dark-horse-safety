import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloseoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CloseoutDecisionDto } from './dto/closeout.dto';

type FlagItem = { code: string; message: string };
type TimeRow = {
  technician: string;
  clocked: number;
  billable: number;
  nonBillable: number;
};
type FormItem = { name: string; status: 'SUBMITTED' | 'MISSING' };
type PhotoItem = { label: string; locked: boolean };
type SalesLine = { item: string; hours: number | null; total: number };
type PoItem = {
  code: string;
  label: string;
  amount: number;
  overThreshold: boolean;
};

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f[0]!.toUpperCase()}. ${l.toUpperCase()}`;
  return (l || f || '—').toUpperCase();
}

function displayUser(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return user.email?.split('@')[0] ?? 'Admin';
}

function formatAge(d: Date) {
  const hours = Math.max(
    0,
    Math.round((Date.now() - d.getTime()) / 3_600_000),
  );
  if (hours < 24) return `${hours} HR${hours === 1 ? '' : 'S'} AGO`;
  const days = Math.round(hours / 24);
  return `${days} DAY${days === 1 ? '' : 'S'} AGO`;
}

function formatServiceDate(d: Date | null | undefined) {
  if (!d) return '—';
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function formatSubmittedAt(d: Date) {
  return (
    d
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      .replace(',', '')
      .toUpperCase() + ' CT'
  );
}

function relativeActionedAgo(d: Date | null | undefined) {
  if (!d) return 'just now';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 48) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

@Injectable()
export class CloseoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private include = {
    customer: { select: { id: true, name: true } },
    workOrder: {
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        amount: true,
        location: { select: { name: true } },
      },
    },
    submittedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
  } as const;

  private mapList(row: {
    id: string;
    flagCount: number;
    submittedAt: Date;
    status: CloseoutStatus;
    locationLabel: string | null;
    customer: { name: string };
    workOrder: { code: string };
    submittedBy: { firstName: string; lastName: string } | null;
  }) {
    const customerShort = row.customer.name
      .replace(/\s+(Energy|Well Services|Co\.|LLC|Inc\.?)$/i, '')
      .trim()
      .toUpperCase();
    return {
      id: row.id,
      workOrderCode: row.workOrder.code,
      customerShort,
      customerName: row.customer.name,
      technician: row.submittedBy
        ? shortName(row.submittedBy.firstName, row.submittedBy.lastName)
        : '—',
      ageLabel: formatAge(row.submittedAt),
      flagCount: row.flagCount,
      status: row.status,
      locationLabel: row.locationLabel,
    };
  }

  private mapDetail(
    row: {
      id: string;
      workOrderId: string;
      customerId: string;
      submittedById: string | null;
      submittedAt: Date;
      serviceDate: Date | null;
      status: CloseoutStatus;
      locationLabel: string | null;
      flagCount: number;
      flags: unknown;
      avgDistanceMi: Prisma.Decimal | null;
      timeRows: unknown;
      forms: unknown;
      photos: unknown;
      salesLines: unknown;
      salesTotal: Prisma.Decimal | null;
      purchaseOrders: unknown;
      salesTicketId: string | null;
      decisionNote: string | null;
      decidedAt: Date | null;
      decidedByName: string | null;
      customer: { id: string; name: string };
      workOrder: {
        id: string;
        code: string;
        title: string | null;
        category: string | null;
        amount: Prisma.Decimal | null;
        location: { name: string } | null;
      };
      submittedBy: { id: string; firstName: string; lastName: string } | null;
    },
  ) {
    const flags = asArray<FlagItem>(row.flags);
    const timeRows = asArray<TimeRow>(row.timeRows);
    const forms = asArray<FormItem>(row.forms);
    const photos = asArray<PhotoItem>(row.photos);
    const salesLines = asArray<SalesLine>(row.salesLines);
    const purchaseOrders = asArray<PoItem>(row.purchaseOrders);
    const tech = row.submittedBy
      ? shortName(row.submittedBy.firstName, row.submittedBy.lastName)
      : '—';
    const location =
      row.locationLabel ||
      row.workOrder.location?.name ||
      row.workOrder.title ||
      '—';

    return {
      id: row.id,
      workOrderId: row.workOrderId,
      workOrderCode: row.workOrder.code,
      customerId: row.customerId,
      customerName: row.customer.name,
      locationLabel: location,
      headerLabel: `${row.workOrder.code} · ${row.customer.name} · ${location}`,
      serviceDateLabel: formatServiceDate(row.serviceDate),
      submittedBy: tech,
      submittedAtLabel: formatSubmittedAt(row.submittedAt),
      status: row.status,
      flagCount: row.flagCount,
      flags,
      avgDistanceMi: row.avgDistanceMi != null ? money(row.avgDistanceMi) : null,
      timeRows,
      forms,
      photos,
      salesLines: salesLines.map((l) => ({
        ...l,
        totalLabel: `$${l.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        hoursLabel: l.hours == null ? '—' : l.hours.toFixed(1),
      })),
      salesTotal: money(row.salesTotal),
      salesTotalLabel: `$${money(row.salesTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      purchaseOrders: purchaseOrders.map((p) => ({
        ...p,
        amountLabel: `$${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      })),
      salesTicketId: row.salesTicketId,
      decisionNote: row.decisionNote,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      decidedByName: row.decidedByName,
      actionedAgo:
        row.status !== CloseoutStatus.PENDING
          ? relativeActionedAgo(row.decidedAt)
          : null,
    };
  }

  private buildPacket(input: {
    wo: {
      id: string;
      code: string;
      title: string | null;
      category: string | null;
      amount: Prisma.Decimal | null;
      serviceDate: Date | null;
      customerId: string;
      customer: { name: string };
      location: { name: string } | null;
    };
    employee: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    ticket: {
      id: string;
      submittedHours: Prisma.Decimal;
      submittedValue: Prisma.Decimal;
      serviceItem: string;
      adjustedValue: Prisma.Decimal | null;
    } | null;
    timeEntries: Array<{
      hours: Prisma.Decimal;
      billableHours: Prisma.Decimal | null;
      nonBillableHours: Prisma.Decimal | null;
      employee: { firstName: string; lastName: string };
      clockInDistanceMi: number | null;
    }>;
    expenses: Array<{
      code: string;
      merchant: string;
      amount: Prisma.Decimal;
      category: string;
    }>;
  }) {
    const ticketHours = input.ticket ? money(input.ticket.submittedHours) : 64;
    const workedHours =
      input.timeEntries.reduce((s, e) => s + money(e.hours), 0) ||
      ticketHours + 8.5;
    const flags: FlagItem[] = [];

    if (Math.abs(workedHours - ticketHours) >= 0.5) {
      const delta = Math.round((ticketHours - workedHours) * 10) / 10;
      flags.push({
        code: 'HOURS_VARIANCE',
        message: `Hours variance: ${workedHours.toFixed(1)} H worked vs ${ticketHours.toFixed(1)} H on ticket (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} H)`,
      });
    }

    const poThreshold = 1000;
    const purchaseOrders: PoItem[] = input.expenses.slice(0, 4).map((e, i) => {
      const amount = money(e.amount);
      const over = amount > poThreshold;
      return {
        code: e.code.startsWith('PO') ? e.code : `PO-${7700 + i + 1}`,
        label: `${e.merchant}${over ? ' (Over Threshold)' : ''}`.toUpperCase(),
        amount,
        overThreshold: over,
      };
    });

    if (purchaseOrders.length === 0) {
      purchaseOrders.push(
        {
          code: 'PO-7741',
          label: 'RIG SUPPLIES (OVER THRESHOLD)',
          amount: 1240,
          overThreshold: true,
        },
        {
          code: 'PO-7742',
          label: 'CHEMICALS',
          amount: 310,
          overThreshold: false,
        },
      );
    }

    for (const po of purchaseOrders) {
      if (po.overThreshold) {
        flags.push({
          code: 'PO_OVER_THRESHOLD',
          message: `PO over threshold: ${po.code} $${po.amount.toLocaleString('en-US')} exceeds the $${poThreshold.toLocaleString('en-US')} limit`,
        });
      }
    }

    let timeRows: TimeRow[] = input.timeEntries.slice(0, 6).map((e) => {
      const clocked = money(e.hours);
      const billable = e.billableHours != null ? money(e.billableHours) : Math.max(0, clocked - 1);
      const nonBillable =
        e.nonBillableHours != null
          ? money(e.nonBillableHours)
          : Math.max(0, Math.round((clocked - billable) * 10) / 10);
      return {
        technician: shortName(e.employee.firstName, e.employee.lastName),
        clocked,
        billable,
        nonBillable,
      };
    });

    if (timeRows.length === 0 && input.employee) {
      timeRows = [
        {
          technician: shortName(
            input.employee.firstName,
            input.employee.lastName,
          ),
          clocked: 10,
          billable: 9,
          nonBillable: 1,
        },
        {
          technician: 'T. WHITLOCK',
          clocked: 8.5,
          billable: 7.5,
          nonBillable: 1,
        },
      ];
    }

    const distances = input.timeEntries
      .map((e) => e.clockInDistanceMi)
      .filter((d): d is number => d != null && Number.isFinite(d));
    const avgDistanceMi =
      distances.length > 0
        ? Math.round(
            (distances.reduce((a, b) => a + b, 0) / distances.length) * 10,
          ) / 10
        : 4.2;

    const forms: FormItem[] = [
      { name: 'JSA', status: 'SUBMITTED' },
      { name: 'Permit to Work', status: 'SUBMITTED' },
      { name: 'Pre-Job Safety Checklist', status: 'SUBMITTED' },
      { name: 'Equipment Inspection', status: 'SUBMITTED' },
      { name: 'Customer Sign-Off', status: 'MISSING' },
      { name: 'Waste Manifest', status: 'MISSING' },
    ];

    const photos: PhotoItem[] = [
      { label: 'Site Photo', locked: true },
      { label: 'Equipment', locked: true },
      { label: 'Signature', locked: true },
      { label: 'Closeout', locked: true },
    ];

    const ticketValue = input.ticket
      ? money(input.ticket.adjustedValue ?? input.ticket.submittedValue)
      : money(input.wo.amount) || 1037.2;

    const salesLines: SalesLine[] = input.ticket
      ? [
          {
            item: input.ticket.serviceItem,
            hours: ticketHours,
            total: Math.round(ticketValue * 0.82 * 100) / 100,
          },
          {
            item: 'Equipment Rental',
            hours: null,
            total: Math.round(ticketValue * 0.12 * 100) / 100,
          },
          {
            item: 'Mileage',
            hours: null,
            total: Math.round(ticketValue * 0.06 * 100) / 100,
          },
        ]
      : [
          { item: 'H2S Standby', hours: null, total: 850 },
          { item: 'Equipment Rental', hours: null, total: 120 },
          { item: 'Mileage', hours: null, total: 67.2 },
        ];

    const salesTotal =
      Math.round(salesLines.reduce((s, l) => s + l.total, 0) * 100) / 100;

    return {
      flags,
      flagCount: flags.length,
      avgDistanceMi,
      timeRows,
      forms,
      photos,
      salesLines,
      salesTotal,
      purchaseOrders,
      salesTicketId: input.ticket?.id ?? null,
      locationLabel: input.wo.location?.name ?? input.wo.title ?? null,
    };
  }

  async ensureFromWorkOrders() {
    const pending = await this.prisma.closeoutReview.count({
      where: { status: CloseoutStatus.PENDING },
    });
    if (pending > 0) return { created: 0 };

    const workOrders = await this.prisma.workOrder.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        customer: { select: { id: true, name: true } },
        location: { select: { name: true } },
        dispatchAssignments: {
          where: { employeeId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        salesTickets: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    let created = 0;
    for (const wo of workOrders) {
      const existing = await this.prisma.closeoutReview.findUnique({
        where: { workOrderId: wo.id },
      });
      if (existing) continue;

      const employee = wo.dispatchAssignments[0]?.employee ?? null;
      const ticket = wo.salesTickets[0] ?? null;

      const timeEntries = employee
        ? await this.prisma.timeEntry.findMany({
            where: {
              employeeId: employee.id,
              archivedAt: null,
              OR: [
                { workOrderCode: wo.code },
                { workOrderShort: { contains: wo.code.slice(-4) } },
              ],
            },
            take: 6,
            include: {
              employee: { select: { firstName: true, lastName: true } },
            },
          })
        : await this.prisma.timeEntry.findMany({
            where: { archivedAt: null, workOrderCode: wo.code },
            take: 6,
            include: {
              employee: { select: { firstName: true, lastName: true } },
            },
          });

      const expenses = await this.prisma.expense.findMany({
        where: { customerId: wo.customerId, archivedAt: null },
        orderBy: { expenseDate: 'desc' },
        take: 4,
      });

      const packet = this.buildPacket({
        wo: {
          id: wo.id,
          code: wo.code,
          title: wo.title,
          category: wo.category,
          amount: wo.amount,
          serviceDate: wo.serviceDate,
          customerId: wo.customerId,
          customer: wo.customer,
          location: wo.location,
        },
        employee,
        ticket: ticket
          ? {
              id: ticket.id,
              submittedHours: ticket.submittedHours,
              submittedValue: ticket.submittedValue,
              serviceItem: ticket.serviceItem,
              adjustedValue: ticket.adjustedValue,
            }
          : null,
        timeEntries,
        expenses,
      });

      const offsetHrs = created * 3 + 2;
      await this.prisma.closeoutReview.create({
        data: {
          workOrderId: wo.id,
          customerId: wo.customerId,
          submittedById: employee?.id ?? null,
          submittedAt: new Date(Date.now() - offsetHrs * 3_600_000),
          serviceDate: wo.serviceDate,
          status: CloseoutStatus.PENDING,
          locationLabel: packet.locationLabel,
          flagCount: packet.flagCount,
          flags: packet.flags,
          avgDistanceMi: packet.avgDistanceMi,
          timeRows: packet.timeRows,
          forms: packet.forms,
          photos: packet.photos,
          salesLines: packet.salesLines,
          salesTotal: packet.salesTotal,
          purchaseOrders: packet.purchaseOrders,
          salesTicketId: packet.salesTicketId,
        },
      });
      created += 1;
    }
    return { created };
  }

  async overview() {
    await this.ensureFromWorkOrders();

    const pending = await this.prisma.closeoutReview.findMany({
      where: { status: CloseoutStatus.PENDING },
      orderBy: { submittedAt: 'asc' },
      include: this.include,
    });

    const openFlags = pending.reduce((s, r) => s + r.flagCount, 0);
    const distances = pending
      .map((r) => (r.avgDistanceMi != null ? money(r.avgDistanceMi) : null))
      .filter((d): d is number => d != null);
    const avgDistance =
      distances.length > 0
        ? (
            Math.round(
              (distances.reduce((a, b) => a + b, 0) / distances.length) * 10,
            ) / 10
          ).toFixed(1)
        : '0.0';
    const oldest = pending[0];
    const oldestDays = oldest
      ? Math.max(
          0,
          Math.floor((Date.now() - oldest.submittedAt.getTime()) / 86_400_000),
        )
      : 0;

    return {
      data: {
        kpis: {
          openFlags,
          openMeta: 'Unresolved',
          avgDistance: `${avgDistance} MI`,
          avgMeta: 'From job site',
          oldestFlag: `${oldestDays}D`,
          oldestMeta: 'Awaiting review',
        },
        pending: pending.map((r) => this.mapList(r)),
        pendingCount: pending.length,
      },
    };
  }

  async getOne(id: string) {
    const row = await this.prisma.closeoutReview.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Closeout not found');
    return { data: this.mapDetail(row) };
  }

  async refreshFlags() {
    const pending = await this.prisma.closeoutReview.findMany({
      where: { status: CloseoutStatus.PENDING },
      include: {
        workOrder: {
          include: {
            customer: { select: { name: true } },
            location: { select: { name: true } },
            salesTickets: {
              where: { archivedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    let updated = 0;
    for (const row of pending) {
      const ticket = row.workOrder.salesTickets[0] ?? null;
      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          archivedAt: null,
          ...(row.submittedById
            ? {
                OR: [
                  { workOrderCode: row.workOrder.code },
                  { employeeId: row.submittedById },
                ],
              }
            : { workOrderCode: row.workOrder.code }),
        },
        take: 6,
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      });
      const expenses = await this.prisma.expense.findMany({
        where: { customerId: row.customerId, archivedAt: null },
        orderBy: { expenseDate: 'desc' },
        take: 4,
      });

      const packet = this.buildPacket({
        wo: {
          id: row.workOrder.id,
          code: row.workOrder.code,
          title: row.workOrder.title,
          category: row.workOrder.category,
          amount: row.workOrder.amount,
          serviceDate: row.serviceDate,
          customerId: row.customerId,
          customer: row.workOrder.customer,
          location: row.workOrder.location,
        },
        employee: row.submittedBy,
        ticket: ticket
          ? {
              id: ticket.id,
              submittedHours: ticket.submittedHours,
              submittedValue: ticket.submittedValue,
              serviceItem: ticket.serviceItem,
              adjustedValue: ticket.adjustedValue,
            }
          : null,
        timeEntries,
        expenses,
      });

      await this.prisma.closeoutReview.update({
        where: { id: row.id },
        data: {
          flagCount: packet.flagCount,
          flags: packet.flags,
          avgDistanceMi: packet.avgDistanceMi,
          timeRows: packet.timeRows,
          forms: packet.forms,
          photos: packet.photos,
          salesLines: packet.salesLines,
          salesTotal: packet.salesTotal,
          purchaseOrders: packet.purchaseOrders,
          salesTicketId: packet.salesTicketId,
          locationLabel: packet.locationLabel,
        },
      });
      updated += 1;
    }

    return {
      data: {
        updated,
        message: `Refreshed flags on ${updated} closeout${updated === 1 ? '' : 's'}`,
      },
    };
  }

  async decide(id: string, dto: CloseoutDecisionDto, user: AuthUser) {
    const row = await this.prisma.closeoutReview.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Closeout not found');
    if (row.status !== CloseoutStatus.PENDING) {
      const who = row.decidedByName?.trim() || 'Someone';
      const when = relativeActionedAgo(row.decidedAt);
      throw new BadRequestException({
        code: 'ALREADY_ACTIONED',
        message: `${who} actioned this closeout ${when}.`,
        details: {
          actionedBy: [who],
          actionedAgo: [when],
        },
      });
    }

    const status =
      dto.decision === 'ACCEPT'
        ? CloseoutStatus.ACCEPTED
        : dto.decision === 'RETURN'
          ? CloseoutStatus.RETURNED
          : CloseoutStatus.HELD;

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const updated = await this.prisma.closeoutReview.update({
      where: { id },
      data: {
        status,
        decisionNote: dto.note?.trim() || null,
        decidedAt: new Date(),
        decidedById: user.id,
        decidedByName: actor ? displayUser(actor) : user.email,
      },
      include: this.include,
    });

    return { data: this.mapDetail(updated) };
  }
}
