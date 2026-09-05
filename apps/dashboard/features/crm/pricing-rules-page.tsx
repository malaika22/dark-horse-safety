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
  PRICING_PERMISSION_GATES,
  PRICING_RATE_CHANGES,
  PRICING_RULES_KPI,
  PRICING_RULES_ROWS,
  PRICING_SAVED_VIEWS,
  PRICING_SCHEDULE_CHANGES,
  PRICING_SORT_OPTIONS,
  type PricingRuleRow,
} from "./data/pricing-rules.mock";

type PricingFilters = {
  customer: string;
  serviceType: string;
  rateType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const DEFAULT_PRICING_FILTERS: PricingFilters = {
  customer: "",
  serviceType: "",
  rateType: "",
  status: "",
  effectiveFrom: "",
  effectiveTo: "",
};

const PRICING_CUSTOMER_OPTIONS = [
  "Permian Basin Energy",
  "Lonestar Oilfield",
  "Cactus Well Services",
  "Rio Grande Resources",
  "Delaware Basin Co.",
  "Frontier Energy LLC",
  "Summit Production",
  "Vaquero Oil & Gas",
];

const PRICING_SERVICE_OPTIONS = [
  "Wireline Logging",
  "Pump Down",
  "Perforating",
  "Slickline",
];

const PRICING_RATE_TYPE_OPTIONS = ["Per Job", "Per HR", "Per Run"];

const PRICING_STATUS_OPTIONS = ["Active", "Expired", "Pending"];

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

function sortRows(
  rows: PricingRuleRow[],
  field: string,
  dir: DashboardSortDirection,
) {
  return [...rows].sort((a, b) => {
    const d = dir === "asc" ? 1 : -1;
    switch (field) {
      case "service":
        return a.service.localeCompare(b.service) * d;
      case "status":
        return a.status.label.localeCompare(b.status.label) * d;
      case "rate":
        return a.rate.localeCompare(b.rate) * d;
      case "effective":
        return a.effective.localeCompare(b.effective) * d;
      case "expires":
        return a.expires.localeCompare(b.expires) * d;
      case "owner":
        return a.owner.localeCompare(b.owner) * d;
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

function FilterRangeRow({
  label,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          type="text"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
        <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
          -
        </span>
        <input
          type="text"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        />
      </div>
    </div>
  );
}

function PricingFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  value: PricingFilters;
  onChange: (f: PricingFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}) {
  function patch(p: Partial<PricingFilters>) {
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
            options={PRICING_CUSTOMER_OPTIONS}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterSelectRow
            label="Service Type"
            value={value.serviceType}
            options={PRICING_SERVICE_OPTIONS}
            onChange={(v) => patch({ serviceType: v })}
          />
          <FilterSelectRow
            label="Rate Type"
            value={value.rateType}
            options={PRICING_RATE_TYPE_OPTIONS}
            onChange={(v) => patch({ rateType: v })}
          />
          <FilterSelectRow
            label="Status"
            value={value.status}
            options={PRICING_STATUS_OPTIONS}
            onChange={(v) => patch({ status: v })}
          />
          <FilterRangeRow
            label="Effective Date"
            from={value.effectiveFrom}
            to={value.effectiveTo}
            onFromChange={(v) => patch({ effectiveFrom: v })}
            onToChange={(v) => patch({ effectiveTo: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>
            Close
          </DashboardToolbarButton>
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

export function PricingRulesPage() {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDir, setSortDir] = React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<PricingFilters>(
    DEFAULT_PRICING_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<PricingFilters>(
    DEFAULT_PRICING_FILTERS,
  );
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen, setSaveNewOpen] = React.useState(false);
  const [savedViews, setSavedViews] =
    React.useState<DashboardSavedView[]>(PRICING_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(
    "view-1",
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = PRICING_RULES_ROWS.filter((row) => {
      if (q) {
        const hay = [row.customer, row.code, row.service, row.owner]
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
          appliedFilters.serviceType &&
          row.service !== appliedFilters.serviceType
        ) {
          return false;
        }
        if (appliedFilters.rateType && row.unit !== appliedFilters.rateType) {
          return false;
        }
        if (
          appliedFilters.status &&
          row.status.label.toLowerCase() !==
            appliedFilters.status.toLowerCase()
        ) {
          return false;
        }
        if (
          appliedFilters.effectiveFrom &&
          row.effective < appliedFilters.effectiveFrom
        ) {
          return false;
        }
        if (
          appliedFilters.effectiveTo &&
          row.effective > appliedFilters.effectiveTo
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
  }, [query, sortField, sortDir, pageSize]);

  const columns: DashboardDataTableColumn<PricingRuleRow>[] = React.useMemo(
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
        id: "service",
        header: "Service / Item",
        className: "min-w-[140px] max-w-[180px]",
        cell: (row) => row.service,
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
        id: "rate",
        header: "Rate",
        className: "min-w-[90px] max-w-[110px]",
        cell: (row) => row.rate,
      },
      {
        id: "unit",
        header: "Unit",
        className: "hidden min-w-[90px] max-w-[110px] md:table-cell",
        cell: (row) => row.unit,
      },
      {
        id: "effective",
        header: "Effective",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.effective,
      },
      {
        id: "expires",
        header: "Expires",
        className: "hidden min-w-[110px] max-w-[140px] lg:table-cell",
        cell: (row) => row.expires,
      },
      {
        id: "owner",
        header: "Owner",
        className: "hidden min-w-[110px] max-w-[140px] xl:table-cell",
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
                label: "Edit Rate",
                onSelect: () => router.push(`/crm/pricing-rules/${row.id}/edit`),
              },
              { id: "dup", label: "Duplicate Rule" },
              { id: "history", label: "View History" },
              { id: "delete", label: "Delete Rule", destructive: true },
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
          {PRICING_RULES_KPI.map((cell) => (
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
              placeholder="Search Pricing Rules"
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
                options={PRICING_SORT_OPTIONS}
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
        emptyMessage="No pricing rules found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/pricing-rules/${row.id}/edit`)}
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
              title="Rate Change History"
              trailing={countTrailing("3 Rate Changes")}
            />
          </div>
          <div className="pb-2">
            {PRICING_RATE_CHANGES.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                  {item.label}
                </span>
                <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em]">
                  <span className="text-[#959597] line-through">{item.from}</span>
                  <span className="mx-1.5 text-[#959597]">→</span>
                  <span className="font-[510] text-[#FDFDFF]">{item.to}</span>
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <DashboardPanelTitle
              icon="lightning"
              title="Schedule Changes"
              trailing={countTrailing("3 Changes")}
            />
          </div>
          <div className="pb-2">
            {PRICING_SCHEDULE_CHANGES.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                  {item.customer}
                </span>
                <span className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Effective {item.effective}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Permission Gate"
            trailing={countTrailing("3 Permission Gates")}
          />
        </div>
        <div className="pb-2">
          {PRICING_PERMISSION_GATES.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
            >
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] uppercase leading-[1.35] tracking-[-0.02em] text-[#959597]">
                {item.customer}
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

      <PricingFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_PRICING_FILTERS);
          setAppliedFilters(DEFAULT_PRICING_FILTERS);
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
