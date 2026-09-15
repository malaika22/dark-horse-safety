"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmExpense } from "@/lib/crm-api";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";

export const EXPENSE_AUTO_APPROVAL_THRESHOLD = 50;

type Attendee = { id: string; label: string; kind: "contact" | "user" };

function parseAmount(raw: string) {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function isCompanyCard(method: string) {
  const m = method.toLowerCase();
  if (!m.trim()) return true;
  if (m.includes("cash") || m.includes("personal")) return false;
  return true;
}

function needsAttendees(category: string) {
  const c = category.toLowerCase();
  return c.includes("meal") || c.includes("entertainment");
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function DollarTitleIcon() {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3E3E3E] bg-[#2A2A2A] font-sans text-[14px] font-[510] text-[#FDFDFF]"
      aria-hidden
    >
      $
    </span>
  );
}

/**
 * New Expense entry modal — Figma layout + live API.
 */
export function NewExpenseModal({
  open,
  customerId,
  salesActivityId,
  defaults,
  onClose,
  onCreated,
}: {
  open: boolean;
  customerId: string;
  salesActivityId?: string;
  defaults?: {
    merchant?: string;
    amount?: number | string;
    expenseDate?: string;
    paymentMethod?: string;
  };
  onClose: () => void;
  onCreated?: (expense: CrmExpense) => void;
}) {
  const { lookups } = useCrmLookups();
  const categoryOptions = lookupOptions(lookups, "expenseCategories");
  const methodOptions = lookupOptions(lookups, "expensePaymentMethods");

  const [merchant, setMerchant] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [noReceipt, setNoReceipt] = React.useState(false);
  const [missingReason, setMissingReason] = React.useState("");
  const [attendees, setAttendees] = React.useState<Attendee[]>([]);
  const [attendeePool, setAttendeePool] = React.useState<Attendee[]>([]);
  const [addingAttendee, setAddingAttendee] = React.useState(false);
  const [locationOptions, setLocationOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [locationsLoading, setLocationsLoading] = React.useState(false);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState<"draft" | "save" | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const amountNum = parseAmount(amount);
  const overThreshold =
    Number.isFinite(amountNum) && amountNum > EXPENSE_AUTO_APPROVAL_THRESHOLD;
  const reimbursable = !isCompanyCard(paymentMethod);
  const showAttendeeHint = needsAttendees(category);

  const reset = React.useCallback(() => {
    const dateFromDefault = defaults?.expenseDate
      ? defaults.expenseDate.slice(0, 10)
      : "";
    setMerchant(defaults?.merchant ?? "");
    setAmount(
      defaults?.amount != null && defaults.amount !== ""
        ? String(defaults.amount)
        : "",
    );
    setExpenseDate(dateFromDefault);
    setCategory("");
    setPaymentMethod(defaults?.paymentMethod ?? "");
    setLocationId("");
    setNotes("");
    setNoReceipt(false);
    setMissingReason("");
    setAttendees([]);
    setAddingAttendee(false);
    setReceiptFile(null);
    setBusy(null);
    setDragOver(false);
  }, [defaults]);

  React.useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  React.useEffect(() => {
    if (!open || !customerId) return;
    let cancelled = false;
    (async () => {
      setLocationsLoading(true);
      try {
        const [locs, customer, reps] = await Promise.all([
          crmApi.listLocations({
            customerId,
            pageSize: 200,
            sort: "name",
            direction: "asc",
          }),
          crmApi.getCustomer(customerId),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        setLocationOptions(
          (locs.data.items ?? []).map((l) => ({
            value: l.id,
            label: l.name,
          })),
        );
        const contactAttendees: Attendee[] = (customer.data.contacts ?? []).map(
          (c) => ({
            id: c.id,
            label: c.fullName,
            kind: "contact" as const,
          }),
        );
        const userAttendees: Attendee[] = (reps.data ?? []).map((r) => ({
          id: r.id,
          label:
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
            r.email ||
            r.id,
          kind: "user" as const,
        }));
        setAttendeePool([...contactAttendees, ...userAttendees]);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  React.useEffect(() => {
    if (noReceipt) setReceiptFile(null);
  }, [noReceipt]);

  const availableAttendees = attendeePool.filter(
    (a) => !attendees.some((x) => x.id === a.id),
  );

  function acceptFile(file: File | null | undefined) {
    if (!file) return;
    const ok =
      /^(image\/(jpeg|jpg|png)|application\/pdf)$/i.test(file.type) ||
      /\.(jpe?g|png|pdf)$/i.test(file.name);
    if (!ok) {
      toastValidationError("Receipt must be JPG, PNG, or PDF");
      return;
    }
    setReceiptFile(file);
    setNoReceipt(false);
  }

  function validate(asDraft: boolean): string | null {
    if (!merchant.trim()) return "Merchant is required";
    if (!Number.isFinite(amountNum) || amountNum < 0) return "Enter a valid amount";
    if (!expenseDate) return "Date is required";
    if (!category.trim()) return "Category is required";
    if (asDraft) return null;

    if (showAttendeeHint && attendees.length === 0) {
      return "Add attendees for meals / entertainment (IRS substantiation)";
    }
    if (noReceipt) {
      if (!missingReason.trim()) {
        return "Reason is required when no receipt is provided";
      }
    } else if (!receiptFile && overThreshold) {
      return "A receipt is required above the threshold unless marked missing with a reason";
    } else if (!receiptFile) {
      return "Attach a receipt or mark No Receipt";
    }
    return null;
  }

  async function buildPayload(status: string) {
    let receiptUrl: string | undefined;
    let receiptFileName: string | undefined;
    let receiptFileSizeBytes: number | undefined;
    let receiptCaptureMethod: string | undefined;
    let receiptCapturedAt: string | undefined;
    let receiptLat: number | undefined;
    let receiptLng: number | undefined;

    if (receiptFile && !noReceipt) {
      const contentBase64 = await fileToBase64(receiptFile);
      const uploaded = await crmApi.uploadFile({
        folder: "expenses",
        fileName: receiptFile.name,
        mimeType: receiptFile.type || undefined,
        contentBase64,
      });
      receiptUrl = uploaded.data.url;
      receiptFileName = uploaded.data.fileName || receiptFile.name;
      receiptFileSizeBytes = uploaded.data.sizeBytes || receiptFile.size;
      receiptCaptureMethod = "UPLOAD";
      receiptCapturedAt = new Date().toISOString();
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60_000,
            });
          });
          receiptLat = pos.coords.latitude;
          receiptLng = pos.coords.longitude;
        } catch {
          // GPS optional — never invent coordinates
        }
      }
    }

    return {
      customerId,
      salesActivityId: salesActivityId || undefined,
      expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
      merchant: merchant.trim(),
      category: category.trim(),
      amount: amountNum,
      paymentMethod: paymentMethod.trim() || undefined,
      locationId: locationId || undefined,
      notes: notes.trim() || undefined,
      reimbursable,
      attendees: attendees.length ? attendees : [],
      noReceipt,
      missingReceiptReason: noReceipt ? missingReason.trim() : undefined,
      receiptUrl,
      receiptFileName,
      receiptFileSizeBytes,
      receiptCaptureMethod,
      receiptCapturedAt,
      receiptLat,
      receiptLng,
      status,
    };
  }

  async function submit(asDraft: boolean) {
    const err = validate(asDraft);
    if (err) {
      toastValidationError(err);
      return;
    }

    let status = "DRAFT";
    if (!asDraft) {
      if (noReceipt) status = "MISSING_RECEIPT";
      else if (overThreshold) status = "PENDING";
      else status = "APPROVED";
    }

    setBusy(asDraft ? "draft" : "save");
    try {
      const body = await buildPayload(status);
      const res = await crmApi.createExpense(body);
      toastSuccess(asDraft ? "Draft saved" : "Expense saved");
      onCreated?.(res.data);
      onClose();
    } catch (e) {
      toastApiError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="New Expense"
      titleLeading={<DollarTitleIcon />}
      widthClassName="max-w-[640px]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center px-3 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:text-white"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            disabled={busy !== null}
            onClick={() => void submit(true)}
          >
            {busy === "draft" ? "Saving…" : "Save Draft"}
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy !== null}
            onClick={() => void submit(false)}
          >
            {busy === "save" ? "Saving…" : "Save Expense"}
          </DashboardToolbarButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardTextField
            label="Merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Shell #4021"
          />
          <div className="space-y-1.5">
            <DashboardTextField
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$142.60"
              inputMode="decimal"
            />
            {overThreshold ? (
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#C4A35A]">
                Requires approval — over the $
                {EXPENSE_AUTO_APPROVAL_THRESHOLD} auto-approval threshold.
              </p>
            ) : null}
          </div>
          <DashboardTextField
            label="Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          <DashboardSelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
            placeholder="Select category"
          />
          <DashboardSelectField
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={methodOptions}
            placeholder="Select method"
          />
          <DashboardSelectField
            label="Job"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locationOptions}
            loading={locationsLoading}
            placeholder="Select job / location"
            emptyMessage="No jobs for this customer"
          />
        </div>

        <div className="space-y-2">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Attendees
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {attendees.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
              >
                {a.label}
                <button
                  type="button"
                  aria-label={`Remove ${a.label}`}
                  onClick={() =>
                    setAttendees((prev) => prev.filter((x) => x.id !== a.id))
                  }
                  className="text-[#959597] hover:text-[#FDFDFF]"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setAddingAttendee((v) => !v)}
              className="inline-flex items-center rounded-md border border-dashed border-[#3E3E3E] px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
            >
              + Add attendee
            </button>
          </div>
          {addingAttendee ? (
            <div className="flex flex-wrap gap-2">
              {availableAttendees.length ? (
                availableAttendees.map((a) => (
                  <button
                    key={`${a.kind}-${a.id}`}
                    type="button"
                    onClick={() => {
                      setAttendees((prev) => [...prev, a]);
                      setAddingAttendee(false);
                    }}
                    className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5"
                  >
                    {a.label}
                    <span className="ml-1 text-[#6F6F72]">
                      · {a.kind === "user" ? "DH" : "Customer"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                  No more attendees available.
                </p>
              )}
            </div>
          ) : null}
          {showAttendeeHint ? (
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              Required for meals/entertainment for IRS substantiation.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5">
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Reimbursable
            </span>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {reimbursable ? "YES · PERSONAL" : "NO · COMPANY CARD"}
            </span>
          </div>
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            Derived from payment method. Company cards are never reimbursable.
          </p>
        </div>

        <DashboardTextAreaField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Fuel for crew truck — Permian Basin site run."
        />

        <div className="space-y-2">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Receipt
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={noReceipt}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!noReceipt) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (noReceipt) return;
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={
              dragOver
                ? "flex min-h-[88px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#C4A35A] bg-[#2A2618] px-4 py-6 text-center transition-colors disabled:opacity-40"
                : "flex min-h-[88px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#3E3E3E] bg-[#1A1A1A] px-4 py-6 text-center transition-colors hover:border-[#5A5A5A] disabled:opacity-40"
            }
          >
            <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
              {receiptFile
                ? `${receiptFile.name} · ${
                    receiptFile.size >= 1024 * 1024
                      ? `${(receiptFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(receiptFile.size / 1024)} KB`
                  }`
                : "Drop receipt or click to upload — JPG, PNG, PDF"}
            </span>
            {receiptFile ? (
              <span
                role="link"
                tabIndex={0}
                className="mt-2 font-sans text-[10px] uppercase text-[#C4A35A] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptFile(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setReceiptFile(null);
                  }
                }}
              >
                Remove
              </span>
            ) : null}
          </button>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={noReceipt}
              onChange={(e) => setNoReceipt(e.target.checked)}
              className="h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-[#3E3E3E] bg-[#1A1A1A] checked:border-[#FDFDFF] checked:bg-[#FDFDFF] checked:bg-[length:12px_12px] checked:bg-center checked:bg-no-repeat"
              style={
                noReceipt
                  ? {
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23121212' d='M6.5 11.2 3.3 8l1.1-1.1 2.1 2.1 5-5L12.6 5z'/%3E%3C/svg%3E\")",
                    }
                  : undefined
              }
            />
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              No Receipt
            </span>
          </label>

          {noReceipt ? (
            <div className="space-y-1.5">
              <DashboardTextAreaField
                label="Reason *"
                value={missingReason}
                onChange={(e) => setMissingReason(e.target.value)}
                rows={2}
                placeholder="E.g. receipt lost, faded beyond legibility, vendor did not provide one"
              />
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                Shown when &apos;No Receipt&apos; is checked. Required to submit
                without a receipt.
              </p>
            </div>
          ) : null}

          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            A receipt is required above the threshold unless marked missing with
            a reason.
          </p>
        </div>
      </div>
    </DashboardModal>
  );
}
