"use client";

import * as React from "react";
import Link from "next/link";
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
  PRICING_RULES_KPI,
  PRICING_RULES_ROWS,
  PRICING_SAVED_VIEWS,
  PRICING_SORT_OPTIONS,
  type PricingRuleRow,
} from "./data/pricing-rules.mock";

function sortRows(rows: PricingRuleRow[], field: string, dir: DashboardSortDirection) {
  return [...rows].sort((a, b) => {
    const d = dir === "asc" ? 1 : -1;
    switch (field) {
      case "service":   return a.service.localeCompare(b.service) * d;
      case "status":    return a.status.label.localeCompare(b.status.label) * d;
      case "rate":      return a.rate.localeCompare(b.rate) * d;
      case "effective": return a.effective.localeCompare(b.effective) * d;
      case "expires":   return a.expires.localeCompare(b.expires) * d;
      case "owner":     return a.owner.localeCompare(b.owner) * d;
      default:          return a.customer.localeCompare(b.customer) * d;
    }
  });
}

export function PricingRulesPage() {
  const router = useRouter();

  const [query,          setQuery]          = React.useState("");
  const [sortField,      setSortField]      = React.useState("customer");
  const [sortDir,        setSortDir]        = React.useState<DashboardSortDirection>("asc");
  const [page,           setPage]           = React.useState(1);
  const [pageSize,       setPageSize]       = React.useState(25);
  const [selectedIds,    setSelectedIds]    = React.useState<string[]>([]);
  const [chips,          setChips]          = React.useState<{ id: string; label: string }[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewOpen,    setSaveNewOpen]    = React.useState(false);
  const [savedViews,     setSavedViews]     = React.useState<DashboardSavedView[]>(PRICING_SAVED_VIEWS);
  const [activeViewId,   setActiveViewId]   = React.useState<string | null>("view-1");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = PRICING_RULES_ROWS.filter((row) => {
      if (q) {
        const hay = [row.customer, row.code, row.service, row.owner].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows = sortRows(rows, sortField, sortDir);
    return rows;
  }, [query, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const pageRows  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => { setPage(1); }, [query, sortField, sortDir, pageSize]);

  const columns: DashboardDataTableColumn<PricingRuleRow>[] = React.useMemo(() => [
    {
      id: "customer",
      header: "Customer",
      className: "min-w-[180px] max-w-[240px]",
      cell: (row) => <DashboardTablePrimaryCell title={row.customer} subtitle={row.code} underline />,
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
        <DashboardBadge variant={row.status.variant} pill className="max-w-full">
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
            { id: "edit",    label: "Edit Rate",        onSelect: () => router.push(`/crm/pricing-rules/${row.id}`) },
            { id: "dup",     label: "Duplicate Rule" },
            { id: "history", label: "View History" },
            { id: "delete",  label: "Delete Rule", destructive: true },
          ]}
        />
      ),
    },
  ], [router]);

  const bulkOpen = selectedIds.length > 0;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[20px] font-[590] uppercase leading-none tracking-[-0.03em] text-[#FDFDFF] sm:text-[24px]">
          Pricing Rules
        </h1>
        <Link href="/crm/pricing-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary">Add Pricing Rule</DashboardToolbarButton>
        </Link>
      </div>

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
              <DashboardToolbarButton className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]">Delete</DashboardToolbarButton>
              <DashboardToolbarButton>Set Status</DashboardToolbarButton>
              <DashboardExportMenu triggerLabel="Export selected" items={[
                { id: "csv", label: "Export selected • CSV" }, { id: "all", label: "Export all • CSV" }, { id: "pdf", label: "Export as PDF" },
              ]} />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={<DashboardSearchInput placeholder="Search Pricing Rules" value={query} onChange={(e) => setQuery(e.target.value)} />}
          filters={
            <DashboardToolbarButton leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}>
              {`Filters${chips.length > 0 ? ` (${chips.length})` : ""}`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>Saved Views</DashboardToolbarButton>
              <DashboardExportMenu items={[
                { id: "view-csv", label: "Export current view • CSV" }, { id: "all-csv", label: "Export all • CSV" }, { id: "pdf", label: "Export as PDF" },
              ]} />
              <DashboardSortMenu options={PRICING_SORT_OPTIONS} field={sortField} direction={sortDir} onFieldChange={setSortField} onDirectionChange={setSortDir} />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips chips={chips} onRemove={(id) => setChips((p) => p.filter((c) => c.id !== id))} onClearAll={() => setChips([])} />
            ) : null
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
        onRowClick={(row) => router.push(`/crm/pricing-rules/${row.id}`)}
      />

      <DashboardPagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />

      <DashboardSaveViewsModal
        open={savedViewsOpen} onClose={() => setSavedViewsOpen(false)} views={savedViews} activeViewId={activeViewId}
        onSelectView={setActiveViewId} onSaveNewView={() => setSaveNewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") { setSavedViews((p) => p.filter((v) => v.id !== viewId)); if (activeViewId === viewId) setActiveViewId(null); }
          if (action === "duplicate") { const src = savedViews.find((v) => v.id === viewId); if (!src) return; const id = `view-${Date.now()}`; setSavedViews((p) => [...p, { id, label: `${src.label} copy` }]); }
        }}
      />
      <DashboardSaveNewViewModal open={saveNewOpen} onClose={() => setSaveNewOpen(false)} onConfirm={({ name }) => { const id = `view-${Date.now()}`; setSavedViews((p) => [...p, { id, label: name }]); setActiveViewId(id); }} />
    </div>
  );
}
