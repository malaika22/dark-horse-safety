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
  DashboardPanel,
  DashboardPanelTitle,
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
  REQUIREMENTS_AFFECTED_TECHS,
  REQUIREMENTS_AFFECTED_WO,
  REQUIREMENTS_BLOCKED_BY,
  REQUIREMENTS_BLOCKED_PROCESSES,
  REQUIREMENTS_ENFORCEMENT,
  REQUIREMENTS_KPI,
  REQUIREMENTS_ROWS,
  REQUIREMENTS_SAVED_VIEWS,
  REQUIREMENTS_SORT_OPTIONS,
  REQUIREMENTS_STATUS_WELLS,
  type RequirementRow,
} from "./data/requirements.mock";

type RequirementFilters = {
  customer: string;
  requirementType: string;
  enforcement: string;
  status: string;
};

const DEFAULT_FILTERS: RequirementFilters = {
  customer: "",
  requirementType: "",
  enforcement: "",
  status: "",
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

const TYPE_OPTIONS = ["Safety", "Contract", "Insurance", "HR"];
const ENFORCEMENT_OPTIONS = ["Hard Block", "Soft Warn", "Advisory"];
const STATUS_OPTIONS = ["Met", "Review", "Expiring", "Missing"];

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

function RequirementsFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  value: RequirementFilters;
  onChange: (f: RequirementFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}) {
  function patch(p: Partial<RequirementFilters>) {
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
          <FilterSelectRow
            label="Requirement Type"
            value={value.requirementType}
            options={TYPE_OPTIONS}
            onChange={(v) => patch({ requirementType: v })}
          />
          <FilterSelectRow
            label="Enforcement"
            value={value.enforcement}
            options={ENFORCEMENT_OPTIONS}
            onChange={(v) => patch({ enforcement: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={STATUS_OPTIONS}
            onChange={(v) => patch({ status: v })}
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
  rows: RequirementRow[],
  field: string,
  dir: DashboardSortDirection,
) {
  return [...rows].sort((a, b) => {
    const d = dir === "asc" ? 1 : -1;
    switch (field) {
      case "requirement":
        return a.requirement.localeCompare(b.requirement) * d;
      case "status":
        return a.status.label.localeCompare(b.status.label) * d;
      case "type":
        return a.type.localeCompare(b.type) * d;
      case "owner":
        return a.owner.localeCompare(b.owner) * d;
      case "due":
        return a.due.localeCompare(b.due) * d;
      case "review":
        return a.review.label.localeCompare(b.review.label) * d;
      default:
        return a.customer.localeCompare(b.customer) * d;
    }
  });
}

function countTrailing(label: string) {
  return (
    <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
      {label}
    </span>
  );
}

function WidgetRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
      <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
        {left}
      </span>
      <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {right}
      </span>
    </div>
  );
}

export function RequirementsPage() {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDir, setSortDir] = React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<RequirementFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<RequirementFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen, setSaveNewOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>(
    REQUIREMENTS_SAVED_VIEWS,
  );
  const [activeViewId, setActiveViewId] = React.useState<string | null>(
    "view-1",
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = REQUIREMENTS_ROWS.filter((row) => {
      if (q) {
        const hay = [
          row.customer,
          row.code,
          row.requirement,
          row.owner,
          row.type,
        ]
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
          appliedFilters.requirementType &&
          row.type !== appliedFilters.requirementType
        ) {
          return false;
        }
        if (
          appliedFilters.status &&
          row.status.label.toLowerCase() !==
            appliedFilters.status.toLowerCase()
        ) {
          return false;
        }
      }
      return true;
    });
    return sortRows(rows, sortField, sortDir);
  }, [query, sortField, sortDir, appliedFilters, filtersApplied]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDir, pageSize, filtersApplied]);

  const columns: DashboardDataTableColumn<RequirementRow>[] = React.useMemo(
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
        id: "requirement",
        header: "Requirement",
        className: "min-w-[140px] max-w-[180px]",
        cell: (row) => row.requirement,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px] max-w-[140px]",
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
        id: "type",
        header: "Type",
        className: "hidden min-w-[100px] max-w-[130px] md:table-cell",
        cell: (row) => row.type,
      },
      {
        id: "owner",
        header: "Owner",
        className: "hidden min-w-[110px] max-w-[140px] md:table-cell",
        cell: (row) => row.owner,
      },
      {
        id: "due",
        header: "Due",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.due,
      },
      {
        id: "review",
        header: "Review",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.review.variant}
            pill
            className="max-w-full"
          >
            {row.review.label}
          </DashboardBadge>
        ),
      },
      {
        id: "docs",
        header: "Docs",
        className: "hidden min-w-[110px] max-w-[140px] xl:table-cell",
        cell: (row) => (
          <DashboardBadge
            variant={row.docs.variant}
            pill
            className="max-w-full"
          >
            {row.docs.label}
          </DashboardBadge>
        ),
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
                label: "Edit Requirement",
                onSelect: () =>
                  router.push(`/crm/requirements/${row.id}/edit`),
              },
              { id: "techs", label: "View Affected Technicians" },
              { id: "wo", label: "View Affected Work Orders" },
              { id: "level", label: "Change Enforcement Level" },
              { id: "delete", label: "Delete", destructive: true },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  const bulkOpen = selectedIds.length > 0;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {REQUIREMENTS_KPI.map((cell) => (
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
              <DashboardToolbarButton>Set Status</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "csv", label: "Export selected • CSV" },
                  { id: "all", label: "Export all • CSV" },
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
              placeholder="Search Requirements"
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
                options={REQUIREMENTS_SORT_OPTIONS}
                field={sortField}
                direction={sortDir}
                onFieldChange={setSortField}
                onDirectionChange={setSortDir}
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
        emptyMessage="No requirements found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/requirements/${row.id}/edit`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Affected Technicians"
              trailing={countTrailing("3 Technicians")}
            />
          </div>
          <div className="pb-2">
            {REQUIREMENTS_AFFECTED_TECHS.map((item) => (
              <WidgetRow
                key={item.id}
                left={item.name}
                right={item.role}
              />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Affected Work Orders"
              trailing={countTrailing("3 Work Orders")}
            />
          </div>
          <div className="pb-2">
            {REQUIREMENTS_AFFECTED_WO.map((item) => (
              <WidgetRow
                key={item.id}
                left={item.workOrder}
                right={item.priority}
              />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Requirement Status"
              trailing={countTrailing("12 Wells · 9 Active")}
            />
          </div>
          <div className="pb-2">
            {REQUIREMENTS_STATUS_WELLS.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </span>
                <DashboardBadge
                  variant={item.status.variant}
                  pill
                  className="shrink-0"
                >
                  {item.status.label}
                </DashboardBadge>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Enforcement Level"
              trailing={countTrailing("2 Active Rules")}
            />
          </div>
          <div className="pb-2">
            {REQUIREMENTS_ENFORCEMENT.map((item) => (
              <WidgetRow
                key={item.id}
                left={item.label}
                right={item.rate}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Who Does This Block?"
            trailing={countTrailing("4 People · 4 Processes")}
          />
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <ul className="flex list-none flex-col gap-3">
            {REQUIREMENTS_BLOCKED_BY.map((person) => (
              <li key={person.id} className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {person.initials}
                </span>
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {person.name}
                </span>
              </li>
            ))}
          </ul>
          <ul className="flex list-none flex-col gap-3 sm:items-end">
            {REQUIREMENTS_BLOCKED_PROCESSES.map((process) => (
              <li
                key={process}
                className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]"
              >
                {process}
              </li>
            ))}
          </ul>
        </div>
      </DashboardPanel>

      <RequirementsFiltersDrawer
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
        onSaveNewView={() => setSaveNewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") {
            setSavedViews((p) => p.filter((v) => v.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const src = savedViews.find((v) => v.id === viewId);
            if (!src) return;
            const id = `view-${Date.now()}`;
            setSavedViews((p) => [...p, { id, label: `${src.label} copy` }]);
          }
        }}
      />
      <DashboardSaveNewViewModal
        open={saveNewOpen}
        onClose={() => setSaveNewOpen(false)}
        onConfirm={({ name }) => {
          const id = `view-${Date.now()}`;
          setSavedViews((p) => [...p, { id, label: name }]);
          setActiveViewId(id);
        }}
      />
    </div>
  );
}
