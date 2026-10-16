"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardModal,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  cn,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  fleetApi,
  type FleetEmptyHint,
  type FleetInspection,
  type FleetKpiCell,
} from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  countActiveFleetFilters,
  DEFAULT_FLEET_FILTERS,
  FleetFiltersDrawer,
  fleetFiltersToParams,
  type FleetFilterValues,
} from "./fleet-filters-drawer";
import { FleetFilteredEmptyState } from "./fleet-empty-state";
import { fleetBadgeTone } from "./fleet-ui";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

const SORT_OPTIONS = [
  { id: "inspected", label: "Date Newest First" },
  { id: "asset", label: "Asset" },
  { id: "inspector", label: "Inspector" },
  { id: "result", label: "Result" },
  { id: "type", label: "Type" },
  { id: "itemsFailed", label: "Items Failed" },
];

const INSPECTION_STATUSES = [
  "NEEDS_REVIEW",
  "COMPLETE",
  "REVIEWED",
  "REPAIR_RAISED",
  "EXPIRED",
  "MISSING",
];

const INSPECTION_RESULTS = [
  "FAILED",
  "PASS",
  "PASS_WITH_FINDINGS",
  "NOT_DONE",
];

export function InspectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<FleetKpiCell[]>([]);
  const [emptyHints, setEmptyHints] = React.useState<
    Record<string, FleetEmptyHint>
  >({});
  const [rows, setRows] = React.useState<FleetInspection[]>([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortField, setSortField] = React.useState("inspected");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("desc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [appliedFilters, setAppliedFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);
  const [draftFilters, setDraftFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const [caOpen, setCaOpen] = React.useState(false);
  const [caInspection, setCaInspection] = React.useState<FleetInspection | null>(
    null,
  );
  const [caRootCause, setCaRootCause] = React.useState("");
  const [caDescription, setCaDescription] = React.useState("");
  const [caAssignedTo, setCaAssignedTo] = React.useState("");
  const [caDueDate, setCaDueDate] = React.useState("");
  const [caPriority, setCaPriority] = React.useState("HIGH");
  const [caFindings, setCaFindings] = React.useState<string[]>([]);

  const filterCount = countActiveFleetFilters(appliedFilters);
  const bulkOpen = selectedIds.length > 0;

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes] = await Promise.all([
        fleetApi.listInspections({
          page,
          pageSize,
          q: q.trim() || undefined,
          sort: sortField,
          direction: sortDirection,
          ...fleetFiltersToParams(appliedFilters),
        }),
        fleetApi.inspectionsKpi(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi(kpiRes.data.cells ?? []);
      setEmptyHints(kpiRes.data.emptyHints ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, sortField, sortDirection, appliedFilters]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  function openRecord(row: FleetInspection) {
    router.push(`/fleet/inspections/${row.id}`);
  }

  function applyStatusFilter(status: string) {
    const next = {
      ...appliedFilters,
      status: appliedFilters.status === status ? "" : status,
    };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  }

  function clearStatusFilter() {
    const next = { ...appliedFilters, status: "" };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  }

  function openCorrectiveAction(row: FleetInspection) {
    setCaInspection(row);
    setCaRootCause("");
    setCaDescription("");
    setCaAssignedTo("");
    setCaDueDate("");
    setCaPriority("HIGH");
    setCaFindings(
      row.findings.filter((f) => f.failed).map((f) => f.label),
    );
    setCaOpen(true);
  }

  async function submitCorrectiveAction() {
    if (!caInspection) return;
    if (!caRootCause.trim() || !caDescription.trim() || !caAssignedTo.trim()) {
      toastApiError(new Error("Root cause, description, and assignee required"));
      return;
    }
    setBusy(true);
    try {
      await fleetApi.createCorrectiveAction(caInspection.id, {
        rootCause: caRootCause.trim(),
        description: caDescription.trim(),
        assignedTo: caAssignedTo.trim(),
        dueAt: caDueDate || undefined,
        priority: caPriority,
        findings: caFindings.length ? caFindings : undefined,
      });
      toastSuccess("Corrective action created");
      setCaOpen(false);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function markReviewed(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    try {
      await fleetApi.markInspectionsReviewed(ids);
      toastSuccess(`${ids.length} inspection(s) marked reviewed`);
      setSelectedIds([]);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const columns = React.useMemo<DashboardDataTableColumn<FleetInspection>[]>(
    () => [
      {
        id: "code",
        header: "INS#",
        cell: (row) => (
          <button
            type="button"
            className="font-sans text-[11px] uppercase text-[#8B9BB4] underline underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              void openRecord(row);
            }}
          >
            {row.code}
          </button>
        ),
      },
      {
        id: "asset",
        header: "Asset",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.assetLabel}
          </span>
        ),
      },
      {
        id: "inspector",
        header: "Inspector",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.inspectorName}
          </span>
        ),
      },
      {
        id: "date",
        header: "Date/Due",
        cell: (row) => (
          <div className="font-sans text-[10px] uppercase">
            <div className="text-[#FDFDFF]">{row.dateLabel ?? "—"}</div>
            {row.dueLabel ? (
              <div className="text-[#959597]">{row.dueLabel}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "result",
        header: "Result",
        cell: (row) => (
          <DashboardBadge variant={fleetBadgeTone(row.resultTone)}>
            {row.resultLabel}
          </DashboardBadge>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>
            {row.statusLabel}
          </DashboardBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "open",
                label: "Open Record",
                onSelect: () => void openRecord(row),
              },
              ...(row.result === "FAILED"
                ? [
                    {
                      id: "ca",
                      label: "Create Corrective Action",
                      onSelect: () => openCorrectiveAction(row),
                    },
                  ]
                : []),
              {
                id: "repair",
                label: "Raise Repair",
                onSelect: () => {
                  void (async () => {
                    try {
                      const res = await fleetApi.createRepairFromInspection(
                        row.id,
                      );
                      toastSuccess(res.data.message);
                      void reload();
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                },
              },
              {
                id: "reviewed",
                label: "Mark Reviewed",
                onSelect: () => void markReviewed([row.id]),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router],
  );

  const statusFilter = appliedFilters.status;
  const emptyHint = statusFilter ? emptyHints[statusFilter] : undefined;
  const showFilteredEmpty = !loading && total === 0 && Boolean(emptyHint);

  if (loading && rows.length === 0 && !error) {
    return <OpsLoadingListState />;
  }
  if (error && rows.length === 0) {
    return <OpsLoadFailedState description={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpi.map((cell) => {
            const key = cell.filterKey ?? "";
            const active = Boolean(key && statusFilter === key);
            return (
              <button
                key={cell.title}
                type="button"
                onClick={() => key && applyStatusFilter(key)}
                className={cn(
                  "text-left transition-colors",
                  active && "border-b-2 border-[#FDFDFF]",
                )}
              >
                <DashboardStatCell {...cell} />
              </button>
            );
          })}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <DashboardToolbarButton
              disabled={busy}
              onClick={() => void markReviewed(selectedIds)}
            >
              Mark Selected as Reviewed
            </DashboardToolbarButton>
          }
        />
      ) : null}

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search INS #, Asset, Inspector..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
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
            {filterCount > 0 ? `Filter (${filterCount})` : "Filter"}
          </DashboardToolbarButton>
        }
        actions={
          <>
            <DashboardSortMenu
              options={SORT_OPTIONS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
              showDirectionInTrigger={false}
            />
            <span className="hidden font-sans text-[10px] uppercase text-[#959597] lg:inline">
              Failed rows stay pinned to top
            </span>
            <div className="group relative">
              <DashboardToolbarButton
                disabled={busy || selectedIds.length === 0}
                onClick={() => void markReviewed(selectedIds)}
              >
                Mark Selected as Reviewed
              </DashboardToolbarButton>
              {selectedIds.length === 0 ? (
                <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-72 rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] p-3 shadow-xl group-hover:block">
                  <p className="font-sans text-[11px] font-[590] uppercase text-[#FDFDFF]">
                    Select Rows First
                  </p>
                  <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                    Available to Safety Manager and Fleet Manager
                  </p>
                  <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                    Reviewing clears the Needs Review flag — status becomes
                    Reviewed
                  </p>
                  <p className="mt-2 font-sans text-[10px] uppercase text-[#5ECF8E]">
                    Recorded: Reviewed by R. Crawford · Jun 15, 2:40 PM CT
                  </p>
                  <p className="mt-2 font-sans text-[10px] uppercase text-[#E8C547]">
                    Failed items still require a repair request or corrective
                    action
                  </p>
                </div>
              ) : null}
            </div>
            <DashboardExportMenu
              items={[
                {
                  id: "csv",
                  label: "Export current view · CSV",
                  onSelect: () => {
                    const header = [
                      "INS#",
                      "Asset",
                      "Inspector",
                      "Date",
                      "Result",
                      "Status",
                    ];
                    const lines = rows.map((r) =>
                      [
                        r.code,
                        r.assetLabel,
                        r.inspectorName,
                        r.dateLabel,
                        r.resultLabel,
                        r.statusLabel,
                      ]
                        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
                        .join(","),
                    );
                    const blob = new Blob(
                      [[header.join(","), ...lines].join("\n")],
                      { type: "text/csv" },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "inspections.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  },
                },
              ]}
            />
          </>
        }
      />

      {statusFilter ? (
        <div className="flex flex-wrap items-center gap-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
          <span>Filtered by:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#1A1A1A] px-2 py-1 text-[#FDFDFF]">
            {statusFilter.replace(/_/g, " ")}
            <button type="button" onClick={clearStatusFilter} aria-label="Clear">
              ×
            </button>
          </span>
          <button
            type="button"
            className="text-[#8B9BB4] underline underline-offset-2"
            onClick={clearStatusFilter}
          >
            Clear Filter
          </button>
        </div>
      ) : null}

      {showFilteredEmpty && emptyHint ? (
        <FleetFilteredEmptyState
          title={emptyHint.title}
          subtitle={emptyHint.subtitle}
          actionLabel={emptyHint.actionLabel}
          onAction={clearStatusFilter}
        />
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            emptyMessage="No inspections match your filters"
          />

          <DashboardPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      <FleetFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draftFilters}
        onDraftChange={setDraftFilters}
        fields={[
          "status",
          "result",
          "type",
          "asset",
          "parentTruck",
          "inspector",
          "dateFrom",
          "dateTo",
          "hasLinkedRepair",
          "payrollBlocking",
        ]}
        statusOptions={INSPECTION_STATUSES}
        resultOptions={INSPECTION_RESULTS}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FLEET_FILTERS);
          setAppliedFilters(DEFAULT_FLEET_FILTERS);
          setPage(1);
          setFiltersOpen(false);
        }}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setPage(1);
          setFiltersOpen(false);
        }}
      />

      <DashboardModal
        open={caOpen}
        onClose={() => setCaOpen(false)}
        title="Create Corrective Action"
        footer={
          <>
            <DashboardToolbarButton onClick={() => setCaOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void submitCorrectiveAction()}
            >
              Create
            </DashboardToolbarButton>
          </>
        }
      >
        {caInspection ? (
          <div className="space-y-4">
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              Source: {caInspection.code} · {caInspection.assetLabel}
            </p>
            {caInspection.findings.filter((f) => f.failed).length ? (
              <div>
                <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
                  Findings
                </p>
                <div className="space-y-2">
                  {caInspection.findings
                    .filter((f) => f.failed)
                    .map((f) => (
                      <label key={f.label} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={caFindings.includes(f.label)}
                          onChange={(e) => {
                            setCaFindings((prev) =>
                              e.target.checked
                                ? [...prev, f.label]
                                : prev.filter((x) => x !== f.label),
                            );
                          }}
                          className="h-4 w-4"
                        />
                        <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                          {f.label}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            ) : null}
            {(
              [
                ["Root Cause", caRootCause, setCaRootCause],
                ["Description", caDescription, setCaDescription],
                ["Assigned To", caAssignedTo, setCaAssignedTo],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="block">
                <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                  {label}
                </span>
                <input
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                  Due Date
                </span>
                <input
                  type="date"
                  value={caDueDate}
                  onChange={(e) => setCaDueDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] text-[#FDFDFF] outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                  Priority
                </span>
                <select
                  value={caPriority}
                  onChange={(e) => setCaPriority(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                >
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
