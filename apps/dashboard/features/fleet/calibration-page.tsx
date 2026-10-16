"use client";

import * as React from "react";
import {
  DashboardBadge,
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
  type FleetCalibration,
  type FleetEmptyHint,
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

const SORT_OPTIONS = [{ id: "nextDueAt", label: "Next Due (Soonest)" }];

const STATUS_CHIPS = [
  { id: "OVERDUE", label: "Overdue" },
  { id: "DUE_SOON", label: "Due Soon" },
  { id: "CURRENT", label: "Current" },
  { id: "OUT_OF_SERVICE", label: "Out of Service" },
];

const CAL_STATUSES = ["OVERDUE", "DUE_SOON", "CURRENT", "OUT_OF_SERVICE"];

export function CalibrationPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<FleetKpiCell[]>([]);
  const [emptyHints, setEmptyHints] = React.useState<
    Record<string, FleetEmptyHint>
  >({});
  const [rows, setRows] = React.useState<FleetCalibration[]>([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortField, setSortField] = React.useState("nextDueAt");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [appliedFilters, setAppliedFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);
  const [draftFilters, setDraftFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);

  const [freqOpen, setFreqOpen] = React.useState(false);
  const [freqRow, setFreqRow] = React.useState<FleetCalibration | null>(null);
  const [freqDays, setFreqDays] = React.useState(365);
  const [busy, setBusy] = React.useState(false);

  const filterCount = countActiveFleetFilters(appliedFilters);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes] = await Promise.all([
        fleetApi.listCalibrations({
          page,
          pageSize,
          q: q.trim() || undefined,
          sort: sortField,
          direction: sortDirection,
          ...fleetFiltersToParams(appliedFilters),
        }),
        fleetApi.calibrationsKpi(),
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

  async function markOutOfService(row: FleetCalibration) {
    if (
      !window.confirm(
        `Mark ${row.assetLabel} out of service? Asset cannot deploy until cleared.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await fleetApi.markCalibrationOutOfService(row.id);
      toastSuccess("Marked out of service");
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitFrequency() {
    if (!freqRow) return;
    setBusy(true);
    try {
      await fleetApi.adjustCalibrationFrequency(freqRow.id, freqDays);
      toastSuccess("Calibration frequency updated");
      setFreqOpen(false);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const needsAction = rows.filter(
    (r) =>
      r.status === "OVERDUE" ||
      r.status === "DUE_SOON" ||
      r.status === "OUT_OF_SERVICE",
  );
  const currentRows = rows.filter((r) => r.status === "CURRENT");

  const columns = React.useMemo<DashboardDataTableColumn<FleetCalibration>[]>(
    () => [
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
        id: "model",
        header: "Model",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.model}
          </span>
        ),
      },
      {
        id: "lastCal",
        header: "Last Cal",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.dateLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "nextDue",
        header: "Next Due",
        cell: (row) => (
          <div className="font-sans text-[10px] uppercase">
            <div className="text-[#FDFDFF]">{row.dueLabel ?? "—"}</div>
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
                onSelect: () =>
                  toastSuccess(`Calibration ${row.code} — detail coming soon`),
              },
              {
                id: "add",
                label: "Add Calibration",
                onSelect: () =>
                  toastSuccess("Add calibration — modal coming soon"),
              },
              {
                id: "asset",
                label: "View Asset",
                onSelect: () =>
                  toastSuccess(`Asset ${row.assetCode} — fleet assets`),
              },
              {
                id: "cert",
                label: "Download Certificate",
                onSelect: () =>
                  toastSuccess("Certificate download — coming soon"),
              },
              {
                id: "freq",
                label: "Adjust Frequency",
                onSelect: () => {
                  setFreqRow(row);
                  setFreqDays(row.frequencyDays);
                  setFreqOpen(true);
                },
              },
              {
                id: "oos",
                label: "Mark Out of Service",
                destructive: true,
                onSelect: () => void markOutOfService(row),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const statusFilter = appliedFilters.status;
  const emptyHint = statusFilter ? emptyHints[statusFilter] : undefined;
  const showFilteredEmpty = !loading && total === 0 && Boolean(emptyHint);

  function renderTable(sectionRows: FleetCalibration[], title?: string) {
    if (!sectionRows.length) return null;
    return (
      <div className="space-y-2">
        {title ? (
          <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            {title}
          </p>
        ) : null}
        <DashboardDataTable
          columns={columns}
          rows={sectionRows}
          getRowId={(row) => row.id}
          emptyMessage="No calibration records"
        />
      </div>
    );
  }

  if (loading && rows.length === 0 && !error) {
    return <OpsLoadingListState />;
  }
  if (error && rows.length === 0) {
    return <OpsLoadFailedState description={error} onRetry={reload} />;
  }

  const grouped = !statusFilter && needsAction.length && currentRows.length;

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

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search asset, model, serial…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        }
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              {filterCount > 0 ? `Filter (${filterCount})` : "Filter"}
            </DashboardToolbarButton>
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => applyStatusFilter(chip.id)}
                className={`rounded-md border px-2.5 py-1 font-sans text-[10px] uppercase transition-colors ${
                  statusFilter === chip.id
                    ? "border-[#3B82F6] bg-[#1E3A5F] text-[#93C5FD]"
                    : "border-[#2D2D30] text-[#959597] hover:text-[#FDFDFF]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
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
            <span className="hidden font-sans text-[10px] uppercase text-[#959597] sm:inline">
              Overdue rows stay pinned
            </span>
            <DashboardExportMenu
              items={[
                {
                  id: "csv",
                  label: "Export current view · CSV",
                  onSelect: () => toastSuccess("Export started"),
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
          {grouped ? (
            <>
              {renderTable(needsAction, "Needs Action")}
              {renderTable(currentRows, "Current")}
            </>
          ) : (
            renderTable(rows)
          )}

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
        fields={["status", "asset", "parentTruck", "dateFrom", "dateTo"]}
        statusOptions={CAL_STATUSES}
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
        open={freqOpen}
        onClose={() => setFreqOpen(false)}
        title="Adjust Calibration Frequency"
        footer={
          <>
            <DashboardToolbarButton onClick={() => setFreqOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void submitFrequency()}
            >
              Save
            </DashboardToolbarButton>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            Frequency (Days)
          </span>
          <input
            type="number"
            min={1}
            value={freqDays}
            onChange={(e) => setFreqDays(Number(e.target.value) || 1)}
            className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] text-[#FDFDFF] outline-none"
          />
        </label>
        {freqRow ? (
          <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">
            Asset: {freqRow.assetLabel}
          </p>
        ) : null}
      </DashboardModal>
    </div>
  );
}
