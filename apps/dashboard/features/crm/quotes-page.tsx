"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardFilterChips,
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
  QUOTES_KPI,
  QUOTES_ROWS,
  QUOTES_SAVED_VIEWS,
  QUOTES_SORT_OPTIONS,
  type QuoteRow,
} from "./data/quotes.mock";
import { SendQuoteModal } from "./send-quote-modal";

const DEFAULT_CHIPS = [
  { id: "active",  label: "Active" },
  { id: "current", label: "Current" },
  { id: "future",  label: "Future" },
];

/* ─── filter state ──────────────────────────────────────────── */

type QuoteFilters = {
  status: string;
  customer: string;
  rep: string;
  valueMin: string;
  valueMax: string;
  createdMin: string;
  createdMax: string;
  expiresMin: string;
  expiresMax: string;
  hasPo: boolean;
};

const DEFAULT_FILTERS: QuoteFilters = {
  status: "", customer: "", rep: "",
  valueMin: "", valueMax: "",
  createdMin: "", createdMax: "",
  expiresMin: "", expiresMax: "",
  hasPo: false,
};

/* ─── sort ──────────────────────────────────────────────────── */

function sortRows(rows: QuoteRow[], field: string, direction: DashboardSortDirection) {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "customer":    return a.customer.localeCompare(b.customer) * dir;
      case "amount":      return a.amount.localeCompare(b.amount) * dir;
      case "status":      return a.status.label.localeCompare(b.status.label) * dir;
      case "created":     return a.created.localeCompare(b.created) * dir;
      case "expires":     return a.expires.localeCompare(b.expires) * dir;
      case "owner":       return a.owner.localeCompare(b.owner) * dir;
      case "quoteNumber":
      default:            return a.quoteNumber.localeCompare(b.quoteNumber) * dir;
    }
  });
}

function chipsFromFilters(f: QuoteFilters) {
  const chips: { id: string; label: string }[] = [];
  if (f.status)                          chips.push({ id: "status",   label: f.status });
  if (f.customer)                        chips.push({ id: "customer", label: f.customer });
  if (f.rep)                             chips.push({ id: "rep",      label: f.rep });
  if (f.valueMin || f.valueMax)          chips.push({ id: "value",    label: `Value: ${f.valueMin || "0"} – ${f.valueMax || "∞"}` });
  if (f.createdMin || f.createdMax)      chips.push({ id: "created",  label: `Created: ${f.createdMin} – ${f.createdMax}` });
  if (f.expiresMin || f.expiresMax)      chips.push({ id: "expires",  label: `Expires: ${f.expiresMin} – ${f.expiresMax}` });
  if (f.hasPo)                           chips.push({ id: "hasPo",    label: "Has PO" });
  return chips;
}

/* ─── filters drawer ────────────────────────────────────────── */

function QuotesFiltersDrawer({
  open, onClose, value, onChange, onApply, onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  value: QuoteFilters;
  onChange: (v: QuoteFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}) {
  if (!open) return null;

  const sel = (field: keyof QuoteFilters, val: string) => onChange({ ...value, [field]: val });
  const range = (minKey: keyof QuoteFilters, maxKey: keyof QuoteFilters, minVal: string, maxVal: string) =>
    onChange({ ...value, [minKey]: minVal, [maxKey]: maxVal });

  const LabelEl = ({ children }: { children: React.ReactNode }) => (
    <span className="font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </span>
  );

  const SelectEl = ({ fieldKey, options }: { fieldKey: keyof QuoteFilters; options: string[] }) => (
    <div className="relative">
      <select
        value={value[fieldKey] as string}
        onChange={(e) => sel(fieldKey, e.target.value)}
        className="h-9 w-full appearance-none rounded border border-border bg-card px-3 pr-8 font-sans text-[12px] text-foreground focus:outline-none"
      >
        <option value=""></option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  const RangePair = ({ minKey, maxKey }: { minKey: keyof QuoteFilters; maxKey: keyof QuoteFilters }) => (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder=""
        value={value[minKey] as string}
        onChange={(e) => range(minKey, maxKey, e.target.value, value[maxKey] as string)}
        className="h-9 w-full rounded border border-border bg-card px-3 font-sans text-[12px] text-foreground focus:outline-none"
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="text"
        placeholder=""
        value={value[maxKey] as string}
        onChange={(e) => range(minKey, maxKey, value[minKey] as string, e.target.value)}
        className="h-9 w-full rounded border border-border bg-card px-3 font-sans text-[12px] text-foreground focus:outline-none"
      />
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
            Filters
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <LabelEl>Status</LabelEl>
            <SelectEl fieldKey="status" options={["Draft", "Sent", "Approved", "Expired", "Converted"]} />
          </div>
          <div className="space-y-1.5">
            <LabelEl>Customer</LabelEl>
            <SelectEl fieldKey="customer" options={["Permian Basin", "Lonestar", "Cactus Well", "Rio Grande", "Delaware", "Frontier", "Summit", "Vaquero"]} />
          </div>
          <div className="space-y-1.5">
            <LabelEl>Rep</LabelEl>
            <SelectEl fieldKey="rep" options={["R. Crawford", "S. Vance", "M. Ellis", "S. Nguyen"]} />
          </div>
          <div className="space-y-1.5">
            <LabelEl>Value</LabelEl>
            <RangePair minKey="valueMin" maxKey="valueMax" />
          </div>
          <div className="space-y-1.5">
            <LabelEl>Created</LabelEl>
            <RangePair minKey="createdMin" maxKey="createdMax" />
          </div>
          <div className="space-y-1.5">
            <LabelEl>Expires</LabelEl>
            <RangePair minKey="expiresMin" maxKey="expiresMax" />
          </div>
          <div className="flex items-center justify-between">
            <LabelEl>Has PO?</LabelEl>
            <button
              role="switch"
              aria-checked={value.hasPo}
              onClick={() => onChange({ ...value, hasPo: !value.hasPo })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value.hasPo ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value.hasPo ? "translate-x-4" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-border bg-transparent px-3 py-2 font-sans text-[11px] uppercase tracking-[0.08em] text-foreground hover:bg-muted/30"
          >
            Close
          </button>
          <button
            onClick={() => { onClearAll(); }}
            className="flex-1 rounded border border-border bg-transparent px-3 py-2 font-sans text-[11px] uppercase tracking-[0.08em] text-foreground hover:bg-muted/30"
          >
            Clear All
          </button>
          <button
            onClick={() => { onApply(); onClose(); }}
            className="flex-1 rounded bg-foreground px-3 py-2 font-sans text-[11px] uppercase tracking-[0.08em] text-background hover:bg-foreground/90"
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

export function QuotesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<QuoteFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<QuoteFilters>(DEFAULT_FILTERS);
  const [chips, setChips] = React.useState<{ id: string; label: string }[]>(DEFAULT_CHIPS);
  const [sortField, setSortField] = React.useState("quoteNumber");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>(QUOTES_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>("view-1");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = QUOTES_ROWS.filter((row) => {
      if (q && ![row.quoteNumber, row.customer, row.contact, row.owner].join(" ").toLowerCase().includes(q)) return false;
      if (appliedFilters.status && row.status.label.toLowerCase() !== appliedFilters.status.toLowerCase()) return false;
      if (appliedFilters.customer && !row.customer.toLowerCase().includes(appliedFilters.customer.toLowerCase())) return false;
      return true;
    });
    return sortRows(rows, sortField, sortDirection);
  }, [query, appliedFilters, sortField, sortDirection]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDirection, pageSize]);

  const columns: DashboardDataTableColumn<QuoteRow>[] = React.useMemo(
    () => [
      {
        id: "quoteNumber",
        header: "Quote #",
        className: "min-w-[110px] max-w-[140px]",
        cell: (row) => (
          <DashboardTablePrimaryCell title={row.quoteNumber} subtitle={row.createdDate} underline />
        ),
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[120px] max-w-[160px]",
        cell: (row) => row.customer,
      },
      {
        id: "contact",
        header: "Contact",
        className: "min-w-[110px] hidden md:table-cell",
        cell: (row) => row.contact,
      },
      {
        id: "amount",
        header: "Amount",
        className: "min-w-[90px]",
        cell: (row) => row.amount,
      },
      {
        id: "created",
        header: "Created",
        className: "min-w-[80px] hidden md:table-cell",
        cell: (row) => (
          <div>
            <div>{row.created}</div>
            <div className="text-[10px] uppercase text-muted-foreground">{row.createdDetail}</div>
          </div>
        ),
      },
      {
        id: "expires",
        header: "Expires",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => (
          <div>
            <div>{row.expires}</div>
            <div className="text-[10px] text-muted-foreground">{row.expiresDetail}</div>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => (
          <span className="underline underline-offset-2 cursor-pointer">{row.owner}</span>
        ),
      },
      {
        id: "sent",
        header: "Sent",
        className: "min-w-[90px] hidden xl:table-cell",
        cell: (row) =>
          row.sent ? (
            <DashboardBadge variant={row.sent.variant} pill className="max-w-full">
              {row.sent.label}
            </DashboardBadge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[90px]",
        cell: (row) => (
          <DashboardBadge variant={row.status.variant} pill className="max-w-full">
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "approval",
        header: "Approval",
        className: "min-w-[80px] hidden xl:table-cell",
        cell: (row) =>
          row.approval ? (
            <DashboardBadge variant={row.approval.variant} pill className="max-w-full">
              {row.approval.label}
            </DashboardBadge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              { id: "open",    label: "Open Quote",              onSelect: () => router.push(`/crm/quotes/${row.id}`) },
              { id: "edit",    label: "Edit" },
              { id: "dup",     label: "Duplicate Quote" },
              { id: "send",    label: "Send to Customer",        onSelect: () => setSendOpen(true) },
              { id: "pdf",     label: "Download PDF",            onSelect: () => router.push(`/crm/quotes/${row.id}/preview`) },
              { id: "convert", label: "Convert to Work Order" },
              { id: "won",     label: "Mark as Won" },
              { id: "lost",    label: "Mark as Lost" },
              { id: "delete",  label: "Delete Draft",            destructive: true },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Quotes
        </h1>
        <DashboardToolbarButton variant="primary" showChevron>
          Create Work Order
        </DashboardToolbarButton>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {QUOTES_KPI.map((cell) => (
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
                  { id: "all-csv",      label: "Export all • CSV" },
                  { id: "pdf",          label: "Export as PDF" },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search WO, Customer, Loca..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => { setDraftFilters(appliedFilters); setFiltersOpen(true); }}
            >
              {`Filter (${chips.length > 0 ? chips.length : "-"})`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Review Exceptions
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv",  label: "Export all • CSV" },
                  { id: "pdf",      label: "Export as PDF" },
                ]}
              />
              <DashboardSortMenu
                options={QUOTES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
              />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={(id) => {
                  setChips((prev) => {
                    const next = prev.filter((c) => c.id !== id);
                    if (next.length === 0) {
                      setAppliedFilters(DEFAULT_FILTERS);
                      setDraftFilters(DEFAULT_FILTERS);
                    }
                    return next;
                  });
                }}
                onClearAll={() => {
                  setChips(DEFAULT_CHIPS);
                  setAppliedFilters(DEFAULT_FILTERS);
                  setDraftFilters(DEFAULT_FILTERS);
                }}
              />
            ) : null
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={pageRows}
        getRowId={(row) => row.id}
        emptyMessage="No quotes found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/quotes/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <QuotesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setChips(chipsFromFilters(draftFilters));
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setChips([]);
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
            setSavedViews((prev) => [...prev, { id, label: `${source.label} copy` }]);
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
      <SendQuoteModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
