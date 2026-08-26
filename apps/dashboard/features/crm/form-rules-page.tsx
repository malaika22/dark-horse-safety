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
  FORM_RULES_KPI,
  FORM_RULES_ROWS,
  type FormRuleRow,
} from "./data/form-rules.mock";

const columns: DashboardDataTableColumn<FormRuleRow>[] = [
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
    id: "template",
    header: "Form template",
    className: "min-w-[130px]",
    cell: (row) => row.formTemplate,
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
    id: "trigger",
    header: "Trigger",
    className: "min-w-[110px]",
    cell: (row) => row.trigger,
  },
  {
    id: "hardGate",
    header: "Hard-gate",
    className: "min-w-[90px]",
    cell: (row) => row.hardGate,
  },
  {
    id: "appliesTo",
    header: "Applies to",
    className: "min-w-[110px]",
    cell: (row) => row.appliesTo,
  },
  {
    id: "version",
    header: "Version",
    className: "min-w-[80px]",
    cell: (row) => row.version,
  },
  {
    id: "owner",
    header: "Owner",
    className: "min-w-[110px]",
    cell: (row) => row.owner,
  },
];

export function FormRulesPage() {
  return (
    <CrmListPageShell
      title="Required form rules"
      searchPlaceholder="Search form rules"
      kpi={FORM_RULES_KPI}
      columns={columns}
      rows={FORM_RULES_ROWS}
      getRowId={(row) => row.id}
      emptyMessage="No form rules found"
      searchFilter={(row, q) =>
        row.customer.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.formTemplate.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q)
      }
      primaryAction={
        <Link href="/crm/form-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<PlusIcon className="shrink-0" />}
          >
            Add form rule
          </DashboardToolbarButton>
        </Link>
      }
    />
  );
}
