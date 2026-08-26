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
  PRICING_RULES_KPI,
  PRICING_RULES_ROWS,
  type PricingRuleRow,
} from "./data/pricing-rules.mock";

const columns: DashboardDataTableColumn<PricingRuleRow>[] = [
  {
    id: "customer",
    header: "Customer",
    className: "min-w-[180px] max-w-[240px] overflow-hidden",
    cell: (row) => (
      <DashboardTablePrimaryCell
        title={row.customer}
        subtitle={row.code}
        underline
      />
    ),
  },
  {
    id: "service",
    header: "Service / item",
    className: "min-w-[140px]",
    cell: (row) => row.service,
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
    id: "rate",
    header: "Rate",
    className: "min-w-[90px]",
    cell: (row) => row.rate,
  },
  {
    id: "unit",
    header: "Unit",
    className: "min-w-[90px]",
    cell: (row) => row.unit,
  },
  {
    id: "effective",
    header: "Effective",
    className: "min-w-[110px]",
    cell: (row) => row.effective,
  },
  {
    id: "expires",
    header: "Expires",
    className: "min-w-[110px]",
    cell: (row) => row.expires,
  },
  {
    id: "owner",
    header: "Owner",
    className: "min-w-[110px]",
    cell: (row) => row.owner,
  },
];

export function PricingRulesPage() {
  return (
    <CrmListPageShell
      title="Pricing rules"
      searchPlaceholder="Search pricing rules"
      kpi={PRICING_RULES_KPI}
      columns={columns}
      rows={PRICING_RULES_ROWS}
      getRowId={(row) => row.id}
      emptyMessage="No pricing rules found"
      searchFilter={(row, q) =>
        row.customer.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q)
      }
      primaryAction={
        <Link href="/crm/pricing-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<PlusIcon className="shrink-0" />}
          >
            Add pricing rule
          </DashboardToolbarButton>
        </Link>
      }
    />
  );
}
