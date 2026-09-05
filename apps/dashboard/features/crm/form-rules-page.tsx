"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardSavedView,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  FORM_RULES_KPI,
  FORM_RULES_ROWS,
  FORM_RULES_SAVED_VIEWS,
  FORM_RULES_SORT_OPTIONS,
  type FormRuleRow,
} from "./data/form-rules.mock";

type FormRuleFilters = {
  customer: string;
  form: string;
  jobType: string;
  hardGate: boolean;
  payrollBlocking: boolean;
};

const DEFAULT_FILTERS: FormRuleFilters = {
  customer: "",
  form: "",
  jobType: "",
  hardGate: false,
  payrollBlocking: false,
};

const CUSTOMER_OPTIONS = [
  "Permian Basin Energy",
  "Lonestar Oilfield",
  "Cactus Well Services",
  "Rio Grande Resources",
  "Delaware Basin Co.",
  "Frontier Energy LLC",
  "Summit Production",
  "Vaquero Oil & Gas",
];

function FilterCheckMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

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

function FilterSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="relative min-w-0 max-w-[200px] flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
          <FilterChevronIcon />
        </span>
      </div>
    </div>
  );
}

function FilterTextRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full max-w-[200px] rounded-md border-0 bg-[#2A2A2A] px-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      />
    </div>
  );
}

function FilterToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
            checked
              ? "translate-x-[18px] bg-[#1A1A1A]"
              : "translate-x-1 bg-[#FDFDFF]"
          }`}
        />
      </button>
    </div>
  );
}

function FormRulesFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  value: FormRuleFilters;
  onChange: (f: FormRuleFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}) {
  function patch(p: Partial<FormRuleFilters>) {
    onChange({ ...value, ...p });
  }

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close filters backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Filters
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <FilterSelectRow
            label="Customer"
            value={value.customer}
            options={CUSTOMER_OPTIONS}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterTextRow
            label="Form"
            value={value.form}
            onChange={(v) => patch({ form: v })}
          />
          <FilterTextRow
            label="Job Type"
            value={value.jobType}
            onChange={(v) => patch({ jobType: v })}
          />
          <FilterToggleRow
            label="Hard Gate"
            checked={value.hardGate}
            onChange={(v) => patch({ hardGate: v })}
          />
          <FilterToggleRow
            label="Payroll Blocking"
            checked={value.payrollBlocking}
            onChange={(v) => patch({ payrollBlocking: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
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
      </aside>
    </div>,
    document.body,
  );
}

function sortRows(
  rows: FormRuleRow[],
  field: string,
  direction: DashboardSortDirection,
) {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "status":
        return a.status.label.localeCompare(b.status.label) * dir;
      case "formTemplate":
      case "template":
        return a.formTemplate.localeCompare(b.formTemplate) * dir;
      case "trigger":
        return a.trigger.localeCompare(b.trigger) * dir;
      case "hardGate":
        return a.hardGate.localeCompare(b.hardGate) * dir;
      case "appliesTo":
        return a.appliesTo.localeCompare(b.appliesTo) * dir;
      case "version":
        return a.version.localeCompare(b.version) * dir;
      case "owner":
        return a.owner.localeCompare(b.owner) * dir;
      case "customer":
      default:
        return a.customer.localeCompare(b.customer) * dir;
    }
  });
}

export function FormRulesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<FormRuleFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<FormRuleFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] =
    React.useState<DashboardSavedView[]>(FORM_RULES_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(
    "view-1",
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = FORM_RULES_ROWS.filter((row) => {
      if (q) {
        const hay = [row.customer, row.code, row.formTemplate, row.owner]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filtersApplied) {
        if (
          appliedFilters.customer &&
          row.customer !== appliedFilters.customer
        ) {
          return false;
        }
        if (
          appliedFilters.form &&
          !row.formTemplate
            .toLowerCase()
            .includes(appliedFilters.form.toLowerCase())
        ) {
          return false;
        }
        if (
          appliedFilters.jobType &&
          !row.appliesTo
            .toLowerCase()
            .includes(appliedFilters.jobType.toLowerCase())
        ) {
          return false;
        }
        if (appliedFilters.hardGate && row.hardGate.toLowerCase() !== "yes") {
          return false;
        }
      }
      return true;
    });
    return sortRows(rows, sortField, sortDirection);
  }, [query, sortField, sortDirection, appliedFilters, filtersApplied]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDirection, pageSize, filtersApplied]);

  const columns: DashboardDataTableColumn<FormRuleRow>[] = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px] max-w-[240px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.customer}
            subtitle={row.code}
            underline
          />
        ),
      },
      {
        id: "template",
        header: "Form Template",
        className: "min-w-[160px]",
        cell: (row) => row.formTemplate,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge
            variant={row.status.variant}
            pill
            className="max-w-full"
          >
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        className: "min-w-[120px] hidden md:table-cell",
        cell: (row) => row.trigger,
      },
      {
        id: "hardGate",
        header: "Hard-Gate",
        className: "min-w-[90px] hidden lg:table-cell",
        cell: (row) => row.hardGate,
      },
      {
        id: "appliesTo",
        header: "Applies To",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => row.appliesTo,
      },
      {
        id: "version",
        header: "Version",
        className: "min-w-[80px] hidden xl:table-cell",
        cell: (row) => row.version,
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[110px] hidden xl:table-cell",
        cell: (row) => row.owner,
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "edit",
                label: "Edit Rule",
                onSelect: () =>
                  router.push(`/crm/form-rules/${row.id}/edit`),
              },
              { id: "view-tpl", label: "View Form Template" },
              { id: "test", label: "Test Rule Against a Job Type" },
              { id: "copy", label: "Copy Rules to Another Customer" },
              { id: "delete", label: "Delete Rule", destructive: true },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {FORM_RULES_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]">
                Delete
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV" },
                  { id: "all-csv", label: "Export all • CSV" },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Form Rules"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              rightIcon={
                <FilterCheckMarkIcon className="shrink-0 text-[#959597]" />
              }
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              Filter
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardSortMenu
                options={FORM_RULES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                leftIcon={<ClipboardIcon className="shrink-0" />}
                onClick={() => setSavedViewsOpen(true)}
              >
                Payroll Review
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv", label: "Export all • CSV" },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
            </>
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={pageRows}
        getRowId={(row) => row.id}
        emptyMessage="No form rules found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/form-rules/${row.id}/edit`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <FormRulesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setFiltersApplied(false);
        }}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") {
            setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (!source) return;
            const id = `view-${Date.now()}`;
            setSavedViews((prev) => [
              ...prev,
              { id, label: `${source.label} copy` },
            ]);
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          const id = `view-${Date.now()}`;
          setSavedViews((prev) => [...prev, { id, label: name }]);
          setActiveViewId(id);
        }}
      />
    </div>
  );
}
