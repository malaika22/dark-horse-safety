"use client";

import * as React from "react";
import {
  DashboardDataTable,
  DashboardMenuPopover,
  DashboardPagination,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  downloadCsv,
  type CrmItemRateMapping,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { CreateWorkOrderHeaderButton } from "@/features/app-shell/crm-header-actions";
import { useCrmDialogs } from "./use-crm-dialogs";

type SortKey = "effectiveFrom" | "name" | "code" | "dhsRate";
type StatusFilter = "" | "MAPPED" | "REVIEW" | "UNMAPPED" | "VARIANCE";
type WindowChip = "ACTIVE" | "CURRENT" | "FUTURE";

const DEFAULT_WINDOWS: WindowChip[] = ["ACTIVE", "CURRENT", "FUTURE"];

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatVariance(value?: number | null) {
  if (value == null) return "—";
  if (Math.abs(value) < 0.005) return "$0";
  const sign = value > 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(0)}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6v12M5 9l3-3 3 3M16 18V6M13 15l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8v4l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExportGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "MAPPED") return "bg-[#2A2240] text-[#C4B5FD]";
  if (s === "REVIEW") return "bg-[#1F3A2E] text-[#6EE7B7]";
  if (s === "UNMAPPED") return "bg-[#2A2240] text-[#A78BFA]";
  return "bg-[#2A2A2A] text-[#959597]";
}

function varianceTone(value?: number | null) {
  if (value == null) return "text-[#959597]";
  if (Math.abs(value) < 0.005) return "text-[#FDFDFF]";
  if (value < 0) return "text-[#6EE7B7]";
  return "text-[#FF6B6B]";
}

export function ItemRateMappingPage() {
  const { askConfirm, askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<CrmItemRateMapping[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("");
  const [windows, setWindows] = React.useState<WindowChip[]>(DEFAULT_WINDOWS);
  const [sortKey, setSortKey] = React.useState<SortKey>("effectiveFrom");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [kpi, setKpi] = React.useState({
    mapped: 0,
    review: 0,
    unmapped: 0,
    variance: 0,
    items: 0,
  });
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [exceptionsOpen, setExceptionsOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [rowMenuId, setRowMenuId] = React.useState<string | null>(null);
  const filterRef = React.useRef<HTMLButtonElement>(null);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const exceptionsRef = React.useRef<HTMLButtonElement>(null);
  const exportRef = React.useRef<HTMLButtonElement>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, sortKey, sortDir, windows]);

  const windowParam =
    windows.length > 0 && windows.length < DEFAULT_WINDOWS.length
      ? windows.join(",")
      : undefined;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, kpiRes] = await Promise.all([
        crmApi.listItemRateMappings({
          q: debouncedQ || undefined,
          status: status || undefined,
          window: windowParam,
          page,
          pageSize,
          sort: sortKey,
          direction: sortDir,
        }),
        crmApi.itemRateMappingKpi(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi({
        mapped: kpiRes.data.mapped ?? 0,
        review: kpiRes.data.review ?? 0,
        unmapped: kpiRes.data.unmapped ?? 0,
        variance: kpiRes.data.variance ?? 0,
        items: kpiRes.data.items ?? 0,
      });
    } catch (err) {
      toastApiError(err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQ,
    status,
    windowParam,
    page,
    pageSize,
    sortKey,
    sortDir,
    reloadKey,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSyncNow() {
    setBusy(true);
    try {
      const res = await crmApi.syncItemRates();
      toastSuccess(`Synced ${res.data.synced} · ${res.data.failed} failed`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoMatch() {
    setBusy(true);
    try {
      const res = await crmApi.autoMatchItemRates();
      toastSuccess(`Auto-matched ${res.data.matched} items`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoSync(row: CrmItemRateMapping) {
    try {
      await crmApi.setItemRateAutoSync(row.id, !row.autoSync);
      toastSuccess(`Auto-sync ${!row.autoSync ? "on" : "off"}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openMap(row: CrmItemRateMapping) {
    const value = await askPrompt({
      title: `Map NetSuite Item · ${row.name}`,
      label: "NetSuite Item ID",
      placeholder: "NS-ITM-01",
      confirmLabel: "Map",
    });
    if (value == null) return;
    const netsuiteItemId = value.trim().toUpperCase();
    if (!/^NS-ITM-[A-Z0-9-]+$/i.test(netsuiteItemId)) {
      toastApiError(new Error("NetSuite Item ID must match NS-ITM-##"));
      return;
    }
    try {
      await crmApi.mapItemRate(row.id, netsuiteItemId);
      toastSuccess("Item mapped");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  function removeWindow(chip: WindowChip) {
    setWindows((prev) => prev.filter((w) => w !== chip));
  }

  function handleExport() {
    const header = [
      "Item",
      "Code",
      "DHS Rate",
      "NetSuite Item",
      "NetSuite Rate",
      "Unit",
      "Duration",
      "Effective",
      "Owner",
      "Variance",
      "Auto Sync",
      "Status",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.code,
        r.dhsRate,
        r.netsuiteItemId ?? "",
        r.netsuiteRate ?? "",
        r.unit ?? "",
        r.duration ?? "",
        r.effectiveFrom ?? "",
        r.owner?.name ?? "",
        r.variance ?? "",
        r.autoSync ? "ON" : "OFF",
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv(
      [header.join(","), ...lines].join("\n"),
      "item-rate-mapping.csv",
    );
    toastSuccess("Export downloaded");
  }

  useSetHeaderActions(<CreateWorkOrderHeaderButton />, []);

  const columns = React.useMemo<
    DashboardDataTableColumn<CrmItemRateMapping>[]
  >(
    () => [
      {
        id: "item",
        header: "Item",
        className: "min-w-[150px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {row.name}
            </p>
            <span className="mt-0.5 inline-block font-sans text-[11px] uppercase tracking-[-0.02em] text-[#60A5FA] underline">
              {row.code}
            </span>
          </div>
        ),
      },
      {
        id: "dhsRate",
        header: "DHS Rate",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
            {formatMoney(row.dhsRate)}
          </span>
        ),
      },
      {
        id: "netsuiteItem",
        header: "NetSuite Item",
        className: "min-w-[110px]",
        cell: (row) =>
          row.netsuiteItemId ? (
            <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
              {row.netsuiteItemId}
            </span>
          ) : (
            <button
              type="button"
              className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#60A5FA] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                void openMap(row);
              }}
            >
              + Map
            </button>
          ),
      },
      {
        id: "netsuiteRate",
        header: "NetSuite Rate",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
            {formatMoney(row.netsuiteRate)}
          </span>
        ),
      },
      {
        id: "unit",
        header: "Unit",
        className: "min-w-[120px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {[row.unit, row.duration].filter(Boolean).join(" / ") || "—"}
          </span>
        ),
      },
      {
        id: "effective",
        header: "Effective",
        className: "min-w-[140px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {[formatDate(row.effectiveFrom), row.effectiveDetail]
              .filter((v) => v && v !== "—")
              .join(" / ") || "—"}
          </span>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[90px]",
        cell: (row) =>
          row.owner?.name ? (
            <span className="inline-flex rounded-md bg-[#3A1515] px-2 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FF6B6B] underline">
              {row.owner.name}
            </span>
          ) : (
            <span className="text-[#959597]">—</span>
          ),
      },
      {
        id: "variance",
        header: "Variance",
        className: "min-w-[90px]",
        cell: (row) => (
          <span
            className={cn(
              "font-sans text-[12px] uppercase tabular-nums",
              varianceTone(row.variance),
            )}
          >
            {formatVariance(row.variance)}
          </span>
        ),
      },
      {
        id: "auto",
        header: "Auto",
        className: "min-w-[80px]",
        cell: (row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void toggleAutoSync(row);
            }}
            className={cn(
              "inline-flex rounded-full px-3 py-1 font-sans text-[10px] font-[590] uppercase tracking-[-0.02em]",
              row.autoSync
                ? "bg-[#1F3A2E] text-[#6EE7B7]"
                : "bg-[#3A1515] text-[#FF6B6B]",
            )}
          >
            {row.autoSync ? "On" : "Off"}
          </button>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[100px]",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
              statusTone(row.status),
            )}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <button
            type="button"
            aria-label="Row actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
            onClick={(e) => {
              e.stopPropagation();
              rowMenuRef.current = e.currentTarget;
              setRowMenuId((id) => (id === row.id ? null : row.id));
            }}
          >
            <KebabIcon />
          </button>
        ),
      },
    ],
    [],
  );

  const rowMenu = rows.find((r) => r.id === rowMenuId) ?? null;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          <DashboardStatCell
            title="Mapped"
            value={String(kpi.mapped)}
            meta="1:1 Rate"
            icon="lightning"
          />
          <DashboardStatCell
            title="Review"
            value={String(kpi.review)}
            meta="Rate differs"
            icon="document"
          />
          <DashboardStatCell
            title="Unmapped"
            value={String(kpi.unmapped)}
            meta="No NS item"
            icon="customers"
          />
          <DashboardStatCell
            title="Variance"
            value={String(kpi.variance)}
            meta="Flagged"
            icon="document"
          />
          <DashboardStatCell
            title="Items"
            value={String(kpi.items)}
            meta="Total"
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item or NetSuite…"
            className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
          />
        </div>
        <div className="relative">
          <DashboardToolbarButton
            ref={filterRef}
            leftIcon={<FilterIcon />}
            onClick={() => setFilterOpen((o) => !o)}
          >
            Filter
          </DashboardToolbarButton>
          <DashboardMenuPopover
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            anchorRef={filterRef}
            align="right"
            className="min-w-[180px]"
            items={[
              { id: "all", label: "All statuses", onSelect: () => setStatus("") },
              {
                id: "mapped",
                label: "Mapped",
                onSelect: () => setStatus("MAPPED"),
              },
              {
                id: "review",
                label: "Review",
                onSelect: () => setStatus("REVIEW"),
              },
              {
                id: "unmapped",
                label: "Unmapped",
                onSelect: () => setStatus("UNMAPPED"),
              },
              {
                id: "variance",
                label: "Variance flagged",
                onSelect: () => setStatus("VARIANCE"),
              },
            ]}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <DashboardToolbarButton
              ref={sortRef}
              leftIcon={<SortIcon />}
              showChevron
              onClick={() => setSortOpen((o) => !o)}
            >
              Sort:{" "}
              {sortKey === "effectiveFrom"
                ? "Effective (Nearest)"
                : sortKey === "name"
                  ? "Item"
                  : sortKey === "code"
                    ? "Code"
                    : "DHS Rate"}
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              anchorRef={sortRef}
              align="right"
              className="min-w-[220px]"
              items={[
                {
                  id: "eff-asc",
                  label: "Effective (Nearest)",
                  onSelect: () => {
                    setSortKey("effectiveFrom");
                    setSortDir("asc");
                  },
                },
                {
                  id: "eff-desc",
                  label: "Effective (Newest)",
                  onSelect: () => {
                    setSortKey("effectiveFrom");
                    setSortDir("desc");
                  },
                },
                {
                  id: "name",
                  label: "Item A–Z",
                  onSelect: () => {
                    setSortKey("name");
                    setSortDir("asc");
                  },
                },
                {
                  id: "rate",
                  label: "DHS Rate",
                  onSelect: () => {
                    setSortKey("dhsRate");
                    setSortDir("desc");
                  },
                },
              ]}
            />
          </div>
          <div className="relative">
            <DashboardToolbarButton
              ref={exceptionsRef}
              leftIcon={<ClockIcon />}
              showChevron
              onClick={() => setExceptionsOpen((o) => !o)}
            >
              Review Exceptions
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={exceptionsOpen}
              onClose={() => setExceptionsOpen(false)}
              anchorRef={exceptionsRef}
              align="right"
              className="min-w-[200px]"
              items={[
                {
                  id: "sync",
                  label: "Sync Now",
                  onSelect: () => void handleSyncNow(),
                },
                {
                  id: "auto",
                  label: "Auto-Match by Name",
                  onSelect: () => void handleAutoMatch(),
                },
                {
                  id: "review",
                  label: "Rate differs",
                  onSelect: () => setStatus("REVIEW"),
                },
                {
                  id: "unmapped",
                  label: "Unmapped items",
                  onSelect: () => setStatus("UNMAPPED"),
                },
                {
                  id: "variance",
                  label: "Variance flagged",
                  onSelect: () => setStatus("VARIANCE"),
                },
              ]}
            />
          </div>
          <div className="relative">
            <DashboardToolbarButton
              ref={exportRef}
              leftIcon={<ExportGlyph />}
              showChevron
              onClick={() => setExportOpen((o) => !o)}
            >
              Export
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={exportOpen}
              onClose={() => setExportOpen(false)}
              anchorRef={exportRef}
              align="right"
              className="min-w-[180px]"
              items={[
                {
                  id: "csv",
                  label: "Export CSV",
                  onSelect: handleExport,
                },
              ]}
            />
          </div>
        </div>
      </div>

      {windows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {windows.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => removeWindow(chip)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:border-[#5A5A5A]"
            >
              {chip}
              <span aria-hidden className="text-[#959597]">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWindows([])}
            className="font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_WINDOWS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setWindows([chip])}
              className="inline-flex items-center rounded-full border border-dashed border-[#3E3E3E] px-3 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
            >
              + {chip}
            </button>
          ))}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <BrandLoader label="Loading rate mappings" />
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            emptyMessage="No item rate mappings found"
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

      <DashboardMenuPopover
        open={Boolean(rowMenu)}
        onClose={() => setRowMenuId(null)}
        anchorRef={rowMenuRef}
        align="right"
        className="min-w-[240px]"
        items={
          rowMenu
            ? [
                {
                  id: "map",
                  label: "Map to a NetSuite Item",
                  onSelect: () => void openMap(rowMenu),
                },
                {
                  id: "accept",
                  label: "Accept NetSuite Rate",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.acceptItemRateNs(rowMenu.id);
                        toastSuccess("DHS rate updated from NetSuite");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "push",
                  label: "Push DHS Rate to NetSuite",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.pushItemRateDhs(rowMenu.id);
                        toastSuccess("DHS rate pushed to NetSuite");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "retry",
                  label: "Retry Sync",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.syncItemRates([rowMenu.id]);
                        toastSuccess("Sync retried");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "auto",
                  label: rowMenu.autoSync ? "Turn Auto Off" : "Turn Auto On",
                  onSelect: () => void toggleAutoSync(rowMenu),
                },
                {
                  id: "unmap",
                  label: "Unmap",
                  destructive: true,
                  onSelect: () => {
                    void (async () => {
                      const ok = await askConfirm({
                        title: "Unmap from NetSuite?",
                        description: `Remove NetSuite rate mapping for ${rowMenu.name}.`,
                        confirmLabel: "Unmap",
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await crmApi.unmapItemRate(rowMenu.id);
                        toastSuccess("Item unmapped");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
              ]
            : []
        }
      />

      {dialogs}
    </div>
  );
}
