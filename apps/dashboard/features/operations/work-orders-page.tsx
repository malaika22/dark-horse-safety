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
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  WORK_ORDERS_KPI,
  WORK_ORDERS_ROWS,
  WORK_ORDERS_SORT_OPTIONS,
  type WorkOrderRow,
} from "./data/work-orders.mock";

function sortRows(
  rows: WorkOrderRow[],
  field: string,
  direction: DashboardSortDirection,
) {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "serviceDate":
        return a.serviceDate.localeCompare(b.serviceDate) * dir;
      case "customer":
        return a.customer.localeCompare(b.customer) * dir;
      case "status":
        return a.status.label.localeCompare(b.status.label) * dir;
      case "hours":
        return a.hours.localeCompare(b.hours) * dir;
      case "woNumber":
      default:
        return a.woNumber.localeCompare(b.woNumber) * dir;
    }
  });
}

export function WorkOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerFilter =
    searchParams.get("customer")?.trim() ||
    searchParams.get("customerId")?.trim() ||
    "";

  const [query, setQuery] = React.useState(customerFilter);
  const [sortField, setSortField] = React.useState("woNumber");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  React.useEffect(() => {
    if (customerFilter) setQuery(customerFilter);
  }, [customerFilter]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = WORK_ORDERS_ROWS.filter((row) => {
      if (!q) return true;
      const haystack = [
        row.woNumber,
        row.customer,
        row.location,
        row.rep,
        row.status.label,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    rows = sortRows(rows, sortField, sortDirection);
    return rows;
  }, [query, sortDirection, sortField]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

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
                onSelect: () => router.push("/operations/work-orders"),
              },
              {
                id: "edit",
                label: "Edit work order",
                onSelect: () =>
                  router.push(
                    `/operations/work-orders/new?customerId=${encodeURIComponent(row.customerId)}&customer=${encodeURIComponent(row.customer)}`,
                  ),
              },
              {
                id: "customer",
                label: "Open customer",
                onSelect: () =>
                  router.push(`/crm/accounts/${row.customerId}`),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {WORK_ORDERS_KPI.map((cell) => (
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
        filters={
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
          >
            Filters (-)
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardExportMenu
              items={[
                { id: "view-csv", label: "Export current view • CSV" },
                { id: "all-csv", label: "Export all • CSV" },
              ]}
            />
            <DashboardSortMenu
              options={WORK_ORDERS_SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
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
        rows={pageRows}
        getRowId={(row) => row.id}
        emptyMessage="No work orders found"
        onRowClick={() => router.push("/operations/work-orders")}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
