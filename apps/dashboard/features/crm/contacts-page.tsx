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
  CONTACTS_KPI,
  CONTACTS_ROWS,
  type ContactRow,
} from "./data/contacts.mock";

const columns: DashboardDataTableColumn<ContactRow>[] = [
  {
    id: "contact",
    header: "Contact",
    className: "min-w-[160px] max-w-[220px] overflow-hidden",
    cell: (row) => (
      <DashboardTablePrimaryCell
        title={row.name}
        subtitle={row.code}
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
    id: "role",
    header: "Role",
    className: "min-w-[120px]",
    cell: (row) => row.role,
  },
  {
    id: "email",
    header: "Email",
    className: "min-w-[160px]",
    cell: (row) => row.email,
  },
  {
    id: "phone",
    header: "Phone",
    className: "min-w-[120px]",
    cell: (row) => row.phone,
  },
  {
    id: "location",
    header: "Location",
    className: "min-w-[110px]",
    cell: (row) => row.location,
  },
  {
    id: "primary",
    header: "Primary",
    className: "min-w-[100px]",
    cell: (row) => row.primary,
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
];

export function ContactsPage() {
  return (
    <CrmListPageShell
      title="Contacts"
      searchPlaceholder="Search contacts"
      kpi={CONTACTS_KPI}
      columns={columns}
      rows={CONTACTS_ROWS}
      getRowId={(row) => row.id}
      emptyMessage="No contacts found"
      searchFilter={(row, q) =>
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      }
      primaryAction={
        <Link href="/crm/contacts/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<PlusIcon className="shrink-0" />}
          >
            Add contact
          </DashboardToolbarButton>
        </Link>
      }
    />
  );
}
