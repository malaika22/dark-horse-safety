import { ApiClient } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";

type ApiData<T> = { data: T };

function q(params?: Record<string, string | number | undefined | null>) {
  return ApiClient.query(
    params as Record<string, string | number | boolean | undefined>,
  );
}

export type QuoteVarianceOption = { value: string; label: string };

export type QuoteVarianceOptions = {
  customers: QuoteVarianceOption[];
  reps: QuoteVarianceOption[];
  varianceThresholds: QuoteVarianceOption[];
};

export type QuoteVarianceRow = {
  id: string;
  customerName: string;
  quoteNumber: string;
  quoted: number;
  quotedLabel: string;
  invoiced: number;
  invoicedLabel: string;
  varianceAmount: number;
  varianceAmountLabel: string;
  variancePct: number;
  variancePctLabel: string;
  tone: "neg" | "pos" | "neutral" | string;
  reason: string;
  repName: string;
};

export type QuoteVarianceReport = {
  meta: {
    title: string;
    subtitle: string;
    payCycleLabel: string;
    generatedAtLabel: string;
    generatedBy: string;
    reportId: string;
    brand: string;
  };
  kpis: {
    quotesConverted: number;
    quotesConvertedMeta: string;
    totalQuoted: number;
    totalQuotedLabel: string;
    totalQuotedMeta: string;
    totalInvoiced: number;
    totalInvoicedLabel: string;
    totalInvoicedMeta: string;
    avgVariancePct: number;
    avgVarianceLabel: string;
    avgVarianceMeta: string;
    underBilledCount: number;
    alertLabel: string;
  };
  distribution: Array<{
    key: string;
    label: string;
    count: number;
    tone: "neg" | "pos" | string;
    heightPct: number;
  }>;
  insight: string;
  rows: QuoteVarianceRow[];
  totals: {
    quoteCount: number;
    quoteCountLabel: string;
    quotedLabel: string;
    invoicedLabel: string;
    varianceAmountLabel: string;
    variancePctLabel: string;
    tone: "neg" | "pos" | "neutral" | string;
  };
  footerNote: string;
  approvedBy: string;
};

export type RateAdjustmentsOption = { value: string; label: string };

export type RateAdjustmentsOptions = {
  customers: RateAdjustmentsOption[];
  adjustedBy: RateAdjustmentsOption[];
  deltaThresholds: RateAdjustmentsOption[];
};

export type RateAdjustmentsRow = {
  id: string;
  date: string | null;
  dateLabel: string;
  ticketCode: string;
  customerId: string;
  customerName: string;
  customerShort: string;
  technician: string;
  submittedRate: number;
  adjustedRate: number;
  rateChangeLabel: string;
  hours: number;
  hoursLabel: string;
  delta: number;
  deltaLabel: string;
  deltaTone: "neg" | "pos" | "neutral" | string;
  reason: string;
  reasonTone: "solid" | "outline" | string;
  adjustedBy: string;
  adjustedById: string | null;
  adjustedByTone: "green" | "gold" | "red" | string;
};

export type RateAdjustmentsReport = {
  kpis: {
    adjustmentsThisCycle: number;
    adjustmentsMeta: string;
    totalDollarImpact: number;
    totalDollarImpactLabel: string;
    totalDollarImpactMeta: string;
    largestAdjustment: number;
    largestAdjustmentLabel: string;
    largestAdjustmentMeta: string;
    mostAdjustmentsBy: string;
    mostAdjustmentsMeta: string;
  };
  rows: RateAdjustmentsRow[];
  total: number;
};

export const reportsApi = {
  quoteVarianceOptions: () =>
    api.get<ApiData<QuoteVarianceOptions>>(`/reports/quote-variance/options`),

  quoteVariance: (params?: {
    customerId?: string;
    repId?: string;
    from?: string;
    to?: string;
    varianceThreshold?: number;
  }) =>
    api.get<ApiData<QuoteVarianceReport>>(
      `/reports/quote-variance${q(params)}`,
    ),

  rateAdjustmentsOptions: () =>
    api.get<ApiData<RateAdjustmentsOptions>>(
      `/reports/rate-adjustments/options`,
    ),

  rateAdjustments: (params?: {
    q?: string;
    customerId?: string;
    adjustedById?: string;
    from?: string;
    to?: string;
    deltaThreshold?: number;
    sort?: "date" | "delta" | "customer" | "ticket";
    direction?: "asc" | "desc";
  }) =>
    api.get<ApiData<RateAdjustmentsReport>>(
      `/reports/rate-adjustments${q(params)}`,
    ),

  rateAdjustmentsExport: (params?: {
    q?: string;
    customerId?: string;
    adjustedById?: string;
    from?: string;
    to?: string;
    deltaThreshold?: number;
    sort?: "date" | "delta" | "customer" | "ticket";
    direction?: "asc" | "desc";
  }) =>
    api.get<ApiData<{ csv: string; filename: string }>>(
      `/reports/rate-adjustments/export${q(params)}`,
    ),
};
