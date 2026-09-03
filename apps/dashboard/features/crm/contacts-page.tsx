"use client";

import * as React from "react";
import Link from "next/link";
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
  type DashboardSavedView,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  CONTACTS_KPI,
  CONTACTS_ROWS,
  CONTACTS_SAVED_VIEWS,
  CONTACTS_SORT_OPTIONS,
  type ContactRow,
} from "./data/contacts.mock";

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

/* ── sort ── */
function sortRows(rows: ContactRow[], field: string, dir: DashboardSortDirection) {
  return [...rows].sort((a, b) => {
    const d = dir === "asc" ? 1 : -1;
    switch (field) {
      case "customer":     return a.customer.localeCompare(b.customer) * d;
      case "role":         return a.role.localeCompare(b.role) * d;
      case "location":     return a.location.localeCompare(b.location) * d;
      case "lastActivity": return a.lastActivity.localeCompare(b.lastActivity) * d;
      case "status":       return a.status.label.localeCompare(b.status.label) * d;
      default:             return a.name.localeCompare(b.name) * d;
    }
  });
}

/* ── filter chips ── */
function chipsFromFilters(f: ContactFilters) {
  const chips: { id: string; label: string }[] = [];
  if (f.customer.trim())       chips.push({ id: "customer",   label: f.customer.trim() });
  if (f.role.trim())           chips.push({ id: "role",       label: f.role.trim() });
  if (f.isPrimary)             chips.push({ id: "primary",    label: "Primary contact" });
  if (f.hasEmail)              chips.push({ id: "email",      label: "Has email" });
  if (f.hasPhone)              chips.push({ id: "phone",      label: "Has phone" });
  if (f.assignedRep.trim())    chips.push({ id: "rep",        label: f.assignedRep.trim() });
  if (f.lastActivityFrom.trim()) chips.push({ id: "from",    label: `From ${f.lastActivityFrom.trim()}` });
  if (f.lastActivityTo.trim()) chips.push({ id: "to",         label: `To ${f.lastActivityTo.trim()}` });
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
}: {
  open: boolean;
  onClose: () => void;
  value: ContactFilters;
  onChange: (f: ContactFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
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
      <div className="space-y-5">
        {/* Customer */}
        <FilterSelectRow
          label="Customer"
          value={value.customer}
          placeholder="Select customer"
          options={["Permian Basin Energy", "Lonestar Oilfield", "Cactus Well Services", "Rio Grande Resources", "Delaware Basin Co.", "Frontier Energy LLC", "Summit Production", "Vaquero Oil & Gas"]}
          onChange={(v) => patch({ customer: v })}
        />
        {/* Role */}
        <FilterSelectRow
          label="Role"
          value={value.role}
          placeholder="Select role"
          options={["Operations MGR", "Safety Lead", "Field Super", "AP Contact", "Company MAN", "Procurement", "HSE Manager", "Dispatcher"]}
          onChange={(v) => patch({ role: v })}
        />
        {/* Toggles */}
        <FilterToggleRow label="Is Primary Contact?" checked={value.isPrimary} onChange={(v) => patch({ isPrimary: v })} />
        <FilterToggleRow label="Has Email?"          checked={value.hasEmail}  onChange={(v) => patch({ hasEmail: v })} />
        <FilterToggleRow label="Has Phone?"          checked={value.hasPhone}  onChange={(v) => patch({ hasPhone: v })} />
        {/* Assigned Rep */}
        <FilterSelectRow
          label="Assigned Rep"
          value={value.assignedRep}
          placeholder="Select rep"
          options={["R. Crawford", "M. Torres", "L. Nguyen"]}
          onChange={(v) => patch({ assignedRep: v })}
        />
        {/* Last Activity range */}
        <div>
          <p className="mb-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">Last Activity</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder=""
              value={value.lastActivityFrom}
              onChange={(e) => patch({ lastActivityFrom: e.target.value })}
              className="flex-1 rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-2.5 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] placeholder-[#959597] outline-none focus:border-[#555]"
            />
            <span className="font-sans text-[11px] text-[#959597]">-</span>
            <input
              type="text"
              placeholder=""
              value={value.lastActivityTo}
              onChange={(e) => patch({ lastActivityTo: e.target.value })}
              className="flex-1 rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-2.5 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] placeholder-[#959597] outline-none focus:border-[#555]"
            />
          </div>
        </div>
      </div>
    </DashboardDrawer>
  );
}

function FilterSelectRow({
  label, value, placeholder, options, onChange,
}: {
  label: string; value: string; placeholder: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-2.5 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#555] appearance-none"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">{label}</p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"}`}
      >
        <span className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${checked ? "translate-x-[18px] bg-[#1A1A1A]" : "translate-x-1 bg-[#959597]"}`} />
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
  const [sortField,      setSortField]      = React.useState("name");
  const [sortDir,        setSortDir]        = React.useState<DashboardSortDirection>("asc");
  const [page,           setPage]           = React.useState(1);
  const [pageSize,       setPageSize]       = React.useState(25);
  const [selectedIds,    setSelectedIds]    = React.useState<string[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen,    setSaveNewOpen]    = React.useState(false);
  const [savedViews,     setSavedViews]     = React.useState<DashboardSavedView[]>(CONTACTS_SAVED_VIEWS);
  const [activeViewId,   setActiveViewId]   = React.useState<string | null>("view-1");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = CONTACTS_ROWS.filter((row) => {
      if (q) {
        const hay = [row.name, row.code, row.customer, row.email, row.role].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (appliedFilters.customer.trim() && row.customer !== appliedFilters.customer.trim()) return false;
      if (appliedFilters.role.trim()     && row.role !== appliedFilters.role.trim())         return false;
      if (appliedFilters.isPrimary       && row.primary !== "Primary")                        return false;
      if (appliedFilters.hasEmail        && !row.hasEmail)                                    return false;
      if (appliedFilters.hasPhone        && !row.hasPhone)                                    return false;
      if (appliedFilters.assignedRep.trim() && row.assignedRep !== appliedFilters.assignedRep.trim()) return false;
      return true;
    });
    rows = sortRows(rows, sortField, sortDir);
    return rows;
  }, [query, appliedFilters, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const pageRows  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDir, pageSize]);

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
            { id: "log",     label: "Log Activity" },
            { id: "quote",   label: "Create Quote" },
            { id: "primary", label: "Set as Primary" },
            { id: "email",   label: "Email" },
            { id: "call",    label: "Call" },
            { id: "remove",  label: "Remove", destructive: true },
          ]}
        />
      ),
    },
  ], [router]);

  const bulkOpen = selectedIds.length > 0;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      {/* page title + primary action */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[20px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[24px]">
          Contacts
        </h1>
        <Link href="/crm/contacts/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary">
            Add Contact
          </DashboardToolbarButton>
        </Link>
      </div>

      {/* KPI strip */}
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {CONTACTS_KPI.map((cell) => (
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
              <DashboardToolbarButton className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]">
                Remove
              </DashboardToolbarButton>
              <DashboardToolbarButton>Set status</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "csv",  label: "Export selected • CSV" },
                  { id: "all",  label: "Export all • CSV" },
                  { id: "pdf",  label: "Export as PDF" },
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
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv",  label: "Export all • CSV" },
                  { id: "pdf",      label: "Export as PDF" },
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
        rows={pageRows}
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
        total={filtered.length}
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
          setChips(chipsFromFilters(draftFilters));
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setChips([]);
        }}
      />

      {/* saved views */}
      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onSaveNewView={() => setSaveNewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") {
            setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const src = savedViews.find((v) => v.id === viewId);
            if (!src) return;
            const id = `view-${Date.now()}`;
            setSavedViews((prev) => [...prev, { id, label: `${src.label} copy` }]);
          }
        }}
      />
      <DashboardSaveNewViewModal
        open={saveNewOpen}
        onClose={() => setSaveNewOpen(false)}
        onConfirm={({ name }) => {
          const id = `view-${Date.now()}`;
          setSavedViews((prev) => [...prev, { id, label: name }]);
          setActiveViewId(id);
        }}
      />
    </div>
  );
}
