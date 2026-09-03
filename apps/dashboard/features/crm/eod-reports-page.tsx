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
  EOD_REPORTS_KPI,
  EOD_REPORTS_ROWS,
  EOD_REPORTS_SAVED_VIEWS,
  EOD_REPORTS_SORT_OPTIONS,
  type BadgeCell,
  type EodReportRow,
} from "./data/eod-reports.mock";

const DEFAULT_CHIPS = [
  { id: "active",  label: "Active" },
  { id: "current", label: "Current" },
  { id: "future",  label: "Future" },
];

function sortRows(rows: EodReportRow[], field: string, direction: DashboardSortDirection) {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "date":       return a.date.localeCompare(b.date) * dir;
      case "rep":        return a.rep.localeCompare(b.rep) * dir;
      case "activities": return (a.activities - b.activities) * dir;
      case "status":     return a.status.label.localeCompare(b.status.label) * dir;
      case "reportId":
      default:           return a.reportId.localeCompare(b.reportId) * dir;
    }
  });
}

function BadgeOrDash({ value }: { value: BadgeCell }) {
  if (!value) return <span className="text-[#959597]">—</span>;
  return (
    <DashboardBadge variant={value.variant} pill className="max-w-full">
      {value.label}
    </DashboardBadge>
  );
}

function StackedCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate">{title}</div>
      {subtitle ? (
        <div className="truncate text-[10px] uppercase text-[#959597]">{subtitle}</div>
      ) : null}
    </div>
  );
}

export function EodReportsPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState(DEFAULT_CHIPS);
  const [sortField, setSortField] = React.useState("date");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>(EOD_REPORTS_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>("view-1");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = EOD_REPORTS_ROWS.filter((row) => {
      if (!q) return true;
      return [row.reportId, row.rep, row.date, row.status.label].join(" ").toLowerCase().includes(q);
    });
    return sortRows(rows, sortField, sortDirection);
  }, [query, sortField, sortDirection]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => { setPage(1); }, [query, sortField, sortDirection, pageSize]);

  const columns: DashboardDataTableColumn<EodReportRow>[] = React.useMemo(
    () => [
      {
        id: "reportId",
        header: "Report ID",
        className: "min-w-[110px] max-w-[150px]",
        cell: (row) => (
          <DashboardTablePrimaryCell title={row.reportId} subtitle={row.submittedTime} underline />
        ),
      },
      {
        id: "date",
        header: "Date",
        className: "min-w-[80px]",
        cell: (row) => row.date,
      },
      {
        id: "rep",
        header: "Rep",
        className: "min-w-[120px]",
        cell: (row) => row.rep,
      },
      {
        id: "activities",
        header: "Activities",
        className: "min-w-[90px]",
        cell: (row) => row.activities,
      },
      {
        id: "calls",
        header: "Calls",
        className: "min-w-[80px] hidden md:table-cell",
        cell: (row) => <StackedCell title={row.calls} subtitle={row.callsDetail} />,
      },
      {
        id: "visits",
        header: "Visits",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) =>
          row.visitsBadge ? (
            <div className="space-y-1">
              <StackedCell title={row.visits} subtitle={row.visitsDetail} />
              <DashboardBadge variant={row.visitsBadge.variant} pill className="max-w-full">
                {row.visitsBadge.label}
              </DashboardBadge>
            </div>
          ) : (
            <StackedCell title={row.visits} subtitle={row.visitsDetail} />
          ),
      },
      {
        id: "meetings",
        header: "Meetings",
        className: "min-w-[80px] hidden lg:table-cell",
        cell: (row) => row.meetings || "—",
      },
      {
        id: "quotes",
        header: "Quotes",
        className: "min-w-[120px] hidden xl:table-cell",
        cell: (row) => <BadgeOrDash value={row.quotes} />,
      },
      {
        id: "pipeline",
        header: "Pipeline",
        className: "min-w-[130px] hidden xl:table-cell",
        cell: (row) => <BadgeOrDash value={row.pipeline} />,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px]",
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
              { id: "open",      label: "Open Report",                    onSelect: () => router.push(`/crm/eod-reports/${row.id}`) },
              { id: "activities",label: "View Reps Activities That Day" },
              { id: "reminder",  label: "Send Reminder" },
              { id: "export",    label: "Export" },
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
          EOD Reports
        </h1>
        <DashboardToolbarButton variant="primary" showChevron>
          Create Work Order
        </DashboardToolbarButton>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {EOD_REPORTS_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton>Send reminder</DashboardToolbarButton>
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
                options={EOD_REPORTS_SORT_OPTIONS}
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

      <DashboardDataTable
        columns={columns}
        rows={pageRows}
        getRowId={(row) => row.id}
        emptyMessage="No EOD reports found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/eod-reports/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
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
    </div>
  );
}
