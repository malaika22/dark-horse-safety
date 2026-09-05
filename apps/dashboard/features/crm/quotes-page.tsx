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
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv } from "@/lib/crm-api";
import { mapQuoteRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { QUOTES_KPI_SHELL, QUOTES_SORT_OPTIONS } from "./crm-constants";
import type { QuoteRow } from "./crm-types";
import { SendQuoteModal } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";
import Link from "next/link";

const DEFAULT_CHIPS: { id: string; label: string }[] = [];

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


function chipsFromFilters(
  f: QuoteFilters,
  opts: {
    statuses: { value: string; label: string }[];
    customers: { value: string; label: string }[];
    reps: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.status)
    chips.push({ id: "status", label: optionLabel(opts.statuses, f.status) });
  if (f.customer)
    chips.push({
      id: "customer",
      label: optionLabel(opts.customers, f.customer),
    });
  if (f.rep)
    chips.push({ id: "rep", label: optionLabel(opts.reps, f.rep) });
  if (f.valueMin || f.valueMax)
    chips.push({
      id: "value",
      label: `Value: ${f.valueMin || "0"} – ${f.valueMax || "∞"}`,
    });
  if (f.createdMin || f.createdMax)
    chips.push({
      id: "created",
      label: `Created: ${f.createdMin} – ${f.createdMax}`,
    });
  if (f.expiresMin || f.expiresMax)
    chips.push({
      id: "expires",
      label: `Expires: ${f.expiresMin} – ${f.expiresMax}`,
    });
  if (f.hasPo) chips.push({ id: "hasPo", label: "Has PO" });
  return chips;
}

/* ─── filters drawer ────────────────────────────────────────── */

function QuotesFiltersDrawer({
  open, onClose, value, onChange, onApply, onClearAll,
  statusOptions, customerOptions, repOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: QuoteFilters;
  onChange: (v: QuoteFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  statusOptions: { value: string; label: string }[];
  customerOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
}) {
  if (!open) return null;

  const sel = (field: keyof QuoteFilters, val: string) => onChange({ ...value, [field]: val });
  const range = (minKey: keyof QuoteFilters, maxKey: keyof QuoteFilters, minVal: string, maxVal: string) =>
    onChange({ ...value, [minKey]: minVal, [maxKey]: maxVal });

  const controlClass =
    "h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] px-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
      <div className="flex min-w-0 max-w-[200px] flex-1 justify-end">{children}</div>
    </div>
  );

  const SelectEl = ({
    fieldKey,
    options,
  }: {
    fieldKey: keyof QuoteFilters;
    options: { value: string; label: string }[];
  }) => (
    <div className="relative w-full">
      <select
        value={value[fieldKey] as string}
        onChange={(e) => sel(fieldKey, e.target.value)}
        className={controlClass}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );

  const RangePair = ({ minKey, maxKey }: { minKey: keyof QuoteFilters; maxKey: keyof QuoteFilters }) => (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value[minKey] as string}
        onChange={(e) => range(minKey, maxKey, e.target.value, value[maxKey] as string)}
        className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      />
      <span className="text-[#FDFDFF]" aria-hidden>-</span>
      <input
        type="text"
        value={value[maxKey] as string}
        onChange={(e) => range(minKey, maxKey, value[minKey] as string, e.target.value)}
        className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[min(100%,360px)] flex-col border-l border-divider bg-[#0D0D0D] shadow-xl">
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Filters
          </span>
          <button type="button" onClick={onClose} className="text-[#FDFDFF] hover:opacity-70" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Row label="Status">
            <SelectEl fieldKey="status" options={statusOptions} />
          </Row>
          <Row label="Customer">
            <SelectEl fieldKey="customer" options={customerOptions} />
          </Row>
          <Row label="Rep">
            <SelectEl fieldKey="rep" options={repOptions} />
          </Row>
          <Row label="Value">
            <RangePair minKey="valueMin" maxKey="valueMax" />
          </Row>
          <Row label="Created">
            <RangePair minKey="createdMin" maxKey="createdMax" />
          </Row>
          <Row label="Expires">
            <RangePair minKey="expiresMin" maxKey="expiresMax" />
          </Row>
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Has PO?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={value.hasPo}
              onClick={() => onChange({ ...value, hasPo: !value.hasPo })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value.hasPo ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"}`}
            >
              <span
                className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
                  value.hasPo ? "translate-x-[18px] bg-[#1A1A1A]" : "translate-x-1 bg-[#959597]"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-divider px-5 py-4">
          <DashboardToolbarButton onClick={onClose} className="flex-1 justify-center">
            Close
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onClearAll} className="flex-1 justify-center">
            Clear All
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            onClick={() => { onApply(); onClose(); }}
            className="flex-1 justify-center"
          >
            Apply
          </DashboardToolbarButton>
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
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("QUOTES");

  const { lookups, customers, reps } = useCrmLookups({ includeLocations: false });
  const statusOptions = lookupOptions(lookups, "quoteStatuses");

  const extraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.rep) params.ownerId = appliedFilters.rep;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters.status, appliedFilters.customer, appliedFilters.rep]);

  const { rows, total, kpiData, loading } = useCrmList({
    list: (p) => crmApi.listQuotes(p),
    mapRow: mapQuoteRow,
    kpi: () => crmApi.quotesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(QUOTES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDirection, pageSize]);

  async function handleExport() {
    try {
      const res = await crmApi.exportQuotes({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        ...extraParams,
      });
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

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
        <Link href="/crm/quotes/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<DocumentPlusIcon className="shrink-0" />}
            showChevron
          >
            Create Quote
          </DashboardToolbarButton>
        </Link>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {kpiCells.map((cell) => (
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
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void handleExport() },
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
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv",  label: "Export all • CSV", onSelect: () => void handleExport() },
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
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={loading ? "Loading quotes…" : "No quotes found"}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/quotes/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
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
          setChips(
            chipsFromFilters(draftFilters, {
              statuses: statusOptions,
              customers,
              reps,
            }),
          );
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setChips([]);
        }}
        statusOptions={statusOptions}
        customerOptions={customers}
        repOptions={reps}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) void createView(`${source.label} copy`);
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name);
        }}
      />
      <SendQuoteModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
