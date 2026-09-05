"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, type CrmEodReport } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">{label}</p>
      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">{value}</p>
    </div>
  );
}

function userLabel(rep?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!rep) return "—";
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ").trim() || rep.email || "—";
}

export function EodReportDetailPage({ reportId }: { reportId: string }) {
  const [detail, setDetail] = React.useState<CrmEodReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getEodReport(reportId);
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await crmApi.exportEodReports({
        ids: reportId,
        format: "csv",
      });
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading report" />
      </div>
    );
  }
  if (!detail) return <div className="bg-shell p-6 text-sm text-[#959597]">Report not found</div>;

  const meta = `${userLabel(detail.rep)} · ${detail.reportDate.slice(0, 10)} · ${detail.submittedAt ? new Date(detail.submittedAt).toLocaleTimeString() : "—"}`;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <h1 className="font-sans text-[18px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[24px]">
            EOD Report · {detail.reportCode}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <DashboardBadge variant="success" pill>{detail.status}</DashboardBadge>
            <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">{meta}</span>
          </div>
        </div>
        <DashboardToolbarButton disabled={exporting} onClick={() => void handleExport()}>
          Export
        </DashboardToolbarButton>
      </div>

      <DashboardPanel className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Activities" value={String(detail.activitiesCount ?? 0)} />
          <Metric label="Calls" value={String(detail.callsCount ?? 0)} />
          <Metric label="Visits" value={String(detail.visitsCount ?? 0)} />
          <Metric label="Meetings" value={String(detail.meetingsCount ?? 0)} />
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-4 sm:p-5 space-y-3">
        <h2 className="font-sans text-[11px] uppercase text-[#959597]">Notes</h2>
        <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{detail.notes || detail.nextDayPlan || "—"}</p>
        <p className="font-sans text-[11px] uppercase text-[#959597]">Quotes: {detail.quotesNote || detail.quotesSent || "—"}</p>
        <p className="font-sans text-[11px] uppercase text-[#959597]">Pipeline: {detail.pipelineNote || detail.pipelineValue || "—"}</p>
      </DashboardPanel>
    </div>
  );
}
