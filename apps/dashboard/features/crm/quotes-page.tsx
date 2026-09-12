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
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapQuoteRow, assignQuoteVersions } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions, optionLabel } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmListEmptyState } from "@/features/crm/crm-states";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import { QUOTES_KPI_SHELL, QUOTES_SORT_OPTIONS } from "./crm-constants";
import type { QuoteRow } from "./crm-types";
import {
  QuoteCompareVersionsModal,
  QuoteVersionHistoryModal,
  ResendQuoteModal,
  WorkOrderCreatedModal,
  type CompareVersionRow,
  type QuoteVersionListItem,
  type ResendQuotePayload,
} from "./quote-flow-modals";

function formatOpenQuotesSummary(amount: number, count: number) {
  if (!count) return "Total — Across — Open Quotes";
  const compact =
    amount >= 1000
      ? `$${Math.round(amount / 1000)}K`
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(amount);
  return `Total ${compact} Across ${count} Open Quotes`;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

const DEFAULT_CHIPS: { id: string; label: string }[] = [];

/* ─── filter state ──────────────────────────────────────────── */

type QuoteFilters = {
  status: string;
  customer: string;
  rep: string;
  valueMin: string;
  valueMax: string;
  createdMin: string;
  createdMax: string;
  expiresMin: string;
  expiresMax: string;
  hasPo: boolean;
};

const DEFAULT_FILTERS: QuoteFilters = {
  status: "", customer: "", rep: "",
  valueMin: "", valueMax: "",
  createdMin: "", createdMax: "",
  expiresMin: "", expiresMax: "",
  hasPo: false,
};

/* ─── sort ──────────────────────────────────────────────────── */


function chipsFromFilters(
  f: QuoteFilters,
  opts: {
    statuses: { value: string; label: string }[];
    customers: { value: string; label: string }[];
    reps: { value: string; label: string }[];
  },
) {
  const chips: { id: string; label: string }[] = [];
  if (f.status)
    chips.push({ id: "status", label: optionLabel(opts.statuses, f.status) });
  if (f.customer)
    chips.push({
      id: "customer",
      label: optionLabel(opts.customers, f.customer),
    });
  if (f.rep)
    chips.push({ id: "rep", label: optionLabel(opts.reps, f.rep) });
  if (f.valueMin || f.valueMax)
    chips.push({
      id: "value",
      label: `Value: ${f.valueMin || "0"} – ${f.valueMax || "∞"}`,
    });
  if (f.createdMin || f.createdMax)
    chips.push({
      id: "created",
      label: `Created: ${f.createdMin} – ${f.createdMax}`,
    });
  if (f.expiresMin || f.expiresMax)
    chips.push({
      id: "expires",
      label: `Expires: ${f.expiresMin} – ${f.expiresMax}`,
    });
  if (f.hasPo) chips.push({ id: "hasPo", label: "Has PO" });
  return chips;
}

/* ─── filters drawer ────────────────────────────────────────── */

function QuotesFiltersDrawer({
  open, onClose, value, onChange, onApply, onClearAll,
  statusOptions, customerOptions, repOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: QuoteFilters;
  onChange: (v: QuoteFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  statusOptions: { value: string; label: string }[];
  customerOptions: { value: string; label: string }[];
  repOptions: { value: string; label: string }[];
}) {
  if (!open) return null;

  const sel = (field: keyof QuoteFilters, val: string) => onChange({ ...value, [field]: val });
  const range = (minKey: keyof QuoteFilters, maxKey: keyof QuoteFilters, minVal: string, maxVal: string) =>
    onChange({ ...value, [minKey]: minVal, [maxKey]: maxVal });

  const controlClass =
    "h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] px-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </span>
      <div className="flex min-w-0 max-w-[200px] flex-1 justify-end">{children}</div>
    </div>
  );

  const SelectEl = ({
    fieldKey,
    options,
  }: {
    fieldKey: keyof QuoteFilters;
    options: { value: string; label: string }[];
  }) => (
    <div className="relative w-full">
      <select
        value={value[fieldKey] as string}
        onChange={(e) => sel(fieldKey, e.target.value)}
        className={controlClass}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );

  const RangePair = ({ minKey, maxKey }: { minKey: keyof QuoteFilters; maxKey: keyof QuoteFilters }) => (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <input
        type="text"
        value={value[minKey] as string}
        onChange={(e) => range(minKey, maxKey, e.target.value, value[maxKey] as string)}
        className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
      />
      <span className="text-[#FDFDFF]" aria-hidden>-</span>
      <input
        type="text"
        value={value[maxKey] as string}
        onChange={(e) => range(minKey, maxKey, value[minKey] as string, e.target.value)}
        className="h-8 w-full min-w-0 flex-1 rounded-md border-0 bg-[#2A2A2A] px-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none sm:w-[72px] sm:flex-none"
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[min(100%,360px)] flex-col border-l border-divider bg-[#0D0D0D] shadow-xl">
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <span className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Filters
          </span>
          <button type="button" onClick={onClose} className="text-[#FDFDFF] hover:opacity-70" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-hidden">
          <Row label="Status">
            <SelectEl fieldKey="status" options={statusOptions} />
          </Row>
          <Row label="Customer">
            <SelectEl fieldKey="customer" options={customerOptions} />
          </Row>
          <Row label="Rep">
            <SelectEl fieldKey="rep" options={repOptions} />
          </Row>
          <Row label="Value">
            <RangePair minKey="valueMin" maxKey="valueMax" />
          </Row>
          <Row label="Created">
            <RangePair minKey="createdMin" maxKey="createdMax" />
          </Row>
          <Row label="Expires">
            <RangePair minKey="expiresMin" maxKey="expiresMax" />
          </Row>
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Has PO?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={value.hasPo}
              onClick={() => onChange({ ...value, hasPo: !value.hasPo })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value.hasPo ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"}`}
            >
              <span
                className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
                  value.hasPo ? "translate-x-[18px] bg-[#1A1A1A]" : "translate-x-1 bg-[#959597]"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-divider px-5 py-4">
          <DashboardToolbarButton onClick={onClose} className="flex-1 justify-center">
            Close
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={onClearAll} className="flex-1 justify-center">
            Clear All
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            onClick={() => { onApply(); onClose(); }}
            className="flex-1 justify-center"
          >
            Apply
          </DashboardToolbarButton>
        </div>
      </aside>
    </>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

export function QuotesPage() {
  const router = useRouter();
  const { askConfirm, dialogs } = useCrmDialogs();
  const [query, setQuery] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<QuoteFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<QuoteFilters>(DEFAULT_FILTERS);
  const [chips, setChips] = React.useState<{ id: string; label: string }[]>(DEFAULT_CHIPS);
  const [sortField, setSortField] = React.useState("quoteNumber");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [sendQuoteId, setSendQuoteId] = React.useState<string | null>(null);
  const [sendMeta, setSendMeta] = React.useState<{
    recipient: string;
    versionLabel: string;
    warning: string | null;
    message: string;
  }>({ recipient: "", versionLabel: "Quote V1", warning: null, message: "" });
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyQuoteId, setHistoryQuoteId] = React.useState<string | null>(null);
  const [historyMeta, setHistoryMeta] = React.useState<{
    quoteNumber: string;
    customer: string;
    versions: QuoteVersionListItem[];
  }>({ quoteNumber: "", customer: "", versions: [] });
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareMeta, setCompareMeta] = React.useState<{
    leftLabel: string;
    rightLabel: string;
    rows: CompareVersionRow[];
  }>({ leftLabel: "V2", rightLabel: "V3", rows: [] });
  const [woCreatedOpen, setWoCreatedOpen] = React.useState(false);
  const [woCreated, setWoCreated] = React.useState<{
    quoteId: string;
    quoteNumber: string;
    workOrderId: string;
    workOrderCode: string;
    customer: string;
    value: string;
    scheduled: string;
    createdBy: string;
  } | null>(null);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("QUOTES");

  const { lookups, customers, reps } = useCrmLookups({ includeLocations: false });
  const statusOptions = lookupOptions(lookups, "quoteStatuses");

  const extraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.rep) params.ownerId = appliedFilters.rep;
    if (appliedFilters.valueMin) params.valueMin = appliedFilters.valueMin;
    if (appliedFilters.valueMax) params.valueMax = appliedFilters.valueMax;
    if (appliedFilters.createdMin) params.createdMin = appliedFilters.createdMin;
    if (appliedFilters.createdMax) params.createdMax = appliedFilters.createdMax;
    if (appliedFilters.expiresMin) params.expiresMin = appliedFilters.expiresMin;
    if (appliedFilters.expiresMax) params.expiresMax = appliedFilters.expiresMax;
    if (appliedFilters.hasPo) params.hasPo = "true";
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters]);

  const { rows: rawRows, total, kpiData, loading, initialLoading, error, reload } = useCrmList({
    list: (p) => crmApi.listQuotes(p),
    mapRow: mapQuoteRow,
    kpi: () => crmApi.quotesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const rows = React.useMemo(() => assignQuoteVersions(rawRows), [rawRows]);

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(QUOTES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const openQuotesSummary = React.useMemo(() => {
    const count = Number(kpiData.openCount ?? 0);
    const amount = Number(kpiData.openAmount ?? 0);
    return formatOpenQuotesSummary(
      Number.isFinite(amount) ? amount : 0,
      Number.isFinite(count) ? count : 0,
    );
  }, [kpiData.openAmount, kpiData.openCount]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, appliedFilters, sortField, sortDirection, pageSize]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection,
      query,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: QuoteFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
      const nextChips = chipsFromFilters(nextFilters, {
        statuses: statusOptions,
        customers,
        reps,
      });
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setChips(nextChips);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  async function runExport(opts?: {
    format?: "csv" | "pdf" | "xlsx";
    selectedOnly?: boolean;
  }) {
    try {
      if (opts?.selectedOnly && selectedIds.length === 0) {
        toastApiError(new Error("Select at least one quote to export"));
        return;
      }
      const format = opts?.format ?? "csv";
      const res = await crmApi.exportQuotes({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: format === "csv" ? undefined : format,
        ids: opts?.selectedOnly ? selectedIds.join(",") : undefined,
        ...extraParams,
      });
      if (format === "pdf") {
        if (!res.data.pdf) throw new Error("No PDF");
        downloadPdf(res.data.pdf, res.data.filename);
        toastSuccess("PDF downloaded");
        return;
      }
      if (format === "xlsx") {
        if (!res.data.xlsx) throw new Error("No Excel file");
        downloadXlsx(res.data.xlsx, res.data.filename);
        toastSuccess("Excel downloaded");
        return;
      }
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await crmApi.duplicateQuote(id);
      toastSuccess("Quote duplicated");
      router.push(`/crm/quotes/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleMarkWon(id: string) {
    try {
      await crmApi.markQuoteWon(id);
      toastSuccess("Quote marked as won");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleMarkLost(id: string) {
    try {
      await crmApi.markQuoteLost(id);
      toastSuccess("Quote marked as lost");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleArchive(id: string) {
    const ok = await askConfirm({
      title: "Delete draft quote",
      description: "Delete this draft quote? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.archiveQuote(id);
      toastSuccess("Quote archived");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkArchive() {
    const ok = await askConfirm({
      title: "Delete quotes",
      description: `Delete ${selectedIds.length} quote(s)? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await crmApi.bulkArchiveQuotes(selectedIds);
      toastSuccess("Quotes archived");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleConvertToWorkOrder(id: string) {
    try {
      const res = await crmApi.convertQuoteToWorkOrder(id);
      const wo = res.data;
      const scheduled = wo.scheduled
        ? new Date(wo.scheduled)
            .toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            .toUpperCase()
        : "—";
      const value =
        wo.value != null
          ? Number(wo.value).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })
          : "—";
      setWoCreated({
        quoteId: id,
        quoteNumber: wo.quoteNumber ?? wo.quote?.quoteNumber ?? "—",
        workOrderId: wo.id,
        workOrderCode: wo.code ?? "—",
        customer: wo.customer?.name ?? "—",
        value,
        scheduled,
        createdBy: wo.createdBy ?? "—",
      });
      setWoCreatedOpen(true);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push(
          `/operations/work-orders/new?quoteId=${encodeURIComponent(id)}`,
        );
        return;
      }
      toastApiError(err);
    }
  }

  async function openSendQuote(row: QuoteRow) {
    try {
      const res = await crmApi.getQuote(row.id);
      const q = res.data;
      const recipient =
        q.contact?.email?.trim() ||
        "";
      const rev = q.revision ?? (Number(row.version.replace(/\D/g, "")) || 1);
      const versions = await crmApi.listQuoteVersions(row.id).catch(() => null);
      const prev = versions?.data.versions.find((v) => v.revision === rev - 1);
      const firstName =
        q.contact?.fullName?.trim().split(/\s+/)[0] ?? "there";
      setSendQuoteId(row.id);
      setSendMeta({
        recipient: recipient.toUpperCase(),
        versionLabel: `Quote V${rev}`,
        warning: prev
          ? `Re-sending V${rev}. The customer previously received V${prev.revision} on ${new Date(
              prev.sentAt ?? prev.createdAt,
            )
              .toLocaleDateString("en-US", { month: "short", day: "numeric" })
              .toUpperCase()}.`
          : q.sentAt
            ? `Re-sending V${rev}. This quote was previously sent.`
            : null,
        message: `Hi ${firstName} — attaching the revised quote (V${rev}). Let me know if you have questions.`,
      });
      setSendOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openVersionHistory(row: QuoteRow) {
    try {
      const res = await crmApi.listQuoteVersions(row.id);
      setHistoryQuoteId(row.id);
      setHistoryMeta({
        quoteNumber: res.data.quoteNumber,
        customer: res.data.customer,
        versions: res.data.versions,
      });
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openCompare(quoteId: string) {
    try {
      const res = await crmApi.compareQuoteVersions(quoteId);
      const leftDate = new Date(res.data.left.date)
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toUpperCase();
      const rightDate = new Date(res.data.right.date)
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toUpperCase();
      setCompareMeta({
        leftLabel: `${res.data.left.label} · ${leftDate}`,
        rightLabel: `${res.data.right.label} · ${rightDate}${
          res.data.right.isCurrent ? " · Current" : ""
        }`,
        rows: res.data.rows,
      });
      setCompareOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleSendConfirm(payload: ResendQuotePayload) {
    if (!sendQuoteId) return;
    try {
      await crmApi.sendQuote(sendQuoteId, {
        to: payload.recipient,
        subject: payload.versionLabel,
        message: payload.message,
        attachPdf: payload.attachPdf,
      });
      toastSuccess("Quote sent");
      setSendQuoteId(null);
      reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleDownloadPdf(id: string) {
    try {
      const res = await crmApi.exportQuotes({
        format: "pdf",
        ids: id,
      });
      if (!res.data.pdf) throw new Error("No PDF");
      downloadPdf(res.data.pdf, res.data.filename);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  const columns: DashboardDataTableColumn<QuoteRow>[] = React.useMemo(
    () => [
      {
        id: "quoteNumber",
        header: "Quote #",
        className: "min-w-[110px] max-w-[140px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.quoteNumber}
            subtitle={row.createdDate}
            underline
          />
        ),
      },
      {
        id: "version",
        header: "Version",
        className: "min-w-[70px] hidden sm:table-cell",
        cell: (row) => row.version,
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[120px] max-w-[160px]",
        cell: (row) => (
          <span className="block truncate underline underline-offset-2">
            {row.customer}
          </span>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        className: "min-w-[110px] hidden md:table-cell",
        cell: (row) => (
          <span className="block truncate underline underline-offset-2">
            {row.contact}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        className: "min-w-[90px]",
        cell: (row) => row.amount,
      },
      {
        id: "created",
        header: "Created",
        className: "min-w-[100px] hidden md:table-cell",
        cell: (row) => (
          <div>
            <div>{row.created}</div>
            {row.createdDetail ? (
              <div className="mt-0.5 text-[10px] uppercase text-[#959597]">
                {row.createdDetail}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "expires",
        header: "Expires",
        className: "min-w-[120px] hidden lg:table-cell",
        cell: (row) => (
          <div className={row.expiresExpired ? "text-[#FF6B6B]" : undefined}>
            <div>{row.expires}</div>
            {row.expiresDetail ? (
              <div
                className={`mt-0.5 text-[10px] uppercase ${
                  row.expiresExpired ? "text-[#FF6B6B]" : "text-[#959597]"
                }`}
              >
                {row.expiresDetail}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => (
          <span className="underline underline-offset-2">{row.owner}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[100px]",
        cell: (row) => (
          <DashboardBadge variant={row.status.variant} pill className="max-w-full">
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "approval",
        header: "Approval",
        className: "min-w-[90px] hidden xl:table-cell",
        cell: (row) => (
          <span
            className={
              row.approval === "—"
                ? "text-[#959597]"
                : "uppercase text-[#FDFDFF]"
            }
          >
            {row.approval}
          </span>
        ),
      },
      {
        id: "approvedOn",
        header: "Approved On",
        className: "min-w-[100px] hidden xl:table-cell",
        cell: (row) => (
          <span className={row.approvedOn === "—" ? "text-[#959597]" : undefined}>
            {row.approvedOn}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              { id: "open",    label: "Open Quote",              onSelect: () => router.push(`/crm/quotes/${row.id}`) },
              { id: "edit",    label: "Edit",                    onSelect: () => router.push(`/crm/quotes/${row.id}/edit`) },
              { id: "dup",     label: "Duplicate Quote",         onSelect: () => void handleDuplicate(row.id) },
              {
                id: "send",
                label: "Send to Customer",
                onSelect: () => void openSendQuote(row),
              },
              {
                id: "versions",
                label: "Version History",
                onSelect: () => void openVersionHistory(row),
              },
              { id: "pdf",     label: "Download PDF",            onSelect: () => void handleDownloadPdf(row.id) },
              {
                id: "convert",
                label: "Convert to Work Order",
                onSelect: () => void handleConvertToWorkOrder(row.id),
              },
              { id: "won",     label: "Mark as Won",             onSelect: () => void handleMarkWon(row.id) },
              { id: "lost",    label: "Mark as Lost",            onSelect: () => void handleMarkLost(row.id) },
              {
                id: "delete",
                label: "Delete Draft",
                destructive: true,
                onSelect: () => void handleArchive(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <CrmListLoadGate
      loading={loading}
      hasData={!initialLoading}
      error={error}
      onRetry={reload}
      kpiCount={5}
    >
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
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
                onClick={() => void handleBulkArchive()}
              >
                Delete
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void runExport({ selectedOnly: true }) },
                  { id: "all-csv",      label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx", selectedOnly: true }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf", selectedOnly: true }),
                  },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Quote Number · Customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => { setDraftFilters(appliedFilters); setFiltersOpen(true); }}
            >
              Filter
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardSortMenu
                options={QUOTES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
              />
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void runExport() },
                  { id: "all-csv",  label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx" }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf" }),
                  },
                ]}
              />
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Saved Views
              </DashboardToolbarButton>
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={(id) => {
                  setChips((prev) => {
                    const next = prev.filter((c) => c.id !== id);
                    if (next.length === 0) {
                      setAppliedFilters(DEFAULT_FILTERS);
                      setDraftFilters(DEFAULT_FILTERS);
                    }
                    return next;
                  });
                }}
                onClearAll={() => {
                  setChips(DEFAULT_CHIPS);
                  setAppliedFilters(DEFAULT_FILTERS);
                  setDraftFilters(DEFAULT_FILTERS);
                }}
              />
            ) : null
          }
        />
      )}

      <p className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
        {openQuotesSummary}
      </p>

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={
          <CrmListEmptyState
            query={query}
            filtersActive={chips.length > 0}
            emptyDescription="Create your first quote to get started."
            createLabel="+ New Quote"
            createHref="/crm/quotes/new"
            onClearFilters={() => {
              setChips(DEFAULT_CHIPS);
              setAppliedFilters(DEFAULT_FILTERS);
              setDraftFilters(DEFAULT_FILTERS);
            }}
            onClearSearch={() => setQuery("")}
          />
        }
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/quotes/${row.id}`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <QuotesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setChips(
            chipsFromFilters(draftFilters, {
              statuses: statusOptions,
              customers,
              reps,
            }),
          );
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setChips([]);
        }}
        statusOptions={statusOptions}
        customerOptions={customers}
        repOptions={reps}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={(viewId) => {
          setActiveViewId(viewId);
          const view = savedViews.find((v) => v.id === viewId);
          if (view?.payload != null) applySavedViewPayload(view.payload);
        }}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) {
              void createView(
                `${source.label} copy`,
                (source.payload as Record<string, unknown> | undefined) ??
                  currentViewPayload(),
              );
            }
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />
      <ResendQuoteModal
        open={sendOpen}
        onClose={() => {
          setSendOpen(false);
          setSendQuoteId(null);
        }}
        defaultRecipient={sendMeta.recipient}
        versionLabel={sendMeta.versionLabel}
        warning={sendMeta.warning}
        defaultMessage={sendMeta.message}
        onPreview={() => {
          if (sendQuoteId) router.push(`/crm/quotes/${sendQuoteId}/preview`);
        }}
        onSend={(payload) => handleSendConfirm(payload)}
      />
      <QuoteVersionHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        quoteNumber={historyMeta.quoteNumber}
        customer={historyMeta.customer}
        versions={historyMeta.versions}
        onCompare={() => {
          if (historyQuoteId) {
            setHistoryOpen(false);
            void openCompare(historyQuoteId);
          }
        }}
        onOpenCurrent={() => {
          if (historyQuoteId) {
            setHistoryOpen(false);
            router.push(`/crm/quotes/${historyQuoteId}`);
          }
        }}
      />
      <QuoteCompareVersionsModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        leftLabel={compareMeta.leftLabel}
        rightLabel={compareMeta.rightLabel}
        rows={compareMeta.rows}
        onKeepLeft={() => setCompareOpen(false)}
        onSendRight={() => {
          setCompareOpen(false);
          if (historyQuoteId) {
            const row = rows.find((r) => r.id === historyQuoteId);
            if (row) void openSendQuote(row);
          }
        }}
      />
      <WorkOrderCreatedModal
        open={woCreatedOpen && Boolean(woCreated)}
        onClose={() => {
          setWoCreatedOpen(false);
          setWoCreated(null);
        }}
        quoteNumber={woCreated?.quoteNumber ?? "—"}
        workOrderCode={woCreated?.workOrderCode ?? "—"}
        customer={woCreated?.customer ?? "—"}
        value={woCreated?.value ?? "—"}
        scheduled={woCreated?.scheduled ?? "—"}
        createdBy={woCreated?.createdBy ?? "—"}
        quoteId={woCreated?.quoteId}
        workOrderId={woCreated?.workOrderId}
      />
      {dialogs}
    </div>
    </CrmListLoadGate>
  );
}
