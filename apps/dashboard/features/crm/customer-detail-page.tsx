"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardEntityHeader,
  DashboardFormGrid,
  DashboardMetaList,
  DashboardMetaRow,
  DashboardMetricGrid,
  DashboardPageHeader,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  CUSTOMER_ACCOUNT_SUMMARY,
  CUSTOMER_AUDIT,
  CUSTOMER_CONTACTS,
  CUSTOMER_DETAIL,
  CUSTOMER_DETAIL_KPI,
  CUSTOMER_DOCUMENTS,
  CUSTOMER_FORMS,
  CUSTOMER_FORM_OPTIONS,
  CUSTOMER_LOCATIONS,
  CUSTOMER_PRICING,
  CUSTOMER_REQUIREMENTS,
  CUSTOMER_ROUTE_GPS,
  CUSTOMER_SALES_TICKETS,
  CUSTOMER_WORK_ORDERS,
  type CustomerWorkOrder,
} from "./data/customer-detail.mock";

const workOrderColumns: DashboardDataTableColumn<CustomerWorkOrder>[] = [
  {
    id: "date",
    header: "Service date",
    className: "min-w-[110px]",
    cell: (row) => row.serviceDate,
  },
  {
    id: "wo",
    header: "WO number",
    className: "min-w-[120px]",
    cell: (row) => (
      <span className="underline decoration-white/40 underline-offset-4">
        {row.woNumber}
      </span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    className: "min-w-[140px]",
    cell: (row) => row.customer,
  },
  {
    id: "category",
    header: "Category",
    className: "min-w-[100px]",
    cell: (row) => (
      <DashboardBadge variant={row.category.variant} pill>
        {row.category.label}
      </DashboardBadge>
    ),
  },
  {
    id: "in",
    header: "Clock in",
    className: "min-w-[80px]",
    cell: (row) => row.clockIn,
  },
  {
    id: "out",
    header: "Clock out",
    className: "min-w-[80px]",
    cell: (row) => row.clockOut,
  },
  {
    id: "hours",
    header: "Hours",
    className: "min-w-[70px]",
    cell: (row) => row.hours,
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

function SideListCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardPanel className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <DashboardPanelTitle icon="lightning" title={title} />
        {count ? (
          <span className="shrink-0 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
            {count}
          </span>
        ) : null}
      </div>
      <div className="divider-line-full w-full" aria-hidden />
      <div className="p-4">{children}</div>
    </DashboardPanel>
  );
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const customer = CUSTOMER_DETAIL;
  void customerId;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <DashboardPageHeader
        title={`Customers / ${customer.name}`}
        subtitle="Customers / Overview"
        actions={
          <>
            <DashboardToolbarButton>+ Add note</DashboardToolbarButton>
            <Link
              href={`/crm/accounts/${customer.id}/edit`}
              className="inline-flex shrink-0"
            >
              <DashboardToolbarButton variant="primary">
                Edit customer
              </DashboardToolbarButton>
            </Link>
          </>
        }
      />

      <DashboardEntityHeader
        title={customer.name}
        status={customer.status}
        meta={[
          { label: "Customer ID", value: customer.code },
          { label: "Account owner", value: customer.accountOwner },
          { label: "Email", value: customer.email },
          { label: "Phone", value: customer.phone },
        ]}
      />

      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          {CUSTOMER_DETAIL_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <DashboardPanelTitle icon="lightning" title="Company details" />
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-4 p-4">
              <DashboardFormGrid>
                <DashboardTextField
                  label="Company name"
                  defaultValue={customer.name}
                  readOnly
                />
                <DashboardSelectField
                  label="Account owner"
                  defaultValue="r-crawford"
                  options={CUSTOMER_FORM_OPTIONS.owners}
                />
                <DashboardSelectField
                  label="Status"
                  defaultValue="active"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "review", label: "Need review" },
                  ]}
                />
                <DashboardTextField
                  label="Phone"
                  defaultValue={customer.phone}
                  readOnly
                />
                <DashboardTextField
                  label="Email"
                  defaultValue={customer.email}
                  readOnly
                />
                <DashboardTextField
                  label="Billing address"
                  defaultValue={customer.billingAddress}
                  readOnly
                />
                <DashboardSelectField
                  label="Industry"
                  defaultValue="oil-gas"
                  options={CUSTOMER_FORM_OPTIONS.industries}
                />
                <DashboardTextField
                  label="Primary contact"
                  defaultValue={customer.primaryContact}
                  readOnly
                />
                <DashboardTextField
                  label="Customer since"
                  type="date"
                  defaultValue={customer.customerSince}
                  readOnly
                />
              </DashboardFormGrid>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DashboardToggle
                  label="Max clock-in radius"
                  checked={customer.maxClockInRadius}
                />
                <DashboardTextField
                  label="Radius (miles)"
                  defaultValue={customer.radiusMiles}
                  readOnly
                />
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel className="overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <DashboardPanelTitle icon="lightning" title="Work orders" />
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <DashboardDataTable
              embedded
              columns={workOrderColumns}
              rows={CUSTOMER_WORK_ORDERS}
              getRowId={(row) => row.id}
            />
          </DashboardPanel>
        </div>

        <div className="space-y-4">
          <SideListCard title="Account summary">
            <DashboardMetricGrid items={CUSTOMER_ACCOUNT_SUMMARY} />
          </SideListCard>

          <SideListCard title="Requirements & compliance">
            <DashboardMetaList>
              {CUSTOMER_REQUIREMENTS.map((row) => (
                <DashboardMetaRow
                  key={row.title}
                  title={row.title}
                  subtitle={row.subtitle}
                  trailing={
                    <DashboardBadge variant={row.status.variant} pill>
                      {row.status.label}
                    </DashboardBadge>
                  }
                />
              ))}
            </DashboardMetaList>
          </SideListCard>

          <SideListCard title="Audit history">
            <DashboardMetaList>
              {CUSTOMER_AUDIT.map((row) => (
                <DashboardMetaRow
                  key={row.title}
                  title={row.title}
                  subtitle={row.subtitle}
                  trailing={
                    <span className="font-sans text-[10px] uppercase text-[#959597]">
                      {row.trailing}
                    </span>
                  }
                />
              ))}
            </DashboardMetaList>
          </SideListCard>

          <SideListCard title="Documents">
            <DashboardMetaList>
              {CUSTOMER_DOCUMENTS.map((row) => (
                <DashboardMetaRow
                  key={row.title}
                  title={row.title}
                  subtitle={row.subtitle}
                />
              ))}
            </DashboardMetaList>
          </SideListCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SideListCard title="Contacts" count="3 contacts">
          <DashboardMetaList>
            {CUSTOMER_CONTACTS.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
                trailing={
                  <span className="font-sans text-[10px] uppercase text-[#959597]">
                    {row.trailing}
                  </span>
                }
              />
            ))}
          </DashboardMetaList>
        </SideListCard>

        <SideListCard title="Locations / wells">
          <DashboardMetaList>
            {CUSTOMER_LOCATIONS.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                trailing={
                  <DashboardBadge variant={row.status.variant} pill>
                    {row.status.label}
                  </DashboardBadge>
                }
              />
            ))}
          </DashboardMetaList>
        </SideListCard>

        <SideListCard title="Pricing">
          <DashboardMetaList>
            {CUSTOMER_PRICING.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                trailing={
                  <span className="font-sans text-[12px] uppercase text-white">
                    {row.trailing}
                  </span>
                }
              />
            ))}
          </DashboardMetaList>
        </SideListCard>

        <SideListCard title="Required forms">
          <DashboardMetaList>
            {CUSTOMER_FORMS.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
          </DashboardMetaList>
        </SideListCard>

        <SideListCard title="Route / GPS">
          <DashboardMetaList>
            {CUSTOMER_ROUTE_GPS.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
          </DashboardMetaList>
        </SideListCard>

        <SideListCard title="Sales tickets">
          <DashboardMetaList>
            {CUSTOMER_SALES_TICKETS.map((row) => (
              <DashboardMetaRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
                trailing={
                  <DashboardBadge variant={row.status.variant} pill>
                    {row.status.label}
                  </DashboardBadge>
                }
              />
            ))}
          </DashboardMetaList>
        </SideListCard>
      </div>
    </div>
  );
}
