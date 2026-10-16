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
  type FleetEmptyHint,
  type FleetKpiCell,
  type FleetRepair,
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
  { id: "priority", label: "Priority Then Age" },
  { id: "reportedAt", label: "Reported Date" },
  { id: "eta", label: "ETA" },
  { id: "status", label: "Status" },
];

const REPAIR_STATUSES = [
  "OPEN",
  "IN_REPAIR",
  "AWAITING_PARTS",
  "CLOSED",
  "CANCELLED",
];

const REPAIR_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"];

type ModalKind = "vendor" | "eta" | "asset" | "po" | null;

export function RepairRequestsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<FleetKpiCell[]>([]);
  const [emptyHints, setEmptyHints] = React.useState<
    Record<string, FleetEmptyHint>
  >({});
  const [rows, setRows] = React.useState<FleetRepair[]>([]);
  const [workflow, setWorkflow] = React.useState<
    Array<{
      status: string;
      statusLabel: string;
      count: number;
      items: FleetRepair[];
    }>
  >([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortField, setSortField] = React.useState("priority");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [appliedFilters, setAppliedFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);
  const [draftFilters, setDraftFilters] =
    React.useState<FleetFilterValues>(DEFAULT_FLEET_FILTERS);

  const [modalKind, setModalKind] = React.useState<ModalKind>(null);
  const [activeRow, setActiveRow] = React.useState<FleetRepair | null>(null);
  const [modalValue, setModalValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const filterCount = countActiveFleetFilters(appliedFilters);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes, wfRes] = await Promise.all([
        fleetApi.listRepairs({
          page,
          pageSize,
          q: q.trim() || undefined,
          sort: sortField,
          direction: sortDirection,
          status: appliedFilters.status || undefined,
          ...fleetFiltersToParams(appliedFilters),
        }),
        fleetApi.repairsKpi(),
        fleetApi.repairsWorkflow(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi(kpiRes.data.cells ?? []);
      setEmptyHints(kpiRes.data.emptyHints ?? {});
      setWorkflow(wfRes.data.columns ?? []);
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

  function openModal(kind: ModalKind, row: FleetRepair) {
    setModalKind(kind);
    setActiveRow(row);
    if (kind === "vendor") setModalValue(row.vendor ?? "");
    else if (kind === "eta") setModalValue(row.etaLabel ?? "");
    else if (kind === "asset") setModalValue(row.assignedName ?? "");
    else if (kind === "po") setModalValue(row.purchaseOrder ?? "");
    else setModalValue("");
  }

  async function submitModal() {
    if (!activeRow || !modalKind) return;
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (modalKind === "vendor") body.vendorName = modalValue.trim();
      if (modalKind === "eta") body.etaLabel = modalValue.trim();
      if (modalKind === "asset") body.assignedName = modalValue.trim();
      if (modalKind === "po") body.purchaseOrder = modalValue.trim();
      await fleetApi.updateRepair(activeRow.id, body);
      toastSuccess("Repair request updated");
      setModalKind(null);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function resolveRepair(row: FleetRepair) {
    setBusy(true);
    try {
      await fleetApi.resolveRepair(row.id);
      toastSuccess(`${row.code} resolved`);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function cancelRepair(row: FleetRepair) {
    if (!window.confirm(`Cancel repair request ${row.code}?`)) return;
    setBusy(true);
    try {
      await fleetApi.cancelRepair(row.id);
      toastSuccess(`${row.code} cancelled`);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const columns = React.useMemo<DashboardDataTableColumn<FleetRepair>[]>(
    () => [
      {
        id: "code",
        header: "RR#",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#8B9BB4]">
            {row.code}
          </span>
        ),
      },
      {
        id: "asset",
        header: "Asset / Issue",
        cell: (row) => (
          <div className="max-w-[180px]">
            <div className="truncate font-sans text-[11px] uppercase text-[#FDFDFF]">
              {row.assetLabel}
            </div>
            <div className="truncate font-sans text-[10px] uppercase text-[#959597]">
              {row.issue}
            </div>
          </div>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        cell: (row) => (
          <DashboardBadge variant={fleetBadgeTone(row.priorityTone)}>
            {row.priorityLabel}
          </DashboardBadge>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.vendor ?? "—"}
          </span>
        ),
      },
      {
        id: "eta",
        header: "ETA",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[11px] uppercase",
              row.overdueVsEta ? "text-[#FFBBCA]" : "text-[#C8C8C8]",
            )}
          >
            {row.etaLabel ?? "—"}
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
                label: "Open",
                onSelect: () =>
                  toastSuccess(`Repair ${row.code} — detail coming soon`),
              },
              {
                id: "resolve",
                label: "Resolve",
                onSelect: () => void resolveRepair(row),
              },
              {
                id: "vendor",
                label: "Reassign Vendor",
                onSelect: () => openModal("vendor", row),
              },
              {
                id: "eta",
                label: "Update ETA",
                onSelect: () => openModal("eta", row),
              },
              {
                id: "asset",
                label: "Move Asset",
                onSelect: () => openModal("asset", row),
              },
              {
                id: "po",
                label: "Link PO",
                onSelect: () => openModal("po", row),
              },
              {
                id: "contact",
                label: "Contact Vendor",
                onSelect: () => {
                  if (row.contactPhone) {
                    toastSuccess(`Call vendor: ${row.contactPhone}`);
                  } else {
                    toastSuccess("No vendor phone on file");
                  }
                },
              },
              {
                id: "cancel",
                label: "Cancel Request",
                destructive: true,
                onSelect: () => void cancelRepair(row),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const modalTitle =
    modalKind === "vendor"
      ? "Reassign Vendor"
      : modalKind === "eta"
        ? "Update ETA"
        : modalKind === "asset"
          ? "Move Asset"
          : modalKind === "po"
            ? "Link PO"
            : "";

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

      {workflow.length ? (
        <section className="overflow-x-auto rounded-xl border border-[#2D2D30] bg-panel p-3 sm:p-4">
          <p className="mb-3 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            Workflow
          </p>
          <div className="flex min-w-max gap-3">
            {workflow.map((col) => (
              <div
                key={col.status}
                className="w-[160px] shrink-0 rounded-lg border border-[#2D2D30] bg-[#141414] p-2"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-sans text-[10px] uppercase text-[#FDFDFF]">
                    {col.statusLabel}
                  </span>
                  <span className="font-sans text-[10px] uppercase text-[#959597]">
                    {col.count}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {col.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="rounded border border-[#2D2D30] px-2 py-1.5"
                    >
                      <p className="font-sans text-[9px] uppercase text-[#8B9BB4]">
                        {item.code}
                      </p>
                      <p className="truncate font-sans text-[9px] uppercase text-[#C8C8C8]">
                        {item.assetLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search RR#, asset, vendor…"
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
            <span className="hidden font-sans text-[10px] uppercase text-[#959597] sm:inline">
              Urgent rows stay pinned
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
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            emptyMessage="No repair requests match your filters"
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
        fields={["status", "asset", "parentTruck", "dateFrom", "dateTo"]}
        statusOptions={REPAIR_STATUSES}
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
        open={Boolean(modalKind)}
        onClose={() => setModalKind(null)}
        title={modalTitle}
        footer={
          <>
            <DashboardToolbarButton onClick={() => setModalKind(null)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void submitModal()}
            >
              Save
            </DashboardToolbarButton>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
            {modalTitle}
          </span>
          <input
            value={modalValue}
            onChange={(e) => setModalValue(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
          />
        </label>
      </DashboardModal>
    </div>
  );
}
