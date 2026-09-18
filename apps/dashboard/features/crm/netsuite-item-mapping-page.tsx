"use client";

import * as React from "react";
import {
  DashboardBadge,
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
  type CrmNetSuiteItemMapping,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { CreateWorkOrderHeaderButton } from "@/features/app-shell/crm-header-actions";
import { useCrmDialogs } from "./use-crm-dialogs";

type SortKey = "lastSync" | "name" | "code" | "category";
type StatusFilter = "" | "MATCHED" | "PENDING" | "UNMATCHED" | "FAILED";
type WindowChip = "ACTIVE" | "CURRENT" | "FUTURE";

const DEFAULT_WINDOWS: WindowChip[] = ["ACTIVE", "CURRENT", "FUTURE"];

function formatRelative(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatRelativeShort(iso?: string | null) {
  return formatRelative(iso).replace(" ago", "").toUpperCase();
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
        d="M5 12.5 9.5 17 19 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function matchBadgeVariant(
  match: string,
): "success" | "warning" | "error" | "neutral" {
  const s = match.toUpperCase();
  if (s === "MATCHED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "FAILED") return "error";
  return "neutral";
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "SYNCED") return "bg-[#1F3A2E] text-[#6EE7B7]";
  if (s === "PENDING") return "bg-[#2A2240] text-[#C4B5FD]";
  if (s === "UNMATCHED") return "bg-[#3A2E1A] text-[#E8C47C]";
  if (s === "FAILED") return "bg-[#3A1515] text-[#FF6B6B]";
  return "bg-[#2A2A2A] text-[#959597]";
}

function healthTone(health?: string | null) {
  const h = (health ?? "").toUpperCase();
  if (h === "HEALTHY") return "bg-[#1F3A2E] text-[#6EE7B7]";
  if (h === "DEGRADED") return "bg-[#3A1515] text-[#FF6B6B]";
  return null;
}

export function NetSuiteItemMappingPage() {
  const { askConfirm, askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<CrmNetSuiteItemMapping[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("");
  const [windows, setWindows] = React.useState<WindowChip[]>(DEFAULT_WINDOWS);
  const [sortKey, setSortKey] = React.useState<SortKey>("lastSync");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [kpi, setKpi] = React.useState({
    mapped: 0,
    pending: 0,
    unmatched: 0,
    errors: 0,
    lastSyncAt: null as string | null,
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
        crmApi.listNetSuiteItemMappings({
          q: debouncedQ || undefined,
          status: status || undefined,
          window: windowParam,
          page,
          pageSize,
          sort: sortKey,
          direction: sortDir,
        }),
        crmApi.netsuiteItemMappingKpi(),
      ]);
      setRows(listRes.data.items ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi({
        mapped: kpiRes.data.mapped ?? 0,
        pending: kpiRes.data.pending ?? 0,
        unmatched: kpiRes.data.unmatched ?? 0,
        errors: kpiRes.data.errors ?? 0,
        lastSyncAt: kpiRes.data.lastSyncAt ?? null,
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
      const res = await crmApi.syncNetSuiteItems();
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
      const res = await crmApi.autoMatchNetSuiteItems();
      toastSuccess(`Auto-matched ${res.data.matched} items`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoSync(row: CrmNetSuiteItemMapping) {
    try {
      await crmApi.setNetSuiteItemAutoSync(row.id, !row.autoSync);
      toastSuccess(`Auto-sync ${!row.autoSync ? "on" : "off"}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openMap(row: CrmNetSuiteItemMapping) {
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
      await crmApi.mapNetSuiteItem(row.id, netsuiteItemId);
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
      "NetSuite Item",
      "Match",
      "Category",
      "Last Sync",
      "Direction",
      "Direction Detail",
      "Owner",
      "Health",
      "Auto Sync",
      "Status",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.code,
        r.netsuiteItemId ?? "",
        r.match,
        r.category,
        r.lastSyncAt ?? "",
        r.direction,
        r.directionDetail ?? "",
        r.owner?.name ?? "",
        r.health ?? "",
        r.autoSync ? "ON" : "OFF",
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv(
      [header.join(","), ...lines].join("\n"),
      "netsuite-item-mapping.csv",
    );
    toastSuccess("Export downloaded");
  }

  useSetHeaderActions(<CreateWorkOrderHeaderButton />, []);

  const columns = React.useMemo<
    DashboardDataTableColumn<CrmNetSuiteItemMapping>[]
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
        id: "match",
        header: "Match",
        className: "min-w-[100px]",
        cell: (row) => (
          <DashboardBadge variant={matchBadgeVariant(row.match)} pill>
            {row.match}
          </DashboardBadge>
        ),
      },
      {
        id: "category",
        header: "Category",
        className: "min-w-[100px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {row.category}
          </span>
        ),
      },
      {
        id: "lastSync",
        header: "Last Sync",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
            {formatRelative(row.lastSyncAt)}
          </span>
        ),
      },
      {
        id: "direction",
        header: "Direction",
        className: "min-w-[110px]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.direction || "—"}
            </p>
            {row.directionDetail ? (
              <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                {row.directionDetail}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[90px]",
        cell: (row) =>
          row.owner?.name ? (
            <span className="font-sans text-[12px] uppercase text-[#60A5FA] underline">
              {row.owner.name}
            </span>
          ) : (
            <span className="text-[#959597]">—</span>
          ),
      },
      {
        id: "health",
        header: "Health",
        className: "min-w-[100px]",
        cell: (row) => {
          const tone = healthTone(row.health);
          if (!tone) {
            return (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#FF6B6B]/40 text-[#FF6B6B]"
                title="No health"
              >
                —
              </span>
            );
          }
          return (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
                tone,
              )}
            >
              {row.health}
            </span>
          );
        },
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
            meta="Mapped"
            icon="lightning"
          />
          <DashboardStatCell
            title="Pending"
            value={String(kpi.pending)}
            meta="Awaiting"
            icon="document"
          />
          <DashboardStatCell
            title="Unmatched"
            value={String(kpi.unmatched)}
            meta="Need mapping"
            icon="customers"
          />
          <DashboardStatCell
            title="Errors"
            value={String(kpi.errors)}
            meta="Errors"
            icon="document"
          />
          <DashboardStatCell
            title="Mapped"
            value={formatRelativeShort(kpi.lastSyncAt)}
            meta="Auto · 15m"
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
            placeholder="Search WO, Customer, Loca…"
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
                id: "matched",
                label: "Matched",
                onSelect: () => setStatus("MATCHED"),
              },
              {
                id: "pending",
                label: "Pending",
                onSelect: () => setStatus("PENDING"),
              },
              {
                id: "unmatched",
                label: "Unmatched",
                onSelect: () => setStatus("UNMATCHED"),
              },
              {
                id: "failed",
                label: "Failed",
                onSelect: () => setStatus("FAILED"),
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
              {sortKey === "lastSync"
                ? "Effective (Nearest)"
                : sortKey === "name"
                  ? "Item"
                  : sortKey === "code"
                    ? "Code"
                    : "Category"}
            </DashboardToolbarButton>
            <DashboardMenuPopover
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              anchorRef={sortRef}
              align="right"
              className="min-w-[220px]"
              items={[
                {
                  id: "sync-asc",
                  label: "Effective (Nearest)",
                  onSelect: () => {
                    setSortKey("lastSync");
                    setSortDir("asc");
                  },
                },
                {
                  id: "sync-desc",
                  label: "Effective (Newest)",
                  onSelect: () => {
                    setSortKey("lastSync");
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
                  id: "category",
                  label: "Category",
                  onSelect: () => {
                    setSortKey("category");
                    setSortDir("asc");
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
                  id: "failed",
                  label: "Failed syncs",
                  onSelect: () => setStatus("FAILED"),
                },
                {
                  id: "unmatched",
                  label: "Unmatched items",
                  onSelect: () => setStatus("UNMATCHED"),
                },
                {
                  id: "pending",
                  label: "Pending sync",
                  onSelect: () => setStatus("PENDING"),
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
          <BrandLoader label="Loading mappings" />
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            emptyMessage="No item mappings found"
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
        className="min-w-[220px]"
        items={
          rowMenu
            ? [
                {
                  id: "map",
                  label: "Map to a NetSuite Item",
                  onSelect: () => void openMap(rowMenu),
                },
                {
                  id: "create",
                  label: "Create in NetSuite",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.createNetSuiteItem(rowMenu.id);
                        toastSuccess("Created in NetSuite");
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
                        await crmApi.syncNetSuiteItems([rowMenu.id]);
                        toastSuccess("Sync retried");
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  },
                },
                {
                  id: "error",
                  label: "View Error Detail",
                  onSelect: () => {
                    void askConfirm({
                      title: "Sync Error Detail",
                      description:
                        rowMenu.syncError?.trim() ||
                        "No sync error recorded for this item.",
                      confirmLabel: "OK",
                    });
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
                        description: `Remove NetSuite mapping for ${rowMenu.name}.`,
                        confirmLabel: "Unmap",
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await crmApi.unmapNetSuiteItem(rowMenu.id);
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
