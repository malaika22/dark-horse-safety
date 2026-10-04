"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type FormCorrectionItem,
  type FormCorrectionKpi,
} from "@/lib/operations-api";
import { toastApiError } from "@/lib/toast";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNoOpenRequestsState,
} from "@/features/operations/operations-states";

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "OPEN") return "border border-[#FDFDFF] text-[#FDFDFF] bg-transparent";
  if (s === "RESUBMITTED") return "bg-[#3A1C1C] text-[#E86A6A]";
  if (s === "APPROVED") return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s === "REJECTED") return "border border-[#B84A4A] text-[#E86A6A] bg-transparent";
  if (s === "NEEDS_INFO") return "bg-[#3A3218] text-[#E8C547]";
  return "border border-[#3E3E3E] text-[#959597]";
}

const EMPTY_KPI: FormCorrectionKpi = {
  open: 0,
  openMeta: "",
  resubmitted: 0,
  resubmittedMeta: "",
  approved: 0,
  approvedMeta: "",
  rejected: 0,
  rejectedMeta: "",
  needsInfo: 0,
  needsInfoMeta: "",
};

export function FormCorrectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<FormCorrectionItem[]>([]);
  const [kpi, setKpi] = React.useState<FormCorrectionKpi>(EMPTY_KPI);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.listFormCorrections();
      setItems(res.data.items);
      setKpi(res.data.kpis);
    } catch (err) {
      setError("Couldn't load form corrections.");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  useSetHeaderActions(
    <DashboardToolbarButton
      onClick={() => {
        const blob = new Blob([JSON.stringify(items, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "form-corrections.json";
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export
    </DashboardToolbarButton>,
    [items],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (r) =>
        r.code.toLowerCase().includes(needle) ||
        r.customerName.toLowerCase().includes(needle) ||
        (r.workOrderCode ?? "").toLowerCase().includes(needle) ||
        r.formLabel.toLowerCase().includes(needle) ||
        r.reasonShort.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const columns = React.useMemo<
    DashboardDataTableColumn<FormCorrectionItem>[]
  >(
    () => [
      {
        id: "code",
        header: "Request ID",
        cell: (row) => (
          <Link
            href={`/operations/form-corrections/${row.id}`}
            className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.code}
          </Link>
        ),
      },
      {
        id: "wo",
        header: "Work Ord",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.workOrderCode ?? "—"}
          </span>
        ),
      },
      {
        id: "cust",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "form",
        header: "Form",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.formLabel}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.reasonShort}
            </p>
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              {row.reasonAge}
            </p>
          </div>
        ),
      },
      {
        id: "by",
        header: "Requested By",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.requestedBy}
            </p>
            {row.requestedByStatus ? (
              <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
                {row.requestedByStatus}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
              statusTone(row.status),
            )}
          >
            {row.statusLabel}
          </span>
        ),
      },
      {
        id: "requested",
        header: "Requested",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.requestedLabel}
          </span>
        ),
      },
      {
        id: "original",
        header: "Original",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.originalStatus}
          </span>
        ),
      },
      {
        id: "version",
        header: "Version",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.version}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) return <OpsLoadingListState />;
  if (error)
    return <OpsLoadFailedState description={error} onRetry={load} />;
  if (items.length === 0) {
    return (
      <div className="bg-shell p-3 sm:p-6">
        <OpsNoOpenRequestsState />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow>
          <DashboardStatCell
            title="Open"
            value={String(kpi.open)}
            meta={kpi.openMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Resubmitted"
            value={String(kpi.resubmitted)}
            meta={kpi.resubmittedMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Approved"
            value={String(kpi.approved)}
            meta={kpi.approvedMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Rejected"
            value={String(kpi.rejected)}
            meta={kpi.rejectedMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Needs Info"
            value={String(kpi.needsInfo)}
            meta={kpi.needsInfoMeta}
            icon="edit"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search form corrections"
          className="min-w-[220px] flex-1"
        />
        <DashboardToolbarButton>Filter</DashboardToolbarButton>
        <DashboardToolbarButton>Sort: Date</DashboardToolbarButton>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          router.push(`/operations/form-corrections/${row.id}`);
        }}
      />
    </div>
  );
}
