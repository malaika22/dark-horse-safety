"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn, useScrollLock } from "@dark-horse-safety/ui";

const fieldClass =
  "h-10 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function useModalLock(open: boolean, onClose: () => void) {
  useScrollLock(open);
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type JobPackageOption = {
  id: string;
  label: string;
  hint: string;
  items: string[];
};

/** Live job packages are passed from Create Quote (customer pricing rules). */
export const QUOTE_JOB_PACKAGES: JobPackageOption[] = [];

export function JobTemplatePickerModal({
  open,
  packages,
  onClose,
  onSelect,
}: {
  open: boolean;
  packages?: JobPackageOption[];
  onClose: () => void;
  onSelect: (pkg: JobPackageOption) => void;
}) {
  useModalLock(open, onClose);
  const list = packages ?? [];
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[96]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick job template"
        className="absolute left-1/2 top-1/2 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#2D2D30] bg-[#121212] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <div>
            <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Pick Job Template
            </h2>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Apply package line items to this quote
            </p>
          </div>
          <CloseX onClick={onClose} />
        </div>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
          {list.length === 0 ? (
            <p className="px-4 py-6 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              Select a customer with active pricing rules to load live packages.
            </p>
          ) : (
            list.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => {
                  onSelect(pkg);
                  onClose();
                }}
                className="w-full rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <p className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {pkg.label}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                  {pkg.hint}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type CustomItemDraft = {
  name: string;
  description: string;
  qty: string;
  rate: string;
};

export function AddCustomItemModal({
  open,
  mode = "create",
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode?: "create" | "edit";
  initial?: Partial<CustomItemDraft> | null;
  onClose: () => void;
  onSubmit: (draft: CustomItemDraft) => void;
}) {
  useModalLock(open, onClose);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [rate, setRate] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setQty(initial?.qty ?? "");
    setRate(initial?.rate ?? "");
  }, [open, initial]);

  if (!open || typeof document === "undefined") return null;

  const canSubmit = Boolean(name.trim() && qty.trim() && rate.trim());

  return createPortal(
    <div className="fixed inset-0 z-[96]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit line item" : "Add custom item"}
        className="absolute left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {mode === "edit" ? "Edit Line Item" : "Add Custom Item"}
            </h2>
            {mode === "create" ? (
              <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                Not in the service catalogue
              </p>
            ) : null}
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Item Name<span className="text-[#FF4D4D]">*</span>
            </span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Mobilization Fee"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Description
            </span>
            <input
              className={fieldClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description (shown on the quote)"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="font-sans text-[11px] uppercase text-[#959597]">
                Qty<span className="text-[#FF4D4D]">*</span>
              </span>
              <input
                className={fieldClass}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-sans text-[11px] uppercase text-[#959597]">
                Rate<span className="text-[#FF4D4D]">*</span>
              </span>
              <input
                className={fieldClass}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="$0.00"
              />
            </label>
          </div>
        </div>

        {mode === "create" ? (
          <div
            className={cn(
              "mt-4 flex items-start gap-2 rounded-lg border border-[#E8C47C]/35 bg-[#E8C47C]/10 px-3 py-2.5 text-[#E8C47C]",
            )}
          >
            <span className="mt-0.5 shrink-0">
              <WarnIcon />
            </span>
            <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]">
              This item will be tagged Custom. It won&apos;t match automatically
              during billing reconciliation.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#2A2A2A] px-4 py-2.5 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#353535]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({
                name: name.trim(),
                description: description.trim(),
                qty: qty.trim(),
                rate: rate.trim(),
              });
              onClose();
            }}
            className="rounded-lg bg-[#FDFDFF] px-4 py-2.5 font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#0D0D0D] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Add Item"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
