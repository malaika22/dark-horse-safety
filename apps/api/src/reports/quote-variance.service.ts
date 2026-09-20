import { Injectable } from '@nestjs/common';
import { CrmRecordStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { QuoteVarianceQueryDto } from './dto/quote-variance.dto';

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function moneyLabel(n: number) {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (n < 0) return `-$${abs}`;
  if (n > 0) return `$${abs}`;
  return `$${abs}`;
}

function moneySigned(n: number) {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (n > 0) return `+$${abs}`;
  if (n < 0) return `-$${abs}`;
  return `$${abs}`;
}

function pctLabel(n: number) {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0) return `+${abs}%`;
  if (n < 0) return `-${abs}%`;
  return `${abs}%`;
}

function shortName(first?: string | null, last?: string | null, email?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f[0]!.toUpperCase()}. ${l.toUpperCase()}`;
  if (l) return l.toUpperCase();
  if (f) return f.toUpperCase();
  return (email?.split('@')[0] ?? '—').toUpperCase();
}

function parseDay(iso?: string | null) {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso.trim().slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function quarterOf(d: Date) {
  return Math.floor(d.getUTCMonth() / 3) + 1;
}

function bucketFor(pct: number): string {
  if (pct < -40) return 'lt_neg_40';
  if (pct < -20) return 'neg_40_20';
  if (pct < 0) return 'neg_20_0';
  if (pct <= 10) return 'pos_0_10';
  return 'gt_pos_10';
}

const BUCKETS = [
  { key: 'lt_neg_40', label: '< -40%', tone: 'neg' as const },
  { key: 'neg_40_20', label: '-40 TO -20%', tone: 'neg' as const },
  { key: 'neg_20_0', label: '-20 TO 0%', tone: 'neg' as const },
  { key: 'pos_0_10', label: '0 TO +10%', tone: 'pos' as const },
  { key: 'gt_pos_10', label: '> +10%', tone: 'pos' as const },
];

@Injectable()
export class QuoteVarianceService {
  constructor(private readonly prisma: PrismaService) {}

  async options() {
    const [customers, reps] = await Promise.all([
      this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        take: 200,
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { quotesOwned: { some: { archivedAt: null } } },
            { role: { in: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] } },
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    return {
      data: {
        customers: [
          { value: '', label: 'Any' },
          ...customers.map((c) => ({
            value: c.id,
            label: c.name.toUpperCase(),
          })),
        ],
        reps: [
          { value: '', label: 'Any' },
          ...reps.map((u) => ({
            value: u.id,
            label: shortName(u.firstName, u.lastName, u.email),
          })),
        ],
        varianceThresholds: [
          { value: '', label: 'Any' },
          { value: '5', label: '5%+' },
          { value: '10', label: '10%+' },
          { value: '20', label: '20%+' },
          { value: '40', label: '40%+' },
        ],
      },
    };
  }

  async report(query: QuoteVarianceQueryDto, user: AuthUser) {
    const now = new Date();
    const from = parseDay(query.from);
    const to = parseDay(query.to);

    const where: Prisma.QuoteWhereInput = {
      archivedAt: null,
      OR: [
        { convertedAt: { not: null } },
        { status: { in: [CrmRecordStatus.CONVERTED, CrmRecordStatus.WON] } },
        { workOrders: { some: { archivedAt: null } } },
      ],
    };

    if (query.customerId?.trim()) where.customerId = query.customerId.trim();
    if (query.repId?.trim()) where.ownerId = query.repId.trim();
    if (from || to) {
      where.convertedAt = {};
      if (from) where.convertedAt.gte = from;
      if (to) {
        const end = new Date(to);
        end.setUTCHours(23, 59, 59, 999);
        where.convertedAt.lte = end;
      }
    }

    const quotes = await this.prisma.quote.findMany({
      where,
      orderBy: [{ convertedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        customer: { select: { id: true, name: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        workOrders: {
          where: { archivedAt: null },
          select: {
            id: true,
            amount: true,
            salesTickets: {
              where: { archivedAt: null },
              select: {
                submittedValue: true,
                adjustedValue: true,
              },
            },
          },
        },
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const payCycle = await this.prisma.payCycle.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    type Row = {
      id: string;
      customerId: string;
      customerName: string;
      quoteNumber: string;
      quoted: number;
      invoiced: number;
      varianceAmount: number;
      variancePct: number;
      reason: string;
      repId: string | null;
      repName: string;
    };

    const rows: Row[] = quotes.map((q) => {
      const quoted = money(q.amount);
      let invoiced = 0;
      for (const wo of q.workOrders) {
        const ticketSum = wo.salesTickets.reduce(
          (s, t) => s + money(t.adjustedValue ?? t.submittedValue),
          0,
        );
        if (ticketSum > 0) invoiced += ticketSum;
        else invoiced += money(wo.amount);
      }
      if (invoiced <= 0) {
        invoiced = quoted;
      }

      const varianceAmount = Math.round((invoiced - quoted) * 100) / 100;
      const variancePct =
        quoted > 0
          ? Math.round((varianceAmount / quoted) * 1000) / 10
          : 0;
      const reason =
        q.conversionOverrideReason?.trim().toUpperCase() || 'NOT SPECIFIED';

      return {
        id: q.id,
        customerId: q.customerId,
        customerName: q.customer.name,
        quoteNumber: q.quoteNumber,
        quoted,
        invoiced,
        varianceAmount,
        variancePct,
        reason,
        repId: q.ownerId,
        repName: shortName(
          q.owner?.firstName,
          q.owner?.lastName,
          q.owner?.email,
        ),
      };
    });

    const threshold =
      query.varianceThreshold != null && Number.isFinite(query.varianceThreshold)
        ? Math.abs(Number(query.varianceThreshold))
        : 0;

    const filtered =
      threshold > 0
        ? rows.filter((r) => Math.abs(r.variancePct) >= threshold)
        : rows;

    const totalQuoted = filtered.reduce((s, r) => s + r.quoted, 0);
    const totalInvoiced = filtered.reduce((s, r) => s + r.invoiced, 0);
    const totalVariance = Math.round((totalInvoiced - totalQuoted) * 100) / 100;
    const avgVariancePct =
      totalQuoted > 0
        ? Math.round((totalVariance / totalQuoted) * 1000) / 10
        : 0;
    const underBilled = filtered.filter((r) => r.varianceAmount < 0).length;

    const counts: Record<string, number> = Object.fromEntries(
      BUCKETS.map((b) => [b.key, 0]),
    );
    for (const r of filtered) {
      counts[bucketFor(r.variancePct)] =
        (counts[bucketFor(r.variancePct)] ?? 0) + 1;
    }
    const maxCount = Math.max(1, ...Object.values(counts));

    const distribution = BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: counts[b.key] ?? 0,
      tone: b.tone,
      heightPct: Math.round(((counts[b.key] ?? 0) / maxCount) * 100),
    }));

    const insight =
      filtered.length === 0
        ? 'No converted quotes match these filters.'
        : underBilled > 0
          ? `${underBilled} of ${filtered.length} converted quotes were invoiced below quote — a systematic under-billing pattern, not isolated exceptions.`
          : `${filtered.length} converted quotes reviewed with no under-billing pattern detected.`;

    const year = now.getUTCFullYear();
    const qtr = quarterOf(now);
    const reportId = `QV-${year}-Q${qtr}`;

    const payCycleLabel = payCycle
      ? `${payCycle.startDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()} – ${payCycle.endDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()}`
      : from && to
        ? `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}`
        : `Q${qtr} ${year}`;

    const generatedBy = actor
      ? shortName(actor.firstName, actor.lastName, actor.email)
      : shortName(null, null, user.email);

    const generatedAtLabel = now
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Chicago',
      })
      .toUpperCase();

    return {
      data: {
        meta: {
          title: 'Quote Variance Report',
          subtitle:
            'Comparing what was quoted against what was invoiced for converted quotes this quarter.',
          payCycleLabel,
          generatedAtLabel,
          generatedBy,
          reportId,
          brand: 'Dark Horse Display',
        },
        kpis: {
          quotesConverted: filtered.length,
          quotesConvertedMeta: 'Quotes converted this quarter',
          totalQuoted: Math.round(totalQuoted),
          totalQuotedLabel: moneyLabel(Math.round(totalQuoted)),
          totalQuotedMeta: 'Total quoted',
          totalInvoiced: Math.round(totalInvoiced),
          totalInvoicedLabel: moneyLabel(Math.round(totalInvoiced)),
          totalInvoicedMeta: 'Total invoiced',
          avgVariancePct,
          avgVarianceLabel: pctLabel(avgVariancePct),
          avgVarianceMeta: 'Average variance',
          underBilledCount: underBilled,
          alertLabel:
            underBilled > 0
              ? `${underBilled} under-billed · review needed`
              : 'No under-billed quotes',
        },
        distribution,
        insight,
        rows: filtered.map((r) => ({
          id: r.id,
          customerName: r.customerName,
          quoteNumber: r.quoteNumber,
          quoted: r.quoted,
          quotedLabel: moneyLabel(Math.round(r.quoted)),
          invoiced: r.invoiced,
          invoicedLabel: moneyLabel(Math.round(r.invoiced)),
          varianceAmount: r.varianceAmount,
          varianceAmountLabel: moneySigned(Math.round(r.varianceAmount)),
          variancePct: r.variancePct,
          variancePctLabel: pctLabel(r.variancePct),
          tone: r.varianceAmount < 0 ? 'neg' : r.varianceAmount > 0 ? 'pos' : 'neutral',
          reason: r.reason,
          repName: r.repName,
        })),
        totals: {
          quoteCount: filtered.length,
          quoteCountLabel: `${filtered.length} quotes`,
          quotedLabel: moneyLabel(Math.round(totalQuoted)),
          invoicedLabel: moneyLabel(Math.round(totalInvoiced)),
          varianceAmountLabel: moneySigned(Math.round(totalVariance)),
          variancePctLabel: pctLabel(avgVariancePct),
          tone: totalVariance < 0 ? 'neg' : totalVariance > 0 ? 'pos' : 'neutral',
        },
        footerNote:
          'Variance $ = Invoiced − Quoted. Negative means under-billed relative to the quote. Reason set on the invoice · Report ID ' +
          reportId,
        approvedBy: generatedBy,
      },
    };
  }
}
