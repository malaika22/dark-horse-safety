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
  type AdditionalFormItem,
  type AdditionalFormKpi,
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
  if (s === "PENDING") return "border border-[#FDFDFF] text-[#FDFDFF] bg-transparent";
  if (s === "APPROVED" || s === "FORM_ADDED")
    return "bg-[#1C3A2A] text-[#5ECF8E]";
  if (s === "DENIED") return "border border-[#B84A4A] text-[#E86A6A] bg-transparent";
  if (s === "NEEDS_INFO") return "bg-[#3A3218] text-[#E8C547]";
  return "border border-[#3E3E3E] text-[#959597]";
}

function urgencyTone(urgency: string) {
  const s = urgency.toUpperCase();
  if (s === "HIGH") return "bg-[#3A1C1C] text-[#E86A6A]";
  if (s === "MEDIUM") return "border border-[#FDFDFF] text-[#FDFDFF] bg-transparent";
  if (s === "LOW") return "bg-[#2A2A2A] text-[#959597]";
  return "border border-[#3E3E3E] text-[#959597]";
}

const EMPTY_KPI: AdditionalFormKpi = {
  pending: 0,
  pendingMeta: "",
  approved: 0,
  approvedMeta: "",
  denied: 0,
  deniedMeta: "",
  needsInfo: 0,
  needsInfoMeta: "",
  formAdded: 0,
  formAddedMeta: "",
};

export function AdditionalFormRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<AdditionalFormItem[]>([]);
  const [kpi, setKpi] = React.useState<AdditionalFormKpi>(EMPTY_KPI);
  const [alert, setAlert] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationsApi.listAdditionalFormRequests();
      setItems(res.data.items);
      setKpi(res.data.kpis);
      setAlert(res.data.alert);
    } catch (err) {
      setError("Couldn't load additional form requests.");
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
        a.download = "additional-form-requests.json";
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
        r.formRequested.toLowerCase().includes(needle) ||
        r.technicianName.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const columns = React.useMemo<
    DashboardDataTableColumn<AdditionalFormItem>[]
  >(
    () => [
      {
        id: "code",
        header: "Request ID",
        cell: (row) => (
          <Link
            href={`/operations/additional-form-requests/${row.id}`}
            className="font-sans text-[12px] uppercase text-[#8B9BB4] underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.code}
          </Link>
        ),
      },
      {
        id: "wo",
        header: "Work Or",
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
        id: "tech",
        header: "Tech",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.technicianName}
          </span>
        ),
      },
      {
        id: "form",
        header: "Form Requested",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.formRequested}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.reasonShort}
          </span>
        ),
      },
      {
        id: "urgency",
        header: "Urgency",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 font-sans text-[10px] uppercase",
              urgencyTone(row.urgency),
            )}
          >
            {row.urgency}
          </span>
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
        id: "age",
        header: "Age",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.ageLabel}
          </span>
        ),
      },
      {
        id: "review",
        header: "Review",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#C8C8C8]">
            {row.reviewer}
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
            title="Pending"
            value={String(kpi.pending)}
            meta={kpi.pendingMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Approved"
            value={String(kpi.approved)}
            meta={kpi.approvedMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Denied"
            value={String(kpi.denied)}
            meta={kpi.deniedMeta}
            icon="alert"
          />
          <DashboardStatCell
            title="Needs Info"
            value={String(kpi.needsInfo)}
            meta={kpi.needsInfoMeta}
            icon="edit"
          />
          <DashboardStatCell
            title="Form Added"
            value={String(kpi.formAdded)}
            meta={kpi.formAddedMeta}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      {alert ? (
        <div
          className="rounded-xl border border-[#B84A4A]/60 bg-[#3A1C1C]/40 px-4 py-3 font-sans text-[12px] uppercase leading-relaxed text-[#E86A6A]"
          role="alert"
        >
          {alert}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search additional form requests"
          className="min-w-[220px] flex-1"
        />
        <DashboardToolbarButton>Filter</DashboardToolbarButton>
        <DashboardToolbarButton>Sort: Urgency</DashboardToolbarButton>
      </div>

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          router.push(`/operations/additional-form-requests/${row.id}`);
        }}
      />
    </div>
  );
}
