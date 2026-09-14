"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  DashboardBadge,
  DashboardDataTable,
  DashboardPanel,
  DashboardToolbarButton,
  type DashboardBadgeVariant,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmExpense } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { CrmEmptyTabState, CrmLoadFailedState } from "@/features/crm/crm-states";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { ExpenseDetailsModal } from "@/features/crm/expense-details-modal";
import { NewExpenseModal } from "@/features/crm/new-expense-modal";
import { useSearchParams } from "next/navigation";

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function defaultRange() {
  const today = startOfDayLocal(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - 13);
  return { from: isoDay(from), to: isoDay(today) };
}

function formatRangeShort(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const mon = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  if (sameMonth) {
    return `${mon(a)} ${a.getDate()}-${b.getDate()}`;
  }
  return `${mon(a)} ${a.getDate()} – ${mon(b)} ${b.getDate()}`;
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusMeta(status: string): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const key = status.toUpperCase().replace(/\s+/g, "_");
  switch (key) {
    case "APPROVED":
      return { label: "APPROVED", variant: "success" };
    case "DRAFT":
      return { label: "DRAFT", variant: "neutral" };
    case "PENDING":
      return { label: "PENDING", variant: "gold" };
    case "UNMATCHED":
      return { label: "UNMATCHED", variant: "billing" };
    case "MISSING_RECEIPT":
      return { label: "MISSING RECEIPT", variant: "error" };
    case "NEEDS_REVIEW":
      return { label: "NEEDS REVIEW", variant: "review" };
    default:
      return { label: status.replace(/_/g, " ").toUpperCase(), variant: "neutral" };
  }
}

/**
 * Customer expenses list — Figma CRM / Customers / Expenses.
 */
export function ExpensesListPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useSetHeaderBreadcrumb("Accounts / Customers / Expenses");

  const range = React.useMemo(() => defaultRange(), []);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<CrmExpense[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const activityId = searchParams.get("activityId") ?? undefined;

  React.useEffect(() => {
    if (searchParams.get("new") === "1" || searchParams.has("activityId")) {
      setNewOpen(true);
    }
  }, [searchParams]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.listCustomerExpenses(customerId, {
        from,
        to,
        pageSize: 100,
        sort: "expenseDate",
        direction: "desc",
      });
      const data = res.data;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalAmount(Number(data.totalAmount) || 0);
    } catch (err) {
      toastApiError(err);
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const cancelHref = `/crm/accounts/${customerId}`;

  const columns: DashboardDataTableColumn<CrmExpense>[] = React.useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        className: "min-w-[88px]",
        cell: (row) => (
          <span className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {formatDateShort(row.expenseDate)}
          </span>
        ),
      },
      {
        id: "merchant",
        header: "Merchant",
        className: "min-w-[140px]",
        cell: (row) => (
          <span className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.merchant}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        className: "min-w-[100px]",
        cell: (row) => (
          <span className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.category}
          </span>
        ),
      },
      {
        id: "job",
        header: "Job",
        className: "min-w-[140px]",
        cell: (row) => (
          <span className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.location?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "method",
        header: "Method",
        className: "min-w-[120px]",
        cell: (row) => (
          <span className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.paymentMethod || "—"}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        className: "min-w-[96px]",
        align: "right",
        cell: (row) => (
          <span className="font-sans text-[13px] tracking-[-0.02em] text-[#FDFDFF]">
            {formatMoney(Number(row.amount) || 0)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[140px]",
        cell: (row) => {
          const meta = statusMeta(row.status);
          return (
            <DashboardBadge variant={meta.variant} pill>
              {meta.label}
            </DashboardBadge>
          );
        },
      },
      {
        id: "go",
        header: "",
        className: "w-10",
        align: "right",
        cell: () => (
          <ChevronRightIcon className="ml-auto shrink-0 text-[#959597]" />
        ),
      },
    ],
    [],
  );

  const panelTitle = `EXPENSES · ${formatRangeShort(from, to)} · ${total} ITEM${total === 1 ? "" : "S"}`;

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell p-6">
        <BrandLoader />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="bg-shell p-3 sm:p-6">
        <CrmLoadFailedState onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <DashboardPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">
          <h2 className="min-w-0 font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[14px]">
            {panelTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              aria-label="To date"
            />
            <DashboardToolbarButton onClick={() => setNewOpen(true)}>
              Add Expense
            </DashboardToolbarButton>
          </div>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        {items.length === 0 ? (
          <div className="p-4">
            <CrmEmptyTabState
              title="No expenses"
              description="Add an expense for this customer to see it here."
              addLabel="Add Expense"
              onAdd={() => setNewOpen(true)}
            />
          </div>
        ) : (
          <DashboardDataTable
            embedded
            columns={columns}
            rows={items}
            getRowId={(row) => row.id}
            onRowClick={(row) => setDetailId(row.id)}
          />
        )}
        <div className="divider-line-full w-full" aria-hidden />
        <div className="flex justify-end px-4 py-4">
          <p className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
            Total{" "}
            <span className="font-medium">{formatMoney(totalAmount)}</span>
          </p>
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
      </div>

      <NewExpenseModal
        open={newOpen}
        customerId={customerId}
        salesActivityId={activityId}
        onClose={() => {
          setNewOpen(false);
          if (searchParams.has("new") || searchParams.has("activityId")) {
            router.replace(`/crm/accounts/${customerId}/expenses`);
          }
        }}
        onCreated={(created) => {
          setItems((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
          setTotal((t) => t + 1);
          setTotalAmount((a) => a + (Number(created.amount) || 0));
        }}
      />

      <ExpenseDetailsModal
        open={Boolean(detailId)}
        expenseId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={(updated) => {
          setItems((prev) =>
            prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
          );
        }}
      />
    </div>
  );
}
