"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { mapSalesActivityRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { SALES_KPI_SHELL, SALES_SORT_OPTIONS } from "./crm-constants";
import type { SalesActivityRow } from "./crm-types";

const DEFAULT_CHIPS = [
  { id: "active",  label: "Active" },
  { id: "current", label: "Current" },
  { id: "future",  label: "Future" },
];


export function SalesActivityPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<"activity" | "summary">("activity");
  const [chips, setChips] = React.useState(DEFAULT_CHIPS);
  const [sortField, setSortField] = React.useState("activityAt");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("desc");
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
  } = useCrmSavedViews("SALES_ACTIVITIES");

  const { rows, total, kpiData, loading } = useCrmList({
    list: (p) => crmApi.listSalesActivities(p),
    mapRow: mapSalesActivityRow,
    kpi: () => crmApi.salesActivitiesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(SALES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, sortField, sortDirection, pageSize]);

  async function handleExport() {
    try {
      const res = await crmApi.exportSalesActivities({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
      });
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns: DashboardDataTableColumn<SalesActivityRow>[] = React.useMemo(
    () => [
      {
        id: "activityId",
        header: "Activity ID",
        className: "min-w-[120px] max-w-[160px]",
        cell: (row) => (
          <DashboardTablePrimaryCell title={row.activityId} subtitle={row.time} underline />
        ),
      },
      {
        id: "date",
        header: "Date",
        className: "min-w-[80px]",
        cell: (row) => row.date,
      },
      {
        id: "type",
        header: "Type",
        className: "min-w-[90px]",
        cell: (row) => row.type,
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
        id: "rep",
        header: "Rep",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => row.rep,
      },
      {
        id: "subject",
        header: "Subject",
        className: "min-w-[130px] hidden lg:table-cell",
        cell: (row) => (
          <span className="underline underline-offset-2">{row.subject}</span>
        ),
      },
      {
        id: "outcome",
        header: "Outcome",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge variant={row.outcome.variant} pill className="max-w-full">
            {row.outcome.label}
          </DashboardBadge>
        ),
      },
      {
        id: "followUp",
        header: "Follow-up",
        className: "min-w-[90px] hidden xl:table-cell",
        cell: (row) =>
          row.followUp ? (
            <DashboardBadge variant={row.followUp.variant} pill className="max-w-full">
              {row.followUp.label}
            </DashboardBadge>
          ) : (
            <span className="text-[#959597]">—</span>
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
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              { id: "open",     label: "Open Activity",   onSelect: () => router.push(`/crm/sales/${row.id}`) },
              { id: "followup", label: "Log Follow-up" },
              { id: "quote",    label: "Create Quote",    onSelect: () => router.push("/crm/quotes/new") },
              { id: "edit",     label: "Edit" },
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
          Sales Activity
        </h1>
        <Link href="/crm/sales/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary" showChevron>
            Log Activity
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

      <div className="flex items-center gap-2">
        {([
          { id: "activity", label: "Sales Activity" },
          { id: "summary",  label: "Summary" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
              tab === t.id
                ? "bg-[#353535] text-[#FDFDFF]"
                : "bg-transparent text-[#959597] hover:text-[#FDFDFF]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton>Log Follow-up</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv",      label: "Export all • CSV", onSelect: () => void handleExport() },
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
            >
              {`Filter (${chips.length > 0 ? chips.length : "-"})`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved Views
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv",  label: "Export all • CSV" },
                ]}
              />
              <DashboardSortMenu
                options={SALES_SORT_OPTIONS}
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
                onRemove={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
                onClearAll={() => setChips([])}
              />
            ) : null
          }
        />
      )}

      {tab === "activity" ? (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            emptyMessage={loading ? "Loading…" : "No sales activity found"}
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onRowClick={(row) => router.push(`/crm/sales/${row.id}`)}
          />
          <DashboardPagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <div className="rounded-xl border border-divider bg-panel p-6">
          <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
            Summary view coming next.
          </p>
        </div>
      )}

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
    </div>
  );
}
