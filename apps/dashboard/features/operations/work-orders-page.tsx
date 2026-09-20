"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardBadgeVariant,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmHoursByPayCycle,
  type CrmOpsWorkOrderRow,
  type CrmWorkOrderOpsKpi,
} from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { OpsWorkOrdersEmptyState } from "@/features/operations/operations-states";
import { CloseRuleModal } from "@/features/operations/work-order-modals";

const SORT_OPTIONS = [
  { id: "createdAt", label: "Created" },
  { id: "code", label: "WO Number" },
  { id: "serviceDate", label: "Job Date" },
  { id: "status", label: "Status" },
  { id: "title", label: "Customer" },
];

function statusBadge(status?: string | null): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (status ?? "DRAFT").toUpperCase();
  if (s === "COMPLETE") return { label: "Complete", variant: "success" };
  if (s === "IN_PROGRESS") return { label: "In Progress", variant: "offline" };
  if (s === "ON_HOLD") return { label: "On Hold", variant: "review" };
  if (s === "PENDING" || s === "NEEDS_REVIEW")
    return { label: s.replace(/_/g, " "), variant: "warning" };
  if (s === "ARCHIVED") return { label: "Cancelled", variant: "error" };
  return { label: s.replace(/_/g, " "), variant: "operations" };
}

function docsVariant(tone: string): DashboardBadgeVariant {
  return tone === "pos" ? "success" : "error";
}

function billVariant(tone: string): DashboardBadgeVariant {
  if (tone === "pos") return "success";
  if (tone === "warn") return "warning";
  return "error";
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WarnTriangle() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l10 18H2L12 3z"
        stroke="#C4A35A"
        strokeWidth="1.75"
        fill="none"
      />
      <path d="M12 10v4M12 16.5h.01" stroke="#C4A35A" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function WorkOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerFilter =
    searchParams.get("customer")?.trim() ||
    searchParams.get("customerId")?.trim() ||
    "";
  const statusFilter = searchParams.get("status")?.trim() || "";

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [rows, setRows] = React.useState<CrmOpsWorkOrderRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [kpi, setKpi] = React.useState<CrmWorkOrderOpsKpi | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hours, setHours] = React.useState<CrmHoursByPayCycle | null>(null);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [closeId, setCloseId] = React.useState<string | null>(null);

  useSetHeaderBreadcrumb("Operations / Work Order");
  useSetHeaderActions(
    <div className="flex flex-wrap gap-2">
      <DashboardToolbarButton
        onClick={() => router.push("/operations/recurring-series")}
      >
        Recurring Series
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<PlusIcon />}
        showChevron
        onClick={() => router.push("/operations/work-orders/new")}
      >
        Create Work Order
      </DashboardToolbarButton>
    </div>,
    [router],
  );

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [listRes, kpiRes] = await Promise.all([
          crmApi.listWorkOrders({
            q: query || undefined,
            page,
            pageSize,
            sort: sortField,
            direction: sortDirection,
            customerId: customerFilter || undefined,
            status: statusFilter || undefined,
          }),
          crmApi.workOrdersOpsKpi(),
        ]);
        if (cancelled) return;
        const items = listRes.data?.items ?? [];
        setRows(items);
        setTotal(listRes.data?.total ?? items.length);
        setKpi(kpiRes.data);
        setSelectedId((prev) => prev ?? items[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    query,
    page,
    pageSize,
    sortField,
    sortDirection,
    customerFilter,
    statusFilter,
    reloadKey,
  ]);

  React.useEffect(() => {
    if (!selectedId) {
      setHours(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await crmApi.getWorkOrderHoursByPayCycle(selectedId);
        if (!cancelled) setHours(res.data);
      } catch {
        if (!cancelled) setHours(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const columns = React.useMemo<DashboardDataTableColumn<CrmOpsWorkOrderRow>[]>(
    () => [
      {
        id: "code",
        header: "WO Number",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            {row.warning ? <WarnTriangle /> : null}
            <button
              type="button"
              className="font-sans text-[11px] uppercase text-[#8B9BB4] underline underline-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/operations/work-orders/${row.id}`);
              }}
            >
              {row.code}
            </button>
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: (row) => (
          <span className="max-w-[110px] truncate font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.locationShort}
          </span>
        ),
      },
      {
        id: "jobType",
        header: "Job Type",
        cell: (row) => (
          <span className="max-w-[90px] truncate font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.jobType}
          </span>
        ),
      },
      {
        id: "jobDate",
        header: "Job Date",
        cell: (row) => (
          <div>
            <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              {row.jobDateLabel}
            </p>
            {row.jobDateMeta ? (
              <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6F6F72]">
                {row.jobDateMeta}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "tech",
        header: "Assigned Tech",
        cell: (row) => (
          <div>
            <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              {row.assignedTech}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6F6F72]">
              {row.techStatus}
            </p>
          </div>
        ),
      },
      {
        id: "closeout",
        header: "Closeout Age",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] uppercase underline underline-offset-2",
              row.closeoutTone === "warn"
                ? "text-[#C4A35A]"
                : row.closeoutTone === "ok"
                  ? "text-[#8B9BB4]"
                  : "text-[#959597]",
            )}
          >
            {row.closeoutAge}
          </span>
        ),
      },
      {
        id: "docs",
        header: "Docs",
        cell: (row) => (
          <DashboardBadge variant={docsVariant(row.docsTone)} pill>
            {row.docsLabel}
          </DashboardBadge>
        ),
      },
      {
        id: "bill",
        header: "Bill",
        cell: (row) => (
          <DashboardBadge variant={billVariant(row.billTone)} pill>
            {row.billLabel}
          </DashboardBadge>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => {
          const b = statusBadge(row.status);
          return (
            <DashboardBadge variant={b.variant} pill>
              {b.label}
            </DashboardBadge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "open",
                label: "Open Job Packet",
                onSelect: () =>
                  router.push(`/operations/work-orders/${row.id}`),
              },
              {
                id: "hold",
                label: "Hold / Cancel",
                onSelect: () => {
                  setCloseId(row.id);
                  setCloseOpen(true);
                },
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  const crossesCount = rows.filter((r) => r.crossesCycle).length;

  return (
    <CrmListLoadGate loading={loading} hasData={rows.length > 0 || !loading} error={null} onRetry={refresh} kpiCount={5}>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        {kpi ? (
          <DashboardStatGrid>
            <DashboardStatRow columns={5}>
              <DashboardStatCell
                title="Active"
                value={String(kpi.active)}
                meta={kpi.activeMeta}
                icon="lightning"
              />
              <DashboardStatCell
                title="Multi-Day Jobs"
                value={String(kpi.multiDayJobs)}
                meta={kpi.multiDayMeta}
                icon="document"
              />
              <DashboardStatCell
                title="Closeout Not Submitted"
                value={String(kpi.closeoutNotSubmitted)}
                meta={kpi.closeoutMeta}
                icon="alert"
              />
              <DashboardStatCell
                title="Missing Req. Docs"
                value={String(kpi.missingReqDocs)}
                meta={kpi.missingDocsMeta}
                icon="folder"
              />
              <DashboardStatCell
                title="Payroll-Ready WOs"
                value={String(kpi.payrollReadyWos)}
                meta={kpi.payrollReadyMeta}
                icon="time"
              />
            </DashboardStatRow>
          </DashboardStatGrid>
        ) : null}

        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search WO, customer, location…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          }
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <DashboardToolbarButton>Filter</DashboardToolbarButton>
              {crossesCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#534A1E] bg-[#352E1B] px-2 py-1 font-sans text-[10px] uppercase text-[#CAC897]">
                  <WarnTriangle /> Crosses Cycle
                </span>
              ) : null}
            </div>
          }
          actions={
            <>
              <DashboardSortMenu
                options={SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                onClick={() => router.push("/operations/sales-tickets")}
              >
                Review Exceptions
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  {
                    id: "csv",
                    label: "Export current view · CSV",
                    onSelect: () => {
                      const header = [
                        "WO",
                        "Customer",
                        "Location",
                        "Job Type",
                        "Job Date",
                        "Tech",
                        "Status",
                      ];
                      const lines = rows.map((r) =>
                        [
                          r.code,
                          r.customerName,
                          r.locationName,
                          r.jobType,
                          r.jobDateLabel,
                          r.assignedTech,
                          r.status,
                        ]
                          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                          .join(","),
                      );
                      const blob = new Blob(
                        [[header.join(","), ...lines].join("\n")],
                        { type: "text/csv" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "work-orders.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    },
                  },
                ]}
              />
            </>
          }
        />

        {rows.length === 0 && !loading ? (
          <OpsWorkOrdersEmptyState />
        ) : (
          <>
            <DashboardDataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id)}
            />
            <DashboardPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}

        {hours && selectedId ? (
          <section className="rounded-xl border border-[#2D2D30] bg-panel p-4 sm:p-5">
            <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Work Order Detail · Hours by Pay Cycle
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              {rows.find((r) => r.id === selectedId)?.code ?? selectedId}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
              {hours.cycles[0] ? (
                <CycleBlock cycle={hours.cycles[0]} />
              ) : (
                <p className="font-sans text-[11px] uppercase text-[#959597]">
                  No cycle data
                </p>
              )}
              <div className="flex items-center justify-center">
                <div className="rounded-md border border-dashed border-[#3E3E3E] px-2 py-8 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  {hours.boundaryLabel}
                </div>
              </div>
              {hours.cycles[1] ? (
                <CycleBlock cycle={hours.cycles[1]} />
              ) : (
                <div />
              )}
            </div>
          </section>
        ) : null}

        <CloseRuleModal
          open={closeOpen}
          workOrderId={closeId}
          onClose={() => setCloseOpen(false)}
          onDone={refresh}
        />
      </div>
    </CrmListLoadGate>
  );
}

function CycleBlock({
  cycle,
}: {
  cycle: CrmHoursByPayCycle["cycles"][number];
}) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#161616] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-[11px] uppercase text-[#C8C8C8]">
          {cycle.label}
        </p>
        <p className="font-sans text-[16px] font-[590] uppercase text-[#FDFDFF]">
          {cycle.totalHours.toFixed(1)} HRS
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className="h-full rounded-full bg-[#3D8B6E]"
          style={{ width: `${Math.min(100, cycle.totalHours * 2)}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {cycle.days.map((d) => (
          <li
            key={`${d.date}-${d.hours}`}
            className="font-sans text-[10px] uppercase text-[#959597]"
          >
            {d.date} — {d.hours.toFixed(1)} HRS
          </li>
        ))}
      </ul>
    </div>
  );
}
