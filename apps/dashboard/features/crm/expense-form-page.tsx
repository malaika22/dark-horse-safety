"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToggle,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInput(iso?: string | null) {
  if (!iso) return todayIso();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayIso();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Add / Edit Expense — live lookups + API.
 */
export function ExpenseFormPage({
  mode = "create",
  customerId,
  expenseId,
}: {
  mode?: "create" | "edit";
  customerId: string;
  expenseId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  useSetHeaderBreadcrumb(
    isEdit
      ? "Accounts / Customers / Expenses / Edit Expense"
      : "Accounts / Customers / Expenses / Add Expense",
  );

  const { lookups } = useCrmLookups();
  const categoryOptions = lookupOptions(lookups, "expenseCategories");
  const methodOptions = lookupOptions(lookups, "expensePaymentMethods");
  const statusOptions = lookupOptions(lookups, "expenseStatuses");

  const [expenseDate, setExpenseDate] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [reimbursable, setReimbursable] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [receiptUrl, setReceiptUrl] = React.useState("");
  const [locationOptions, setLocationOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(isEdit);

  const activityId = searchParams.get("activityId") ?? undefined;
  const cancelHref = `/crm/accounts/${customerId}/expenses`;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const locs = await crmApi.listLocations({
          customerId,
          pageSize: 200,
          sort: "name",
          direction: "asc",
        });
        if (cancelled) return;
        setLocationOptions(
          (locs.data.items ?? []).map((l) => ({
            value: l.id,
            label: l.name,
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (!isEdit || !expenseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getExpense(expenseId);
        if (cancelled) return;
        const e = res.data;
        setExpenseDate(toDateInput(e.expenseDate));
        setMerchant(e.merchant ?? "");
        setCategory(e.category ?? "");
        setLocationId(e.locationId ?? "");
        setPaymentMethod(e.paymentMethod ?? "");
        setAmount(e.amount != null ? String(e.amount) : "");
        setStatus(e.status ?? "PENDING");
        setReimbursable(Boolean(e.reimbursable));
        setNotes(e.notes ?? "");
        setReceiptUrl(e.receiptUrl ?? "");
      } catch (err) {
        toastApiError(err);
        setSaveError(
          err instanceof Error ? err.message : "Failed to load expense",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, expenseId]);

  const buildBody = () => {
    const amountNum = Number(amount);
    if (!merchant.trim()) {
      toastValidationError("Merchant is required");
      return null;
    }
    if (!category.trim()) {
      toastValidationError("Category is required");
      return null;
    }
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toastValidationError("Enter a valid amount");
      return null;
    }
    return {
      expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
      merchant: merchant.trim(),
      category: category.trim(),
      amount: amountNum,
      customerId,
      paymentMethod: paymentMethod.trim() || undefined,
      status: status || "PENDING",
      reimbursable,
      locationId: locationId || undefined,
      notes: notes.trim() || undefined,
      receiptUrl: receiptUrl.trim() || undefined,
      salesActivityId: activityId,
    };
  };

  const save = async (andAnother: boolean) => {
    const body = buildBody();
    if (!body) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      if (isEdit && expenseId) {
        await crmApi.updateExpense(expenseId, body);
        toastSuccess("Expense updated");
        router.push(cancelHref);
      } else {
        await crmApi.createExpense(body);
        toastSuccess("Expense added");
        if (andAnother) {
          setExpenseDate("");
          setMerchant("");
          setCategory("");
          setLocationId("");
          setPaymentMethod("");
          setAmount("");
          setStatus("");
          setReimbursable(false);
          setNotes("");
          setReceiptUrl("");
        } else {
          router.push(cancelHref);
        }
      }
    } catch (err) {
      toastApiError(err);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading…
      </div>
    );
  }

  return (
    <CrmFormPageShell
      cancelHref={cancelHref}
      submitLabel={isEdit ? "Save" : "Save"}
      submitting={submitting}
      saveError={saveError}
      onDiscardSave={() => setSaveError(null)}
      onRetrySave={() => void save(false)}
      onSave={() => void save(false)}
      onSaveAndAddAnother={isEdit ? undefined : () => void save(true)}
      sections={[
        {
          title: "Expense Details",
          content: (
            <DashboardFormGrid>
              <DashboardTextField
                label="Date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
              <DashboardTextField
                label="Merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Shell #4021"
                required
              />
              <DashboardSelectField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
                placeholder="Select category"
                required
              />
              <DashboardSelectField
                label="Job"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                options={locationOptions}
                placeholder="Select job / location"
              />
              <DashboardSelectField
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={methodOptions}
                placeholder="Select method"
              />
              <DashboardTextField
                label="Amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <DashboardSelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={statusOptions}
              />
              <DashboardTextField
                label="Receipt URL"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="Optional"
              />
              <div className="flex items-center sm:col-span-2">
                <DashboardToggle
                  label="Reimbursable"
                  checked={reimbursable}
                  onCheckedChange={setReimbursable}
                />
              </div>
              <div className="sm:col-span-2">
                <DashboardTextAreaField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
