"use client";

import * as React from "react";
import {
  DashboardDrawer,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";

export type FleetFilterValues = {
  status: string;
  result: string;
  type: string;
  asset: string;
  parentTruck: string;
  inspector: string;
  dateFrom: string;
  dateTo: string;
  hasLinkedRepair: boolean;
  payrollBlocking: boolean;
};

export type FleetFilterField = keyof FleetFilterValues;

export const DEFAULT_FLEET_FILTERS: FleetFilterValues = {
  status: "",
  result: "",
  type: "",
  asset: "",
  parentTruck: "",
  inspector: "",
  dateFrom: "",
  dateTo: "",
  hasLinkedRepair: false,
  payrollBlocking: false,
};

export function countActiveFleetFilters(values: FleetFilterValues): number {
  let n = 0;
  if (values.status) n++;
  if (values.result) n++;
  if (values.type) n++;
  if (values.asset) n++;
  if (values.parentTruck) n++;
  if (values.inspector) n++;
  if (values.dateFrom) n++;
  if (values.dateTo) n++;
  if (values.hasLinkedRepair) n++;
  if (values.payrollBlocking) n++;
  return n;
}

const inputClass =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none";
const labelClass =
  "mb-1.5 block font-sans text-[10px] uppercase text-[#959597]";

type FleetFiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  draft: FleetFilterValues;
  onDraftChange: (next: FleetFilterValues) => void;
  onApply: () => void;
  onClearAll: () => void;
  fields: FleetFilterField[];
  statusOptions?: string[];
  resultOptions?: string[];
};

export function FleetFiltersDrawer({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onClearAll,
  fields,
  statusOptions = [],
  resultOptions = [],
}: FleetFiltersDrawerProps) {
  const active = countActiveFleetFilters(draft);
  const title =
    active > 0 ? `FILTERS (${active} ACTIVE)` : "FILTERS";

  const show = (field: FleetFilterField) => fields.includes(field);

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <DashboardToolbarButton onClick={onClearAll}>
            Clear All
          </DashboardToolbarButton>
          <DashboardToolbarButton variant="primary" onClick={onApply}>
            Apply
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        {show("status") ? (
          <label className="block">
            <span className={labelClass}>Status</span>
            <select
              value={draft.status}
              onChange={(e) =>
                onDraftChange({ ...draft, status: e.target.value })
              }
              className={inputClass}
            >
              <option value="">ANY</option>
              {statusOptions.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {show("result") ? (
          <label className="block">
            <span className={labelClass}>Result</span>
            <select
              value={draft.result}
              onChange={(e) =>
                onDraftChange({ ...draft, result: e.target.value })
              }
              className={inputClass}
            >
              <option value="">ANY</option>
              {resultOptions.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {show("type") ? (
          <label className="block">
            <span className={labelClass}>Type</span>
            <input
              value={draft.type}
              onChange={(e) =>
                onDraftChange({ ...draft, type: e.target.value })
              }
              className={inputClass}
              placeholder="UNIT INSPECTION, TRUCK SAFETY…"
            />
          </label>
        ) : null}

        {show("asset") ? (
          <label className="block">
            <span className={labelClass}>Asset</span>
            <input
              value={draft.asset}
              onChange={(e) =>
                onDraftChange({ ...draft, asset: e.target.value })
              }
              className={inputClass}
              placeholder="ASSET NAME OR ID"
            />
          </label>
        ) : null}

        {show("parentTruck") ? (
          <label className="block">
            <span className={labelClass}>Parent Truck</span>
            <input
              value={draft.parentTruck}
              onChange={(e) =>
                onDraftChange({ ...draft, parentTruck: e.target.value })
              }
              className={inputClass}
              placeholder="TRUCK 101"
            />
          </label>
        ) : null}

        {show("inspector") ? (
          <label className="block">
            <span className={labelClass}>Inspector</span>
            <input
              value={draft.inspector}
              onChange={(e) =>
                onDraftChange({ ...draft, inspector: e.target.value })
              }
              className={inputClass}
              placeholder="TECH NAME"
            />
          </label>
        ) : null}

        {show("dateFrom") || show("dateTo") ? (
          <div className="grid grid-cols-2 gap-3">
            {show("dateFrom") ? (
              <label className="block">
                <span className={labelClass}>Date From</span>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) =>
                    onDraftChange({ ...draft, dateFrom: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            ) : null}
            {show("dateTo") ? (
              <label className="block">
                <span className={labelClass}>Date To</span>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) =>
                    onDraftChange({ ...draft, dateTo: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {show("hasLinkedRepair") ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.hasLinkedRepair}
              onChange={(e) =>
                onDraftChange({
                  ...draft,
                  hasLinkedRepair: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-[#2D2D30] bg-[#1A1A1A]"
            />
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Has Linked Repair
            </span>
          </label>
        ) : null}

        {show("payrollBlocking") ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.payrollBlocking}
              onChange={(e) =>
                onDraftChange({
                  ...draft,
                  payrollBlocking: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-[#2D2D30] bg-[#1A1A1A]"
            />
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              Payroll Blocking
            </span>
          </label>
        ) : null}
      </div>
    </DashboardDrawer>
  );
}

export function fleetFiltersToParams(
  filters: FleetFilterValues,
): Record<string, string | boolean | undefined> {
  return {
    status: filters.status || undefined,
    result: filters.result || undefined,
    type: filters.type.trim() || undefined,
    asset: filters.asset.trim() || undefined,
    parentTruck: filters.parentTruck.trim() || undefined,
    inspector: filters.inspector.trim() || undefined,
    from: filters.dateFrom || undefined,
    to: filters.dateTo || undefined,
    hasLinkedRepair: filters.hasLinkedRepair || undefined,
    payrollBlocking: filters.payrollBlocking || undefined,
  };
}
