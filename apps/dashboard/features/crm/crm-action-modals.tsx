"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";

export type CrmPickOption = { value: string; label: string; hint?: string };

/**
 * Shared dark-shell picker for copy-to-customer / copy-to-location / test job type.
 */
export function CrmPickModal({
  open,
  title,
  label = "Select",
  options,
  confirmLabel = "Confirm",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  label?: string;
  options: CrmPickOption[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValue("");
    setBusy(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, options, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute left-1/2 top-1/2 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2D2D30] bg-[#0D0D0D] p-5 shadow-2xl"
      >
        <h2 className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            {label}
          </span>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
          >
            <option value="">
              {options.length === 0 ? "No options" : "Select…"}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.hint ? `${o.label} · ${o.hint}` : o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={!value || busy}
            className="!text-[#0D0D0D]"
            onClick={() => {
              if (!value) return;
              void (async () => {
                setBusy(true);
                try {
                  await onConfirm(value);
                  onClose();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {confirmLabel}
          </DashboardToolbarButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CrmHistoryModal({
  open,
  title,
  events,
  onClose,
}: {
  open: boolean;
  title: string;
  events: { id: string; at: string; label: string; detail?: string }[];
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 flex max-h-[80vh] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </h2>
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {events.length === 0 ? (
            <p className="font-sans text-[12px] uppercase text-[#959597]">
              No history events
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-[#2D2D30] bg-[#161618] px-3 py-2.5"
              >
                <p className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                  {ev.label}
                </p>
                {ev.detail ? (
                  <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                    {ev.detail}
                  </p>
                ) : null}
                <p className="mt-1.5 font-sans text-[10px] uppercase tabular-nums text-[#959597]">
                  {ev.at}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CrmPromptFieldsModal({
  open,
  title,
  fields,
  confirmLabel = "Run test",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
  }[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (values: Record<string, string>) => void | Promise<void>;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = f.defaultValue ?? "";
    setValues(next);
    setBusy(false);
  }, [open, fields]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2D2D30] bg-[#0D0D0D] p-5 shadow-2xl"
      >
        <h2 className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {f.label}
              </span>
              <input
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className="h-10 w-full rounded-md border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy}
            className="!text-[#0D0D0D]"
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onConfirm(values);
                  onClose();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {confirmLabel}
          </DashboardToolbarButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
