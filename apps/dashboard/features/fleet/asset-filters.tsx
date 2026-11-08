"use client";

import * as React from "react";

export type AssetFilterState = {
  readinessBelow: string;
  issue: string;
  parent: string;
  location: string;
  type: string;
};

export const EMPTY_ASSET_FILTERS: AssetFilterState = {
  readinessBelow: "",
  issue: "",
  parent: "",
  location: "",
  type: "",
};

const ISSUES = [
  { value: "", label: "All issue types" },
  { value: "FAILED_INSPECTION", label: "Failed inspection" },
  { value: "CALIBRATION_EXPIRED", label: "Expired calibration" },
  { value: "OPEN_REPAIR", label: "Open repair" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
  { value: "MISSING", label: "Missing" },
  { value: "LOW_STOCK", label: "Low stock" },
];

export function AssetFiltersDrawer({
  open,
  value,
  parents,
  locations,
  types,
  onClose,
  onApply,
}: {
  open: boolean;
  value: AssetFilterState;
  parents: string[];
  locations: string[];
  types: string[];
  onClose: () => void;
  onApply: (next: AssetFilterState) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50">
      <button type="button" aria-label="Close filters" className="flex-1" onClick={onClose} />
      <aside className="flex h-full w-full max-w-sm flex-col border-l border-[#2D2D30] bg-[#101010] p-5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-sans text-[16px] uppercase tracking-[-0.02em] text-[#FDFDFF]">Filters</h2>
          <button type="button" className="text-[#C8C8C8]" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="space-y-4">
          <Field label="Readiness below">
            <input
              inputMode="numeric"
              value={draft.readinessBelow}
              placeholder="80%"
              onChange={(event) => setDraft({ ...draft, readinessBelow: event.target.value.replace(/[^\d]/g, "") })}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[13px] text-[#FDFDFF]"
            />
          </Field>
          <Field label="Issue type">
            <select
              value={draft.issue}
              onChange={(event) => setDraft({ ...draft, issue: event.target.value })}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            >
              {ISSUES.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parent truck">
            <select
              value={draft.parent}
              onChange={(event) => setDraft({ ...draft, parent: event.target.value })}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            >
              <option value="">Any truck</option>
              {parents.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <select
              value={draft.location}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            >
              <option value="">Any location</option>
              {locations.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Asset type">
            <select
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value })}
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
            >
              <option value="">All asset types</option>
              {types.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-auto flex gap-2 pt-6">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#2D2D30] py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
            Close
          </button>
          <button
            type="button"
            onClick={() => setDraft(EMPTY_ASSET_FILTERS)}
            className="flex-1 rounded-lg border border-[#2D2D30] py-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-lg bg-[#FDFDFF] py-2 font-sans text-[11px] uppercase text-[#121212]"
          >
            Apply
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{label}</span>
      {children}
    </label>
  );
}
