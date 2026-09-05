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
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv } from "@/lib/crm-api";
import { mapCustomerRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  CUSTOMERS_KPI_SHELL,
  CUSTOMERS_SORT_OPTIONS,
} from "./crm-constants";
import type { CustomerRow } from "./crm-types";

const CUSTOMERS_DEFAULT_FILTERS: DashboardListFiltersState = {
  ...DEFAULT_LIST_FILTERS,
  status: "",
  msaStatus: "",
  assignedReps: "",
};

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
    React.useState<DashboardListFiltersState>(CUSTOMERS_DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<DashboardListFiltersState>(CUSTOMERS_DEFAULT_FILTERS);
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
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("CUSTOMERS");

  const { lookups, reps } = useCrmLookups({ includeLocations: false });
  const statusOptions = lookupOptions(lookups, "customerStatuses");
  const msaOptions = lookupOptions(lookups, "msaStatuses");

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.assignedReps)
      params.assignedRepId = appliedFilters.assignedReps;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters.status, appliedFilters.assignedReps, filtersApplied]);

  const { rows, total, kpiData, loading, reload } = useCrmList({
    list: (p) => crmApi.listCustomers(p),
    mapRow: mapCustomerRow,
    kpi: () => crmApi.customersKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(CUSTOMERS_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    setPage(1);
  }, [query, appliedFilters, sortField, sortDirection, pageSize]);

  async function handleExport() {
    try {
      const res = await crmApi.exportCustomers({
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

  async function handleArchive(id: string, name: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Archive ${name}?`)
    ) {
      return;
    }
    try {
      await crmApi.archiveCustomer(id);
      toastSuccess("Customer archived");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkArchive() {
    if (selectedIds.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Archive ${selectedIds.length} customer(s)?`)
    ) {
      return;
    }
    try {
      await crmApi.bulkArchiveCustomers(selectedIds);
      toastSuccess("Customers archived");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

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
                onSelect: () => void handleArchive(row.id, row.name),
              },
            ]}
          />
        ),
      },
    ],
    [router, reload],
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
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
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
                onClick={() => void handleBulkArchive()}
              >
                Archive
              </DashboardToolbarButton>
              <DashboardToolbarButton>Set status</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  {
                    id: "selected-csv",
                    label: "Export selected view • CSV",
                    onSelect: () => void handleExport(),
                  },
                  {
                    id: "all-csv",
                    label: "Export all • CSV",
                    onSelect: () => void handleExport(),
                  },
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
                  {
                    id: "view-csv",
                    label: "Export current view • CSV",
                    onSelect: () => void handleExport(),
                  },
                  {
                    id: "all-csv",
                    label: "Export all • CSV",
                    onSelect: () => void handleExport(),
                  },
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

      <div className={loading ? "opacity-60 transition-opacity" : undefined}>
        <DashboardDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          emptyMessage={loading ? "Loading customers…" : "No customers found"}
          selectable
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRowClick={(row) => router.push(`/crm/accounts/${row.id}`)}
        />
      </div>

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
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
          setDraftFilters(CUSTOMERS_DEFAULT_FILTERS);
          setAppliedFilters(CUSTOMERS_DEFAULT_FILTERS);
          setChips([]);
          setFiltersApplied(false);
        }}
        statusOptions={statusOptions}
        msaOptions={msaOptions}
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
            const source = savedViews.find((view) => view.id === viewId);
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
    </div>
  );
}
