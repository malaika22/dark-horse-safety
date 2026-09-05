"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardDrawer,
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
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapContactRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { logContactChannel } from "@/lib/crm-activity-log";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import {
  CONTACTS_KPI_SHELL,
  CONTACTS_SORT_OPTIONS,
} from "./crm-constants";
import type { ContactRow } from "./crm-types";

/* ── filter state ── */
type ContactFilters = {
  customer: string;
  role: string;
  isPrimary: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  assignedRep: string;
  lastActivityFrom: string;
  lastActivityTo: string;
};

const DEFAULT_FILTERS: ContactFilters = {
  customer: "",
  role: "",
  isPrimary: false,
  hasEmail: false,
  hasPhone: false,
  assignedRep: "",
  lastActivityFrom: "",
  lastActivityTo: "",
};

/* ── filter chips ── */
function chipsFromFilters(
  f: ContactFilters,
  opts: {
    customers: { value: string; label: string }[];
    roles: { value: string; label: string }[];
    reps: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.customer.trim())
    chips.push({
      id: "customer",
      label: optionLabel(opts.customers, f.customer.trim()),
    });
  if (f.role.trim())
    chips.push({ id: "role", label: optionLabel(opts.roles, f.role.trim()) });
  if (f.isPrimary) chips.push({ id: "primary", label: "Primary contact" });
  if (f.hasEmail) chips.push({ id: "email", label: "Has email" });
  if (f.hasPhone) chips.push({ id: "phone", label: "Has phone" });
  if (f.assignedRep.trim())
    chips.push({
      id: "rep",
      label: optionLabel(opts.reps, f.assignedRep.trim()),
    });
  if (f.lastActivityFrom.trim())
    chips.push({ id: "from", label: `From ${f.lastActivityFrom.trim()}` });
  if (f.lastActivityTo.trim())
    chips.push({ id: "to", label: `To ${f.lastActivityTo.trim()}` });
  return chips;
}

/* ── contacts filters drawer ── */
function ContactsFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  roleOptions,
  repOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: ContactFilters;
  onChange: (f: ContactFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  roleOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<ContactFilters>) { onChange({ ...value, ...p }); }

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center gap-2">
          <DashboardToolbarButton onClick={() => { onClearAll(); onClose(); }} className="flex-1 justify-center">
            Close
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={() => { onClearAll(); }} className="flex-1 justify-center">
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
      }
    >
      <div className="space-y-4">
        <FilterSelectRow
          label="Customer"
          value={value.customer}
          options={customerOptions}
          onChange={(v) => patch({ customer: v })}
        />
        <FilterSelectRow
          label="Role"
          value={value.role}
          options={roleOptions}
          onChange={(v) => patch({ role: v })}
        />
        <FilterToggleRow
          label="Is Primary Contact?"
          checked={value.isPrimary}
          onChange={(v) => patch({ isPrimary: v })}
        />
        <FilterToggleRow
          label="Has Email?"
          checked={value.hasEmail}
          onChange={(v) => patch({ hasEmail: v })}
        />
        <FilterToggleRow
          label="Has Phone?"
          checked={value.hasPhone}
          onChange={(v) => patch({ hasPhone: v })}
        />
        <FilterSelectRow
          label="Assigned Rep"
          value={value.assignedRep}
          options={repOptions}
          onChange={(v) => patch({ assignedRep: v })}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Last Activity
          </p>
          <div className="flex min-w-0 items-center gap-1.5">
            <input
              type="text"
              value={value.lastActivityFrom}
              onChange={(e) => patch({ lastActivityFrom: e.target.value })}
              className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
            />
            <span className="font-sans text-[11px] text-[#FDFDFF]" aria-hidden>
              -
            </span>
            <input
              type="text"
              value={value.lastActivityTo}
              onChange={(e) => patch({ lastActivityTo: e.target.value })}
              className="h-8 w-[72px] rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
            />
          </div>
        </div>
      </div>
    </DashboardDrawer>
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
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="relative min-w-0 flex-1 max-w-[200px]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-[#FDFDFF] transition-colors"
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full bg-[#3E3E3E] shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

/* ── page ── */
export function ContactsPage() {
  const router = useRouter();

  const [query,          setQuery]          = React.useState("");
  const [filtersOpen,    setFiltersOpen]    = React.useState(false);
  const [draftFilters,   setDraftFilters]   = React.useState<ContactFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<ContactFilters>(DEFAULT_FILTERS);
  const [chips,          setChips]          = React.useState<{ id: string; label: string }[]>([]);
  const [sortField,      setSortField]      = React.useState("fullName");
  const [sortDir,        setSortDir]        = React.useState<DashboardSortDirection>("asc");
  const [page,           setPage]           = React.useState(1);
  const [pageSize,       setPageSize]       = React.useState(25);
  const [selectedIds,    setSelectedIds]    = React.useState<string[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen,    setSaveNewOpen]    = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("CONTACTS");

  const { lookups, customers, reps } = useCrmLookups({ includeLocations: false });
  const roleOptions = lookupOptions(lookups, "contactRoles");

  const extraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.assignedRep)
      params.assignedRepId = appliedFilters.assignedRep;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters.customer, appliedFilters.assignedRep]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listContacts(p),
    mapRow: mapContactRow,
    kpi: () => crmApi.contactsKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDir,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(CONTACTS_KPI_SHELL, kpiData),
    [kpiData],
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage  = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDir, pageSize]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection: sortDir,
      query,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: ContactFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
      const nextChips = chipsFromFilters(nextFilters, {
        customers,
        roles: roleOptions,
        reps,
      });
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setChips(nextChips);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDir(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  async function runExport(opts?: {
    format?: "csv" | "pdf" | "xlsx";
    selectedOnly?: boolean;
  }) {
    try {
      if (opts?.selectedOnly && selectedIds.length === 0) {
        toastApiError(new Error("Select at least one contact to export"));
        return;
      }
      const format = opts?.format ?? "csv";
      const res = await crmApi.exportContacts({
        q: query || undefined,
        sort: sortField,
        direction: sortDir,
        format: format === "csv" ? undefined : format,
        ids: opts?.selectedOnly ? selectedIds.join(",") : undefined,
        ...extraParams,
      });
      if (format === "pdf") {
        if (!res.data.pdf) throw new Error("No PDF");
        downloadPdf(res.data.pdf, res.data.filename);
        toastSuccess("PDF downloaded");
        return;
      }
      if (format === "xlsx") {
        if (!res.data.xlsx) throw new Error("No Excel file");
        downloadXlsx(res.data.xlsx, res.data.filename);
        toastSuccess("Excel downloaded");
        return;
      }
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleArchive(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Archive this contact?")) {
      return;
    }
    try {
      await crmApi.archiveContact(id);
      toastSuccess("Contact archived");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkArchive() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove ${selectedIds.length} contact(s)?`)
    ) {
      return;
    }
    try {
      await crmApi.bulkArchiveContacts(selectedIds);
      toastSuccess("Contacts removed");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleSetPrimary(id: string, customerId?: string) {
    if (!customerId) {
      toastApiError(new Error("Contact has no linked customer"));
      return;
    }
    try {
      await crmApi.setContactPrimary(id, customerId);
      toastSuccess("Contact set as primary");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns: DashboardDataTableColumn<ContactRow>[] = React.useMemo(() => [
    {
      id: "contact",
      header: "Contact",
      className: "min-w-[180px] max-w-[240px]",
      cell: (row) => (
        <DashboardTablePrimaryCell title={row.name} subtitle={row.code} underline />
      ),
    },
    {
      id: "customer",
      header: "Customer",
      className: "min-w-[160px] max-w-[220px]",
      cell: (row) => row.customer,
    },
    {
      id: "role",
      header: "Role",
      className: "min-w-[120px] max-w-[160px]",
      cell: (row) => row.role,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden min-w-[160px] max-w-[220px] lg:table-cell",
      cell: (row) => row.email,
    },
    {
      id: "phone",
      header: "Phone",
      className: "hidden min-w-[120px] max-w-[160px] md:table-cell",
      cell: (row) => row.phone,
    },
    {
      id: "location",
      header: "Location",
      className: "hidden min-w-[110px] max-w-[150px] lg:table-cell",
      cell: (row) => row.location,
    },
    {
      id: "primary",
      header: "Primary",
      className: "hidden min-w-[100px] max-w-[120px] md:table-cell",
      cell: (row) => row.primary,
    },
    {
      id: "status",
      header: "Status",
      className: "min-w-[110px] max-w-[140px]",
      cell: (row) => (
        <DashboardBadge variant={row.status.variant} pill className="max-w-full">
          {row.status.label}
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
            { id: "open",    label: "Open Contact",  onSelect: () => router.push(`/crm/contacts/${row.id}`) },
            { id: "edit",    label: "Edit",           onSelect: () => router.push(`/crm/contacts/${row.id}`) },
            {
              id: "log",
              label: "Log Activity",
              onSelect: () =>
                router.push(`/crm/sales/new?contactId=${encodeURIComponent(row.id)}`),
            },
            {
              id: "quote",
              label: "Create Quote",
              onSelect: () =>
                router.push(`/crm/quotes/new?contactId=${encodeURIComponent(row.id)}`),
            },
            {
              id: "primary",
              label: "Set as Primary",
              onSelect: () => void handleSetPrimary(row.id, row.primaryCustomerId),
            },
            {
              id: "email",
              label: "Email",
              onSelect: () => {
                void logContactChannel({
                  type: "EMAIL",
                  contactId: row.id,
                  customerId: row.primaryCustomerId,
                  email: row.hasEmail ? row.email : null,
                  label: row.name,
                });
              },
            },
            {
              id: "call",
              label: "Call",
              onSelect: () => {
                void logContactChannel({
                  type: "CALL",
                  contactId: row.id,
                  customerId: row.primaryCustomerId,
                  phone: row.hasPhone ? row.phone : null,
                  label: row.name,
                });
              },
            },
            { id: "remove",  label: "Remove", destructive: true, onSelect: () => void handleArchive(row.id) },
          ]}
        />
      ),
    },
  ], [router]);

  const bulkOpen = selectedIds.length > 0;

  return (
    <CrmListLoadGate loading={loading} hasData={!initialLoading} kpiCount={4}>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      {/* KPI strip */}
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {/* toolbar / bulk bar */}
      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
                onClick={() => void handleBulkArchive()}
              >
                Remove
              </DashboardToolbarButton>
              <DashboardToolbarButton
                onClick={() => {
                  void (async () => {
                    try {
                      await Promise.all(
                        selectedIds.map((id) =>
                          crmApi.updateContact(id, { status: "ACTIVE" }),
                        ),
                      );
                      toastSuccess("Status set to Active");
                      setSelectedIds([]);
                      reload();
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                }}
              >
                Set status
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "csv",  label: "Export selected • CSV", onSelect: () => void runExport({ selectedOnly: true }) },
                  { id: "all",  label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx", selectedOnly: true }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf", selectedOnly: true }),
                  },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Contacts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => { setDraftFilters(appliedFilters); setFiltersOpen(true); }}
            >
              {`Filters${chips.length > 0 ? ` (${chips.length})` : ""}`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved Views
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void runExport() },
                  { id: "all-csv",  label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx" }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf" }),
                  },
                ]}
              />
              <DashboardSortMenu
                options={CONTACTS_SORT_OPTIONS}
                field={sortField}
                direction={sortDir}
                onFieldChange={setSortField}
                onDirectionChange={setSortDir}
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
                  setChips([]);
                  setAppliedFilters(DEFAULT_FILTERS);
                  setDraftFilters(DEFAULT_FILTERS);
                }}
              />
            ) : null
          }
        />
      )}

      {/* table */}
      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage="No contacts found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/contacts/${row.id}`)}
      />

      {/* pagination */}
      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* filters drawer */}
      <ContactsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setChips(
            chipsFromFilters(draftFilters, {
              customers,
              roles: roleOptions,
              reps,
            }),
          );
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setChips([]);
        }}
        customerOptions={customers}
        roleOptions={roleOptions}
        repOptions={reps}
      />

      {/* saved views */}
      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={(viewId) => {
          setActiveViewId(viewId);
          const view = savedViews.find((v) => v.id === viewId);
          if (view?.payload != null) applySavedViewPayload(view.payload);
        }}
        onSaveNewView={() => setSaveNewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const src = savedViews.find((v) => v.id === viewId);
            if (src) {
              void createView(
                `${src.label} copy`,
                (src.payload as Record<string, unknown> | undefined) ??
                  currentViewPayload(),
              );
            }
          }
        }}
      />
      <DashboardSaveNewViewModal
        open={saveNewOpen}
        onClose={() => setSaveNewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />
    </div>
    </CrmListLoadGate>
  );
}
