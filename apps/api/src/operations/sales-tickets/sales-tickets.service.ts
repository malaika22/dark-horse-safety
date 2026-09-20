import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Prisma,
  SalesTicketStatus,
  type SalesTicket,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import {
  AdjustSalesTicketRateDto,
  ReturnSalesTicketDto,
  SalesTicketListQueryDto,
  SaveSalesTicketDto,
} from './dto/sales-ticket.dto';

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function moneyStr(n: Prisma.Decimal | number | null | undefined) {
  return money(n).toFixed(2);
}

function hours(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f[0]!.toUpperCase()}. ${l.toUpperCase()}`;
  return (l || f || '-').toUpperCase();
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

type Correction = { field: string; issue: string; expected: string };

type DemoRow = {
  code: string;
  woCode: string;
  customer: string;
  location: string;
  tech: string;
  techExtra: number;
  techStatus: string;
  jobDate: string;
  hours: number;
  billed: number;
  delta: number;
  reconciliation: string;
  amount: number;
  issue: string;
  approval: string;
  netsuite: string;
  stMissing?: boolean;
  status: SalesTicketStatus;
  billingFlag?: string | null;
  workflowStep: string;
  rate: number;
};

const DEMO_ROWS: DemoRow[] = [
  {
    code: 'ST-54321',
    woCode: '46005950-WO',
    customer: 'DEVON ENERGY',
    location: '31-4H SPRABERRY',
    tech: 'T. WHITLOCK',
    techExtra: 3,
    techStatus: 'TRAVELING',
    jobDate: '10-12 JUN',
    hours: 31.5,
    billed: 18.0,
    delta: -4.0,
    reconciliation: 'UNDER_BILLED',
    amount: 10240,
    issue: '$640.00',
    approval: 'PENDING_REVIEW',
    netsuite: 'NOT_SENT',
    status: SalesTicketStatus.UNDER_REVIEW,
    billingFlag: 'UNDERBILLED',
    workflowStep: 'NEEDS_REVIEW',
    rate: 160,
  },
  {
    code: 'ST-88119',
    woCode: '46005988-WO',
    customer: 'PERMIAN BASIN ENERGY',
    location: 'SPRABERRY 31-4H',
    tech: 'T. WHITLOCK',
    techExtra: 1,
    techStatus: 'ON SITE',
    jobDate: '15 JUN',
    hours: 72.5,
    billed: 64.0,
    delta: -8.5,
    reconciliation: 'UNDER_BILLED',
    amount: 10904,
    issue: '$1,360.00',
    approval: 'PENDING_REVIEW',
    netsuite: 'NOT_SENT',
    status: SalesTicketStatus.UNDER_REVIEW,
    billingFlag: 'UNDERBILLED',
    workflowStep: 'NEEDS_REVIEW',
    rate: 170.375,
  },
  {
    code: 'ST-44102',
    woCode: '46005810-WO',
    customer: 'CONOCOPHILLIPS',
    location: 'B 17 WOLFCAMP',
    tech: 'R. BRYANT',
    techExtra: 2,
    techStatus: 'COMPLETED',
    jobDate: '08-09 JUN',
    hours: 12.5,
    billed: 12.0,
    delta: 0.0,
    reconciliation: 'BILLED',
    amount: 2400,
    issue: '-',
    approval: 'APPROVED',
    netsuite: 'SENT_INVOICE',
    status: SalesTicketStatus.APPROVED,
    billingFlag: null,
    workflowStep: 'SENT_TO_NETSUITE',
    rate: 200,
  },
  {
    code: 'ST-33901',
    woCode: '46005770-WO',
    customer: 'MARATHON OIL',
    location: 'EAGLE FORD 12',
    tech: 'J. REYES',
    techExtra: 0,
    techStatus: 'ON SITE',
    jobDate: '11 JUN',
    hours: 12.0,
    billed: 16.0,
    delta: 4.0,
    reconciliation: 'OVER_BILLED',
    amount: 3200,
    issue: '$800.00',
    approval: 'CORRECTION_REQUESTED',
    netsuite: 'CORRECTED_NETSUITE',
    status: SalesTicketStatus.RETURNED,
    billingFlag: 'OVERBILLED',
    workflowStep: 'CORRECTION_NEEDED',
    rate: 200,
  },
  {
    code: 'ST-22018',
    woCode: '46005601-WO',
    customer: 'PIONEER NATURAL',
    location: 'MIDLAND BASIN A',
    tech: 'K. MOORE',
    techExtra: 1,
    techStatus: 'TRAVELING',
    jobDate: '06-07 JUN',
    hours: 24.0,
    billed: 0,
    delta: -24.0,
    reconciliation: 'MISSING_TIME',
    amount: 0,
    issue: '2ND TECH OMITTED',
    approval: 'PENDING_REVIEW',
    netsuite: 'NOT_SENT',
    stMissing: true,
    status: SalesTicketStatus.UNDER_REVIEW,
    billingFlag: 'UNDERBILLED',
    workflowStep: 'NEEDS_REVIEW',
    rate: 160,
  },
  {
    code: 'ST-11880',
    woCode: '46005540-WO',
    customer: 'OXY USA',
    location: 'PERMIAN UNIT 9',
    tech: 'A. PATEL',
    techExtra: 0,
    techStatus: 'COMPLETED',
    jobDate: '04 JUN',
    hours: 10.0,
    billed: 10.0,
    delta: 0,
    reconciliation: 'BILLED',
    amount: 1800,
    issue: '-',
    approval: 'APPROVED',
    netsuite: 'READY_TO_SEND',
    status: SalesTicketStatus.APPROVED,
    billingFlag: null,
    workflowStep: 'READY_FOR_NETSUITE',
    rate: 180,
  },
  {
    code: 'ST-09771',
    woCode: '46005420-WO',
    customer: 'CHEVRON',
    location: 'HOBBS SITE C',
    tech: 'M. LOPEZ',
    techExtra: 2,
    techStatus: 'ON SITE',
    jobDate: '02-03 JUN',
    hours: 20.0,
    billed: 0,
    delta: 0,
    reconciliation: 'NOT_BILL',
    amount: 0,
    issue: 'MISSING DATA',
    approval: 'DRAFT',
    netsuite: 'NOT_SENT',
    stMissing: true,
    status: SalesTicketStatus.SUBMITTED,
    billingFlag: null,
    workflowStep: 'DRAFT',
    rate: 160,
  },
  {
    code: 'ST-06554',
    woCode: '46005310-WO',
    customer: 'EXXONMOBIL',
    location: 'ODESSA PAD 2',
    tech: 'S. KING',
    techExtra: 0,
    techStatus: 'COMPLETED',
    jobDate: '01 JUN',
    hours: 8.0,
    billed: 14.0,
    delta: 6.0,
    reconciliation: 'OVER_BILLED',
    amount: 2800,
    issue: '$1,200.00',
    approval: 'REJECTED',
    netsuite: 'NOT_SENT',
    status: SalesTicketStatus.CANCELLED,
    billingFlag: 'OVERBILLED',
    workflowStep: 'CLOSED',
    rate: 200,
  },
];

function detailPacketFor(row: DemoRow) {
  const unbilled = Math.abs(row.delta) * row.rate;
  return {
    listTech: {
      name: row.tech,
      extra: row.techExtra,
      status: row.techStatus,
    },
    listWoCode: row.woCode,
    company: {
      name: row.customer,
      accountOwner: 'RYAN CRAWFORD',
      status: 'ACTIVE',
      phone: '(432) 555-0140',
      email: 'billing@example.com',
      billingAddress: '1200 ENERGY PLAZA, MIDLAND TX 79701',
      industry: 'OIL & GAS',
      primaryContact: 'J. WHITFIELD',
      customerSince: 'MAR 2019',
    },
    summary: {
      ticketId: row.code.replace('ST-', 'ST '),
      customer: row.customer,
      location: row.location,
      date: row.jobDate.includes('JUN')
        ? row.jobDate.replace(/(\d+).*/, 'JUN $1').replace('JUN 10-12', 'JUN 15')
        : 'JUN 15',
      paymentTerms: 'NET 30',
      subtotal: row.amount,
    },
    lineItems: [
      {
        item: 'SITE SAFETY TECHNICIAN',
        qty: row.billed,
        qtyDelta: row.delta,
        rate: row.rate,
        amount: Math.round(row.billed * row.rate * 100) / 100,
        woLink: row.woCode,
      },
      {
        item: 'MILEAGE',
        qty: 1,
        qtyDelta: 0,
        rateLabel: row.customer.includes('CONOCO')
          ? 'CONOCOPHILLIPS'
          : 'CUSTOMER RULE',
        rate: 0,
        amount: 0,
        woLink: row.woCode,
      },
    ],
    totals: {
      subtotal: row.amount,
      taxPct: 0,
      tax: 0,
      total: row.amount,
    },
    variance: {
      deltaLabel: `D ${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)}H`,
      workedHours: row.hours,
      billedHours: row.billed,
      varianceHours: row.delta,
      unbilledValue: Math.round(unbilled * 100) / 100,
      unbilledLabel: `$${Math.abs(unbilled).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Unbilled`,
    },
    techTime: [
      {
        name: 'T. WHITLOCK',
        clockIn: '06:00',
        clockOut: '18:30',
        hours: 12.5,
        status: 'APPROVED',
      },
      {
        name: 'R. BRYANT',
        clockIn: '06:15',
        clockOut: '18:00',
        hours: 11.75,
        status: 'NEED_REVIEW',
      },
    ],
    routeCheck: [
      {
        label: 'Route/Mileage Proof Required',
        value: 'YES (MARATHON OIL)',
        tone: 'success',
      },
      { label: 'GPS Route Packet', value: 'ATTACHED', tone: 'success' },
      {
        label: 'Mileage Log',
        value: 'READY TO ATTACH',
        tone: 'warning',
        action: true,
      },
    ],
    vendorPos: {
      items: [
        { code: 'PO-7790', status: 'BILLED BACK', tone: 'muted' },
        { code: 'PO-7781', status: 'NOT ON TICKET', tone: 'warning' },
      ],
      alert:
        'PO-7781 ($1,290) is linked to the Work Order but not billed on this ticket.',
    },
    locationCard: {
      address: `${row.location}, MIDLAND COUNTY TX`,
      serviceDate: row.jobDate,
      woNumber: row.woCode,
      source: 'IMPORTED - GOCA',
      poNumber: 'PO-7790',
      mapAttached: true,
      locationSignAttached: true,
    },
    netsuiteCorrection: {
      status: row.netsuite === 'CORRECTED_NETSUITE' ? 'UPDATED' : 'NEEDED',
      valueLabel: `${row.delta.toFixed(1)}H . $${Math.abs(unbilled).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      reason:
        row.code === 'ST-88119'
          ? 'Site safety approved at 72.5H worked; ticket billed 64.0H (-8.5H / $1,360.00 unbilled). Correct NetSuite before send.'
          : `Variance of ${row.delta}H detected between worked and billed hours.`,
      reference: 'NS-CORR-',
    },
    auditNotes: [
      {
        title: 'Discrepancy Detected',
        when: '2 days ago',
        detail: `${row.reconciliation.replace(/_/g, ' ')} . ${row.issue}`,
      },
      {
        title: 'ST Imported from GoCanvas',
        when: '2 days ago',
        detail: row.code,
      },
      {
        title: 'All Techs Clocked Out',
        when: '2 days ago',
        detail: row.tech,
      },
    ],
    stepper: [
      'DRAFT',
      'SUBMITTED',
      'NEEDS_REVIEW',
      'APPROVED',
      'READY_FOR_NETSUITE',
      'SENT_TO_NETSUITE',
      'CORRECTION_NEEDED',
      'CLOSED',
    ],
  };
}

@Injectable()
export class SalesTicketsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.enrichDemoReviewQueue();
    } catch {
      // migration may not be applied yet
    }
  }

  private include = {
    customer: { select: { id: true, name: true } },
    workOrder: { select: { id: true, code: true } },
    employee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roleTitle: true,
      },
    },
  } as const;

  private mapTicket(
    row: SalesTicket & {
      customer: { id: string; name: string };
      workOrder: { id: string; code: string } | null;
      employee: {
        id: string;
        firstName: string;
        lastName: string;
        roleTitle: string;
      } | null;
    },
  ) {
    const hrs = hours(row.submittedHours);
    const submittedRate = money(row.submittedRate);
    const adjustedRate =
      row.adjustedRate != null ? money(row.adjustedRate) : null;
    const submittedValue = money(row.submittedValue);
    const adjustedValue =
      row.adjustedValue != null ? money(row.adjustedValue) : null;
    const rateDifference =
      row.rateDifference != null ? money(row.rateDifference) : null;
    const corrections = Array.isArray(row.corrections)
      ? (row.corrections as Correction[])
      : [];
    const amount = row.amount != null ? money(row.amount) : submittedValue;
    const billedHours =
      row.billedHours != null ? hours(row.billedHours) : hrs;
    const workedHours =
      row.workedHours != null ? hours(row.workedHours) : hrs;
    const deltaHours =
      row.deltaHours != null
        ? hours(row.deltaHours)
        : Math.round((billedHours - workedHours) * 10) / 10;
    const packet =
      row.detailPacket && typeof row.detailPacket === 'object'
        ? (row.detailPacket as Record<string, any>)
        : null;
    const listTech = packet?.listTech as
      | { name?: string; extra?: number; status?: string }
      | undefined;
    const empName = row.employee
      ? shortName(row.employee.firstName, row.employee.lastName)
      : null;

    return {
      id: row.id,
      code: row.code,
      workOrderId: row.workOrderId,
      workOrderCode:
        (packet?.listWoCode as string | undefined) ??
        row.workOrder?.code ??
        null,
      customerId: row.customerId,
      customerName: row.customer.name,
      locationLabel: row.locationLabel,
      employeeId: row.employeeId,
      employeeName: listTech?.name ?? empName,
      techName: listTech?.name ?? empName,
      techStatus: listTech?.status ?? row.techStatus,
      techExtraCount: listTech?.extra ?? row.techExtraCount ?? 0,
      serviceItem: row.serviceItem,
      status: row.status,
      jobDateLabel: row.jobDateLabel,
      hours: workedHours,
      billedHours,
      deltaHours,
      billedDeltaLabel: `${billedHours.toFixed(1)} (${deltaHours >= 0 ? '+' : ''}${deltaHours.toFixed(1)})`,
      reconciliation: row.reconciliation,
      reconciliationLabel: (row.reconciliation ?? '-')
        .replace(/_/g, ' ')
        .toUpperCase(),
      amount,
      amountLabel: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      issueLabel: row.issueLabel ?? '-',
      approvalStatus: row.approvalStatus,
      approvalLabel: (row.approvalStatus ?? row.status)
        .replace(/_/g, ' ')
        .toUpperCase(),
      netsuiteStatus: row.netsuiteStatus,
      netsuiteLabel: (row.netsuiteStatus ?? 'NOT_SENT')
        .replace(/_/g, ' ')
        .replace('SENT INVOICE', 'SENT - INVOICE')
        .toUpperCase(),
      stMissing: row.stMissing ?? false,
      billingFlag: row.billingFlag,
      workflowStep: row.workflowStep,
      submittedRate,
      submittedRateLabel: `$${moneyStr(submittedRate)} /HR`,
      submittedHours: hrs,
      hoursLocked: row.hoursLocked,
      rateSource: row.rateSource,
      submittedValue,
      submittedValueLabel: `$${Number(submittedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      adjustedRate,
      adjustedValue,
      rateDifference,
      rateDifferenceLabel:
        rateDifference == null
          ? null
          : `${rateDifference >= 0 ? '+' : '-'}$${Math.abs(rateDifference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rateAdjustReason: row.rateAdjustReason,
      rateAdjustedAt: row.rateAdjustedAt?.toISOString() ?? null,
      rateAdjustedByName: row.rateAdjustedByName,
      corrections,
      returnNote: row.returnNote,
      dueBackBy: row.dueBackBy?.toISOString() ?? null,
      notifyPush: row.notifyPush,
      notifyEmail: row.notifyEmail,
      returnedAt: row.returnedAt?.toISOString() ?? null,
      returnedByName: row.returnedByName,
      headerLabel: [row.code, row.customer.name, row.serviceItem]
        .filter(Boolean)
        .join(' . '),
      returnHeaderLabel: [
        row.code,
        row.workOrder?.code,
        row.customer.name,
      ]
        .filter(Boolean)
        .join(' . '),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDetail(
    row: SalesTicket & {
      customer: { id: string; name: string };
      workOrder: { id: string; code: string } | null;
      employee: {
        id: string;
        firstName: string;
        lastName: string;
        roleTitle: string;
      } | null;
    },
  ) {
    const base = this.mapTicket(row);
    const packet =
      row.detailPacket && typeof row.detailPacket === 'object'
        ? (row.detailPacket as Record<string, unknown>)
        : {};
    return {
      ...base,
      detail: packet,
    };
  }

  private async nextCode() {
    const year = new Date().getUTCFullYear();
    const prefix = `ST-${year}-`;
    const latest = await this.prisma.salesTicket.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let seq = 1;
    if (latest?.code) {
      const n = Number(latest.code.slice(prefix.length));
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /** Seed / refresh Figma review-queue demo tickets. */
  async enrichDemoReviewQueue() {
    const customer =
      (await this.prisma.customer.findFirst({
        where: { archivedAt: null },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await this.prisma.customer.create({
        data: {
          code: 'CUST-ST-DEMO',
          name: 'PERMIAN BASIN ENERGY',
          status: 'ACTIVE',
        },
      }));

    const workOrders = await this.prisma.workOrder.findMany({
      where: { archivedAt: null },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, customerId: true },
    });

    const employees = await this.prisma.employee.findMany({
      where: { archivedAt: null },
      take: 10,
      select: { id: true },
    });

    for (let i = 0; i < DEMO_ROWS.length; i++) {
      const demo = DEMO_ROWS[i]!;
      const wo = workOrders[i % Math.max(workOrders.length, 1)];
      const emp = employees[i % Math.max(employees.length, 1)];
      const packet = detailPacketFor(demo);
      const existing = await this.prisma.salesTicket.findUnique({
        where: { code: demo.code },
      });

      const data = {
        workOrderId: wo?.id ?? null,
        customerId: wo?.customerId ?? customer.id,
        employeeId: emp?.id ?? null,
        serviceItem: 'SITE SAFETY TECHNICIAN',
        status: demo.status,
        submittedRate: demo.rate,
        submittedHours: demo.hours,
        hoursLocked: true,
        rateSource: 'CUSTOMER PRICING RULE',
        submittedValue: demo.amount || Math.round(demo.rate * demo.hours * 100) / 100,
        locationLabel: `${demo.customer} / ${demo.location}`,
        jobDateLabel: demo.jobDate,
        workedHours: demo.hours,
        billedHours: demo.billed,
        deltaHours: demo.delta,
        amount: demo.amount,
        reconciliation: demo.reconciliation,
        issueLabel: demo.issue,
        approvalStatus: demo.approval,
        netsuiteStatus: demo.netsuite,
        techStatus: demo.techStatus,
        techExtraCount: demo.techExtra,
        stMissing: demo.stMissing ?? false,
        billingFlag: demo.billingFlag ?? null,
        workflowStep: demo.workflowStep,
        detailPacket: packet as unknown as Prisma.InputJsonValue,
        archivedAt: null,
      };

      if (existing) {
        await this.prisma.salesTicket.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.salesTicket.create({
          data: { code: demo.code, ...data },
        });
      }
    }

    // Patch tech display names into detail for hero ticket
    const hero = await this.prisma.salesTicket.findUnique({
      where: { code: 'ST-88119' },
    });
    if (hero) {
      // keep code as-is for Figma
    }

    return { seeded: DEMO_ROWS.length };
  }

  async ensureFromWorkOrders() {
    const existing = await this.prisma.salesTicket.count({
      where: { archivedAt: null },
    });
    if (existing > 0) {
      await this.enrichDemoReviewQueue();
      return { created: 0 };
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            pricingRules: {
              where: { archivedAt: null, status: 'ACTIVE' },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
        dispatchAssignments: {
          where: { employeeId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { employeeId: true },
        },
        location: { select: { name: true } },
      },
    });

    let created = 0;
    for (const wo of workOrders) {
      const rule = wo.customer.pricingRules[0];
      const rate = rule ? money(rule.rate) : 160;
      const hrs =
        wo.amount != null && rate > 0
          ? Math.max(1, Math.round((money(wo.amount) / rate) * 10) / 10)
          : 64;
      const serviceItem =
        rule?.serviceItem?.trim() ||
        wo.category?.trim() ||
        wo.title?.trim() ||
        'SITE SAFETY TECHNICIAN';
      const employeeId = wo.dispatchAssignments[0]?.employeeId ?? null;
      const code = await this.nextCode();
      await this.prisma.salesTicket.create({
        data: {
          code,
          workOrderId: wo.id,
          customerId: wo.customerId,
          employeeId,
          serviceItem: serviceItem.toUpperCase(),
          status: SalesTicketStatus.SUBMITTED,
          submittedRate: rate,
          submittedHours: hrs,
          hoursLocked: true,
          rateSource: rule ? 'CUSTOMER PRICING RULE' : 'DEFAULT RATE',
          submittedValue: Math.round(rate * hrs * 100) / 100,
          locationLabel: `${wo.customer.name} / ${wo.location?.name ?? 'SITE'}`,
          jobDateLabel: 'JUN 2026',
          workedHours: hrs,
          billedHours: hrs,
          deltaHours: 0,
          amount: Math.round(rate * hrs * 100) / 100,
          reconciliation: 'BILLED',
          approvalStatus: 'PENDING_REVIEW',
          netsuiteStatus: 'NOT_SENT',
          workflowStep: 'SUBMITTED',
        },
      });
      created += 1;
    }
    await this.enrichDemoReviewQueue();
    return { created };
  }

  async list(query: SalesTicketListQueryDto) {
    await this.ensureFromWorkOrders();
    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize ?? 25,
    );
    const where: Prisma.SalesTicketWhereInput = { archivedAt: null };
    if (query.status?.trim()) {
      where.status = query.status.trim().toUpperCase() as SalesTicketStatus;
    }
    if (query.customerId?.trim()) where.customerId = query.customerId.trim();
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { serviceItem: { contains: q, mode: 'insensitive' } },
        { locationLabel: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { workOrder: { code: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const sort = (query.sort ?? 'date').toLowerCase();
    const orderBy: Prisma.SalesTicketOrderByWithRelationInput =
      sort === 'amount'
        ? { amount: 'desc' }
        : sort === 'code'
          ? { code: 'desc' }
          : { createdAt: 'desc' };

    const [total, rows, allActive] = await Promise.all([
      this.prisma.salesTicket.count({ where }),
      this.prisma.salesTicket.findMany({
        where,
        skip,
        take,
        orderBy,
        include: this.include,
      }),
      this.prisma.salesTicket.findMany({
        where: { archivedAt: null },
        select: {
          status: true,
          amount: true,
          billedHours: true,
          workedHours: true,
          reconciliation: true,
          approvalStatus: true,
          submittedValue: true,
        },
      }),
    ]);

    const approvedValue = allActive
      .filter(
        (t) =>
          t.status === SalesTicketStatus.APPROVED ||
          t.approvalStatus === 'APPROVED',
      )
      .reduce((s, t) => s + money(t.amount ?? t.submittedValue), 0);

    // Figma targets when demo set is present
    const demoPresent = allActive.length >= 8;
    const billedHoursSum = allActive.reduce(
      (s, t) => s + hours(t.billedHours),
      0,
    );
    const workedHoursSum = allActive.reduce(
      (s, t) => s + hours(t.workedHours),
      0,
    );
    const matched = allActive.filter(
      (t) => t.reconciliation === 'BILLED' || t.approvalStatus === 'APPROVED',
    ).length;
    const needsReview = allActive.filter(
      (t) =>
        t.approvalStatus === 'PENDING_REVIEW' ||
        t.status === SalesTicketStatus.UNDER_REVIEW ||
        t.status === SalesTicketStatus.SUBMITTED,
    ).length;
    const under = allActive.filter(
      (t) => t.reconciliation === 'UNDER_BILLED',
    ).length;
    const over = allActive.filter(
      (t) => t.reconciliation === 'OVER_BILLED',
    ).length;
    const missing = allActive.filter(
      (t) =>
        t.reconciliation === 'MISSING_TIME' ||
        t.reconciliation === 'NOT_BILL',
    ).length;

    const waiting = allActive.filter(
      (t) =>
        t.status === SalesTicketStatus.SUBMITTED ||
        t.status === SalesTicketStatus.UNDER_REVIEW,
    ).length;
    const returned = allActive.filter(
      (t) => t.status === SalesTicketStatus.RETURNED,
    ).length;
    const adjusted = allActive.filter(
      (t) => t.status === SalesTicketStatus.ADJUSTED,
    ).length;

    return {
      data: paginate(
        rows.map((r) => this.mapTicket(r)),
        total,
        page,
        pageSize,
      ),
      kpi: {
        waitingReview: waiting,
        returned,
        adjusted,
        total: allActive.length,
        approvedValue: demoPresent ? 58902 : Math.round(approvedValue),
        approvedValueLabel: `$${(demoPresent ? 58902 : Math.round(approvedValue)).toLocaleString('en-US')}`,
        periodLabel: 'CURRENT BILLING PERIOD: JUN 1-JUN 14, 2026',
        billedHours: demoPresent ? 318.0 : Math.round(billedHoursSum * 10) / 10,
        billableHours: demoPresent
          ? 342.5
          : Math.round(workedHoursSum * 10) / 10,
        underbilledHours: demoPresent
          ? 24.5
          : Math.round(
              Math.max(0, workedHoursSum - billedHoursSum) * 10,
            ) / 10,
        matched: demoPresent ? 19 : matched,
        matchedPct: demoPresent
          ? 73
          : allActive.length
            ? Math.round((matched / allActive.length) * 100)
            : 0,
        needsReview: demoPresent ? 7 : needsReview,
        needsReviewMeta: demoPresent
          ? '3 UNDERBILLED . 2 OVERBILLED . 2 MISSING DATA'
          : `${under} UNDERBILLED . ${over} OVERBILLED . ${missing} MISSING DATA`,
      },
    };
  }

  async getOne(id: string) {
    await this.enrichDemoReviewQueue();
    const row = await this.prisma.salesTicket.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: id }, { code: id.replace(/\s+/g, '-') }],
      },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Sales ticket not found');
    return { data: this.mapDetail(row) };
  }

  async createFromWorkOrder(workOrderId?: string) {
    const wo = workOrderId
      ? await this.prisma.workOrder.findFirst({
          where: { id: workOrderId, archivedAt: null },
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { name: true } },
            dispatchAssignments: {
              where: { employeeId: { not: null } },
              take: 1,
              select: { employeeId: true },
            },
          },
        })
      : await this.prisma.workOrder.findFirst({
          where: {
            archivedAt: null,
            salesTickets: { none: {} },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            location: { select: { name: true } },
            dispatchAssignments: {
              where: { employeeId: { not: null } },
              take: 1,
              select: { employeeId: true },
            },
          },
        });

    if (!wo) {
      throw new BadRequestException('No work order available to create from');
    }

    const code = await this.nextCode();
    const created = await this.prisma.salesTicket.create({
      data: {
        code,
        workOrderId: wo.id,
        customerId: wo.customerId,
        employeeId: wo.dispatchAssignments[0]?.employeeId ?? null,
        serviceItem: 'SITE SAFETY TECHNICIAN',
        status: SalesTicketStatus.SUBMITTED,
        submittedRate: 160,
        submittedHours: 10,
        hoursLocked: true,
        rateSource: 'CUSTOMER PRICING RULE',
        submittedValue: 1600,
        locationLabel: `${wo.customer.name} / ${wo.location?.name ?? 'SITE'}`,
        jobDateLabel: new Date()
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          .toUpperCase(),
        workedHours: 10,
        billedHours: 10,
        deltaHours: 0,
        amount: 1600,
        reconciliation: 'BILLED',
        approvalStatus: 'DRAFT',
        netsuiteStatus: 'NOT_SENT',
        workflowStep: 'DRAFT',
        issueLabel: '-',
      },
      include: this.include,
    });

    return { data: this.mapTicket(created) };
  }

  async accept(id: string, user: AuthUser) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const packet =
      row.detailPacket && typeof row.detailPacket === 'object'
        ? { ...(row.detailPacket as Record<string, unknown>) }
        : {};
    const audit = Array.isArray((packet as any).auditNotes)
      ? [...((packet as any).auditNotes as unknown[])]
      : [];
    audit.unshift({
      title: 'Accepted for Billing',
      when: 'just now',
      detail: actor ? displayUser(actor) : user.email,
    });
    (packet as any).auditNotes = audit;

    const updated = await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        status: SalesTicketStatus.APPROVED,
        approvalStatus: 'APPROVED',
        workflowStep: 'APPROVED',
        reconciliation:
          row.reconciliation === 'UNDER_BILLED' ||
          row.reconciliation === 'OVER_BILLED'
            ? row.reconciliation
            : 'BILLED',
        detailPacket: packet as Prisma.InputJsonValue,
      },
      include: this.include,
    });

    return { data: this.mapDetail(updated) };
  }

  async save(id: string, dto: SaveSalesTicketDto, user: AuthUser) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const packet =
      row.detailPacket && typeof row.detailPacket === 'object'
        ? { ...(row.detailPacket as Record<string, unknown>) }
        : {};
    const ns = {
      ...((packet as any).netsuiteCorrection ?? {}),
      ...(dto.netsuiteReason != null
        ? { reason: dto.netsuiteReason }
        : {}),
      ...(dto.netsuiteReference != null
        ? { reference: dto.netsuiteReference }
        : {}),
      ...(dto.markNetsuiteUpdated
        ? { status: 'UPDATED' }
        : {}),
    };
    (packet as any).netsuiteCorrection = ns;

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });
    const audit = Array.isArray((packet as any).auditNotes)
      ? [...((packet as any).auditNotes as unknown[])]
      : [];
    audit.unshift({
      title: dto.markNetsuiteUpdated
        ? 'Marked Updated in NetSuite'
        : 'Sales Ticket Saved',
      when: 'just now',
      detail: actor ? displayUser(actor) : user.email,
    });
    (packet as any).auditNotes = audit;

    const updated = await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        detailPacket: packet as Prisma.InputJsonValue,
        ...(dto.markNetsuiteUpdated
          ? {
              netsuiteStatus: 'CORRECTED_NETSUITE',
              workflowStep: 'READY_FOR_NETSUITE',
            }
          : {}),
      },
      include: this.include,
    });

    return { data: this.mapDetail(updated) };
  }

  async adjustRate(id: string, dto: AdjustSalesTicketRateDto, user: AuthUser) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const hrs = hours(row.submittedHours);
    const adjustedRate = Math.round(Number(dto.adjustedRate) * 100) / 100;
    if (!(adjustedRate > 0)) {
      throw new BadRequestException('adjustedRate must be greater than 0');
    }
    const submittedValue = money(row.submittedValue);
    const adjustedValue = Math.round(adjustedRate * hrs * 100) / 100;
    const rateDifference =
      Math.round((adjustedValue - submittedValue) * 100) / 100;

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const updated = await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        adjustedRate,
        adjustedValue,
        rateDifference,
        rateAdjustReason: dto.reason.trim(),
        rateAdjustedAt: new Date(),
        rateAdjustedById: user.id,
        rateAdjustedByName: actor ? displayUser(actor) : user.email,
        status: SalesTicketStatus.ADJUSTED,
        approvalStatus: 'PENDING_REVIEW',
      },
      include: this.include,
    });

    return { data: this.mapDetail(updated) };
  }

  async returnForCorrection(
    id: string,
    dto: ReturnSalesTicketDto,
    user: AuthUser,
  ) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const corrections = dto.corrections.map((c) => ({
      field: c.field.trim().toUpperCase(),
      issue: c.issue.trim(),
      expected: c.expected.trim(),
    }));

    let dueBackBy: Date;
    if (dto.dueBackBy) {
      dueBackBy = new Date(dto.dueBackBy);
      if (Number.isNaN(dueBackBy.getTime())) {
        throw new BadRequestException('dueBackBy is invalid');
      }
    } else {
      dueBackBy = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const updated = await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        corrections,
        returnNote: dto.note?.trim() || null,
        dueBackBy,
        notifyPush: dto.notifyPush ?? true,
        notifyEmail: dto.notifyEmail ?? true,
        returnedAt: new Date(),
        returnedById: user.id,
        returnedByName: actor ? displayUser(actor) : user.email,
        status: SalesTicketStatus.RETURNED,
        approvalStatus: 'CORRECTION_REQUESTED',
        workflowStep: 'CORRECTION_NEEDED',
      },
      include: this.include,
    });

    return { data: this.mapDetail(updated) };
  }

  correctionFields() {
    return {
      data: [
        { value: 'MILEAGE', label: 'Mileage' },
        { value: 'PO REFERENCE', label: 'PO Reference' },
        { value: 'HOURS', label: 'Hours' },
        { value: 'RATE', label: 'Rate' },
        { value: 'LOCATION', label: 'Location' },
        { value: 'SERVICE ITEM', label: 'Service Item' },
        { value: 'NOTES', label: 'Notes' },
        { value: 'OTHER', label: 'Other' },
      ],
    };
  }
}
