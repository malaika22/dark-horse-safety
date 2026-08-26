"use client";

import Link from "next/link";
import {
  DashboardBadge,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { CrmListPageShell, PlusIcon } from "./crm-list-page-shell";
import {
  REQUIREMENTS_KPI,
  REQUIREMENTS_ROWS,
  type RequirementRow,
} from "./data/requirements.mock";

const columns: DashboardDataTableColumn<RequirementRow>[] = [
  {
    id: "customer",
    header: "Customer",
    className: "min-w-[180px] max-w-[240px] overflow-hidden",
    cell: (row) => (
      <DashboardTablePrimaryCell title={row.customer} subtitle={row.code} />
    ),
  },
  {
    id: "requirement",
    header: "Requirement",
    className: "min-w-[140px]",
    cell: (row) => row.requirement,
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
    id: "type",
    header: "Type",
    className: "min-w-[100px]",
    cell: (row) => row.type,
  },
  {
    id: "owner",
    header: "Owner",
    className: "min-w-[110px]",
    cell: (row) => row.owner,
  },
  {
    id: "due",
    header: "Due",
    className: "min-w-[110px]",
    cell: (row) => row.due,
  },
  {
    id: "review",
    header: "Review",
    className: "min-w-[110px]",
    cell: (row) => (
      <DashboardBadge variant={row.review.variant} pill>
        {row.review.label}
      </DashboardBadge>
    ),
  },
  {
    id: "docs",
    header: "Docs",
    className: "min-w-[110px]",
    cell: (row) => (
      <DashboardBadge variant={row.docs.variant} pill>
        {row.docs.label}
      </DashboardBadge>
    ),
  },
];

export function RequirementsPage() {
  return (
    <CrmListPageShell
      title="Customer requirements"
      searchPlaceholder="Search requirements"
      kpi={REQUIREMENTS_KPI}
      columns={columns}
      rows={REQUIREMENTS_ROWS}
      getRowId={(row) => row.id}
      emptyMessage="No requirements found"
      searchFilter={(row, q) =>
        row.customer.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.requirement.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q)
      }
      primaryAction={
        <Link href="/crm/requirements/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<PlusIcon className="shrink-0" />}
          >
            Add requirement
          </DashboardToolbarButton>
        </Link>
      }
    />
  );
}
