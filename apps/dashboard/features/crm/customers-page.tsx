"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardFilterChips,
  DashboardListToolbar,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTableBadgeStack,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  SyncIcon,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  CUSTOMERS_DEFAULT_CHIPS,
  CUSTOMERS_KPI,
  CUSTOMERS_ROWS,
  type CustomerRow,
} from "./data/customers.mock";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const columns: DashboardDataTableColumn<CustomerRow>[] = [
  {
    id: "customer",
    header: "Customer",
    className: "min-w-[180px] max-w-[240px] overflow-hidden",
    cell: (row) => (
      <DashboardTablePrimaryCell title={row.name} subtitle={row.code} />
    ),
  },
  {
    id: "owner",
    header: "Account owner",
    className: "min-w-[120px]",
    cell: (row) => row.accountOwner,
  },
  {
    id: "status",
    header: "Status",
    className: "min-w-[110px]",
    cell: (row) => (
      <DashboardBadge variant={row.status.variant} pill>
        {row.status.label}
      </DashboardBadge>
    ),
  },
  {
    id: "contact",
    header: "Primary contact",
    className: "min-w-[120px]",
    cell: (row) => row.primaryContact,
  },
  {
    id: "jobs",
    header: "Open jobs",
    align: "center",
    className: "min-w-[90px]",
    cell: (row) => row.openJobs,
  },
  {
    id: "locations",
    header: "Locations / well",
    align: "center",
    className: "min-w-[110px]",
    cell: (row) => row.locations,
  },
  {
    id: "requirements",
    header: "Requirements",
    className: "min-w-[140px]",
    cell: (row) => (
      <DashboardTableBadgeStack>
        {row.requirements.map((item) => (
          <DashboardBadge key={item.label} variant={item.variant} pill>
            {item.label}
          </DashboardBadge>
        ))}
      </DashboardTableBadgeStack>
    ),
  },
  {
    id: "route",
    header: "Route / GPS",
    className: "min-w-[140px]",
    cell: (row) => (
      <DashboardTableBadgeStack>
        {row.routeGps.map((item) => (
          <DashboardBadge key={item.label} variant={item.variant} pill>
            {item.label}
          </DashboardBadge>
        ))}
      </DashboardTableBadgeStack>
    ),
  },
];

export function CustomersPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState(CUSTOMERS_DEFAULT_CHIPS);

  const filtered = CUSTOMERS_ROWS.filter((row) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      row.code.toLowerCase().includes(q) ||
      row.accountOwner.toLowerCase().includes(q) ||
      row.primaryContact.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      {/* Page header — Import sync + Add customer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Customers
        </h2>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <DashboardToolbarButton leftIcon={<SyncIcon className="shrink-0" />}>
            Import sync
          </DashboardToolbarButton>
          <Link href="/crm/accounts/new" className="inline-flex shrink-0">
            <DashboardToolbarButton
              variant="primary"
              leftIcon={<UserIcon className="shrink-0" />}
            >
              Add customer
            </DashboardToolbarButton>
          </Link>
        </div>
      </div>

      {/* KPI strip — 4 equal cards */}
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {CUSTOMERS_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {/* Search / filter / sort / export toolbar */}
      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
        filters={
          <DashboardToolbarButton
            leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
          >
            Filter
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardToolbarButton
              variant="muted"
              leftIcon={<DashboardToolbarIcons.Sort className="shrink-0" />}
            >
              Sort: Notice start (nearest)
            </DashboardToolbarButton>
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Customers className="shrink-0" />}
            >
              Payroll review
            </DashboardToolbarButton>
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Download className="shrink-0" />}
              showChevron
            >
              Export
            </DashboardToolbarButton>
          </>
        }
        chips={
          <DashboardFilterChips
            chips={chips}
            onRemove={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
            onClearAll={() => setChips([])}
          />
        }
      />

      <DashboardDataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyMessage="No customers found"
        onRowClick={(row) => router.push(`/crm/accounts/${row.id}`)}
      />
    </div>
  );
}
