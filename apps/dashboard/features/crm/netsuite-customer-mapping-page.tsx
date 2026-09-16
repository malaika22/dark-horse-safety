"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardMenuPopover,
  DashboardPagination,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  SyncIcon,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  downloadCsv,
  type CrmNetSuiteCustomerMapping,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { useCrmDialogs } from "./use-crm-dialogs";

type SortKey = "lastSync" | "name" | "status" | "code";
type StatusFilter = "" | "MAPPED" | "PENDING" | "UNMATCHED" | "FAILED";

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

function statusBadgeVariant(
  status: string,
): "success" | "warning" | "error" | "neutral" {
  const s = status.toUpperCase();
  if (s === "MAPPED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "FAILED") return "error";
  return "neutral";
}

function resultTone(result?: string | null) {
  const r = (result ?? "").toUpperCase();
  if (r === "SUCCESS") return "bg-[#1F3A2E] text-[#6EE7B7]";
  if (r === "PARTIAL") return "bg-[#3A2E1A] text-[#E8C47C]";
  if (r === "FAILED") return "bg-[#3A1515] text-[#FF6B6B]";
  return "bg-[#2A2A2A] text-[#959597]";
}

export function NetSuiteCustomerMappingPage() {
  const { askConfirm, askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<CrmNetSuiteCustomerMapping[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("");
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
  }, [debouncedQ, status, sortKey, sortDir]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, kpiRes] = await Promise.all([
        crmApi.listNetSuiteCustomerMappings({
          q: debouncedQ || undefined,
          status: status || undefined,
          page,
          pageSize,
          sort: sortKey === "status" ? "name" : sortKey,
          direction: sortDir,
        }),
        crmApi.netsuiteCustomerMappingKpi(),
      ]);
      let items = listRes.data.items ?? [];
      if (sortKey === "status") {
        items = [...items].sort((a, b) => {
          const cmp = a.status.localeCompare(b.status);
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
      setRows(items);
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
  }, [debouncedQ, status, page, pageSize, sortKey, sortDir, reloadKey]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSyncNow() {
    setBusy(true);
    try {
      const res = await crmApi.syncNetSuiteCustomers();
      toastSuccess(
        `Synced ${res.data.synced} · ${res.data.failed} failed`,
      );
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
      const res = await crmApi.autoMatchNetSuiteCustomers();
      toastSuccess(`Auto-matched ${res.data.matched} customers`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoExport(row: CrmNetSuiteCustomerMapping) {
    try {
      await crmApi.setNetSuiteAutoExport(row.id, !row.autoExport);
      toastSuccess(`Auto-export ${!row.autoExport ? "on" : "off"}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openMap(row: CrmNetSuiteCustomerMapping) {
    const value = await askPrompt({
      title: `Map NetSuite ID · ${row.name}`,
      label: "NetSuite ID",
      placeholder: "NS-0004471",
      confirmLabel: "Map",
      defaultValue: row.netsuiteId ?? "",
    });
    if (value == null) return;
    const netsuiteId = value.trim().toUpperCase();
    if (!/^NS-\d{7}$/i.test(netsuiteId)) {
      toastApiError(new Error("NetSuite ID must match NS-#######"));
      return;
    }
    try {
      await crmApi.mapNetSuiteCustomer(row.id, netsuiteId);
      toastSuccess("Customer mapped");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  function handleExport() {
    const header = [
      "Customer",
      "Code",
      "NetSuite ID",
      "Status",
      "Customer Type",
      "Last Sync",
      "Owner",
      "Last Result",
      "Auto Export",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.code,
        r.netsuiteId ?? "",
        r.status,
        r.customerType,
        r.lastSyncAt ?? "",
        r.owner?.name ?? "",
        r.lastResult ?? "",
        r.autoExport ? "ON" : "OFF",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv(
      [header.join(","), ...lines].join("\n"),
      "netsuite-customer-mapping.csv",
    );
    toastSuccess("Export downloaded");
  }

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<SyncIcon className="shrink-0" />}
      disabled={busy}
      onClick={() => void handleSyncNow()}
    >
      Sync Now
    </DashboardToolbarButton>,
    [busy],
  );

  const columns = React.useMemo<
    DashboardDataTableColumn<CrmNetSuiteCustomerMapping>[]
  >(
      () => [
        {
          id: "customer",
          header: "Customer",
          className: "min-w-[160px]",
          cell: (row) => (
            <div className="min-w-0">
              <p className="truncate font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {row.name}
              </p>
              <Link
                href={`/crm/accounts/${row.id}`}
                className="mt-0.5 inline-block font-sans text-[11px] uppercase tracking-[-0.02em] text-[#60A5FA] underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.code}
              </Link>
            </div>
          ),
        },
        {
          id: "netsuiteId",
          header: "NetSuite ID",
          className: "min-w-[110px]",
          cell: (row) =>
            row.netsuiteId ? (
              <span className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                {row.netsuiteId}
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
          id: "status",
          header: "Status",
          className: "min-w-[100px]",
          cell: (row) => (
            <DashboardBadge variant={statusBadgeVariant(row.status)} pill>
              {row.status}
            </DashboardBadge>
          ),
        },
        {
          id: "customerType",
          header: "Customer Type",
          className: "min-w-[110px]",
          cell: (row) => (
            <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
              {row.customerType}
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
          id: "owner",
          header: "Account Owner",
          className: "min-w-[120px]",
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
          id: "lastResult",
          header: "Last Result",
          className: "min-w-[140px]",
          cell: (row) => (
            <div className="min-w-0">
              {row.lastResult ? (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
                    resultTone(row.lastResult),
                  )}
                >
                  {row.lastResult}
                </span>
              ) : (
                <span className="text-[#959597]">—</span>
              )}
              {row.syncError ? (
                <p className="mt-1 truncate font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FF6B6B]">
                  {row.syncError.replace(/\s*-\s*Export.*/i, "")} · View Error
                </p>
              ) : null}
            </div>
          ),
        },
        {
          id: "autoExport",
          header: "Auto-Export",
          className: "min-w-[100px]",
          cell: (row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void toggleAutoExport(row);
              }}
              className={cn(
                "inline-flex rounded-full px-3 py-1 font-sans text-[10px] font-[590] uppercase tracking-[-0.02em]",
                row.autoExport
                  ? "bg-[#1F3A2E] text-[#6EE7B7]"
                  : "bg-[#2A2A2A] text-[#959597]",
              )}
            >
              {row.autoExport ? "On" : "Off"}
            </button>
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
            meta="Review"
            icon="document"
          />
          <DashboardStatCell
            title="Last Sync"
            value={formatRelative(kpi.lastSyncAt).replace(" ago", "")}
            meta="Auto · 15m"
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="rounded-xl border border-divider bg-panel px-4 py-3 sm:px-5">
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          → Customer records are exported to NetSuite. Changes made in NetSuite
          are not imported.
        </p>
      </div>
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        Auto-export: pushes changes to NetSuite automatically as they happen.
        Off = export only when you click Sync Now.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or NetSuite…"
            className="h-9 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
          />
        </div>
        <div className="relative">
          <DashboardToolbarButton
            ref={filterRef}
            leftIcon={<FilterIcon />}
            showChevron
            onClick={() => setFilterOpen((o) => !o)}
          >
            Filter{status ? " · On" : ""}
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
        <div className="relative">
          <DashboardToolbarButton
            ref={sortRef}
            leftIcon={<SortIcon />}
            showChevron
            onClick={() => setSortOpen((o) => !o)}
          >
            Sort:{" "}
            {sortKey === "lastSync"
              ? "Last Sync (Oldest First)"
              : sortKey === "name"
                ? "Customer"
                : sortKey === "code"
                  ? "Code"
                  : "Status"}
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
                label: "Last Sync (Oldest First)",
                onSelect: () => {
                  setSortKey("lastSync");
                  setSortDir("asc");
                },
              },
              {
                id: "sync-desc",
                label: "Last Sync (Newest First)",
                onSelect: () => {
                  setSortKey("lastSync");
                  setSortDir("desc");
                },
              },
              {
                id: "name",
                label: "Customer A–Z",
                onSelect: () => {
                  setSortKey("name");
                  setSortDir("asc");
                },
              },
              {
                id: "status",
                label: "Status",
                onSelect: () => {
                  setSortKey("status");
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
                id: "failed",
                label: "Failed exports",
                onSelect: () => setStatus("FAILED"),
              },
              {
                id: "unmatched",
                label: "Unmatched customers",
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

      <DashboardToolbarButton
        disabled={busy}
        onClick={() => void handleAutoMatch()}
      >
        Auto-Match Unmatched by Name
      </DashboardToolbarButton>

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
            emptyMessage="No customer mappings found"
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
                  id: "open",
                  label: "Open Customer",
                  onSelect: () => {
                    window.location.href = `/crm/accounts/${rowMenu.id}`;
                  },
                },
                {
                  id: "map",
                  label: "Map to a NetSuite Record",
                  onSelect: () => void openMap(rowMenu),
                },
                {
                  id: "create",
                  label: "Create in NetSuite",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.createNetSuiteCustomer(rowMenu.id);
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
                  label: "Retry Export",
                  onSelect: () => {
                    void (async () => {
                      try {
                        await crmApi.syncNetSuiteCustomers([rowMenu.id]);
                        toastSuccess("Export retried");
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
                      title: "Export Error Detail",
                      description:
                        rowMenu.syncError?.trim() ||
                        "No export error recorded for this customer.",
                      confirmLabel: "OK",
                    });
                  },
                },
                {
                  id: "auto",
                  label: rowMenu.autoExport ? "Turn Auto Off" : "Turn Auto On",
                  onSelect: () => void toggleAutoExport(rowMenu),
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
                        await crmApi.unmapNetSuiteCustomer(rowMenu.id);
                        toastSuccess("Customer unmapped");
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
