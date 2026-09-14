"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardListToolbar,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  type DashboardBadgeVariant,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmWorkOrder } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { WORK_ORDERS_SORT_OPTIONS } from "./data/work-orders.mock";

export type WorkOrderRow = {
  id: string;
  woNumber: string;
  serviceDate: string;
  customer: string;
  customerId: string;
  location: string;
  category: { label: string; variant: DashboardBadgeVariant };
  hours: string;
  status: { label: string; variant: DashboardBadgeVariant };
  rep: string;
};

function statusBadge(status?: string | null): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (status ?? "DRAFT").toUpperCase();
  if (s === "COMPLETE") return { label: "Complete", variant: "success" };
  if (s === "IN_PROGRESS") return { label: "In Progress", variant: "info" };
  if (s === "PENDING") return { label: "Pending", variant: "warning" };
  if (s === "ON_HOLD") return { label: "On Hold", variant: "review" };
  if (s === "OPEN") return { label: "Open", variant: "billing" };
  return { label: s.replace(/_/g, " "), variant: "operations" };
}

function categoryBadge(category?: string | null): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const c = (category ?? "—").trim() || "—";
  return { label: c, variant: "gold" };
}

function shortRep(rep?: CrmWorkOrder["assignedRep"]) {
  if (!rep) return "—";
  const initial = rep.firstName?.trim()?.[0];
  const last = rep.lastName?.trim();
  if (initial && last) return `${initial}. ${last}`;
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || rep.email || "—";
}

function fmtServiceDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hoursLabel(wo: CrmWorkOrder) {
  if (wo.scheduledStart && wo.scheduledEnd) {
    return `${wo.scheduledStart}-${wo.scheduledEnd}`;
  }
  return "—";
}

function mapRow(wo: CrmWorkOrder): WorkOrderRow {
  return {
    id: wo.id,
    woNumber: wo.code ?? wo.workOrderNumber ?? "—",
    serviceDate: fmtServiceDate(wo.serviceDate),
    customer: wo.customer?.name ?? "—",
    customerId: wo.customer?.id ?? wo.customerId ?? "",
    location: wo.location?.name ?? wo.locationLabel ?? "—",
    category: categoryBadge(wo.category),
    hours: hoursLabel(wo),
    status: statusBadge(wo.status),
    rep: shortRep(wo.assignedRep),
  };
}

export function WorkOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerFilter =
    searchParams.get("customer")?.trim() ||
    searchParams.get("customerId")?.trim() ||
    "";

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [rows, setRows] = React.useState<WorkOrderRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [kpi, setKpi] = React.useState({
    open: 0,
    inProgress: 0,
    pending: 0,
    completed7d: 0,
    startingToday: 0,
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [listRes, kpiRes] = await Promise.all([
          crmApi.listWorkOrders({
            q: query || undefined,
            page,
            pageSize,
            sort: sortField,
            direction: sortDirection,
            customerId: customerFilter || undefined,
          }),
          crmApi.workOrdersKpi(),
        ]);
        if (cancelled) return;
        const items = listRes.data?.items ?? [];
        setRows(items.map(mapRow));
        setTotal(listRes.data?.total ?? items.length);
        setKpi(kpiRes.data);
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
  }, [query, page, pageSize, sortField, sortDirection, customerFilter]);

  const columns: DashboardDataTableColumn<WorkOrderRow>[] = React.useMemo(
    () => [
      {
        id: "wo",
        header: "Work Order",
        className: "min-w-[140px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.woNumber}
            subtitle={row.serviceDate}
            underline
          />
        ),
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[160px]",
        cell: (row) => row.customer,
      },
      {
        id: "location",
        header: "Location",
        className: "min-w-[140px]",
        cell: (row) => row.location,
      },
      {
        id: "category",
        header: "Category",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge variant={row.category.variant} pill>
            {row.category.label}
          </DashboardBadge>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        className: "min-w-[80px]",
        cell: (row) => row.hours,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[120px]",
        cell: (row) => (
          <DashboardBadge variant={row.status.variant} pill>
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "rep",
        header: "Rep",
        className: "min-w-[110px]",
        cell: (row) => row.rep,
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "view",
                label: "View work order",
                onSelect: () =>
                  router.push(`/operations/work-orders/${row.id}`),
              },
              {
                id: "edit",
                label: "Complete work order",
                onSelect: () =>
                  router.push(`/operations/work-orders/${row.id}`),
              },
              {
                id: "customer",
                label: "Open customer",
                onSelect: () => {
                  if (row.customerId) {
                    router.push(`/crm/customers/${row.customerId}`);
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  const kpiCells = [
    {
      title: "Open work orders",
      value: String(kpi.open),
      meta: `${kpi.startingToday} starting today`,
      icon: "folder" as const,
    },
    {
      title: "In progress",
      value: String(kpi.inProgress),
      meta: "Live from work orders",
      icon: "time" as const,
    },
    {
      title: "Pending",
      value: String(kpi.pending),
      meta: "Draft / pending",
      icon: "document" as const,
    },
    {
      title: "Completed (7d)",
      value: String(kpi.completed7d),
      meta: "Last 7 days",
      icon: "lightning" as const,
    },
  ];

  return (
    <CrmListLoadGate loading={loading && rows.length === 0} hasData={rows.length > 0 || !loading}>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
        <DashboardStatGrid>
          <DashboardStatRow columns={4}>
            {kpiCells.map((cell) => (
              <DashboardStatCell key={cell.title} {...cell} />
            ))}
          </DashboardStatRow>
        </DashboardStatGrid>

        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search work orders"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          }
          actions={
            <>
              <DashboardSortMenu
                options={WORK_ORDERS_SORT_OPTIONS.filter(
                  (o) => o.id !== "hours",
                ).concat([{ id: "createdAt", label: "Created" }])}
                field={sortField}
                direction={sortDirection}
                onFieldChange={(f) => {
                  setSortField(f);
                  setPage(1);
                }}
                onDirectionChange={setSortDirection}
              />
              <DashboardToolbarButton
                variant="primary"
                onClick={() => router.push("/operations/work-orders/new")}
              >
                Create Work Order
              </DashboardToolbarButton>
            </>
          }
        />

        <DashboardDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          emptyMessage="No work orders found"
          onRowClick={(row) =>
            router.push(`/operations/work-orders/${row.id}`)
          }
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
      </div>
    </CrmListLoadGate>
  );
}
