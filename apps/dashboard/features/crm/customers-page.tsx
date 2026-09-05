"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardFilterChips,
  DashboardFiltersDrawer,
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
  DashboardTableBadgeStack,
  DashboardTablePrimaryCell,
  DashboardTableTruncatedText,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  DEFAULT_LIST_FILTERS,
  type DashboardDataTableColumn,
  type DashboardListFiltersState,
  type DashboardSavedView,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  CUSTOMERS_KPI,
  CUSTOMERS_ROWS,
  CUSTOMERS_SAVED_VIEWS,
  CUSTOMERS_SORT_OPTIONS,
  type CustomerRow,
} from "./data/customers.mock";

function sortRows(
  rows: CustomerRow[],
  field: string,
  direction: DashboardSortDirection,
) {
  const sorted = [...rows].sort((a, b) => {
    const dir = direction === "asc" ? 1 : -1;
    switch (field) {
      case "accountOwner":
        return a.accountOwner.localeCompare(b.accountOwner) * dir;
      case "primaryContact":
        return a.primaryContact.localeCompare(b.primaryContact) * dir;
      case "locationWell":
        return a.locationWell.localeCompare(b.locationWell) * dir;
      case "status":
        return a.status.label.localeCompare(b.status.label) * dir;
      case "openJobs":
        return (a.openJobs - b.openJobs) * dir;
      case "locations":
        return (a.locations - b.locations) * dir;
      case "msaExpiry":
        return a.msaExpiry.localeCompare(b.msaExpiry) * dir;
      case "lastActivity":
        return a.lastActivity.localeCompare(b.lastActivity) * dir;
      case "createdAt":
        return a.createdAt.localeCompare(b.createdAt) * dir;
      case "name":
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  });
  return sorted;
}

function chipsFromFilters(filters: DashboardListFiltersState) {
  const chips: { id: string; label: string }[] = [];
  if (filters.field.trim()) {
    chips.push({ id: "field", label: filters.field.trim() });
  }
  if (filters.type.trim()) {
    chips.push({ id: "type", label: filters.type.trim() });
  }
  if (filters.status) {
    chips.push({ id: "status", label: filters.status.replace("-", " ") });
  }
  if (filters.msaStatus) {
    chips.push({ id: "msa", label: `Msa ${filters.msaStatus}` });
  }
  if (filters.hasOpenJobs) {
    chips.push({ id: "open-jobs", label: "Has open jobs" });
  }
  if (filters.pricing !== "any") {
    chips.push({ id: "pricing", label: `Pricing: ${filters.pricing}` });
  }
  if (filters.reqForms !== "any") {
    chips.push({ id: "req-forms", label: `Req forms: ${filters.reqForms}` });
  }
  if (filters.routeRules !== "any") {
    chips.push({ id: "route-rules", label: `Route rules: ${filters.routeRules}` });
  }
  return chips;
}

export function CustomersPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<DashboardListFiltersState>(DEFAULT_LIST_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<DashboardListFiltersState>(DEFAULT_LIST_FILTERS);
  const [chips, setChips] = React.useState<{ id: string; label: string }[]>([]);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [sortField, setSortField] = React.useState("name");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] =
    React.useState<DashboardSavedView[]>(CUSTOMERS_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(
    "view-1",
  );
  const [archivedIds, setArchivedIds] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = CUSTOMERS_ROWS.filter((row) => {
      if (archivedIds.includes(row.id)) return false;
      if (q) {
        const haystack = [
          row.name,
          row.code,
          row.accountOwner,
          row.primaryContact,
          row.locationWell,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (appliedFilters.hasOpenJobs && row.openJobs <= 0) return false;
      if (filtersApplied && appliedFilters.status) {
        const statusMap: Record<string, string> = {
          active: "Active",
          "needs-review": "Needs review",
          offline: "Offline",
        };
        const expected = statusMap[appliedFilters.status];
        if (expected && row.status.label !== expected) return false;
      }
      return true;
    });
    rows = sortRows(rows, sortField, sortDirection);
    return rows;
  }, [appliedFilters, archivedIds, filtersApplied, query, sortDirection, sortField]);

  const bulkOpen = selectedIds.length > 0;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  React.useEffect(() => {
    setPage(1);
  }, [query, appliedFilters, sortField, sortDirection, pageSize]);

  const columns: DashboardDataTableColumn<CustomerRow>[] = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px] max-w-[240px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.name}
            subtitle={row.code}
            underline
          />
        ),
      },
      {
        id: "owner",
        header: "Account Owner",
        className: "min-w-[150px] whitespace-nowrap",
        cell: (row) => (
          <DashboardTableTruncatedText className="min-w-0 max-w-[12rem] sm:max-w-[14rem] lg:max-w-none">
            {row.accountOwner}
          </DashboardTableTruncatedText>
        ),
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
        id: "contact",
        header: "Primary Contact",
        className: "hidden min-w-[140px] whitespace-nowrap lg:table-cell",
        cell: (row) => (
          <DashboardTableTruncatedText className="min-w-0 max-w-[12rem] sm:max-w-[14rem] lg:max-w-none">
            {row.primaryContact}
          </DashboardTableTruncatedText>
        ),
      },
      {
        id: "jobs",
        header: "Open jobs",
        align: "center",
        className: "min-w-[90px] max-w-[110px]",
        cell: (row) => row.openJobs,
      },
      {
        id: "locations",
        header: "Location / Wells",
        className: "hidden min-w-[160px] whitespace-nowrap md:table-cell",
        cell: (row) => (
          <DashboardTableTruncatedText className="min-w-0 max-w-[12rem] sm:max-w-[16rem] lg:max-w-none">
            {row.locationWell}
          </DashboardTableTruncatedText>
        ),
      },
      {
        id: "route",
        header: "Route / GPS",
        className: "hidden min-w-[140px] max-w-[180px] xl:table-cell",
        cell: (row) => (
          <DashboardTableBadgeStack>
            {row.routeGps.map((item) => (
              <DashboardBadge key={item.label} variant={item.variant} pill className="max-w-full">
                {item.label}
              </DashboardBadge>
            ))}
          </DashboardTableBadgeStack>
        ),
      },
      {
        id: "requirements",
        header: "Requirements",
        className: "hidden min-w-[140px] max-w-[180px] xl:table-cell",
        cell: (row) => (
          <DashboardTableBadgeStack>
            {row.requirements.map((item) => (
              <DashboardBadge key={item.label} variant={item.variant} pill className="max-w-full">
                {item.label}
              </DashboardBadge>
            ))}
          </DashboardTableBadgeStack>
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
                id: "open",
                label: "Open customer",
                onSelect: () => router.push(`/crm/accounts/${row.id}`),
              },
              {
                id: "edit",
                label: "Edit customer",
                onSelect: () => router.push(`/crm/accounts/${row.id}/edit`),
              },
              {
                id: "add-contact",
                label: "Add contact",
                onSelect: () =>
                  router.push(
                    `/crm/contacts/new?customerId=${encodeURIComponent(row.id)}&customer=${encodeURIComponent(row.name)}`,
                  ),
              },
              {
                id: "add-location",
                label: "Add location",
                onSelect: () =>
                  router.push(
                    `/crm/locations/new?customerId=${encodeURIComponent(row.id)}&customer=${encodeURIComponent(row.name)}`,
                  ),
              },
              {
                id: "create-quote",
                label: "Create quote",
                onSelect: () =>
                  router.push(
                    `/crm/quotes/new?customerId=${encodeURIComponent(row.id)}&customer=${encodeURIComponent(row.name)}`,
                  ),
              },
              {
                id: "view-wo",
                label: "View work orders",
                onSelect: () =>
                  router.push(
                    `/operations/work-orders?customerId=${encodeURIComponent(row.id)}&customer=${encodeURIComponent(row.name)}`,
                  ),
              },
              {
                id: "archive",
                label: "Archive customer",
                destructive: true,
                onSelect: () => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm(`Archive ${row.name}?`)
                  ) {
                    setArchivedIds((prev) =>
                      prev.includes(row.id) ? prev : [...prev, row.id],
                    );
                  }
                },
              },
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
          {CUSTOMERS_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
              >
                Archive
              </DashboardToolbarButton>
              <DashboardToolbarButton>Set status</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV" },
                  { id: "all-csv", label: "Export all • CSV" },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
              <DashboardToolbarButton>Assign rep</DashboardToolbarButton>
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search customers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              {`Filters (${chips.length > 0 ? chips.length : "-"})`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved views
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv", label: "Export all • CSV" },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
              <DashboardSortMenu
                options={CUSTOMERS_SORT_OPTIONS}
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
                      setFiltersApplied(false);
                      setAppliedFilters(DEFAULT_LIST_FILTERS);
                      setDraftFilters(DEFAULT_LIST_FILTERS);
                    }
                    return next;
                  });
                }}
                onClearAll={() => {
                  setChips([]);
                  setFiltersApplied(false);
                  setAppliedFilters(DEFAULT_LIST_FILTERS);
                  setDraftFilters(DEFAULT_LIST_FILTERS);
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
        emptyMessage="No customers found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/accounts/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <DashboardFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setChips(chipsFromFilters(draftFilters));
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_LIST_FILTERS);
          setAppliedFilters(DEFAULT_LIST_FILTERS);
          setChips([]);
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
            setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const source = savedViews.find((view) => view.id === viewId);
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
