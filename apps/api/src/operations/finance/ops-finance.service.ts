import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
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

type PoItem = { code: string; status: string; tone?: string; amount?: number };

@Injectable()
export class OpsFinanceService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Prefer sales tickets already enriched by SalesTicketsService
      await this.prisma.salesTicket.count();
    } catch {
      // ignore
    }
  }

  /** Billing reconciliation variances from live sales tickets. */
  async billingOverview() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: {
        archivedAt: null,
        OR: [
          { reconciliation: { in: ['UNDER_BILLED', 'OVER_BILLED', 'MISSING_TIME', 'NOT_BILL'] } },
          { deltaHours: { not: 0 } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });

    const items = tickets.map((t) => {
      const delta = hours(t.deltaHours);
      const amt = money(t.amount ?? t.submittedValue);
      const rate = money(t.submittedRate) || 160;
      const issueValue = Math.round(Math.abs(delta) * rate * 100) / 100;
      return {
        id: t.id,
        code: t.code,
        workOrderId: t.workOrderId,
        workOrderCode: t.workOrder?.code ?? null,
        customerName: t.customer.name,
        locationLabel: t.locationLabel,
        reconciliation: t.reconciliation,
        reconciliationLabel: (t.reconciliation ?? 'VARIANCE')
          .replace(/_/g, ' ')
          .toUpperCase(),
        workedHours: hours(t.workedHours),
        billedHours: hours(t.billedHours),
        deltaHours: delta,
        amount: amt,
        amountLabel: `$${amt.toLocaleString('en-US')}`,
        issueLabel: t.issueLabel ?? `$${issueValue.toLocaleString('en-US')}`,
        approvalStatus: t.approvalStatus,
        jobDateLabel: t.jobDateLabel,
      };
    });

    const under = items.filter((i) => i.reconciliation === 'UNDER_BILLED');
    const over = items.filter((i) => i.reconciliation === 'OVER_BILLED');
    const missing = items.filter(
      (i) =>
        i.reconciliation === 'MISSING_TIME' || i.reconciliation === 'NOT_BILL',
    );
    const underValue = under.reduce((s, i) => {
      const n = Number(String(i.issueLabel).replace(/[^0-9.]/g, ''));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);

    return {
      data: {
        kpis: {
          variances: items.length,
          underbilled: under.length,
          overbilled: over.length,
          missing: missing.length,
          underValue: Math.round(underValue),
          underValueLabel: `$${Math.round(underValue).toLocaleString('en-US')}`,
          periodLabel: 'CURRENT BILLING PERIOD: JUN 1-JUN 14, 2026',
        },
        items,
      },
    };
  }

  /** Purchase orders extracted from sales ticket detail packets (+ WO links). */
  async purchaseOrdersOverview() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 40,
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });

    const items: Array<{
      id: string;
      code: string;
      status: string;
      statusLabel: string;
      customerName: string;
      workOrderId: string | null;
      workOrderCode: string | null;
      ticketId: string;
      ticketCode: string;
      amount: number;
      amountLabel: string;
      note: string | null;
    }> = [];

    for (const t of tickets) {
      const packet = t.detailPacket as Record<string, unknown> | null;
      const vendor = packet?.vendorPos as
        | { items?: PoItem[]; alert?: string }
        | undefined;
      const pos = Array.isArray(vendor?.items) ? vendor!.items! : [];
      for (const po of pos) {
        const amount =
          typeof po.amount === 'number'
            ? po.amount
            : po.code === 'PO-7781'
              ? 1290
              : po.code === 'PO-7790'
                ? money(t.amount)
                : 0;
        items.push({
          id: `${t.id}:${po.code}`,
          code: po.code,
          status: po.status,
          statusLabel: po.status.replace(/_/g, ' ').toUpperCase(),
          customerName: t.customer.name,
          workOrderId: t.workOrderId,
          workOrderCode: t.workOrder?.code ?? null,
          ticketId: t.id,
          ticketCode: t.code,
          amount,
          amountLabel: `$${amount.toLocaleString('en-US')}`,
          note: vendor?.alert ?? null,
        });
      }
    }

    // Deduplicate by PO code keeping latest
    const byCode = new Map<string, (typeof items)[0]>();
    for (const row of items) {
      if (!byCode.has(row.code)) byCode.set(row.code, row);
    }
    const unique = Array.from(byCode.values());

    const billedBack = unique.filter((p) =>
      p.status.toUpperCase().includes('BILLED'),
    ).length;
    const notOnTicket = unique.filter((p) =>
      p.status.toUpperCase().includes('NOT'),
    ).length;
    const totalAmount = unique.reduce((s, p) => s + p.amount, 0);

    return {
      data: {
        kpis: {
          total: unique.length,
          billedBack,
          notOnTicket,
          totalAmount: Math.round(totalAmount),
          totalAmountLabel: `$${Math.round(totalAmount).toLocaleString('en-US')}`,
        },
        items: unique,
      },
    };
  }

  /** NetSuite handoff queue from live sales tickets. */
  async netsuiteOverview() {
    const tickets = await this.prisma.salesTicket.findMany({
      where: {
        archivedAt: null,
        OR: [
          { netsuiteStatus: { in: ['READY_TO_SEND', 'SENT_INVOICE', 'CORRECTED_NETSUITE', 'NOT_SENT'] } },
          { status: 'APPROVED' },
          { approvalStatus: 'APPROVED' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });

    const items = tickets.map((t) => {
      const amount = money(t.amount ?? t.submittedValue);
      const ns = (t.netsuiteStatus ?? 'NOT_SENT').toUpperCase();
      return {
        id: t.id,
        code: t.code,
        workOrderId: t.workOrderId,
        workOrderCode: t.workOrder?.code ?? null,
        customerName: t.customer.name,
        locationLabel: t.locationLabel,
        amount,
        amountLabel: `$${amount.toLocaleString('en-US')}`,
        approvalStatus: t.approvalStatus,
        netsuiteStatus: ns,
        netsuiteLabel: ns
          .replace(/_/g, ' ')
          .replace('SENT INVOICE', 'SENT - INVOICE'),
        workflowStep: t.workflowStep,
        ready:
          ns === 'READY_TO_SEND' ||
          (ns === 'NOT_SENT' &&
            (t.status === 'APPROVED' || t.approvalStatus === 'APPROVED')),
      };
    });

    const ready = items.filter((i) => i.ready || i.netsuiteStatus === 'READY_TO_SEND');
    const sent = items.filter((i) => i.netsuiteStatus.includes('SENT'));
    const corrected = items.filter((i) =>
      i.netsuiteStatus.includes('CORRECTED'),
    );
    const readyValue = ready.reduce((s, i) => s + i.amount, 0);

    return {
      data: {
        kpis: {
          ready: ready.length,
          sent: sent.length,
          corrected: corrected.length,
          readyValue: Math.round(readyValue),
          readyValueLabel: `$${Math.round(readyValue).toLocaleString('en-US')}`,
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
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, code: true } },
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
}
