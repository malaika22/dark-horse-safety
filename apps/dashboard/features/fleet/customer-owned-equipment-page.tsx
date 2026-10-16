"use client";

import * as React from "react";
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
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  fleetApi,
  type FleetCustomerOwned,
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
import { fleetBadgeTone } from "./fleet-ui";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

const SORT_OPTIONS = [
  { id: "nextDueAt", label: "Next Due" },
  { id: "customer", label: "Customer" },
  { id: "asset", label: "Asset" },
  { id: "status", label: "Status" },
];

const CO_STATUSES = [
  "OVERDUE",
  "EXPIRING",
  "NEEDS_REVIEW",
  "CURRENT",
];

export function CustomerOwnedEquipmentPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<FleetKpiCell[]>([]);
  const [rows, setRows] = React.useState<FleetCustomerOwned[]>([]);
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
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<FleetCustomerOwned | null>(null);

  const [freqOpen, setFreqOpen] = React.useState(false);
  const [freqRow, setFreqRow] = React.useState<FleetCustomerOwned | null>(null);
  const [freqDays, setFreqDays] = React.useState(365);

  const filterCount = countActiveFleetFilters(appliedFilters);
  const bulkOpen = selectedIds.length > 0;

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes] = await Promise.all([
        fleetApi.listCustomerOwned({
          page,
          pageSize,
          q: q.trim() || undefined,
          sort: sortField,
          direction: sortDirection,
          ...fleetFiltersToParams(appliedFilters),
        }),
        fleetApi.customerOwnedKpi(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi(kpiRes.data.cells ?? []);
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

  const kpiCells = React.useMemo(() => {
    const cells = [...kpi];
    if (cells.length < 5) {
      cells.push({
        title: "Total Registered",
        value: String(total),
        meta: "ON CUSTOMER SITES",
      });
    }
    return cells.slice(0, 5);
  }, [kpi, total]);

  async function openRecord(row: FleetCustomerOwned) {
    try {
      const res = await fleetApi.getCustomerOwned(row.id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function markReviewed(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    try {
      await fleetApi.markCustomerOwnedReviewed(ids);
      toastSuccess(`${ids.length} item(s) marked reviewed`);
      setSelectedIds([]);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function markOutOfService(row: FleetCustomerOwned) {
    toastSuccess(`${row.code} — out of service stub (customer-owned)`);
  }

  async function submitFrequency() {
    if (!freqRow) return;
    toastSuccess(`Frequency adjusted for ${freqRow.description} — stub`);
    setFreqOpen(false);
  }

  const columns = React.useMemo<DashboardDataTableColumn<FleetCustomerOwned>[]>(
    () => [
      {
        id: "code",
        header: "Code",
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
        header: "Equipment",
        cell: (row) => (
          <div>
            <div className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              {row.description}
            </div>
            <DashboardBadge variant="review" className="mt-1">
              Customer Owned
            </DashboardBadge>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "due",
        header: "Next Due",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.dueLabel ?? "—"}
          </span>
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
              {
                id: "cal",
                label: "Add Calibration",
                onSelect: () =>
                  toastSuccess("Add calibration — coming soon"),
              },
              {
                id: "asset",
                label: "View Asset",
                onSelect: () =>
                  toastSuccess(`View asset ${row.description}`),
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
                  setFreqDays(365);
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

  if (loading && rows.length === 0 && !error) {
    return <OpsLoadingListState />;
  }
  if (error && rows.length === 0) {
    return <OpsLoadFailedState description={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="rounded-xl border border-[#2D4A6E] bg-[#121A24] px-4 py-3">
        <p className="font-sans text-[11px] uppercase leading-relaxed text-[#93C5FD]">
          Customer-owned equipment is tracked for inspection compliance only.
          Dark Horse does not own or maintain these assets — ownership remains
          with the customer.
        </p>
      </div>

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
            <DashboardToolbarButton
              disabled={busy}
              onClick={() => void markReviewed(selectedIds)}
            >
              Mark Selected as Reviewed
            </DashboardToolbarButton>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search customer, well, equipment…"
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
      )}

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        emptyMessage="No customer-owned equipment matches your filters"
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

      <FleetFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draftFilters}
        onDraftChange={setDraftFilters}
        fields={["status", "asset", "dateFrom", "dateTo"]}
        statusOptions={CO_STATUSES}
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
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detail Screen — Not Built Yet"
      >
        {detail ? (
          <div className="space-y-4 font-sans text-[11px] uppercase">
            <section>
              <p className="mb-2 text-[#959597]">Equipment Info</p>
              <p className="text-[#FDFDFF]">{detail.description}</p>
              {detail.model ? (
                <p className="text-[#C8C8C8]">Model: {detail.model}</p>
              ) : null}
              {detail.serial ? (
                <p className="text-[#C8C8C8]">Serial: {detail.serial}</p>
              ) : null}
            </section>
            <section>
              <p className="mb-2 text-[#959597]">Owning Customer</p>
              <p className="text-[#FDFDFF]">{detail.customerName}</p>
            </section>
            <section>
              <p className="mb-2 text-[#959597]">Location / Well</p>
              <p className="text-[#FDFDFF]">
                {detail.wellSite ?? "—"}
                {detail.county ? ` · ${detail.county}` : ""}
              </p>
            </section>
            <section>
              <p className="mb-2 text-[#959597]">Inspection History</p>
              <p className="text-[#C8C8C8]">
                Last: {detail.dateLabel ?? "—"}{" "}
                {detail.lastInspectionResult
                  ? `· ${detail.lastInspectionResult}`
                  : ""}
              </p>
              <p className="text-[#959597]">Full history — placeholder</p>
            </section>
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        open={freqOpen}
        onClose={() => setFreqOpen(false)}
        title="Adjust Frequency"
        footer={
          <>
            <DashboardToolbarButton onClick={() => setFreqOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
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
      </DashboardModal>
    </div>
  );
}
