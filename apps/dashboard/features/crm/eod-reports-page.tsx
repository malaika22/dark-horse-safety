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
import { mapEodReportRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { EOD_KPI_SHELL, EOD_SORT_OPTIONS } from "./crm-constants";
import type { BadgeCell, EodReportRow } from "./crm-types";

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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8v4.5l3 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function BadgeOrDash({ value }: { value: BadgeCell }) {
  if (!value) return <span className="text-[#959597]">—</span>;
  return (
    <DashboardBadge variant={value.variant} pill className="max-w-full">
      {value.label}
    </DashboardBadge>
  );
}

function StackedCell({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate">{title}</div>
      {subtitle ? (
        <div className="truncate text-[10px] uppercase text-[#959597]">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export function EodReportsPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState<{ id: string; label: string }[]>([]);
  const [sortField, setSortField] = React.useState("reportDate");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
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
  } = useCrmSavedViews("EOD_REPORTS");

  const { rows, total, kpiData, loading } = useCrmList({
    list: (p) => crmApi.listEodReports(p),
    mapRow: mapEodReportRow,
    kpi: () => crmApi.eodReportsKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(EOD_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    setPage(1);
  }, [query, sortField, sortDirection, pageSize]);

  async function handleExport() {
    try {
      const res = await crmApi.exportEodReports({
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

  const columns: DashboardDataTableColumn<EodReportRow>[] = React.useMemo(
    () => [
      {
        id: "reportId",
        header: "Report ID",
        className: "min-w-[110px] max-w-[150px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.reportId}
            subtitle={row.submittedTime}
            underline
          />
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
        cell: (row) => (
          <StackedCell title={row.calls} subtitle={row.callsDetail} />
        ),
      },
      {
        id: "visits",
        header: "Visits",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => (
          <StackedCell title={row.visits} subtitle={row.visitsDetail} />
        ),
      },
      {
        id: "meetings",
        header: "Meetings",
        className: "min-w-[90px] hidden lg:table-cell",
        cell: (row) =>
          row.meetingsBadge ? (
            <DashboardBadge
              variant={row.meetingsBadge.variant}
              pill
              className="max-w-full"
            >
              {row.meetingsBadge.label}
            </DashboardBadge>
          ) : (
            <span className="underline underline-offset-2">
              {row.meetings || "—"}
            </span>
          ),
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
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "open",
                label: "Open Report",
                onSelect: () =>
                  router.push(`/crm/eod-reports/${row.id}`),
              },
              { id: "activities", label: "View Reps Activities That Day" },
              { id: "reminder", label: "Send Reminder" },
              { id: "export", label: "Export" },
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
              <DashboardToolbarButton>Send reminder</DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void handleExport() },
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
              placeholder="Search WO, Customer, Loca..."
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
            >
              Filter
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardSortMenu
                options={EOD_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                leftIcon={<ClockIcon className="shrink-0" />}
                showChevron
                onClick={() => setSavedViewsOpen(true)}
              >
                Review Exceptions
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void handleExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void handleExport() },
                  { id: "pdf", label: "Export as PDF" },
                ]}
              />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={(id) =>
                  setChips((prev) => prev.filter((c) => c.id !== id))
                }
                onClearAll={() => setChips([])}
              />
            ) : null
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={loading ? "Loading EOD reports…" : "No EOD reports found"}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/eod-reports/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
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
