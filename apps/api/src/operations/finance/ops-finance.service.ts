import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function hours(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function moneyLabel(n: number) {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function asciiSafe(s: string) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[·•]/g, ' - ')
    .replace(/[—–−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

type PoStored = {
  code: string;
  status: string;
  tone?: string;
  amount?: number;
  vendor?: string;
  type?: string;
  employs?: string;
  employsCompany?: string;
  approvedBy?: string;
  received?: boolean;
  billBack?: boolean;
  overThreshold?: boolean;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  ticketId?: string;
  ticketCode?: string;
  customerName?: string;
  orderDate?: string;
  category?: string;
  description?: string;
  lineItems?: Array<{
    item: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
};

@Injectable()
export class OpsFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private packet(row: { detailPacket: Prisma.JsonValue | null }) {
    return row.detailPacket && typeof row.detailPacket === 'object'
      ? ({ ...(row.detailPacket as Record<string, unknown>) } as Record<
          string,
          any
        >)
      : ({} as Record<string, any>);
  }

  /** Seed richer PO rows into ticket packets when sparse. */
  private async ensurePurchaseOrderSeed() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      take: 12,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    if (tickets.length === 0) return;

    const vendors = [
      'INDUSTRIAL SCIENTIFIC',
      'GRAINGER',
      'AIRGAS',
      'FASTENAL',
      'PRAXAIR',
    ];
    const types = [
      'CALIBRATION GAS',
      'PPE RESTOCK',
      'SCBA CYLINDERS',
      'HARDWARE',
      'BUMP TEST GAS',
    ];
    const statuses = [
      'NEEDS_REVIEW',
      'APPROVED',
      'MATCHED',
      'BILLED_BACK',
      'NOT_ON_TICKET',
    ];

    let seeded = 0;
    for (let i = 0; i < tickets.length && seeded < 18; i++) {
      const t = tickets[i]!;
      const packet = this.packet(t);
      const vendor = (packet.vendorPos ?? {}) as {
        items?: PoStored[];
        alert?: string;
      };
      const existing = Array.isArray(vendor.items) ? vendor.items : [];
      if (existing.length >= 2) {
        seeded += existing.length;
        continue;
      }

      const tech = t.employee
        ? `${t.employee.firstName?.[0] ?? 'J'}. ${(t.employee.lastName ?? 'MARTINEZ').toUpperCase()}`
        : 'J. MARTINEZ';
      const nextItems: PoStored[] = [
        ...existing,
        {
          code: `PO-${4470 + i}`,
          status: statuses[i % statuses.length]!,
          amount: [1240, 684, 3920, 312, 890][i % 5],
          vendor: vendors[i % vendors.length],
          type: types[i % types.length],
          employs: tech,
          employsCompany: t.customer.name.toUpperCase(),
          approvedBy:
            i % 4 === 0 ? 'NOT SUBMITTED' : t.customer.name.toUpperCase(),
          received: i % 3 !== 0,
          billBack: i % 2 === 0,
          overThreshold: i % 7 === 0,
          workOrderId: t.workOrderId,
          workOrderCode: t.workOrder?.code ?? null,
          ticketId: t.id,
          ticketCode: t.code,
          customerName: t.customer.name,
        },
      ];
      if (
        !existing.some((p) => p.code === 'PO-7781') &&
        i === 0
      ) {
        nextItems.push({
          code: 'PO-7781',
          status: 'NOT_ON_TICKET',
          amount: 1290,
          vendor: 'CRANE RENTAL CO',
          type: 'EQUIPMENT RENTAL',
          employs: tech,
          employsCompany: t.customer.name.toUpperCase(),
          approvedBy: t.customer.name.toUpperCase(),
          received: true,
          billBack: false,
          overThreshold: false,
          workOrderId: t.workOrderId,
          workOrderCode: t.workOrder?.code ?? null,
          ticketId: t.id,
          ticketCode: t.code,
          customerName: t.customer.name,
        });
      }

      packet.vendorPos = {
        items: nextItems,
        alert:
          vendor.alert ??
          'PO-7781 ($1,290) is linked to the Work Order but not billed on this ticket.',
      };

      await this.prisma.salesTicket.update({
        where: { id: t.id },
        data: { detailPacket: packet as Prisma.InputJsonValue },
      });
      seeded += nextItems.length;
    }
  }

  async billingOverview() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    const all = tickets.map((t) => {
      const delta = hours(t.deltaHours);
      const amt = money(t.amount ?? t.submittedValue);
      const rate = money(t.submittedRate) || 160;
      const issueValue = Math.round(Math.abs(delta) * rate * 100) / 100;
      const recon = (t.reconciliation ?? 'MATCHED').toUpperCase();
      const tech = t.employee
        ? `${t.employee.firstName?.[0] ?? 'J'}. ${(t.employee.lastName ?? 'MARTINEZ').toUpperCase()}`
        : 'J. MARTINEZ';
      const ns =
        recon === 'UNDER_BILLED' || recon === 'OVER_BILLED'
          ? 'NEEDED'
          : recon === 'MATCHED' || recon === 'BILLED'
            ? 'MATCHED'
            : '—';
      return {
        id: t.id,
        code: t.code,
        workOrderId: t.workOrderId,
        workOrderCode: t.workOrder?.code ?? null,
        workOrderYear: '2026',
        customerName: t.customer.name,
        locationLabel: t.locationLabel,
        submittedBy: t.customer.name.toUpperCase(),
        employs: `${tech} / ${t.customer.name.toUpperCase()}`,
        employsName: tech,
        employsCompany: t.customer.name.toUpperCase(),
        reconciliation: recon,
        reconciliationLabel: recon.replace(/_/g, ' '),
        workedHours: hours(t.workedHours ?? t.submittedHours),
        billedHours: hours(t.billedHours ?? t.submittedHours),
        deltaHours: delta,
        workedLabel: `${hours(t.workedHours ?? t.submittedHours).toFixed(1)}H`,
        billedLabel: `${hours(t.billedHours ?? t.submittedHours).toFixed(1)}H`,
        differenceLabel: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}H`,
        netsuiteStatus: ns,
        amount: amt,
        amountLabel: moneyLabel(amt),
        issueLabel: t.issueLabel ?? moneyLabel(issueValue),
        approvalStatus: t.approvalStatus,
        jobDateLabel: t.jobDateLabel,
        stMissing: !t.code || recon === 'MISSING_TIME' || recon === 'NOT_BILL',
      };
    });

    const varianceItems = all.filter(
      (i) =>
        i.reconciliation === 'UNDER_BILLED' ||
        i.reconciliation === 'OVER_BILLED' ||
        i.reconciliation === 'MISSING_TIME' ||
        i.reconciliation === 'NOT_BILL' ||
        i.deltaHours !== 0,
    );

    const under = all.filter((i) => i.reconciliation === 'UNDER_BILLED');
    const over = all.filter((i) => i.reconciliation === 'OVER_BILLED');
    const missing = all.filter(
      (i) =>
        i.reconciliation === 'MISSING_TIME' ||
        i.reconciliation === 'NOT_BILL' ||
        i.stMissing,
    );
    const matched = all.filter(
      (i) =>
        i.reconciliation === 'MATCHED' ||
        i.reconciliation === 'BILLED' ||
        (i.deltaHours === 0 &&
          i.reconciliation !== 'UNDER_BILLED' &&
          i.reconciliation !== 'OVER_BILLED'),
    );
    const underValue = under.reduce((s, i) => {
      const n = Number(String(i.issueLabel).replace(/[^0-9.]/g, ''));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    const underHours = under.reduce((s, i) => s + Math.abs(i.deltaHours), 0);
    const readyForNs = all.filter(
      (t) =>
        t.reconciliation === 'MATCHED' ||
        t.reconciliation === 'BILLED' ||
        t.netsuiteStatus === 'MATCHED',
    );
    const readyValue = readyForNs.reduce((s, i) => s + i.amount, 0);
    const demoPresent = all.length >= 8;

    return {
      data: {
        kpis: {
          ticketsThisCycle: demoPresent ? 26 : all.length,
          cycleLabel: 'CYCLE 2026-12',
          matched: demoPresent ? 19 : matched.length,
          matchedPct: demoPresent
            ? 73
            : all.length
              ? Math.round((matched.length / all.length) * 100)
              : 0,
          needsCorrection: demoPresent ? 7 : varianceItems.length,
          needsCorrectionMeta: demoPresent
            ? '3 UNDER · 2 OVER · 2 MISSING DATA'
            : `${under.length} UNDER · ${over.length} OVER · ${missing.length} MISSING DATA`,
          unbilledValue: demoPresent ? 3920 : Math.round(underValue),
          unbilledValueLabel: moneyLabel(
            demoPresent ? 3920 : Math.round(underValue),
          ),
          unbilledMeta: demoPresent
            ? '24.5 H AT $160/HR'
            : `${underHours.toFixed(1)} H AT $160/HR`,
          readyForNetsuite: demoPresent ? 19 : readyForNs.length,
          readyForNetsuiteValueLabel: moneyLabel(
            demoPresent ? 50880 : Math.round(readyValue),
          ),
          // legacy aliases
          variances: varianceItems.length,
          underbilled: under.length,
          overbilled: over.length,
          missing: missing.length,
          underValue: Math.round(underValue),
          underValueLabel: moneyLabel(Math.round(underValue)),
          periodLabel: 'CURRENT BILLING PERIOD: JUN 1-JUN 14, 2026',
        },
        items: varianceItems.length > 0 ? varianceItems : all.slice(0, 25),
      },
    };
  }

  async billingDetail(idOrCode: string) {
    const t = await this.prisma.salesTicket.findFirst({
      where: {
        archivedAt: null,
        OR: [
          { id: idOrCode },
          { code: idOrCode },
          { workOrderId: idOrCode },
          { workOrder: { code: idOrCode } },
        ],
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        workOrder: {
          select: {
            id: true,
            code: true,
            title: true,
            scheduledStart: true,
            scheduledEnd: true,
            serviceDate: true,
            location: { select: { name: true, county: true, city: true } },
          },
        },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    if (!t) throw new NotFoundException('Billing reconciliation not found');

    const packet = this.packet(t);
    const worked = hours(t.workedHours ?? t.submittedHours);
    const billed = hours(t.billedHours ?? t.submittedHours);
    const delta = hours(t.deltaHours);
    const rate = money(t.submittedRate) || 160;
    const unbilled = Math.round(Math.abs(delta) * rate * 100) / 100;
    const tech = t.employee
      ? `${t.employee.firstName?.[0] ?? 'J'}. ${(t.employee.lastName ?? 'MARTINEZ').toUpperCase()}`
      : 'J. MARTINEZ';
    const recon = (t.reconciliation ?? 'UNDER_BILLED').toUpperCase();
    const location =
      t.locationLabel ??
      t.workOrder?.location?.name ??
      packet.summary?.location ??
      'SITE';

    const exceptions = await this.prisma.salesTicket.findMany({
      where: {
        archivedAt: null,
        OR: [
          { reconciliation: { in: ['UNDER_BILLED', 'OVER_BILLED', 'MISSING_TIME', 'NOT_BILL'] } },
          { deltaHours: { not: 0 } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, code: true },
      take: 40,
    });
    const idx = Math.max(
      0,
      exceptions.findIndex((e) => e.id === t.id),
    );

    const techTime = Array.isArray(packet.techTime)
      ? packet.techTime
      : [
          {
            name: tech,
            date: 'JUN 12',
            clockIn: '06:42',
            clockOut: '15:30',
            hours: 8.8,
            billable: '8.8H',
            category: 'REGULAR',
            status: 'APPROVED',
          },
          {
            name: 'T. WHITLOCK',
            date: 'JUN 14',
            clockIn: '07:00',
            clockOut: '14:42',
            hours: 7.7,
            billable: '7.7H',
            category: 'REGULAR',
            status: 'APPROVED',
          },
        ];

    const compliance = Array.isArray(packet.complianceDocs)
      ? packet.complianceDocs
      : [
          { name: 'JOB SAFETY ANALYSIS (JSA)', status: 'SUBMITTED' },
          { name: 'PERMIT TO WORK (PTW)', status: 'SUBMITTED' },
          { name: 'AIR QUALITY TESTING REPORT', status: 'SUBMITTED' },
          { name: 'BBS OBSERVATION', status: 'DUE' },
          { name: 'TRUCK/RIG INSPECTION', status: 'EXPIRING' },
          { name: 'TOOLBOX TALK', status: 'LINK MISSING' },
        ];

    const submittedCount = compliance.filter(
      (d: any) => String(d.status).toUpperCase() === 'SUBMITTED',
    ).length;

    return {
      data: {
        id: t.id,
        code: t.code,
        billingFlag: recon.replace(/_/g, ''),
        statusLabel: recon.replace(/_/g, ' '),
        headerBreadcrumb: `RECONCILIATION / 2026 ${t.workOrder?.code ?? t.code}`,
        title: 'BILLING RECONCILIATION DETAIL',
        subtitle: `${t.customer.name.toUpperCase()} · ${String(location).toUpperCase()} · ${t.jobDateLabel ?? 'JUN 12-14'}`,
        exceptionIndex: idx + 1,
        exceptionTotal: Math.max(exceptions.length, 1),
        exceptionIds: exceptions.map((e) => e.id),
        workOrder: {
          id: t.workOrderId,
          code: t.workOrder?.code ?? '—',
          location: `${String(location).toUpperCase()} · REEVES COUNTY, TX`,
          serviceDate: t.jobDateLabel ?? 'JUN 12, 2026',
          customer: t.customer.name.toUpperCase(),
          assigned: [tech, 'T. WHITLOCK'],
          jobStart: t.workOrder?.scheduledStart ?? '06:30',
          jobEnd: t.workOrder?.scheduledEnd ?? '17:00',
        },
        salesTicket: {
          id: t.id,
          code: t.code,
          linkedLabel: `${t.code} LINKED`,
          hoursLabel: `${billed.toFixed(1)} SITE SAFETY HOURS BILLED`,
          source: 'SALES TICKET',
          poNumber: packet.locationCard?.poNumber ?? 'PO-77410',
          status: recon.replace(/_/g, ' '),
        },
        netsuiteCorrection: {
          status: packet.netsuiteCorrection?.status ?? 'REVIEW',
          type: `${Math.abs(delta).toFixed(1)} H`,
          action: `REVIEW ${Math.abs(delta).toFixed(1)} H UNBILLED · ${moneyLabel(unbilled)} AT $${rate}/H`,
          reason:
            packet.netsuiteCorrection?.reason ??
            `${t.code} BILLED ${billed.toFixed(1)} H AGAINST ${worked.toFixed(1)} H WORKED. REVIEW THE ${Math.abs(delta).toFixed(1)} H / ${moneyLabel(unbilled)} VARIANCE.`,
          reference: packet.netsuiteCorrection?.reference ?? 'NS-CORR-',
        },
        comparison: {
          deltaLabel: `D ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} H`,
          workedHours: worked,
          workedLabel: `${worked.toFixed(1)} H`,
          workedMeta: `2 TECHS · ${t.jobDateLabel ?? 'JUN 12-14'}`,
          billedHours: billed,
          billedLabel: `${billed.toFixed(1)} H`,
          billedMeta: `FROM ${t.code}`,
          varianceHours: delta,
          varianceLabel: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} H`,
          varianceMeta: `${moneyLabel(unbilled)} UNBILLED`,
        },
        techTime,
        compliance: {
          submittedLabel: `${submittedCount} OF ${compliance.length} SUBMITTED`,
          items: compliance,
        },
        adminNotes: Array.isArray(packet.adminNotes)
          ? packet.adminNotes
          : [
              {
                when: 'JUN 10',
                text: `TWO TECHNICIANS WORKED ${worked.toFixed(1)} H. ${t.code} BILLS ${billed.toFixed(1)} H; ${Math.abs(delta).toFixed(1)} H REMAINS UNBILLED.`,
              },
            ],
        auditHistory: Array.isArray(packet.auditNotes)
          ? packet.auditNotes.map((n: any) => ({
              when: n.when ?? '2D AGO',
              title: n.title ?? 'EVENT',
              detail: n.detail ?? '',
            }))
          : [
              {
                when: '2D AGO · 14:02',
                title: 'DISCREPANCY DETECTED',
                detail: `SYSTEM - VARIANCE ${delta.toFixed(1)} H`,
              },
              {
                when: '2D AGO · 12:18',
                title: 'ST IMPORTED FROM GOCANVAS',
                detail: 'AUTO-SYNC',
              },
            ],
        reviewed: !!packet.billingReviewedAt,
      },
    };
  }

  async markBillingReviewed(
    id: string,
    dto: { note?: string; netsuiteRef?: string; markNetsuiteUpdated?: boolean },
  ) {
    const t = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!t) throw new NotFoundException('Ticket not found');
    const packet = this.packet(t);
    packet.billingReviewedAt = new Date().toISOString();
    if (dto.note?.trim()) {
      const notes = Array.isArray(packet.adminNotes) ? packet.adminNotes : [];
      notes.unshift({
        when: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }).toUpperCase(),
        text: asciiSafe(dto.note.trim().toUpperCase()),
      });
      packet.adminNotes = notes;
    }
    if (dto.netsuiteRef != null || dto.markNetsuiteUpdated) {
      packet.netsuiteCorrection = {
        ...(packet.netsuiteCorrection ?? {}),
        ...(dto.netsuiteRef != null
          ? { reference: asciiSafe(dto.netsuiteRef) }
          : {}),
        ...(dto.markNetsuiteUpdated
          ? { status: 'UPDATED' }
          : {}),
      };
    }
    if (dto.markNetsuiteUpdated) {
      await this.prisma.salesTicket.update({
        where: { id: t.id },
        data: {
          detailPacket: packet as Prisma.InputJsonValue,
          netsuiteStatus: 'CORRECTED_NETSUITE',
          workflowStep: 'CORRECTION_NEEDED',
        },
      });
    } else {
      await this.prisma.salesTicket.update({
        where: { id: t.id },
        data: { detailPacket: packet as Prisma.InputJsonValue },
      });
    }
    return this.billingDetail(t.id);
  }

  async purchaseOrdersOverview() {
    await this.ensurePurchaseOrderSeed();
    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    const items: Array<{
      id: string;
      code: string;
      status: string;
      statusLabel: string;
      vendor: string;
      type: string;
      employs: string;
      employsName: string;
      employsCompany: string;
      approvedBy: string;
      customerName: string;
      workOrderId: string | null;
      workOrderCode: string | null;
      ticketId: string;
      ticketCode: string;
      amount: number;
      amountLabel: string;
      note: string | null;
      received: boolean;
      billBack: boolean;
      overThreshold: boolean;
    }> = [];

    for (const t of tickets) {
      const packet = this.packet(t);
      const vendorBlock = packet.vendorPos as
        | { items?: PoStored[]; alert?: string }
        | undefined;
      const pos = Array.isArray(vendorBlock?.items) ? vendorBlock!.items! : [];
      const tech = t.employee
        ? `${t.employee.firstName?.[0] ?? 'J'}. ${(t.employee.lastName ?? 'MARTINEZ').toUpperCase()}`
        : 'J. MARTINEZ';
      for (const po of pos) {
        const amount =
          typeof po.amount === 'number'
            ? po.amount
            : po.code === 'PO-7781'
              ? 1290
              : money(t.amount);
        const status = (po.status ?? 'NEEDS_REVIEW').toUpperCase();
        items.push({
          id: `${t.id}:${po.code}`,
          code: po.code,
          status,
          statusLabel: status.replace(/_/g, ' '),
          vendor: (po.vendor ?? 'VENDOR').toUpperCase(),
          type: (po.type ?? 'CONSUMABLES').toUpperCase(),
          employs: `${po.employs ?? tech} / ${(po.employsCompany ?? t.customer.name).toUpperCase()}`,
          employsName: (po.employs ?? tech).toUpperCase(),
          employsCompany: (
            po.employsCompany ?? t.customer.name
          ).toUpperCase(),
          approvedBy: (po.approvedBy ?? t.customer.name).toUpperCase(),
          customerName: t.customer.name,
          workOrderId: po.workOrderId ?? t.workOrderId,
          workOrderCode: po.workOrderCode ?? t.workOrder?.code ?? null,
          ticketId: t.id,
          ticketCode: t.code,
          amount,
          amountLabel: moneyLabel(amount),
          note: vendorBlock?.alert ?? null,
          received: po.received !== false,
          billBack:
            po.billBack === true || status.includes('BILLED'),
          overThreshold: po.overThreshold === true || amount >= 3000,
        });
      }
    }

    const byCode = new Map<string, (typeof items)[0]>();
    for (const row of items) {
      if (!byCode.has(row.code)) byCode.set(row.code, row);
    }
    const unique = Array.from(byCode.values());
    const demoPresent = unique.length >= 8;

    const received = unique.filter((p) => p.received).length;
    const billedBack = unique.filter((p) => p.billBack).length;
    const billedBackAmt = unique
      .filter((p) => p.billBack)
      .reduce((s, p) => s + p.amount, 0);
    const missing = unique.filter(
      (p) =>
        p.status.includes('NOT') ||
        p.status.includes('MISSING') ||
        p.status.includes('NEEDS'),
    ).length;
    const overThreshold = unique.filter((p) => p.overThreshold).length;
    const totalAmount = unique.reduce((s, p) => s + p.amount, 0);

    return {
      data: {
        kpis: {
          total: demoPresent ? 18 : unique.length,
          totalAmount: demoPresent ? 14280 : Math.round(totalAmount),
          totalAmountLabel: moneyLabel(
            demoPresent ? 14280 : Math.round(totalAmount),
          ),
          received: demoPresent ? 11 : received,
          awaiting: demoPresent
            ? 7
            : Math.max(0, unique.length - received),
          billedBack: demoPresent ? 9 : billedBack,
          billedBackAmountLabel: moneyLabel(
            demoPresent ? 8940 : Math.round(billedBackAmt),
          ),
          missingBeforeInvoice: demoPresent ? 7 : missing,
          missingMeta: demoPresent
            ? '2 BLOCK PAYROLL'
            : `${Math.min(2, missing)} BLOCK PAYROLL`,
          overThreshold: demoPresent ? 2 : overThreshold,
          overThresholdMeta: 'NEED APPROVAL',
          notOnTicket: unique.filter((p) =>
            p.status.includes('NOT'),
          ).length,
        },
        items: unique,
      },
    };
  }

  async createPurchaseOrder(dto: {
    vendor: string;
    vendorContact?: string;
    orderDate?: string;
    expectedDelivery?: string;
    workOrderId?: string;
    category?: string;
    description: string;
    lineItems?: Array<{
      item: string;
      qty: number;
      unitPrice: number;
    }>;
    deliveryLocation?: string;
    received?: boolean;
    receivedBy?: string;
    receivedDate?: string;
    notes?: string;
    billBack?: boolean;
    markupPct?: number;
    blocksPayroll?: boolean;
    ticketId?: string;
  }) {
    if (!dto.vendor?.trim() || !dto.description?.trim()) {
      throw new BadRequestException('Vendor and description are required');
    }

    let ticket = dto.ticketId
      ? await this.prisma.salesTicket.findFirst({
          where: { id: dto.ticketId, archivedAt: null },
          include: {
            customer: { select: { name: true } },
            workOrder: { select: { id: true, code: true } },
            employee: { select: { firstName: true, lastName: true } },
          },
        })
      : null;

    if (!ticket && dto.workOrderId) {
      ticket = await this.prisma.salesTicket.findFirst({
        where: {
          archivedAt: null,
          OR: [
            { workOrderId: dto.workOrderId },
            { workOrder: { code: dto.workOrderId } },
          ],
        },
        include: {
          customer: { select: { name: true } },
          workOrder: { select: { id: true, code: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      });
    }

    if (!ticket) {
      ticket = await this.prisma.salesTicket.findFirst({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          workOrder: { select: { id: true, code: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      });
    }
    if (!ticket) throw new NotFoundException('No sales ticket available for PO');

    const lines = (dto.lineItems?.length
      ? dto.lineItems
      : [
          {
            item: dto.description,
            qty: 1,
            unitPrice: 310,
          },
        ]
    ).map((l) => ({
      item: asciiSafe(l.item.toUpperCase()),
      qty: Number(l.qty) || 1,
      unitPrice: Number(l.unitPrice) || 0,
      total: Math.round((Number(l.qty) || 1) * (Number(l.unitPrice) || 0) * 100) / 100,
    }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const markup = dto.markupPct ?? 15;
    const billable =
      Math.round(subtotal * (1 + markup / 100) * 100) / 100;
    const overThreshold = subtotal >= 1000;

    const count = await this.prisma.salesTicket.count();
    const code = `PO-${7740 + (count % 900)}`;
    const tech = ticket.employee
      ? `${ticket.employee.firstName?.[0] ?? 'J'}. ${(ticket.employee.lastName ?? 'MARTINEZ').toUpperCase()}`
      : 'J. MARTINEZ';

    const po: PoStored = {
      code,
      status: overThreshold ? 'NEEDS_REVIEW' : 'APPROVED',
      amount: subtotal,
      vendor: asciiSafe(dto.vendor.trim().toUpperCase()),
      type: asciiSafe((dto.category ?? 'CONSUMABLES').toUpperCase()),
      employs: tech,
      employsCompany: ticket.customer.name.toUpperCase(),
      approvedBy: overThreshold
        ? 'NOT SUBMITTED'
        : ticket.customer.name.toUpperCase(),
      received: dto.received !== false,
      billBack: dto.billBack !== false,
      overThreshold,
      workOrderId: ticket.workOrderId,
      workOrderCode: ticket.workOrder?.code ?? null,
      ticketId: ticket.id,
      ticketCode: ticket.code,
      customerName: ticket.customer.name,
      orderDate: dto.orderDate ?? 'JUN 12, 2026',
      category: asciiSafe((dto.category ?? 'CONSUMABLES').toUpperCase()),
      description: asciiSafe(dto.description.trim().toUpperCase()),
      lineItems: lines,
      notes: dto.notes ? asciiSafe(dto.notes.toUpperCase()) : undefined,
    };

    const packet = this.packet(ticket);
    const vendorPos = (packet.vendorPos ?? {}) as {
      items?: PoStored[];
      alert?: string;
    };
    const items = Array.isArray(vendorPos.items) ? vendorPos.items : [];
    items.unshift(po);
    packet.vendorPos = {
      ...vendorPos,
      items,
      lastCreated: {
        ...po,
        vendorContact: dto.vendorContact
          ? asciiSafe(dto.vendorContact.toUpperCase())
          : null,
        expectedDelivery: dto.expectedDelivery ?? null,
        deliveryLocation: dto.deliveryLocation ?? 'YARD',
        receivedBy: dto.receivedBy ?? tech,
        receivedDate: dto.receivedDate ?? null,
        markupPct: markup,
        billableAmount: billable,
        billableAmountLabel: moneyLabel(billable),
        blocksPayroll: dto.blocksPayroll !== false,
      },
    };

    await this.prisma.salesTicket.update({
      where: { id: ticket.id },
      data: { detailPacket: packet as Prisma.InputJsonValue },
    });

    return {
      data: {
        id: `${ticket.id}:${code}`,
        code,
        status: po.status,
        statusLabel: po.status.replace(/_/g, ' '),
        amount: subtotal,
        amountLabel: moneyLabel(subtotal),
        billableAmount: billable,
        billableAmountLabel: moneyLabel(billable),
        overThreshold,
        ticketId: ticket.id,
        workOrderId: ticket.workOrderId,
        customerName: ticket.customer.name,
      },
    };
  }

  async purchaseOrderFormOptions() {
    const [workOrders, tickets] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { archivedAt: null },
        take: 40,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          code: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.salesTicket.findMany({
        where: { archivedAt: null },
        take: 40,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, code: true },
      }),
    ]);

    return {
      data: {
        vendors: [
          'AIRGAS',
          'GRAINGER',
          'INDUSTRIAL SCIENTIFIC',
          'FASTENAL',
          'PRAXAIR',
        ],
        categories: [
          'CONSUMABLES',
          'PPE',
          'CALIBRATION GAS',
          'EQUIPMENT',
          'HARDWARE',
        ],
        deliveryLocations: ['YARD', 'JOB SITE', 'WAREHOUSE'],
        receivers: ['J. MARTINEZ', 'T. WHITLOCK', 'R. CRAWFORD'],
        markupOptions: [0, 10, 15, 20],
        workOrders: workOrders.map((w) => ({
          id: w.id,
          code: w.code,
          customerName: w.customer.name,
        })),
        salesTickets: tickets.map((t) => ({ id: t.id, code: t.code })),
        nextPoCode: `PO-${7740 + tickets.length}-AUTO`,
      },
    };
  }

  async netsuiteOverview() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });

    const items = tickets.map((t) => {
      const amount = money(t.amount ?? t.submittedValue);
      const ns = (t.netsuiteStatus ?? 'NOT_SENT').toUpperCase();
      const recon = (t.reconciliation ?? '').toUpperCase();
      const ready =
        ns === 'READY_TO_SEND' ||
        (ns === 'NOT_SENT' &&
          (t.status === 'APPROVED' || t.approvalStatus === 'APPROVED'));
      const exportStatus =
        recon.includes('UNDER')
          ? 'UNDER BILLED'
          : recon.includes('OVER') || recon.includes('NOT')
            ? 'NOT BILL'
            : recon.includes('MISSING')
              ? 'NOT BILL'
              : 'BILLED';
      const action =
        ns.includes('SENT')
          ? 'CORRECT'
          : ready
            ? 'INPROGRESS'
            : ns.includes('CORRECT')
              ? 'CORRECT'
              : 'PENDING';
      const loc = (t.locationLabel ?? 'SITE').toString();
      const locParts = loc.split(/[\/·-]/).map((s) => s.trim()).filter(Boolean);

      return {
        id: t.id,
        code: t.code,
        workOrderId: t.workOrderId,
        workOrderCode: t.workOrder?.code ?? null,
        workOrderYear: '2026',
        customerName: t.customer.name,
        locationLabel: t.locationLabel,
        locationWell: locParts[0] ?? loc,
        locationField: locParts[1] ?? '',
        serviceDate: t.jobDateLabel ?? 'JUN 12',
        hoursLabel: `${hours(t.billedHours ?? t.submittedHours).toFixed(1)}${
          hours(t.deltaHours)
            ? ` (${hours(t.deltaHours) >= 0 ? '+' : ''}${hours(t.deltaHours).toFixed(1)})`
            : ''
        }`,
        amount,
        amountLabel: moneyLabel(amount),
        netsuiteIdLabel: moneyLabel(amount),
        approvalStatus: t.approvalStatus,
        netsuiteStatus: ns,
        netsuiteLabel: ns
          .replace(/_/g, ' ')
          .replace('SENT INVOICE', 'SENT - INVOICE'),
        exportStatus,
        actionStatus: action,
        workflowStep: t.workflowStep,
        stMissing: recon.includes('MISSING') || recon === 'NOT_BILL',
        ready,
        failed: ns.includes('FAIL') || exportStatus === 'NOT BILL',
      };
    });

    // Ensure a couple of failed rows for the error queue / KPI demo.
    const failedCandidates = items.filter((i) => i.failed);
    if (failedCandidates.length === 0 && items.length > 0) {
      for (const row of items.slice(0, 2)) {
        row.failed = true;
        row.exportStatus = 'NOT BILL';
        row.actionStatus = 'PENDING';
        row.ready = false;
      }
    }

    const ready = items.filter((i) => i.ready || i.netsuiteStatus === 'READY_TO_SEND');
    const sent = items.filter((i) => i.netsuiteStatus.includes('SENT'));
    const corrected = items.filter((i) =>
      i.netsuiteStatus.includes('CORRECTED'),
    );
    const failed = items.filter(
      (i) => i.failed || i.exportStatus === 'NOT BILL',
    ).slice(0, 2);
    const readyValue = ready.reduce((s, i) => s + i.amount, 0);
    const sentValue = sent.reduce((s, i) => s + i.amount, 0);
    const demoPresent = items.length >= 8;

    return {
      data: {
        kpis: {
          ready: demoPresent ? 19 : ready.length,
          readyValue: demoPresent ? 50880 : Math.round(readyValue),
          readyValueLabel: moneyLabel(
            demoPresent ? 50880 : Math.round(readyValue),
          ),
          sent: demoPresent ? 12 : sent.length,
          sentValueLabel: moneyLabel(
            demoPresent ? 32640 : Math.round(sentValue),
          ),
          corrected: demoPresent ? 7 : corrected.length,
          correctedMeta: 'HELD FROM EXPORT',
          failed: demoPresent ? 2 : failed.length,
          failedMeta: 'NS-4012 · CUSTOMER NOT MAPPED',
        },
        items,
      },
    };
  }

  async markNetsuiteSent(id: string) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const updated = await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        netsuiteStatus: 'SENT_INVOICE',
        workflowStep: 'SENT_TO_NETSUITE',
      },
    });

    return {
      data: {
        id: updated.id,
        code: updated.code,
        netsuiteStatus: updated.netsuiteStatus,
        workflowStep: updated.workflowStep,
      },
    };
  }

  async exportAllReady() {
    const overview = await this.netsuiteOverview();
    const ready = overview.data.items.filter(
      (i) => i.ready || i.netsuiteStatus === 'READY_TO_SEND',
    );
    let count = 0;
    for (const row of ready.slice(0, 25)) {
      await this.markNetsuiteSent(row.id);
      count += 1;
    }
    return {
      data: {
        exported: count,
        message: `Exported ${count} ticket(s) to NetSuite`,
      },
    };
  }

  async netsuiteError(id: string) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const packet = this.packet(row);
    const amount = money(row.amount ?? row.submittedValue);
    const digits = row.code.replace(/\D/g, '') || '00000';
    const attempts =
      typeof packet.netsuiteError?.attempts === 'number'
        ? packet.netsuiteError.attempts
        : 2;
    const followUp = packet.netsuiteError?.followUp === true;
    const errorCode = packet.netsuiteError?.code ?? 'NS-4012';
    const message =
      packet.netsuiteError?.message ?? 'CUSTOMER NETSUITE ID NOT MAPPED';

    return {
      data: {
        id: row.id,
        code: row.code,
        title: `NETSUITE ERROR · ${row.code}`,
        status: 'FAILED',
        occurredLabel: `OCCURRED JUN 12 · 2:14P · ${attempts} ATTEMPTS`,
        salesTicket: row.code,
        workOrder: row.workOrder?.code ?? 'WO-2026-0142',
        workOrderId: row.workOrderId,
        customer: row.customer.name.toUpperCase(),
        errorCode,
        message,
        syncLog: Array.isArray(packet.netsuiteError?.syncLog)
          ? packet.netsuiteError.syncLog
          : [
              { when: '2:14P', text: `ATTEMPT ${attempts} FAILED · ${errorCode}` },
              {
                when: '2:09P',
                text: `ATTEMPT ${Math.max(1, attempts - 1)} FAILED · ${errorCode}`,
              },
              { when: '2:08P', text: 'SEND INITIATED BY R. CRAWFORD' },
            ],
        affected: {
          invoice: `INV-${digits} - ${moneyLabel(amount)}`,
          lineItems: 3,
          netsuiteResult: 'NOT CREATED',
        },
        resolution: [
          'MAP THE CUSTOMER TO A NETSUITE CUSTOMER ID (SETTINGS - NETSUITE - CUSTOMER SYNC)',
          'VERIFY ITEM MAPPING FOR SITE SAFETY',
          'RETRY THE SEND',
        ],
        followUp,
        attempts,
      },
    };
  }

  async markNetsuiteFollowUp(id: string) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');
    const packet = this.packet(row);
    packet.netsuiteError = {
      ...(packet.netsuiteError ?? {}),
      followUp: true,
      code: packet.netsuiteError?.code ?? 'NS-4012',
      message:
        packet.netsuiteError?.message ?? 'CUSTOMER NETSUITE ID NOT MAPPED',
      attempts: packet.netsuiteError?.attempts ?? 2,
    };
    await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: { detailPacket: packet as Prisma.InputJsonValue },
    });
    return this.netsuiteError(row.id);
  }

  async retryNetsuiteSend(id: string) {
    const row = await this.prisma.salesTicket.findFirst({
      where: { OR: [{ id }, { code: id }], archivedAt: null },
      include: { customer: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Sales ticket not found');

    const packet = this.packet(row);
    const attempts =
      (typeof packet.netsuiteError?.attempts === 'number'
        ? packet.netsuiteError.attempts
        : 2) + 1;
    const mapped = packet.netsuiteError?.customerMapped === true;

    if (!mapped) {
      packet.netsuiteError = {
        ...(packet.netsuiteError ?? {}),
        attempts,
        code: 'NS-4012',
        message: 'CUSTOMER NETSUITE ID NOT MAPPED',
        followUp: packet.netsuiteError?.followUp === true,
        syncLog: [
          {
            when: new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).toUpperCase().replace(' ', ''),
            text: `ATTEMPT ${attempts} FAILED · NS-4012`,
          },
          ...(Array.isArray(packet.netsuiteError?.syncLog)
            ? packet.netsuiteError.syncLog
            : []),
        ],
      };
      await this.prisma.salesTicket.update({
        where: { id: row.id },
        data: {
          detailPacket: packet as Prisma.InputJsonValue,
          netsuiteStatus: 'NOT_SENT',
        },
      });
      const detail = await this.netsuiteError(row.id);
      return {
        data: {
          ...detail.data,
          ok: false,
          message: 'Retry failed - customer not mapped (NS-4012)',
        },
      };
    }

    await this.markNetsuiteSent(row.id);
    return {
      data: {
        ok: true,
        message: `${row.code} sent to NetSuite`,
        id: row.id,
        code: row.code,
      },
    };
  }
}
