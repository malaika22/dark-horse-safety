"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import {
  DashboardTextField,
} from "./form-field";
import {
  DashboardDrawer,
  DashboardMenuPopover,
  DashboardModal,
  type DashboardMenuItem,
} from "./overlay";
import { DashboardToolbarButton } from "./toolbar";

export type DashboardFilterRadioValue = "yes" | "no" | "any";

export interface DashboardListFiltersState {
  field: string;
  type: string;
  status: string;
  msaStatus: string;
  hasOpenJobs: boolean;
  pricing: DashboardFilterRadioValue;
  reqForms: DashboardFilterRadioValue;
  routeRules: DashboardFilterRadioValue;
  assignedReps: string;
}

export const DEFAULT_LIST_FILTERS: DashboardListFiltersState = {
  field: "",
  type: "",
  status: "active",
  msaStatus: "current",
  hasOpenJobs: false,
  pricing: "yes",
  reqForms: "yes",
  routeRules: "yes",
  assignedReps: "reps-created",
};

export interface DashboardFiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  value: DashboardListFiltersState;
  onChange: (next: DashboardListFiltersState) => void;
  onApply: () => void;
  onClearAll: () => void;
  statusOptions?: { value: string; label: string }[];
  msaOptions?: { value: string; label: string }[];
  repOptions?: { value: string; label: string }[];
}

/** Generalized CRM filters drawer matching Figma Filters panel. */
export function DashboardFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  statusOptions = [
    { value: "active", label: "Active" },
    { value: "needs-review", label: "Needs review" },
    { value: "offline", label: "Offline" },
  ],
  msaOptions = [
    { value: "current", label: "Current" },
    { value: "expiring", label: "Expiring" },
    { value: "expired", label: "Expired" },
  ],
  repOptions = [
    { value: "reps-created", label: "Reps created" },
    { value: "all", label: "All reps" },
  ],
}: DashboardFiltersDrawerProps) {
  function patch(partial: Partial<DashboardListFiltersState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      widthClassName="max-w-[420px]"
      footer={
        <div className="flex items-center justify-between gap-3">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear all
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onApply();
                onClose();
              }}
            >
              Apply
            </DashboardToolbarButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <FilterRow label="Field">
          <input
            value={value.field}
            onChange={(e) => patch({ field: e.target.value })}
            className={filterControlClass}
            placeholder=""
          />
        </FilterRow>
        <FilterRow label="Type">
          <input
            value={value.type}
            onChange={(e) => patch({ type: e.target.value })}
            className={filterControlClass}
            placeholder=""
          />
        </FilterRow>
        <FilterRow label="Status">
          <FilterSelect
            value={value.status}
            onChange={(status) => patch({ status })}
            options={statusOptions}
          />
        </FilterRow>
        <FilterRow label="Msa status">
          <FilterSelect
            value={value.msaStatus}
            onChange={(msaStatus) => patch({ msaStatus })}
            options={msaOptions}
          />
        </FilterRow>
        <FilterRow label="Has open jobs?">
          <InlineToggle
            checked={value.hasOpenJobs}
            onCheckedChange={(checked) => patch({ hasOpenJobs: checked })}
          />
        </FilterRow>
        <FilterRadioRow
          label="Pricing"
          value={value.pricing}
          onChange={(pricing) => patch({ pricing })}
        />
        <FilterRadioRow
          label="Req. forms"
          value={value.reqForms}
          onChange={(reqForms) => patch({ reqForms })}
        />
        <FilterRadioRow
          label="Route rules"
          value={value.routeRules}
          onChange={(routeRules) => patch({ routeRules })}
        />
        <FilterRow label="Assigned reps">
          <FilterSelect
            value={value.assignedReps}
            onChange={(assignedReps) => patch({ assignedReps })}
            options={repOptions}
          />
        </FilterRow>
      </div>
    </DashboardDrawer>
  );
}

const filterControlClass =
  "h-8 w-full max-w-[200px] rounded-md border-0 bg-[#2A2A2A] px-2.5 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] outline-none";

function FilterChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative w-full max-w-[200px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(filterControlClass, "max-w-none appearance-none pr-8")}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
        <FilterChevronIcon />
      </span>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

function InlineToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
          checked ? "translate-x-4 bg-[#1A1A1A]" : "bg-[#959597]",
        )}
      />
    </button>
  );
}

function FilterRadioRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DashboardFilterRadioValue;
  onChange: (value: DashboardFilterRadioValue) => void;
}) {
  const options: DashboardFilterRadioValue[] = ["yes", "no", "any"];
  return (
    <FilterRow label={label}>
      <div className="flex items-center gap-4">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="inline-flex items-center gap-1.5 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]"
          >
            <span
              className={cn(
                "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                value === option ? "border-[#FDFDFF]" : "border-[#959597]",
              )}
            >
              {value === option ? (
                <span className="h-2 w-2 rounded-full bg-[#FDFDFF]" />
              ) : null}
            </span>
            {option}
          </button>
        ))}
      </div>
    </FilterRow>
  );
}

export interface DashboardSavedView {
  id: string;
  label: string;
}

export interface DashboardSaveViewsModalProps {
  open: boolean;
  onClose: () => void;
  views: DashboardSavedView[];
  activeViewId?: string | null;
  onSelectView: (id: string) => void;
  onSaveNewView: () => void;
  onViewAction?: (viewId: string, action: string) => void;
}

/** Saved views list modal. */
export function DashboardSaveViewsModal({
  open,
  onClose,
  views,
  activeViewId,
  onSelectView,
  onSaveNewView,
  onViewAction,
}: DashboardSaveViewsModalProps) {
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const menuAnchorRef = React.useRef<HTMLButtonElement | null>(null);
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const menuItems: DashboardMenuItem[] = [
    {
      id: "rename",
      label: "Rename",
      onSelect: () => menuFor && onViewAction?.(menuFor, "rename"),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      onSelect: () => menuFor && onViewAction?.(menuFor, "duplicate"),
    },
    {
      id: "share",
      label: "Share",
      onSelect: () => menuFor && onViewAction?.(menuFor, "share"),
    },
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      onSelect: () => menuFor && onViewAction?.(menuFor, "delete"),
    },
  ];

  return (
    <>
      <DashboardModal
        open={open}
        onClose={onClose}
        title="Save view"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF]"
            >
              Cancel
            </button>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onClose();
                onSaveNewView();
              }}
            >
              Save new view
            </DashboardToolbarButton>
          </>
        }
      >
        <p className="mb-3 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
          Current saved views
        </p>
        <ul className="space-y-1">
          {views.map((view) => {
            const active = view.id === activeViewId;
            return (
              <li
                key={view.id}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-2"
              >
                <button
                  type="button"
                  onClick={() => onSelectView(view.id)}
                  className="inline-flex min-w-0 items-center gap-2 font-sans text-[13px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]"
                >
                  <span className="truncate">{view.label}</span>
                  {active ? <CheckGlyph /> : null}
                </button>
                <button
                  ref={(node) => {
                    buttonRefs.current[view.id] = node;
                  }}
                  type="button"
                  aria-label={`${view.label} actions`}
                  onClick={(event) => {
                    event.stopPropagation();
                    const node = buttonRefs.current[view.id] ?? null;
                    menuAnchorRef.current = node;
                    setMenuFor((prev) => (prev === view.id ? null : view.id));
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
                >
                  ⋮
                </button>
              </li>
            );
          })}
        </ul>
      </DashboardModal>
      <DashboardMenuPopover
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        anchorRef={menuAnchorRef}
        items={menuItems}
        className="min-w-[140px]"
      />
    </>
  );
}

export interface DashboardSaveNewViewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { name: string; shareWithTeam: boolean }) => void;
  defaultName?: string;
}

/** Save new view name + share toggle modal. */
export function DashboardSaveNewViewModal({
  open,
  onClose,
  onConfirm,
  defaultName = "",
}: DashboardSaveNewViewModalProps) {
  const [name, setName] = React.useState(defaultName);
  const [shareWithTeam, setShareWithTeam] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setShareWithTeam(false);
    }
  }, [open, defaultName]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Save new view"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            variant="primary"
            onClick={() => {
              onConfirm({ name: name.trim() || "Untitled view", shareWithTeam });
              onClose();
            }}
          >
            Confirm
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-5">
        <DashboardTextField
          label="Name"
          value={name}
          placeholder="Example view"
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
            Share with team
          </span>
          <InlineToggle
            checked={shareWithTeam}
            onCheckedChange={setShareWithTeam}
          />
        </div>
      </div>
    </DashboardModal>
  );
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l5 5L19 7"
        stroke="#22C55E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
