import { Injectable } from '@nestjs/common';
import { Prisma, SalesTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExportService } from '../common/services/export.service';
import { RateAdjustmentsQueryDto } from './dto/rate-adjustments.dto';

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function moneySigned(n: number) {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (n > 0) return `+$${abs}`;
  if (n < 0) return `-$${abs}`;
  return `$${abs}`;
}

function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f[0]!.toUpperCase()}. ${l.toUpperCase()}`;
  return (l || f || '—').toUpperCase();
}

function parseDay(iso?: string | null) {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso.trim().slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function reasonTone(reason: string, delta: number): 'solid' | 'outline' {
  const r = reason.toUpperCase();
  if (
    r.includes('PREMIUM') ||
    r.includes('GOODWILL') ||
    r.includes('LATE') ||
    r.includes('CONFINED')
  ) {
    return 'solid';
  }
  if (delta < 0 || r.includes('REDUCED') || r.includes('WEATHER') || r.includes('STANDBY')) {
    return 'outline';
  }
  return delta >= 0 ? 'solid' : 'outline';
}

function adjusterTone(name: string): 'green' | 'gold' | 'red' {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 3;
  return hash === 0 ? 'green' : hash === 1 ? 'gold' : 'red';
}

const SAMPLE_REASONS = [
  'CONFINED SPACE PREMIUM',
  'SCOPE REDUCED',
  'WEATHER STANDBY',
  'GOODWILL - LATE ARRIVAL',
  'RATE ADJUSTED',
  'ADDITIONAL WORK',
];

@Injectable()
export class RateAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  /** Seed a few adjustments from live tickets when none exist yet. */
  async ensureAdjustments() {
    const existing = await this.prisma.salesTicket.count({
      where: { archivedAt: null, rateAdjustedAt: { not: null } },
    });
    if (existing > 0) return { created: 0 };

    const tickets = await this.prisma.salesTicket.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    if (tickets.length === 0) return { created: 0 };

    const adjusters = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    let created = 0;
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i]!;
      const submitted = money(t.submittedRate);
      const hours = money(t.submittedHours);
      const factor = i % 3 === 0 ? 0.95 : 1.1 + (i % 4) * 0.05;
      const adjustedRate = Math.round(submitted * factor * 100) / 100;
      const adjustedValue = Math.round(adjustedRate * hours * 100) / 100;
      const submittedValue = money(t.submittedValue);
      const rateDifference =
        Math.round((adjustedValue - submittedValue) * 100) / 100;
      const actor = adjusters[i % Math.max(1, adjusters.length)];
      const byName = actor
        ? shortName(actor.firstName, actor.lastName)
        : 'ADMIN';

      await this.prisma.salesTicket.update({
        where: { id: t.id },
        data: {
          adjustedRate,
          adjustedValue,
          rateDifference,
          rateAdjustReason: SAMPLE_REASONS[i % SAMPLE_REASONS.length],
          rateAdjustedAt: new Date(Date.now() - i * 36_000_000),
          rateAdjustedById: actor?.id ?? null,
          rateAdjustedByName: byName,
          status: SalesTicketStatus.ADJUSTED,
        },
      });
      created += 1;
    }
    return { created };
  }

  private buildWhere(query: RateAdjustmentsQueryDto): Prisma.SalesTicketWhereInput {
    const where: Prisma.SalesTicketWhereInput = {
      archivedAt: null,
      adjustedRate: { not: null },
    };

    const adjustedAt: Prisma.DateTimeFilter = {};
    const from = parseDay(query.from);
    const to = parseDay(query.to);
    if (from) adjustedAt.gte = from;
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      adjustedAt.lte = end;
    }
    where.rateAdjustedAt =
      Object.keys(adjustedAt).length > 0
        ? adjustedAt
        : { not: null };

    if (query.customerId?.trim()) where.customerId = query.customerId.trim();
    if (query.adjustedById?.trim()) {
      where.rateAdjustedById = query.adjustedById.trim();
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { serviceItem: { contains: q, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        { rateAdjustedByName: { contains: q, mode: 'insensitive' } },
        { rateAdjustReason: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private mapRow(row: {
    id: string;
    code: string;
    submittedRate: Prisma.Decimal;
    adjustedRate: Prisma.Decimal | null;
    submittedHours: Prisma.Decimal;
    rateDifference: Prisma.Decimal | null;
    rateAdjustReason: string | null;
    rateAdjustedAt: Date | null;
    rateAdjustedByName: string | null;
    rateAdjustedById: string | null;
    customer: { id: string; name: string };
    employee: { firstName: string; lastName: string } | null;
  }) {
    const submitted = money(row.submittedRate);
    const adjusted = money(row.adjustedRate);
    const hours = money(row.submittedHours);
    const delta = money(row.rateDifference);
    const reason = (row.rateAdjustReason ?? 'RATE ADJUSTED').toUpperCase();
    const adjustedBy = (row.rateAdjustedByName ?? '—').toUpperCase();
    const customerShort = row.customer.name
      .replace(/\s+(Energy|Well Services|Co\.|LLC|Inc\.?)$/i, '')
      .trim()
      .toUpperCase();

    return {
      id: row.id,
      date: row.rateAdjustedAt?.toISOString() ?? null,
      dateLabel: row.rateAdjustedAt ? formatDate(row.rateAdjustedAt) : '—',
      ticketCode: row.code,
      customerId: row.customer.id,
      customerName: row.customer.name,
      customerShort,
      technician: row.employee
        ? shortName(row.employee.firstName, row.employee.lastName)
        : '—',
      submittedRate: submitted,
      adjustedRate: adjusted,
      rateChangeLabel: `$${submitted.toFixed(0)} → $${adjusted.toFixed(0)} /HR`,
      hours,
      hoursLabel: `${hours.toFixed(1)} H LOGGED`,
      delta,
      deltaLabel: moneySigned(delta),
      deltaTone: delta < 0 ? 'neg' : delta > 0 ? 'pos' : 'neutral',
      reason,
      reasonTone: reasonTone(reason, delta),
      adjustedBy,
      adjustedById: row.rateAdjustedById,
      adjustedByTone: adjusterTone(adjustedBy),
    };
  }

  async options() {
    await this.ensureAdjustments();
    const [customers, adjusters] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          archivedAt: null,
          salesTickets: { some: { rateAdjustedAt: { not: null } } },
        },
        orderBy: { name: 'asc' },
        take: 200,
        select: { id: true, name: true },
      }),
      this.prisma.salesTicket.findMany({
        where: { archivedAt: null, rateAdjustedAt: { not: null } },
        distinct: ['rateAdjustedById'],
        select: {
          rateAdjustedById: true,
          rateAdjustedByName: true,
        },
      }),
    ]);

    const adjusterOpts = adjusters
      .filter((a) => a.rateAdjustedById)
      .map((a) => ({
        value: a.rateAdjustedById!,
        label: (a.rateAdjustedByName ?? '—').toUpperCase(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      data: {
        customers: [
          { value: '', label: 'Any' },
          ...customers.map((c) => ({
            value: c.id,
            label: c.name.toUpperCase(),
          })),
        ],
        adjustedBy: [{ value: '', label: 'Any' }, ...adjusterOpts],
        deltaThresholds: [
          { value: '', label: 'Any' },
          { value: '100', label: '$100+' },
          { value: '250', label: '$250+' },
          { value: '500', label: '$500+' },
          { value: '1000', label: '$1,000+' },
        ],
      },
    };
  }

  async report(query: RateAdjustmentsQueryDto) {
    await this.ensureAdjustments();
    const where = this.buildWhere(query);

    const rowsRaw = await this.prisma.salesTicket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    let rows = rowsRaw.map((r) => this.mapRow(r));

    const threshold =
      query.deltaThreshold != null && Number.isFinite(query.deltaThreshold)
        ? Math.abs(Number(query.deltaThreshold))
        : 0;
    if (threshold > 0) {
      rows = rows.filter((r) => Math.abs(r.delta) >= threshold);
    }

    const sort = query.sort ?? 'date';
    const dir = query.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sort === 'delta') return (a.delta - b.delta) * dir;
      if (sort === 'customer')
        return a.customerShort.localeCompare(b.customerShort) * dir;
      if (sort === 'ticket')
        return a.ticketCode.localeCompare(b.ticketCode) * dir;
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return (ad - bd) * dir;
    });

    const count = rows.length;
    const netImpact = Math.round(rows.reduce((s, r) => s + r.delta, 0) * 100) / 100;
    const largest = rows.reduce<(typeof rows)[0] | null>((best, r) => {
      if (!best) return r;
      return Math.abs(r.delta) > Math.abs(best.delta) ? r : best;
    }, null);

    const byAdjuster = new Map<string, number>();
    for (const r of rows) {
      byAdjuster.set(r.adjustedBy, (byAdjuster.get(r.adjustedBy) ?? 0) + 1);
    }
    let topAdjuster = '—';
    let topCount = 0;
    for (const [name, c] of byAdjuster) {
      if (c > topCount) {
        topCount = c;
        topAdjuster = name;
      }
    }

    return {
      data: {
        kpis: {
          adjustmentsThisCycle: count,
          adjustmentsMeta: 'Logged',
          totalDollarImpact: netImpact,
          totalDollarImpactLabel: moneySigned(netImpact),
          totalDollarImpactMeta: `Net across ${count} ticket${count === 1 ? '' : 's'}`,
          largestAdjustment: largest?.delta ?? 0,
          largestAdjustmentLabel: largest
            ? moneySigned(largest.delta)
            : '$0.00',
          largestAdjustmentMeta: largest?.ticketCode ?? '—',
          mostAdjustmentsBy: topAdjuster,
          mostAdjustmentsMeta: `${topCount} adjustment${topCount === 1 ? '' : 's'}`,
        },
        rows,
        total: count,
      },
    };
  }

  async exportCsv(query: RateAdjustmentsQueryDto) {
    const { data } = await this.report(query);
    const csv = this.exportService.toCsv(data.rows, [
      { key: 'date', header: 'Date', value: (r) => r.dateLabel },
      { key: 'ticket', header: 'Ticket', value: (r) => r.ticketCode },
      { key: 'customer', header: 'Customer', value: (r) => r.customerName },
      { key: 'tech', header: 'Technician', value: (r) => r.technician },
      { key: 'rate', header: 'Rate Change', value: (r) => r.rateChangeLabel },
      { key: 'hours', header: 'Hours', value: (r) => r.hoursLabel },
      { key: 'delta', header: 'Delta $', value: (r) => r.deltaLabel },
      { key: 'reason', header: 'Reason', value: (r) => r.reason },
      { key: 'by', header: 'Adjusted By', value: (r) => r.adjustedBy },
    ]);
    return {
      data: {
        csv,
        filename: `rate-adjustments-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    };
  }
}
